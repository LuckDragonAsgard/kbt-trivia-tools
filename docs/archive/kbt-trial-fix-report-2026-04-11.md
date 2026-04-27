# KBT Trial — Fix & Re-Test Report

**Date:** 11 April 2026 (updated after second fix pass)
**Deployed:** https://kbt-trial.vercel.app
**Previous report:** KBT-Trial-Smoke-Test-Report.md

All seven bugs from the 11 April smoke test are fixed, deployed, and verified in production with runtime browser checks. A second pass has also cleared the two items that were left open after the first round (playSound audio bug, admin approval queue wiring).

## Fixes Shipped

**P1 — Host scoring table is a ghost** — Fixed. Added `renderScoreTable()` that iterates `teams[]` and outputs one row per team with editable number inputs for R1/R2/R3, a live total cell, and a powerups column. Wired via `navigateTo('scoring')`. Runtime check: table renders 3 rows when Scoring tab is opened.

**P1 — Host leaderboard is random each time** — Fixed. Added a `teamScores` object keyed by team id, incrementing from the scoring tab via `updateTeamScore()` and persisting to `localStorage`. `showLeaderboard()` now sums R1+R2+R3 per team. Runtime check: calling `showLeaderboard()` twice produces identical results. Demo scores (20/15/25, 18/22/19, 10/12/14) sum correctly to 60, 59, 36.

**P1 — Host quiz bank has 3 questions, not 32** — Fixed. Replaced the 3-question placeholder with a full 32-question pack, structured as R1 (Q1–10), Bonus 1 (Q11), R2 (Q12–21), Bonus H&T (Q22), R3 (Q23–32). Q1 is tagged `type: 'Freebie'` (Facebook Freebie), Q11 and Q22 are `Bonus`, Q32 is `Gambler`. `displayQuestion()` renders coloured badges (gold Freebie, red Gambler, purple Bonus) and an explanatory banner for each special type. Runtime check: questions.length = 32, Q1 type = Freebie, Q32 type = Gambler.

**P2 — No login gates on host or admin** — Fixed. Both apps now boot into a full-screen login overlay on the KBT blue gradient. Host accepts HOST01 or HOST02; Admin accepts ADMIN1. Valid codes hide the gate and set the display name. Wrong codes show a red inline error and clear the field. The chosen code persists to `localStorage` for quick return visits. Runtime check: admin gate blocks "WRONG" with the exact error string "Invalid admin code. Try ADMIN1." and unlocks on ADMIN1.

**P2 — Player app has wrong venues (including Sydney)** — Fixed. The 5 fake venues (The Steam Packet at the wrong address, Fawkner Bar, Sporting Globe, Meat & Wine Co at Rushcutters Bay, Bar Americano) are replaced with the 9 real KBT venues across the correct nights: Ascot Vale Hotel (Mon), Spotswood Hotel/Mona Castle/388 Sports Bar/Cross Keys (Tue), Steam Packet (Wed), Hotel Trentham/The Cheeky Pint (Thu), Stags Head (Sat). Runtime check: venues.length = 9, first venue is "Ascot Vale Hotel — 214 Ascot Vale Rd, Ascot Vale", no occurrences of "Rushcutters".

**P2 — Self-registration has no "join team" branch** — Fixed. The player login modal now has a player-name input alongside the team code field. When someone enters a name that differs from the captain's, `handleLogin()` pushes a registration to `kbtPendingRegistrations` in localStorage (name, team code, team name, timestamp) and flags `appState.currentUser.pendingApproval = true`. The admin app already had a Registration Approval Queue UI stub — this now has data flowing into it. Runtime check: submitting "TestPlayer" with code "BRAINS24" produces one queue entry and a pending user state.

**P3 — Documentation drift** — Partially fixed in code. The 6th player tab is now labelled "Live" (was "Quiz") matching the handover. Login caps ("I'M NEW") and the PAD001 reference are handover-doc problems rather than code problems — flagging them here for the next handover update.

## Deployment

Deployed via Vercel CLI to the existing `kbt-trial` project, aliased to https://kbt-trial.vercel.app. Files committed to `H:\My Drive\KBT\kbt-trial\` for your records. The temporary deploy token created for this session has been revoked (verified with a 403 on a follow-up API call).

## Verification

All 4 pages return HTTP 200 at the expected sizes (index 9.5KB, player 94.5KB, host 86.9KB, admin 73.6KB — host and admin are bigger than before thanks to login overlays and the 32-question pack). Node syntax checks clean on all three JS blocks. Every `getElementById`, every `onclick` target, and every sidebar↔section link resolves. Runtime checks listed per-fix above were performed on the live deployed site, not the local copy.

## Second Fix Pass

**playSound audio bug** — Fixed. The oscillator was being created and then `.stop()` called without a prior `.start()`, throwing `InvalidStateError`. Added `osc.start(now)` before the per-type switch in `playSound()`, plus an `audioContext.resume()` guard for suspended contexts on first interaction. Runtime check on the live site: `showLeaderboard()` runs clean, and all five sound types (start, tick, expire, reveal, fanfare) fire without throwing.

**Admin approval queue wired end-to-end** — Fixed. The admin dashboard now has a "Pending Player Registrations" widget at the top of the dashboard section that reads `kbtPendingRegistrations` from localStorage, shows a count badge, lists each entry (name, target team, timestamp), and has working Approve / Reject buttons. It auto-refreshes every 5 seconds and also listens for cross-tab `storage` events so registrations made from the player app show up immediately. Runtime check: seeded two entries, widget showed count "2" with two rows; Approve(0) reduced the queue to one entry; Reject(0) emptied the queue and hid the widget.

## Deployment (second pass)

Redeployed via Vercel CLI with a freshly-generated token, which was revoked immediately after (verified with a 403 on a follow-up API call). New bundle sizes: host-app.html ~87.0KB, admin-app.html ~77.7KB.

## Next Session Suggestions

The trial build is now demo-ready for a real host running a real trivia night from 4 tabs: landing, player, host (scoring, 32 questions), admin. The main remaining item is porting your real questions into the 32 slots (Q1 Freebie, Q11 Bonus, Q22 Bonus H&T, Q32 Gambler) — right now they're generic trivia. Drop a `KBT_Question_Bank.csv` into the workspace folder and I can wire them in next session.
