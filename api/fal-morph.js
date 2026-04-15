// Vercel serverless function — proxies fal.ai face swap
// Keeps FAL_KEY server-side, never exposed to browser

export const config = {
  api: {
    bodyParser: { sizeLimit: '20mb' }
  }
};

const FAL_STORAGE_INITIATE = 'https://rest.fal.ai/storage/upload/initiate';
const FAL_QUEUE_URL = 'https://queue.fal.run/fal-ai/face-swap';

async function uploadToFal(base64DataUrl, apiKey) {
  const commaIdx = base64DataUrl.indexOf(',');
  const header = base64DataUrl.substring(0, commaIdx);
  const data = base64DataUrl.substring(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `kbt_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  // Step 1: Initiate upload — get a pre-signed upload URL
  const initiateRes = await fetch(
    `${FAL_STORAGE_INITIATE}?storage_type=fal-cdn-v3`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content_type: mime, file_name: filename }),
    }
  );

  if (!initiateRes.ok) {
    const text = await initiateRes.text();
    throw new Error(`Storage initiate failed (${initiateRes.status}): ${text}`);
  }

  const { upload_url, file_url } = await initiateRes.json();

  // Step 2: PUT binary to the pre-signed URL (no auth needed)
  const buffer = Buffer.from(data, 'base64');
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: buffer,
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`Storage PUT failed (${putRes.status}): ${text}`);
  }

  return file_url;
}

async function pollUntilDone(statusUrl, responseUrl, apiKey, timeoutMs = 120000) {
  const headers = { 'Authorization': `Key ${apiKey}` };
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));

    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new Error(`Status poll failed (${statusRes.status}): ${text}`);
    }

    const status = await statusRes.json();
    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(responseUrl, { headers });
      if (!resultRes.ok) {
        const text = await resultRes.text();
        throw new Error(`Result fetch failed (${resultRes.status}): ${text}`);
      }
      return await resultRes.json();
    }

    if (status.status === 'FAILED') {
      throw new Error(`fal.ai job failed: ${JSON.stringify(status.error || status)}`);
    }
    // IN_QUEUE or IN_PROGRESS — keep polling
  }

  throw new Error('fal.ai job timed out after 120s');
}

export default async function handler(req, res) {
  // CORS for same-domain requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY not configured on server' });

  const { face1, face2 } = req.body || {};

  if (!face1 || !face2) {
    return res.status(400).json({ error: 'Both face images are required' });
  }

  try {
    // Upload both images to fal.ai storage in parallel
    const [base_image_url, swap_image_url] = await Promise.all([
      uploadToFal(face1, FAL_KEY),
      uploadToFal(face2, FAL_KEY),
    ]);

    // Submit async job to fal-ai/face-swap queue
    const queueRes = await fetch(FAL_QUEUE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base_image_url, swap_image_url }),
    });

    if (!queueRes.ok) {
      const errText = await queueRes.text();
      throw new Error(`fal.ai queue error (${queueRes.status}): ${errText}`);
    }

    const queue = await queueRes.json();
    // queue has: { request_id, status_url, response_url }

    // Poll until done (up to 120s — function timeout is 60s so keep poll tight)
    const result = await pollUntilDone(queue.status_url, queue.response_url, FAL_KEY, 55000);

    const imageUrl = result?.image?.url || result?.images?.[0]?.url;
    if (!imageUrl) throw new Error('fal.ai returned no image URL: ' + JSON.stringify(result));

    return res.status(200).json({
      url: imageUrl,
      width: result?.image?.width || result?.images?.[0]?.width,
      height: result?.image?.height || result?.images?.[0]?.height,
    });

  } catch (err) {
    console.error('[fal-morph]', err);
    return res.status(500).json({ error: err.message });
  }
}
