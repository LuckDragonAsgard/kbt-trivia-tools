// kbt-api — unified KBT API Worker
// Routes: /api/env-check, /api/ai-text, /api/fact-check,
//         /api/fal-morph, /api/fal-faceswap, /api/fal-inpaint,
//         /api/fal-rembg, /api/generate-slides
// Secrets needed: FAL_KEY, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN

// ─── Shared utils ────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

const handleOptions = () => new Response(null, { status: 200, headers: CORS });

function decodeDataUrl(dataUrl) {
  const commaIdx = dataUrl.indexOf(',');
  const header = dataUrl.substring(0, commaIdx);
  const data = dataUrl.substring(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return { mime, bytes };
}

async function uploadToFal(base64DataUrl, apiKey, hint = 'kbt') {
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

// ─── /api/env-check ──────────────────────────────────────────────────────────

function handleEnvCheck(env) {
  return json({
    PLATFORM: 'Cloudflare Worker',
    HAS_FAL_KEY: env.FAL_KEY ? 'YES' : 'NO',
    HAS_ANTHROPIC: env.ANTHROPIC_API_KEY ? 'YES' : 'NO',
    HAS_GOOGLE_OAUTH: (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) ? 'YES' : 'NO',
  });
}

// ─── /api/ai-text ────────────────────────────────────────────────────────────

const FAL_ANY_LLM = 'https://fal.run/fal-ai/any-llm';
const LLM_MODEL = 'google/gemini-flash-1.5';

const PROMPTS = {
  'guess-year': ({ year }) => `You are a trivia question writer for a pub quiz. Generate exactly 5 interesting, varied historical events that happened in the year ${year}.
Cover different categories: mix sports, music/entertainment, politics, science/technology, and world events.
Each event should be 1 sentence, factual, and interesting to a general audience.
Format: Return ONLY a plain list, one event per line, no bullet points, no numbering, no extra text.`,

  'crack-code': ({ answer }) => `You are a creative rebus puzzle designer for a trivia night.
The answer is: "${answer}"

Rules for a GOOD rebus:
- Split the word into 2-3 REAL syllables that sound exactly like common English words or objects
- Each emoji/image must make a sound that genuinely matches its syllable
- Test each part: say the word each emoji represents out loud — does it sound right?
- KANGAROO = 🥫(CAN) + 🦁(GAR — as in growl, rhymes with "gar") + 💧(ROO — like roux/rue)

Give exactly 2 rebus options.
Format each as:
[emoji] + [emoji] + ... = ${answer}
(phonetic explanation in brackets)

Return only the 2 options, nothing else.`,

  'carmen': ({ location }) => `You are a geography trivia writer for a pub quiz called "Carmen Sandiego" where players must identify a location on a map.
The location is: "${location}"
Generate 3 clever geographical clues that hint at this location without naming it directly.
Clues should go from harder (more obscure) to easier (more obvious).
Each clue should be 1-2 sentences. Make them interesting and educational.
Format: Return ONLY the 3 clues, numbered 1. 2. 3., nothing else.`,

  'linked-pics': ({ subjects, connection }) => `You are a trivia question writer. I have a "Linked Pics" round where 4 images are connected by a theme.
The 4 image subjects are: ${subjects}
${connection ? `The intended connection is: "${connection}"` : 'No connection has been set yet.'}
${connection
  ? 'Suggest 2 alternative ways to phrase this connection that are more specific or clever. Also suggest if there is a stronger or more surprising connection between these subjects.'
  : 'What is the most interesting connection between these 4 subjects? Give the best connection as a short punchy phrase (3-8 words), then explain why in 1 sentence.'
}
Return only the connection phrase(s) and brief explanation(s).`,

  'brand': ({ brand }) => `You are a trivia question writer for a pub quiz night.
Write 1 interesting, engaging trivia question about the brand "${brand}".
The question should be about the brand's history, founding, logo meaning, famous campaigns, or interesting facts — NOT just "what does their logo look like".
Format:
Q: [the question]
A: [the answer]
Fun fact: [one extra interesting fact about ${brand}]
Return only this format, nothing else.`,

  'brain-hint': ({ celebrity }) => `You are a trivia host. Generate 3 progressively easier hints about the celebrity "${celebrity}" for a "Name the Brain" round where players see just the top of their head.
Hints should go from cryptic to more obvious — never mention their name directly, not even initials.
Each hint should be 1 short punchy sentence.
Format: Return ONLY 3 lines numbered 1. 2. 3.`,

  'face-morph-hint': ({ celeb1, celeb2 }) => `You are a fun trivia host for a pub quiz. Players are looking at an AI face-morph blending ${celeb1} and ${celeb2}.
Generate 3 progressively easier clues that hint at BOTH people without naming either directly.
Rules:
- NEVER say their name, initials, or any part of their name
- Clue 1: hardest — cryptic connection (era, nationality, shared trait)
- Clue 2: medium — career or famous work hint for each
- Clue 3: easiest — one very recognisable fact about each
- Be witty, use wordplay if possible
- Each clue max 20 words
Format: Return ONLY 3 lines numbered 1. 2. 3.`,

  'ghost-actors': ({ movie, year, actors }) => `You are a film trivia expert hosting a "Ghost Actors" round where players see movie stills with actors replaced by grey silhouettes.
The movie is: "${movie}" (${year})
${actors ? `Key actors removed: ${actors}` : ''}
Generate 3 progressively easier clues that help players identify the movie without naming it directly.
Rules:
- NEVER name the movie, director, or actors directly
- Clue 1: hardest — a cryptic plot or era clue
- Clue 2: medium — genre + year range + one vague plot detail
- Clue 3: easiest — a very well-known fact (famous quote, iconic scene, award it won)
Format: Return ONLY 3 lines numbered 1. 2. 3.`,

  'soundmash': ({ tracks, connection }) => `You are a music trivia host. Players are about to hear clips from several songs mashed together.
${tracks ? `The tracks are: ${tracks}` : ''}
${connection ? `The connection is: ${connection}` : ''}
Write a single teaser clue that hints at the connection between the songs WITHOUT naming any of the songs, artists, or the connection word itself.
It should be intriguing and make players think. Max 25 words.
Return ONLY the clue text, nothing else.`,

  'host-brief': ({ event_name, venue, rounds, questions_per_round, special_rounds }) => `You are a professional trivia night host writing your pre-show brief.
Event: ${event_name || 'Know Brainer Trivia Night'}
Venue: ${venue || "Tonight's venue"}
Rounds: ${rounds || 6}
Questions per round: ${questions_per_round || 5}
${special_rounds ? `Special rounds tonight: ${special_rounds}` : ''}

Write a punchy 60-second host brief covering:
1. Welcome and housekeeping (phones away, no cheating, team names)
2. How scoring works
3. Tonight's round structure
4. Any special rounds or prizes
Keep it warm, funny, and energetic. Pub quiz vibes — not corporate.
Format as a flowing script the host reads aloud.`,
};

async function handleAiText(request, env) {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured on server' }, 500);

  const body = await request.json();
  const { tool, ...data } = body || {};
  if (!tool) return json({ error: 'tool is required' }, 400);

  const promptFn = PROMPTS[tool];
  if (!promptFn) return json({ error: `Unknown tool: ${tool}. Valid tools: ${Object.keys(PROMPTS).join(', ')}` }, 400);

  const prompt = promptFn(data);

  const falRes = await fetch(FAL_ANY_LLM, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: LLM_MODEL, prompt }),
  });
  if (!falRes.ok) throw new Error(`fal.ai error (${falRes.status}): ${await falRes.text()}`);

  const result = await falRes.json();
  const output = result.output || result.response || result.text || '';
  return json({ result: output.trim() });
}

// ─── /api/fact-check ─────────────────────────────────────────────────────────

async function handleFactCheck(request, env) {
  const KEY = env.ANTHROPIC_API_KEY;
  if (!KEY) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500);

  const { questions } = await request.json();
  if (!questions?.length) return json({ error: 'questions[] required' }, 400);

  const prompt = `You are a quality auditor for Know Brainer Trivia — a Melbourne pub trivia company.

Know Brainer has specific standards for what makes a great trivia question. Apply ALL of these when scoring:

━━━ KNOW BRAINER QUALITY STANDARDS ━━━

✅ GUESSABLE (even without knowing): Best questions allow logical deduction. Answers should be reducible to a limited set (months, numbers, colours, famous people). No better than 4:1 odds of guessing cold.

✅ INCLUSIVE: Don't assume cultural knowledge. Avoid "trivia snob" questions — things every trivia nerd finds easy but normal pub-goers won't know (e.g. "What is an aglet?" — NO).

✅ ENTERTAINING: Should spark team debate, create "I should have known that!" moments, work across categories (a music nerd AND a sports fan can both contribute), hidden-in-plain-sight is gold.

✅ ANSWER PAYOFF: The ANSWER should be the interesting part. Flip subject/object if needed. "J. Robert Oppenheimer was father of what?" beats "Who invented the atomic bomb?" The answer should make people say "No way!" or "Of course!"

✅ EDUCATIONAL: Must be factually correct. Cite-worthy. No urban myths. No "first Google result" answers.

✅ SCORABLE: Answer must be one clear, specific thing. Avoid questions with many valid formats (lists of 3 things, etc). Must be easy for a scorer to mark right/wrong.

✅ NOT TIME-SENSITIVE: Avoid "current", "now", "latest" — these go stale. If time-bound, phrase it as "As of [year]..."

🚫 AUTO-FAIL any question that:
- Has multiple valid correct answers
- Is about disputed/variable stats (river lengths, building heights, city populations, country territories)
- Uses "current" or "who is the" phrasing (changes over time)
- Answer is a list (hard to score)
- Answer is longer than 6 words
- Is only knowable by specialists (not general pub audience)
- Is an "aglet-type" question — obscure name for common thing that only trivia nerds know
- Is offensive or politically charged for a mixed pub audience

━━━ SCORING (0-10) ━━━
• GUESSABLE (0-2): Can a team deduce/narrow it even without knowing?
• PAYOFF (0-2): Is the answer surprising, satisfying, interesting?
• INCLUSIVE (0-2): Accessible to a general mixed pub audience?
• SCORABLE (0-2): One clear unambiguous answer, easy to mark?
• FACTUAL (0-2): Verifiably correct, no myths, not time-sensitive?

━━━ FACT CHECK ━━━
• VERIFIED — confident it's correct
• LIKELY — probably correct, minor uncertainty
• UNCERTAIN — not sure, needs human check
• WRONG — incorrect (provide the right answer)

━━━ QUESTIONS ━━━
${questions.map((q, i) => `[${i}] Q: ${q.q}\n    A: ${q.a}\n    Category: ${q.category || 'General'}\n    Difficulty: ${q.difficulty || 'medium'}`).join('\n\n')}

━━━ VERDICTS ━━━
PASS  → score ≥ 7 AND fact is VERIFIED or LIKELY
EDIT  → score 5-6, OR fact UNCERTAIN, OR fixable issue (suggest rewrite)
FAIL  → score < 5, OR auto-fail condition hit, OR fact WRONG

Return ONLY valid JSON array, no markdown:
[{"index":0,"quality_score":8,"quality_breakdown":{"guessable":2,"payoff":1,"inclusive":2,"scorable":2,"factual":1},"quality_notes":"Brief note on main issue","fact_status":"VERIFIED","fact_notes":"Why confident","corrected_answer":null,"suggested_rewrite":null,"verdict":"PASS","verdict_reason":"One line"}]

If WRONG: set corrected_answer.
If EDIT and fixable: set suggested_rewrite to an improved version following KBT style.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: 'You are a JSON-only API endpoint. ALWAYS respond with a valid JSON array starting with [ and ending with ]. Never write prose before or after the JSON. Never use phrases like "I notice", "Based on", "Here is", or any introductory text. Your ENTIRE response must be a parseable JSON array.',
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await r.json();
  if (data.error) return json({ error: data.error.message }, 500);

  const textBlock = [...(data.content || [])].reverse().find(b => b.type === 'text');
  if (!textBlock?.text) return json({ error: 'No text response', raw: data }, 500);

  const raw = textBlock.text.replace(/```json\n?|```/g, '').trim();
  // Extract JSON array robustly — Claude may add preamble prose before/after
  const startIdx = raw.indexOf('[');
  const endIdx = raw.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) {
    return json({ error: 'No JSON array in fact-check response', preview: raw.substring(0, 300) }, 500);
  }
  const results = JSON.parse(raw.substring(startIdx, endIdx + 1));

  const pass = results.filter(r => r.verdict === 'PASS').length;
  const edit = results.filter(r => r.verdict === 'EDIT').length;
  const fail = results.filter(r => r.verdict === 'FAIL').length;

  return json({ results, summary: { pass, edit, fail, total: results.length } });
}

// ─── /api/fal-morph ──────────────────────────────────────────────────────────

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

async function handleFalMorph(request, env) {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured on server' }, 500);

  const { face1, face2 } = await request.json();
  if (!face1 || !face2) return json({ error: 'Both face images are required' }, 400);

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
}

// ─── /api/fal-faceswap ───────────────────────────────────────────────────────

const FAL_FACESWAP_URL = 'https://fal.run/easel-ai/advanced-face-swap';

async function handleFalFaceswap(request, env) {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured' }, 500);

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
}

// ─── /api/fal-inpaint ────────────────────────────────────────────────────────

const FAL_INPAINT_URL = 'https://fal.run/fal-ai/stable-diffusion-xl/inpainting';

async function handleFalInpaint(request, env) {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured' }, 500);

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
}

// ─── /api/fal-rembg ──────────────────────────────────────────────────────────

const FAL_REMBG_URL = 'https://fal.run/fal-ai/imageutils/rembg';

async function handleFalRembg(request, env) {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured on server' }, 500);

  const { image } = await request.json();
  if (!image) return json({ error: 'image is required' }, 400);

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
}

// ─── /api/generate-slides ────────────────────────────────────────────────────

const SUPABASE_URL = "https://huvfgenbcaiicatvtxak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmZnZW5iY2FpaWNhdHZ0eGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTczNjIsImV4cCI6MjA5MTE5MzM2Mn0.uTgzTKYjJnkFlRUIhGfW4ODKyV24xOdKaX7lxpDuMfc";

const COLORS = {
  BG: { red: 0.957, green: 0.973, blue: 0.984 },
  DARK: { red: 0.263, green: 0.263, blue: 0.263 },
  BLUE: { red: 0.114, green: 0.686, blue: 0.945 },
  BLUE2: { red: 0.173, green: 0.580, blue: 0.761 },
  ORANGE: { red: 1.000, green: 0.635, blue: 0.318 },
  PURPLE: { red: 0.616, green: 0.478, blue: 0.925 },
  GREEN: { red: 0.133, green: 0.780, blue: 0.529 },
  YELLOW: { red: 0.984, green: 0.773, blue: 0.000 },
  RED: { red: 0.984, green: 0.255, blue: 0.255 },
  WHITE: { red: 1, green: 1, blue: 1 },
  PINK: { red: 0.984, green: 0.518, blue: 0.514 },
  DARK_BG: { red: 0.102, green: 0.102, blue: 0.118 },
};

const TYPE_COLORS = {
  follower_freebie: COLORS.BLUE, freebie: COLORS.BLUE, standard: COLORS.BLUE, classic: COLORS.BLUE,
  "50-50": COLORS.ORANGE, multiple_choice: COLORS.PURPLE, maths: COLORS.PINK,
  song_lyrics: COLORS.GREEN, soundmash: COLORS.GREEN, anagram: COLORS.ORANGE,
  face_morph: COLORS.PURPLE, ghost_actors: COLORS.PURPLE, linked_pics: COLORS.PURPLE,
  map_pins: COLORS.GREEN, guess_the_year: COLORS.GREEN, crack_the_code: COLORS.PURPLE,
  bonus_1: COLORS.YELLOW, bonus_ht: COLORS.YELLOW, gambler: COLORS.RED,
  brain: COLORS.BLUE2, brand: COLORS.BLUE2,
};

const SLIDE_W = 9144000;
const SLIDE_H = 5143500;

async function getAccessToken(env) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function dbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return r.json();
}

function rgb(c) { return { red: c.red, green: c.green, blue: c.blue }; }

function textBox(text, x, y, w, h, fontSize, color, bold = false, align = 'CENTER') {
  const id = `tb_${Math.random().toString(36).slice(2, 8)}`;
  return [
    { createShape: { objectId: id, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: '__SLIDE__', size: { width: { magnitude: w, unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'EMU' } } } },
    { insertText: { objectId: id, text } },
    { updateTextStyle: { objectId: id, style: { fontSize: { magnitude: fontSize, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: rgb(color) } }, bold }, fields: 'fontSize,foregroundColor,bold' } },
    { updateParagraphStyle: { objectId: id, style: { alignment: align }, fields: 'alignment' } },
  ];
}

function setBg(slideId, color) {
  return [{ updatePageProperties: { objectId: slideId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: rgb(color) } } } }, fields: 'pageBackgroundFill' } }];
}

function logoRequests(slideId) {
  const idK = `logo_know_${Math.random().toString(36).slice(2, 6)}`;
  const idB = `logo_brain_${Math.random().toString(36).slice(2, 6)}`;
  return [
    { createShape: { objectId: idK, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId, size: { width: { magnitude: 1500000, unit: 'EMU' }, height: { magnitude: 350000, unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: 280000, translateY: 130000, unit: 'EMU' } } } },
    { insertText: { objectId: idK, text: 'KNOW' } },
    { updateTextStyle: { objectId: idK, style: { fontSize: { magnitude: 22, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: rgb(COLORS.DARK) } }, bold: true }, fields: 'fontSize,foregroundColor,bold' } },
    { createShape: { objectId: idB, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId, size: { width: { magnitude: 2000000, unit: 'EMU' }, height: { magnitude: 350000, unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: 1650000, translateY: 130000, unit: 'EMU' } } } },
    { insertText: { objectId: idB, text: 'BRAINER' } },
    { updateTextStyle: { objectId: idB, style: { fontSize: { magnitude: 22, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: rgb(COLORS.BLUE2) } }, bold: true }, fields: 'fontSize,foregroundColor,bold' } },
  ];
}

function accentBar(slideId, color) {
  const id = `bar_${Math.random().toString(36).slice(2, 8)}`;
  return [
    { createShape: { objectId: id, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId, size: { width: { magnitude: SLIDE_W, unit: 'EMU' }, height: { magnitude: 80000, unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'EMU' } } } },
    { updateShapeProperties: { objectId: id, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: rgb(color) } } }, outline: { outlineFill: { solidFill: { color: { rgbColor: rgb(color) } } }, weight: { magnitude: 0, unit: 'PT' } } }, fields: 'shapeBackgroundFill,outline' } },
  ];
}

function buildSlideRequests(slides) {
  const all = [];
  for (const slide of slides) {
    all.push({ createSlide: { objectId: slide.id, insertionIndex: slide.idx } });
    all.push(...setBg(slide.id, slide.bg));
    for (const req of slide.requests) all.push(JSON.parse(JSON.stringify(req).replace(/__SLIDE__/g, slide.id)));
  }
  return all;
}

async function handleGenerateSlides(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
    return json({ error: 'Google OAuth secrets not configured (need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)' }, 500);
  }

  const url = new URL(request.url);
  const event_code = url.searchParams.get('event_code');
  const event_id = url.searchParams.get('event_id');
  if (!event_code && !event_id) return json({ error: 'event_code or event_id required' }, 400);

  const eventQuery = event_id
    ? `kbt_event?id=eq.${event_id}&limit=1&select=id,event_date,event_description,event_location_id`
    : `kbt_event?event_code=eq.${event_code}&limit=1&select=id,event_date,event_description,event_location_id`;
  const [event] = await dbGet(eventQuery);
  if (!event) return json({ error: 'Event not found' }, 404);

  let venue = event.event_description || 'KBT Trivia';
  let timeStr = '7:00 PM';
  if (event.event_location_id) {
    const [loc] = await dbGet(`kbt_loc?id=eq.${event.event_location_id}&select=loc_fullname,loc_time`);
    if (loc) { venue = loc.loc_fullname || venue; timeStr = loc.loc_time || timeStr; }
  }

  const quiz = await dbGet(
    `kbt_quiz?quiz_event_id=eq.${event.id}&order=quiz_item_round.asc,quiz_item_order.asc` +
    `&select=quiz_item_round,quiz_item_number,quiz_points,quiz_qtype,quiz_question_id`,
  );
  const qids = [...new Set(quiz.map(s => s.quiz_question_id).filter(Boolean))].slice(0, 50);
  const qMap = {};
  if (qids.length) {
    const qs = await dbGet(`kbt_question?id=in.(${qids.join(',')})&select=id,question_question_text,question_answer_text,question_fun_fact`);
    qs.forEach(q => qMap[q.id] = q);
  }

  const accessToken = await getAccessToken(env);
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `KBT Trivia — ${venue}` }),
  });
  const pres = await createRes.json();
  if (!pres.presentationId) return json({ error: 'Google Slides API create failed — check OAuth token', details: pres }, 500);
  const presId = pres.presentationId;

  const slideList = [];
  let idx = 0;
  const newSlide = (bg) => {
    const id = `slide_${(++idx).toString().padStart(3, '0')}_${Math.random().toString(36).slice(2, 6)}`;
    return { id, bg, idx: idx - 1, requests: [] };
  };
  const add = (slide, ...items) => slide.requests.push(...items.flat());

  const s1 = newSlide(COLORS.BG);
  add(s1, accentBar(s1.id, COLORS.BLUE2));
  add(s1, logoRequests(s1.id));
  add(s1, textBox(venue, 0, 1800000, SLIDE_W, 900000, 44, COLORS.DARK, true, 'CENTER'));
  add(s1, textBox('Trivia. But Better.', 0, 2900000, SLIDE_W, 400000, 18, { red: 0.6, green: 0.6, blue: 0.6 }, false, 'CENTER'));
  slideList.push(s1);

  const byRound = {};
  for (const slot of quiz) {
    const r = slot.quiz_item_round || 1;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push({ ...slot, qd: qMap[slot.quiz_question_id] || {} });
  }
  const roundNames = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];

  for (const r of Object.keys(byRound).sort((a, b) => +a - +b)) {
    const slots = byRound[r];
    const ri = newSlide(COLORS.BG);
    add(ri, logoRequests(ri.id));
    add(ri, textBox('ROUND', 0, 1800000, SLIDE_W, 500000, 18, COLORS.BLUE2, true, 'CENTER'));
    add(ri, textBox(roundNames[(+r - 1) % 6], 0, 2300000, SLIDE_W, 1500000, 96, COLORS.DARK, true, 'CENTER'));
    slideList.push(ri);

    for (const slot of slots) {
      const qtype = (slot.quiz_qtype || 'standard').toLowerCase();
      const accent = TYPE_COLORS[qtype] || COLORS.BLUE;
      const q_text = slot.qd.question_question_text || '';
      const a_text = slot.qd.question_answer_text || '';
      const fun = slot.qd.question_fun_fact || '';
      const pts = slot.quiz_points || 1;
      const qnum = slot.quiz_item_number || 0;
      const isBonus = ['bonus_1', 'bonus_ht'].includes(qtype);
      const isGambler = qtype === 'gambler';

      const sq = newSlide(isBonus ? COLORS.BG : COLORS.WHITE);
      add(sq, accentBar(sq.id, accent));
      add(sq, logoRequests(sq.id));
      add(sq, textBox(`R${r}Q${qnum}`, 280000, 150000, 2000000, 400000, 24, accent, true, 'LEFT'));
      if (isGambler) {
        add(sq, textBox('🎲 GAMBLER', 0, 800000, SLIDE_W, 600000, 28, COLORS.RED, true, 'CENTER'));
        add(sq, textBox(q_text || 'Place your wagers!', 280000, 1600000, SLIDE_W - 560000, 2800000, 22, COLORS.DARK, false, 'LEFT'));
      } else if (isBonus) {
        add(sq, textBox(qtype === 'bonus_1' ? '🎯 BONUS' : '🪙 HEADS & TAILS', 0, 700000, SLIDE_W, 600000, 26, COLORS.YELLOW, true, 'CENTER'));
        add(sq, textBox(q_text, 280000, 1500000, SLIDE_W - 560000, 3200000, 30, COLORS.DARK, false, 'CENTER'));
      } else {
        const fsize = q_text.length > 150 ? 24 : q_text.length > 80 ? 32 : 40;
        add(sq, textBox(q_text, 280000, 1000000, SLIDE_W - 560000, 4000000, fsize, COLORS.DARK, false, 'CENTER'));
      }
      slideList.push(sq);

      const sa = newSlide(COLORS.WHITE);
      add(sa, accentBar(sa.id, accent));
      add(sa, logoRequests(sa.id));
      add(sa, textBox(`R${r}Q${qnum} — ANSWER`, 280000, 150000, 7000000, 400000, 18, { red: 0.6, green: 0.6, blue: 0.6 }, true, 'LEFT'));
      const afsize = a_text.length > 60 ? 16 : a_text.length > 30 ? 28 : 44;
      add(sa, textBox(a_text, 922000, 1950000, 7300000, 1650000, afsize, COLORS.DARK, true, 'CENTER'));
      if (fun) add(sa, textBox(`💡 ${fun}`, 280000, 4100000, SLIDE_W - 560000, 600000, 14, { red: 0.6, green: 0.6, blue: 0.6 }, false, 'CENTER'));
      slideList.push(sa);
    }
  }

  const sf = newSlide(COLORS.BG);
  add(sf, accentBar(sf.id, COLORS.BLUE2));
  add(sf, logoRequests(sf.id));
  add(sf, textBox('Thanks for playing!', 0, 2000000, SLIDE_W, 1000000, 60, COLORS.DARK, true, 'CENTER'));
  slideList.push(sf);

  const requests = [
    { deleteObject: { objectId: pres.slides[0].objectId } },
    ...buildSlideRequests(slideList),
  ];

  const batchRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!batchRes.ok) return json({ error: 'Slides API error', details: await batchRes.text() }, 500);

  await fetch(`https://www.googleapis.com/drive/v3/files/${presId}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  return json({
    ok: true,
    slides_url: `https://docs.google.com/presentation/d/${presId}/edit`,
    present_url: `https://docs.google.com/presentation/d/${presId}/present`,
    presentation_id: presId,
    venue,
    slides: slideList.length,
    event_id: event.id,
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') return handleOptions();

    try {
      if (pathname === '/api/env-check') return handleEnvCheck(env);
      if (pathname === '/api/ai-text' && request.method === 'POST') return await handleAiText(request, env);
      if (pathname === '/api/fact-check' && request.method === 'POST') return await handleFactCheck(request, env);
      if (pathname === '/api/fal-morph' && request.method === 'POST') return await handleFalMorph(request, env);
      if (pathname === '/api/fal-faceswap' && request.method === 'POST') return await handleFalFaceswap(request, env);
      if (pathname === '/api/fal-inpaint' && request.method === 'POST') return await handleFalInpaint(request, env);
      if (pathname === '/api/fal-rembg' && request.method === 'POST') return await handleFalRembg(request, env);
      if (pathname === '/api/generate-slides') return await handleGenerateSlides(request, env);

      return new Response(JSON.stringify({ error: 'Not found', routes: [
        '/api/env-check', '/api/ai-text', '/api/fact-check',
        '/api/fal-morph', '/api/fal-faceswap', '/api/fal-inpaint',
        '/api/fal-rembg', '/api/generate-slides'
      ]}), { status: 404, headers: { 'Content-Type': 'application/json', ...CORS } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }
  }
};
