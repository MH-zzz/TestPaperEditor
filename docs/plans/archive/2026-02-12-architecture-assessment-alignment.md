# 2026-02-12 架构评估对齐文档（当前代码 + 你的输入 + Gemini 结论）

## 1. 目的
把三件事放到同一张图里，方便后续决策：

1. 我之前提到的“不足”，到底基于哪些代码事实。
2. 你提供的 Gemini-3-Pro 结论（好处 + 不足）在当前仓库中的对应关系。
3. 接下来在 Demo 阶段最值得优先做的收敛动作。

## 2. 评估口径
- 口径：只看当前本地 Demo 架构，不涉及网络、多人协作和后端。
- 证据来源 A：仓库代码（以下都带文件行号）。
- 证据来源 B：你贴出的 Gemini-3-Pro 长评文本。

## 3. 我之前说“不足”的依据是什么

| 我给出的不足 | 代码依据 | 结论说明 |
|---|---|---|
| 状态源不够单一 | `components/views/EditorWorkspace.vue:478`、`components/views/EditorWorkspace.vue:682`、`components/layout/SideNavigation.vue:163`、`pages/index/index.vue:56` | 同一份题目数据被多个入口读写（编辑器、侧边栏、题型切换），容易出现时序和责任边界不清。 |
| 事件总线耦合偏重 | `components/views/QuestionLibrary.vue:143`、`pages/index/index.vue:83`、`components/layout/SideNavigation.vue:172`、`components/views/EditorWorkspace.vue:642` | 关键流程依赖 `uni.$emit/$on` 串联，链路隐式，排障时要反向追事件。 |
| 编辑主链路有重复实现 | `components/views/EditorWorkspace.vue:460`、`pages/editor/index.vue:193`、`components/views/EditorWorkspace.vue:490`、`pages/editor/index.vue:221` | `EditorWorkspace` 和 `pages/editor` 都实现了保存/迁移/初始化，且细节已分叉（recent 列表上限 50 vs 10）。 |
| 自动保存/手动保存/重置语义混合 | `components/views/EditorWorkspace.vue:682`、`components/views/EditorWorkspace.vue:480`、`components/views/EditorWorkspace.vue:501`、`components/views/EditorWorkspace.vue:635` | 深度 watch 会自动落盘，手动保存才进题库；重置基于初始快照，不一定等于“回到最近一次手动保存”。 |
| 初始化迁移逻辑重复 | `components/views/EditorWorkspace.vue:608`、`components/views/EditorWorkspace.vue:645`、`pages/editor/index.vue:327` | 旧数据迁移与 flow resolve 逻辑在多个位置复制，未来改动容易漏改。 |
| 题型能力矩阵不一致 | `components/views/EditorWorkspace.vue:273`、`components/views/EditorWorkspace.vue:283`、`components/editor/QuestionEditor.vue:49` | 创建入口基本只开放“听后选择”，但编辑器分发仍支持多个题型，容易让“当前产品边界”变模糊。 |
| 题目保存缺少统一校验闸门 | `components/views/EditorWorkspace.vue:460`、`components/views/FlowModulesManager.vue:1591`、`components/views/FlowModulesManager.vue:1687` | 流程模块有校验，但题目保存链路没有统一 `validateQuestionBeforeSave`。 |
| 当前是“单题”中心，不是“试卷”中心 | `types/question.ts:475`、`components/views/QuestionLibrary.vue:84` | 核心模型和持久化都是 `Question` 粒度，尚未形成 `paper/section/question` 聚合模型。 |

## 4. Gemini 结论在当前代码里的映射

### 4.1 Gemini 说的好处（与现状对齐）

| Gemini 好处 | 当前代码映射 | 判断 |
|---|---|---|
| 关注点分离（内容 vs 流程 vs 渲染） | 内容编辑在 `components/editor/*`，流程解析在 `engine/flow/listening-choice/binding.ts:136`，渲染在 `components/renderer/QuestionRenderer.vue:4` | 成立。方向正确。 |
| 策略路由（地域/场景/年级） | `stores/flowProfiles.ts:149` 进行规则匹配，`engine/flow/listening-choice/binding.ts:95` 进行路由命中 | 成立。已具备策略模式核心。 |
| 所见即所得与多端一致性基础 | 编辑区预览走 `PhonePreviewPanel -> QuestionRenderer`（`components/views/EditorWorkspace.vue:87`、`components/layout/PhonePreviewPanel.vue:20`） | 成立。渲染复用是目前最强基础能力。 |

### 4.2 Gemini 说的不足（与现状对齐）

| Gemini 不足 | 当前现状 | 对齐判断 |
|---|---|---|
| 黑盒调试难 | 已有雏形：`LearningWorkspace` 轨迹面板（`components/views/LearningWorkspace.vue:106`），路由诊断（`components/views/FlowModulesManager.vue:949`） | 部分成立。不是“完全黑盒”，但编辑主链路缺统一调试面板。 |
| 隐性契约脆弱 | 模块有校验（`components/views/FlowModulesManager.vue:1591`），但题目保存链路缺统一 schema 校验（`components/views/EditorWorkspace.vue:460`） | 成立。属于“部分防护”。 |
| 版本碎片化风险 | 已有状态机和归档约束（`stores/flowModules.ts:31`、`stores/flowModules.ts:166`） | 部分成立。机制有了，但还缺全链路生命周期治理。 |
| 上手门槛高 | 流程源、路由规则、模块版本、fallback 链路都存在（`templates/index.ts:85`、`engine/flow/listening-choice/binding.ts:71`） | 成立。抽象能力要求较高。 |
| 简单场景可能过度工程化 | `listening_choice` 新建即进入 flow resolve（`templates/index.ts:96`、`engine/flow/listening-choice/binding.ts:173`） | 有风险但可接受，取决于后续题型复杂度目标。 |

## 5. 我们两种评估的关系

结论不是冲突，而是层次不同：

- Gemini 偏“架构层风险”：调试、版本、认知成本。
- 我偏“实现层收敛”：状态源、重复链路、保存语义、校验落点。

两者合并后，结论是：

1. 架构方向正确（尤其是流程引擎 + 路由 + 渲染复用）。
2. 当前主要问题不是“方向错”，而是“工程收敛度不足”。

## 6. 面向 Demo 的后续优先级（建议）

### P0（优先，1-2 天）

1. 抽一层统一 `currentQuestion` 服务，收敛加载/迁移/resolve/save，复用到 `EditorWorkspace`、`SideNavigation`、`pages/editor`。
2. 在题目保存链路增加 `validateQuestionBeforeSave`（至少覆盖必填、空音频、无题组/无小题、答案合法性）。
3. 合并或标记单一路径：明确 `pages/editor` 是遗留页还是主入口，避免两套逻辑继续分叉。

### P1（次优，3-5 天）

1. 把 `LearningWorkspace` 的轨迹能力下沉为可复用调试抽屉，编辑页可一键查看“命中规则/模块版本/步骤轨迹”。
2. 增加流程版本治理约定：发布、归档、升级窗口、兼容期限（先文档化，再工具化）。

### P2（按需）

1. 若目标升级为“试卷编辑器”，补 `Paper -> Section -> QuestionRef` 模型；否则维持“题目编辑器”定位并在文档中明确边界。

---

如果后续要落地，我建议先做 P0 的第 1 项（统一 `currentQuestion` 服务），这是把后续所有改动风险降到最低的基础动作。

## 7. VNext 目标态（不考虑兼容，只追求最新/最可持续/最可扩展）

### 7.1 顶层原则（强约束）

1. 单一事实源：题目编辑态只存在于一个 Domain Store，不允许页面自行维护副本。
2. 单一执行入口：所有预览/演练/考试都必须通过 `FlowEngine` runtime，禁止页面硬编码步骤推进。
3. 单一保存闸门：所有“保存题目/发布流程/启用路由”都必须经过统一 schema + 业务校验。
4. 单一职责边界：题目编辑器只改内容，流程编辑器只改模块，路由编辑器只改绑定策略。
5. 可解释性优先：任何时刻都能回答“命中哪条规则、用哪个模块版本、为何进入该步骤”。

### 7.2 目标上手体验（量化指标）

| 角色 | 目标上手时间 | 必须独立完成的动作 | 通过标准 |
|---|---|---|---|
| 题目编辑员 | 30 分钟 | 新建题、填内容、预览、保存 | 不看代码可完成 1 道合格题 |
| 流程编辑员 | 60 分钟 | 克隆模块、改步骤、发布新版本 | 发布后演练轨迹符合预期 |
| 路由配置员 | 45 分钟 | 新建规则、模拟命中、启停规则 | 不产生冲突/死规则 |
| 新开发同学 | 半天 | 新增一步骤插件 + 校验 + 测试 | 通过 CI 且不改业务页面分支 |

### 7.3 编辑人员工作流（产品层）

#### A. 题目编辑（Content Authoring）

1. 入口固定为 `EditorWorkspace`，不再保留并行编辑入口。
2. 编辑页只包含内容字段，不暴露底层 flow steps JSON。
3. 保存前强制通过 `validateQuestionBeforeSave`。
4. 失败时给“可操作”错误，不给抽象技术报错。
5. 保存后自动生成“执行快照”（route/profile/module/version），便于回溯。

#### B. 流程编辑（Flow Module Authoring）

1. 强制草稿-发布两态，不允许直接覆盖已发布版本。
2. 编辑器提供“步骤模板库 + 参数来源选择器”（来自题目字段、常量、上下文）。
3. 发布前必须通过模块校验 + 影响面分析 + 差异预览。
4. 发布后自动生成变更摘要（谁改了什么步骤、参数怎么变了）。

#### C. 路由编辑（Profile Routing）

1. 路由是独立页面独立职责，不混在题目编辑页。
2. 每条规则必须有“命中条件 + 优先级 + 目标模块版本 + 备注 + 启用状态”。
3. 提交前必须跑“冲突规则/死规则/覆盖率”诊断。
4. 必须有模拟器：输入地区/场景/年级，实时展示 TopN 候选与得分明细。

### 7.4 代码框架优化蓝图（工程层）

#### A. 分层重构（建议目录）

1. `domain/`
2. `domain/question/`：题目模型、题目校验、题目用例（create/update/save）
3. `domain/flow-module/`：模块模型、校验、发布状态机
4. `domain/flow-profile/`：路由模型、匹配与诊断
5. `engine/flow/`：compile/runtime/effects（纯函数）
6. `infra/repository/`：本地存储适配（未来可换服务端）
7. `app/usecases/`：编排用例（保存题目、发布流程、切换路由）
8. `ui/`：Vue 组件，只发命令不写业务决策

#### B. 状态管理升级

1. 用一个强类型 store 承载编辑态，移除 `uni.$emit/$on` 作为主链路。
2. `watch deep + 直接写 storage` 改为显式命令：`dispatch(saveDraft)`。
3. 引入“脏状态”与“已保存快照”概念，重置语义改为“回到最近保存版本”。

#### C. 插件化扩展机制

1. 步骤类型实现统一插件协议：`kind + schema + renderer + runtimeReducer + validator`。
2. 新步骤扩展不允许改 `QuestionRenderer` 主分支，只允许注册插件。
3. 引擎 effect 统一抽象（audio/timer/navigation），页面只消费 effect 结果。

#### D. 校验体系（统一闸门）

1. 题目校验：结构完整性 + 业务约束（题组/小题/答案/音频）。
2. 模块校验：步骤合法顺序 + 参数引用完整性 + 自动推进死循环检测。
3. 路由校验：冲突、死规则、优先级歧义、未覆盖场景。
4. 保存行为统一返回：`{ ok, errors, warnings, diagnostics }`。

#### E. 可观测性与调试

1. 编辑页内置调试抽屉：当前 route/profile/module/version/step。
2. 每次运行保留 trace timeline（触发事件、状态迁移、effect 执行）。
3. 支持导出诊断包（题目快照 + 模块 + 路由 + trace）用于复现。

### 7.5 直接废弃项（不考虑兼容）

1. 废弃 `pages/editor/index.vue` 的并行编辑主链路，仅保留单入口。
2. 废弃事件总线驱动核心流程（`uni.$emit/$on`），改为 store action。
3. 废弃“多个地方做迁移/normalize”，统一到 `domain/question` 用例层。
4. 废弃“保存语义混合”（自动写 current + 手动入 recent），改为清晰 Draft/Save/Publish 流程。

### 7.6 迭代优先级（只保留高价值动作）

#### Phase 1（1 周）

1. 建立单一编辑入口 + 单一 store + 单一保存用例。
2. 把题目保存校验接入硬闸门。
3. 移除主链路事件总线依赖。

#### Phase 2（1-2 周）

1. 落地步骤插件协议（至少覆盖 listening_choice 全步骤）。
2. 完成调试抽屉与 trace timeline。
3. 完成路由模拟器的得分明细与冲突修复建议。

#### Phase 3（2 周）

1. 完成 `domain/app/infra/ui` 分层迁移。
2. 完成流程发布摘要与版本差异视图。
3. 补齐核心测试矩阵（question/module/profile/runtime）。

### 7.7 完成判据（Definition of Done）

1. 新人按文档可独立完成“建题-改流程-配路由-演练验证”全链路，无需读源码。
2. 任一线上行为都可追溯到唯一 `profile + module@version + trace`。
3. 新增一个步骤类型时，不需要改动现有页面分支，只需新增插件并注册。
4. 题目、流程、路由任一保存失败时，错误都能定位到字段级并给出修复建议。

## 8. 执行清单入口

- 详细执行计划（按周 + 按文件 + 按验收点）见：`docs/plans/2026-02-12-vnext-editor-flow-routing-execution-plan.md`

## 9. 2026-02-12 执行后状态快照（Week 5 完成）

### 9.1 已落地能力（与早期风险对照）

1. 单一编辑入口与单一 Draft Store 已落地，主链路不再依赖事件总线。
2. 题目保存已接统一校验闸门，字段级错误可阻断保存。
3. 预览/演练已走统一 runtime 用例，支持统一 trace 与诊断导出。
4. 流程中心已支持发布差异摘要、发布日志与状态机约束。
5. 路由中心已支持评分拆解、冲突/死规则/弱覆盖诊断、提交闸门。
6. 步骤插件协议已落地，听后选择步骤完成插件注册。
7. `QuestionRenderer` 已改为配置路由容器；听后选择运行分支已基于插件 render behavior + runtime reducer。

### 9.2 仍需持续优化的点（不考虑兼容）

1. 插件 schema 仍以运行时校验为主，可继续强化为更严格的类型约束与自动化校验。
2. 路由诊断目前偏规则级，下一步可补“场景覆盖基线集”自动回归。
3. 调试面板已可追踪单次运行，后续可增加“多次运行对比”能力。
4. 新题型接入流程仍需手工注册渲染路由，可进一步统一成题型级插件注册。

### 9.3 下一阶段建议（Week 6 对齐）

1. 完成最终清理验收（旧链路零残留、全量测试稳定）。
2. 交付最终验收 checklist，支持非开发角色按文档走通全链路。
3. 将“题目编辑/流程编辑/路由编辑”培训路径固化为角色化上手手册。
