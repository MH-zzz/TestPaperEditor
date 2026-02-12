# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

TestPaperEditor 是一个基于 Vue 3 和 uni-app 的跨平台试卷编辑器，用于创建听力和口语考试题目。支持 iOS/Android App（主要用于考试）和 H5（用于练习）。

## 开发环境

使用 **HBuilderX** 作为开发 IDE（无 package.json/npm 脚本）：
- **运行 H5**：运行 → 运行到浏览器
- **运行 App**：运行 → 运行到手机或模拟器
- **构建**：使用 HBuilderX 构建工具

## 架构

### 核心设计模式：渲染器复用

**编辑器预览和考试页面使用相同的渲染器组件**，确保所见即所得：

```
主容器 (/pages/index/)
├── SideNavigation (侧边导航)
├── EditorWorkspace (编辑 + 预览)
├── TagsManager (标签管理)
└── QuestionLibrary (题库)

编辑器组件 → QuestionRenderer (预览)
                    ↓ 同一组件
考试页面    → QuestionRenderer (考试)
```

### 三层应用架构

```
页面层 (Pages)
├── /pages/index/      主容器，管理模块切换
├── /pages/editor/     独立编辑页（App 环境）
└── /pages/preview/    独立预览页

视图层 (Views) - /components/views/
├── EditorWorkspace    编辑 + 实时预览
├── QuestionLibrary    题库查询系统
└── TagsManager        标签管理界面

组件层 (Components)
├── /components/editor/    编辑器组件
├── /components/renderer/  渲染器组件（共享）
└── /components/layout/    布局组件
```

### 题型系统

五种题型（定义在 `/types/question.ts`）：

| 题型 | 类型名 | 编辑器 | 渲染器 |
|------|--------|--------|--------|
| 听力选择 | ListeningChoiceQuestion | ListeningChoiceEditor | ListeningChoiceRenderer |
| 听力填空 | ListeningFillQuestion | ListeningFillEditor | ListeningFillRenderer |
| 听力连线 | ListeningMatchQuestion | ListeningMatchEditor | ListeningMatchRenderer |
| 听力排序 | ListeningOrderQuestion | ❌ 待实现 | ❌ 待实现 |
| 口语题 | SpeakingStepsQuestion | ❌ 待实现 | ❌ 待实现 |

### 听力连线题特性

**一对多答案支持**：
- 数据结构 `MatchPair[]` 支持同一个左侧项连接多个右侧项
- 编辑器使用 checkbox 多选模式设置答案
- 答案设置区域显示实际内容（图片缩略图/文字预览）而非抽象标签

**双列独立布局**（ListeningMatchRenderer）：
- 左右两列各自垂直排列，不强制一一对应
- 数量少的一侧自动垂直居中（`justify-content: center`）
- 中间 spacer 区域绘制 SVG 贝塞尔曲线连线
- 布局比例：左列 38%、连线区 24%、右列 38%

**连线项内容**：
- 使用统一的 `RichTextContent` 结构
- 支持纯文字、纯图片、或混合内容
- 编辑器中使用 RichTextEditor 组件编辑，支持插入图片

### 数据格式

题目使用**结构化 JSON**（非 HTML）。富文本格式：
```typescript
// 富文本内容
{
  type: 'richtext',
  content: RichTextNode[]  // 文本或图片节点数组
}

// 文本节点
{ type: 'text', text: 'Hello', marks: ['bold', 'color:#FF0000'] }

// 图片节点
{ type: 'image', url: '/static/example.jpeg', alt?: '描述' }
```

**连线项（MatchItem）简化结构**：
```typescript
// 统一使用富文本，不再需要单独的 type/url 字段
interface MatchItem {
  id: string
  content: RichTextContent  // 可包含文字或图片
}
```

### 状态管理与持久化

自定义 Store 模式 + localStorage：

| Store | 文件 | 存储键 | 用途 |
|-------|------|--------|------|
| TagStore | `/stores/tag.ts` | `editor_tags` | 标签管理 |
| GlobalSettingsStore | `/stores/settings.ts` | `editor_global_settings` | 全局设置 |

题目数据存储：
- `currentQuestion` - 当前编辑的题目
- `recentQuestions` - 最近保存的题目列表（最多 50 项）

### 标签系统

标签分类（定义在 `/types/tag.ts`）：
- `grade` (年级)、`semester` (学期)、`difficulty` (难度)、`year` (年份)、`region` (地区)

组件：
- `TagSelector` - 标签选择器（支持 normal/sidebar 两种模式）
- `TagsManager` - 标签管理视图

## 组件约定

### 编辑器组件 (`/components/editor/`)
- 通过 `v-model` 双向绑定数据
- 命名格式：`QuestionTypeEditor.vue`

### 渲染器组件 (`/components/renderer/`)
- 只读展示，接收 props：`data`、`mode`、`answers`、`showAnswer`
- `mode` 类型：`preview` | `exam` | `review`
- 命名格式：`QuestionTypeRenderer.vue`

### 富文本组件

**RichTextEditor** (`/components/editor/RichTextEditor.vue`)：
- 支持粗体、斜体、下划线、颜色等文本格式
- 图片插入：Demo 模式下循环使用 `/static/` 目录中的图片
- 通过 `v-model` 双向绑定 `RichTextContent`

**RichTextRenderer** (`/components/renderer/RichTextRenderer.vue`)：
- 渲染文本节点（带样式标记）和图片节点
- **H5 兼容**：图片使用原生 `<img>` 标签而非 uni-app 的 `<image>` 组件

### 事件通信
- `uni.$emit('switch-to-editor')` - 从题库加载题目时触发模块切换

## 样式约定

- SCSS 变量在 `/styles/variables.scss`（通过 uni-app 自动导入）
- BEM 命名：`.component-name__element--modifier`
- 主色：#2196f3

## 添加新题型

1. 在 `/types/question.ts` 定义接口，添加到 `Question` 联合类型
2. 在 `/components/editor/` 创建编辑器组件
3. 在 `/components/renderer/` 创建渲染器组件
4. 在 `/templates/index.ts` 添加模板工厂函数
5. 更新 `QuestionEditor.vue` 和 `QuestionRenderer.vue` 的路由

## uni-app API 使用

- `uni.getStorageSync()` / `uni.setStorageSync()`（非 `localStorage`）
- `uni.navigateTo()` 页面跳转
- 路径别名使用 `/` 前缀（如 `/types`、`/components`）

## 重要注意事项

- **渲染器复用**：显示相关的修改只改渲染器，不要为预览和考试创建不同组件
- **音频自动播放**：仅在 App 模式可用，H5 受浏览器限制
- **富文本是自定义 JSON**：不要使用标准 HTML 编辑器库
- **H5 图片渲染**：使用原生 `<img>` 标签，uni-app 的 `<image>` 组件在 H5 环境下可能有兼容问题
- **待实现功能**：ListeningOrderEditor/Renderer、SpeakingStepsEditor/Renderer

## 中文文档

- `前端技术选型讨论.md` - 框架选型分析
- `编辑器实现方案讨论.md` - 编辑器架构详解
- `试卷编辑器数据格式设计讨论.md` - JSON vs HTML 设计决策
