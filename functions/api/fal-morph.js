// KBT face-swap via fal.ai (older endpoint, queue-based) - Cloudflare Pages Function
import { CORS, json, handleOptions, uploadToFal } from './_utils.js';

const FAL_QUEUE_URL = 'https://queue.fal.run/fal-ai/face-swap';

async function pollUntilDone(statusUrl, responseUrl, apiKey, timeoutMs = 55000) {
  const headers = { Authorization: `Key ${apiKey}` };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) throw new Error(`Status poll failed (${statusRes.status}): ${await statusRes.text()}`);
    const status = await statusRes.json();
    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(responseUrl, { headers });
      if (!resultRes.ok) throw new Error(`Result fetch failed (${resultRes.status}): ${await resultRes.text()}`);
      return await resultRes.json();
    }
    if (status.status === 'FAILED') throw new Error(`fal.ai job failed: ${JSON.stringify(status.error || status)}`);
  }
  throw new Error('fal.ai job timed out');
}

export const onRequestOptions = handleOptions;

export const onRequestPost = async ({ request, env }) => {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured on server' }, 500);

  const { face1, face2 } = await request.json();
  if (!face1 || !face2) return json({ error: 'Both face images are required' }, 400);

  try {
    const [base_image_url, swap_image_url] = await Promise.all([
      uploadToFal(face1, FAL_KEY, 'morph1'),
      uploadToFal(face2, FAL_KEY, 'morph2'),
    ]);

    const queueRes = await fetch(FAL_QUEUE_URL, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_image_url, swap_image_url }),
    });
    if (!queueRes.ok) throw new Error(`fal.ai queue error (${queueRes.status}): ${await queueRes.text()}`);
    const queue = await queueRes.json();

    const result = await pollUntilDone(queue.status_url, queue.response_url, FAL_KEY, 55000);
    const imageUrl = result?.image?.url || result?.images?.[0]?.url;
    if (!imageUrl) throw new Error('fal.ai returned no image URL: ' + JSON.stringify(result));

    return json({
      url: imageUrl,
      width: result?.image?.width || result?.images?.[0]?.width,
      height: result?.image?.height || result?.images?.[0]?.height,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};
