
## Question Engine — Auto-sourcer (2026-04-29)

- **Worker:** `kbt-question-engine.pgallivan.workers.dev` — runs every 6h automatically via CF Cron
- **Manual trigger:** `POST /run` with `{"max_facts": N}` (max 20)
- **Review UI:** `…/question-candidates.html` — approve/reject queued candidates
- **Pipeline:** Wikipedia (random + On This Day) + Reddit TIL → Claude generates Q drafts → FC1 accuracy check → FC2 devil's advocate check → quality score /50 → saved to `kbt_question_candidates`
- **Thresholds:** 45+/50 = APPROVED, 35–44 = pending_review, <35 = rejected
- **Gambler flag:** only on 45+ questions with clean FC1 + FC2
- **New question types (DB ids 36–48):** Closest Wins, Connections, Two Truths One Lie, Emoji Decode, Chain Round, Lightning, Before & After, Picture Plus, Famous Firsts, Wipeout, Accumulator, Steal Round, Survivor
- **Full product brief:** `docs/kbt-question-engine-brief.md` in this repo