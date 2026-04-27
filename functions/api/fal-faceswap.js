// KBT Face Morph via fal.ai - Cloudflare Pages Function
// POST { base_image, reference_image, gender, workflow }
// Returns { image_url, width, height, file_size }
import { CORS, json, handleOptions, uploadToFal } from './_utils.js';

const FAL_FACESWAP_URL = 'https://fal.run/easel-ai/advanced-face-swap';

export const onRequestOptions = handleOptions;

export const onRequestPost = async ({ request, env }) => {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured' }, 500);

  try {
    const body = await request.json();
    const { base_image, reference_image, gender = 'female', workflow = 'target_hair' } = body || {};
    if (!base_image || !reference_image) {
      return json({ error: 'base_image and reference_image required (base64 data URLs)' }, 400);
    }

    const [baseUrl, refUrl] = await Promise.all([
      uploadToFal(base_image, FAL_KEY, 'base'),
      uploadToFal(reference_image, FAL_KEY, 'ref'),
    ]);

    const swapRes = await fetch(FAL_FACESWAP_URL, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        face_image_0: refUrl,
        gender_0: gender,
        target_image: baseUrl,
        workflow_type: workflow,
      }),
    });

    if (!swapRes.ok) {
      return json({ error: `fal face-swap failed: ${await swapRes.text()}` }, swapRes.status);
    }

    const data = await swapRes.json();
    const image_url = data?.image?.url;
    if (!image_url) return json({ error: 'no image returned', raw: data }, 500);

    return json({
      image_url,
      width: data.image.width,
      height: data.image.height,
      file_size: data.image.file_size,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};
