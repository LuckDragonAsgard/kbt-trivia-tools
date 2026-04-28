# RESUME-HERE — KBT pickup notes

**Read this first if you're a Claude session starting fresh on KBT** (any account, any computer, any surface). This file is the single source of truth — no memory, no auth, no setup required.

---

## What KBT is

Pub-quiz host + player platform powering live KBT (Know Brainer Trivia) events at ~9 venues across Melbourne. Static frontend on **GitHub Pages**, data on **Supabase**, branded export to **Google Slides**. No build step — push to `main`, GitHub Actions deploys in ~25s.

---

## Live URLs — every app

| Production app | URL |
|---|---|
| **Host** (live scoring during a night) | <https://luckdragonasgard.github.io/kbt-trivia-tools/host-app.html> |
| **Player register** | `…/player-app.html?code=EVENT_CODE` |
| **Player join existing team** | `…/player-app.html?code=EVENT&team=TEAMCODE` |
| **Team wrap** (post-event Spotify-style recap) | `…/wrap.html?event=EVENT&team=TEAMCODE` |
| **Individual wrap** | `…/wrap.html?event=EVENT&player=PLAYERCODE` |
| **Admin app** (events, teams, hosts, venues) | <https://luckdragonasgard.github.io/kbt-trivia-tools/admin-app.html> |

| In-quiz tool | URL |
|---|---|
| Brain Round | `…/brain-tool.html` |
| Brand identification | `…/brand-tool.html` |
| Carmen Sandiego (geo) | `…/carmen-sandiego-tool.html` |
| Crack the Code | `…/crack-the-code-tool.html` |
| Face Morph (talks to local Flask server) | `…/face-morph-tool.html` |
| Ghost Actors (silhouettes) | `…/ghost-actors-tool.html` |
| Guess the Year | `…/guess-the-year-tool.html` |
| Linked Pics | `…/linked-pics-tool.html` |
| SoundMash (audio) | `…/soundmash-tool.html` |

| Supporting | URL |
|---|---|
| Landing | `…/index.html` |
| Submit (question authoring) | `…/submit.html` |
| Question dev | `…/question-dev.html` |
| Live scoring (alt UI) | `…/live-scoring.html` |
| Presentation mode | `…/presentation.html` |
| Host brief generator | `…/host-brief-tool.html` |
| Examples | `…/kbt-examples.html` |
| Tools index | `…/tools.html` |
| Marketing site | <https://www.knowbrainertrivia.com.au> |

---

## Core concepts

### Scoring

- **Round totals** live in `trial_scores` keyed by `(event_code, team_name, round)` with `question_number = 0` as the canonical round-total row.
- **Per-question correctness** lives in the same table with `question_number > 0`. Each ✓/✗ click writes one row; the round total is auto-recomputed as `SUM(points WHERE question_number > 0)`.
- The host-app round-total `<input>` becomes **read-only** when per-question marks exist for that team+round — prevents accidentally clobbering an auto-summed value.
- Per-question marks **also dual-write** to `kbt_live_answers` (extended schema with `is_correct`, `points_awarded`).

### Gambler mechanic
The riskiest question of the night. Each team submits a wager (1× / 2× / 3×) **before** the question is revealed. Stored in `kbt_wager`. Correct → `base × wager`; wrong → 0 (or negative, depending on round config). Captured in the host-app's wager panel during the live quiz.

### Bonus questions
R1 Bonus 1, R2 Bonus H&T, R3 Bonus, etc. — worth more than standard. Tagged in `kbt_quiz` so the host UI badges them in purple. Typically 2× or 3× base points.

### Freebie
R1Q1 "Facebook Freebie" — always 1 point, gold badge, used as a warm-up.

### Parameterised rounds
`_activeRounds` is computed at launch from `[...new Set(quizItems.map(q => q.round))].sort()`. A 4-round event renders 4 score-table columns; a 5-round event renders 5. **No hardcoded 3.**

### Tonight's Schedule
Auto-derived from the loaded `quizItems` at launch — one row per round, with the most common question type as the round label and "(N qs)" suffix. Time = 7:00 PM + (round_index × 30 min).

### Captain rule
`kbt_team_member.is_captain BOOLEAN` with a partial unique index `kbt_team_member_one_captain_per_team` on `(team_id) WHERE is_captain = true`. The DB itself refuses to allow two captains on the same team. Captain reassignment is a single-transaction old=false / new=true swap.

### Wrap pages
Spotify-style end-of-night recap. Slides: hero, rank, **accuracy** (N/M correct, % — gold ≥80%, green ≥50%, magenta <50%), per-round breakdown.

### Slides export
- Real KBT brand logo on the title slide (mirrored to `/assets/kb_logo_white.png`).
- Four slide titles use **VVDS Fifties** rendered server-side as PNGs (`/assets/headings/h_*.png`) — Slides API can't load WOFF2, so we pre-render.
- Body text in Open Sans (Slides API limitation).
- One click also opens a server-side rendered PDF at `/export/pdf`.

### Player text-answer flow
- Player-app: a "✏️ Submit Answer" widget writes to `kbt_live_answers.selected_option`.
- Host-app: an "📥 Incoming Player Answers" panel polls every 3s and lets the host grade ✓/✗ inline.

---

## Architecture

```
   Browser                    GitHub Pages              Supabase
┌──────────┐               ┌────────────────┐         ┌─────────┐
│ host-app │ ── kbt-data ─▶│ (static HTML+  │ ─SQL──▶ │  KBT    │
│ player   │      .js      │  JS, no build) │         │ tables  │
│ wrap     │               │                │         │ (RLS on)│
│ admin    │               └────────────────┘         └─────────┘
│ tools    │                       ▲                       ▲
└──────────┘                       │                       │
   browser                  push to main                  anon key
                          (GHA deploy ~25s)            (publishable)
```

- **GitHub Pages** hosts static apps. Push to `main` → auto-deploy.
- **Supabase project `huvfgenbcaiicatvtxak`** (region `ap-southeast-2`) — Postgres + RLS + PostgREST.
- **Google Cloud project `bubbly-clarity-494509-g0`** — OAuth client for the Slides export. JS origin is the GH Pages domain.
- **Anon key** is publishable, embedded in `kbt-data.js`. Reads/writes are gated by RLS policies — every KBT table has RLS enabled.
- **No backend service** — everything runs from the browser against PostgREST + Slides API directly.

---

## Database — KBT-specific tables (34 total)

**Active write paths (anon):**
- `kbt_teams` — live event teams (RLS on, anon SELECT/INSERT/UPDATE)
- `kbt_team_member` — players on teams (RLS on, anon SELECT/INSERT/UPDATE, captain-uniqueness index)
- `kbt_wager` — Gambler wagers (RLS on, anon SELECT/INSERT/UPDATE)
- `kbt_live_answers` — player answers + host correctness (RLS on, anon SELECT/INSERT, host PATCH for grading)
- `trial_scores` — round totals + per-question correctness (RLS on, anon SELECT/INSERT/UPDATE)

**Anon-readable references (15 tables):**
- `kbt_event` (1,135 rows), `kbt_question` (6,653), `kbt_quiz` (35,382), `kbt_loc` (39 venues), `kbt_host` (14)
- Taxonomy: `kbt_qcat` (18), `kbt_qsubcat` (102), `kbt_qtype` (35), `kbt_qtag` (43), `kbt_qtagtype` (5)
- Joins: `kbt_question_qsubcat` (9,011), `kbt_question_qtag` (127), `kbt_facebook_freebies` (2)
- Other: `kbt_scores`, `kbt_sess`

**Service-role-only (10 tables):**
- `kbt_team` (3,158 legacy), `kbt_questions`/`kbt_events` (alt schema), `kbt_round_scores`, `kbt_sandbox_info`, `kbt_social_queue`, `kbt_audit_log`, `kbt_fun_fact_candidates`, `kbt_venue_managers`, `kbt_answer_submissions`

**Indexes:** every FK column is now covered. Query plans use index lookups, not seq scans.

---

## How to make a change

From any Claude chat:

```
KBT — change X to Y
```

Claude will follow `kbt-data.js` / `host-app.html` patterns, push the file to GitHub via the PAT in `asgard-vault.pgallivan.workers.dev` (X-Pin: `2967`), and GitHub Pages auto-deploys in ~25s.

For DB changes: Claude has the Supabase MCP and can apply migrations directly.

For Slides API changes: edit `slides-export.js`, push, deploy. Re-run "Export to Slides" in the host-app to test.

---

## Outstanding / next steps (what's NOT done)

After the bug-fix sweep on 2026-04-28, every item from the v7 outstanding-gaps list is closed. Genuine "next steps" are now feature work, not bug-fix:

- **Realtime push** instead of 3-second polling on the host's incoming-answers panel — switch to Supabase Realtime channels. Cleaner UX during fast rounds.
- **Push question to all players** signal — currently the player-side widget lets them type the round/Q# manually. A "host pushes the question" mechanism would auto-set those fields on every player device. Needs a session/state row in `kbt_sess` that the player polls or subscribes to.
- **Captain reassignment UI in player-app** — DB constraint exists, but the player UI for "transfer captain to teammate" isn't built yet.
- **PDF customisation** — the `/export/pdf` URL gives a default render. A custom-styled PDF (with branded margins, footer) would need a server-side render. Cloudflare Worker + headless Chrome could do it.
- **Question-bank authoring UX** — `submit.html` and `question-dev.html` are minimal. A friendlier authoring flow would help if you onboard hosts who write their own questions.
- **Per-venue analytics dashboard** — the data is there (events × scores × venues), but there's no chart/insight UI. Would be a wrap-style page but for venue-level metrics over time.
- **Player profiles + cross-event progression** — the schema supports it (`kbt_team_member` survives across events), but no UI surfaces a player's history yet.

None of these are blockers for running events. They're product-improvement directions.

---

## Connectors / accounts a fresh Claude session needs

- **GitHub** — `LuckDragonAsgard` org. PAT with `public_repo` scope is in the vault.
- **Drive** — `paddy@luckdragon.io` (rarely needed; per the storage rule, KBT is fully on GitHub now).
- **Supabase** — project `huvfgenbcaiicatvtxak`. Supabase MCP authed.
- **Cloudflare** — only needed if touching Asgard infrastructure or the vault.
- **Vault** — `https://asgard-vault.pgallivan.workers.dev`, X-Pin `2967` (verbal-only).

---

## Handover doc trail (full chronology)

- [v9 (2026-04-28)](docs/handovers/2026-04-27-v9.md) — final state of off-Drive migration + cross-account handover wired into Asgard
- [v8 (2026-04-27 eve)](docs/handovers/2026-04-27-v8.md) — migration started, 13 markdowns mirrored
- [v7 (2026-04-27 late)](docs/handovers/2026-04-27-v7.md) — RLS, captain constraint, per-q correctness, parameterised rounds, dynamic schedule, real logo
- [v6 (2026-04-27 mid)](docs/handovers/2026-04-27-v6.md) — launch path bugs + team_code/members/wager/wrap/branded slides
- [v5/v5.1 + earlier](docs/README.md) — Pages migration, bug-fix sweeps, original platform handoff

---

## TL;DR for picking up cold

- **Run an event:** open the host URL above. No setup.
- **Change something:** ask Claude (any account, any computer) — say "KBT — change X".
- **Learn the system:** read this file, then v9 handover, ~30 minutes total.
- **Schema / scoring questions:** see "Core concepts" above or query Claude with "KBT — explain Y".
- **Bin your laptop:** nothing irreplaceable lives on it. Everything is in GitHub + Supabase + Anthropic's account-bound preferences.

KBT is a single self-contained product on the Asgard portfolio. The Asgard platform handover lives at <https://github.com/PaddyGallivan/asgard-source/blob/main/docs/HANDOVER.md>; this file is the KBT-specific deep-dive linked from there.
