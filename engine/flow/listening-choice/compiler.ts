import type {
  ListeningChoiceFlowStep,
  ListeningChoiceGroup,
  ListeningChoiceQuestion,
  SpeakingHearAnswerQuestion,
  ListeningChoiceFlowModuleV1,
  QuestionMetadata
} from '/types'

type IdFactory = () => string
type FlowOverrides = Record<string, Record<string, unknown>>
type ListeningChoiceCompileQuestion = ListeningChoiceQuestion | SpeakingHearAnswerQuestion
type PerGroupStepDef = ListeningChoiceFlowModuleV1['perGroupSteps'][number]
type CompilePlanItem = {
  key: string
  step: Omit<ListeningChoiceFlowStep, 'id'>
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function defaultGenerateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function toInt(v: unknown, fallback = 0): number {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function nonEmptyString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s : undefined
}

function normalizeAudioSource(v: unknown): 'description' | 'content' {
  return v === 'description' ? 'description' : 'content'
}

type QuestionWithMetadata = ListeningChoiceCompileQuestion & {
  metadata?: QuestionMetadata
}

function readMetadata(question: ListeningChoiceCompileQuestion): QuestionMetadata {
  const metadata = (question as QuestionWithMetadata).metadata
  return metadata && typeof metadata === 'object' ? metadata : {}
}

function isHearAnswerVariant(question: ListeningChoiceCompileQuestion): boolean {
  if (question.type === 'speaking_hear_answer') return true
  const metadata = readMetadata(question)
  const variant = typeof metadata?.questionVariant === 'string'
    ? metadata.questionVariant.trim()
    : ''
  return variant === 'hear_answer'
}

function readOverrideBool(override: Record<string, unknown>, key: string): boolean | undefined {
  const value = override[key]
  return typeof value === 'boolean' ? value : undefined
}

function readOverrideString(override: Record<string, unknown>, key: string): string | undefined {
  const value = override[key]
  return typeof value === 'string' ? value : undefined
}

function applyOverride(step: ListeningChoiceFlowStep, override: unknown): ListeningChoiceFlowStep {
  if (!isObjectRecord(override)) return step

  if (step.kind === 'intro') {
    const next = { ...step }
    const showTitle = readOverrideBool(override, 'showTitle')
    const showTitleDescription = readOverrideBool(override, 'showTitleDescription')
    const showDescription = readOverrideBool(override, 'showDescription')
    if (typeof showTitle === 'boolean') next.showTitle = showTitle
    if (typeof showTitleDescription === 'boolean') next.showTitleDescription = showTitleDescription
    if (typeof showDescription === 'boolean') next.showDescription = showDescription
    return next
  }

  if (step.kind === 'playAudio') {
    const next = { ...step }
    const showTitle = readOverrideBool(override, 'showTitle')
    const showQuestionTitle = readOverrideBool(override, 'showQuestionTitle')
    const showQuestionTitleDescription = readOverrideBool(override, 'showQuestionTitleDescription')
    const showGroupPrompt = readOverrideBool(override, 'showGroupPrompt')
    if (typeof showTitle === 'boolean') next.showTitle = showTitle
    if (typeof showQuestionTitle === 'boolean') next.showQuestionTitle = showQuestionTitle
    if (typeof showQuestionTitleDescription === 'boolean') next.showQuestionTitleDescription = showQuestionTitleDescription
    if (typeof showGroupPrompt === 'boolean') next.showGroupPrompt = showGroupPrompt
    return next
  }

  if (step.kind === 'countdown') {
    const next = { ...step }
    const showTitle = readOverrideBool(override, 'showTitle')
    const label = readOverrideString(override, 'label')
    if (typeof showTitle === 'boolean') next.showTitle = showTitle
    if (typeof label === 'string') next.label = label
    return next
  }

  if (step.kind === 'promptTone') {
    const next = { ...step }
    const showTitle = readOverrideBool(override, 'showTitle')
    const url = readOverrideString(override, 'url')
    if (typeof showTitle === 'boolean') next.showTitle = showTitle
    if (typeof url === 'string') next.url = url
    return next
  }

  if (step.kind === 'answerChoice') {
    const next = { ...step }
    const showTitle = readOverrideBool(override, 'showTitle')
    const showQuestionTitle = readOverrideBool(override, 'showQuestionTitle')
    const showQuestionTitleDescription = readOverrideBool(override, 'showQuestionTitleDescription')
    const showGroupPrompt = readOverrideBool(override, 'showGroupPrompt')
    if (typeof showTitle === 'boolean') next.showTitle = showTitle
    if (typeof showQuestionTitle === 'boolean') next.showQuestionTitle = showQuestionTitle
    if (typeof showQuestionTitleDescription === 'boolean') next.showQuestionTitleDescription = showQuestionTitleDescription
    if (typeof showGroupPrompt === 'boolean') next.showGroupPrompt = showGroupPrompt
    return next
  }

  return step
}

function toPlanStep(step: Omit<ListeningChoiceFlowStep, 'id'>, generateId: IdFactory): ListeningChoiceFlowStep {
  return { id: generateId(), ...step } as ListeningChoiceFlowStep
}

function compilePlan(question: ListeningChoiceCompileQuestion, module: ListeningChoiceFlowModuleV1) {
  const plan: CompilePlanItem[] = []
  const hearAnswerVariant = isHearAnswerVariant(question)

  const introCountdownEnabled = module.introCountdownEnabled !== false
  const introCountdownSeconds = Math.max(0, toInt(module.introCountdownSeconds, 3))
  const introCountdownLabel = nonEmptyString(module.introCountdownLabel) || '准备'

  plan.push({
    key: 'intro',
    step: {
      kind: 'intro',
      showTitle: module.introShowTitle !== false,
      showTitleDescription: module.introShowTitleDescription !== false,
      showDescription: module.introShowDescription !== false,
      autoNext: 'audioEnded'
    }
  })

  if (introCountdownEnabled && introCountdownSeconds > 0) {
    plan.push({
      key: 'intro.countdown',
      step: {
        kind: 'countdown',
        showTitle: module.introCountdownShowTitle !== false,
        seconds: introCountdownSeconds,
        label: introCountdownLabel,
        autoNext: 'countdownEnded'
      }
    })
  }

  const groups = question?.content?.groups || []
  groups.forEach((g: ListeningChoiceGroup, gIndex: number) => {
    const groupId = g?.id ? String(g.id) : ''
    const perSteps = Array.isArray(module.perGroupSteps) ? module.perGroupSteps : []
    const kindCount: Record<string, number> = {}
    const perQuestionIds = Array.isArray(g?.subQuestions) && g.subQuestions.length > 0
      ? g.subQuestions.map((sq) => String(sq?.id || '')).filter(Boolean)
      : ['']

    const appendPlanByDef = (def: PerGroupStepDef, questionId?: string) => {
      const kind = String(def?.kind || '')
      kindCount[kind] = (kindCount[kind] || 0) + 1
      const suffix = kindCount[kind] > 1 ? String(kindCount[kind]) : ''
      const key = `g${gIndex}.${kind}${suffix}`

      if (def.kind === 'playAudio') {
        plan.push({
          key,
          step: {
            kind: 'playAudio',
            groupId,
            audioSource: normalizeAudioSource(def?.audioSource),
            showTitle: typeof def.showTitle === 'boolean' ? def.showTitle : true,
            showQuestionTitle: typeof def.showQuestionTitle === 'boolean' ? def.showQuestionTitle : true,
            showQuestionTitleDescription: typeof def.showQuestionTitleDescription === 'boolean' ? def.showQuestionTitleDescription : true,
            showGroupPrompt: typeof def.showGroupPrompt === 'boolean' ? def.showGroupPrompt : true,
            autoNext: 'audioEnded'
          }
        })
        return
      }

      if (def.kind === 'countdown') {
        const seconds = Math.max(0, toInt(g.prepareSeconds, Math.max(0, toInt(def.seconds, 3))))
        const label = typeof def?.label === 'string' ? def.label : '准备'
        plan.push({
          key,
          step: {
            kind: 'countdown',
            showTitle: typeof def.showTitle === 'boolean' ? def.showTitle : true,
            seconds,
            label,
            autoNext: 'countdownEnded'
          }
        })
        return
      }

      if (def.kind === 'promptTone') {
        const url = typeof def?.url === 'string' ? def.url : '/static/audio/small_time.mp3'
        plan.push({
          key,
          step: {
            kind: 'promptTone',
            groupId,
            showTitle: typeof def.showTitle === 'boolean' ? def.showTitle : true,
            url,
            autoNext: 'audioEnded'
          }
        })
        return
      }

      if (def.kind === 'answerChoice') {
        const answerSeconds = Math.max(0, toInt(g.answerSeconds, 0))
        plan.push({
          key,
          step: {
            kind: 'answerChoice',
            groupId,
            questionIds: hearAnswerVariant && questionId ? [String(questionId)] : undefined,
            showTitle: typeof def.showTitle === 'boolean' ? def.showTitle : true,
            showQuestionTitle: typeof def.showQuestionTitle === 'boolean' ? def.showQuestionTitle : true,
            showQuestionTitleDescription: typeof def.showQuestionTitleDescription === 'boolean' ? def.showQuestionTitleDescription : true,
            showGroupPrompt: typeof def.showGroupPrompt === 'boolean' ? def.showGroupPrompt : true,
            autoNext: answerSeconds > 0 ? 'timeEnded' : 'tapNext'
          }
        })
      }
    }

    if (!hearAnswerVariant) {
      perSteps.forEach((def) => appendPlanByDef(def))
      return
    }

    // Hear-answer variant runs per-question recording loops:
    // group-level steps run once before the loop, promptTone/answerChoice repeat for each sub-question.
    perQuestionIds.forEach((questionId, questionIndex) => {
      perSteps.forEach((def) => {
        const kind = String(def?.kind || '')
        const isPerQuestionStep = kind === 'promptTone' || kind === 'answerChoice'
        if (!isPerQuestionStep && questionIndex > 0) return
        appendPlanByDef(def, questionId)
      })
    })
  })

  return plan
}

export interface ListeningChoiceCompileResult {
  steps: ListeningChoiceFlowStep[]
  keys: string[]
}

export function compileListeningChoiceFlow(
  question: ListeningChoiceCompileQuestion,
  module: ListeningChoiceFlowModuleV1,
  opts?: { generateId?: IdFactory; overrides?: FlowOverrides }
): ListeningChoiceCompileResult {
  const generateId = opts?.generateId || defaultGenerateId
  const overrides = opts?.overrides || {}
  const plan = compilePlan(question, module)
  const steps = plan.map(({ key, step }) => applyOverride(toPlanStep(step, generateId), overrides[key]))
  return {
    keys: plan.map(p => p.key),
    steps
  }
}
