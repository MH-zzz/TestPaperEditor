# 2 个标准题自动衍生测试报告（字段 / 流程 / 结果）

## 1. 报告目标
- 基于 `static/local-learning/questions.json` 的 2 个完整标准题，自动衍生“缺字段 + 多流程”测试场景。
- 明确回答 3 个问题：
  1. 测了哪些字段？
  2. 走了哪些流程线？
  3. 结果是什么？

## 2. 测试入口与命令
- 测试文件：`tests/flow-flexibility-matrix.test.mjs`
- 执行命令：
  - `node --test tests/flow-flexibility-matrix.test.mjs`
  - `npm run test`

## 3. 种子题与流程覆盖

| 维度 | 覆盖内容 |
| --- | --- |
| 种子题 1 | `speaking_hear_answer`（ID: `1772525795990_q7qsm6hgq`） |
| 种子题 2 | `listening_choice`（ID: `1772506420111_8ayb4d2js`） |
| 流程线 A | `listening_hear_answer.standard.v1@1` |
| 流程线 B | `listening_choice.standard.v1@1` |
| 流程线 C | `listening_choice.line.1772077827774@1`（北京） |

## 4. 字段 mutation 清单（自动生成）

以下字段由测试自动改写/删除，不再手工逐条穷举：

1. `content.intro.audio.url`
2. `content.groups.{g}.descriptionAudio.url`
3. `content.groups.{g}.audio.url`
4. `content.groups.{g}.descriptionAudio.playCount`
5. `content.groups.{g}.audio.playCount`
6. `content.groups.{g}.prepareSeconds`
7. `content.groups.{g}.prompt`
8. `content.groups.{g}.subQuestions`
9. `content.groups.{g}.subQuestions.{q}.id`
10. `content.groups.{g}.subQuestions.{q}.recordGuideAudio.url`
11. `content.groups.{g}.subQuestions.{q}.recordGuideText`
12. `content.groups.{g}.recordGuideText`（听后回答全局缺失场景）
13. `content.groups.{g}.recordGuideAudio.url`（听后回答全局缺失场景）

说明：
- 测试会自动过滤“无效 mutation”（对当前种子无实际改动的 case）。
- 除单点 mutation 外，还自动生成组合 mutation（`combo__...`）。

## 5. 场景规模（自动统计）

| 题型 | 单点 mutation | 组合 mutation | 每流程场景数（baseline + mutation） | 流程条数 | 总场景数 |
| --- | --- | --- | --- | --- | --- |
| `speaking_hear_answer` | 19 | 18 | 38 | 1 | 38 |
| `listening_choice` | 19 | 18 | 38 | 2 | 76 |
| **总计** | - | - | - | - | **114** |

## 6. 预期与实际结果

### 6.1 预期
1. 每个“题目 × 流程线 × mutation”场景都应产出可执行步骤（不为空）。
2. 编译结果必须满足运行时安全约束：
   - `playAudio` 必须有有效音频 URL。
   - `countdown.seconds` 必须 `> 0`。
   - `promptTone.url` 必须非空。
   - `recordGuide` 至少有文本或音频其一。
   - `answerChoice`：
     - 听后回答：`questionIds` 必须存在且能映射到真实小题。
     - 听后选择：指向题组必须仍有小题。

### 6.2 实际
1. `node --test tests/flow-flexibility-matrix.test.mjs`：`pass=2, fail=0`。
2. 自动衍生场景执行总数：`114`。
3. 每个场景均满足上述运行时安全约束，无失败。
4. `npm run test` 全量：`226/226` 通过。

## 7. 结果结论
- 该方案已经实现“用 2 个完整标准题自动衍生大量异常场景”，并稳定替代人工穷举。
- 当前覆盖已包含：
  - 缺字段（URL/文本/ID）
  - 非法值（倒计时/播放次数置零）
  - 结构缺失（清空 subQuestions）
  - 多流程线回归（标准 + 地区变体）
- 当前状态：**结果 OK（全绿）**。
