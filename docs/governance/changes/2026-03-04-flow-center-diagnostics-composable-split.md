# Flow Center Diagnostics Composable Split

## 1. Summary

- Change title: Extract flow-profile diagnostics and fix-preview workflow from `FlowModulesManager.vue` into dedicated composable.
- Date: 2026-03-04
- Owner: Flow Center / Routing Diagnostics

## 2. Problem

- `FlowModulesManager.vue` mixed page orchestration with detailed diagnostics/fix-preview mutation logic.
- This increased maintenance cost and slowed onboarding for flow-center changes.

## 3. Scope

- Included:
  - add `components/views/flow-modules/useFlowProfileDiagnostics.ts`;
  - migrate diagnostics/fix-preview computation and apply flow into composable;
  - keep template-side variable/function names unchanged for compatibility with existing string-assert tests.
- Not included:
  - route scoring rule algorithm changes;
  - UI layout redesign.

## 4. Key Output

- Added:
  - `components/views/flow-modules/useFlowProfileDiagnostics.ts`
- Updated:
  - `components/views/FlowModulesManager.vue`
  - `tests/flow-profile-routing.test.mjs`
  - `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Evidence

- Focused regression:
  - `node --test tests/flow-profile-routing.test.mjs tests/flow-center-maintainability.test.mjs`
- Full regression:
  - `npm run test`

## 6. Status Clarification

- `FlowModulesManager.vue` line count reduced to about `4062`, and still satisfies the maintainability guardrail.
- Phase 2 split for routing diagnostics/fix-preview is now landed and remains compatible with existing routing panel assertions.
