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

### 0.1 优先级拍板规则（Demo 阶段）

1. 兼容性权重为 `0`，以“最新、最完善、最可持续、最可扩展”为唯一方向。
2. 先保主链路确定性（状态一致、流程一致、可追踪），再做体验增强。
3. 任何任务都必须能落到可验证的测试或验收步骤，不接受“感觉上更好”。

**评分模型（用于 P0/P1 切分）**

- `A. 主链路风险`（0-5）：是否可能导致流程错误、状态错乱、发布误操作。
- `B. 架构杠杆`（0-5）：是否能减少长期复杂度/重复实现。
- `C. 依赖阻塞`（0-5）：是否阻塞后续多个任务。
- `D. 实施成本`（0-5）：改动量和回归成本（分数越高成本越高）。

`PriorityScore = A*4 + B*3 + C*2 - D*1`

- `>= 26`：`P0`（立即执行）
- `18 - 25`：`P1`（P0 收口后执行）
- `<= 17`：`P2`（当前阶段不排期）

### 0.2 当前优先级队列（不排 P2）

| 优先级 | 事项 | 为什么现在做 | 完成标准（Exit Criteria） |
|---|---|---|---|
| P0 | `FlowModulesManager` 拆分 + 类型收敛 | 当前仍是最大复杂度与类型债热点，改动风险集中 | 组件拆为可复用 composable；关键链路无 `any`；相关测试通过 |
| P0 | 题目/流程/路由三方 Schema 联合校验 | 解决“隐性契约”风险，避免保存/发布后才暴露错误 | 保存与发布前统一阻断；错误定位到字段/规则 |
| P0 | 核心类型债清理（`flowProfiles`、`buildModuleDiffSummary`、`types/flow-engine`） | 核心域仍有 `any`，会放大维护和重构成本 | 核心域无 `any/@ts-ignore`；类型可推断；测试全绿 |
| P0 | 守护测试扩展（禁止绕过闸门/回退到 any） | 防止后续迭代把已收敛链路再次破坏 | 增加 guardrail 测试并纳入回归命令 |
| P1 | 编辑上手模式（题目编辑/流程编辑/路由编辑引导） | 降低编辑人员学习成本，提高产研协作效率 | 新人按文档可独立完成一次全链路操作 |
| P1 | 诊断面板增强（命中规则/step 轨迹/effect） | 降低黑盒调试成本 | 任意问题可导出并复现运行轨迹 |
| P1 | 版本治理操作（批量迁移/归档/影响面预览） | 防止版本碎片化带来维护压力 | 支持批量操作且每次操作有影响范围确认 |
| P1 | 持久化策略统一到调度写入 | 进一步降低写放大与卡顿风险 | 剩余 store 统一策略，无同步高频写入 |

### 0.3 执行节奏（拍板后怎么落地）

1. 每个迭代只并行：`1 条 P0 主线 + 1 条 P1 收口`。
2. P0 执行顺序按：`依赖阻塞` > `主链路风险` > `实施成本`。
3. 每条任务必须同时提交：代码、测试、文档更新；三者缺一不算完成。
4. 每天以测试结果作为进度基线，不以“代码量”作为进度基线。

### 0.4 联合优先级（含 Visual Flow Editor Roadmap）

> 说明：在不考虑兼容前提下，先收敛主链路与质量地基，再推进可视化编辑器能力。

| 顺位 | 优先级 | 事项 | 依赖门槛 |
|---|---|---|---|
| 1 | P0 | `FlowModulesManager` 去 `any` + 拆分 composable（路由模拟/版本发布/每题组步骤） | 无 |
| 2 | P0 | 核心类型债清理：`stores/flowProfiles.ts`、`domain/flow-module/usecases/buildModuleDiffSummary.ts`、`types/flow-engine.ts` | 1（可部分并行） |
| 3 | P0 | 保存前强校验闭环：题目模板字段 × 流程模块字段 × 路由引用交叉校验，非法阻断保存/发布 | 1,2 |
| 4 | P0 | Guardrail 扩展：关键文件禁止回退 `any`、禁止绕过闸门 API | 2,3 |
| 5 | P1 | 调试可视化增强：命中规则、模块版本、当前 step、autoNext 原因、trace | 1,3 |
| 6 | P1 | Visual 阶段一（只读可视化）：`steps -> graph`、自动布局、查看弹窗 | 1,5 |
| 7 | P1 | 版本治理工具：批量迁移路由版本 + 批量归档旧版本 + 影响面预览 | 1,3 |
| 8 | P1 | 编辑上手优化：三段式引导（题目/流程/路由）+ 预置模板 | 6 |
| 9 | P1 | 持久化策略统一：`flowLibrary/settings/tag/standardFlows` 收敛到调度写入 | 1 |
| 10 | P1 | `tests/seeded-shuffle.test.mjs` 正式纳入回归并补覆盖说明 | 无（可随时） |
| 11 | P1 | Visual 阶段二（线性编辑）：元件库、Inspector、`graph -> steps` 编译、拓扑与孤点校验 | 3,4,6 |

**明确暂不排期（V2）**

1. Visual 阶段三（Branch/Loop/IntelliSense/Snippet）保持在 V2 Backlog，不进入当前执行面板。

### 0.5 执行进度快照（2026-02-12）

**P0 已落地**

1. `FlowModulesManager` 三块 composable 拆分完成：
   - `components/views/flow-modules/usePerGroupStepEditor.ts`
   - `components/views/flow-modules/useRouteSimulator.ts`
   - `components/views/flow-modules/useModuleLifecycle.ts`
2. 核心类型债收敛完成：
   - `stores/flowProfiles.ts`
   - `domain/flow-module/usecases/buildModuleDiffSummary.ts`
   - `types/flow-engine.ts`
3. 保存/发布前“题目模板 × 流程模块 × 路由引用”交叉校验已接入：
   - `domain/flow-module/usecases/validateModuleCommitCrossChecks.ts`
   - `components/views/FlowModulesManager.vue`（统一 pre-commit hook）
4. Guardrail 已扩展：
   - `tests/store-guardrails.test.mjs` 增加关键文件 `any/@ts-ignore` 回退防线
   - 增加流程提交闸门存在性断言
5. 交叉校验纯用例已补齐：
   - `tests/flow-module-commit-cross-checks.test.mjs` 覆盖模板缺字段、路由引用异常、发布无命中 warning、正常通过分支
6. 阻断项定位能力已落地：
   - `components/views/FlowModulesManager.vue` 增加“保存/发布阻断项”面板与“定位”按钮
   - `components/editor/ListeningChoiceEditor.vue` 支持 `focusPath` 并自动展开/高亮目标题组或小题
   - `components/views/flow-modules/useModuleLifecycle.ts` 支持校验失败回调（页面可接管定位交互）
7. 持久化策略统一继续完成：
   - `stores/settings.ts`、`stores/tag.ts` 已切换到 `createPersistenceScheduler`，移除 deep watch 自动落盘
8. 版本治理能力补齐：
   - `components/views/flow-modules/useModuleLifecycle.ts` 新增“批量归档旧版本”与归档前影响面预览
   - 命中启用路由时增加二次确认，避免误归档带来路由回退风险
   - `components/views/FlowModulesManager.vue` 已接入批量归档入口并展示可归档数量
9. 编辑上手优化已落地：
   - `components/views/FlowModulesManager.vue` 新增“题目编辑 / 流程编辑 / 路由编辑”三段式引导
   - 引导面板内置快捷动作（读取/写回上下文、保存/发布流程、迁移路由）
   - 增加路由预置模板（全国通用、地区+场景示例）便于新编辑快速起步
10. `seeded-shuffle` 回归说明已补齐：
   - 新增 `docs/plans/2026-02-12-seeded-shuffle-test-coverage.md`
   - 明确单测入口、全量入口、断言覆盖点与当前未覆盖范围
11. 调试可视化（Flow Center）已补齐：
   - `components/views/FlowModulesManager.vue` 新增“引擎诊断面板”（命中规则、模块版本、当前 step、autoNext 原因、trace）
   - 路由命中与步骤切换已写入 `runtimeDebug` 会话并支持 `trace` 导出/清空
   - `tests/flow-profile-routing.test.mjs`、`tests/runtime-trace.test.mjs` 已增加对应断言
12. Visual 阶段一已启动（只读可视化）：
   - 新增 `types/flow-visual.ts`，冻结只读画布核心结构（node/edge/canvas）
   - 新增 `components/views/flow-modules/useReadonlyFlowGraph.ts`，实现 `steps -> graph` 与自动纵向布局
   - `components/views/FlowModulesManager.vue` 已接入“查看流程图”弹窗与节点详情面板
   - 已补 `components/editor/flow-visual/` 目录基础组件（`BaseFlowNode` / `StepFlowNode` / `ReadonlyFlowCanvas`）
13. npm 构建链路已补齐：
   - 新增 `package.json`（`dev:h5/build:h5/preview:h5/test` 脚本）
   - 新增 `vite.config.mjs`（`@dcloudio/vite-plugin-uni`）
   - 新增 `jsconfig.json`（`/` 别名路径映射）
14. Visual 阶段二已启动（编译与校验核心）：
   - 新增 `domain/flow-visual/usecases/compileGraphToSteps.ts`，提供 `validateFlowVisualGraph` 与 `compileFlowVisualGraphToLinearSteps`
   - 已覆盖线性模式核心校验：空图、缺失端点、分支、多入口/多出口、环路、孤点/非连通
   - `FlowModulesManager` 的可视流程弹窗已展示“线性编译结果”（可编译/不可编译 + 错误摘要）
   - 新增 `tests/flow-visual-compiler.test.mjs` 作为阶段二基础回归
   - `tests/store-guardrails.test.mjs` 已纳入 `flow-visual` 关键文件防回退检查
15. Visual 阶段二 UI 骨架已落地（线性编辑最小闭环）：
   - 新增 `components/views/flow-modules/useEditableFlowGraph.ts`（可编辑 graph 状态、线性编译结果、节点增删改与上下移动）
   - 新增 `components/editor/flow-visual/StencilPanel.vue`（左侧元件库）
   - 新增 `components/editor/flow-visual/PropertyPanel.vue`（右侧属性面板，已切到 schema 驱动字段渲染）
   - `components/views/FlowModulesManager.vue` 已接入“元件库 + 画布 + 属性面板 + 编译结果”三栏可视编辑布局
   - 画布已接入 H5 拖拽追加（`dragstart/drop`）与点击添加双通道
   - 元件库拖拽到节点时支持 before/after 定点插入
   - 画布内节点已支持拖拽重排（拖到目标节点 before/after 插入）
   - 已支持 Delete/Backspace 快捷删除选中节点（输入态不拦截）
   - 已支持重排视觉反馈（drop 目标定位提示 + 节点位移动画）
   - 已支持撤销/重做（按钮 + Ctrl/Cmd 快捷键）并纳入可视编辑历史栈
   - 已支持“应用到预览 / 清除预览覆盖”，可将编译后的可视步骤链临时回写到预览运行链路
   - 已支持“应用到流程草稿”，通过 `buildListeningChoiceModuleFromLinearSteps` 回写 `listeningChoiceDraft` 并复用模块校验提醒
   - 应用到流程草稿前已接入差异摘要确认（`buildModuleDiffSummary` / `formatModuleDiffSummary`）
   - 已补“线性约束面板”（单入口/单出口/无分支/无环路/全连通）并与当前图实时联动
   - 编译错误支持“点击定位节点”（可定位到 `graph.nodes(...)` 级别问题）
   - 已支持可视编辑快捷导航与复制（↑/↓ 切换节点，Ctrl/Cmd+D 复制）
16. 保存/发布闸门已纳入可视流程闭环：
   - 当可视流程存在未应用变更时，保存/发布会被阻断（要求先“应用到流程草稿”或“重置图”）
   - 当可视流程不可编译时，保存/发布会阻断并带入节点级错误（`flowVisual.graph.nodes(...)`）
   - 阻断项支持一键定位到可视流程弹窗与目标节点

**当前回归状态**

1. 上次全量回归：`node --test` 为 `115 passed / 0 failed`
2. 本次新增：`tests/flow-visual-compiler.test.mjs`（阶段二编译器回归入口）
3. 本次局部回归：`node --test tests/flow-profile-routing.test.mjs tests/store-guardrails.test.mjs tests/flow-visual-compiler.test.mjs` 为 `50 passed / 0 failed`
4. 新增映射回归：`node --test tests/flow-visual-module-mapper.test.mjs`（`4 passed / 0 failed`）
5. 本次阶段二局部总回归：`node --test tests/flow-visual-module-mapper.test.mjs tests/flow-profile-routing.test.mjs tests/store-guardrails.test.mjs tests/flow-visual-compiler.test.mjs`（`54 passed / 0 failed`）
6. 本次交互增强回归：`node --test tests/flow-visual-history.test.mjs tests/flow-visual-module-mapper.test.mjs tests/flow-profile-routing.test.mjs tests/store-guardrails.test.mjs tests/flow-visual-compiler.test.mjs`（`56 passed / 0 failed`）

**下一拍建议（仍按 P0 优先）**

1. 收口 `#6`：把只读图节点视觉语义（媒体/控制/交互）进一步分层，并补“查看弹窗入口”一致性。
2. 推进 `#11` Visual 阶段二 UI：元件库（Stencil）+ 属性面板（Inspector）+ 拖拽入画布。
3. 将 `compileFlowVisualGraphToLinearSteps` 挂到保存闸门，形成“可视编辑 -> 编译 -> 保存/发布阻断”闭环。

### 0.6 1-11 状态总览（2026-02-12）

| 编号 | 事项 | 状态 | 说明 |
|---|---|---|---|
| 1 | `FlowModulesManager` 去 `any` + composable 拆分 | ✅ 完成 | 三块 composable 已落地（路由模拟/版本生命周期/每题组步骤） |
| 2 | 核心类型债清理（`flowProfiles`/`buildModuleDiffSummary`/`flow-engine`） | ✅ 完成 | 指定核心文件已去 `any/@ts-ignore` 并通过回归 |
| 3 | 保存前强校验闭环（模板×流程×路由） | ✅ 完成 | 交叉校验 usecase + 保存/发布阻断 + 字段定位面板已接入 |
| 4 | Guardrail 扩展（禁回退 any/绕闸门） | ✅ 完成 | guardrail 测试已覆盖关键文件与提交闸门链路 |
| 5 | 调试可视化增强（命中规则/step/autoNext/trace） | ✅ 完成 | Flow Center 已接入专用诊断面板，支持 trace 导出/清空与关键状态可视化 |
| 6 | Visual 阶段一（只读可视化） | 🟡 部分完成 | 已落地 `types/flow-visual.ts` + `steps -> graph` 只读弹窗与节点详情，节点体系化组件待补 |
| 7 | 版本治理工具（批量迁移+批量归档+影响面） | ✅ 完成 | 已支持“迁移到当前版本 + 批量归档旧版本 + 归档前影响面预览 + 启用路由二次确认” |
| 8 | 编辑上手优化（三段式引导+模板） | ✅ 完成 | 引导面板、快捷动作、路由预置模板已接入流程中心 |
| 9 | 持久化策略统一（`flowLibrary/settings/tag/standardFlows`） | ✅ 完成 | `flowLibrary/standardFlows/settings/tag` 已统一到调度写入策略 |
| 10 | `seeded-shuffle` 纳入回归并补覆盖说明 | ✅ 完成 | 已补覆盖说明文档并明确回归入口：`docs/plans/2026-02-12-seeded-shuffle-test-coverage.md` |
| 11 | Visual 阶段二（线性编辑） | 🟡 已启动 | 编译与拓扑校验核心、schema 驱动属性面板、拖拽插入/重排、撤销重做、线性约束面板、错误定位与快捷键已落地；分支/循环能力留在 V2 |

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
