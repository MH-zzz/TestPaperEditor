// ==================== 富文本类型 ====================

// 文本标记类型
export type TextMark =
  | 'bold'
  | 'italic'
  | 'underline'
  | `color:${string}`
  | `bg:${string}`

// 文本节点
export interface RichTextTextNode {
  type: 'text'
  text: string
  marks?: TextMark[]
}

// 图片节点
export interface RichTextImageNode {
  type: 'image'
  url: string
  alt?: string
}

// 富文本节点（文本或图片）
export type RichTextNode = RichTextTextNode | RichTextImageNode

// 富文本内容
export interface RichTextContent {
  type: 'richtext'
  content: RichTextNode[]
}

// ==================== 音频类型 ====================

export interface AudioConfig {
  url: string
  duration?: number
  position?: 'above' | 'below'  // 音频位置：题干上方或下方
  autoPlay?: boolean
}

// ==================== 选项类型 ====================

export interface QuestionOption {
  key: string  // A, B, C, D 或 1, 2, 3, 4
  content: RichTextContent
}

// 选项显示格式
export type OptionStyle = 'ABCD' | '1234'

// ==================== 子题类型 ====================

export interface SubQuestion {
  id: string
  order: number
  stem: RichTextContent
  audio?: AudioConfig
  options: QuestionOption[]
  // Per-question interaction mode (single choice vs multiple choice).
  // Stored on the question itself for maximum flexibility within a paper.
  answerMode?: 'single' | 'multiple'
  answer: string[]  // 统一为数组（单选为单元素数组）
  explanation?: RichTextContent
}

// ==================== 听力选择题 ====================

export interface ListeningAudio {
  url: string
  playCount?: number
  note?: string
}

export interface CountdownConfig {
  seconds: number
  label?: string
  endBeepUrl?: string
}

export interface ListeningChoiceIntroContent {
  title?: string
  title_description?: string
  text: RichTextContent
  audio?: ListeningAudio
  countdown?: CountdownConfig
}

export interface ListeningChoiceGroup {
  id: string
  title?: string
  prompt?: RichTextContent
  prepareSeconds?: number
  answerSeconds?: number
  descriptionAudio?: ListeningAudio
  audio?: ListeningAudio
  subQuestions: SubQuestion[]
}

export interface ListeningChoiceContent {
  intro: ListeningChoiceIntroContent
  groups: ListeningChoiceGroup[]
}

export type FlowAutoNext = 'tapNext' | 'audioEnded' | 'countdownEnded' | 'timeEnded'

export interface FlowEffectPlaySfx {
  kind: 'playSfx'
  url: string
}

export type FlowEffect = FlowEffectPlaySfx

export interface FlowStepBase {
  id: string
  kind: string
  title?: string
  showTitle?: boolean
  autoNext?: FlowAutoNext
  onEnterEffects?: FlowEffect[]
  onEndEffects?: FlowEffect[]
}

export interface FlowIntroStep extends FlowStepBase {
  kind: 'intro'
  showTitleDescription?: boolean
  showDescription?: boolean
}

export interface FlowGroupPromptStep extends FlowStepBase {
  kind: 'groupPrompt'
  groupId: string
}

export interface FlowCountdownStep extends FlowStepBase {
  kind: 'countdown'
  seconds: number
  label?: string
}

export interface FlowPlayAudioStep extends FlowStepBase {
  kind: 'playAudio'
  groupId: string
  audioSource: 'description' | 'content'
  showQuestionTitle?: boolean
  showQuestionTitleDescription?: boolean
  showGroupPrompt?: boolean
}

export interface FlowPromptToneStep extends FlowStepBase {
  kind: 'promptTone'
  groupId?: string
  url?: string
}

export interface FlowAnswerChoiceStep extends FlowStepBase {
  kind: 'answerChoice'
  groupId?: string
  questionIds?: string[]
  showQuestionTitle?: boolean
  showQuestionTitleDescription?: boolean
  showGroupPrompt?: boolean
}

export interface FlowFinishStep extends FlowStepBase {
  kind: 'finish'
  text?: string
}

export type ListeningChoiceFlowStep =
  | FlowIntroStep
  | FlowGroupPromptStep
  | FlowCountdownStep
  | FlowPlayAudioStep
  | FlowPromptToneStep
  | FlowAnswerChoiceStep
  | FlowFinishStep

export interface ListeningChoiceStandardFlowSource {
  kind: 'standard'
  id: string
  version?: number
  profileId?: string
  // Whitelisted per-step overrides keyed by stable standard step keys
  // (e.g. "g0.countdown", "g1.answerChoice").
  overrides?: Record<string, Record<string, any>>
}

export interface ListeningChoiceLibraryFlowSource {
  kind: 'library'
  id: string
}

export type ListeningChoiceFlowSource =
  | ListeningChoiceStandardFlowSource
  | ListeningChoiceLibraryFlowSource

export interface ListeningChoiceFlow {
  version: 1
  mode?: 'semi-auto' | 'manual'
  source?: ListeningChoiceFlowSource
  steps: ListeningChoiceFlowStep[]
}

export interface ListeningChoiceQuestion {
  id: string
  type: 'listening_choice'
  optionStyle?: OptionStyle
  content: ListeningChoiceContent
  flow: ListeningChoiceFlow
}

// ==================== 听力填空题 ====================

// 填空交互模式
export type FillInputMode = 'text' | 'select'

export interface BlankConfig {
  id: string
  answer: string[]  // 可接受的答案列表
  acceptVariants?: boolean  // 是否接受变体（大小写等）
  hint?: string
}

export interface ListeningFillQuestion {
  id: string
  type: 'listening_fill'
  audio: AudioConfig
  stem: RichTextContent
  template: string  // 带 {{blank_id}} 占位符的模板
  blanks: BlankConfig[]
  inputMode?: FillInputMode  // 交互模式：text=直接输入, select=选词填空
  wordBank?: string[]  // 选词模式下的词库（包含正确答案和干扰项）
}

// ==================== 听力连线题 ====================

export interface MatchItem {
  id: string
  content: RichTextContent  // 富文本内容（可包含文字和图片）
}

export interface MatchPair {
  left: string
  right: string
}

export type MatchMode = 'one-to-one' | 'one-to-many'

export interface ListeningMatchQuestion {
  id: string
  type: 'listening_match'
  audio: AudioConfig
  stem: RichTextContent
  leftItems: MatchItem[]
  rightItems: MatchItem[]
  answers: MatchPair[]
  matchMode?: MatchMode
}

// ==================== 听力排序题 ====================

export interface OrderItem {
  id: string
  content: RichTextContent
}

export interface ListeningOrderQuestion {
  id: string
  type: 'listening_order'
  audio: AudioConfig
  stem: RichTextContent
  items: OrderItem[]
  answer: string[]  // 正确顺序的 id 数组
}

// ==================== 口语题（旧版，保留兼容） ====================

// 步骤行为类型
export type SpeakingStepBehavior =
  | 'manual'           // 用户点击下一步
  | 'auto_play'        // 播放音频，播完自动下一步
  | 'countdown'        // 倒计时，结束自动下一步
  | 'record'           // 录音，用户点击停止
  | 'input'            // 文字输入，用户点击提交

// 口语题步骤配置（旧版）
export interface SpeakingStep {
  id: string
  title: string                      // 步骤名称："听题"、"准备"、"作答"

  // ===== 内容区域显示（可组合）=====
  instruction?: RichTextContent      // 说明文字
  passage?: RichTextContent          // 文章/段落（大段文字）
  imageUrl?: string                  // 图片

  // ===== 行为配置 =====
  behavior: SpeakingStepBehavior
  audioUrl?: string                  // auto_play 行为的音频 URL
  duration?: number                  // countdown/record 的时长（秒）

  // ===== 提示音 =====
  beepOnStart?: boolean              // 开始时播放提示音

  // ===== 按钮配置（可选）=====
  buttonText?: string                // 自定义按钮文字，默认自动推断
  hideButton?: boolean               // 隐藏按钮（用于自动推进的步骤）
}

// 口语题（旧版）
export interface SpeakingQuestion {
  id: string
  type: 'speaking'
  stem: RichTextContent              // 整体题目说明
  steps: SpeakingStep[]              // 步骤列表
  beepAudioUrl?: string              // 自定义提示音 URL（默认用系统音）
}

// ==================== 口语题（新版 - 步骤化编辑器） ====================

// 口语题型枚举 (对应移动端 partType)
export type SpeakingPartType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12

// 评测模式
export type AssessmentMode = 'E' | 'B' | 'C' | 'G' | 'H'

// 音频文件
export interface AudioFile {
  url: string
  duration?: number                  // 时长（秒）
  name?: string                      // 文件名
}

// ========== 步骤元素类型 ==========

export type StepElementType = 'instruction' | 'audio' | 'image' | 'passage' | 'video'

// 步骤元素（用于旧版编辑器）
export type StepElement =
  | { type: 'instruction'; content: RichTextContent }
  | { type: 'audio'; url: string; autoPlay?: boolean }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'passage'; content: RichTextContent }
  | { type: 'video'; url: string }

// ========== 新版步骤类型 ==========

// 1. 题型介绍步骤
export interface IntroductionStep {
  type: 'introduction'
  id: string
  title: string                      // 题型名称
  description: string                // 说明文字
  gifImage?: string                  // 动画演示图
  audio?: AudioFile                  // 介绍音频
}

// 2. 显示内容步骤
export interface DisplayContentStep {
  type: 'display-content'
  id: string
  content: RichTextContent           // 富文本内容
  image?: string                     // 配图
  label?: string                     // 区域标签
}

// 3. 播放音频步骤
export interface PlayAudioStep {
  type: 'play-audio'
  id: string
  audio: AudioFile | null            // 音频文件
  playCount: number                  // 播放次数
  showProgress: boolean              // 显示进度条
  showPlayCount?: boolean            // 显示"第X遍播放"
  label?: string                     // 提示文字
}

// 4. 倒计时步骤
export interface CountdownStep {
  type: 'countdown'
  id: string
  duration: number                   // 倒计时秒数
  label: string                      // 提示文字，如"请认真阅读"
  showProgress: boolean              // 显示进度条
  showSkipButton?: boolean           // 显示跳过按钮
  skipButtonText?: string            // 跳过按钮文字
}

// 5. 录音步骤
export interface RecordStep {
  type: 'record'
  id: string
  duration: number                   // 最大录音时长
  playBeepBefore: boolean            // 录音前播放嘀声
  showTimer: boolean                 // 显示录音计时
  showStopButton: boolean            // 显示停止按钮
  assessmentMode: AssessmentMode     // 评测模式
  referenceText?: string             // 评测参考文本
}

// 6. 填空步骤
export interface FillBlankStep {
  type: 'fill-blank'
  id: string
  duration: number                   // 答题时间
  blanks: SpeakingBlankItem[]        // 填空项
}

export interface SpeakingBlankItem {
  id: string
  placeholder?: string
  answer: string                     // 正确答案
  acceptableAnswers?: string[]       // 可接受答案
}

// 7. 小题循环步骤
export interface LoopSubQuestionsStep {
  type: 'loop-sub-questions'
  id: string
  stepsPerQuestion: SpeakingStepsStep[]  // 每个小题执行的步骤模板
}

// 步骤联合类型
export type SpeakingStepsStep =
  | IntroductionStep
  | DisplayContentStep
  | PlayAudioStep
  | CountdownStep
  | RecordStep
  | FillBlankStep
  | LoopSubQuestionsStep

// 小题结构（用于口头选择、情景问答等）
export interface SpeakingSubQuestion {
  id: string
  content: RichTextContent           // 题目内容
  options?: QuestionOption[]         // 选项（口头选择题）
  referenceAnswer?: string           // 参考答案
  keywords?: string[]                // 关键词（情景问答）
  // Preferred: audio attached to the sub-question's content.
  // Used when a play-audio step has audio=null inside loop-sub-questions.
  contentAudio?: AudioFile

  // Legacy / compatibility aliases:
  // Some older docs or stored data may use these fields.
  descriptionAudio?: AudioFile
  audio?: AudioFile                  // 小题音频（旧字段）
}

// 评测配置
export interface SpeakingAssessmentConfig {
  mode: AssessmentMode
  referenceText?: string             // 参考文本（朗读评测）
  keywords?: string[]                // 关键词
  acceptableAnswers?: string[]       // 可接受答案列表
}

// 口语题主结构（新版）
export interface SpeakingStepsQuestion {
  id: string
  type: 'speaking_steps'
  partType: SpeakingPartType         // 题型：1-短文朗读，2-听后选择，等
  title: string                      // 题目标题
  title_description?: string         // 标题补充信息（外显时：title + title_description）
  stem: RichTextContent              // 题目说明
  steps: SpeakingStepsStep[]         // 步骤序列
  subQuestions?: SpeakingSubQuestion[] // 小题列表（部分题型需要）
  assessment: SpeakingAssessmentConfig // 评测配置
  totalSteps: number                 // 总步骤数（用于显示）
}

// ==================== 题目联合类型 ====================

export type Question =
  | ListeningChoiceQuestion
  | ListeningFillQuestion
  | ListeningMatchQuestion
  | ListeningOrderQuestion
  | SpeakingQuestion
  | SpeakingStepsQuestion

export type QuestionType = Question['type']

// ==================== 题目元数据 ====================

export interface QuestionMetadata {
  difficulty?: number  // 0-1
  duration?: number    // 预计时长（秒）
  source?: string      // 来源
  tags?: string[]      // 标签
  // Optional routing dimensions for flow profile matching.
  region?: string
  scene?: string
  grade?: string
  flowContext?: {
    region?: string
    scene?: string
    grade?: string
  }
  createdAt?: string
  updatedAt?: string
}

// ==================== 完整题目（含元数据） ====================

export interface FullQuestion<T extends Question = Question> {
  question: T
  metadata: QuestionMetadata
}
