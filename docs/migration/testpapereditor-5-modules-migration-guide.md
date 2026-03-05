# TestPaperEditor 五模块迁移文档（新建/学习/流程/标签/题库）

适用场景：把 `TestPaperEditor` 的核心页面能力迁移到另一个项目。

对应模块：

- `新建`（内部模块名：`editor`）
- `学习`（`learning`）
- `题型流程`（`flows`）
- `标签`（`tags`）
- `题库`（`library`）

---

## 1. 总入口与模块路由

主入口文件：

- [pages/index/index.vue](/Users/muminhao/Desktop/TestPaperEditor/pages/index/index.vue)
- [components/layout/SideNavigation.vue](/Users/muminhao/Desktop/TestPaperEditor/components/layout/SideNavigation.vue)
- [stores/appShell.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/appShell.ts)

模块映射：

- `editor` -> [EditorWorkspace.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/EditorWorkspace.vue)
- `learning` -> [LearningWorkspace.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/LearningWorkspace.vue)
- `flows` -> [FlowModulesManager.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/FlowModulesManager.vue)
- `tags` -> [TagsManager.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/TagsManager.vue)
- `library` -> [QuestionLibrary.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/QuestionLibrary.vue)

注意：

- 侧栏“新建”按钮不是仅切模块，还会触发 `create-new` 创建新题草稿。
- `pages/index/index.vue` 中 `onCreateFromSidebar()` 会调用 `questionDraft.createByType(...)`。

---

## 2. 通用底座（五模块共享，先迁）

## 2.1 题目数据与模板

- [types/question.ts](/Users/muminhao/Desktop/TestPaperEditor/types/question.ts)
- [templates/index.ts](/Users/muminhao/Desktop/TestPaperEditor/templates/index.ts)
- [stores/questionDraft.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/questionDraft.ts)
- [infra/repository/questionRepository.ts](/Users/muminhao/Desktop/TestPaperEditor/infra/repository/questionRepository.ts)

关键点：

- `questionDraft` 是“当前编辑题 + 原始快照 + 脏标记 + 持久化”中枢。
- 新建题型能力来自 `questionTemplates`。
- 当前题和最近题通过 `questionRepository` 读写。

## 2.2 渲染/编辑路由器

- [components/editor/QuestionEditor.vue](/Users/muminhao/Desktop/TestPaperEditor/components/editor/QuestionEditor.vue)
- [components/renderer/QuestionRenderer.vue](/Users/muminhao/Desktop/TestPaperEditor/components/renderer/QuestionRenderer.vue)
- [components/layout/PhonePreviewPanel.vue](/Users/muminhao/Desktop/TestPaperEditor/components/layout/PhonePreviewPanel.vue)

关键点：

- `QuestionEditor` 做“题型 -> 编辑器组件”的分发。
- `QuestionRenderer` 做“题型 -> 渲染器组件”的分发。
- 如果迁移后新增题型，只改这两个路由器即可接入页面。

## 2.3 流程运行时（编辑/学习/预览共享）

- [app/usecases/runQuestionFlow.ts](/Users/muminhao/Desktop/TestPaperEditor/app/usecases/runQuestionFlow.ts)
- [engine/flow/**](/Users/muminhao/Desktop/TestPaperEditor/engine/flow)

关键点：

- `runQuestionFlow` 是统一入口（compile + runtime meta）。
- `EditorWorkspace` 与 `LearningWorkspace` 都依赖它。

---

## 3. 模块一：新建（Editor）

入口文件：

- [components/views/EditorWorkspace.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/EditorWorkspace.vue)

页面骨架：

- 顶栏：题型徽标、调试、重置、保存。
- 左栏：`QuestionEditor`（编辑表单）。
- 中栏：`ListeningChoiceFlowPanel`（听后选择族流程只读展示）。
- 右栏：`PhonePreviewPanel`（实时预览）。
- 弹窗：题型选择器（根据 `交互类型.json`）。

核心依赖：

- `questionDraft`（当前题草稿）
- `saveQuestionDraft`（保存到题库）
- `runQuestionFlow` / `reduceQuestionFlowRuntimeState`
- `flowModules`（显示流程命中名称）
- `runtimeDebug`（调试抽屉）

迁移最小文件集：

- [EditorWorkspace.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/EditorWorkspace.vue)
- [components/editor/**](/Users/muminhao/Desktop/TestPaperEditor/components/editor)
- [components/layout/PhonePreviewPanel.vue](/Users/muminhao/Desktop/TestPaperEditor/components/layout/PhonePreviewPanel.vue)
- [components/layout/RuntimeDebugDrawer.vue](/Users/muminhao/Desktop/TestPaperEditor/components/layout/RuntimeDebugDrawer.vue)
- [stores/questionDraft.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/questionDraft.ts)
- [domain/question/usecases/saveQuestionDraft.ts](/Users/muminhao/Desktop/TestPaperEditor/domain/question/usecases/saveQuestionDraft.ts)

可裁剪项：

- 中栏“匹配规则/流程面板”
- 调试抽屉
- 题型选择弹窗的高级筛选

---

## 4. 模块二：学习（Learning）

入口文件：

- [components/views/LearningWorkspace.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/LearningWorkspace.vue)

页面骨架：

- 左栏：题库选题 + 上下文模拟 + 命中结果
- 中栏：步骤轨迹
- 右栏：手机演练预览

核心依赖：

- `loadRecentQuestions()` 作为题源（当前已支持题库全部题型）
- `runQuestionFlow()` 生成演练态问题
- `reduceQuestionFlowRuntimeState()` 控制步骤切换
- `QuestionRenderer`（通过 `PhonePreviewPanel`）
- `runtimeDebug`（轨迹记录）

迁移最小文件集：

- [LearningWorkspace.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/LearningWorkspace.vue)
- [components/layout/PhonePreviewPanel.vue](/Users/muminhao/Desktop/TestPaperEditor/components/layout/PhonePreviewPanel.vue)
- [components/layout/RuntimeDebugDrawer.vue](/Users/muminhao/Desktop/TestPaperEditor/components/layout/RuntimeDebugDrawer.vue)
- [app/usecases/runQuestionFlow.ts](/Users/muminhao/Desktop/TestPaperEditor/app/usecases/runQuestionFlow.ts)
- [infra/repository/questionRepository.ts](/Users/muminhao/Desktop/TestPaperEditor/infra/repository/questionRepository.ts)

---

## 5. 模块三：题型流程（Flow Center）

入口文件：

- [components/views/FlowModulesManager.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/FlowModulesManager.vue)

页面骨架：

- Home 卡片：听后选择 / 听后回答流程页入口
- Detail 三栏：
- 左：题型模板数据（`ListeningChoiceEditor`）
- 中：流程配置（线性流程 + 可视图 + 节点属性 + 发布）
- 右：手机预览（按流程执行）

核心依赖（强耦合）：

- store：
- [stores/flowModules.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/flowModules.ts)
- [stores/flowProfiles.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/flowProfiles.ts)
- [stores/contentTemplates.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/contentTemplates.ts)
- [stores/flowSnippets.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/flowSnippets.ts)
- 组合式：
- `components/views/flow-modules/*.ts`
- 领域用例：
- `domain/flow-module/usecases/*`
- `domain/flow-visual/usecases/*`
- `flows/listeningChoiceFlowModules.ts`
- 发布日志：
- [infra/repository/flowModuleRepository.ts](/Users/muminhao/Desktop/TestPaperEditor/infra/repository/flowModuleRepository.ts)

迁移建议：

- 这是五模块里最重的，建议最后迁。
- 先保证 `flowModules + flowProfiles + contentTemplates` 三个 store 可读写，再接 UI。

---

## 6. 模块四：标签（Tags）

入口文件：

- [components/views/TagsManager.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/TagsManager.vue)

页面骨架：

- 左：标签树 + 搜索
- 右：详情（改名、新增子级、删除）
- 顶部：新建根类、展开/收起

核心依赖：

- [stores/tag.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/tag.ts)
- [stores/tagTree.ts](/Users/muminhao/Desktop/TestPaperEditor/stores/tagTree.ts)
- [components/views/TagTreeNode.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/TagTreeNode.vue)
- [components/editor/TagTreeOption.vue](/Users/muminhao/Desktop/TestPaperEditor/components/editor/TagTreeOption.vue)

要点：

- `tagStore` 会自动补齐系统根类（教材版本、学期、年级、年份、难度、知识点、地区、场景）。
- `SideNavigation` 的编辑态二级栏直接依赖 `tagStore` 和 `questionDraft.updateMetadata(...)`。

---

## 7. 模块五：题库（Library）

入口文件：

- [components/views/QuestionLibrary.vue](/Users/muminhao/Desktop/TestPaperEditor/components/views/QuestionLibrary.vue)

页面骨架：

- 头部：搜索
- 工具栏：题型过滤 + 导出按钮
- 列表：卡片展示、删除、编辑

核心依赖：

- `loadRecentQuestions()` / `deleteRecentQuestion()`
- `questionDraft.loadQuestion()`（点击编辑后切回编辑器）
- 流程导出：
- [infra/repository/flowExportPackage.ts](/Users/muminhao/Desktop/TestPaperEditor/infra/repository/flowExportPackage.ts)
- `flowModules`, `flowProfiles`, `loadFlowModulePublishLogs`

导出格式：

- `questions.json`：题目快照数组
- `flows.json`：`schemaVersion = 2` 的流程包（modules/profiles/publishLogs）

---

## 8. 存储 Key 对照（迁移必须兼容）

题目相关：

- `currentQuestion`
- `recentQuestions`

标签：

- `editor_tag_tree`

流程中心：

- `editor_flow_modules_v2`
- `editor_flow_profiles_v1`
- `editor_content_templates_v1`
- `editor_flow_snippets_v1`
- `flow_module_publish_logs_v1`

---

## 9. 推荐迁移顺序

1. 先迁总壳与模块切换：`pages/index/index.vue` + `SideNavigation.vue` + `appShell`
2. 迁题目底座：`types` + `templates` + `questionDraft` + `questionRepository`
3. 迁编辑器（新建）最小闭环：`EditorWorkspace + QuestionEditor + saveQuestionDraft`
4. 迁题库（导入编辑、导出题目）
5. 迁标签（供编辑器侧栏使用）
6. 迁学习（读取题库并运行流程）
7. 最后迁流程中心（最复杂）

---

## 10. 快速验收清单（五模块）

- 新建：点击侧栏“新建”能生成新题并进入编辑页
- 新建：保存后能在题库看到新题
- 题库：点击“编辑”能回到编辑器并加载该题
- 标签：在编辑器勾选标签后，题目 `metadata.tags` 实时更新
- 学习：能从题库选题并开始演练，步骤可前后切换
- 流程：能打开题型流程首页并进入“听后选择/听后回答”详情页

---

## 11. 迁移时最容易漏的点

- `QuestionEditor` 和 `QuestionRenderer` 的题型路由要同步迁，不然会出现“能创建不能编辑/能编辑不能预览”。
- `questionDraft.entryMode` 会影响保存按钮文案和行为（新建/题库编辑）。
- 如果目标项目不是 uni-app，需要适配 `uni.getStorageSync / setStorageSync / showToast / showModal`。
- 流程中心依赖文件很多，不建议拆着搬，建议整包迁移 `components/views/flow-modules` + `domain/flow-visual` + `domain/flow-module`。

