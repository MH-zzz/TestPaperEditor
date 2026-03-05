# Flow Center Commit Validation Composable Split

## 1. Summary

- Change title: Extract commit-validation issue normalization and jump workflow from `FlowModulesManager.vue` into dedicated composable.
- Date: 2026-03-04
- Owner: Flow Center / Commit Guardrail

## 2. Problem

- The flow center mixed “提交阻断项” normalization/jump logic with page orchestration.
- This increased cognitive load and made publish-guardrail updates risky.

## 3. Scope

- Included:
  - add `components/views/flow-modules/useCommitValidationIssues.ts`;
  - migrate issue normalization, location labeling and jump-to-target actions into composable;
  - keep template-bound names (`jumpToCommitValidationIssue`/`jumpToFirstCommitValidationIssue`/`clearCommitValidationIssues`) compatible.
- Not included:
  - module cross-check rule changes;
  - visual style changes for blocker panel.

## 4. Key Output

- Added:
  - `components/views/flow-modules/useCommitValidationIssues.ts`
- Updated:
  - `components/views/FlowModulesManager.vue`
  - `tests/flow-profile-routing.test.mjs`
  - `tests/flow-center-maintainability.test.mjs`

## 5. Acceptance Evidence

- Focused regression:
  - `node --test tests/flow-profile-routing.test.mjs tests/flow-center-maintainability.test.mjs`
- Extended regression:
  - `node --test tests/flow-editor-mode.test.mjs tests/preview-mode.test.mjs`
- Full regression:
  - `npm run test`

## 6. Status Clarification

- `FlowModulesManager.vue` line count is now about `4062`, maintaining `<= 4200`.
- Commit validation issues flow now has independent composable boundary for future guardrail evolution.
