# Unified Runtime Entry For Listening Fill + Match

> Superseded by: `docs/governance/changes/2026-03-04-listening-fill-match-baseline-accepted.md`

## 1. Summary

- Change title: Add unified runtime single-step entry for `listening_fill` / `listening_match`.
- Date: 2026-03-04
- Type IDs involved: `listening_fill`, `listening_match`
- Owner: Engine + Docs

## 2. Problem

- These two types had renderer support, but no explicit unified runtime step protocol.
- `runQuestionFlow` returned no steps for both types, so preview/runtime entry behavior was not aligned with other types.

## 3. Scope

- Included:
  - add single-step runtime protocol in `runQuestionFlow` for fill/match;
  - align editor type selector mapping for relevant leaves;
  - update governance docs to reflect runtime-entry status.
- Not included:
  - full UI acceptance promotion;
  - fill/match renderer interaction refactor.

## 4. Key Output

- Updated:
  - `app/usecases/runQuestionFlow.ts`
  - `components/views/EditorWorkspace.vue`
  - `docs/governance/question-type-registry.md`
  - `docs/governance/flow-ui-standards.md`
  - `docs/question-types/listening-fill-ui-baseline.md`
  - `docs/question-types/listening-match-ui-baseline.md`

## 5. Status Clarification

- This change keeps status as:
  - `listening_fill`: flow partial / UI partial
  - `listening_match`: flow partial / UI partial
- Clarification:
  - flow side now has unified runtime single-step entry integrated;
  - final acceptance still requires UI polish + regression expansion.

## 6. Follow-up

- Add interaction-focused renderer regression tests for fill/match.
- Complete baseline promotion checklist and then submit acceptance record.
