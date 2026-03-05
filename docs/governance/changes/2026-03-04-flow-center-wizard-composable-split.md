# Flow Center Wizard Composable Split

## 1. Summary

- Change title: Extract flow-line creation wizard logic from `FlowModulesManager.vue` into dedicated composable.
- Date: 2026-03-04
- Owner: Flow Center / Flow-Line Authoring UX

## 2. Problem

- Flow-line wizard state and create/publish action logic was mixed into the main manager script.
- This increased coupling between page orchestration and wizard-specific behaviors (baseline pick, region binding, default naming).

## 3. Scope

- Included:
  - add `components/views/flow-modules/useFlowLineWizard.ts`;
  - migrate wizard state, region selection helpers, and confirm-create workflow into composable;
  - keep template-bound names (`flowLineWizardVisible`, `openFlowLineCreateWizard`, `confirmCreateFlowLineFromWizard`) compatible.
- Not included:
  - flow module publish policy changes;
  - region scoring/simulation algorithm changes.

## 4. Key Output

- Added:
  - `components/views/flow-modules/useFlowLineWizard.ts`
- Updated:
  - `components/views/FlowModulesManager.vue`
  - `tests/flow-profile-routing.test.mjs`
  - `tests/flow-center-maintainability.test.mjs`
  - `docs/plans/2026-03-04-type-coverage-and-flow-center-maintainability.md`

## 5. Acceptance Evidence

- Focused regression:
  - `node --test tests/flow-profile-routing.test.mjs tests/flow-center-maintainability.test.mjs`
- Extended regression:
  - `node --test tests/flow-editor-mode.test.mjs tests/preview-mode.test.mjs`
- Full regression:
  - `npm run test`

## 6. Status Clarification

- `FlowModulesManager.vue` line count is now about `3994`, below the current `<= 4200` guardrail.
- Wizard creation and region binding behavior remain backward-compatible with existing template bindings and string-assertion tests.
