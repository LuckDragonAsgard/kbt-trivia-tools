/**
 * /api/fact-check
 * Routes through Asgard AI which has ANTHROPIC_API_KEY configured
 * Uses Claude Sonnet with web search for deep fact verification
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { questions } = req.body || {};
  if (!questions?.length) return res.status(400).json({ error: 'questions[] required' });

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env' });

  const prompt = `You are a senior trivia quality auditor for Know Brainer Trivia — a professional pub trivia company running weekly nights across Melbourne pubs.

Your job: evaluate EVERY question below using TWO lenses:

━━━ LENS 1: QUALITY SCORING ━━━
Score each question 0–10 based on:
• CLARITY (0-2): Is the question unambiguous? One clear interpretation only?
• ANSWER (0-2): Is the answer specific, concise (ideally 1-4 words), and indisputably correct?
• AUDIENCE FIT (0-2): Can a typical pub-goer reasonably know this? Not too obscure, not too simple?
• ENGAGEMENT (0-2): Does it create a "oh yeah!" or "I should have known that!" moment?
• PUB SAFE (0-2): Appropriate for a mixed adult pub audience? No sensitive/offensive content?

DISQUALIFY (score 0) if:
- Multiple valid answers exist
- Answer is a number that requires knowing an exact figure (e.g. "How many bones in the human body?")
- Question is about something that may have changed (e.g. "Who is the current Prime Minister?")
- Answer is too long (>6 words)
- Question is offensive or politically charged

━━━ LENS 2: FACT VERIFICATION ━━━
Verify the answer is factually correct. Use your knowledge to check.
Status options:
• VERIFIED — 100% confident, well-known fact
• LIKELY — Probably correct, minor uncertainty
• UNCERTAIN — Not confident, needs human check  
• WRONG — Answer is incorrect (provide correction)

━━━ QUESTIONS TO EVALUATE ━━━
${questions.map((q, i) => `[${i}] Q: ${q.q}\n    A: ${q.a}\n    Category: ${q.category || 'General'}\n    Difficulty: ${q.difficulty || 'medium'}`).join('\n\n')}

━━━ VERDICT RULES ━━━
PASS    → quality ≥ 7 AND fact is VERIFIED or LIKELY
EDIT    → quality 5-6, OR fact is UNCERTAIN, OR minor wording fix needed
FAIL    → quality < 5, OR fact is WRONG, OR disqualified

Return ONLY a JSON array, no markdown, no explanation:
[{"index":0,"quality_score":8,"quality_breakdown":{"clarity":2,"answer":2,"audience_fit":2,"engagement":1,"pub_safe":1},"quality_notes":"Brief issue if any","fact_status":"VERIFIED","fact_notes":"Why you're confident","corrected_answer":null,"suggested_rewrite":null,"verdict":"PASS","verdict_reason":"One line summary"}]

If fact is WRONG, set corrected_answer to the right answer.
If quality < 7 but fixable, set suggested_rewrite to an improved version.`;

  try {
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
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      })
    });

    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    // Get the last text block (after any tool use)
    const textBlock = [...(data.content || [])].reverse().find(b => b.type === 'text');
    if (!textBlock?.text) return res.status(500).json({ error: 'No text in response', raw: data });

    const clean = textBlock.text.replace(/```json\n?|```/g, '').trim();
    const results = JSON.parse(clean);

    // Summary stats
    const pass = results.filter(r => r.verdict === 'PASS').length;
    const edit = results.filter(r => r.verdict === 'EDIT').length;
    const fail = results.filter(r => r.verdict === 'FAIL').length;

    return res.status(200).json({ results, summary: { pass, edit, fail, total: results.length } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
