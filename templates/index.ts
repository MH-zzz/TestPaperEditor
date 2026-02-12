import type {
  ListeningChoiceQuestion,
  ListeningFillQuestion,
  ListeningMatchQuestion,
  ListeningOrderQuestion,
  SpeakingQuestion,
  SpeakingStepsQuestion,
  SpeakingPartType,
  SpeakingStepsStep,
  RichTextContent,
  Question
} from '/types'
import { LISTENING_CHOICE_STANDARD_FLOW_ID } from '../flows/listeningChoiceFlowModules'
import { resolveListeningChoiceQuestion } from '../engine/flow/listening-choice/binding.ts'
import { contentTemplates } from '/stores/contentTemplates'
import { flowProfiles } from '/stores/flowProfiles'

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 创建空富文本
export function createEmptyRichText(): RichTextContent {
  return {
    type: 'richtext',
    content: []
  }
}

// 创建带文本的富文本
export function createRichText(text: string): RichTextContent {
  return {
    type: 'richtext',
    content: [{ type: 'text', text }]
  }
}

// ==================== 题目模板 ====================

// 听力选择题模板
export function createListeningChoiceTemplate(): ListeningChoiceQuestion {
  const storedTpl: any = contentTemplates?.state?.listeningChoice
  const tpl = storedTpl && typeof storedTpl === 'object' ? storedTpl : {}
  const optionStyle = tpl.optionStyle === '1234' ? '1234' : 'ABCD'
  const rawContent = tpl.content && typeof tpl.content === 'object' ? tpl.content : {}

  // Clone + regenerate ids so each new question is independent.
  const content: any = JSON.parse(JSON.stringify(rawContent || {}))
  const groups: any[] = Array.isArray(content.groups) ? content.groups : []
  let order = 1
  const regeneratedGroups = groups.map((g: any) => {
    const groupId = generateId()
    const subQuestions: any[] = Array.isArray(g?.subQuestions) ? g.subQuestions : []
    const nextSub = subQuestions.map((sq: any) => {
      const options = Array.isArray(sq?.options) ? sq.options : []
      const answer = Array.isArray(sq?.answer) ? sq.answer : []
      const next = {
        ...sq,
        id: generateId(),
        order: order++,
        options,
        answer: answer.length ? answer : (options[0]?.key ? [options[0].key] : ['A'])
      }
      return next
    })
    return { ...g, id: groupId, subQuestions: nextSub }
  })

  const q: ListeningChoiceQuestion = {
    id: generateId(),
    type: 'listening_choice',
    optionStyle,
    content: {
      ...(content || {}),
      groups: regeneratedGroups
    },
    flow: {
      version: 1,
      mode: 'semi-auto',
      source: { kind: 'standard', id: LISTENING_CHOICE_STANDARD_FLOW_ID, version: 1, overrides: {} },
      steps: []
    }
  }
  const profile = flowProfiles.resolve('listening_choice')
  if (profile) {
    q.flow.source = {
      kind: 'standard',
      id: profile.module.id,
      version: profile.module.version,
      profileId: profile.id,
      overrides: {}
    }
  }

  return resolveListeningChoiceQuestion(q, { generateId })
}

// ==================== Migrations / Normalizers ====================

// Split legacy listening_choice intro (audio + countdown inside one step) into:
// - intro (audio)
// - countdown (intro countdown)
//
// This keeps runtime behavior the same while making the flow clearer in preview/editor.
export function migrateListeningChoiceFlowSplitIntro(question: ListeningChoiceQuestion): ListeningChoiceQuestion {
  try {
    const steps = question.flow?.steps || []
    if (!Array.isArray(steps) || steps.length === 0) return question

    const introIdx = steps.findIndex(s => s?.kind === 'intro')
    if (introIdx < 0) return question

    const introStep: any = steps[introIdx]
    const next: any = steps[introIdx + 1]
    let contentIntro = question.content?.intro || ({} as any)
    let changed = false

    // Move legacy editable intro step title into content (authoring area).
    if (!contentIntro.title && introStep?.title) {
      contentIntro = { ...contentIntro, title: String(introStep.title) }
      changed = true
    }

    // Already split.
    // Also normalize showTitle defaults and strip step titles (titles live in editor content).
    const withShowTitle = steps.map((s: any) => {
      if (!s || typeof s !== 'object') return s
      const normalized: any = { ...s }
      if (typeof normalized.showTitle !== 'boolean') normalized.showTitle = true
      if (typeof normalized.title === 'string') delete normalized.title
      return normalized
    })
    if (withShowTitle.some((s, i) => s !== steps[i])) changed = true

    if (next?.kind === 'countdown') {
      if (!changed) return question
      return { ...question, content: { ...question.content, intro: contentIntro }, flow: { ...question.flow, steps: withShowTitle as any } }
    }

    const cfg: any = contentIntro?.countdown
    const seconds = Number(cfg?.seconds || 0)
    if (!seconds || seconds <= 0) return question

    // Only migrate the legacy "countdownEnded" intro semantics.
    if (introStep?.autoNext !== 'countdownEnded') return question

    const migratedSteps = [...withShowTitle]
    migratedSteps[introIdx] = { ...migratedSteps[introIdx], autoNext: 'audioEnded', showTitle: true }
    migratedSteps.splice(introIdx + 1, 0, {
      id: generateId(),
      kind: 'countdown',
      showTitle: true,
      seconds,
      label: cfg?.label || '准备',
      endBeepUrl: cfg?.endBeepUrl || '/static/beep.mp3',
      autoNext: 'countdownEnded'
    } as any)

    return { ...question, content: { ...question.content, intro: contentIntro }, flow: { ...question.flow, steps: migratedSteps } }
  } catch {
    return question
  }
}

// 听力填空题模板
export function createListeningFillTemplate(): ListeningFillQuestion {
  return {
    id: generateId(),
    type: 'listening_fill',
    audio: {
      url: 'https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3',
      position: 'above'
    },
    stem: createRichText('Hello, my name is Lucy. I am 10 years old. I have a happy family. There are three people in my family — my father, my mother and me.'),
    template: `1. My father is a d{{1}}. He works in a hospital and helps sick people.
2. My mother likes cooking. She can make delicious c{{2}} for us every day.
3. I like reading books. My favorite book is about lovely a{{3}}, like cats and dogs.`,
    blanks: [
      {
        id: 'blank_1',
        answer: ['doctor'],
        acceptVariants: true,
        hint: '职业'
      },
      {
        id: 'blank_2',
        answer: ['cakes', 'cookies'],
        acceptVariants: true,
        hint: '食物'
      },
      {
        id: 'blank_3',
        answer: ['animals'],
        acceptVariants: true,
        hint: '动物'
      }
    ],
    inputMode: 'text',
    wordBank: ['doctor', 'dancer', 'driver', 'cakes', 'cookies', 'bread', 'animals', 'plants', 'flowers']
  }
}

// 创建带图片的富文本
export function createRichTextWithImage(url: string): RichTextContent {
  return {
    type: 'richtext',
    content: [{ type: 'image', url }]
  }
}

// 听力连线题模板
export function createListeningMatchTemplate(): ListeningMatchQuestion {
  return {
    id: generateId(),
    type: 'listening_match',
    matchMode: 'one-to-many',
    audio: {
      url: 'https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3',
      position: 'above'
    },
    stem: createRichText('Listen and match the fruit names with the pictures.'),
    leftItems: [
      { id: 'L1', content: createRichText('Strawberry') },
      { id: 'L2', content: createRichText('Banana') },
      { id: 'L3', content: createRichText('Watermelon') }
    ],
    rightItems: [
      { id: 'R1', content: createRichTextWithImage('/static/caomei.jpeg') },
      { id: 'R2', content: createRichTextWithImage('/static/banana.jpeg') },
      { id: 'R3', content: createRichTextWithImage('/static/xigua.jpeg') }
    ],
    answers: [
      { left: 'L1', right: 'R1' },
      { left: 'L2', right: 'R2' },
      { left: 'L3', right: 'R3' }
    ]
  }
}

// 听力排序题模板
export function createListeningOrderTemplate(): ListeningOrderQuestion {
  return {
    id: generateId(),
    type: 'listening_order',
    audio: {
      url: '',
      position: 'above'
    },
    stem: createRichText('请听录音，将下列事件按正确顺序排列。'),
    items: [
      { id: 'item_1', content: createRichText('事件1') },
      { id: 'item_2', content: createRichText('事件2') },
      { id: 'item_3', content: createRichText('事件3') },
      { id: 'item_4', content: createRichText('事件4') }
    ],
    answer: ['item_1', 'item_2', 'item_3', 'item_4']
  }
}

// 口语题模板（旧版）
export function createSpeakingTemplate(): SpeakingQuestion {
  return {
    id: generateId(),
    type: 'speaking',
    stem: createRichText('请根据提示完成以下口语任务'),
    steps: [
      {
        id: generateId(),
        title: '听题',
        behavior: 'auto_play',
        audioUrl: 'https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3',
        instruction: createRichText('请仔细听题目要求。')
      },
      {
        id: generateId(),
        title: '浏览',
        behavior: 'countdown',
        duration: 30,
        instruction: createRichText('请浏览以下材料，准备作答。'),
        passage: createRichText('This is a sample passage for the speaking test. You should read it carefully and prepare to answer the questions.')
      },
      {
        id: generateId(),
        title: '准备',
        behavior: 'countdown',
        duration: 10,
        instruction: createRichText('准备时间，请组织你的答案。'),
        beepOnStart: true
      },
      {
        id: generateId(),
        title: '作答',
        behavior: 'record',
        duration: 60,
        instruction: createRichText('请开始录音作答。'),
        beepOnStart: true
      }
    ]
  }
}

// ==================== 口语题模板（新版 - 步骤化） ====================

// 题型名称映射
export const speakingPartTypeNames: Record<SpeakingPartType, string> = {
  1: '短文朗读',
  2: '听后选择',
  3: '情景问答',
  4: '口头作文',
  5: '听后转述',
  6: '单句练习',
  7: '单词朗读',
  8: '朗读并回答',
  12: '转述阅读'
}

// 题型描述映射
export const speakingPartTypeDescriptions: Record<SpeakingPartType, string> = {
  1: '请先听示范朗读，然后朗读短文',
  2: '听问题后，说出正确选项',
  3: '根据情景，回答问题',
  4: '根据提示，进行口头表达',
  5: '听录音，完成填空，然后转述',
  6: '朗读下列句子',
  7: '朗读下列单词',
  8: '朗读短文，然后回答问题',
  12: '阅读材料，听录音后转述'
}

// 创建短文朗读模板 (partType=1)
function createReadAloudSteps(): SpeakingStepsStep[] {
  return [
    {
      type: 'introduction',
      id: generateId(),
      title: '短文朗读',
      description: speakingPartTypeDescriptions[1]
    },
    {
      type: 'display-content',
      id: generateId(),
      content: createRichText('The quick brown fox jumps over the lazy dog. This is a sample passage for reading aloud practice. Please read it clearly and naturally.'),
      label: '短文内容'
    },
    {
      type: 'play-audio',
      id: generateId(),
      audio: { url: '/static/demo-audio.mp3', name: '示范朗读' },
      playCount: 1,
      showProgress: true,
      label: '请听示范朗读'
    },
    {
      type: 'countdown',
      id: generateId(),
      duration: 30,
      label: '请准备朗读',
      showProgress: true,
      showSkipButton: true,
      skipButtonText: '开始录音'
    },
    {
      type: 'record',
      id: generateId(),
      duration: 60,
      playBeepBefore: true,
      showTimer: true,
      showStopButton: true,
      assessmentMode: 'E',
      referenceText: 'The quick brown fox jumps over the lazy dog.'
    }
  ]
}

// 创建听后选择模板 (partType=2)
function createOralChoiceSteps(): SpeakingStepsStep[] {
  return [
    {
      type: 'introduction',
      id: generateId(),
      title: '听后选择',
      description: speakingPartTypeDescriptions[2]
    },
    {
      type: 'display-content',
      id: generateId(),
      content: createRichText('请看下列题目，听问题后说出正确答案。'),
      label: '题目说明'
    },
    {
      type: 'play-audio',
      id: generateId(),
      audio: { url: '/static/demo-dialogue.mp3', name: '对话音频' },
      playCount: 1,
      showProgress: true,
      label: '请听对话'
    },
    {
      type: 'loop-sub-questions',
      id: generateId(),
      stepsPerQuestion: [
        {
          type: 'play-audio',
          id: generateId(),
          audio: null,  // 使用小题自带音频
          playCount: 1,
          showProgress: true,
          label: '请听问题'
        },
        {
          type: 'countdown',
          id: generateId(),
          duration: 5,
          label: '请准备作答',
          showProgress: true
        },
        {
          type: 'record',
          id: generateId(),
          duration: 15,
          playBeepBefore: true,
          showTimer: true,
          showStopButton: true,
          assessmentMode: 'H'
        }
      ]
    }
  ]
}

// 创建情景问答模板 (partType=3)
function createSituationalQASteps(): SpeakingStepsStep[] {
  return [
    {
      type: 'introduction',
      id: generateId(),
      title: '情景问答',
      description: speakingPartTypeDescriptions[3]
    },
    {
      type: 'display-content',
      id: generateId(),
      content: createRichText('情景：你在学校遇到了一位新同学，请根据提示回答问题。'),
      label: '情景提示'
    },
    {
      type: 'countdown',
      id: generateId(),
      duration: 30,
      label: '请认真阅读情景',
      showProgress: true
    },
    {
      type: 'loop-sub-questions',
      id: generateId(),
      stepsPerQuestion: [
        {
          type: 'play-audio',
          id: generateId(),
          audio: null,
          playCount: 1,
          showProgress: true,
          label: '请听问题'
        },
        {
          type: 'record',
          id: generateId(),
          duration: 20,
          playBeepBefore: true,
          showTimer: true,
          showStopButton: true,
          assessmentMode: 'B'
        }
      ]
    }
  ]
}

// 创建口头作文模板 (partType=4)
function createOralCompositionSteps(): SpeakingStepsStep[] {
  return [
    {
      type: 'introduction',
      id: generateId(),
      title: '口头作文',
      description: speakingPartTypeDescriptions[4]
    },
    {
      type: 'display-content',
      id: generateId(),
      content: createRichText('请根据以下提示，进行口头表达：\n\n1. 介绍你的家庭\n2. 描述你最喜欢的家庭成员\n3. 说说你们常做的活动'),
      label: '写作提示'
    },
    {
      type: 'countdown',
      id: generateId(),
      duration: 60,
      label: '请准备你的回答',
      showProgress: true
    },
    {
      type: 'record',
      id: generateId(),
      duration: 90,
      playBeepBefore: true,
      showTimer: true,
      showStopButton: true,
      assessmentMode: 'C'
    }
  ]
}

// 根据 partType 创建口语题模板
export function createSpeakingStepsTemplate(partType: SpeakingPartType = 1): SpeakingStepsQuestion {
  let steps: SpeakingStepsStep[]
  const subQuestions: SpeakingStepsQuestion['subQuestions'] =
    partType === 2 || partType === 3 ? [
      {
        id: generateId(),
        content: createRichText('问题 1'),
        options: partType === 2 ? [
          { key: 'A', content: createRichText('选项 A') },
          { key: 'B', content: createRichText('选项 B') },
          { key: 'C', content: createRichText('选项 C') }
        ] : undefined,
        contentAudio: { url: '/static/question1.mp3', name: '问题1音频' }
      },
      {
        id: generateId(),
        content: createRichText('问题 2'),
        options: partType === 2 ? [
          { key: 'A', content: createRichText('选项 A') },
          { key: 'B', content: createRichText('选项 B') },
          { key: 'C', content: createRichText('选项 C') }
        ] : undefined,
        contentAudio: { url: '/static/question2.mp3', name: '问题2音频' }
      }
    ] : undefined

  switch (partType) {
    case 1:
      steps = createReadAloudSteps()
      break
    case 2:
      steps = createOralChoiceSteps()
      break
    case 3:
      steps = createSituationalQASteps()
      break
    case 4:
      steps = createOralCompositionSteps()
      break
    default:
      steps = createReadAloudSteps()  // 默认使用短文朗读
  }

  // 计算总步骤数（展开循环）
  const subCount = Array.isArray(subQuestions) ? subQuestions.length : 0
  const totalSteps = steps.reduce((count, step) => {
    if (step.type === 'loop-sub-questions') {
      return count + step.stepsPerQuestion.length * subCount
    }
    return count + 1
  }, 0)

  return {
    id: generateId(),
    type: 'speaking_steps',
    partType,
    title: speakingPartTypeNames[partType],
    title_description: '',
    stem: createRichText(speakingPartTypeDescriptions[partType]),
    steps,
    subQuestions,
    assessment: {
      mode: partType === 1 ? 'E' : partType === 2 ? 'H' : partType === 3 ? 'B' : 'C',
      referenceText: partType === 1 ? 'The quick brown fox jumps over the lazy dog.' : undefined
    },
    totalSteps
  }
}

// ==================== 模板映射 ====================

export const questionTemplates = {
  listening_choice: {
    name: '听后选择',
    description: '听问题后，选出正确选项',
    icon: '🎧',
    create: createListeningChoiceTemplate
  },
  listening_fill: {
    name: '填空题',
    description: '听录音，填写空白处',
    icon: '✏️',
    create: createListeningFillTemplate
  },
  listening_match: {
    name: '连线题',
    description: '听录音，将左右两边配对',
    icon: '🔗',
    create: createListeningMatchTemplate
  },
  listening_order: {
    name: '排序题',
    description: '听录音，按正确顺序排列',
    icon: '📝',
    create: createListeningOrderTemplate
  },
  speaking_steps: {
    name: '口语题',
    description: '可视化步骤编辑的口语题',
    icon: '🗣️',
    create: () => createSpeakingStepsTemplate(1)
  },
  speaking_hear_choice: {
    name: '听后选择',
    description: '听问题后，说出正确选项',
    icon: '🎧',
    create: () => createSpeakingStepsTemplate(2)
  }
} as const

export type TemplateKey = keyof typeof questionTemplates

// 根据类型创建题目
export function createQuestionByType(type: TemplateKey): Question {
  return questionTemplates[type].create()
}
