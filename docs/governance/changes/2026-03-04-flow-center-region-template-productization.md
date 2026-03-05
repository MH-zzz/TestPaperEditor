# Flow Center Region Template Productization

## 1. Summary

- Change title: Productize region-to-flow binding templates with save/apply workflow.
- Date: 2026-03-04
- Owner: Flow Center / Teaching Research Workflow

## 2. Problem

- Region binding relied on per-region manual clicks each time, which was slow for repeated teaching scenarios.
- Existing flow center lacked reusable “地区 -> 流程线” presets.

## 3. Scope

- Included:
  - add region template repository `infra/repository/flowRegionBindingTemplateRepository.ts`;
  - add composable `components/views/flow-modules/useRegionBindingTemplates.ts`;
  - add flow center UI for “沉淀当前绑定” and “一键应用” actions.
- Not included:
  - server-side template sync;
  - cross-question-type template sharing.

## 4. Key Output

- Added:
  - `infra/repository/flowRegionBindingTemplateRepository.ts`
  - `components/views/flow-modules/useRegionBindingTemplates.ts`
- Updated:
  - `components/views/FlowModulesManager.vue`
  - `components/views/flow-modules/FlowModulesManager.scss`
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

- Region template capability now supports:
  - saving current region bindings into a reusable template;
  - one-click applying template to active region routing bindings.
- Existing region binding behavior remains backward-compatible with previous flow center interactions.
