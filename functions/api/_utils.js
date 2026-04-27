// Shared helpers for KBT Pages Functions
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

export const handleOptions = () => new Response(null, { status: 200, headers: CORS });

// base64 data URL → { mime, bytes (Uint8Array) }
export function decodeDataUrl(dataUrl) {
  const commaIdx = dataUrl.indexOf(',');
  const header = dataUrl.substring(0, commaIdx);
  const data = dataUrl.substring(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return { mime, bytes };
}

// Upload base64 data URL to fal.ai storage, returns file URL
export async function uploadToFal(base64DataUrl, apiKey, hint = 'kbt') {
  const { mime, bytes } = decodeDataUrl(base64DataUrl);
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `kbt_${hint}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const initRes = await fetch(
    'https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3',
    {
      method: 'POST',
      headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: mime, file_name: filename }),
    },
  );
  if (!initRes.ok) throw new Error(`Storage initiate failed (${initRes.status}): ${await initRes.text()}`);
  const { upload_url, file_url } = await initRes.json();

  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: bytes,
  });
  if (!putRes.ok) throw new Error(`Storage PUT failed (${putRes.status}): ${await putRes.text()}`);
  return file_url;
}
