
## Question Engine — Auto-sourcer (2026-04-29)

- **Worker:** `kbt-question-engine.pgallivan.workers.dev` — runs every 6h automatically via CF Cron
- **Manual trigger:** `POST /run` with `{"max_facts": N}` (max 20)
- **Review UI:** `…/question-candidates.html` — approve/reject queued candidates
- **Pipeline:** Wikipedia (random + On This Day) + Reddit TIL → Claude generates Q drafts → FC1 accuracy check → FC2 devil's advocate check → quality score /50 → saved to `kbt_question_candidates`
- **Thresholds:** 45+/50 = APPROVED, 35–44 = pending_review, <35 = rejected
- **Gambler flag:** only on 45+ questions with clean FC1 + FC2
- **New question types (DB ids 36–48):** Closest Wins, Connections, Two Truths One Lie, Emoji Decode, Chain Round, Lightning, Before & After, Picture Plus, Famous Firsts, Wipeout, Accumulator, Steal Round, Survivor
- **Full product brief:** `docs/kbt-question-engine-brief.md` in this repo

## Tool Audit & Upgrade — 2026-04-29

### face-morph-tool.html → v6 (commit e26e1396)
- **Was:** single fal-faceswap call (Easel AI), no bg removal, rectangular white border sticker
- **Now:** full two-pass blend pipeline:
  1. rembg via `/api/fal-rembg` on both faces (parallel)
  2. Two `/api/fal-morph` calls in parallel (A-base+B-swap AND B-base+A-swap)
  3. Canvas 50/50 blend → true feature morph (both faces recognisable)
  4. Slide A: dark KBT bg, framed morph photo centred
  5. Slide B: dark KBT bg — Face A as cutout sticker (white outline dilation + drop shadow), morph as framed photo, Face B as cutout sticker
- Total pipeline time: ~35–45s

### brain-tool.html → bg fix (commit 49c2a172)
- BrainA and BrainB output canvases now have KBT dark gradient background (#0f172a → #1e293b)
- Previously exported with transparent background

### All tools status (2026-04-29) — ALL ✅
- fact-check ✅ · ai-text ✅ · fal-morph ✅ · fal-faceswap ✅ · fal-inpaint ✅ · fal-rembg ✅ · generate-slides ✅
- brain-tool ✅ · soundmash-tool ✅ · face-morph-tool ✅ (upgraded)
- Live Worker hash: fb4904ea — no changes needed this session

## Full tool branding audit + upgrade — 2026-04-29

### KBT Standard (now applied to ALL tools):
- **Background:** `#0f172a → #1e293b` dark gradient
- **Font:** `Bowlby One SC` for all slide titles
- **Question accent:** teal `#2dd4bf` (bar + title + highlights)
- **Answer accent:** gold `#fbbf24` (bar + title + key text)
- **Footer:** "KNOW BRAINER TRIVIA" (muted, bottom centre)
- **KBT logo:** "KNOW BRAINER" watermark (top-left on full-canvas tools)

### Tools upgraded this session:
| Tool | Change |
|---|---|
| face-morph-tool v6 | rembg both faces, two-pass morph blend, cutout sticker treatment |
| brain-tool | dark bg on output canvas (was transparent) |
| soundmash-tool | KBT dark bg, Bowlby, teal question/gold answer, 2-col answer layout, better waveform |
| ghost-actors-tool | KBT chrome overlay (title bar + footer) on slides, teal circle, gold actor pill |
| guess-the-year-tool | KBT dark bg, Bowlby header, teal accent bar, gold year display |
| linked-pics-tool | KBT dark bg, teal banner, Bowlby question/answer labels, gold answer text |
| crack-the-code-tool | KBT dark bg + teal grid, Bowlby, teal accent bar, gold answer text |

### Tools NOT changed (no slide output):
- host-brief-tool — AI text only, no slides
- brand-tool — text/logo AI tool, no 1920 canvas
- carmen-sandiego-tool — map screenshot tool (kept unique map styling)
- admin-app, host-app, player-app, wrap — not host tools
