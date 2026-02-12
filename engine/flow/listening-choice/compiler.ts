import type {
  ListeningChoiceFlowStep,
  ListeningChoiceQuestion,
  ListeningChoiceFlowModuleV1
} from '/types'

type IdFactory = () => string

function defaultGenerateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function toInt(v: any, fallback = 0): number {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function nonEmptyString(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s : undefined
}

function getBool(step: any, key: string, defaultValue: boolean) {
  const v = step?.[key]
  if (typeof v === 'boolean') return v
  return defaultValue
}

function normalizeAudioSource(v: any): 'description' | 'content' {
  return v === 'description' ? 'description' : 'content'
}

function applyOverride(step: any, override: any | undefined): any {
  if (!override || typeof override !== 'object') return step
  const kind = step?.kind
  const next: any = { ...step }

  if (kind === 'intro') {
    if (typeof override.showTitle === 'boolean') next.showTitle = override.showTitle
    if (typeof override.showTitleDescription === 'boolean') next.showTitleDescription = override.showTitleDescription
    if (typeof override.showDescription === 'boolean') next.showDescription = override.showDescription
    return next
  }

  if (kind === 'playAudio') {
    if (typeof override.showTitle === 'boolean') next.showTitle = override.showTitle
    if (typeof override.showQuestionTitle === 'boolean') next.showQuestionTitle = override.showQuestionTitle
    if (typeof override.showQuestionTitleDescription === 'boolean') next.showQuestionTitleDescription = override.showQuestionTitleDescription
    if (typeof override.showGroupPrompt === 'boolean') next.showGroupPrompt = override.showGroupPrompt
    return next
  }

  if (kind === 'countdown') {
    if (typeof override.showTitle === 'boolean') next.showTitle = override.showTitle
    if (typeof override.label === 'string') next.label = override.label
    return next
  }

  if (kind === 'promptTone') {
    if (typeof override.showTitle === 'boolean') next.showTitle = override.showTitle
    if (typeof override.url === 'string') next.url = override.url
    return next
  }

  if (kind === 'answerChoice') {
    if (typeof override.showTitle === 'boolean') next.showTitle = override.showTitle
    if (typeof override.showQuestionTitle === 'boolean') next.showQuestionTitle = override.showQuestionTitle
    if (typeof override.showQuestionTitleDescription === 'boolean') next.showQuestionTitleDescription = override.showQuestionTitleDescription
    if (typeof override.showGroupPrompt === 'boolean') next.showGroupPrompt = override.showGroupPrompt
    return next
  }

  return step
}

function compilePlan(question: ListeningChoiceQuestion, module: ListeningChoiceFlowModuleV1) {
  const plan: Array<{ key: string; step: any }> = []

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
  groups.forEach((g: any, gIndex: number) => {
    const groupId = g?.id ? String(g.id) : ''
    const perSteps = Array.isArray(module.perGroupSteps) ? module.perGroupSteps : []
    const kindCount: Record<string, number> = {}

    perSteps.forEach((def: any) => {
      const kind = String(def?.kind || '')
      kindCount[kind] = (kindCount[kind] || 0) + 1
      const suffix = kindCount[kind] > 1 ? String(kindCount[kind]) : ''
      const key = `g${gIndex}.${kind}${suffix}`

      if (kind === 'playAudio') {
        plan.push({
          key,
          step: {
            kind: 'playAudio',
            groupId,
            audioSource: normalizeAudioSource(def?.audioSource),
            showTitle: getBool(def, 'showTitle', true),
            showQuestionTitle: getBool(def, 'showQuestionTitle', true),
            showQuestionTitleDescription: getBool(def, 'showQuestionTitleDescription', true),
            showGroupPrompt: getBool(def, 'showGroupPrompt', true),
            autoNext: 'audioEnded'
          }
        })
        return
      }

      if (kind === 'countdown') {
        const seconds = Math.max(0, toInt((g as any)?.prepareSeconds, Math.max(0, toInt(def?.seconds, 3))))
        const label = typeof def?.label === 'string' ? def.label : '准备'
        plan.push({
          key,
          step: {
            kind: 'countdown',
            showTitle: getBool(def, 'showTitle', true),
            seconds,
            label,
            autoNext: 'countdownEnded'
          }
        })
        return
      }

      if (kind === 'promptTone') {
        const url = typeof def?.url === 'string' ? def.url : '/static/audio/small_time.mp3'
        plan.push({
          key,
          step: {
            kind: 'promptTone',
            groupId,
            showTitle: getBool(def, 'showTitle', true),
            url,
            autoNext: 'audioEnded'
          }
        })
        return
      }

      if (kind === 'answerChoice') {
        const answerSeconds = Math.max(0, toInt((g as any)?.answerSeconds, 0))
        plan.push({
          key,
          step: {
            kind: 'answerChoice',
            groupId,
            showTitle: getBool(def, 'showTitle', true),
            showQuestionTitle: getBool(def, 'showQuestionTitle', true),
            showQuestionTitleDescription: getBool(def, 'showQuestionTitleDescription', true),
            showGroupPrompt: getBool(def, 'showGroupPrompt', true),
            autoNext: answerSeconds > 0 ? 'timeEnded' : 'tapNext'
          }
        })
      }
    })
  })

  return plan
}

export interface ListeningChoiceCompileResult {
  steps: ListeningChoiceFlowStep[]
  keys: string[]
}

export function compileListeningChoiceFlow(
  question: ListeningChoiceQuestion,
  module: ListeningChoiceFlowModuleV1,
  opts?: { generateId?: IdFactory; overrides?: Record<string, any> }
): ListeningChoiceCompileResult {
  const generateId = opts?.generateId || defaultGenerateId
  const overrides = opts?.overrides || {}
  const plan = compilePlan(question, module)
  const steps = plan.map(({ key, step }) => applyOverride({ id: generateId(), ...step }, overrides[key]))
  return {
    keys: plan.map(p => p.key),
    steps: steps as any
  }
}

