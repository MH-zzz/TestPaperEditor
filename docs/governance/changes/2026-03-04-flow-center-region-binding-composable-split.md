# Flow Center Region Binding Composable Split

## 1. Summary

- Change title: Extract region-binding toggle logic from `FlowModulesManager.vue` into dedicated composable.
- Date: 2026-03-04
- Owner: Flow Center / Region Routing UX

## 2. Problem

- Region binding switch logic was tightly mixed with page orchestration code.
- This made the routing-related UI harder to read, review, and evolve.

## 3. Scope

- Included:
  - add `components/views/flow-modules/useRegionBindingOverview.ts`;
  - migrate region list and bind/unbind actions into composable;
  - keep template-bound names (`regionBindingOptions`, `toggleRegionBindingForCurrentFlowLine`) compatible.
- Not included:
  - scoring/diagnostics algorithm changes;
  - route simulator behavior changes.

## 4. Key Output

- Added:
  - `components/views/flow-modules/useRegionBindingOverview.ts`
- Updated:
  - `components/views/FlowModulesManager.vue`
  - `tests/flow-profile-routing.test.mjs`
  - `tests/flow-editor-mode.test.mjs`
  - `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Evidence

- Focused regression:
  - `node --test tests/flow-editor-mode.test.mjs tests/flow-profile-routing.test.mjs tests/flow-center-maintainability.test.mjs`
- Extended regression:
  - `node --test tests/preview-mode.test.mjs tests/flow-profile-routing.test.mjs tests/flow-editor-mode.test.mjs tests/flow-center-maintainability.test.mjs`
- Full regression:
  - `npm run test`

## 6. Status Clarification

- `FlowModulesManager.vue` line count is now about `4062`, lower than the `<= 4200` target.
- Region binding behavior remains backward-compatible with existing template bindings and regression assertions.
