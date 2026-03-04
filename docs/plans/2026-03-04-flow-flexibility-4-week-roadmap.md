# 流程灵活性 4 周落地路线图

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 4 周内把“步骤可自由调整/插入/删除/重组”的能力从“可用”提升到“稳定、可校验、可调试、可治理”。

**Architecture:** 延续现有“流程模块 -> 编译 -> 插件运行时 -> 渲染器”主线，不推翻重构。先强化线性流程的映射一致性与约束能力，再补齐组装效率能力，最后推进分支/循环 MVP。

**Tech Stack:** Vue3 + uni-app, TypeScript, Node built-in test runner, current flow-engine + flow-visual modules.

---

## 执行进度（2026-03-04）

### 已完成
1. Week 1 / Task 1：步骤能力矩阵已接入插件 schema（`configFields`），并驱动每题组配置 UI 显隐；不支持字段写入会被拦截。
2. Week 1 / Task 2：新增步骤配置索引映射工具函数，`usePerGroupStepEditor` 改为仅依赖 `stepConfigRefs` 映射（不再使用偏移推算），覆盖插入/删除/重排后的定位场景。
3. Week 1 / Task 3（关键路径部分）：修复流程编辑关键路径 `any` 守卫冲突，统一为无 `any` 写法，并同步修正对应预览测试断言。
4. Week 2 / Task 4（第一版）：在线性编译阶段加入步骤语义 lint（核心步骤缺失、关键顺序异常、上下文异常/组绑定提醒），并在可视流程面板实时展示 warnings；新增插入前预检查与即时 toast 拦截。

### 验证结果
1. `node --test tests/flow-step-plugin-registry.test.mjs tests/flow-modules.test.mjs`：通过。
2. `npm run test`：177/177 全通过。

---

## 前置基线（本周第 0 天）

### 基线目标
统一团队对“当前状态”的认知，避免后续验收口径不一致。

### 我会做的事
1. 固化当前流程能力矩阵（按题型、按步骤）。
2. 固化当前已知缺口（例如 guardrail 失败项）。
3. 记录当前回归结果作为 Week 1 对比基线。

### 我执行测试
1. `npm run test`（记录 pass/fail 数与失败用例）。
2. 手工走查：听后选择、听后回答各 1 套题，记录关键步骤切换行为。

### 交付物
1. `docs/plans/` 下新增基线记录附录。
2. 测试结果快照（命令 + 关键输出）。

---

## Week 1：先把“可改”变成“改得准”

### Task 1：步骤能力矩阵（Step Capability Matrix）

**目标**
让配置 UI 完全由步骤能力声明驱动，避免“某步骤显示了无效开关”或“有能力却没入口”。

**实现要点**
1. 在插件层增加能力声明（是否支持 `showGroupPrompt`、`screenStrategy`、`questionScope` 等）。
2. `FlowModulesManager` / 属性面板按能力渲染控件，不再硬编码步骤分支。
3. 对不支持的属性写入进行拦截（避免脏配置落库）。

**涉及文件（核心）**
1. `engine/flow/plugins/types.ts`
2. `engine/flow/plugins/listening-choice/*.ts`
3. `components/views/FlowModulesManager.vue`
4. `components/views/flow-modules/usePerGroupStepEditor.ts`

**我执行测试**
1. 自动化：新增/修改 `tests/flow-step-plugin-registry.test.mjs`，验证能力声明完整性。
2. 自动化：新增 UI 配置可见性断言（静态字符串 + 逻辑函数断言）。
3. 手工：逐步点击 `intro/playAudio/countdown/recordGuide/answerChoice`，确认控件随步骤切换且无“假开关”。

**验收标准**
1. 控件显示与能力矩阵一致。
2. 无能力的字段不会被写入流程模块。

---

### Task 2：编译步骤与配置步骤映射统一（防错配）

**目标**
解决“点了 A 步骤却在改 B 配置”的错配问题，覆盖重复播放、重播间隔、按小题循环等展开场景。

**实现要点**
1. 保持 `resolveListeningChoiceStandardStepConfigRefs` 为唯一映射入口。
2. 预览虚拟步索引、流程图索引、配置索引三者统一到同一映射层。
3. 重排/插入/删除都基于映射结果回写，不做裸索引运算。

**涉及文件（核心）**
1. `flows/listeningChoiceFlowModules.ts`
2. `components/views/flow-modules/usePerGroupStepEditor.ts`
3. `components/views/FlowModulesManager.vue`

**我执行测试**
1. 自动化：扩展 `tests/flow-modules.test.mjs`（hear-answer 多小题 + content playCount + gap）。
2. 自动化：扩展 `tests/preview-mode.test.mjs`（虚拟步索引与逻辑步一致性）。
3. 手工：在“录音说明/开始答题/提示音”反复切换并改开关，确认改动命中当前节点。

**验收标准**
1. 三类索引一致。
2. 展开场景无配置错配复现。

---

### Task 3：清理流程编辑关键路径中的 `any`

**目标**
修复当前 guardrail 失败，让流程编辑关键文件恢复类型约束可信度。

**实现要点**
1. 优先处理 `FlowModulesManager.vue` 关键编辑路径类型。
2. 给关键中间结构补显式类型（step patch、config ref、preview state）。
3. 禁止以 `as any` 逃避边界校验。

**涉及文件（核心）**
1. `components/views/FlowModulesManager.vue`
2. `components/views/flow-modules/usePerGroupStepEditor.ts`
3. `types/flow-engine.ts`（若需要补类型）

**我执行测试**
1. 自动化：`node --test tests/store-guardrails.test.mjs`。
2. 自动化：`npm run test`（观察是否仅剩既有非本任务问题）。
3. 手工：流程页执行一次完整“新增步骤 -> 编辑 -> 发布预检”。

**验收标准**
1. guardrails 对应失败项清零。
2. 不引入新的回归失败。

---

## Week 2：把“可自由编辑”变成“可防呆编辑”

### Task 4：画布实时 Lint（Canvas IntelliSense）

**目标**
在编辑时即时阻断不合理组合，而不是等到保存/发布才报错。

**实现要点**
1. 增加流程图 lint usecase（前置依赖、必填字段、上下文合法性）。
2. 节点级展示错误/警告（卡片红框、提示文案、跳转定位）。
3. 插入操作前预检查，不合法则拒绝并提示。

**涉及文件（核心）**
1. `domain/flow-visual/usecases/compileGraphToSteps.ts`
2. `components/views/flow-modules/useEditableFlowGraph.ts`
3. `components/editor/flow-visual/PropertyPanel.vue`（若有）

**我执行测试**
1. 自动化：新增 `tests/flow-visual-compiler.test.mjs` 规则用例（非法插入、缺前置）。
2. 自动化：新增 lint 结果结构测试（error/warn code 稳定）。
3. 手工：故意构造错误链路（如无播放直接重播间隔），验证实时拦截。

**验收标准**
1. 非法操作在编辑期即被发现。
2. 错误提示可定位、可理解、可修复。

---

### Task 5：删除/重排安全策略与一键修复建议

**目标**
让“随便删/随便挪”仍可收敛到合法流程，而不是把用户逼回手工修图。

**实现要点**
1. 删除关键步骤时给出修复建议（补前置、补收尾、替换方案）。
2. 重排后自动做最小修正（仅修必要字段，不改业务意图）。
3. 保留撤销/重做一致性。

**涉及文件（核心）**
1. `components/views/flow-modules/useEditableFlowGraph.ts`
2. `domain/flow-visual/usecases/buildListeningChoiceModuleFromLinearSteps.ts`
3. `components/views/FlowModulesManager.vue`

**我执行测试**
1. 自动化：扩展 `tests/flow-visual-history.test.mjs`（删改 + undo/redo）。
2. 自动化：扩展 `tests/flow-visual-module-mapper.test.mjs`（修复后映射稳定）。
3. 手工：执行“连续删除 3 步 + 重排 + 一键修复 + 撤销重做”。

**验收标准**
1. 高风险编辑有可用修复路径。
2. 撤销重做不丢状态、不写坏配置。

---

### Task 6：发布门禁 V2（编辑校验与发布校验统一）

**目标**
把“能编辑”与“可发布”分层，确保上线流程一定满足治理规则。

**实现要点**
1. 合并编辑期 Lint 与提交期 cross-check 的规则来源。
2. 提交前输出影响面摘要（命中地区、命中模块、历史兼容风险）。
3. 对高风险变更强制二次确认。

**涉及文件（核心）**
1. `domain/flow-module/usecases/validateModuleCommitCrossChecks.ts`
2. `components/views/flow-modules/useModuleLifecycle.ts`
3. `components/views/FlowModulesManager.vue`

**我执行测试**
1. 自动化：`tests/flow-module-commit-cross-checks.test.mjs` 扩充“阻断/放行”双分支。
2. 自动化：`tests/flow-module-diff-summary.test.mjs` 断言影响摘要字段。
3. 手工：发布前模拟 3 类场景（合法、警告、阻断）逐一验证。

**验收标准**
1. 高风险变更无法绕过门禁直接发布。
2. 影响面提示准确且可复核。

---

## Week 3：把“会编辑”提升为“高效组装”

### Task 7：Snippet / Macro 复合节点 MVP

**目标**
减少细粒度节点重复拼装成本，让教研可快速复用标准流程片段。

**实现要点**
1. 支持框选步骤保存为片段（带参数占位）。
2. 支持片段拖入画布并自动完成基础绑定（group/question scope）。
3. 片段版本化（避免旧片段污染新规则）。

**涉及文件（核心）**
1. `components/views/flow-modules/useEditableFlowGraph.ts`
2. `stores/`（新增 snippet store）
3. `components/editor/flow-visual/StencilPanel.vue`

**我执行测试**
1. 自动化：新增 `tests/flow-visual-history.test.mjs` 片段保存/插入回放测试。
2. 自动化：新增片段序列化/反序列化测试（稳定 hash）。
3. 手工：把“听后回答录音环路”存片段并在新流程线复用。

**验收标准**
1. 片段可复用且参数绑定正确。
2. 片段插入后可继续编辑且不破坏现有图结构。

---

### Task 8：局部预览（Play from here）

**目标**
让长流程调试不必每次从第 1 步跑到目标步骤。

**实现要点**
1. 节点右键菜单增加“从此步预览”。
2. 预览运行时注入最小上下文（题组、题号、计时状态）。
3. 在 UI 显示“局部预览模式”标识，避免误解为真实全流程。

**涉及文件（核心）**
1. `components/views/FlowModulesManager.vue`
2. `components/layout/PhonePreviewPanel.vue`
3. `engine/flow/runtime.ts` / `engine/flow/listening-choice/runtime.ts`

**我执行测试**
1. 自动化：扩展 `tests/preview-mode.test.mjs`（局部起播索引、上下文注入）。
2. 自动化：扩展 `tests/runtime-unified-entry.test.mjs`（局部 entry 正确）。
3. 手工：从 3 个中后段节点启动预览，确认行为一致。

**验收标准**
1. 局部预览可稳定复现目标步骤。
2. 不影响原有全流程预览。

---

### Task 9：批量参数编辑（Multi-Select Patch）

**目标**
支持一组步骤批量改属性（如统一开关、统一倒计时标签），提升运营效率。

**实现要点**
1. 多选节点后显示“批量属性面板”。
2. 仅显示交集属性（所有选中节点都支持的字段）。
3. 批量 patch 走同一校验链路，支持撤销。

**涉及文件（核心）**
1. `components/views/flow-modules/useEditableFlowGraph.ts`
2. `components/editor/flow-visual/PropertyPanel.vue`
3. `domain/flow-visual/usecases/compileGraphToSteps.ts`

**我执行测试**
1. 自动化：新增批量 patch 用例（交集属性、生效范围、撤销）。
2. 自动化：校验不支持字段不会写入。
3. 手工：多选 playAudio + answerChoice，验证仅公共字段可改。

**验收标准**
1. 批量改动准确可回滚。
2. 无越界写字段问题。

---

## Week 4：高级灵活性 MVP（在稳定基础上前进）

### Task 10：BranchNode MVP（受控分支）

**目标**
支持最小可用条件分支，不再局限“一条线到底”。

**实现要点**
1. 先支持 1 类业务条件（例如评分阈值/是否超时）。
2. 编译层生成可执行分支步骤，运行时按条件跳转。
3. 可视化层清晰展示分支去向与默认路径。

**涉及文件（核心）**
1. `domain/flow-visual/usecases/compileGraphToSteps.ts`
2. `engine/flow/runtime.ts`
3. `components/views/flow-modules/useEditableFlowGraph.ts`

**我执行测试**
1. 自动化：扩展 `tests/flow-visual-compiler.test.mjs`（分支合法性）。
2. 自动化：扩展 `tests/runtime-unified-entry.test.mjs`（条件跳转）。
3. 手工：构造“低分补救分支”流程并完整演练。

**验收标准**
1. 分支路径可视、可测、可解释。
2. 无死路/无默认路径时阻断提交。

---

### Task 11：LoopNode MVP（受限循环）

**目标**
支持“允许重试 N 次”等业务循环，避免手工复制节点。

**实现要点**
1. 增加循环节点与 `maxIterations` 限制。
2. 运行时记录循环计数，防止无限循环。
3. 提供循环退出路径必填校验。

**涉及文件（核心）**
1. `domain/flow-visual/usecases/compileGraphToSteps.ts`
2. `engine/flow/runtime.ts`
3. `engine/flow/plugins/types.ts`

**我执行测试**
1. 自动化：新增循环计数与上限测试。
2. 自动化：非法循环（无出口）阻断测试。
3. 手工：录音重试场景演练（重试 1 次、2 次、超上限）。

**验收标准**
1. 循环行为可控且可解释。
2. 无无限循环风险。

---

### Task 12：版本迁移与兼容性闭环

**目标**
确保新能力上线后，老流程/老 JSON 仍可安全读取、迁移、回滚。

**实现要点**
1. 增加流程版本迁移器（V1 -> V2 增量迁移）。
2. 导出包中写入版本与能力标识。
3. 迁移报告可追踪（改了哪些字段、为何改）。

**涉及文件（核心）**
1. `infra/repository/*`（流程读写入口）
2. `flows/listeningChoiceFlowModules.ts`
3. `docs/governance/changes/*`

**我执行测试**
1. 自动化：fixture 回放测试（旧包导入 -> 迁移 -> 可运行）。
2. 自动化：导出再导入一致性测试。
3. 手工：挑选 3 个历史流程线做真实迁移演练。

**验收标准**
1. 旧数据可用，迁移可追踪。
2. 导入导出往返不丢语义。

---

## 每周节奏与验收机制

1. 周一：冻结本周任务和验收标准。
2. 周三：中期演示（功能 + 测试报告）。
3. 周五：回归 + 风险复盘 + 文档更新。
4. 每项任务完成必须同时满足：
   1. 自动化测试通过。
   2. 我执行 1 轮手工探索测试并记录结果。
   3. 变更说明落到 `docs/governance/changes/`。

---

## 风险与应对

1. 风险：高级能力（分支/循环）拖慢节奏。
   应对：Week 4 只做 MVP，严格限功能范围。
2. 风险：灵活性提升导致门禁复杂度上升。
   应对：规则来源统一，编辑期与提交期共享同一 rule set。
3. 风险：历史数据迁移引入灰度问题。
   应对：先跑 fixture 批量迁移，再上真实数据演练。

---

## 最终交付口径（4 周后）

1. 线性流程：可自由改且具备实时防错、发布门禁、局部调试。
2. 组装效率：片段复用 + 批量编辑可用。
3. 高级能力：分支/循环 MVP 跑通且有迁移闭环。
4. 测试与文档：每项能力都有自动化与手工验证记录。
