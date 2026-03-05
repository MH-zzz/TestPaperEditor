# TestPaperEditor 流程系统详解与迁移文档（超详细版）

更新时间：2026-03-05  
适用对象：要把 `TestPaperEditor` 的“流程能力”迁移到另一个项目，且目标项目当前流程能力明显偏弱（你说的“差距太大”场景）。

---

## 0. 先说结论：为什么你会感觉“差距很大”

`TestPaperEditor` 的流程不是“只保存一个步骤数组”，而是 4 层协同：

1. 流程线定义（`flowModules`）
2. 路由规则（`flowProfiles`，按地区/场景/年级命中）
3. 题目模板（`contentTemplates`，决定编译所需字段是否齐全）
4. 运行时入口（`runQuestionFlow`，统一处理编辑预览/学习演练/本地学习）

对方项目如果只有“单流程编辑器 + 单结果预览”，一般会缺 2/3/4 中的一部分，所以会出现：

- 只能看到单流程（没有流程线与版本概念）
- 听后回答无法正确命中（缺 `questionVariant=hear_answer` 或流程线 ID 约定不一致）
- 地区绑定不可用（没有 profile 路由层）
- 可视图上能拖拽，但无法回写为可发布模块（缺编译校验 + 交叉校验）

---

## 1. 范围与术语

本文只聚焦“流程系统”，不展开题库/标签完整实现。

关键术语：

- `流程线`：同一题型的一条可独立维护的流程（例如“听后选择-广东”）。
- `流程版本`：同一流程线下的版本号（`version`）。
- `标准流程`：默认流程线，ID 固定。
- `路由规则`：根据 `region/scene/grade` 命中流程线版本。
- `可视流程`：流程图编辑器中的节点图（线性/分支MVP/循环MVP编译能力）。
- `宏节点`：引用流程片段，编译阶段展开为线性步骤。

---

## 2. 总体架构（从页面到运行时）

### 2.1 模块入口

- 模块切换：`stores/appShell.ts`
- 主壳路由：`pages/index/index.vue`
- 流程页入口：`components/views/FlowModulesManager.vue`

### 2.2 流程核心数据源

- 流程模块库：`stores/flowModules.ts`（key: `editor_flow_modules_v2`）
- 路由规则：`stores/flowProfiles.ts`（key: `editor_flow_profiles_v1`）
- 题型模板：`stores/contentTemplates.ts`（key: `editor_content_templates_v1`）
- 片段库：`stores/flowSnippets.ts`（key: `editor_flow_snippets_v1`）
- 地区绑定模板：`infra/repository/flowRegionBindingTemplateRepository.ts`（key: `flow_region_binding_templates_v1`）
- 发布日志：`infra/repository/flowModuleRepository.ts`（key: `flow_module_publish_logs_v1`）

### 2.3 编译与运行核心

- 标准流程编译：`engine/flow/listening-choice/compiler.ts`
- 流程绑定与路由命中：`engine/flow/listening-choice/binding.ts`
- 统一运行入口：`app/usecases/runQuestionFlow.ts`
- 运行时状态机：`engine/flow/runtime.ts`

---

## 3. 页面能力拆解（FlowModulesManager）

## 3.1 Home 页

提供两张可进入的流程卡：

- `听后选择`
- `听后回答`

流程线数量来自 `flowModules.listListeningChoice()` 后按 ID 分组计数，不是固定写死。

## 3.2 Detail 页（三栏）

左栏：题型模板数据

- 组件：`ListeningChoiceEditor`
- 数据源：`contentTemplates`
- 可“从题库读样题”回灌模板。

中栏：流程规则编辑

- 线性规则编辑（`perGroupSteps`）
- 流程线切换/新建向导
- 地区绑定（仅听后选择）
- 可视流程图弹窗（ReadonlyFlowCanvas + PropertyPanel）
- 阻断项面板（提交校验错误定位）

右栏：手机预览

- 组件：`PhonePreviewPanel`
- 数据：`demoQuestion`（由当前模板 + 当前草稿流程线实时物化）

---

## 4. 数据契约（必须迁移且要保持字段语义）

## 4.1 流程模块 `ListeningChoiceFlowModuleV1`

定义位置：`types/flow-engine.ts`

关键字段：

- `id`：流程线 ID（不是版本）
- `version`：版本号，正整数
- `name`：展示名
- `status`：`draft|published|archived`
- `introShowTitle / introShowTitleDescription / introShowDescription`
- `introCountdownEnabled / introCountdownShowTitle / introCountdownSeconds / introCountdownLabel`
- `perGroupSteps[]`

标准 ID 约定：

- 听后选择标准：`listening_choice.standard.v1`
- 听后回答标准：`listening_hear_answer.standard.v1`

自定义流程线 ID 前缀约定：

- 听后选择：`listening_choice.line.*`
- 听后回答：`listening_hear_answer.line.*`

如果迁移后 ID 不符合约定，会被页面过滤，表现为“某题型流程线看不到”。

## 4.2 `perGroupSteps` 步骤类型

定义在：

- `types/flow-engine.ts`
- `flows/listeningChoiceFlowModules.ts`

支持类型（标准模块层）：

- `playAudio`
- `countdown`
- `promptTone`
- `recordGuide`
- `answerChoice`

强约束（保存时校验）：

- 至少 1 个 `playAudio(description)`
- 至少 1 个 `playAudio(content)`
- 至少 1 个 `answerChoice`
- `countdown` 缺失是 warning，不是 error

## 4.3 路由规则 `FlowProfileV1`

定义：`types/flow-engine.ts`  
Store：`stores/flowProfiles.ts`

关键字段：

- `questionType`
- `region / scene / grade`
- `module.id + module.version`
- `priority`
- `enabled`

评分规则（`domain/flow-profile/usecases/scoreProfiles.ts`）：

- `region`：精确匹配 3 分；`通用` 在有请求地区时 2 分；未配置 1 分
- `scene/grade`：精确 3 分；未配置 1 分
- `priority`：乘 10 进入总分
- 未满足请求维度时直接淘汰（-999）

## 4.4 题目绑定 `question.flow.source`

定义：`types/question.ts`

当前仅标准源：

- `kind: 'standard'`
- `id`
- `version`
- `profileId`
- `overrides`（白名单字段补丁）

`overrides` 是“实例差异”，不是完整流程替换。

## 4.5 运行时元信息 `QuestionFlowRuntimeMeta`

定义：`app/usecases/runQuestionFlow.ts`

核心字段：

- `sourceKind`
- `profileId`
- `moduleId/moduleVersion`
- `moduleDisplayRef/moduleNote/moduleVersionText`
- `entryMode/entryStepIndex/...`（局部进入能力）

编辑页和学习页都使用同一套元信息。

## 4.6 可视流程图模型

定义：`types/flow-visual.ts`

- `FlowVisualNode`
- `FlowVisualEdge`
- `FlowVisualGraph`
- `FlowVisualCompileResult`
- `FlowMacroNodePayload`

---

## 5. 路由命中与编译链路（最关键）

## 5.1 命中流程线的真实顺序（`binding.ts`）

针对听后选择：

1. 若存在 routing context（region/scene/grade），优先按 profile 命中
2. 再尝试题目里显式 source ref
3. 再尝试 profileId
4. 再尝试同 ID 最新 published
5. 再回退默认标准

针对听后回答：

- 不走地区路由分支，优先显式 source / 默认听后回答标准线。

## 5.2 标准模块到具体步骤（`compiler.ts`）

编译输入：

- 题目模板（group、subQuestion、audio、prepareSeconds 等）
- 流程模块（intro + perGroupSteps）
- overrides（可选）

编译输出：

- 具体执行 steps（每个 step 有稳定 `id`）

听后回答特殊逻辑：

- `question.type === 'speaking_hear_answer'` 或 `metadata.questionVariant === 'hear_answer'`
- 某些步骤按小题循环展开（如 `recordGuide/promptTone/answerChoice`）
- 内容音频后的倒计时在 hear-answer 变体会按规则跳过

## 5.3 保存题目时的标准化

入口：

- `EditorWorkspace.vue` -> `saveQuestionDraft(...)`
- 归一化函数：`normalizeListeningChoiceQuestionForSave(...)`

行为：

- 会重新按当前模块编译 steps
- 尝试提取实例级 overrides
- 若题目流程与标准流程无法映射，写入 `metadata.flowNormalizationIssue`

这条机制是“防止题目保存出不可维护的孤儿流程”。

---

## 6. Flow Center 的“更新流程线”校验链

点击“更新当前流程线”前，会经过三层校验：

1. 模块结构校验：`validateListeningChoiceStandardModule(...)`
2. 可视图校验：若可视图 dirty 或编译错误，阻断提交
3. 交叉校验：`validateListeningChoiceModuleCommitCrossChecks(...)`
   - 模板字段是否满足流程需要（例如倒计时需要 `prepareSeconds`）
   - 路由规则是否引用了存在且未归档的版本

校验错误会被标准化为可定位 issue（模板/路由/可视），支持一键跳转定位。

---

## 7. 可视流程图（重点回答你问的“上下文提示/宏节点”）

## 7.1 节点面板实际提供的类型

`useEditableFlowGraph.ts` 的 STENCIL：

- `intro`
- `countdown`
- `playAudio`
- `promptTone`
- `answerChoice`
- `contextInfo`（上下文提示）
- `macroNode`（宏节点）

## 7.2 上下文提示（`contextInfo`）是什么

本质：可视图中的“控制类节点占位类型”。

当前状态（非常重要）：

- 在线性编译阶段可产出为 step kind（不会立即报错）
- 但映射回标准模块时，`buildListeningChoiceModuleFromLinearSteps` 不支持该 kind，会给 warning 并跳过
- 流程插件注册里没有 `contextInfo` 插件（运行时/渲染语义不完整）

结论：

- 它目前更像“预留能力”，不是稳定可发布能力。
- 若你要迁移并追求一致结果，建议先禁用或不对外暴露 `contextInfo`。

## 7.3 宏节点（`macroNode`）是什么

本质：流程片段引用节点（不是最终执行步骤）。

来源：

- 片段存储在 `stores/flowSnippets.ts`
- 宏节点引用 `baseId + version (+hash)`。

编译时行为（`compileGraphToSteps.ts`）：

- 通过 resolver 取片段
- 展开为若干 `nodeId::macro::N` 线性步骤
- 支持组绑定策略：
  - `inherit`
  - `fixed`
  - `empty`
- 支持 autoNext 策略：
  - `inherit`
  - `override`

注意：

- 宏节点只在“可视图编译阶段”存在。
- 回写流程草稿时最终落库的是展开后的语义，不会保存“宏节点对象”。

## 7.4 可视图约束与一键修复

线性模式约束：

- 单入口
- 单出口
- 无分支
- 无环
- 全连通

典型错误：

- `missing_play_audio`
- `missing_answer_choice`
- `answer_before_play_audio`
- `intro_not_first`
- `intro_duplicate`

支持一键修复：

- 自动插入播放音频/答题/倒计时
- 调整答题位置
- 介绍页移到首位
- 删除重复介绍页

---

## 8. 地区绑定与流程线向导

## 8.1 地区绑定规则

只在“听后选择页”启用（听后回答页默认关闭地区绑定面板）。

规则：

- 一个流程线可绑定多个地区
- 一个地区只能绑定 1 个流程线
- `通用` 代表默认/标准兜底

实现方式：

- 不是额外表，而是重建 `flowProfiles` 的 listening_choice 规则集合
- `replaceQuestionTypeProfiles('listening_choice', ...)` 一次性替换

## 8.2 地区流程模板

你可以把“地区 -> 流程线”当前绑定快照沉淀为模板：

- 保存：`saveRegionBindingTemplateFromCurrent`
- 应用：`applyRegionBindingTemplate`
- 删除：`removeRegionBindingTemplate`

持久化 key：`flow_region_binding_templates_v1`

## 8.3 新建流程线向导

支持：

- 基于当前线复制
- 基于标准线创建
- 可在创建时直接绑定多个地区
- 按钮语义是“创建并发布”（创建后立即可命中）

---

## 9. 学习模块与流程中心的关系

学习页入口：`components/views/LearningWorkspace.vue`

关键点：

- 题源是 `loadRecentQuestions()`（支持题库全部题型）
- 只有听力流相关题型会走流程路由命中并展示 `module/profile/source`
- 其他题型也可演练，但走各自 runtime 构建逻辑（非 flowModules/profile 命中）

这就是“学习支持全部题型”与“流程中心只维护听后选择/听后回答”并存的原因。

---

## 10. 导出契约（flows.json）

导出构建：`infra/repository/flowExportPackage.ts`  
导出入口：`components/views/QuestionLibrary.vue`

固定 schema：

- `schemaVersion = 2`
- `exportCapabilities.branchNodeMvp`
- `exportCapabilities.loopNodeMvp`
- `listeningChoiceModules`
- `flowProfiles`
- `publishLogs`

迁移时必须保留 schema v2，不要回退到旧字段名（`modules/profiles/logs` 老格式已弃用）。

---

## 11. 迁移实施清单（按优先级）

## 11.1 第一批（不迁就跑不起来）

- `types/question.ts`
- `types/flow-engine.ts`
- `types/flow-visual.ts`
- `stores/flowModules.ts`
- `stores/flowProfiles.ts`
- `stores/contentTemplates.ts`
- `engine/flow/listening-choice/compiler.ts`
- `engine/flow/listening-choice/binding.ts`
- `app/usecases/runQuestionFlow.ts`
- `flows/listeningChoiceFlowModules.ts`

## 11.2 第二批（Flow Center 主功能）

- `components/views/FlowModulesManager.vue`
- `components/views/flow-modules/*`
- `domain/flow-module/usecases/*`
- `domain/flow-visual/usecases/*`
- `components/editor/flow-visual/*`

## 11.3 第三批（体验增强）

- `stores/flowSnippets.ts`
- `infra/repository/flowRegionBindingTemplateRepository.ts`
- `components/layout/RuntimeDebugDrawer.vue`

---

## 12. 差距排查（最常见 8 条）

1. 只有“听后选择”，没有“听后回答流程线”
- 检查 module id 是否使用 `listening_hear_answer.standard.v1` 或 `listening_hear_answer.line.*`。

2. 题库里有听后回答，但学习页命中成听后选择
- 检查 `metadata.questionVariant === 'hear_answer'` 是否保留；或题型是否为 `speaking_hear_answer`。

3. 点击“更新当前流程线”总被阻断
- 看阻断项面板路径：
  - `content.*` 模板缺字段
  - `flowProfiles.*` 路由引用无效
  - `flowVisual.*` 可视图编译或 dirty

4. 地区绑定不生效
- 确认标签树存在“地区”根类及子标签；
- 确认路由规则 `enabled !== false`；
- 确认绑定后 profiles 已替换写回。

5. 向导创建后流程线没出现
- 重点查流程线 ID 是否重复/被过滤；
- 检查状态是否发布。

6. 可视图中宏节点报“片段不存在”
- 说明 `flowSnippets` 没迁移或版本号不一致。

7. 可视图加了“上下文提示”，回写后消失
- 这是当前设计限制（`contextInfo` 不在模块映射支持集合）。

8. 导出到对方项目后解析失败
- 检查对方是否按 schema v2 解析 `flows.json`。

---

## 13. 最小验收（流程专项）

1. 进入流程中心能看到“听后选择/听后回答”两张卡。
2. 听后选择页可切换流程线、更新流程线、绑定地区。
3. 听后回答页可更新流程线并在预览正确出现 `recordGuide + promptTone` 链路。
4. 学习页选听后回答题时，`命中结果` 中模块显示为听后回答线。
5. 导出 `flows.json` 后可被 `readFlowExportPackageV2` 成功解析。

建议回归命令：

```bash
npm run test
```

如需只跑流程相关：

```bash
node --test tests/flow-modules.test.mjs tests/flow-profile-routing.test.mjs tests/flow-visual-compiler.test.mjs tests/flow-module-commit-cross-checks.test.mjs tests/flow-export-migration.test.mjs tests/runtime-unified-entry.test.mjs
```

---

## 14. 你现在可以怎么用这份文档

迁移时直接按这份文档做“对照清单”：

- 先对齐数据契约（第 4 节）
- 再对齐命中/编译链路（第 5 节）
- 再接 Flow Center UI（第 3/7/8 节）
- 最后做差距排查（第 12 节）

这样能快速定位“看起来像 UI 差距，实际上是数据契约或路由链路差距”的问题。
