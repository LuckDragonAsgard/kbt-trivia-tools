# KBT Trivia App — Complete Reference

> Migrated from `KBT_Trivia_App_Reference.docx` on Drive (last updated 4 April 2026). Original is reference/onboarding context for new Claude sessions.

**FOR CLAUDE USERS:** Open this file in any new Claude conversation. It gives Claude full context on the KBT trivia app — what's built, how it works, rules, venues, workflow, and what's still to do. Say: *"Read this file and help me continue building the KBT trivia app."*

## 1. Project Overview

Know Brainer Trivia (KBT) is a pub trivia business run by Paddy Gallivan and his business partner George, under the company 10 16 Pty Ltd. The trivia app is a custom-built system that handles the entire trivia night workflow — from question management and quiz generation through to branded slide decks and live host scoring.

| Item | Detail |
|---|---|
| Website | https://www.knowbrainertrivia.com.au |
| Backend | Supabase (Armada project) — 6,500+ questions in the database |
| Socials | @knowbrainertrivia on Instagram & Facebook |
| Local App Files | `host-admin-live.html`, `player-app-live.html` (in this repo) |
| Question Bank CSV | KBT_Question_Bank.csv — 1,814 validated questions |
| Company | 10 16 Pty Ltd |
| Business Partner | George |

## 2. App Architecture

The KBT app consists of two main HTML files:

- **host-admin-live.html** — admin/host dashboard. Quizzes are created, managed, slides are generated, and trivia packs are sent to hosts here. Brain of the operation.
- **player-app-live.html** — player-facing app, used at venues during live events.

Both connect to a Supabase backend (the "Armada" project) which stores 6,500+ trivia questions and all event/venue data.

## 3. Weekly Workflow (How a Trivia Night Gets Made)

End-to-end process every week to prepare trivia packs for all 9 venues:

1. **Admin Site → Quiz Gen** — Build the trivia pack by selecting/generating questions. The system enforces all the trivia pack rules automatically (see Section 4).
2. **Slide Gen** — Enter the event ID, click generate. The system creates branded Google Slides for the trivia night.
3. **Mark as Final** — Review the generated slides and mark them as Final when ready.
4. **Workflow Page → Send to Host** — Hit the Send to Host button. The host receives a branded email containing 3 links:
   - Live Scoring — for real-time score tracking during the event
   - Google Slides — the branded slide deck to present at the venue
   - Run Sheet — the host's guide with all questions, answers, and running order

## 4. Trivia Pack Rules (CRITICAL)

These rules are non-negotiable and must be enforced by any quiz generation logic. Breaking these rules will cause problems at venues.

| Rule | Detail |
|---|---|
| Format | 32 questions total: 30 standard + 2 bonus questions |
| **R1 Q1 = Facebook Freebie** | The very first question of every quiz is the same across ALL venues. Current affairs question, posted on KBT's social media with venue tags. Marketing tool. |
| **Gambler = LAST question** | The Gambler question is always R3 Q10 (the final standard question). Teams wager points on it. |
| Bonus 1 | Placed at R1 Q11 (end of Round 1) |
| Bonus H&T | Placed at R2 Q11 (end of Round 2). Heads & Tails bonus. |
| **No Venue Repeats — EVER** | A question used at one venue must never appear at another venue. The database tracks this. |
| **No Private Event Questions** | Questions tagged `PRIVATE_EVENT` (for clients like Joe, Marie, GSK) must never appear in regular pub trivia packs. |
| Balanced Categories | Each pack must have a balanced spread of categories — no category should dominate. |
| Question Type Order | The order of question types (multiple choice, open answer, picture round, etc.) must match previous weeks' patterns for consistency. |

## 5. Current Venues (9)

| Venue | Night |
|---|---|
| Ascot Vale Hotel | Monday |
| Spotswood Hotel | Tuesday |
| Mona Castle Hotel | Tuesday |
| 388 Sports Bar | Tuesday |
| Cross Keys Hotel | Tuesday |
| Steam Packet Hotel | Wednesday |
| Hotel Trentham | Thursday |
| The Cheeky Pint | Thursday |
| Stags Head Hotel | Saturday |

**Note:** Tuesday is the busiest night with 4 venues running simultaneously. This means 4 unique trivia packs are needed for Tuesdays, with **zero question overlap** between them.

## 6. Question Database

The Supabase backend (Armada project) holds 6,500+ questions. Additionally, a validated CSV export exists (`KBT_Question_Bank.csv`) containing 1,814 questions that have been through the full vetting process.

Key database considerations:

- Questions are tagged by category, difficulty, type, and venue history
- `PRIVATE_EVENT` tagged questions are excluded from regular packs
- Venue usage history is tracked to prevent repeats
- The CSV is a snapshot — the live Supabase database is the source of truth

## 7. Features Still To Build

| Feature | Description |
|---|---|
| Fun Facts for All Questions | Every question should have an accompanying fun fact hosts can optionally share after revealing the answer. Adds entertainment value. |
| New Question Types | Expand beyond current types. Ideas: audio rounds, picture rounds, speed rounds, etc. |
| Venue Portal | A dedicated portal for venue managers to view upcoming trivia dates, past results, and communicate with KBT. |
| Social Media Automation | Auto-posting of the Facebook Freebie question and venue tags to Instagram and Facebook each week. |
| Full Session Schedule Per Teacher | Internal scheduling tool (may relate to hosts rather than teachers). |
| Deploy Remaining Venue Slides | Some venue-specific branded slide templates still need to be finalised and deployed. |

## 8. Business Context for Claude Users

**Who is Paddy?** Paddy Gallivan is a PE teacher at Williamstown Primary School who runs Know Brainer Trivia as a side business with his partner George. He's a builder — he loves creating tools and systems that simplify work. He comes from a big family and runs various comps (footy tipping, racing) for them. His company is 10 16 Pty Ltd.

**Business Goals (from KBT's strategy documents):**

- 5-year BHAG: Know Brainer becomes the "iPod and Band-Aid" of trivia (the default name people think of for pub trivia)
- 12-month goals: 20 weekly/fortnightly venues, 10 Christmas trivias, 20 corporate trivias, 5,000 social media followers
- **Key differentiator: Leagues** — KBT's point of difference from other trivia companies

**Key People**

| Person | Role |
|---|---|
| Paddy Gallivan | Co-founder, app builder, content creator. pgallivan@outlook.com |
| George | Business partner. Handles financials, image content, question vetting. |

## 9. Related KBT Projects & Assets

- **KBT Website:** https://www.knowbrainertrivia.com.au
- **Supabase Backend:** Armada project (shared with Long Range Tipping — needs migration to its own project)
- **IP Protection:** Copyright notices on 55 files. "Kow Brainer Trivia" trademark searched and CLEAR on IP Australia. Terms of Service and Privacy Policy created.
- **Socials:** @knowbrainertrivia on Instagram and Facebook

## 10. How to Use This Document with Claude

**INSTRUCTIONS FOR NEW CLAUDE SESSIONS**

1. Reference this file (`docs/reference/kbt-trivia-app-reference.md`) in any new Claude conversation.
2. Say: *"Read this file and help me continue building the KBT trivia app."*
3. Claude will have full context on the app architecture, rules, venues, workflow, and outstanding work.

For the master handover document covering ALL of Paddy's projects (not just KBT), see `docs/handovers/` for the latest dated handover.

Update this document after major changes to keep it current.

*— Last updated: 4 April 2026 —*
