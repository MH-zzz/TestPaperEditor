# 可视化流程编辑器 (Visual Flow Editor) 实施方案详解

## 1. 目标与愿景

打造一个**所见即所得 (WYSIWYG)** 的业务流程编排工具，替代现有的 JSON/表单配置模式。
让非技术人员（教研、产品）能够通过**拖拽组件**和**连线**，直观地设计出复杂的考试交互流程，并自动生成符合引擎规范的 `FlowModule` 数据。

---

## 2. 总体架构设计

采用 **"声明式元数据驱动"** 架构，将可视化编辑器分为三层：

1.  **表现层 (Presentation):** 基于 `Vue Flow` 实现画布、节点渲染、连线交互。
2.  **模型层 (Model):** 定义 `VisualGraph` 数据结构，作为中间态，向上映射 UI，向下编译为引擎代码。
3.  **适配层 (Adapter):** 负责将图结构 (Graph) 转换为 线性指令 (Steps)，处理数据校验与拓扑排序。

---

## 3. 阶段性实施计划 (Roadmap)

我们将整个工程拆分为三个独立且可交付的阶段 (Milestones)。

### 阶段一：只读可视化 (Read-Only Visualization)
**目标：** 不改变现有编辑方式，仅提供“查看模式”，将现有的 JSON 渲染为图形，帮助团队理解流程结构。

#### **任务清单 (Checklist):**

1.  **基建搭建 (Foundation)**
    *   [x] 安装依赖链路已就绪: `package.json` 已声明 `@vue-flow/*`、`dagre`、`vite`、`@dcloudio/vite-plugin-uni`
    *   [x] 创建目录结构: `components/editor/flow-visual/`
    *   [x] 定义 `FlowNodeDefinition` 接口 (types/flow-visual.ts)。

2.  **节点组件开发 (Node Components)**
    *   [x] 创建基础壳组件 `BaseNode.vue` (处理选中样式、输入输出端口)。
    *   [x] 创建 `StepNode.vue` (通用业务节点，根据 type 显示不同图标和文字)。
    *   [x] 实现节点样式：区分不同类型的颜色 (媒体=蓝色, 控制=黄色, 交互=绿色)。

3.  **逆向转换器 (Reverse Adapter)**
    *   [x] 编写 `useStepsToGraph.ts`: 将 `FlowModule.steps` 数组转换为 `VueFlow.nodes/edges`。
    *   [x] 实现**自动布局算法 (Auto Layout)**: 使用 `dagre` 库或简单的计算逻辑，自动计算每个节点的 (x, y) 坐标，确保生成的图从上到下排列整齐，不重叠。

4.  **集成展示**
    *   [x] 在 `FlowModulesManager.vue` 增加“查看流程图”按钮。
    *   [x] 点击弹出模态框，显示只读的画布。

> 注：仓库已补齐 npm 构建链路（`npm run dev:h5/build:h5/test`）。阶段一当前为轻量只读实现，下一步可切换到 `@vue-flow/*` + `dagre` 版本。

---

### 阶段二：线性编辑能力 (Linear Editing Capability)
**目标：** 替代现有的表单编辑器，支持拖拽排序、增删节点、参数配置。**暂不支持复杂分支**。

#### **任务清单 (Checklist):**

1.  **元件库实现 (Stencil Library)**
    *   [x] 建立轻量元件注册（`useEditableFlowGraph.ts` 内置 `STENCIL_ITEMS`）。
    *   [x] 定义核心元件（Intro, PlayAudio, Countdown, AnswerChoice, PromptTone, ContextInfo）。
    *   [x] 实现左侧 `StencilPanel.vue`（工具栏），支持追加到线性链路尾部。
    *   [x] 实现拖拽 API（H5）：`onDragStart` + 画布 `onDrop`，并保留“点击添加”兜底。
    *   [x] 元件拖入节点时支持按 before/after 位置插入（不再仅尾部追加）。

2.  **属性面板 (Inspector Panel)**
    *   [x] 实现右侧 `PropertyPanel.vue`。
    *   [x] **核心逻辑:** 基于选中节点读取并编辑 `stepKind/autoNext/groupId`。
    *   [x] **动态表单（MVP）:** 基于字段 schema 渲染 select/text 控件（按 stepKind 输出字段集）。
    *   [x] 实现数据双向绑定：修改面板字段 -> 更新节点数据并触发重新编译。
    *   [x] 已支持“应用到预览 / 清除预览覆盖”，可把编译结果回写到预览执行链路（仅本地会话）。

3.  **正向编译器 (Forward Compiler)**
    *   [x] 编写 `domain/flow-visual/usecases/compileGraphToSteps.ts`: 扫描节点与连线，输出线性 steps。
    *   [x] **拓扑排序（线性模式）:** 基于唯一入口链路确定执行顺序。
    *   [x] **线性化:** 将 graph 转回可执行 `steps` 数组（含 `kind/autoNext/groupId`）。
    *   [x] **校验:** 已支持空图、缺失端点、分支、多入口/多出口、环路、孤点/非连通阻断，并返回结构化错误码。
    *   [x] 编译器回归：新增 `tests/flow-visual-compiler.test.mjs` 覆盖线性成功与核心失败分支。
    *   [x] 只读弹窗已接入编译反馈展示（“线性编译结果”状态与错误摘要）。
    *   [x] 已新增 `buildListeningChoiceModuleFromLinearSteps`，支持将线性 steps 映射回流程草稿模块（含核心步骤自动补齐）。
    *   [x] 已接入“应用到流程草稿”按钮，映射后可直接驱动现有流程保存/发布链路。
    *   [x] 应用到草稿前展示差异摘要（复用 `buildModuleDiffSummary` 口径）。

4.  **交互增强**
    *   [ ] 限制连线规则：只允许从上一个节点的 Bottom 连到下一个节点的 Top (强制单向流)。
    *   [x] 已支持节点拖拽到目标节点进行线性重排（支持 before/after 插入）。
    *   [x] 已支持 Delete/Backspace 删除当前选中节点（编辑输入态自动忽略）。
    *   [x] 已增加重排反馈动画（节点位移动画 + drop 目标 before/after 指示条）。

---

### 阶段三：完全体 (Advanced Features) - *V2 规划*
**目标：** 支持分支逻辑、循环、复杂校验，打造企业级低代码引擎。

#### **任务清单 (Checklist):**

1.  **高级节点**
    *   [ ] 实现 `BranchNode` (分支判断节点)。
    *   [ ] 实现 `LoopNode` (循环节点)。

2.  **智能辅助 (IntelliSense)**
    *   [ ] **实时 Lint:** 画布右下角显示“错误/警告”列表 (例如：答题前未播放音频)。
    *   [ ] **连接吸附:** 拖拽连线时，智能推荐可连接的目标点。

3.  **复用机制**
    *   [ ] 实现“另存为片段” (Snippet)。
    *   [ ] 左侧工具栏支持加载自定义片段。

---

## 4. 技术栈选型详情

| 模块 | 技术选型 | 理由 |
| :--- | :--- | :--- |
| **画布引擎** | **@vue-flow/core** | Vue 3 生态最好，API 简洁，体积小。 |
| **自动布局** | **dagre** | 经典的图布局算法库，用于阶段一的自动排列。 |
| **图标库** | **UnoCSS Icons** (或现有svg) | 保持风格一致。 |
| **Schema校验** | **Zod** | 用于验证拖拽生成的 JSON 是否符合引擎规范。 |

---

## 5. 数据结构定义 (Core Types)

```typescript
// types/flow-visual.ts

// 1. 节点定义 (Schema)
export interface FlowNodeSchema {
  kind: string;          // 'playAudio'
  label: string;         // '播放音频'
  icon: string;          // '🔊'
  color: string;         // '#1890ff'
  props: FormField[];    // 属性表单配置
}

// 2. 表单字段定义
export interface FormField {
  key: string;           // 'playCount'
  label: string;         // '播放次数'
  type: 'number' | 'text' | 'select' | 'boolean';
  options?: { label: string; value: any }[];
  defaultValue?: any;
}

// 3. 画布数据 (存盘用)
export interface VisualGraphData {
  nodes: {
    id: string;
    type: string;        // 对应 FlowNodeSchema.kind
    position: { x: number, y: number };
    data: Record<string, any>; // 用户配置的参数
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
  }[];
}
```

## 6. 立即执行建议

阶段一已可用，阶段二已进入“编译器与校验核心”实现。
下一拍建议聚焦到可编辑 UI 本体：

1. 落地 `StencilPanel.vue`（元件库）与拖拽入画布。
2. 落地 `PropertyPanel.vue`（Inspector）并与节点 data 双向绑定。
3. 在保存入口接入 `compileFlowVisualGraphToLinearSteps`，将校验错误直接回填到 UI 阻断面板。
