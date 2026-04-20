// Vercel serverless function — AI inpainting via fal.ai
// Used by ghost-actors-tool to remove actors and replace with neutral background

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

const FAL_STORAGE_INITIATE = 'https://rest.fal.ai/storage/upload/initiate';
const FAL_INPAINT_URL = 'https://fal.run/fal-ai/stable-diffusion-xl/inpainting';

async function uploadToFal(base64DataUrl, apiKey) {
  const commaIdx = base64DataUrl.indexOf(',');
  const data = base64DataUrl.substring(commaIdx + 1);
  const mimeMatch = base64DataUrl.substring(0, commaIdx).match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `kbt_ghost_${Date.now()}.${ext}`;

  const initRes = await fetch(`${FAL_STORAGE_INITIATE}?storage_type=fal-cdn-v3`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_type: mime, file_name: filename }),
  });
  if (!initRes.ok) throw new Error(`Storage init failed: ${await initRes.text()}`);
  const { upload_url, file_url } = await initRes.json();

  const buf = Buffer.from(data, 'base64');
  const putRes = await fetch(upload_url, {
    method: 'PUT', headers: { 'Content-Type': mime }, body: buf,
  });
  if (!putRes.ok) throw new Error(`Upload failed: ${await putRes.text()}`);
  return file_url;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY not configured' });

  try {
    const { image, actorName, movieTitle } = req.body || {};
    if (!image) return res.status(400).json({ error: 'image required' });

    const imageUrl = await uploadToFal(image, FAL_KEY);

    const prompt = `Remove the person from this movie still. Replace the person with the neutral background of the scene, maintaining the same lighting, color grading, and atmosphere. The result should look like the scene before any actors were added. Cinema still, professional, seamless.`;
    const negPrompt = `person, human, actor, face, body, people, figure`;

    const inpaintRes = await fetch(FAL_INPAINT_URL, {
      method: 'POST',
      headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt,
        negative_prompt: negPrompt,
        num_inference_steps: 30,
        strength: 0.85,
        guidance_scale: 7.5,
      }),
    });

    if (!inpaintRes.ok) {
      const err = await inpaintRes.text();
      // Fallback: return original with instruction
      return res.status(200).json({ url: imageUrl, fallback: true, error: err });
    }

    const result = await inpaintRes.json();
    const url = result.images?.[0]?.url || result.image?.url;
    if (!url) return res.status(500).json({ error: 'No image in response', raw: result });

    return res.status(200).json({ url, model: 'sdxl-inpainting' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
