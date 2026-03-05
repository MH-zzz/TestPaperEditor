# `flows.json` 字段注释：`听后选择-标准`（`listening_choice.standard.v1`）

本文基于你的文件：`/Users/muminhao/Downloads/flows.json`（导出时间 `2026-03-05T03:22:41.256Z`）。

目标：把 `听后选择-标准` 这条流程模块的字段都解释清楚，按“字段路径 -> 含义 -> 生效规则”来读。

---

## 1. 在文件里怎么定位这条流程

路径：

- `listeningChoiceModules[]` 中
- `id = "listening_choice.standard.v1"`
- `version = 1`

你文件里这条对象当前值如下（原样）：

```json
{
  "kind": "listening_choice",
  "id": "listening_choice.standard.v1",
  "version": 1,
  "name": "听后选择-标准",
  "status": "published",
  "introShowTitle": true,
  "introShowTitleDescription": true,
  "introShowDescription": true,
  "introCountdownEnabled": false,
  "introCountdownShowTitle": true,
  "introCountdownSeconds": 3,
  "introCountdownLabel": "准备",
  "perGroupSteps": [
    {
      "kind": "playAudio",
      "showTitle": true,
      "audioSource": "description",
      "showQuestionTitle": true,
      "showQuestionTitleDescription": true,
      "showGroupPrompt": true
    },
    {
      "kind": "countdown",
      "showTitle": true,
      "showQuestionTitle": true,
      "seconds": 10,
      "label": "准备"
    },
    {
      "kind": "playAudio",
      "showTitle": true,
      "audioSource": "content",
      "repeatGapSeconds": 3,
      "showQuestionTitle": true,
      "showQuestionTitleDescription": true,
      "showGroupPrompt": true
    },
    {
      "kind": "answerChoice",
      "showTitle": true,
      "showQuestionTitle": true,
      "showQuestionTitleDescription": true,
      "showGroupPrompt": true
    }
  ],
  "createdAt": "2026-02-26T03:05:37.764Z",
  "updatedAt": "2026-03-05T02:55:14.515Z"
}
```

---

## 2. 模块级字段（顶层）说明

### `kind`

- 固定写法：`"listening_choice"`
- 含义：这是“听后选择族”的流程模块。

### `id`

- 例子：`"listening_choice.standard.v1"`
- 含义：流程线 ID（“哪一条流程线”）。
- 注意：`id` 不等于版本号，版本在 `version` 字段。

### `version`

- 例子：`1`
- 含义：该流程线的版本号（正整数，>=1）。

### `name`

- 例子：`"听后选择-标准"`
- 含义：给人看的显示名。

### `status`

- 可选值：`draft | published | archived`
- 含义：
- `draft`：草稿
- `published`：可被路由命中使用
- `archived`：归档，不再作为正常命中目标

### `note`（可选）

- 含义：流程备注说明（你这条里目前没有）。

### `introShowTitle`

- 含义：介绍页是否显示标题。

### `introShowTitleDescription`

- 含义：介绍页是否显示标题补充说明（title_description）。

### `introShowDescription`

- 含义：介绍页是否显示介绍正文。

### `introCountdownEnabled`

- 含义：介绍页后是否插入“介绍倒计时”步骤。
- 你当前是 `false`，所以不会插入该倒计时步骤。

### `introCountdownShowTitle`

- 含义：介绍倒计时步骤是否显示标题。
- 仅在 `introCountdownEnabled = true` 且秒数 > 0 时有意义。

### `introCountdownSeconds`

- 含义：介绍倒计时秒数。
- 仅在 `introCountdownEnabled = true` 时生效。

### `introCountdownLabel`

- 含义：介绍倒计时标签文案（例如“准备”）。

### `perGroupSteps`

- 含义：每个题组都会执行的一组步骤模板（按顺序）。
- 你当前顺序是：
- `playAudio(description)` -> `countdown` -> `playAudio(content)` -> `answerChoice`

### `createdAt` / `updatedAt`

- 含义：创建时间 / 更新时间（ISO 时间串）。

---

## 3. `perGroupSteps[]` 每类步骤字段说明

## A. `kind = "playAudio"`

你的文件里出现了两次，分别是：

- 第 1 个：`audioSource = "description"`（播放题组描述音频）
- 第 3 个：`audioSource = "content"`（播放题组正文音频）

可用字段：

- `showTitle`: 是否显示该步骤标题
- `audioSource`: `description | content`
- `repeatGapSeconds`（可选）: 正文重播间隔秒数（只对 `content` 有意义）
- `showQuestionTitle`: 是否显示题目标题
- `showQuestionTitleDescription`: 是否显示题目标题补充说明
- `showGroupPrompt`: 是否显示题组提示文本

运行时规则（重点）：

- 实际播放次数优先取题目数据里的 `group.descriptionAudio.playCount` 或 `group.audio.playCount`。
- 如果正文音频有多遍播放，会在两遍之间插入“重播间隔倒计时”。
- 该间隔优先用 `repeatGapSeconds`，没有则回退题组 `prepareSeconds`。

## B. `kind = "countdown"`

你的文件里第 2 个步骤是倒计时。

可用字段：

- `showTitle`: 是否显示步骤标题
- `showQuestionTitle`: 是否显示题目标题
- `seconds`: 倒计时秒数（兜底值）
- `label`: 倒计时标签文案

运行时规则（重点）：

- 实际秒数优先取题组 `prepareSeconds`。
- 如果题组没配 `prepareSeconds`，才回退到这里的 `seconds`。

## C. `kind = "answerChoice"`

你的文件里第 4 个步骤。

可用字段：

- `showTitle`
- `showQuestionTitle`
- `showQuestionTitleDescription`
- `showGroupPrompt`

运行时规则（重点）：

- 答题时长来自题组 `answerSeconds`。
- 当 `answerSeconds > 0`：时间到自动下一步（`timeEnded`）。
- 当 `answerSeconds = 0`：需要手动下一步（`tapNext`）。

## D. 其他可选步骤（你当前未使用）

### `kind = "promptTone"`

- 用于播放提示音。
- 字段：`showTitle`, `url`。

### `kind = "recordGuide"`

- 主要用于“听后回答”变体，作为录音引导步骤。
- 常见字段：`showTitle`, `showQuestionTitle`, `showQuestionTitleDescription`, `showGroupPrompt`, `textSource`, `audioSource`, `url`, `screenStrategy`。

---

## 4. 给你这条“听后选择-标准”的一句话解释

这条流程表示：

- 先进入介绍页（不加介绍倒计时）；
- 每个题组依次执行：播放描述音频 -> 倒计时准备 -> 播放正文音频（可有重播间隔） -> 进入答题。

---

## 5. 等价“注释版”示例（JSONC 读法）

```jsonc
{
  "kind": "listening_choice", // 听后选择流程模块
  "id": "listening_choice.standard.v1", // 流程线 ID（标准线）
  "version": 1, // 该流程线版本
  "name": "听后选择-标准", // 显示名
  "status": "published", // 已发布，可被命中

  "introShowTitle": true, // 介绍页显示标题
  "introShowTitleDescription": true, // 介绍页显示标题补充说明
  "introShowDescription": true, // 介绍页显示正文说明
  "introCountdownEnabled": false, // 介绍页后不插入倒计时
  "introCountdownShowTitle": true, // 若插入介绍倒计时，则显示标题
  "introCountdownSeconds": 3, // 介绍倒计时秒数（当前未启用）
  "introCountdownLabel": "准备", // 介绍倒计时标签（当前未启用）

  "perGroupSteps": [
    {
      "kind": "playAudio", // 步骤1：播放描述音频
      "audioSource": "description",
      "showTitle": true,
      "showQuestionTitle": true,
      "showQuestionTitleDescription": true,
      "showGroupPrompt": true
    },
    {
      "kind": "countdown", // 步骤2：题组准备倒计时
      "showTitle": true,
      "showQuestionTitle": true,
      "seconds": 10, // 兜底；优先用题组 prepareSeconds
      "label": "准备"
    },
    {
      "kind": "playAudio", // 步骤3：播放正文音频
      "audioSource": "content",
      "repeatGapSeconds": 3, // 正文多遍播放时的间隔秒数
      "showTitle": true,
      "showQuestionTitle": true,
      "showQuestionTitleDescription": true,
      "showGroupPrompt": true
    },
    {
      "kind": "answerChoice", // 步骤4：进入作答
      "showTitle": true,
      "showQuestionTitle": true,
      "showQuestionTitleDescription": true,
      "showGroupPrompt": true
    }
  ],

  "createdAt": "2026-02-26T03:05:37.764Z", // 创建时间
  "updatedAt": "2026-03-05T02:55:14.515Z" // 最后修改时间
}
```

