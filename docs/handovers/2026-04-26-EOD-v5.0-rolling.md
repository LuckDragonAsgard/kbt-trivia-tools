# KBT 5.0 — Full Handover
_Last updated: 2026-04-27 | Session: bug fix + migration to GitHub Pages_

---

## 🚀 What Is This?

Know Brainer Trivia — a pub quiz host app + player registration app. Fully static, runs in the browser, scores stored in Supabase.

**Stack: GitHub Pages → Supabase. Nothing else.**

---

## 🔗 Live URLs

| What | URL |
|------|-----|
| Host app | `https://luckdragonasgard.github.io/kbt-trivia-tools/host-app.html` |
| Player registration | `https://luckdragonasgard.github.io/kbt-trivia-tools/player-app.html?code=TEST-001` |
| Repo | `https://github.com/LuckDragonAsgard/kbt-trivia-tools` |

> Player URL needs `?code=EVENT_CODE` appended. Change `TEST-001` for each new event.

**Deploy:** Push to `main` → GitHub Actions builds → live in ~60s. No manual step.

---

## 🔐 Accounts Needed

| Service | Account | What for |
|---------|---------|----------|
| **GitHub** | `LuckDragonAsgard` | Repo + GitHub Pages hosting |
| **Supabase** | luckdragon.io Google login | Database (scores, teams, events, questions) |
| **Google Cloud** | luckdragon.io Google login | OAuth client for Slides export |

Credentials/passwords → `asgard-vault.pgallivan.workers.dev`

---

## 🗄️ Supabase

- **Project:** `huvfgenbcaiicatvtxak.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/huvfgenbcaiicatvtxak`
- **Anon key** (public, safe in source): already embedded in `kbt-data.js` and `player-app.html`

### Key Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `kbt_event` | Event rows (code, date, description) | Off (read-only ref) |
| `kbt_question` | Question bank | Off (read-only ref) |
| `kbt_quiz` | Quiz items linking events ↔ questions | Off (read-only ref) |
| `kbt_teams` | Player team registrations | **Off** ⚠️ |
| `trial_scores` | Round scores (submitted by host) | On ✅ |
| `kbt_live_answers` | Live answer submissions | On ✅ |
| `trial_registrations` | Trial event registrations | On ✅ |

`trial_scores` unique constraint: `(event_code, team_name, round, question_number)` — upsert via `merge-duplicates` prevents duplicate scores.

---

## 🔑 Google OAuth (Slides Export)

- **GCP Project:** `bubbly-clarity-494509-g0` (name: "Google Slides", org: luckdragon.io)
- **Client ID:** `342815819710-sugohi5jr60hs2mfv1vgi4apfp3p2bjc.apps.googleusercontent.com`
- **Edit:** `https://console.cloud.google.com/auth/clients/342815819710-sugohi5jr60hs2mfv1vgi4apfp3p2bjc.apps.googleusercontent.com?project=bubbly-clarity-494509-g0`

**Authorised JS Origins (all saved):**
- `https://kbt-admin.pgallivan.workers.dev` (legacy)
- `https://kbt-trial.vercel.app` (legacy — Vercel project deleted, harmless)
- `https://luckdragonasgard.github.io` ✅ current production

> If hosting moves again, add the new origin here. Takes 2 min.

---

## 📁 Repo Structure

```
kbt-trivia-tools/
├── host-app.html       — Host scoring + leaderboard + slides export button
├── player-app.html     — Player team registration (standalone, no kbt-data.js)
├── kbt-data.js         — Shared Supabase data layer (window.kbtData)
├── slides-export.js    — Google Slides leaderboard export (window.exportLeaderboardToSlides)
└── .nojekyll           — Tells GitHub Pages not to run Jekyll
```

---

## 🎯 Running a New Event

1. **Create event row** in Supabase → `kbt_event` table: `event_code`, `event_description`, `event_date`, `event_status='active'`
2. **Add quiz items** to `kbt_quiz` linking the event to questions from `kbt_question`
3. **Share player URL** with `?code=YOUR_EVENT_CODE` — players register on their phones
4. **Open host app**, enter the event code — scoring panel appears
5. **After each round**, enter scores per team → Submit → leaderboard updates live
6. **End of night** → Export to Slides button → authenticates with Google → opens deck in new tab

---

## 📋 Thursday TEST-001 Status — ALL GREEN ✅

| Check | Status |
|-------|--------|
| `trial_scores` table + RLS + unique constraint | ✅ |
| `trial_registrations` + `kbt_live_answers` tables | ✅ |
| TEST-001 event row in `kbt_event` | ✅ |
| `kbt-data.js` — all bugs fixed, deployed | ✅ |
| Slides export wired (GIS + js + button) | ✅ |
| GitHub Pages live + serving fixed code | ✅ |
| OAuth origin `luckdragonasgard.github.io` added | ✅ |
| Vercel deleted | ✅ |

**Event code: `TEST-001`**

---

## 🐛 Bugs Fixed This Session (for context)

- `kbt-data.js` had `},,` double-comma syntax error → broke `window.kbtData` entirely (silent failure)
- `offline.getAnswersForEvent` missing trailing comma
- `shapeQuestion` read `row.question` — Supabase returns it as `row.kbt_question` (alias)
- Default event code fallback was `'TEST-NIGHT-001'` (non-existent) → fixed to `'TEST-001'`
- Google OAuth origin missing for GitHub Pages → added
