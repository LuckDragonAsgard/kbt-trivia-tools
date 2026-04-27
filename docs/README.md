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
| [v25 EOD](handovers/2026-04-26-EOD.md) | 2026-04-26 | EOD note (abridged) |
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
