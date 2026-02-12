# VNext 编辑/流程/路由重构 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不考虑兼容的前提下，把“编辑题目 + 编辑流程 + 编辑路由”收敛到单一架构，做到高上手、可持续、可扩展。  
**Architecture:** 采用 `domain + app + engine + infra + ui` 分层；以单一 Store 和单一 FlowEngine runtime 为主链路；通过统一校验闸门和诊断面板保障可维护性。  
**Tech Stack:** Vue3/uni-app、TypeScript、Node test runner（`node --test`）。

---

## 0. 范围与约束

1. 不做兼容层，不保留双轨逻辑。
2. 旧链路直接替换或删除，避免“新旧并存”。
3. 每周必须完成“代码 + 测试 + 文档”闭环。
4. 每个阶段都要有可演示可验收的产物。

## 1. 6 周执行总览（按周）

| 周次 | 核心目标 | 交付物 |
|---|---|---|
| Week 1 | 单一入口 + 单一状态源 | 统一编辑入口、`QuestionDraftStore`、去事件总线主链路 |
| Week 2 | 单一保存闸门 | `validateQuestionBeforeSave`、字段级错误反馈、明确 Draft/Save 语义 |
| Week 3 | 单一运行时入口 | 预览/演练统一 runtime、调试抽屉与 trace timeline |
| Week 4 | 流程模块与路由产品化 | 发布摘要、差异视图、路由模拟器增强 |
| Week 5 | 步骤插件化扩展 | step plugin 协议落地，渲染主分支去业务分叉 |
| Week 6 | 清理与基线稳定 | 删除废弃链路、补齐测试矩阵、更新操作手册 |

## 2. Week 1：单一入口 + 单一状态源

### Task 1.1 统一编辑入口

**Files:**
- Modify: `pages/index/index.vue`
- Modify: `pages.json`
- Delete: `pages/editor/index.vue`

**Steps:**
1. 删除并行编辑入口路由，仅保留 `pages/index/index` 主入口。
2. 去掉 `editorKey` 刷新式重建工作区逻辑，改为状态驱动。
3. 明确“创建新题/加载题库题目”只走 store action。

**Acceptance:**
1. 项目中不存在可进入的第二编辑入口。
2. 从题库加载题目后，编辑页状态不丢失且无整页重建闪烁。

**Verification:**
- Run: `node --test tests/preview-mode.test.mjs`

### Task 1.2 落地 `QuestionDraftStore`

**Files:**
- Create: `stores/questionDraft.ts`
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `components/layout/SideNavigation.vue`
- Modify: `components/views/QuestionLibrary.vue`

**Steps:**
1. 建立 `QuestionDraftStore`，提供 `load/create/update/save/reset` action。
2. `EditorWorkspace`、`SideNavigation`、`QuestionLibrary` 全部改用 store action。
3. 删除上述文件中的核心 `uni.$emit/$on` 流程依赖。

**Acceptance:**
1. 编辑、标签、题库回编都通过同一 store 更新。
2. 关键链路不再依赖事件总线传递状态。

**Verification:**
- Run: `node --test tests/flow-modules.test.mjs`

## 3. Week 2：单一保存闸门

### Task 2.1 题目保存校验网关

**Files:**
- Create: `domain/question/validators/listeningChoiceValidator.ts`
- Create: `domain/question/usecases/saveQuestionDraft.ts`
- Modify: `components/views/EditorWorkspace.vue`
- Test: `tests/question-save-validation.test.mjs`

**Steps:**
1. 新增统一校验返回结构：`{ ok, errors, warnings, diagnostics }`。
2. 保存题目前必须先过 validator，不通过直接阻断。
3. 编辑器展示字段级错误，并给修复建议。

**Acceptance:**
1. 缺必填、空题组、答案非法时，禁止保存并定位到字段。
2. 通过校验后保存成功，且可回显最新状态。

**Verification:**
- Run: `node --test tests/question-save-validation.test.mjs`

### Task 2.2 语义收敛：Draft / Save

**Files:**
- Modify: `stores/questionDraft.ts`
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `components/views/QuestionLibrary.vue`
- Test: `tests/question-draft-semantics.test.mjs`

**Steps:**
1. 定义 Draft（编辑中）与 Save（入库）两种行为。
2. 取消“deep watch 直接落盘 + 手动再入库”的混合语义。
3. `reset` 语义改为“回到最近保存快照”。

**Acceptance:**
1. 用户可明确区分“暂存中”和“已保存到题库”。
2. 重置行为稳定可预期。

**Verification:**
- Run: `node --test tests/question-draft-semantics.test.mjs`

## 4. Week 3：单一运行时入口 + 调试能力

### Task 3.1 预览/演练统一 runtime

**Files:**
- Create: `app/usecases/runQuestionFlow.ts`
- Modify: `components/layout/PhonePreviewPanel.vue`
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `components/views/LearningWorkspace.vue`
- Test: `tests/runtime-unified-entry.test.mjs`

**Steps:**
1. 抽出统一运行时用例，注入 question + ctx 后返回 runtime state。
2. 编辑预览、学习演练统一调用该用例。
3. 移除页面侧重复 step 推进逻辑。

**Acceptance:**
1. 同一题在预览和演练步骤推进一致。
2. runtime source/profile/module/version 可在 UI 查询。

**Verification:**
- Run: `node --test tests/runtime-unified-entry.test.mjs`
- Run: `node --test tests/preview-mode.test.mjs`

### Task 3.2 调试抽屉与轨迹

**Files:**
- Create: `stores/runtimeDebug.ts`
- Create: `components/layout/RuntimeDebugDrawer.vue`
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `components/views/LearningWorkspace.vue`
- Test: `tests/runtime-trace.test.mjs`

**Steps:**
1. 将 route hit、step transition、effect 执行写入统一 trace store。
2. 在编辑页提供调试抽屉（可开关）。
3. 支持导出诊断包（json）。

**Acceptance:**
1. 任意一次运行都可追溯“命中规则 -> 模块版本 -> 步骤轨迹”。
2. 导出的诊断包可用于复现。

**Verification:**
- Run: `node --test tests/runtime-trace.test.mjs`

## 5. Week 4：流程模块与路由产品化

### Task 4.1 发布摘要与差异视图

**Files:**
- Create: `domain/flow-module/usecases/buildModuleDiffSummary.ts`
- Modify: `components/views/FlowModulesManager.vue`
- Test: `tests/flow-module-diff-summary.test.mjs`

**Steps:**
1. 发布前生成“步骤变化 + 参数变化 + 影响规则”摘要。
2. 在发布确认弹窗展示摘要。
3. 发布后自动记录发布日志。

**Acceptance:**
1. 每次发布都能看到清晰 diff 和影响范围。
2. 发布日志可查询。

**Verification:**
- Run: `node --test tests/flow-module-diff-summary.test.mjs`

### Task 4.2 路由模拟器增强

**Files:**
- Create: `domain/flow-profile/usecases/scoreProfiles.ts`
- Modify: `components/views/FlowModulesManager.vue`
- Modify: `stores/flowProfiles.ts`
- Test: `tests/flow-profile-routing.test.mjs`

**Steps:**
1. 输出 TopN 候选规则与维度得分（region/scene/grade/priority）。
2. 明确冲突、死规则、弱覆盖提示并给修复建议。
3. 提交规则前强制通过诊断。

**Acceptance:**
1. 配置员可解释“为什么命中这条规则”。
2. 新规则提交前可发现主要配置风险。

**Verification:**
- Run: `node --test tests/flow-profile-routing.test.mjs`

## 6. Week 5：步骤插件化扩展

### Task 5.1 步骤插件协议

**Files:**
- Create: `engine/flow/plugins/types.ts`
- Create: `engine/flow/plugins/registry.ts`
- Create: `engine/flow/plugins/listening-choice/*.ts`
- Modify: `components/renderer/listening-choice/stepPlugins.ts`
- Test: `tests/flow-step-plugin-registry.test.mjs`

**Steps:**
1. 定义插件协议：`kind/schema/renderer/runtimeReducer/validator`。
2. 注册听后选择全部步骤插件。
3. 插件注册失败时给明确错误。

**Acceptance:**
1. 新增步骤不需要改主渲染器条件链。
2. 插件行为可单测。

**Verification:**
- Run: `node --test tests/flow-step-plugin-registry.test.mjs`

### Task 5.2 渲染主分支去业务分叉

**Files:**
- Modify: `components/renderer/QuestionRenderer.vue`
- Modify: `components/renderer/ListeningChoiceRenderer.vue`
- Test: `tests/flow-engine.test.mjs`

**Steps:**
1. 主渲染器只做路由与容器，不写题型细节步骤判断。
2. 题型细节由插件 + runtime 决定。
3. 清理遗留 hardcode 分支。

**Acceptance:**
1. `QuestionRenderer` 不再承载步骤业务判断。
2. 现有听后选择功能行为不回退。

**Verification:**
- Run: `node --test tests/flow-engine.test.mjs`

## 7. Week 6：清理、稳定、文档化

### Task 7.1 删除废弃链路

**Files:**
- Modify: `pages.json`
- Delete: `pages/editor/index.vue`（若 Week 1 未删则此周强制删）
- Modify: `components/views/EditorWorkspace.vue`
- Modify: `components/layout/SideNavigation.vue`

**Steps:**
1. 清理已废弃事件总线与重复迁移逻辑。
2. 清理旧入口、旧状态写法、旧保存语义代码。
3. 运行全量测试并修复回归。

**Acceptance:**
1. 代码中无主链路 `uni.$emit/$on` 依赖。
2. 无并行编辑入口和重复保存实现。

**Verification:**
- Run: `node --test`

### Task 7.2 文档与操作手册收口

**Files:**
- Modify: `docs/plans/2026-02-12-architecture-assessment-alignment.md`
- Modify: `docs/题型流程操作手册.md`
- Create: `docs/plans/2026-02-12-vnext-acceptance-checklist.md`

**Steps:**
1. 更新架构图、编辑流、发布流、路由流。
2. 增加“新人 0 到 1 操作手册”（建题、改流程、配路由、演练）。
3. 形成最终验收 checklist。

**Acceptance:**
1. 非开发角色可按文档独立完成全链路操作。
2. 文档与代码行为一致。

**Verification:**
- Walkthrough: 按 checklist 人工演练 1 次并记录结果。

## 8. 全局完成定义（DoD）

1. 单一入口：只有 `pages/index/index` 承担编辑主链路。
2. 单一状态源：编辑主链路只有一个 QuestionDraftStore。
3. 单一执行入口：预览/演练/考试都走同一 runtime usecase。
4. 单一校验闸门：题目/流程/路由保存都有统一返回结构并可视化错误。
5. 单一扩展方式：新步骤只能通过插件注册，不允许改主分支硬编码。
6. 全量测试通过：`node --test` 通过。

## 9. 执行进度（本会话）

- [x] Week 1 / Task 1.1：统一编辑入口（移除 `pages/editor/index.vue` 与 `pages.json` 入口）。
- [x] Week 1 / Task 1.2：落地 `QuestionDraftStore` 并接入 `pages/index`、`EditorWorkspace`、`QuestionLibrary`、`SideNavigation`。
- [x] Week 2 / Task 2.1：新增 `validateQuestionBeforeSave` 与 `saveQuestionDraft` 用例，并在 `EditorWorkspace` 保存前强制校验。
- [x] Week 2 / Task 2.2：收敛 Draft/Save 语义（去除 `deep watch` 直接写盘，`updateDraft` 与 `saveToRecent` 职责分离，增加 `dirty` 状态）。
- [x] 相关回归测试更新：`tests/preview-mode.test.mjs`（同步到 store 驱动逻辑）。
- [x] 新增测试：`tests/question-save-validation.test.mjs`（覆盖校验与保存语义）。
- [x] Week 3 / Task 3.1：新增统一运行时入口 `app/usecases/runQuestionFlow.ts`，并接入 `EditorWorkspace` / `LearningWorkspace` / `PhonePreviewPanel`。
- [x] Week 3 / Task 3.2：新增统一运行轨迹存储 `stores/runtimeDebug.ts` 与调试抽屉 `components/layout/RuntimeDebugDrawer.vue`，支持导出诊断包（JSON）。
- [x] Week 4 / Task 4.1：新增 `buildModuleDiffSummary`，在保存/发布确认弹窗展示步骤与参数差异摘要，并在发布后自动记录发布日志。
- [x] Week 4 / Task 4.2：新增 `scoreProfiles` 路由评分/诊断用例，收敛 `FlowModulesManager` 与 `flowProfiles` 的评分逻辑，并在路由提交前强制通过诊断。
- [x] Week 5 / Task 5.1：新增步骤插件协议与注册中心（`engine/flow/plugins/**`），并将听后选择步骤行为接入统一插件注册。
- [x] Week 5 / Task 5.2：`QuestionRenderer` 改为配置路由表容器，`ListeningChoiceRenderer` 关键运行分支改为基于插件 render behavior 决策，`listening-choice runtime` 接入插件 `runtimeReducer`。
- [x] Week 6 / Task 7.1：清理验收完成（主链路无 `uni.$emit/$on`、无并行 `pages/editor` 入口、旧保存语义已收敛）。
- [x] Week 6 / Task 7.2：完成文档收口（更新架构对齐文档、重写操作手册、补充最终验收 checklist）。
- [x] 后续优化 1：移除剩余事件总线残留（`switch-to-editor/current-question-updated`），改为 `appShell + questionDraft` 单链路。
- [x] 后续优化 2：`FlowModulesManager` 不再直接读写 `currentQuestion` storage，统一走 `questionDraft`。
- [x] 后续优化 3：`ListeningFillRenderer` 词库顺序改为稳定洗牌，消除 `Math.random()` 导致的顺序漂移。
- [x] 后续优化 4：`flowModules/flowProfiles/contentTemplates/flowLibrary/standardFlows` 去除 `deep watch` 自动写盘，改为命令式触发 + 防抖持久化。
- [x] 后续优化 5：封堵绕过闸门 API（`flowProfiles.upsert/remove` 强制走 diagnostics；`flowModules.upsert` 禁止直接改状态）。
- [x] 后续优化 6：新增行为级约束测试 `tests/store-guardrails.test.mjs` 与 `tests/current-question-bridge.test.mjs`，降低纯字符串断言依赖。
- [x] 后续优化 7：抽离 `components/views/flow-modules/currentQuestionBridge.ts`，收敛 FlowModulesManager 中高耦合题目上下文/流程补丁逻辑。
- [x] 后续优化 8：去除核心链路 `@ts-ignore`（JSON 导入声明化），并收敛 `engine/flow/runtime.ts` 的关键 `any` 热点。
- [x] 新增测试：`tests/runtime-unified-entry.test.mjs`、`tests/runtime-trace.test.mjs`（覆盖统一运行时入口与轨迹能力）。
- [x] 新增测试：`tests/flow-module-diff-summary.test.mjs`（覆盖流程发布差异摘要与日志接入）。
- [x] 路由增强测试更新：`tests/flow-profile-routing.test.mjs`（覆盖弱覆盖诊断、提交拦截、`upsertWithDiagnostics/removeWithDiagnostics`）。
- [x] 新增测试：`tests/flow-step-plugin-registry.test.mjs`、`tests/flow-engine.test.mjs`（覆盖插件注册与 runtime/渲染主分支收敛）。
- [x] 验证：`node --test`（90 通过，0 失败）。
