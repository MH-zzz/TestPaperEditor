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
    *   [ ] 安装依赖: `npm install @vue-flow/core @vue-flow/background @vue-flow/controls`
    *   [ ] 创建目录结构: `components/editor/flow-visual/`
    *   [ ] 定义 `FlowNodeDefinition` 接口 (types/flow-visual.ts)。

2.  **节点组件开发 (Node Components)**
    *   [ ] 创建基础壳组件 `BaseNode.vue` (处理选中样式、输入输出端口)。
    *   [ ] 创建 `StepNode.vue` (通用业务节点，根据 type 显示不同图标和文字)。
    *   [ ] 实现节点样式：区分不同类型的颜色 (媒体=蓝色, 控制=黄色, 交互=绿色)。

3.  **逆向转换器 (Reverse Adapter)**
    *   [ ] 编写 `useStepsToGraph.ts`: 将 `FlowModule.steps` 数组转换为 `VueFlow.nodes/edges`。
    *   [ ] 实现**自动布局算法 (Auto Layout)**: 使用 `dagre` 库或简单的计算逻辑，自动计算每个节点的 (x, y) 坐标，确保生成的图从上到下排列整齐，不重叠。

4.  **集成展示**
    *   [ ] 在 `FlowModulesManager.vue` 增加“查看流程图”按钮。
    *   [ ] 点击弹出模态框，显示只读的画布。

---

### 阶段二：线性编辑能力 (Linear Editing Capability)
**目标：** 替代现有的表单编辑器，支持拖拽排序、增删节点、参数配置。**暂不支持复杂分支**。

#### **任务清单 (Checklist):**

1.  **元件库实现 (Stencil Library)**
    *   [ ] 建立 `registry.ts` (元件注册表)。
    *   [ ] 定义核心元件 Schema (Intro, PlayAudio, Countdown, AnswerChoice)。
    *   [ ] 实现左侧 `StencilPanel.vue` (工具栏)，展示可拖拽的元件图标。
    *   [ ] 实现拖拽 API (`onDragStart`, `onDrop`)，将元件从左侧拖入画布。

2.  **属性面板 (Inspector Panel)**
    *   [ ] 实现右侧 `PropertyPanel.vue`。
    *   [ ] **核心逻辑:** 监听画布选中事件 (`onNodeDragStop/Click`)，读取当前节点的 Schema。
    *   [ ] **动态表单:** 基于 Schema 自动渲染表单控件 (Input, Select, Switch)。
    *   [ ] 实现数据双向绑定：修改表单 -> 更新图节点数据。

3.  **正向编译器 (Forward Compiler)**
    *   [ ] 编写 `useGraphToSteps.ts`: 扫描画布上的节点和连线。
    *   [ ] **拓扑排序:** 确定节点的执行顺序。
    *   [ ] **线性化:** 将图转回 `FlowModule.steps` 数组。
    *   [ ] **校验:** 如果发现有孤立节点（未连线），禁止保存并提示。

4.  **交互增强**
    *   [ ] 限制连线规则：只允许从上一个节点的 Bottom 连到下一个节点的 Top (强制单向流)。
    *   [ ] 实现 Delete 键删除节点。

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

建议先从 **阶段一 (只读可视化)** 开始。
这不需要动核心业务逻辑，风险极低，但能立刻让团队看到效果，验证 `Vue Flow` 在 uni-app H5 环境下的兼容性。

**你现在的首要任务：**
先解决之前提到的 P0 代码质量问题 (Emit/Store)，为这个编辑器打下干净的地基。等地基好了，我们就可以开始搭建这个华丽的“可视化大楼”了。
