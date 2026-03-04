import { reactive } from 'vue'
import type {
  AudioConfig,
  ListeningAudio,
  ListeningChoiceContent,
  ListeningChoiceGroup,
  OptionStyle,
  QuestionOption,
  RichTextContent,
  SpeakingHearAnswerContent,
  SpeakingHearAnswerGroup,
  SpeakingHearAnswerSubQuestion,
  SubQuestion
} from '/types'
import { parseContentTemplatesStoragePayloadStrict } from '../domain/schemas/runtimeBoundarySchemas.ts'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_content_templates_v1'

export interface ListeningChoiceContentTemplateV1 {
  version: 1
  optionStyle?: OptionStyle
  content: ListeningChoiceContent
}

export interface SpeakingHearAnswerContentTemplateV1 {
  version: 1
  content: SpeakingHearAnswerContent
}

function createRichText(text: string): RichTextContent {
  return {
    type: 'richtext',
    content: [{ type: 'text', text }]
  }
}

function emptyRichText(): RichTextContent {
  return { type: 'richtext', content: [] }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRichText(input: unknown): RichTextContent {
  if (!isObjectRecord(input)) return emptyRichText()
  if (input.type !== 'richtext') return emptyRichText()
  if (!Array.isArray(input.content)) return emptyRichText()
  return input as RichTextContent
}

function nonEmptyString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s : undefined
}

function normalizeOptionStyle(v: unknown): OptionStyle {
  return v === '1234' ? '1234' : 'ABCD'
}

function normalizeNonNegativeInt(v: unknown, fallback: number): number {
  const n = Math.floor(Number(v))
  if (Number.isFinite(n) && n >= 0) return n
  return fallback
}

function normalizePositiveInt(v: unknown, fallback: number): number {
  const n = Math.floor(Number(v))
  if (Number.isFinite(n) && n > 0) return n
  return Math.max(1, fallback)
}

function normalizeOptionalNonNegativeInt(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = Math.floor(Number(v))
  if (Number.isFinite(n) && n >= 0) return n
  return undefined
}

function normalizeOptions(input: unknown): QuestionOption[] {
  if (!Array.isArray(input)) return [
    { key: 'A', content: emptyRichText() },
    { key: 'B', content: emptyRichText() },
    { key: 'C', content: emptyRichText() }
  ]
  const out = input
    .filter((o): o is Record<string, unknown> => isObjectRecord(o))
    .map((o, idx: number) => ({
      key: nonEmptyString(o.key) || String.fromCharCode(65 + idx),
      content: normalizeRichText(o.content)
    }))
    .slice(0, 10)
  return out.length >= 2 ? out : [
    { key: 'A', content: emptyRichText() },
    { key: 'B', content: emptyRichText() },
    { key: 'C', content: emptyRichText() }
  ]
}

function normalizeAudioConfig(input: unknown): AudioConfig | undefined {
  if (!isObjectRecord(input)) return undefined
  const url = typeof input.url === 'string' ? input.url : ''
  const trimmed = url.trim()
  if (!trimmed) return undefined
  return {
    url: trimmed,
    position: input.position === 'below' ? 'below' : 'above'
  }
}

function normalizeListeningAudio(input: unknown, fallbackPlayCount = 1): ListeningAudio | undefined {
  if (!isObjectRecord(input)) return undefined
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  if (!url) return undefined
  return {
    url,
    playCount: normalizePositiveInt(input.playCount, fallbackPlayCount),
    note: typeof input.note === 'string' ? input.note : undefined
  }
}

function normalizeSubQuestions(input: unknown): SubQuestion[] {
  if (!Array.isArray(input)) return []
  const out = input
    .filter((q): q is Record<string, unknown> => isObjectRecord(q))
    .map((q, idx: number) => {
      const options = normalizeOptions(q.options)
      const keys = options.map(o => o.key)
      const answer = Array.isArray(q.answer) ? q.answer.filter((k) => keys.includes(String(k))) : []
      return {
        id: nonEmptyString(q.id) || `tpl_q_${idx + 1}`,
        order: Number.isFinite(Number(q.order)) ? Number(q.order) : idx + 1,
        stem: normalizeRichText(q.stem),
        recordGuideText: q.recordGuideText ? normalizeRichText(q.recordGuideText) : undefined,
        recordGuideAudio: normalizeListeningAudio(q.recordGuideAudio, 1),
        answerSeconds: normalizeOptionalNonNegativeInt(q.answerSeconds),
        options,
        answerMode: q.answerMode === 'multiple' ? 'multiple' : 'single',
        answer: answer.length ? answer : [options[0].key]
      } as SubQuestion
    })
  return out
}

function normalizeGroups(input: unknown): ListeningChoiceGroup[] {
  if (!Array.isArray(input)) return []
  const out = input
    .filter((g): g is Record<string, unknown> => isObjectRecord(g))
    .map((g, idx: number) => {
      const descriptionAudio = isObjectRecord(g.descriptionAudio) ? g.descriptionAudio : null
      const audio = isObjectRecord(g.audio) ? g.audio : null
      return {
        id: nonEmptyString(g.id) || `tpl_g_${idx + 1}`,
        title: nonEmptyString(g.title),
        prompt: g.prompt ? normalizeRichText(g.prompt) : undefined,
        recordGuideText: g.recordGuideText ? normalizeRichText(g.recordGuideText) : undefined,
        recordGuideAudio: normalizeListeningAudio(g.recordGuideAudio, 1),
        prepareSeconds: normalizeNonNegativeInt(g.prepareSeconds, 3),
        answerSeconds: normalizeNonNegativeInt(g.answerSeconds, 0),
        descriptionAudio: descriptionAudio ? {
          url: typeof descriptionAudio.url === 'string' ? descriptionAudio.url : '',
          playCount: normalizePositiveInt(descriptionAudio.playCount, 1),
          note: typeof descriptionAudio.note === 'string' ? descriptionAudio.note : undefined
        } : { url: '', playCount: 1, note: '题组描述音频（可为空）' },
        audio: audio ? {
          url: typeof audio.url === 'string' ? audio.url : '',
          playCount: normalizePositiveInt(audio.playCount, 2),
          note: typeof audio.note === 'string' ? audio.note : undefined
        } : { url: '', playCount: 2, note: '题组音频（占位）' },
        subQuestions: normalizeSubQuestions(g.subQuestions)
      }
    })
  return out
}

function normalizeHearAnswerSubQuestions(input: unknown): SpeakingHearAnswerSubQuestion[] {
  if (!Array.isArray(input)) return []
  const out = input
    .filter((q): q is Record<string, unknown> => isObjectRecord(q))
    .map((q, idx: number) => ({
      id: nonEmptyString(q.id) || `tpl_ha_q_${idx + 1}`,
      order: Number.isFinite(Number(q.order)) ? Number(q.order) : idx + 1,
      stem: normalizeRichText(q.stem),
      audio: normalizeAudioConfig(q.audio),
      recordGuideText: q.recordGuideText ? normalizeRichText(q.recordGuideText) : undefined,
      recordGuideAudio: normalizeListeningAudio(q.recordGuideAudio, 1),
      answerSeconds: normalizeOptionalNonNegativeInt(q.answerSeconds)
    }))
  return out
}

function normalizeHearAnswerGroups(input: unknown): SpeakingHearAnswerGroup[] {
  if (!Array.isArray(input)) return []
  const out = input
    .filter((g): g is Record<string, unknown> => isObjectRecord(g))
    .map((g, idx: number) => {
      const descriptionAudio = isObjectRecord(g.descriptionAudio) ? g.descriptionAudio : null
      const audio = isObjectRecord(g.audio) ? g.audio : null
      return {
        id: nonEmptyString(g.id) || `tpl_ha_g_${idx + 1}`,
        title: nonEmptyString(g.title),
        prompt: g.prompt ? normalizeRichText(g.prompt) : undefined,
        recordGuideText: g.recordGuideText ? normalizeRichText(g.recordGuideText) : undefined,
        recordGuideAudio: normalizeListeningAudio(g.recordGuideAudio, 1),
        prepareSeconds: normalizeNonNegativeInt(g.prepareSeconds, 5),
        answerSeconds: normalizeNonNegativeInt(g.answerSeconds, 10),
        descriptionAudio: descriptionAudio ? {
          url: typeof descriptionAudio.url === 'string' ? descriptionAudio.url : '',
          playCount: normalizePositiveInt(descriptionAudio.playCount, 1),
          note: typeof descriptionAudio.note === 'string' ? descriptionAudio.note : undefined
        } : { url: '', playCount: 1, note: '题组描述音频（可为空）' },
        audio: audio ? {
          url: typeof audio.url === 'string' ? audio.url : '',
          playCount: normalizePositiveInt(audio.playCount, 2),
          note: typeof audio.note === 'string' ? audio.note : undefined
        } : { url: '', playCount: 2, note: '题组音频（占位）' },
        subQuestions: normalizeHearAnswerSubQuestions(g.subQuestions)
      }
    })
  return out
}

export const DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE: ListeningChoiceContentTemplateV1 = {
  version: 1,
  optionStyle: 'ABCD',
  content: {
    intro: {
      title: '听后选择',
      title_description: '(共9分,每小题1.5分)',
      text: createRichText('听下面若干段对话或独白。每段对话或独白后有若干小题，从每题所给的 A、B、C 三个选项中选出最佳选项。每段材料你将听两遍。'),
      audio: { url: '', playCount: 1, note: '说明音频（可为空）' },
      countdown: { seconds: 3, label: '准备', endBeepUrl: '/static/beep.mp3' }
    },
    groups: [
      {
        id: 'tpl_g_1',
        title: '第一题组对话',
        prompt: createRichText('请听一段对话，完成第 1 至第 2 小题。'),
        prepareSeconds: 3,
        answerSeconds: 0,
        descriptionAudio: { url: '', playCount: 1, note: '题组描述音频（可为空）' },
        audio: { url: '', playCount: 2, note: '题组音频（占位）' },
        subQuestions: [
          {
            id: 'tpl_q_1',
            order: 1,
            answerMode: 'single',
            stem: createRichText('问题 1'),
            options: [
              { key: 'A', content: createRichText('选项 A') },
              { key: 'B', content: createRichText('选项 B') },
              { key: 'C', content: createRichText('选项 C') }
            ],
            answer: ['A']
          },
          {
            id: 'tpl_q_2',
            order: 2,
            answerMode: 'single',
            stem: createRichText('问题 2'),
            options: [
              { key: 'A', content: createRichText('选项 A') },
              { key: 'B', content: createRichText('选项 B') },
              { key: 'C', content: createRichText('选项 C') }
            ],
            answer: ['A']
          }
        ]
      }
    ]
  }
}

export const DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE: SpeakingHearAnswerContentTemplateV1 = {
  version: 1,
  content: {
    intro: {
      title: '听后回答',
      title_description: '(共12分,每小题2分)',
      text: createRichText('听下面一段对话，回答第1小题。现在，你有5秒钟的时间阅读这道小题。'),
      audio: { url: '', playCount: 1, note: '说明音频（可为空）' },
      countdown: { seconds: 5, label: '准备', endBeepUrl: '/static/beep.mp3' }
    },
    groups: [
      {
        id: 'tpl_ha_g_1',
        title: '第一题组（单题）',
        prompt: createRichText('听下面一段对话回答第1小题，现在你有5秒钟的时间阅读这道小题。'),
        prepareSeconds: 5,
        answerSeconds: 10,
        descriptionAudio: { url: '', playCount: 1, note: '题组描述音频（可为空）' },
        audio: { url: '', playCount: 2, note: '题组音频（占位）' },
        subQuestions: [
          {
            id: 'tpl_ha_q_1',
            order: 1,
            stem: createRichText('Who is the boy talking to on the phone?'),
            audio: { url: '', position: 'above' }
          }
        ]
      },
      {
        id: 'tpl_ha_g_2',
        title: '第二题组（双题）',
        prompt: createRichText('听下面一段对话回答第4-5小题，现在你有10秒钟的时间阅读这两道小题。'),
        prepareSeconds: 10,
        answerSeconds: 10,
        descriptionAudio: { url: '', playCount: 1, note: '题组描述音频（可为空）' },
        audio: { url: '', playCount: 2, note: '题组音频（占位）' },
        subQuestions: [
          {
            id: 'tpl_ha_q_4',
            order: 4,
            stem: createRichText('How often should the girl water the plant?'),
            audio: { url: '', position: 'above' }
          },
          {
            id: 'tpl_ha_q_5',
            order: 5,
            stem: createRichText('What will the speakers do next?'),
            audio: { url: '', position: 'above' }
          }
        ]
      }
    ]
  }
}

export function normalizeListeningChoiceContentTemplate(input: unknown): ListeningChoiceContentTemplateV1 {
  try {
    const src = isObjectRecord(input) ? input : {}
    const contentSrc = isObjectRecord(src.content) ? src.content : {}
    const introSrc = isObjectRecord(contentSrc.intro) ? contentSrc.intro : {}
    const introAudio = isObjectRecord(introSrc.audio) ? introSrc.audio : null
    const introCountdown = isObjectRecord(introSrc.countdown) ? introSrc.countdown : null

    const groups = normalizeGroups(contentSrc.groups)
    return {
      version: 1,
      optionStyle: normalizeOptionStyle(src.optionStyle),
      content: {
        intro: {
          title: nonEmptyString(introSrc.title) || DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE.content.intro.title,
          title_description: typeof introSrc.title_description === 'string' ? introSrc.title_description : (DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE.content.intro.title_description || ''),
          text: normalizeRichText(introSrc.text),
          audio: introAudio ? {
            url: typeof introAudio.url === 'string' ? introAudio.url : '',
            playCount: normalizePositiveInt(introAudio.playCount, 1),
            note: typeof introAudio.note === 'string' ? introAudio.note : undefined
          } : DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE.content.intro.audio,
          countdown: introCountdown ? {
            seconds: Math.max(0, Math.floor(Number(introCountdown.seconds || 0))),
            label: typeof introCountdown.label === 'string' ? introCountdown.label : '准备',
            endBeepUrl: typeof introCountdown.endBeepUrl === 'string' ? introCountdown.endBeepUrl : '/static/beep.mp3'
          } : DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE.content.intro.countdown
        },
        groups: groups.length ? groups : DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE.content.groups
      }
    }
  } catch {
    return DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE
  }
}

export function normalizeSpeakingHearAnswerContentTemplate(input: unknown): SpeakingHearAnswerContentTemplateV1 {
  try {
    const src = isObjectRecord(input) ? input : {}
    const contentSrc = isObjectRecord(src.content) ? src.content : {}
    const introSrc = isObjectRecord(contentSrc.intro) ? contentSrc.intro : {}
    const introAudio = isObjectRecord(introSrc.audio) ? introSrc.audio : null
    const introCountdown = isObjectRecord(introSrc.countdown) ? introSrc.countdown : null

    const groups = normalizeHearAnswerGroups(contentSrc.groups)
    return {
      version: 1,
      content: {
        intro: {
          title: nonEmptyString(introSrc.title) || DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE.content.intro.title,
          title_description: typeof introSrc.title_description === 'string'
            ? introSrc.title_description
            : (DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE.content.intro.title_description || ''),
          text: normalizeRichText(introSrc.text),
          audio: introAudio ? {
            url: typeof introAudio.url === 'string' ? introAudio.url : '',
            playCount: normalizePositiveInt(introAudio.playCount, 1),
            note: typeof introAudio.note === 'string' ? introAudio.note : undefined
          } : DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE.content.intro.audio,
          countdown: introCountdown ? {
            seconds: Math.max(0, Math.floor(Number(introCountdown.seconds || 0))),
            label: typeof introCountdown.label === 'string' ? introCountdown.label : '准备',
            endBeepUrl: typeof introCountdown.endBeepUrl === 'string' ? introCountdown.endBeepUrl : '/static/beep.mp3'
          } : DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE.content.intro.countdown
        },
        groups: groups.length ? groups : DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE.content.groups
      }
    }
  } catch {
    return DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE
  }
}

class ContentTemplatesStore {
  state = reactive({
    listeningChoice: DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE as ListeningChoiceContentTemplateV1,
    speakingHearAnswer: DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE as SpeakingHearAnswerContentTemplateV1
  })
  private readonly persistence = createPersistenceScheduler(() => this.save(), 300)

  constructor() {
    this.load()
  }

  load() {
    try {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      const schemaParsed = parseContentTemplatesStoragePayloadStrict(parsed)
      if (!schemaParsed.ok) {
        throw new Error(`contentTemplates storage schema invalid: ${schemaParsed.error}`)
      }
      if (schemaParsed.payload.listeningChoice) {
        this.state.listeningChoice = normalizeListeningChoiceContentTemplate(schemaParsed.payload.listeningChoice)
      }
      if (schemaParsed.payload.speakingHearAnswer) {
        this.state.speakingHearAnswer = normalizeSpeakingHearAnswerContentTemplate(schemaParsed.payload.speakingHearAnswer)
      }
    } catch (e) {
      console.error('Failed to load content templates', e)
      this.state.listeningChoice = DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE
      this.state.speakingHearAnswer = DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({
        listeningChoice: this.state.listeningChoice,
        speakingHearAnswer: this.state.speakingHearAnswer
      }))
    } catch (e) {
      console.error('Failed to save content templates', e)
    }
  }

  setListeningChoice(template: unknown) {
    this.state.listeningChoice = normalizeListeningChoiceContentTemplate(template)
    this.persistence.schedule()
  }

  resetListeningChoice() {
    this.state.listeningChoice = DEFAULT_LISTENING_CHOICE_CONTENT_TEMPLATE
    this.persistence.schedule()
  }

  setSpeakingHearAnswer(template: unknown) {
    this.state.speakingHearAnswer = normalizeSpeakingHearAnswerContentTemplate(template)
    this.persistence.schedule()
  }

  resetSpeakingHearAnswer() {
    this.state.speakingHearAnswer = DEFAULT_SPEAKING_HEAR_ANSWER_CONTENT_TEMPLATE
    this.persistence.schedule()
  }
}

export const contentTemplates = new ContentTemplatesStore()
