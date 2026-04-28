# RESUME-HERE — KBT pickup notes

**Read this first if you're a Claude session starting fresh on KBT** (any account: paddy@luckdragon.io, pgallivan@outlook.com, or other). This file is the single source of truth — it does NOT depend on Claude memory or session state.

---

## What KBT is

Pub-quiz host + player apps powering live KBT trivia events. Static frontend on **GitHub Pages**, data on **Supabase**. Built/owned by Mona + Paddy (Asgard portfolio). No build step — push to `main`, GitHub Actions deploys in ~25s.

## Live state (as of 2026-04-28)

| Thing | Where |
|---|---|
| Host app | <https://luckdragonasgard.github.io/kbt-trivia-tools/host-app.html> |
| Player register | `…/player-app.html?code=EVENT_CODE` |
| Player join | `…/player-app.html?code=EVENT&team=TEAMCODE` |
| Wrap (team) | `…/wrap.html?event=EVENT&team=TEAMCODE` |
| Wrap (player) | `…/wrap.html?event=EVENT&player=PLAYERCODE` |
| Repo | <https://github.com/LuckDragonAsgard/kbt-trivia-tools> |
| DB | Supabase project `huvfgenbcaiicatvtxak` (region `ap-southeast-2`) |
| OAuth (Slides export) | Google Cloud project `bubbly-clarity-494509-g0`, JS origin `https://luckdragonasgard.github.io` |

## Connectors / accounts you need

To pick up where the previous session left off, the new Claude session should have these connectors enabled:

- **GitHub** — `LuckDragonAsgard` org has the repo. Personal access token with `public_repo` scope is in the vault.
- **Drive** — `paddy@luckdragon.io` is the canonical account. (The portfolio-wide rule per `feedback_storage_routing.md` is GitHub-first; Drive only for live-edit Office files.)
- **Supabase** — project `huvfgenbcaiicatvtxak`. SQL access through the Supabase MCP.
- **Cloudflare** — account `Luck Dragon (Main)`, ID `a6f47c17811ee2f8b6caeb8f38768c20`. Used by sibling Asgard projects, not strictly needed for KBT.

If any of these aren't connected, ask Mona which Claude account she's logged into, and have her connect them via the Claude Settings → Connectors flow. **Do not try to bypass** by clone+push from local — the GitHub MCP / PAT path is the established pattern.

## Secrets vault

`https://asgard-vault.pgallivan.workers.dev` (X-Pin: `2967`). Fetch GitHub PAT, Cloudflare token, etc. from here. Run by paddy@luckdragon.io's Cloudflare Worker. The `pgallivan.workers.dev` subdomain is a Worker subdomain, not the storage account — the worker itself is owned by the Luck Dragon CF account.

## Handovers — read in order

1. **[docs/handovers/2026-04-27-v9.md](docs/handovers/2026-04-27-v9.md)** — final state of the off-Drive migration + everything you need to resume
2. [docs/handovers/2026-04-27-v7.md](docs/handovers/2026-04-27-v7.md) — last clean app state (RLS, captain constraint, per-question correctness, parameterised rounds, real logo)
3. [docs/README.md](docs/README.md) — full index of all handovers, archive docs, templates, scripts

## What was just done (2026-04-27 → 28)

The KBT portfolio was migrated **off Google Drive** into this repo. Per the storage-routing rule, GitHub is now the source of truth for code, docs, markdown, and templates. Drive is only retained for live-edit Office files where a non-technical collaborator is co-editing in realtime — and KBT has none.

Mirrored into the repo:
- 13 markdown docs (handovers + archives in `docs/`)
- 5 base PPTX/DOCX templates (`templates/`)
- 4 question-tool decks (`templates/question-tools/`)
- 2 face-morph scripts (`scripts/`)
- v8 handover (`docs/handovers/2026-04-27-v8.md`) and v9 final state (`docs/handovers/2026-04-27-v9.md`)

Lost to a Drive cleanup before the migration finished (NOT recoverable, NOT critical):
- `KBT-MASTER-TEMPLATE.pptx` (23 MB) — was used for manual offline deck-building. The live web app generates decks programmatically via `slides-export.js`, so the platform doesn't need it.
- `KBT-Blurb.docx` — short marketing blurb, trivial to rewrite
- `KBT_Trivia_App_Reference.docx` — superseded by the handovers in `docs/`
- `patch_slides.py` — obsolete one-shot patcher; its OAuth + Slides logic is now permanent in `host-app.html` + `slides-export.js`. The repo file is now a placeholder header.

If any of these turn up in a local backup (H:\KBT\, Vercel deploy zips), commit them under `templates/` or `scripts/` and update [docs/README.md](docs/README.md).

## Outstanding gaps (from v7, still open)

- `kbt_live_answers` host UI not wired (table extended, no UI yet)
- No PDF export from Slides (manual export from Google Slides still required)
- VVDS Fifties font not embedded in slides export (Slides API limitation)
- Score reconciliation edge case when host mixes per-question marks with manual round totals (per-question wins, by design)

None of these are blockers for running a live event.

## Smoke playbook

In v7's handover. After any non-trivial change, run it before declaring green.

## How to commit changes from a Claude session

```
GET   /repos/LuckDragonAsgard/kbt-trivia-tools/contents/{path}      # to read SHA
PUT   /repos/LuckDragonAsgard/kbt-trivia-tools/contents/{path}      # body: {message, content (base64), sha, branch:'main'}
```

with `Authorization: Bearer <PAT>`. The PAT is in the vault. GitHub Pages auto-deploys ~25s after push to `main`.

For larger files (binaries > 100 KB), use the GitHub MCP `create_or_update_file` if available, else clone+push via git.
