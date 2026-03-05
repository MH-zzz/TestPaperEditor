# Listening Fill + Listening Match UI Baseline Draft

> Superseded by: `docs/governance/changes/2026-03-04-listening-fill-match-baseline-accepted.md`

## 1. Summary

- Change title: Add draft baseline docs for `listening_fill` and `listening_match`.
- Date: 2026-03-04
- Type IDs involved: `listening_fill`, `listening_match`
- Owner: Docs

## 2. Problem

- Both types were `Partial` without dedicated baseline docs.
- UI iteration lacked explicit reference for layout/typography/interaction checks.

## 3. Scope

- Included:
  - draft baseline docs for current renderer implementations;
  - governance linkage updates.
- Not included:
  - runtime/compiler changes;
  - renderer style refactor.

## 4. Key Output

- Added:
  - `docs/question-types/listening-fill-ui-baseline.md`
  - `docs/question-types/listening-match-ui-baseline.md`
- Updated:
  - `docs/governance/question-type-registry.md`
  - `docs/governance/flow-ui-standards.md`
  - `README.md`

## 5. Status Clarification

- This change does **not** mark these two types as accepted.
- Current status remains:
  - `listening_fill`: flow partial / UI partial
  - `listening_match`: flow partial / UI partial

## 6. Follow-up

- Use draft docs as acceptance pre-check baselines.
- After UI/runtime convergence and regression tests, submit acceptance record and update statuses.
