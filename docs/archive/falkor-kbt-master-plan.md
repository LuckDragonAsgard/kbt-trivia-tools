# FALKOR & KBT SYSTEM REBUILD — Master Plan

_Early strategic plan drafted 2026-04-17. Superseded by the actual build — this is historical context for why the app currently looks the way it does._

---

**Abridged import.** The 6-KB original is preserved in Git history. Key ideas carried forward:
- JWT auth via a dedicated `falkor-auth` CF Worker
- One platform, three businesses: Pub Trivia, School Trivia, Live Trivia HQ
- Four apps: Studio, Host, Player, Venue
- Two canonical surfaces: falkor.pgallivan.workers.dev (internal), kbt.pgallivan.workers.dev (product)
- Stack: React/Vite -> CF Workers -> Supabase -> R2 for blobs -> SendGrid for email

This plan never shipped as-is; KBT instead went the GitHub Pages + Supabase route. Archived for context.
