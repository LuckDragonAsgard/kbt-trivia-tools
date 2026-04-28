# KBT Question Engine — Product Brief
**Version:** 1.0 · **Date:** 2026-04-29 · **Author:** Paddy + Claude

---

## Why This Exists

KBT runs ~9 venues across Melbourne. The question bank (`kbt_question`: 6,653 rows, `kbt_quiz`: 35,382) is solid but needs constant fresh content. Hosts burn through material fast. New formats (school, corporate, HQ-style live) need new question shapes. And every question in the bank needs to be trustworthy — wrong answers at a fundraiser or work function are embarrassing.

This brief defines: what a good question looks like, a pipeline to find and generate them automatically, new question types and bonus formats, and two new event formats (Weekly School, HQ Live).

---

## Part 1 — What Makes a Good KBT Question

### The Golden Rule
> "I should have known that."

A great trivia question makes the audience feel the answer was within reach. Not too easy (boring) — not too hard (alienating). The sweet spot is 40–70% of teams getting it right.

### The Audience: Know Your Room

KBT runs four contexts. Every question must be **viable in at least two**:

| Context | Vibe | Avoid |
|---|---|---|
| **Pub trivia** | Loose, fun, beer in hand | Anything that feels like homework |
| **Fundraiser** | Inclusive, broad age range, feel-good | Controversial, niche sport, heavy politics |
| **Work function** | Professional, team-bonding, no HR moments | Anything sexual, violent, divisive |
| **Family / friends** | Cross-generational, light humour | Youth slang, explicit content, insider references |

### The 10 Criteria (scored 1–5 each, minimum total 35/50 to qualify)

1. **Guessable** — A team with no idea can still make an educated guess. Eliminates pure memory tests.
2. **One right answer** — No ambiguity. "Name a country in Europe" fails. "What is the capital of Norway?" passes.
3. **Surprising answer** — The answer has some "oh wow" factor. The mundane fails.
4. **Verifiable from 2+ sources** — Can be confirmed in Wikipedia, an encyclopaedia, or a news archive. No urban legends.
5. **Read-aloud friendly** — Under 20 words. No subordinate clauses. No pronunciation landmines.
6. **Age-neutral** — Can be answered by a 25-year-old and a 65-year-old equally.
7. **Culture-neutral** — Does not assume Australian-only knowledge (some is fine, not all). Works internationally.
8. **No controversy** — Steers clear of living politicians' opinions, religious doctrine, contested history.
9. **Fun factor** — Elicits a reaction: a laugh, a gasp, a "no way!" when the answer is revealed.
10. **Category clarity** — Clearly belongs to a category (sport, science, pop culture, food, geography, etc.)

### Red-flag phrases that usually fail
- "Who was the first person to ever…" → almost always niche
- "In what year did…" → year questions are guessable but rarely satisfying
- "Which of the following…" → MCQ format, not suited to live scoring
- "Name all…" → open-ended, ungradeable
- "According to…" → source-dependent, creates disputes

### The Gambler Question Standard
Gambler questions are the highest-stakes question of the night. They must clear an **elevated bar**:
- Verified from **3+ independent sources**
- Answer is a specific, unambiguous fact (name, number, date, place)
- No edge cases ("it depends on the year/region")
- The *wrong* answers (what teams guess) must be plausible — not laughably wrong
- Double fact-checked by AI, then flagged for human review before use

---

## Part 2 — The Auto-Question Sourcer Pipeline

### Overview
A CF Worker (`kbt-question-engine`) runs on a schedule (configurable: every 6h / daily / on-demand). It:
1. **Scrapes** raw interesting-fact content from multiple sources
2. **Generates** question drafts in KBT format using Claude
3. **Double fact-checks** each question (two independent Claude calls)
4. **Scores** against the 10 quality criteria
5. **Saves** to `kbt_question_candidates` in Supabase with status `pending_review`
6. Approved questions flow into `kbt_question` via admin app

### Source Tiers

**Tier 1 — Gold (always scrape)**
- Wikipedia "Did You Know?" portal — daily rotations of verified interesting facts
- Wikipedia featured article "Interesting facts" section
- `r/todayilearned` top posts (24h) — community-curated surprising facts
- `r/triviatime` — existing trivia content + community quality signal

**Tier 2 — Silver (weekly)**
- Wikipedia "On This Day" — date-anchored historical facts (great for themed nights)
- Sports reference sites — record-breakers, firsts, unlikely achievements
- Guinness World Records new entries
- Mental Floss, Atlas Obscura, Smithsonian Magazine
- IMDB trivia sections (films, TV)
- Britannica "5 Fast Facts"

**Tier 3 — Bronze (monthly, AI-generated)**
- Claude generates questions on under-represented categories (science, geography, food)
- GPT cross-check for variety
- Historical deep-dives on specific decades (70s, 80s, 90s) for themed events

### The Double Fact-Check

Every generated question is verified **twice** by two independent Claude calls with different system prompts:

**Check 1 — Accuracy Check**
> "You are a meticulous fact-checker. Given this trivia question and answer, verify: (a) is the answer factually correct? (b) is it unambiguous? (c) can you name at least two authoritative sources that confirm it? Return: PASS/FAIL + confidence score 1–10 + any corrections."

**Check 2 — Devil's Advocate Check**
> "You are a trivia question challenger. Your job is to find reasons why this answer might be wrong, contested, or incomplete. Look for: regional variations, historical changes, alternative valid answers, common misconceptions. Return: PASS/FAIL + any issues found."

Only questions that **PASS both checks** advance. FAIL on either → rejected or sent to human review with the issue flagged.

### The Quality Score

After passing fact-check, Claude rates the question on the 10 criteria (1–5 each). Questions scoring ≥35/50 go to `pending_review`. Questions scoring ≥45/50 are auto-tagged `high_quality` and surface first in the admin review queue.

---

## Part 3 — New Question Types

### Core New Types

#### 🎯 Closest Wins
"How many piano keys are on a standard concert grand?" — teams write a number. Closest wins the points. Ties split.
- DB field: `question_type = 'closest_wins'`, `correct_answer` = number as string
- Great for: quantities, years, distances, populations
- Bonus: "Closest without going over" variant (Price is Right style)

#### 🧩 Connections
Four groups of four. Teams identify what connects each group.
- Example: {MERCURY, VENUS, MARS, JUPITER} = Planets; {MERCURY, PRINCE, BOWIE, JAGGER} = Rock gods; etc.
- DB field: `question_type = 'connections'`, stored as JSON: `{groups: [{label, items: []}]}`
- Scoring: 1pt per group identified correctly

#### ✅ Two Truths One Lie
Three statements about a topic. One is false. Teams identify the lie.
- Example: "1. Sharks are mammals. 2. A group of flamingos is called a flamboyance. 3. The shortest war in history lasted 38 minutes." → Q: Which is false? A: 1 (sharks are fish)
- DB field: `question_type = 'two_truths_one_lie'`, stored as JSON: `{statements: [], lie_index: 0}`

#### 📱 Emoji Decode
A sequence of emojis represents a film, song, brand, or phrase.
- Example: 🦁 👑 🌅 = The Lion King
- DB field: `question_type = 'emoji_decode'`, `question_text` = emoji string, `correct_answer` = decoded answer
- Works great projected on screen — no reading needed

#### ⛓️ Chain Round
Answer to Q1 becomes part of Q2, which feeds Q3.
- Example: Q1: "What country hosted the 2016 Olympics?" → A: Brazil. Q2: "What is the capital of [Brazil]?" → A: Brasília. Q3: "What does Brasília literally mean?" → A: "Brazil" (named after the country)
- Must be authored as a linked set of 3–5 questions
- DB: `round_type = 'chain'`, questions linked via `parent_question_id`

#### ⚡ Lightning Round
10 questions, 30 seconds, verbal answers only, host ticks yes/no.
- No conferring — first answer from team counts
- DB: `round_type = 'lightning'`, all questions must have single-word or very short answers

#### 🔄 Before & After
One word that completes two phrases.
- Example: "Backstreet ___" + "___ Street Boys" → BOTH (Backstreet Boys, Boys to Men… actually just: BOYS)
- Better: "___ fish" + "sword ___" = FISH? No: "sword fish" + "fish and chips" → FISH. Or: "SUN ___" + "___ LIGHT" → FLOWER (Sunflower, Flowerlight — hmm)
- Use format: `[WORD A] + [BLANK] + [WORD B]` where blank completes both
- DB: `question_type = 'before_and_after'`

#### 📸 Picture Plus
Not just "name this person" — "what connects these four people/places/things?"
- Shows 4 images, teams identify the link
- DB: `question_type = 'picture_plus'`, `image_urls` array + `connection` answer

#### 🎭 Famous Firsts
First of something notable — not year-guessing, but name/fact.
- "Who was the first woman to win a Nobel Prize?" (Marie Curie — physics, 1903)
- "What was the first country to give women the right to vote?" (New Zealand, 1893)
- Always has a clean, singular answer

### Bonus Round Formats

#### 💰 Accumulator
Pot starts at 10 points. Each correct answer adds 10. Team can stop and bank at any time. Wrong answer = lose the pot. Last question = must stop or go double-or-nothing.

#### 🥷 Steal
If the leading team gets it wrong, any other team can steal by answering correctly. Steal = full points + one point from the leader's score.

#### 💀 Survivor Round
Five questions. Wrong answer on any = eliminated from the round (score what you have). Last team standing gets a bonus 20 points. Great for late-night rounds.

#### 🔀 Trade
Teams can trade one "pass token" (earned earlier) to skip a question and take the average score of the room instead.

---

## Part 4 — Event Formats

### Weekly School Format

Designed for school assemblies, classroom use, end-of-term events, or weekly workplace quizzes.

**Structure:**
- 3 rounds × 5 questions = 15 questions total (~25 minutes)
- Round 1: General Knowledge (warm-up, easier)
- Round 2: Theme Round (rotating weekly theme — animals, space, history, sport, food)
- Round 3: Lightning Round (quick-fire, individual answers)

**Scoring:**
- 2 points per correct answer (simpler than pub format)
- "Star of the Round" — team/person with most correct in each round gets a gold star badge
- Leaderboard resets weekly (not cumulative)

**Tone:** Educational but fun. No gambling mechanic. No alcohol references. Teacher/facilitator hosts.

**Player app:** Same URL, different event type (`event_type = 'school'`). Shows age-appropriate UI, no wager panel.

### HQ Live Format

Inspired by HQ Trivia — mass elimination, one winner, high drama.

**Structure:**
- 12 questions total, increasing difficulty
- Every team answers every question simultaneously (10-second timer shown on screen)
- Wrong answer → team is eliminated (greyed out on leaderboard, shown spectator mode)
- Surviving teams after Q12 share the "pot" (if fundraiser, that's the prize pool)
- Tie-breaker: Closest Wins question for the survivors

**Player experience:**
- Player app shows countdown timer
- "❌ Eliminated" screen if wrong
- "Still in! X teams remain" if correct
- Final survivors see a celebration screen

**Host experience:**
- Host app shows elimination count in real time
- Can "save" one eliminated team (drama mechanic — used once per event)
- Can set the prize pot value shown on screen

**DB changes needed:**
- `kbt_event.event_type = 'hq_live'`
- `kbt_teams.hq_status` = 'active' | 'eliminated' | 'spectator'
- Timer push via Supabase Realtime

---

## Part 5 — Implementation Roadmap

### Phase 1 — Foundation (this session)
- [x] Brief written and committed to repo
- [ ] `kbt_question_candidates` table in Supabase
- [ ] `kbt-question-engine` CF Worker: scrape → generate → fact-check × 2 → score → save
- [ ] Scheduled trigger (CF Cron, every 6 hours)

### Phase 2 — New Question Types (next session)
- [ ] DB schema: new `question_type` values + JSON fields for complex types
- [ ] New `kbt_qtype` rows for all new types
- [ ] Admin app: candidate review queue (approve/reject/edit before adding to bank)
- [ ] Host app: render Closest Wins, Emoji Decode, Two Truths UI

### Phase 3 — New Formats (following session)
- [ ] Weekly School: event type, shorter UI, school-mode player app
- [ ] HQ Live: elimination logic, real-time Realtime push, timer overlay
- [ ] New bonus rounds: Accumulator, Steal, Survivor in host app

### Phase 4 — Quality & Analytics
- [ ] Quality score visible on every question in admin
- [ ] "Questions needing refresh" flag (used >3× in last 6 months)
- [ ] Per-category health dashboard (how many qs per category, avg quality)
- [ ] Gambler bank: separate reviewed + triple-verified pool

---

## Appendix — Quality Prompt (used by auto-sourcer)

```
You are a trivia question quality assessor for KBT (Know Brainer Trivia), a pub quiz platform running events at venues across Melbourne, Australia. Events include pub nights, fundraisers, work functions, and family gatherings.

Rate this question on the following 10 criteria, 1-5 each:
1. Guessable (40-70% of teams should get it right)
2. Single unambiguous correct answer
3. Surprising / "I should have known that" factor
4. Verifiable from 2+ authoritative sources
5. Read-aloud friendly (under 20 words, no pronunciation issues)
6. Age-neutral (works for 25-year-olds and 65-year-olds)
7. Culture-neutral (not hyper-local or niche)
8. No controversy (no living politicians' opinions, no religious doctrine)
9. Fun factor (elicits a laugh, gasp, or wow)
10. Clear category belonging

Minimum to qualify: 35/50.
Auto-approved (high quality): 45/50.
Below 35: reject with reason.

Return JSON: { scores: [s1..s10], total: N, verdict: "APPROVED"|"REVIEW"|"REJECTED", reason: "..." }
```

