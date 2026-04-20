export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { questions } = req.body || {};
  if (!questions?.length) return res.status(400).json({ error: 'questions[] required' });

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const questionsText = questions.map((q, i) =>
    `[${i}] Q: ${q.q}\n    A: ${q.a}\n    Category: ${q.category || 'General'}\n    Difficulty: ${q.difficulty || 'medium'}`
  ).join('\n\n');

  const prompt = `You are a senior trivia quality auditor for Know Brainer Trivia — a pub trivia company running weekly nights at Melbourne pubs. You deeply understand what makes a great pub trivia question based on KBT's own philosophy.

KBT QUALITY STANDARDS:

1. GUESSABLE (even without knowing)
   - Can it be logically narrowed down? Reducible to a set of possible values?
   - No worse than 4-to-1 odds with logic. Answer should feel like "of course!"
   - INSTANT FAIL: leaves teams with nothing to work with

2. INCLUSIVE (not a trivia snob question)  
   - Normal pub-goer should have a fighting chance
   - INSTANT FAIL: obscure-for-obscure's-sake (e.g. "What is an aglet?" = immediate reject)
   - Would only hardcore trivia nerds know this? Reject it.

3. ENTERTAINING (creates team debate and drama)
   - "I should've known that!" moments
   - Sparks debate between teammates, each knowing different pieces
   - Cross-genre questions are great (music + film + sport)
   - "Hidden in plain sight" — things you see daily but never thought about
   - Nostalgic but not so old it excludes younger players

4. EDUCATIONAL (definitively correct)
   - No urban myths, no old wives tales, don't trust first Google result
   - If source needed, cite in question phrasing ("According to X...")
   - INSTANT FAIL: Time-sensitive answers (current populations, records, holders) unless timestamped
   - INSTANT FAIL: Undefinable/disputable (river lengths, coastlines, building heights, species counts)
   - INSTANT FAIL: Multiple valid correct answers exist

5. WELL-CRAFTED
   - Not too wordy — no paragraph of background needed
   - Consider flipping subject/object so the answer is the interesting payoff
   - Answer: short (1-4 words ideal), specific, easy to score unambiguously
   - INSTANT FAIL: Answers requiring exact contested figures

6. PUB-SAFE: appropriate for mixed adult pub audience

Questions to evaluate:
${questionsText}

Scoring 0-10:
9-10: Exemplary KBT question | 7-8: Good | 5-6: Needs rewrite | 3-4: Poor | 0-2: Instant fail

Fact verification: VERIFIED (100% confident) | LIKELY (probably correct) | UNCERTAIN (flag for human) | WRONG (incorrect, provide fix)

Verdict: PASS (score≥7 AND VERIFIED/LIKELY) | EDIT (score 5-6 OR UNCERTAIN OR fixable) | FAIL (score<5 OR WRONG OR instant-fail)

Return ONLY valid JSON array:
[{"index":0,"quality_score":8,"quality_breakdown":{"guessable":2,"inclusive":2,"entertaining":2,"educational":2},"quality_notes":"Brief note","fact_status":"VERIFIED","fact_notes":"Why confident","corrected_answer":null,"suggested_rewrite":null,"cheat_risk":"low","verdict":"PASS","verdict_reason":"One line summary"}]`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      })
    });

    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const textBlock = [...(data.content || [])].reverse().find(b => b.type === 'text');
    if (!textBlock?.text) return res.status(500).json({ error: 'No response text', raw: JSON.stringify(data.content) });

    const clean = textBlock.text.replace(/```json\n?|```/g, '').trim();
    const results = JSON.parse(clean);
    const pass = results.filter(r => r.verdict === 'PASS').length;
    const edit = results.filter(r => r.verdict === 'EDIT').length;
    const fail = results.filter(r => r.verdict === 'FAIL').length;
    return res.status(200).json({ results, summary: { pass, edit, fail, total: results.length } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
