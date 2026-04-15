// Vercel serverless function — proxies fal.ai background removal (rembg)
// Keeps FAL_KEY server-side

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } }
};

const FAL_STORAGE_INITIATE = 'https://rest.fal.ai/storage/upload/initiate';
const FAL_REMBG_URL = 'https://fal.run/fal-ai/imageutils/rembg';

async function uploadToFal(base64DataUrl, apiKey) {
  const commaIdx = base64DataUrl.indexOf(',');
  const header = base64DataUrl.substring(0, commaIdx);
  const data = base64DataUrl.substring(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `kbt_rembg_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const initiateRes = await fetch(
    `${FAL_STORAGE_INITIATE}?storage_type=fal-cdn-v3`,
    {
      method: 'POST',
      headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: mime, file_name: filename }),
    }
  );

  if (!initiateRes.ok) {
    const text = await initiateRes.text();
    throw new Error(`Storage initiate failed (${initiateRes.status}): ${text}`);
  }

  const { upload_url, file_url } = await initiateRes.json();

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY not configured on server' });

  const { image } = req.body || {};
  if (!image) return res.status(400).json({ error: 'image is required' });

  try {
    const imageUrl = await uploadToFal(image, FAL_KEY);

    const falRes = await fetch(FAL_REMBG_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      throw new Error(`rembg error (${falRes.status}): ${errText}`);
    }

    const data = await falRes.json();
    const outputUrl = data.image?.url;
    if (!outputUrl) throw new Error('rembg returned no image URL: ' + JSON.stringify(data));

    return res.status(200).json({ url: outputUrl });

  } catch (err) {
    console.error('[fal-rembg]', err);
    return res.status(500).json({ error: err.message });
  }
}
