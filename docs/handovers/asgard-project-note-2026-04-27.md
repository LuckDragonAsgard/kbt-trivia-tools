# Asgard portfolio note — KBT update 2026-04-27

_Cross-portfolio addendum to the Asgard project knowledge index._
_See full detail in `KBT-HANDOVER-2026-04-27-v6.md` (same folder)._

---

## Status: KBT (Know Brainer Trivia)

**Stack:** GitHub Pages → Supabase. Single repo: `github.com/LuckDragonAsgard/kbt-trivia-tools`. Five files: `host-app.html`, `player-app.html`, `kbt-data.js`, `slides-export.js`, `wrap.html`.

**Today's headline:** went from "claimed-green-but-broken" launch path on 2026-04-26, to a verifiably-green full-feature production app on 2026-04-27. Twelve commits, two database migrations, one new public page (`wrap.html`), four new feature areas.

### Feature parity check (vs. Mona's "real trivia" requirements)

| Feature | Status |
|---|---|
| Live scoring (round totals) | ✅ working, persists to `trial_scores`, restores on host reload |
| Team registration with codes | ✅ NEW — `team_code` column + client-side generation, QR + share link |
| Individual player join via team code | ✅ NEW — `kbt_team_member` table, multi-player per team |
| Captain editing | ✅ NEW — captain edit affordance on player success screen |
| Gambler wager mechanic | ✅ NEW — per-team wager input + correct/wrong toggle, persisted to `kbt_wager`, applies +/- to round totals |
| Branded Slides export | ✅ NEW — title/podium/leaderboard/per-round, KBT brand colours, KNOW + BRAINER lockup |
| Team Spotify-style wrap | ✅ NEW — `wrap.html?event=X&team=Y` |
| Individual Spotify-style wrap | ✅ NEW — `wrap.html?event=X&player=Z` |
| Per-question correctness tracking | ❌ NOT YET — `kbt_live_answers` exists but host UI doesn't write to it |
| 4+ rounds | ❌ hardcoded to 3 rounds (R1/R2/R3) |

### Database (Supabase project `huvfgenbcaiicatvtxak`)

**New today:**
- FK `kbt_quiz.quiz_question_id → kbt_question.id` (unblocks PostgREST embed)
- `kbt_teams.team_code` column + index + unique `(event_code, team_code)`
- `kbt_team_member` table (RLS on, anon CRUD)
- `kbt_wager` table (RLS on, anon CRUD)
- 12 quiz items seeded for TEST-001 (event_id 5260)

### Live URLs

- Host: `luckdragonasgard.github.io/kbt-trivia-tools/host-app.html`
- Player register: `luckdragonasgard.github.io/kbt-trivia-tools/player-app.html?code=<EVENT>`
- Player join: `…/player-app.html?code=<EVENT>&team=<TEAMCODE>`
- Team wrap: `…/wrap.html?event=<EVENT>&team=<TEAMCODE>`
- Individual wrap: `…/wrap.html?event=<EVENT>&player=<PLAYERCODE>`

### Credentials

- GitHub PAT: vault key `GITHUB_TOKEN` at `asgard-vault.pgallivan.workers.dev` (X-Pin 2967), login PaddyGallivan, scope `public_repo`
- Slides OAuth: GCP `bubbly-clarity-494509-g0`, client `342815819710-...apps.googleusercontent.com`, JS origin `luckdragonasgard.github.io`
- Supabase: anon key embedded in client code (public, fine)

### Known portfolio-level gaps to flag

- **`kbt_teams` RLS still off** — Mona has been told. Not a regression, just a long-standing gap.
- **`kbt_live_answers` unused** — table exists for per-question answer capture, but host UI doesn't write to it. Wraps could be much richer ("you got 24/30 right") if this is wired up next session.
- **Hardcoded "Tonight's Schedule" rounds in the host dashboard** — Round 1 General Knowledge / R2 Theme / R3 Final are static HTML, not driven from `kbt_quiz`.
- **Two captains possible per team** — no DB constraint preventing it. Worth a partial unique index `(team_id) WHERE is_captain=true` if it ever happens accidentally.

### Where everything lives

- Source: `github.com/LuckDragonAsgard/kbt-trivia-tools`
- DB: Supabase project `huvfgenbcaiicatvtxak` (region ap-southeast-2)
- This handover: paddy@luckdragon.io Drive, KBT folder (`1-JbmLzR6eGdUuK9Qv6vygP_B_ml1MN4o`)
- Full handover doc: `KBT-HANDOVER-2026-04-27-v6.md` in same folder

---

## For the next Claude session

1. **Do NOT trust prior "ALL GREEN" claims** — exercise the launch path end-to-end before believing.
2. **Use the GitHub REST API + vault token** for fast file pushes. The Chrome MCP CodeMirror chunk-paste path is fragile for large files.
3. **The full smoke playbook is in `KBT-HANDOVER-2026-04-27-v6.md`** — follow steps 1–7 before declaring anything green.
4. **Cleanup test data** at the end of each session (`DELETE` script in the playbook).
