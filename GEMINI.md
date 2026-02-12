# GEMINI.md

## 项目概览 (Project Overview)

**TestPaperEditor** 是一个基于 **uni-app** (Vue 3) 的项目，旨在创建和编辑考试试卷，特别侧重于**听力**和**口语**题目。

**核心目标：**
*   **跨平台 (Cross-Platform):**
    *   **App 端 (iOS/Android):** 用于正式考试环境。利用原生能力解决浏览器对音频自动播放的限制，并提供更稳定的录音功能。
    *   **H5 端:** 用于练习和预览场景，方便快速分发。
*   **实时预览 (Real-time Preview):** 编辑器提供实时预览功能，预览效果与最终考试界面完全一致（所见即所得）。
*   **架构设计 (Architecture):**
    *   **"渲染器复用" (Renderer Reuse):** `QuestionRenderer` 组件同时用于编辑器的预览面板和实际的考试页面。
    *   **"流程引擎" (Flow Engine):** 核心业务逻辑由最新的流程引擎驱动，将题目数据（Template）、流程定义（Module）和绑定策略（Profile）解耦。

## 技术栈 (Technology Stack)

*   **框架:** [uni-app](https://uniapp.dcloud.net.cn/) (Vue 3)
*   **构建工具:** HBuilderX
*   **语言:** TypeScript (核心逻辑/引擎) / JavaScript (Vue组件)
*   **样式:** SCSS
*   **测试框架:** Node.js Native Test Runner (`node:test`)

## 架构与目录结构 (Architecture & Directory Structure)

### 核心目录
*   `components/editor/`: **仅**在编辑器界面使用的组件（例如：表单输入框、工具栏、题目设置面板）。
*   `components/renderer/`: 用于展示题目的组件。**关键点：这些组件同时被“编辑器（用于预览）”和“考试页面”使用。**
*   `engine/flow/`: **流程引擎核心 (The Flow Engine)**。负责编译题目模板和流程模块，生成运行时步骤，并管理运行时状态（状态机）。
*   `pages/editor/index.vue`: 主编辑器页面，通常分为左侧编辑区和右侧预览区。
*   `pages/preview/index.vue`: 独立的预览页面。
*   `types/`: 关键 TypeScript 类型定义（`flow-engine.ts`, `question.ts` 等）。
*   `docs/plans/`: 开发计划与设计文档，记录了架构演进方向。

### 流程引擎 (Flow Engine)
这是项目最新的核心架构（V1/V2），旨在解决复杂题型流程的可扩展性：
1.  **QuestionTemplate (Data):** 题目的静态数据（如：音频URL、文本内容、倒计时时长）。
2.  **FlowModule (Rules):** 定义流程步骤的 DSL（如：先播放A，再倒计时，再播放B）。
3.  **FlowProfile (Strategy):** 绑定策略，决定特定地区/场景下的题目使用哪个 `FlowModule`。
4.  **FlowRuntime:** 引擎根据上述输入生成 `RuntimeSteps` 并执行，驱动 UI 状态变化。

## 开发规范 (Development Conventions)

*   **渲染器复用 (Renderer Reuse):** 修改题目展示效果时，**必须** 修改 `components/renderer/`，确保编辑器预览与考试端一致。
*   **引擎驱动 (Engine-Driven):**
    *   对于新迁移的题型（如 `listening_choice`），UI 应当是“哑”的，仅根据引擎输出的 `state` (stepIndex, visual context) 进行渲染。
    *   避免在 UI 组件中硬编码业务跳转逻辑，逻辑应下沉至 `engine/flow`。
*   **数据驱动 (Data-Driven):** 编辑器修改 JSON 对象，渲染器响应数据变化。
*   **测试优先:** 涉及引擎逻辑修改时，优先在 `tests/` 下添加或运行 `.mjs` 测试用例。

## 构建与运行 (Building & Running)

*   **IDE:** 推荐使用 **HBuilderX**。
*   **运行 H5:** HBuilderX -> "运行" -> "运行到浏览器"。
*   **运行 App:** HBuilderX -> "运行" -> "运行到手机或模拟器"。
*   **运行测试:** 使用 Node.js 运行测试（需支持 TS 加载，如通过 `tsx` 或配置好的 node 环境）。
    ```bash
    # 示例 (假设环境已配置)
    node --test tests/flow-engine.test.mjs
    ```

## 关键文档 (Reference Docs)
*   `docs/plans/2026-02-11-listening-choice-flow-engine-v1-v2.md`: **必读**。理解流程引擎的设计思想和未来演进。
*   `编辑器实现方案讨论.md`: 理解编辑器与渲染器的复用关系。
