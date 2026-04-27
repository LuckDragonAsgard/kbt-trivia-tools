// AI text generation for KBT tools - Cloudflare Pages Function
import { CORS, json, handleOptions } from './_utils.js';

const FAL_ANY_LLM = 'https://fal.run/fal-ai/any-llm';
const MODEL = 'google/gemini-flash-1.5';

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
Event: ${event_name || 'Kow Brainer Trivia Night'}
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

export const onRequestOptions = handleOptions;

export const onRequestPost = async ({ request, env }) => {
  const FAL_KEY = env.FAL_KEY;
  if (!FAL_KEY) return json({ error: 'FAL_KEY not configured on server' }, 500);

  const body = await request.json();
  const { tool, ...data } = body || {};
  if (!tool) return json({ error: 'tool is required' }, 400);

  const promptFn = PROMPTS[tool];
  if (!promptFn) return json({ error: `Unknown tool: ${tool}. Valid tools: ${Object.keys(PROMPTS).join(', ')}` }, 400);

  const prompt = promptFn(data);

  try {
    const falRes = await fetch(FAL_ANY_LLM, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt }),
    });
    if (!falRes.ok) throw new Error(`fal.ai error (${falRes.status}): ${await falRes.text()}`);

    const result = await falRes.json();
    const output = result.output || result.response || result.text || '';
    return json({ result: output.trim() });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};
