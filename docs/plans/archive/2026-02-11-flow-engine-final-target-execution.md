# 听后选择 Pilot：最终目标直达重构执行清单

> 目标：不走过渡版，直接重构到“题型数据 + 流程规则 + 绑定策略 + 引擎执行”的最终形态。

---

## A. 最终目标（定稿口径）

1. **题型模板**只描述题目内容数据。
2. **题型流程模块**只描述步骤规则与参数来源。
3. **FlowProfile**负责“题型 + 地区 + 场景 -> 流程版本”绑定。
4. **FlowEngine**是唯一执行入口（compile + execute）。
5. 预览/编辑/正式渲染统一消费引擎输出，不各写一套流程逻辑。

---

## B. 听后选择 Pilot 最终流程

1. 介绍页（intro）
2. 每题组循环：
3. 播放描述音频（description）
4. 倒计时（秒数取题组 `prepareSeconds`）
5. 播放正文音频（content，播放次数取题组 `audio.playCount`）
6. 答题（时长取题组 `answerSeconds`，`0` 为不限时）

---

## C. 一次性重构分阶段（文件级）

## 阶段 1：新模型落地（先建新，不删旧）

### 新增文件

1. `types/flow-engine.ts`
   - 定义 `FlowModule` / `FlowProfile` / `QuestionInstanceBinding` / `CompiledStep` / `RuntimeState`。
2. `engine/flow/index.ts`
   - 暴露 `compileFlow`、`createRuntime`、`dispatchEvent`。
3. `engine/flow/listening-choice/compiler.ts`
   - 听后选择 compile 规则（模板数据 -> 步骤）。
4. `engine/flow/listening-choice/runtime.ts`
   - 听后选择 runtime 转场。
5. `stores/flowProfiles.ts`
   - 本地存储 profile（后续可迁服务端）。
6. `stores/flowModules.ts`
   - 本地存储流程模块（带版本）。

### 修改文件

1. `types/index.ts`
   - 导出新 `flow-engine` 类型。
2. `types/question.ts`
   - `ListeningChoiceFlow` 保留兼容字段，同时增加 `profileId`（可选）。

---

## 阶段 2：听后选择先接引擎 compile（替换物化入口）

### 修改文件

1. `flows/listeningChoiceFlowModules.ts`
   - 现有 `materializeListeningChoiceStandardSteps` 改为调用新 compiler。
   - 旧 API 保留（给页面兼容），内部改走新引擎。
2. `templates/index.ts`
   - 创建听后选择题时，不直接拼 steps；改为按 `profile/module` compile。
3. `components/views/FlowModulesManager.vue`
   - 流程中心改为编辑 `FlowModule`，不直接操作“散落逻辑变量”。

---

## 阶段 3：渲染层接 runtime（统一执行入口）

### 修改文件

1. `components/renderer/ListeningChoiceRenderer.vue`
   - 把当前 step 分支逻辑迁到 runtime adapter。
   - Renderer 只处理 UI 呈现和事件分发（next/audioEnded/countdownEnded）。
2. `components/layout/PhonePreviewPanel.vue`
   - 统一预览态与考试态的 runtime 初始化参数。
3. `pages/preview/index.vue`
   - 改为 runtime 驱动，而非直接读题目内 `flow.steps`。

---

## 阶段 4：编辑职责彻底分离（题型数据 vs 流程规则）

### 修改文件

1. `components/editor/ListeningChoiceEditor.vue`
   - 仅编辑模板数据字段，不直接维护步骤数组。
2. `components/editor/ListeningChoiceFlowPanel.vue`
   - 只读流程图（由 module + template compile 后展示）。
3. `components/views/EditorWorkspace.vue`
   - 左中右三栏联动改为：模板编辑 -> compile -> runtime preview。

---

## 阶段 5：校验与治理（防止后期失控）

### 新增文件

1. `engine/flow/validators/listening-choice.ts`
   - 保存流程前校验：每题组答题步、步骤合法顺序、参数来源完整性。

### 修改文件

1. `components/views/FlowModulesManager.vue`
   - 保存时强制跑校验并展示错误。

---

## 阶段 6：测试基线（必须同时完成）

### 新增/修改文件

1. `tests/flow-engine-compile.test.mjs`
   - 覆盖 compile 规则（听后选择）。
2. `tests/flow-engine-runtime.test.mjs`
   - 覆盖 runtime 事件转场（audioEnded/countdownEnded/timeEnded）。
3. `tests/flow-profile-routing.test.mjs`
   - 覆盖 profile 匹配与回退。
4. `tests/flow-modules.test.mjs`
   - 迁移为“新引擎口径”断言。
5. `tests/preview-mode.test.mjs`
   - 确认预览/考试模式都走同一 runtime 内核。

---

## D. 风险与控制

1. 风险：一次性重构范围大。
   - 控制：阶段 1~2 完成后先让旧 UI 可用，阶段 3 再切 renderer。
2. 风险：旧数据结构残留。
   - 控制：引擎层做兼容读取，保存写回新结构。
3. 风险：流程配置被误改。
   - 控制：发布版只读、草稿编辑、校验后发布。

---

## E. 开工顺序（建议）

1. 先做阶段 1+2（模型 + compile 接管）。
2. 再做阶段 3（runtime 接管渲染）。
3. 然后做阶段 4（编辑职责分离）。
4. 最后阶段 5+6（治理 + 测试补齐）。

---

## F. 本轮重构的完成判据

1. 听后选择全链路由引擎驱动。
2. 流程中心改规则后，题型编辑页和预览自动跟随。
3. 同一题型可通过 profile 切换不同流程版本。
4. 新增一个流程变体不需要改 renderer 业务分支。

