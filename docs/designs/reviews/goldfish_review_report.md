# Goldfish review of `docs/designs/algone.md`

Reviewed 2026-10-31 through the EGM stages, run sequentially by fresh subagents. The
owner delegated resolution to the Elephant and said not to stop and ask, so stage gates
were resolved by the Elephant instead of a person. This page condenses the reviewers'
output. Each finding is listed by outcome.

Severity counts are as reported by the reviewers.

| Stage | Reviewers | Blockers | Majors | Outcome |
|---|---|---|---|---|
| 5 Zoom out | `egm-zoom-out` | 3 | 10 | Applied, except as contested below |
| 6 Comprehension | `egm-comprehension` | 0 | 16 | Applied |
| 7 Critic | `egm-design`, `egm-structural`, `egm-style` | 3 | 55 | Applied, except as contested below |
| 8 Zoom out | `egm-zoom-out` | 1 | 9 | Applied |
| 9 Readiness | `egm-implementation-readiness`, `egm-codebase-details`, `egm-style` not re-run | 4 | 14 | Applied by rewriting the plan |

No re-audit was run after Stage 9. The EGM cap allows one. The reviewers' last findings
concerned the plan, and the build tests that plan directly.

## Contested

| Finding | Why |
|---|---|
| Cut to 3 to 5 sites and a minimal v1 (Stage 5, B3) | Scope is set by the owner (`owner_brief.md`). Support tiers and phase order were added instead |
| Defer Custom mode (Stage 5, M1) | Owner scope. Its limits are stated in the spec |
| Ship only pause plus daily limit (Stage 5, M2) | Owner scope |
| Defer Algone Browser (Stage 5, M3) | The owner's later decision makes it part of the build |
| Release and ledger are premature (Stage 5, N2) | Owner scope |
| Remove the `ads` filter everywhere (Stage 5, M10) | Owner named it for Tuned. Kept in the extension, removed from the app |
| Staged rollout of rules (Stage 7, 24) | One file, no user cohorts, no telemetry to judge a stage. Live probes guard publishing; recorded as a risk |

## Main changes from review

*   Logged-in detection, through a check on the owner's machine (Stage 5).
*   Sanitized structural snapshots, so a repair has real input (Stage 5).
*   Overlay narrowed to selector data, with an explicit field table (Stages 5 and 8).
*   `data-algone-off` for repairing both classes of element, written only after
    `insertCSS` succeeds (Stages 5 and 7).
*   Mobile trust boundary: state and barriers native; page script gets a view and
    sends hints (Stage 7).
*   Entry-level rule validation and forward compatibility (Stage 7).
*   Panels moved from light DOM to extension iframes (Stage 7).
*   `pauseHiddenMedia`, as `display: none` does not stop video (Stage 7).
*   Single state writer, and pending changes as patches (Stage 7).
*   Repo rulesets and required approval on `release` (Stage 7).
*   Expired locks fall back to an `after` barrier; allow-list additions need a pass
    (Stage 7).
*   Risks and Mitigations section (Stage 7).
*   `tabs` permission removed (Stage 5).
*   Publishing guard limited to regressions in changed sites (Stage 8).
*   Status data on a `site-status` branch (Stage 8).
*   Stable tag creation and store dispatch defined (Stage 8).
*   Site inventory, `PageHost` contract, workflow table, and named identifiers
    (Stage 9).

## Known residual items

*   Claim 33 of US 12468828 was not read in full.
*   Platform claims marked "platform knowledge" by reviewers were not all re-checked
    against primary docs. Those that matter are covered by the Firefox and Chromium
    tests, or noted as device-only.
