# 题型覆盖与流程中心可维护性计划（聚焦 3 / 4）

更新时间：2026-03-04

## 目标

在不推进服务端路由改造（原 1 / 2 暂缓）的前提下，集中完成：

1. 题型矩阵补齐（优先 `speaking_hear_answer`，随后 `speaking_steps` / `listening_fill` / `listening_match`）。
2. 流程中心可维护性治理（降低 `FlowModulesManager.vue` 复杂度，提高后续迭代上手效率）。

---

## Track A：题型矩阵补齐

### A1（本次完成）

1. 补齐 `speaking_hear_answer` UI baseline 文档。
2. Registry/Standards 状态同步到 `UI = Done`。
3. 补齐 `speaking_steps` UI baseline 并接入治理链接（状态推进到 `Done`）。
4. 补齐 `listening_fill` / `listening_match` UI baseline 并接入治理链接（状态推进到 `Done`）。

### A2（分阶段推进）

#### A2-1（本次已完成）

1. `listening_fill` / `listening_match`：
  - 已接入 unified runtime 单步协议（`runQuestionFlow`）；
  - 已在编辑器题型映射中开放入口（听力填空 / 听力连线）。
  - 已完成 runtime helper 抽象 + baseline 验收，状态推进到 `Done/Done`。
2. `speaking_steps`：
  - 已在编辑器题型映射中开放 `短文朗读` / `听后转述` 入口；
  - 已完成 runtime 循环展开对齐 + baseline 验收，状态推进到 `Done/Done`。

#### A2-2（下一步）

1. `speaking_steps`：
  - 扩展交互回归（复杂步骤组合与长流程压力场景）；
  - 维持基线锁定并按变更记录更新。
2. `listening_fill` / `listening_match`：
  - 扩展交互回归（复杂数据集与移动端压力场景）；
  - 维持基线锁定并按变更记录更新。

### A2 验收

1. Registry 中对应题型 `Flow Status / UI Status` 与实际实现一致。
2. 每个题型都具备单独 baseline 文档与 change record。
3. `npm run test` 全绿。

---

## Track B：流程中心可维护性治理

### 现状基线

1. `components/views/FlowModulesManager.vue` 当前行数约 `3949` 行（已从历史高点 `6481` 行下压）。
2. 文件仍承担多职责：流程编辑、地区绑定、路由模拟、诊断修复、可视流程、局部预览、发布门禁。

### Phase 1（立即守护）

1. 新增可维护性守护测试：
  - 当前上限：`<= 4200` 行（防止继续膨胀）。
2. 在文档中明确拆分目标与阶段。

### Phase 2（拆分执行）

1. 抽离“地区绑定 + 路由模拟 + 诊断修复”为独立 composable / 子面板组件。
2. 抽离“发布门禁展示”为独立逻辑模块。
3. 保持现有关键行为字符串不丢失，确保现有回归测试持续通过。

#### Phase 2-1（本次已完成）

1. 已接入独立诊断修复 composable：
  - 新增 `components/views/flow-modules/useFlowProfileDiagnostics.ts`；
  - 将“路由规则诊断 + 自动修复建议 + 修复预览确认”逻辑自 `FlowModulesManager.vue` 抽离；
  - `FlowModulesManager.vue` 保留模板绑定变量名，避免破坏现有字符串断言测试。
2. 已接入提交阻断项 composable：
  - 新增 `components/views/flow-modules/useCommitValidationIssues.ts`；
  - 将“更新阻断项归一化 + 一键定位（模板/路由/可视流程）+ 回填 onCommitValidationFailed”逻辑自 `FlowModulesManager.vue` 抽离；
  - 保持 `jumpToCommitValidationIssue / jumpToFirstCommitValidationIssue / clearCommitValidationIssues` 对模板绑定兼容。
3. 已接入地区绑定 composable：
  - 新增 `components/views/flow-modules/useRegionBindingOverview.ts`；
  - 将“地区绑定切换 + 目标文案计算”逻辑自 `FlowModulesManager.vue` 抽离；
  - 保持 `regionBindingOptions / toggleRegionBindingForCurrentFlowLine` 对模板绑定兼容。
4. 已接入流程线向导 composable：
  - 新增 `components/views/flow-modules/useFlowLineWizard.ts`；
  - 将“新建流程线向导（命名/基线/地区绑定）+ 创建发布入口”逻辑自 `FlowModulesManager.vue` 抽离；
  - 保持 `flowLineWizardVisible / openFlowLineCreateWizard / confirmCreateFlowLineFromWizard` 对模板绑定兼容。
5. 已接入地区流程模板能力：
  - 新增 `components/views/flow-modules/useRegionBindingTemplates.ts`；
  - 新增 `infra/repository/flowRegionBindingTemplateRepository.ts`；
  - 支持“沉淀当前绑定”为模板并在地区面板“一键应用”到当前题型流程。
6. 已接入预览状态 composable：
  - 新增 `components/views/flow-modules/useFlowPreviewPanel.ts`；
  - 将“可视预览索引/答题态/步进状态机”自 `FlowModulesManager.vue` 抽离。
7. 相关守护测试已同步：
  - `tests/flow-profile-routing.test.mjs`
  - `tests/flow-editor-mode.test.mjs`
  - `tests/flow-center-maintainability.test.mjs`

### Phase 3（收敛验收）

1. `FlowModulesManager.vue` 目标行数：`<= 5000`（已达成，当前约 `3949`）。
2. 后续目标：`<= 4200`（已达成）；下一阶段继续在功能不回退前提下逐步下压。
3. 所有拆分都必须通过 `npm run test` 与专项测试：
  - `tests/flow-editor-mode.test.mjs`
  - `tests/flow-profile-routing.test.mjs`
  - `tests/preview-mode.test.mjs`

---

## 风险与控制

1. 风险：该页面有大量“源码字符串断言”测试，直接重命名会引发大面积回归。
2. 控制：先做守护与分层，再做小步抽离；每次抽离都保留兼容包装函数与稳定命名。

---

## 执行顺序建议

1. 先完成 `speaking_hear_answer` 基线治理闭环（本次）。
2. 再做 `FlowModulesManager` Phase 1 守护（本次）。
3. 然后按 `speaking_steps -> listening_fill -> listening_match` 推进题型矩阵闭环。
4. 并行推进流程中心 Phase 2 小步拆分。
