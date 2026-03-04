# P0/P1 任务表（已排除版本治理与 P2）

> 更新时间：2026-03-04
> 约束：不做“流程版本治理/一键回滚”；暂不做 P2（音频治理、运行时安全气囊）。

## 目标
1. P0：先把“数据边界可信”补齐，避免脏数据进入运行时。
2. P1：把“流程片段”升级为“宏节点（MacroNode）”能力，进一步降低流程组装复杂度。

## 任务清单

| ID | 优先级 | 任务 | 交付物 | 验证 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P0-1 | P0 | 导出包与题目仓储接入 Zod 运行时校验（读取边界） | `domain/schemas/*` + `flowExportPackage`/`questionRepository` 接入 | 新增/更新单测 + `npm run test` | `已完成` |
| P0-2 | P0 | 题目保存链路接入 Schema Guard（保存边界） | `saveQuestionDraft` 入参/出参校验与错误归一 | 单测覆盖非法输入与错误提示 | `已完成` |
| P0-3 | P0 | 本地学习导入链路接入 Schema Guard（questions/flows） | `localLearningRepository` + `stores/localLearning` 严格失败路径 | 单测覆盖坏包、缺字段、类型错配 | `已完成` |
| P0-4 | P0 | Flow store 持久化读取边界校验 | `flowModules/flowProfiles/contentTemplates` load 前校验 | 单测覆盖损坏缓存恢复 | `已完成` |
| P1-1 | P1 | MacroNode 数据模型（引用 snippet + 参数绑定） | `types/flow-visual` + 节点 payload 协议 | 编译单测：模型可序列化/反序列化 | `已完成` |
| P1-2 | P1 | 编译器支持 MacroNode 展开 | `compileGraphToSteps` 展开宏节点并复用 lint/门禁 | 单测覆盖合法/非法展开路径 | `已完成` |
| P1-3 | P1 | 画布与属性面板支持 MacroNode | `StencilPanel`/`PropertyPanel`/`FlowModulesManager` | 交互回归 + 编译结果断言 | `已完成` |
| P1-4 | P1 | MacroNode 与 Snippet 互通（从片段一键升宏） | 片段区新增“作为宏节点插入”能力 | 单测 + 手工走查 | `已完成` |
| P1-5 | P1 | 宏节点调试体验（局部预览与定位） | 宏节点展开定位、错误可跳转 | 预览与定位测试 | `已完成` |

## 当前执行批次

### 批次 B（已完成）
1. P1-4：MacroNode 与 Snippet 互通（从片段一键升宏）。
2. P1-5：宏节点调试体验（局部预览与定位）。

## 执行记录
1. 2026-03-04：完成 P0-1。
2. 新增 `domain/schemas/runtimeBoundarySchemas.ts`，并接入：
   - `infra/repository/flowExportPackage.ts`
   - `infra/repository/questionRepository.ts`
3. 新增/更新测试：
   - `tests/flow-export-migration.test.mjs`
   - `tests/question-repository-runtime-schema.test.mjs`
4. 验证：
   - `node --test tests/flow-export-migration.test.mjs tests/question-repository-runtime-schema.test.mjs` 通过
   - `npm run test` 通过（204/204）
5. 2026-03-04：完成 P0-2。
6. `domain/question/usecases/saveQuestionDraft.ts` 接入输入/标准化输出 Schema Guard，并新增错误码：
   - `question_schema_invalid`
   - `normalized_question_schema_invalid`
7. 新增测试：
   - `tests/question-save-validation.test.mjs`（2 个新用例）
8. 验证：
   - `node --test tests/question-save-validation.test.mjs tests/flow-export-migration.test.mjs tests/question-repository-runtime-schema.test.mjs` 通过
   - `npm run test` 通过（206/206）
9. 2026-03-04：完成 P0-3。
10. 本地学习导入链路改为严格 schema 失败路径：
   - `infra/repository/localLearningRepository.ts`
   - `stores/localLearning.ts`
11. 新增测试：
   - `tests/local-learning-runtime-schema.test.mjs`
   - `tests/mobile-learning-local-page.test.mjs`（断言更新）
12. 验证：
   - `node --test tests/local-learning-runtime-schema.test.mjs tests/mobile-learning-local-page.test.mjs` 通过
   - `npm run test` 通过（209/209）
13. 2026-03-04：完成 P0-4。
14. Flow stores 读取边界接入 schema guard：
   - `stores/flowModules.ts`
   - `stores/flowProfiles.ts`
   - `stores/contentTemplates.ts`
15. 新增 schema 解析器：
   - `parseFlowModulesStoragePayloadStrict`
   - `parseFlowProfilesStoragePayloadStrict`
   - `parseContentTemplatesStoragePayloadStrict`
16. 新增测试断言：
   - `tests/store-guardrails.test.mjs`
17. 验证：
   - `node --test tests/store-guardrails.test.mjs tests/local-learning-runtime-schema.test.mjs` 通过
   - `npm run test` 通过（210/210）
18. 2026-03-04：完成 P1-1。
19. 新增 MacroNode 协议与模型归一：
   - `types/flow-visual.ts`
   - `domain/flow-visual/usecases/flowMacroNodeModel.ts`
20. 新增测试：
   - `tests/flow-visual-macro-model.test.mjs`
21. 验证：
   - `node --test tests/flow-visual-macro-model.test.mjs` 通过
   - `npm run test` 通过（213/213）
22. 2026-03-04：完成 P1-2。
23. 编译器接入 MacroNode 展开能力（复用现有 lint/门禁）：
   - `domain/flow-visual/usecases/compileGraphToSteps.ts`
24. 新增/更新测试：
   - `tests/flow-visual-compiler.test.mjs`（新增 Macro 展开与失败路径用例）
25. 验证：
   - `node --test tests/flow-visual-compiler.test.mjs tests/flow-visual-macro-model.test.mjs` 通过
   - `npm run test` 通过（216/216）
26. 2026-03-04：完成 P1-3。
27. 画布/属性面板接入 MacroNode：
   - `components/views/flow-modules/useEditableFlowGraph.ts`
   - `components/editor/flow-visual/PropertyPanel.vue`
   - `components/views/FlowModulesManager.vue`
28. 新增测试：
   - `tests/flow-visual-macro-editor.test.mjs`
29. 验证：
   - `node --test tests/flow-visual-macro-editor.test.mjs tests/flow-visual-history.test.mjs tests/flow-visual-compiler.test.mjs tests/flow-profile-routing.test.mjs` 通过
   - `npm run test` 通过（219/219）
30. 2026-03-04：完成 P1-4。
31. Snippet 与 MacroNode 互通能力上线：
   - `components/views/flow-modules/useEditableFlowGraph.ts`（新增 `insertMacroSnippetNearTarget/insertMacroSnippetAtTail`）
   - `components/views/FlowModulesManager.vue`（片段区新增“作为宏插入”入口）
32. 新增测试：
   - `tests/flow-visual-macro-snippet-interop.test.mjs`
33. 验证：
   - `node --test tests/flow-visual-macro-editor.test.mjs tests/flow-visual-macro-snippet-interop.test.mjs tests/flow-visual-history.test.mjs tests/flow-profile-routing.test.mjs tests/flow-visual-compiler.test.mjs` 通过
   - `npm run test` 通过（221/221）
34. 2026-03-04：完成 P1-5。
35. 宏节点调试体验补齐（展开定位 + 局部预览命中）：
   - `components/views/FlowModulesManager.vue`
   - 宏展开步骤支持点击定位来源节点
   - 宏节点“从此步预览”支持回落命中 `nodeId::macro::n` 编译步骤
