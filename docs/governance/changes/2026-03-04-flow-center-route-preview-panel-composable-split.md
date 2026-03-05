# Flow Center Preview Panel Composable Split

## 1. Summary

- Change title: Extract preview panel state logic from `FlowModulesManager.vue`.
- Date: 2026-03-04
- Owner: Flow Center / Maintainability

## 2. Problem

- `FlowModulesManager.vue` still mixed preview-panel state orchestration with page-level coordination.
- Preview navigation state machine was tightly coupled to page script, increasing maintenance cost.

## 3. Scope

- Included:
  - add `components/views/flow-modules/useFlowPreviewPanel.ts`;
  - migrate preview panel step state/watch logic into composable.
- Not included:
  - route scoring algorithm changes;
  - visual graph editor behavior changes.

## 4. Key Output

- Added:
  - `components/views/flow-modules/useFlowPreviewPanel.ts`
- Updated:
  - `components/views/FlowModulesManager.vue`
  - `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Evidence

- Focused regression:
  - `node --test tests/flow-profile-routing.test.mjs tests/flow-center-maintainability.test.mjs`
- Extended regression:
  - `node --test tests/flow-editor-mode.test.mjs tests/preview-mode.test.mjs`
- Full regression:
  - `npm run test`

## 6. Status Clarification

- `FlowModulesManager.vue` line count is now about `3949`, still below `<= 4200`.
- Existing UI interactions remain compatible after extraction.
