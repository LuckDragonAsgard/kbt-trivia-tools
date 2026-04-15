// Vercel serverless function — AI text generation for KBT tools
// Uses fal.ai any-llm to keep API key server-side

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
};

const FAL_ANY_LLM = 'https://fal.run/fal-ai/any-llm';
const MODEL = 'google/gemini-flash-1.5';

const PROMPTS = {
  'guess-year': ({ year }) => `You are a trivia question writer for a pub quiz. Generate exactly 5 interesting, varied historical events that happened in the year ${year}.
Cover different categories: mix sports, music/entertainment, politics, science/technology, and world events.
Each event should be 1 sentence, factual, and interesting to a general audience.
Format: Return ONLY a plain list, one event per line, no bullet points, no numbering, no extra text.`,

  'crack-code': ({ answer }) => `You are a creative rebus puzzle designer for a trivia night.
The answer to the rebus puzzle is: "${answer}"
Break the word/phrase into syllables or sound-alike parts. For each part, suggest a simple recognisable image/emoji that sounds like it.
Give 2-3 different rebus combinations the host could use.
Format each option as: [emoji1] + [emoji2] + ... = ${answer}
Then in brackets, briefly explain the phonetics. Keep it fun and clever!
Return only the combinations and explanations, nothing else.`,

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
Hints should go from cryptic to more obvious — never mention their name directly.
Each hint should be 1 short sentence.
Format: Return ONLY 3 lines numbered 1. 2. 3.`,

  'face-morph-hint': ({ celeb1, celeb2 }) => `You are a fun trivia host. Players are looking at a 50/50 face morph of ${celeb1} and ${celeb2}.
Write a single clever clue that hints at BOTH people without naming either directly.
It should be witty, punny if possible, max 15 words.
Return ONLY the clue text, nothing else.`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY not configured on server' });

  const { tool, ...data } = req.body || {};
  if (!tool) return res.status(400).json({ error: 'tool is required' });

  const promptFn = PROMPTS[tool];
  if (!promptFn) return res.status(400).json({ error: `Unknown tool: ${tool}` });

  const prompt = promptFn(data);

  try {
    const falRes = await fetch(FAL_ANY_LLM, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, prompt }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      throw new Error(`fal.ai any-llm error (${falRes.status}): ${errText}`);
    }

    const result = await falRes.json();
    const output = result.output || result.response || result.text || '';

    return res.status(200).json({ result: output.trim() });

  } catch (err) {
    console.error('[ai-text]', err);
    return res.status(500).json({ error: err.message });
  }
}
