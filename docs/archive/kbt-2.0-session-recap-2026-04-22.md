# KBT 2.0 — Session Recap (22 Apr 2026)

**Picked up:** 19 Apr handoff (`KBT-PLATFORM-HANDOFF-2026-04-19.md`)
**Sent to Asgard:** comms-hub msg id=23 (stored; Slack cross-post FAILED — SLACK_WEBHOOK likely missing/stale on comms-hub worker)

---

## What actually happened yesterday (21 Apr, kbt-trial.vercel.app)

20+ deploys, all READY (2 errored in mid-flight, recovered). Commit arc:

1. Real KBT 32-slot format from PPTX reverse-engineering
2. Slot assignment UI for specialty question types
3. Live scoring with submissions, ladder, runsheet
4. Venue repeat rule, host email, live scoring links in events
5. Specialty slides: tried server PPTX (errored) → pivoted to client-side PptxGenJS
6. Presentation rebuilt — light bg, exact KBT colors, 16:9
7. **Google Slides API generation endpoint → OAuth browser flow → full deck generation**
8. Smart event lookup — ID, code, description, date — never breaks
9. Final: `Update admin-app.html` (~13:44 UTC / Tue night Melbourne)

**Net effect:** Phase 1 from the handoff ("Kill Google-account-per-pub dependency") is **actively in progress** on kbt-trial. The admin app now has Slide Gen, live scoring, venue repeat rule, Google Slides OAuth flow, runsheet.

Live: https://kbt-trial.vercel.app
Repo: github.com/PaddyGallivan/kbt-trivia-tools

---

## Handoff's 4 next-move options (still open)

1. **Finish the strategic spec doc** — was mid-flight in the old chat, intended for 🧠 KBT Platform 2026 Drive folder; never finished. Paddy + George review material.
2. **Keep pushing Phase 1** — the 21 Apr work is 80% there; finish host-app one-login, kill the shared-Gmail-per-venue dependency for real.
3. **Define the new data model** — team persistence, player stats, venue onboarding for the multi-business platform (Pub / School / Live HQ).
4. **Write the pitch deck** — cruise ships / nursing homes / schools as packaged products.

**Non-negotiables (handoff explicit):**
- Don't touch real Armada Supabase
- No more sandbox tools
- Don't revive Morris / Falkor / Pickens for the trivia product
- No Cloudflare deploys without wrangler step

---

## Flag

Comms-hub `/api/messages` and `/api/alert` both return `slackPosted:false` even for HIGH/CRITICAL. The Asgard dashboard will pick up stored messages, but Slack relay is broken. Worth a look after current KBT work.
