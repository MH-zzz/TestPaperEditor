# 听后回答运行流程（基于 static 最新数据）

## 1. 数据来源

- 题目文件：`static/local-learning/questions.json`
- 流程文件：`static/local-learning/flows.json`
- 题目 ID：`1772525795990_q7qsm6hgq`
- 题型：`speaking_hear_answer`（`metadata.questionVariant = hear_answer`）
- 流程线：`listening_hear_answer.standard.v1@v1`
- 当前实际总步数：`20`

## 2. 页面通用显示规则（当前实现）

- 顶部标题：固定显示 `听后回答 (共12分,每小题2分)`。
- 主体白色内容区：根据当前步骤显示介绍文案、题组文案、题干。
- 底部控制栏：
  - 放题组介绍音频时显示 `放音 mm:ss`。
  - 放正文音频时显示 `听语音 mm:ss`。
  - 倒计时时显示时间；重播间隔步骤只显示时间，不显示文字。
  - 录音题步骤显示录音态（`正在录音 mm:ss`）。
- `promptTone` 步骤复用上一屏内容（不切换主内容页）。

## 3. 当前题目逐步明细（20 步）

| 步骤 | kind | 当前界面显示 | 系统在做什么 | 用户要做什么 |
|---|---|---|---|---|
| 1 | intro | 显示介绍文案：听后回答说明 | 播放介绍音频 `/static/audio/听后回答-介绍描述.mp3`，结束后自动下一步 | 等待 |
| 2 | playAudio（组1-description） | 显示组1文案（第1题） | 播放组1介绍音频 `/static/audio/听后回答-听下面对话回答1小题介绍音频.mp3` | 等待 |
| 3 | countdown（5s, 答题准备） | 显示组1文案 + 第1题题干 | 5秒倒计时，结束后下一步 | 阅读题干 |
| 4 | playAudio（组1-content 第1遍） | 显示组1文案 + 第1题题干 | 播放组1正文音频第1遍 `/static/audio/听后回答-1小题正文音频.mp3` | 听音频 |
| 5 | countdown（5s, 重播间隔） | 界面仍为组1文案 + 第1题题干 | 5秒重播间隔倒计时，结束后下一步 | 等待 |
| 6 | playAudio（组1-content 第2遍） | 显示组1文案 + 第1题题干 | 播放组1正文音频第2遍 | 听音频 |
| 7 | promptTone（开始录音） | 复用上一屏（组1内容） | 播放提示音 `/static/audio/开始录音.mp3`，结束自动下一步 | 准备开口 |
| 8 | answerChoice（组1-题1） | 显示第1题：`Who is the boy talking to on the phone?` | 开始录音，按组1 `answerSeconds=10` 倒计时，时间到自动下一步 | 作答录音 |
| 9 | promptTone（结束录音） | 复用上一屏（组1题1） | 播放提示音 `/static/audio/停止录音.mp3`，结束自动下一步 | 结束本题录音 |
| 10 | playAudio（组2-description） | 显示组2文案（第4-5题） | 播放组2介绍音频 `/static/audio/听后回答-听下面对话回答5-6小题介绍音频.mp3` | 等待 |
| 11 | countdown（10s, 答题准备） | 显示组2文案 + 第4/5题题干 | 10秒倒计时，结束后下一步 | 阅读两题 |
| 12 | playAudio（组2-content 第1遍） | 显示组2文案 + 第4/5题题干 | 播放组2正文音频第1遍 `/static/audio/听后回答-5-6正文音频.mp3` | 听音频 |
| 13 | countdown（10s, 重播间隔） | 界面仍为组2文案 + 第4/5题题干 | 10秒重播间隔倒计时，结束后下一步 | 等待 |
| 14 | playAudio（组2-content 第2遍） | 显示组2文案 + 第4/5题题干 | 播放组2正文音频第2遍 | 听音频 |
| 15 | promptTone（开始录音） | 复用上一屏（组2内容） | 播放提示音 `/static/audio/开始录音.mp3`，结束自动下一步 | 准备开口 |
| 16 | answerChoice（组2-题4） | 显示第4题：`How often should the girl water the plant?` | 开始录音，10秒倒计时，时间到自动下一步 | 作答录音 |
| 17 | promptTone（结束录音） | 复用上一屏（组2题4） | 播放提示音 `/static/audio/停止录音.mp3`，结束自动下一步 | 结束第4题录音 |
| 18 | promptTone（开始录音） | 复用上一屏（组2内容） | 播放提示音 `/static/audio/开始录音.mp3`，结束自动下一步 | 准备开口 |
| 19 | answerChoice（组2-题5） | 显示第5题：`What will the speakers do next?` | 开始录音，10秒倒计时，时间到自动下一步 | 作答录音 |
| 20 | promptTone（结束录音） | 复用上一屏（组2题5） | 播放提示音 `/static/audio/停止录音.mp3`，流程结束 | 完成 |

## 3.1 V2 标准模块目标流程（recordGuide 启用后）

说明：上面 20 步是当前 `questions.json` 里已经固化的旧流程。  
如果切到最新标准模块 `DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE`，同一题会编译为 **23 步**（每道小题进入录音前先走 `recordGuide`）：

`intro, playAudio, countdown, playAudio, countdown, playAudio, recordGuide, promptTone, answerChoice, promptTone, playAudio, countdown, playAudio, countdown, playAudio, recordGuide, promptTone, answerChoice, promptTone, recordGuide, promptTone, answerChoice, promptTone`

每道小题录音环路语义（V2）：

1. `recordGuide`：展示录音说明文案并播放说明音频（来源可配：按小题 / 按题组 / 固定 URL）
2. `promptTone`（开始录音）：播放开始提示音
3. `answerChoice`：开始录音与倒计时（可按小题覆盖 `answerSeconds`）
4. `promptTone`（结束录音）：播放结束提示音

`recordGuide.screenStrategy`：

- `replaceBody`：切主内容页（推荐用于完整录音说明）
- `reusePrevious`：沿用上一屏，仅切换底部控制栏与音频

## 4. 补充：本题关键参数

- 组1：
  - `prepareSeconds = 5`
  - `answerSeconds = 10`
  - `descriptionAudio.playCount = 1`
  - `audio.playCount = 2`
- 组2：
  - `prepareSeconds = 10`
  - `answerSeconds = 10`
  - `descriptionAudio.playCount = 1`
  - `audio.playCount = 2`

## 5. 相关代码位置（便于排查）

- 听后回答渲染桥接：`components/renderer/SpeakingHearAnswerRenderer.vue`
- 主流程渲染：`components/renderer/ListeningChoiceRenderer.vue`
- 步骤行为插件：`engine/flow/plugins/listening-choice/*.ts`
- 标准流程编译：`flows/listeningChoiceFlowModules.ts`
