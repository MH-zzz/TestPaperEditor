# Speaking Steps Baseline Accepted

## 1. Summary

- Change title: Promote `speaking_steps` baseline from draft to accepted.
- Date: 2026-03-04
- Type IDs involved: `speaking_steps`
- Owner: UI + Engine + Docs

## 2. Problem

- Previous state was `Flow Partial / UI In Progress`.
- Loop expansion and preview navigation contracts were not explicitly standardized as acceptance artifacts.

## 3. Scope

- Included:
  - add deterministic loop expansion helper for speaking-steps;
  - align `runQuestionFlow` speaking-steps protocol with expanded runtime steps;
  - align renderer footer mode by step kind resolver;
  - promote governance status to `Done/Done`.
- Not included:
  - new speaking part-type feature additions;
  - redesign of speaking step cards.

## 4. Key Output

- Added:
  - `engine/flow/speaking-steps/expand.ts`
  - `tests/speaking-steps-runtime.test.mjs`
- Updated:
  - `app/usecases/runQuestionFlow.ts`
  - `components/renderer/SpeakingStepsRenderer.vue`
  - `components/views/EditorWorkspace.vue`
  - `docs/question-types/speaking-steps-ui-baseline.md`
  - `docs/governance/question-type-registry.md`
  - `docs/governance/flow-ui-standards.md`
  - `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Evidence

- Loop expansion deterministic and stable IDs:
  - `tests/speaking-steps-runtime.test.mjs`
- Runtime navigation no-skip contract:
  - `tests/speaking-steps-runtime.test.mjs`
- Unified entry protocol alignment for speaking-steps:
  - `app/usecases/runQuestionFlow.ts`
  - `tests/runtime-unified-entry.test.mjs`

## 6. Status Clarification

- `speaking_steps` is now marked:
  - Flow: `Done`
  - UI: `Done`
- This acceptance applies to current release scope; future behavior changes must update baseline + change record again.
