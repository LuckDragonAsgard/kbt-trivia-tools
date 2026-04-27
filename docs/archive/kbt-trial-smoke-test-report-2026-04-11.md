# KBT Trial — Smoke Test Report

**Tested:** 11 April 2026
**Target:** https://kbt-trial.vercel.app (4 pages)
**Method:** Static fetch + JS analysis (Chrome MCP was offline, so no runtime clicks — bugs here are structural; runtime issues may still exist on top)

## TL;DR

All 4 pages load (HTTP 200), render the right shells, and the scripts parse cleanly. The **previous bug fixes from 7 April are all verified** (no duplicate "Trivia." in host header, no duplicate "Trivia." in admin sidebar). However, this is a mock-data demo and several features the handover doc implies are "working" are actually stubbed, dummy, or missing. Seven items worth fixing, graded below.

## What Passed

- All 4 URLs: 200 OK (index 9.5KB, player 92KB, host 73KB, admin 70KB)
- HTML5 head is clean on all pages — `<title>`, meta description, `theme-color #000000`, brain-emoji SVG favicon all present
- All 3 JS blocks pass `node --check`; braces and parens are balanced
- Every `getElementById(...)` in JS resolves to a real HTML id
- Every `onclick="foo()"` resolves to a defined function
- **Landing page:** 3 portal cards wired to `/player-app`, `/host-app`, `/admin-app`; "View live site" link to knowbrainertrivia.com.au works; Trial Build badge present
- **Player app:** 6 tabs wired (home, team, quiz, league, badges, wrapped). `renderTab` dispatcher routes correctly. `handleLogin()` validates team codes against mock data and shows a proper error message on miss
- **Admin app:** all 14 sidebar sections (dashboard, teams, players, venues, hosts, leagues, awards, badges, powerups, analytics, broadcast, export, codes, settings) have matching section divs; `navigateTo()` switches them
- **Fix verified:** zero `>Trivia.<` inline text in admin sidebar, zero duplicate "KNOW BRAINER Trivia." in host header

## Bugs Found

### P1 — Host: scoring table is a ghost

The Scoring tab has `<tbody id="scoreTableBody"></tbody>` but **no JS anywhere writes to it**. The Scoring page will render as an empty table under the headers. `updateScores()` is not defined. "Update Scores" is a heading, not a button. There is no way to enter a team's points from this tab.

**Fix:** add a `renderScoreTable()` that iterates `teams[]`, outputs one `<tr>` per team with editable `<input type="number">` cells for R1/R2/R3, and wire it from `navigateTo('scoring')`.

### P1 — Host: leaderboard is random each time

`showLeaderboard()` maps teams to `{ score: Math.floor(Math.random() * 300) + 100 }`. Whatever the host does during the quiz is thrown away; clicking "Show Leaderboard" produces fresh random numbers every press. The podium is therefore also randomised.

**Fix:** store a `teamScores` object keyed by team id, increment it from the scoring tab, and have `showLeaderboard()` read from that.

### P1 — Host: quiz bank has 3 questions, not 32

`questions[]` only contains placeholders for Paris, Mars, Titanic. The handover's CRITICAL trivia pack rules (R1Q1 Facebook Freebie, R3Q10 Gambler, Bonus 1 at R1Q11, Bonus H&T at R2Q11, 32 questions total) are **not implemented** — zero references to "freebie", "gambler", "bonus", or "facebook" anywhere in host.html or host.js.

**Fix:** either flag this as "demo only" on the page, or load from a JSON block with the 30+2 structure and mark Q1 / Q30 / bonus Qs with type tags so the UI can render them differently.

### P2 — No login gates on host or admin

- **Host app:** no login screen at all. Anyone who hits `/host-app` is in. HOST01 / HOST02 from the handover are not present in the code.
- **Admin app:** ADMIN1 is hardcoded as display text (username span + profile input). `regenerateAdminCode()` is an `alert()` stub. No PIN, no code check, no gate.

For a trial build this may be intentional, but the handover doc says "Login with ADMIN1" / "Login with host codes (HOST01, HOST02)" — either the code needs a gate or the handover needs a note that trial = no auth.

### P2 — Player app has wrong venues (including a Sydney address)

`venues[]` in player.js lists 5 fake venues with fake addresses:

- The Steam Packet — "293 Toorak Rd, Hawthorn" (the real Steam Packet Hotel is Williamstown, and this is also wrong for Toorak Rd which is in South Yarra)
- Fawkner Bar — "175 Chapel St, Prahran"
- The Sporting Globe — "177 Bay St, Brighton"
- **Meat & Wine Co — "50 Waratah Ave, Rushcutters Bay"** — Rushcutters Bay is in **Sydney**
- Bar Americano — "16 Hardware Ln, Melbourne"

The handover lists your actual 9 KBT venues (Ascot Vale Hotel Mon, Spotsw&ood Hotel Tue, Mona Castle Tue, 388 Sports Bar Tue, Cross Keys Tue, Steam Packet Wed, Hotel Trentham Thu, The Cheeky Pint Thu, Stags Head Sat). These should replace the fake list — especially before the trial goes in front of a real player.

### P2 — Self-registration has no "join team" branch

"I'M NEW" flow takes the user straight into team *creation* (name, avatar, color, mascot, motto, code generated). There is no option for a new player to *join an existing* team via captain approval. The admin app has a "Registration Approval Queue" UI stub but nothing in the player app ever feeds it.

### P3 — Documentation drift

Minor but worth noting for the next handover update:

- Player app 6th tab is labelled "Quiz" not "Live" (handover says "Live").
- Login button text is "I'M NEW" (all caps), handover says "I'm New".
- Handover lists "PAD001" as an example player code, but the player app has no player-code login — only team codes and self-registration. Either drop PAD001 from the handover or wire a player-level login.

## Next Session Suggestions

1. Fix P1 scoring bugs first — they're the whole reason a host would use this app in practice.
2. Replace the fake venues with the real 9 (quick win).
3. Decide: is trial build public-no-auth, or should host/admin get a simple PIN gate like WPS Staff Hub? If the latter, add a lightweight modal — a hardcoded `["HOST01","HOST02"]` check would match the handover without needing Supabase.
4. Port ~30 real questions from KBT_Question_Bank.csv into the demo quiz with one flagged as Facebook Freebie and one as Gambler so the UI can demonstrate the trivia pack rules.

## Raw Test Artefacts

All 4 files fetched and analysed in `/tmp/kbt/`:

```
index.html   9,490 bytes   200 OK
player.html 92,614 bytes   200 OK   (43,259 chars of JS)
host.html   73,183 bytes   200 OK   (23,627 chars of JS)
admin.html  69,985 bytes   200 OK   (11,379 chars of JS)
```

Syntax: `node --check` clean on all three. Structural checks (id resolution, onclick resolution, sidebar↔section matching) all passed.
