// Vercel serverless function — AI inpainting via fal.ai flux-kontext
// Used by Ghost Actors tool to remove actors from scenes

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } }
};

const FAL_STORAGE_INITIATE = 'https://rest.fal.ai/storage/upload/initiate';
const FAL_KONTEXT_URL = 'https://fal.run/fal-ai/flux-pro/kontext';

async function uploadToFal(base64DataUrl, apiKey) {
  const commaIdx = base64DataUrl.indexOf(',');
  const header = base64DataUrl.substring(0, commaIdx);
  const data = base64DataUrl.substring(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `kbt_inpaint_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

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

  const { image, actorName, movieTitle } = req.body || {};
  if (!image) return res.status(400).json({ error: 'image is required' });

  const actor = actorName ? actorName.trim() : 'the person';
  const prompt = `Remove ${actor} from this image completely. Fill the area where they were standing with the natural background environment — match the surrounding textures, lighting, and colours seamlessly. The result should look like ${actor} was never in the scene. Keep everything else in the image exactly the same. Photorealistic result.`;

  try {
    const imageUrl = await uploadToFal(image, FAL_KEY);

    const falRes = await fetch(FAL_KONTEXT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt,
        guidance_scale: 3.5,
        num_inference_steps: 28,
        output_format: 'jpeg',
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      throw new Error(`fal.ai kontext error (${falRes.status}): ${errText}`);
    }

    const data = await falRes.json();
    const outputUrl = data.images?.[0]?.url;
    if (!outputUrl) throw new Error('No image returned: ' + JSON.stringify(data));

    return res.status(200).json({ url: outputUrl });

  } catch (err) {
    console.error('[fal-inpaint]', err);
    return res.status(500).json({ error: err.message });
  }
}
