// Vercel serverless function — KBT Face Morph via fal.ai
// Uses easel-ai/advanced-face-swap (single-player mode) — the same morph
// behaviour as Easel AI's live demo. Keeps FAL_KEY server-side.
//
// POST body:
//   { base_image: <base64>, reference_image: <base64>,
//     gender: "male"|"female", workflow: "user_hair"|"target_hair" }
// Response:
//   { image_url: "<fal cdn url>", seed: <number> }

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

const FAL_STORAGE_INITIATE = 'https://rest.fal.ai/storage/upload/initiate';
const FAL_FACESWAP_URL = 'https://fal.run/easel-ai/advanced-face-swap';

async function uploadToFal(base64DataUrl, apiKey, hint) {
  const commaIdx = base64DataUrl.indexOf(',');
  const header = base64DataUrl.substring(0, commaIdx);
  const data = base64DataUrl.substring(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `kbt_morph_${hint}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const initRes = await fetch(`${FAL_STORAGE_INITIATE}?storage_type=fal-cdn-v3`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_type: mime, file_name: filename }),
  });
  if (!initRes.ok) {
    throw new Error(`Storage initiate failed (${initRes.status}): ${await initRes.text()}`);
  }
  const { upload_url, file_url } = await initRes.json();

  const buf = Buffer.from(data, 'base64');
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: buf,
  });
  if (!putRes.ok) {
    throw new Error(`Storage PUT failed (${putRes.status}): ${await putRes.text()}`);
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
  if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY not configured' });

  try {
    const {
      base_image,
      reference_image,
      gender = 'female',
      workflow = 'target_hair',
    } = req.body || {};

    if (!base_image || !reference_image) {
      return res.status(400).json({ error: 'base_image and reference_image required (base64 data URLs)' });
    }

    // Upload both faces to fal.ai storage first
    const [baseUrl, refUrl] = await Promise.all([
      uploadToFal(base_image, FAL_KEY, 'base'),
      uploadToFal(reference_image, FAL_KEY, 'ref'),
    ]);

    // Call easel-ai/advanced-face-swap
    //   face_image_0 = FROM face (provides the face being placed onto the target)
    //   target_image = the image whose face gets replaced
    //   For a morph effect: base_image IS the target_image, reference provides new face
    //   workflow 'target_hair' → keeps base's hair; 'user_hair' → uses reference's hair
    const swapRes = await fetch(FAL_FACESWAP_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        face_image_0: refUrl,
        gender_0: gender,
        target_image: baseUrl,
        workflow_type: workflow,
      }),
    });

    if (!swapRes.ok) {
      const text = await swapRes.text();
      return res.status(swapRes.status).json({ error: `fal face-swap failed: ${text}` });
    }

    const data = await swapRes.json();
    const image_url = data?.image?.url;
    if (!image_url) {
      return res.status(500).json({ error: 'no image returned', raw: data });
    }

    return res.status(200).json({
      image_url,
      width: data.image.width,
      height: data.image.height,
      file_size: data.image.file_size,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
