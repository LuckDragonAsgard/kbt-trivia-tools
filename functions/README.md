# Cloudflare Pages Functions

These files replace the old `api/*.js` Vercel serverless functions. Cloudflare Pages auto-detects `functions/` and serves them at `/api/*` — same paths as before, no frontend changes needed.

## Deploy

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick `LuckDragonAsgard/kbt-trivia-tools` → keep default build settings (no build command, output dir = `/`)
3. Set environment variables (Settings → Environment variables, both Preview and Production):
   - `FAL_KEY` — fal.ai API key (used by face-morph, ghost-actors, sound-mash, ai-text)
   - `ANTHROPIC_API_KEY` — Anthropic key (used by fact-check)
   - `GOOGLE_SA_JSON` — Google Service Account JSON (used by generate-slides)
4. First push triggers deploy. After deploy, optionally point `kbt.knowbrainertrivia.com.au` (or whatever) at the `*.pages.dev` URL via Custom Domains.

## Routes (auto-mapped from filenames)

- `GET  /api/env-check` — diagnostic
- `POST /api/ai-text` — text generation for all tools (tool-routed)
- `POST /api/fact-check` — Claude question quality + fact verification
- `POST /api/fal-faceswap` — face-morph-tool (Easel AI advanced face-swap)
- `POST /api/fal-morph` — older face-swap (queue-based)
- `POST /api/fal-inpaint` — ghost-actors actor removal
- `POST /api/fal-rembg` — background removal
- `GET  /api/generate-slides?event_id=…` — Google Slides deck generation

## After deploy

Run `/api/env-check` once to confirm all keys are set. Then test face-morph-tool — that exercises FAL_KEY, both upload + the swap call.

## Removing Vercel

Once Pages is deployed and tested:
- Delete `vercel.json` from repo root
- Delete `.vercel/` folder
- Delete `api/*.js` files (replaced by `functions/api/*.js`)
- Delete `deploy*.bat` scripts

The old Vercel project is already gone (deleted from the Vercel account before this migration).
