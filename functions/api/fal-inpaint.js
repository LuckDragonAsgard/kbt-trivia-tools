// AI inpainting via fal.ai - removes actors for ghost-actors-tool
import { CORS, json, handleOptions, uploadToFal } from './_utils.js';

const FAL_INPAINT_URL = 'https://fal.run/fal-ai/stable-diffusion-xl/inpainting';

export const onRequestOptions = handleOptions;

export const onRequestPost = async ({ request, env }) => {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured' }, 500);

  try {
    const { image } = await request.json();
    if (!image) return json({ error: 'image required' }, 400);

    const imageUrl = await uploadToFal(image, FAL_KEY, 'ghost');

    const prompt = `Remove the person from this movie still. Replace the person with the neutral background of the scene, maintaining the same lighting, color grading, and atmosphere. The result should look like the scene before any actors were added. Cinema still, professional, seamless.`;
    const negPrompt = `person, human, actor, face, body, people, figure`;

    const inpaintRes = await fetch(FAL_INPAINT_URL, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
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
      return json({ url: imageUrl, fallback: true, error: await inpaintRes.text() });
    }

    const result = await inpaintRes.json();
    const url = result.images?.[0]?.url || result.image?.url;
    if (!url) return json({ error: 'No image in response', raw: result }, 500);

    return json({ url, model: 'sdxl-inpainting' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};
