// Background removal via fal.ai
import { CORS, json, handleOptions, uploadToFal } from './_utils.js';

const FAL_REMBG_URL = 'https://fal.run/fal-ai/imageutils/rembg';

export const onRequestOptions = handleOptions;

export const onRequestPost = async ({ request, env }) => {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured on server' }, 500);

  const { image } = await request.json();
  if (!image) return json({ error: 'image is required' }, 400);

  try {
    const imageUrl = await uploadToFal(image, FAL_KEY, 'rembg');

    const falRes = await fetch(FAL_REMBG_URL, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    if (!falRes.ok) throw new Error(`rembg error (${falRes.status}): ${await falRes.text()}`);

    const data = await falRes.json();
    const outputUrl = data.image?.url;
    if (!outputUrl) throw new Error('rembg returned no image URL: ' + JSON.stringify(data));

    return json({ url: outputUrl });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};
