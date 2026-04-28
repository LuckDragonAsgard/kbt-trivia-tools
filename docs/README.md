# KBT documentation

All KBT handover docs and runbooks. Each handover is a snapshot of the state at end-of-session — read the latest for current state, the older ones for context.

## Handovers (most recent first)

| Version | Date | Headline |
|---|---|---|
| [v8](handovers/2026-04-27-v8.md) | 2026-04-27 (eve) | Off-Drive migration mid-flight — 13 markdowns mirrored, binaries pending; pipeline + Drive IDs documented for next session |
| [v7](handovers/2026-04-27-v7.md) | 2026-04-27 (late) | RLS, captain constraint, per-question correctness, parameterised rounds, dynamic schedule, real logo on slides |
| [v6](handovers/2026-04-27-v6.md) | 2026-04-27 (mid) | Fixed 4 launch-path bugs + built team_code/members/wager/wrap/branded slides |
| [v5.1 EOD](handovers/2026-04-27-v5.1-EOD.md) | 2026-04-27 (early) | Claimed "ALL GREEN" but launch path was broken — superseded by v6 |
| [v5.0 rolling](handovers/2026-04-26-EOD-v5.0-rolling.md) | 2026-04-26 | Pre-Pages migration rolling notes |
| [EOD 2026-04-26](handovers/2026-04-26-EOD.md) | 2026-04-26 | EOD note (abridged) |
| [admin EOD](handovers/2026-04-25-EOD-admin.md) | 2026-04-25 | Admin-app focused EOD |
| [v2.0 END](handovers/2026-04-22-v2.0-END.md) | 2026-04-22 | Platform 2.0 closeout (abridged) |
| [platform](handovers/2026-04-19-platform.md) | 2026-04-19 | Original platform handoff (abridged) |

## Cross-portfolio notes

| Doc | What |
|---|---|
| [Asgard project note (2026-04-27)](handovers/asgard-project-note-2026-04-27.md) | Cross-portfolio addendum showing where KBT sits relative to other Asgard projects |

## Archive

Earlier docs preserved for context — not the source of truth, but useful when looking up why something was built a certain way.

| Doc | What |
|---|---|
| [Falkor master plan (2026)](archive/falkor-kbt-master-plan.md) | Original product/roadmap doc |
| [v2.0 session recap (2026-04-22)](archive/kbt-2.0-session-recap-2026-04-22.md) | Session recap from v2.0 era |
| [kbt-app orig](archive/kbt-app-orig.md) | Original kbt-app sketch |
| [kbt-trial orig](archive/kbt-trial-orig.md) | Original trial-build sketch |
| [Trial Fix Report (2026-04-11)](archive/kbt-trial-fix-report.md) | Fix-and-retest report from the early trial build |
| [Trial Smoke Test Report (2026-04-11)](archive/kbt-trial-smoke-test-report.md) | First smoke test of the trial build |

## Templates and decks (in `/templates/`)

Mirrored from Drive on 2026-04-27 to keep KBT self-contained in this repo (per `feedback_storage_routing.md`).

**Base templates:**

| File | Size | What |
|---|---|---|
| [KBT-Run-Sheet.docx](../templates/KBT-Run-Sheet.docx) | 65 KB | West Welcome Wagon run sheet template |
| [KBT_Brain_Example.pptx](../templates/KBT_Brain_Example.pptx) | 1.4 MB | Brain Round example deck |
| [KBT_Brain_v2.pptx](../templates/KBT_Brain_v2.pptx) | 1.8 MB | Brain Round template v2 |
| [KBT_Example_Slides.pptx](../templates/KBT_Example_Slides.pptx) | 1.6 MB | Example presentation slides |
| [KBT_Question_Templates.pptx](../templates/KBT_Question_Templates.pptx) | 52 KB | Question type templates |

**Question-tool decks** (in `/templates/question-tools/`, exported from Google Slides):

| File | Size | Used by |
|---|---|---|
| [face-morph.pptx](../templates/question-tools/face-morph.pptx) | 1.1 MB | `face-morph-tool.html` |
| [carmen-sandiego.pptx](../templates/question-tools/carmen-sandiego.pptx) | 1.4 MB | `carmen-sandiego-tool.html` |
| [guess-the-year.pptx](../templates/question-tools/guess-the-year.pptx) | 1.1 MB | `guess-the-year-tool.html` |
| [soundmash.pptx](../templates/question-tools/soundmash.pptx) | 1.3 MB | `soundmash-tool.html` |

## Scripts (in `/scripts/`)

| File | Size | What |
|---|---|---|
| [face_morph_v3.py](../scripts/face_morph_v3.py) | 3.2 KB | Face Morph image pipeline (KBT production quality) |
| [face_morph_server.py](../scripts/face_morph_server.py) | 3.8 KB | Local Flask server that runs the morph pipeline |
| [patch_slides.py](../scripts/patch_slides.py) | placeholder | Original deleted from Drive before migration finished — see file header. Logic is now in `host-app.html` + `slides-export.js`. |

## Files that were lost in the Drive cleanup

These KBT files were on `paddy@luckdragon.io` Drive but had been deleted by the time this migration ran (2026-04-27 → 28). They were not recoverable:

- `KBT-MASTER-TEMPLATE.pptx` (23 MB master template)
- `KBT-Blurb.docx` (13 KB)
- `KBT_Trivia_App_Reference.docx` (16 KB)
- `patch_slides.py` (14 KB — replaced with placeholder)

If any of these turn up in a local backup (e.g. `H:\KBT\`, an old Vercel deploy zip), commit them here under `templates/` or `scripts/` and update this index.

## Reading order if you're new

1. The latest handover (v8) — current state of the migration + app
2. v7 — last clean app state before the off-Drive migration kicked off
3. The "Outstanding gaps" section at the bottom of v7 — what's not done yet on the app
4. The "Smoke playbook" in v7 — how to verify the app works end-to-end before declaring anything green

## Docs convention

- Filename pattern: `{date}-v{N}.md` for versioned handovers
- Each handover is self-contained — no chained dependencies on previous versions
- "What changed today" section at the top, "Outstanding gaps" at the bottom
- Commit any new handover here, not to Drive (per `feedback_storage_routing.md`)
