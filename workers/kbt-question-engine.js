// kbt-question-engine v1.1.0
// Auto-sources trivia questions from the web, generates drafts via Claude,
// double fact-checks each, scores against quality criteria, saves to Supabase.
// Secrets: ANTHROPIC_API_KEY, SUPABASE_ANON_KEY
// CF Cron: every 6 hours  (0 */6 * * *)

const SUPABASE_URL = 'https://huvfgenbcaiicatvtxak.supabase.co';
const SUPABASE_TABLE = 'kbt_question_candidates';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── Prompts ──────────────────────────────────────────────────────────────────

const QUALITY_SYSTEM = `You are a trivia question quality assessor for KBT (Know Brainer Trivia), a pub quiz platform in Melbourne. Events: pub nights, fundraisers, work functions, family gatherings.

Rate on 10 criteria, 1-5 each:
1. Guessable (40-70% of teams should get it)
2. Single unambiguous answer
3. Surprising / "I should have known that!" factor
4. Verifiable from 2+ authoritative sources
5. Read-aloud friendly (under 20 words)
6. Age-neutral (works 25yo AND 65yo)
7. Culture-neutral (not hyper-local/niche)
8. No controversy (no living politicians' opinions, no religious doctrine)
9. Fun factor (laugh, gasp, or wow)
10. Clear category belonging

Min to qualify: 35/50. Auto-approved: 45/50. Below 35: reject.

Return ONLY valid JSON:
{"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9,s10],"total":N,"verdict":"APPROVED|REVIEW|REJECTED","reason":"one sentence","category":"Sport|Science|Pop Culture|History|Geography|Food & Drink|Music|Film & TV|Nature|Technology|Art & Literature|General Knowledge","difficulty":5,"fun_fact":"one sentence follow-up fact"}`;

const FC1_SYSTEM = `You are a meticulous fact-checker for a trivia platform. Given a question and answer, verify: (a) factually correct? (b) unambiguous? (c) 2+ authoritative sources?
Return ONLY valid JSON: {"result":"PASS|FAIL","confidence":1-10,"sources":["s1","s2"],"issues":null,"corrected_answer":null}`;

const FC2_SYSTEM = `You are a devil's advocate fact-checker. Find ANY reason this trivia answer could be wrong, contested, or incomplete. Check: regional variations, historical changes, alternative valid answers, edge cases.
Return ONLY valid JSON: {"result":"PASS|FAIL","confidence":1-10,"issues":null,"verdict":"one sentence"}`;

const GEN_SYSTEM = `You are a trivia question writer for KBT, a Melbourne pub quiz platform. Events: pub nights, fundraisers, work functions, family gatherings.

Given a raw fact, write 1-2 trivia questions. Requirements:
- Suitable for mixed audiences (pub, work, family)
- 40-70% of teams should get it right (not too easy, not too obscure)
- Under 20 words, read-aloud friendly
- Exactly ONE unambiguous correct answer
- Surprising and fun — "I should have known that!" energy
- question_type from: Classic, Closest Wins, Famous Firsts, Two Truths One Lie, Emoji Decode, Before & After
- gambler_eligible: true ONLY if answer is specific, unambiguous, verifiable from 3+ sources, NO edge cases

Return ONLY a valid JSON array:
[{"question_text":"...","correct_answer":"...","question_type":"Classic","gambler_eligible":false}]`;

// ─── Scrapers ─────────────────────────────────────────────────────────────────

async function scrapeWikipediaRandom() {
  try {
    const fetches = Array.from({ length: 5 }, () =>
      fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary', {
        headers: { 'User-Agent': 'KBT-Question-Engine/1.1 (trivia@luckdragon.io)' }
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    );
    const results = await Promise.all(fetches);
    const facts = [];
    for (const r of results) {
      if (!r?.extract || r.extract.length < 60) continue;
      const sentences = r.extract.split(/(?<=[.!?])\s+/);
      const text = sentences.slice(0, 2).join(' ').substring(0, 280);
      if (text.length > 50) {
        facts.push({ text, source: 'Wikipedia', url: r.content_urls?.desktop?.page || 'https://en.wikipedia.org' });
      }
    }
    return facts;
  } catch { return []; }
}

async function scrapeWikipediaOnThisDay() {
  try {
    const d = new Date();
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${d.getMonth()+1}/${d.getDate()}`,
      { headers: { 'User-Agent': 'KBT-Question-Engine/1.1' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events || [])
      .slice(0, 5)
      .map(e => ({
        text: `In ${e.year}: ${e.text}`.substring(0, 260),
        source: 'Wikipedia On This Day',
        url: 'https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries'
      }))
      .filter(f => f.text.length > 40);
  } catch { return []; }
}

async function scrapeRedditTIL() {
  try {
    const res = await fetch('https://old.reddit.com/r/todayilearned/top.json?limit=15&t=day', {
      headers: {
        'User-Agent': 'KBT-Question-Engine/1.1 (trivia@luckdragon.io)',
        'Accept': 'application/json',
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children || [])
      .map(p => p.data)
      .filter(p => !p.stickied && p.score > 50)
      .map(p => ({
        text: p.title.replace(/^TIL\s+(that\s+)?/i, '').trim(),
        source: 'Reddit r/todayilearned',
        url: `https://reddit.com${p.permalink}`
      }))
      .filter(f => f.text.length > 40 && f.text.length < 300)
      .slice(0, 5);
  } catch { return []; }
}

async function scrapeWikipediaFeatured() {
  try {
    const d = new Date();
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/featured/${y}/${m}/${day}`, {
      headers: { 'User-Agent': 'KBT-Question-Engine/1.1' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text = (data.extract || '').substring(0, 280);
    return text.length > 50 ? [{ text, source: 'Wikipedia Featured', url: data.content_urls?.desktop?.page || 'https://en.wikipedia.org' }] : [];
  } catch { return []; }
}

// ─── Claude helpers ───────────────────────────────────────────────────────────

async function claudeJSON(apiKey, system, user, maxTokens = 600) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const m = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!m) throw new Error('No JSON in response: ' + text.slice(0, 150));
  return JSON.parse(m[1] || m[0]);
}

async function generateDrafts(apiKey, fact) {
  try {
    const r = await claudeJSON(apiKey, GEN_SYSTEM, `Raw fact:\n"${fact.text}"\nSource: ${fact.source}`);
    return Array.isArray(r) ? r : [r];
  } catch { return []; }
}

async function factCheck1(apiKey, q, a) {
  try { return await claudeJSON(apiKey, FC1_SYSTEM, `Question: ${q}\nAnswer: ${a}`, 400); }
  catch (e) { return { result: 'FAIL', confidence: 0, issues: e.message }; }
}

async function factCheck2(apiKey, q, a) {
  try { return await claudeJSON(apiKey, FC2_SYSTEM, `Question: ${q}\nAnswer: ${a}`, 400); }
  catch (e) { return { result: 'FAIL', confidence: 0, issues: e.message }; }
}

async function qualityScore(apiKey, q, a) {
  try { return await claudeJSON(apiKey, QUALITY_SYSTEM, `Question: ${q}\nAnswer: ${a}`, 500); }
  catch (e) { return { scores: [], total: 0, verdict: 'REJECTED', reason: e.message }; }
}

// ─── Supabase save ────────────────────────────────────────────────────────────

async function saveCandidate(key, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase insert: ${res.status} ${await res.text()}`);
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function runPipeline(env, maxFacts = 10) {
  const apiKey = env.ANTHROPIC_API_KEY;
  const sbKey = env.SUPABASE_ANON_KEY;
  if (!apiKey || !sbKey) throw new Error('Missing secrets');

  const stats = { scraped: 0, generated: 0, passed_fc: 0, saved: 0, rejected: 0, errors: [] };

  const [wiki, otd, til, feat] = await Promise.all([
    scrapeWikipediaRandom(), scrapeWikipediaOnThisDay(),
    scrapeRedditTIL(), scrapeWikipediaFeatured(),
  ]);

  const facts = [...wiki, ...otd, ...til, ...feat].slice(0, maxFacts);
  stats.scraped = facts.length;

  for (const fact of facts) {
    try {
      const drafts = await generateDrafts(apiKey, fact);
      stats.generated += drafts.length;

      for (const d of drafts) {
        if (!d.question_text || !d.correct_answer) continue;

        const [fc1, fc2] = await Promise.all([
          factCheck1(apiKey, d.question_text, d.correct_answer),
          factCheck2(apiKey, d.question_text, d.correct_answer),
        ]);

        if (fc1.result !== 'PASS' || fc2.result !== 'PASS') {
          stats.rejected++;
          await saveCandidate(sbKey, {
            question_text: d.question_text,
            correct_answer: d.correct_answer,
            question_type: d.question_type || 'Classic',
            source_url: fact.url, source_name: fact.source, raw_material: fact.text,
            factcheck_1_result: fc1.result, factcheck_1_score: fc1.confidence, factcheck_1_detail: fc1.issues,
            factcheck_2_result: fc2.result, factcheck_2_score: fc2.confidence, factcheck_2_detail: fc2.issues,
            quality_verdict: 'REJECTED', quality_reason: `FC fail: FC1=${fc1.result} FC2=${fc2.result}`,
            status: 'rejected', gambler_eligible: false,
          }).catch(() => {});
          continue;
        }

        stats.passed_fc++;
        const quality = await qualityScore(apiKey, d.question_text, d.correct_answer);
        const status = quality.verdict === 'REJECTED' ? 'rejected' : 'pending_review';

        await saveCandidate(sbKey, {
          question_text: d.question_text,
          correct_answer: fc1.corrected_answer || d.correct_answer,
          question_type: d.question_type || 'Classic',
          category: quality.category,
          difficulty: quality.difficulty,
          fun_fact: quality.fun_fact,
          source_url: fact.url, source_name: fact.source, raw_material: fact.text,
          factcheck_1_result: fc1.result, factcheck_1_score: fc1.confidence,
          factcheck_1_detail: Array.isArray(fc1.sources) ? fc1.sources.join(', ') : fc1.issues,
          factcheck_2_result: fc2.result, factcheck_2_score: fc2.confidence, factcheck_2_detail: fc2.verdict,
          quality_scores: quality.scores, quality_total: quality.total,
          quality_verdict: quality.verdict, quality_reason: quality.reason,
          gambler_eligible: d.gambler_eligible === true && (quality.total || 0) >= 45,
          status,
          suitable_formats: ['pub', 'fundraiser', 'work', 'family'],
        });
        stats.saved++;
      }
    } catch (e) { stats.errors.push(e.message); }
  }

  return stats;
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

const j = (data, s = 200) => new Response(JSON.stringify(data), {
  status: s, headers: { 'Content-Type': 'application/json', ...CORS }
});

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPipeline(env, 10));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

    if (url.pathname === '/' || url.pathname === '/health') {
      return j({ worker: 'kbt-question-engine', version: '1.1.0',
        endpoints: ['GET /health', 'POST /run', 'GET /pending', 'GET /debug/sources', 'POST /approve', 'POST /reject'] });
    }

    if (url.pathname === '/run' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const maxFacts = Math.min(body.max_facts || 5, 20);
      try {
        return j({ ok: true, results: await runPipeline(env, maxFacts) });
      } catch (e) { return j({ ok: false, error: e.message }, 500); }
    }

    if (url.pathname === '/debug/sources') {
      const [wiki, otd, til, feat] = await Promise.all([
        scrapeWikipediaRandom().catch(e => ({ error: e.message })),
        scrapeWikipediaOnThisDay().catch(e => ({ error: e.message })),
        scrapeRedditTIL().catch(e => ({ error: e.message })),
        scrapeWikipediaFeatured().catch(e => ({ error: e.message })),
      ]);
      return j({ wikipedia_random: wiki, on_this_day: otd, reddit_til: til, featured: feat,
        total: [wiki, otd, til, feat].flat().length });
    }

    if (url.pathname === '/pending' && request.method === 'GET') {
      const limit = url.searchParams.get('limit') || '20';
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?status=eq.pending_review&order=quality_total.desc&limit=${limit}`,
        { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      return j({ ok: true, count: data.length, candidates: data });
    }

    if (url.pathname === '/approve' && request.method === 'POST') {
      const { id, reviewed_by = 'host' } = await request.json().catch(() => ({}));
      if (!id) return j({ error: 'id required' }, 400);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'approved', reviewed_by, reviewed_at: new Date().toISOString() }),
      });
      return res.ok ? j({ ok: true, id, status: 'approved' }) : j({ error: await res.text() }, 500);
    }

    if (url.pathname === '/reject' && request.method === 'POST') {
      const { id, reason = '', reviewed_by = 'host' } = await request.json().catch(() => ({}));
      if (!id) return j({ error: 'id required' }, 400);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason, reviewed_by, reviewed_at: new Date().toISOString() }),
      });
      return res.ok ? j({ ok: true, id, status: 'rejected' }) : j({ error: await res.text() }, 500);
    }

    return j({ error: 'Not found', routes: ['/health', '/run', '/pending', '/debug/sources', '/approve', '/reject'] }, 404);
  },
};
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       