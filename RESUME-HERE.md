
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

