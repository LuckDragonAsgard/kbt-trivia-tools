# Know Brainer Trivia — Tools

Pub-quiz host + player apps powering the live KBT events. Static frontend on **GitHub Pages**, data on **Supabase** (project `huvfgenbcaiicatvtxak`). No build step — push to `main`, GitHub Actions deploys in ~25s.

---

## Live URLs

| What | URL |
|---|---|
| Host app | <https://luckdragonasgard.github.io/kbt-trivia-tools/host-app.html> |
| Player register | <https://luckdragonasgard.github.io/kbt-trivia-tools/player-app.html?code=TEST-001> |
| Player join an existing team | `…/player-app.html?code=EVENT&team=TEAMCODE` |
| Team wrap | `…/wrap.html?event=EVENT&team=TEAMCODE` |
| Individual wrap | `…/wrap.html?event=EVENT&player=PLAYERCODE` |

---

## What's in this repo

**Live event apps** (the production set):
- `host-app.html` — host live-scoring UI: launch event, mark per-question correctness, Gambler wagers, score table, podium
- `player-app.html` — player registration + team-code-based join
- `wrap.html` — Spotify-style team and individual wraps
- `kbt-data.js` — shared Supabase data layer (`window.kbtData`)
- `slides-export.js` — branded Google Slides export (title with logo, podium, leaderboard, per-round)
- `assets/kb_logo_white.png` — KBT logo asset for the slides export

**Other in-quiz tools / question types** (used during a live night):
- `brain-tool.html`, `brand-tool.html`, `carmen-sandiego-tool.html`, `crack-the-code-tool.html`, `face-morph-tool.html`, `ghost-actors-tool.html`, `guess-the-year-tool.html`, `linked-pics-tool.html`, `soundmash-tool.html`

**Admin / supporting**:
- `admin-app.html` — heavier admin UI (event/quiz management)
- `host-brief-tool.html`, `presentation.html`, `question-dev.html`, `submit.html`, `live-scoring.html`, `kbt-examples.html`, `tools.html`, `index.html`, `join.html`

---

## Documentation

Handovers and runbooks live in [`docs/handovers/`](docs/handovers/). Each handover is dated and version-stamped — read the highest-numbered v{N} for the current state.

Latest: [`docs/handovers/2026-04-27-v7.md`](docs/handovers/2026-04-27-v7.md)

Index: [`docs/README.md`](docs/README.md)

---

## Stack

- **Hosting:** GitHub Pages (push-to-deploy from `main`)
- **Database:** Supabase (`huvfgenbcaiicatvtxak`, region `ap-southeast-2`)
- **OAuth (Slides export):** Google Cloud project `bubbly-clarity-494509-g0`, JS origin `https://luckdragonasgard.github.io`
- **Secrets:** [`asgard-vault.pgallivan.workers.dev`](https://asgard-vault.pgallivan.workers.dev) (X-Pin: 2967) — `GITHUB_TOKEN`, `CF_API_TOKEN`, etc.

---

## Common tasks

**Run a new event**
1. Insert `kbt_event` row with `event_code`, `event_description`, `event_date`, `event_status='active'`
2. Add quiz items to `kbt_quiz` for that event_id
3. Share `player-app.html?code=YOUR_EVENT_CODE` with players
4. Open `host-app.html`, enter HOST01, enter event code, Launch
5. Mark per-question correctness as the night progresses; round totals auto-derive
6. End of night → Export to Slides; send wrap links per team (`wrap.html?event=…&team=…`)

**Smoke-test the launch path**
See the smoke playbook in the latest handover doc.

**Push a fix**
1. Edit file in this repo (web UI or local clone)
2. Commit to `main`
3. Wait ~25s for the `pages build and deployment` Action to complete
4. Verify live at the GitHub Pages URL

---

## Deploy notes

- `package.json`/`package-lock.json`/`vercel.json` are legacy from when this was on Vercel — kept around but not in the deploy path.
- `.vercel/` directory is dead — left over from migration.
- `DEPLOY.bat` / `deploy.bat` / `deploy-now.bat` are Windows-side helpers from the Vercel days; current deploy is just `git push`.

---

## Outstanding gaps

See the "Outstanding gaps" section in the latest handover doc.
