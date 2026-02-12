// Pure helpers for listening_choice flow modules (standard + library templates).
// Intentionally no uni-app imports so this can be unit-tested in Node.
import { compileListeningChoiceFlow } from '../engine/flow/listening-choice/compiler.ts'

export const LISTENING_CHOICE_STANDARD_FLOW_ID = 'listening_choice.standard.v1'

type IdFactory = () => string
type ListeningChoiceAudioSource = 'description' | 'content'

export type ListeningChoiceStandardPerGroupStepDef =
  | {
      kind: 'playAudio'
      showTitle?: boolean
      audioSource: ListeningChoiceAudioSource
      showQuestionTitle?: boolean
      showQuestionTitleDescription?: boolean
      showGroupPrompt?: boolean
    }
  | { kind: 'countdown'; showTitle?: boolean; seconds?: number; label?: string }
  | { kind: 'promptTone'; showTitle?: boolean; url?: string }
  | {
      kind: 'answerChoice'
      showTitle?: boolean
      showQuestionTitle?: boolean
      showQuestionTitleDescription?: boolean
      showGroupPrompt?: boolean
    }

export interface ListeningChoiceStandardFlowModuleV1 {
  version: 1
  id: string
  introShowTitle?: boolean
  introShowTitleDescription?: boolean
  introShowDescription?: boolean
  introCountdownEnabled?: boolean
  introCountdownShowTitle?: boolean
  introCountdownSeconds?: number
  introCountdownLabel?: string
  perGroupSteps: ListeningChoiceStandardPerGroupStepDef[]
}

export type ListeningChoiceFlowModuleIssueLevel = 'error' | 'warning'

export interface ListeningChoiceFlowModuleValidationIssue {
  level: ListeningChoiceFlowModuleIssueLevel
  code: string
  message: string
}

export interface ListeningChoiceFlowModuleValidationResult {
  ok: boolean
  issues: ListeningChoiceFlowModuleValidationIssue[]
  errors: ListeningChoiceFlowModuleValidationIssue[]
  warnings: ListeningChoiceFlowModuleValidationIssue[]
}

export const DEFAULT_LISTENING_CHOICE_STANDARD_MODULE: ListeningChoiceStandardFlowModuleV1 = {
  version: 1,
  id: LISTENING_CHOICE_STANDARD_FLOW_ID,
  introShowTitle: true,
  introShowTitleDescription: true,
  introShowDescription: true,
  introCountdownEnabled: false,
  introCountdownShowTitle: true,
  introCountdownSeconds: 3,
  introCountdownLabel: '准备',
  perGroupSteps: [
    { kind: 'playAudio', showTitle: true, audioSource: 'description', showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true },
    { kind: 'countdown', showTitle: true, seconds: 3, label: '准备' },
    { kind: 'playAudio', showTitle: true, audioSource: 'content', showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true },
    { kind: 'answerChoice', showTitle: true, showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true }
  ]
}

function defaultGenerateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function toInt(v: any, fallback = 0): number {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function getBool(step: any, key: string, defaultValue: boolean) {
  const v = step?.[key]
  if (typeof v === 'boolean') return v
  return defaultValue
}

function getIntroBool(module: any, key: string, defaultValue = true) {
  const v = module?.[key]
  if (typeof v === 'boolean') return v
  return defaultValue
}

function nonEmptyString(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s : undefined
}

function normalizeAudioSource(v: any): ListeningChoiceAudioSource {
  return v === 'description' ? 'description' : 'content'
}

function getGroupIndexById(question: any): Record<string, number> {
  const map: Record<string, number> = {}
  const groups = question?.content?.groups || []
  groups.forEach((g: any, idx: number) => {
    if (g?.id) map[String(g.id)] = idx
  })
  return map
}

function getQuestionOrderById(question: any): Record<string, number> {
  const map: Record<string, number> = {}
  const groups = question?.content?.groups || []
  groups.forEach((g: any) => {
    ;(g?.subQuestions || []).forEach((sq: any) => {
      if (sq?.id) map[String(sq.id)] = toInt(sq.order, 0)
    })
  })
  return map
}

function getQuestionIdByOrder(question: any): Record<number, string> {
  const map: Record<number, string> = {}
  const groups = question?.content?.groups || []
  groups.forEach((g: any) => {
    ;(g?.subQuestions || []).forEach((sq: any) => {
      const order = toInt(sq?.order, 0)
      const id = sq?.id ? String(sq.id) : ''
      if (order > 0 && id) map[order] = id
    })
  })
  return map
}

function applyStandardOverride(step: any, override: any | undefined): any {
  if (!override || typeof override !== 'object') return step
  const kind = step?.kind

  const next: any = { ...step }

  // Whitelist per kind.
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

export function normalizeListeningChoiceStandardModule(input: any): ListeningChoiceStandardFlowModuleV1 {
  try {
    const src = input && typeof input === 'object' ? input : {}

    const introShowTitle = typeof src.introShowTitle === 'boolean' ? src.introShowTitle : DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.introShowTitle
    const introShowTitleDescription = typeof src.introShowTitleDescription === 'boolean' ? src.introShowTitleDescription : DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.introShowTitleDescription
    const introShowDescription = typeof src.introShowDescription === 'boolean' ? src.introShowDescription : DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.introShowDescription
    const introCountdownEnabled = typeof src.introCountdownEnabled === 'boolean' ? src.introCountdownEnabled : DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.introCountdownEnabled
    const introCountdownShowTitle = typeof src.introCountdownShowTitle === 'boolean' ? src.introCountdownShowTitle : DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.introCountdownShowTitle
    const introCountdownSeconds = Math.max(0, toInt(src.introCountdownSeconds, toInt(DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.introCountdownSeconds, 3)))
    const introCountdownLabel = typeof src.introCountdownLabel === 'string' ? src.introCountdownLabel : String(DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.introCountdownLabel || '准备')

    const perGroupStepsRaw = Array.isArray(src.perGroupSteps) ? src.perGroupSteps : []
    const allowed = new Set(['playAudio', 'countdown', 'promptTone', 'answerChoice'])
    const perGroupSteps: ListeningChoiceStandardPerGroupStepDef[] = perGroupStepsRaw
      .filter((s: any) => s && typeof s === 'object' && allowed.has(String(s.kind || '')))
      .map((s: any) => {
        const kind = String(s.kind)
        const showTitle = typeof s.showTitle === 'boolean' ? s.showTitle : true
        if (kind === 'playAudio') {
          const audioSource = normalizeAudioSource(s.audioSource)
          const showQuestionTitle = typeof s.showQuestionTitle === 'boolean' ? s.showQuestionTitle : true
          const showQuestionTitleDescription = typeof s.showQuestionTitleDescription === 'boolean' ? s.showQuestionTitleDescription : true
          const showGroupPrompt = typeof s.showGroupPrompt === 'boolean' ? s.showGroupPrompt : true
          return { kind: 'playAudio', showTitle, audioSource, showQuestionTitle, showQuestionTitleDescription, showGroupPrompt }
        }
        if (kind === 'countdown') {
          const seconds = Math.max(0, toInt(s.seconds, 3))
          const label = typeof s.label === 'string' ? s.label : '准备'
          return { kind: 'countdown', showTitle, seconds, label }
        }
        if (kind === 'promptTone') {
          const url = typeof s.url === 'string' ? s.url : '/static/audio/small_time.mp3'
          return { kind: 'promptTone', showTitle, url }
        }
        if (kind === 'answerChoice') {
          const showQuestionTitle = typeof s.showQuestionTitle === 'boolean' ? s.showQuestionTitle : true
          const showQuestionTitleDescription = typeof s.showQuestionTitleDescription === 'boolean' ? s.showQuestionTitleDescription : true
          const showGroupPrompt = typeof s.showGroupPrompt === 'boolean' ? s.showGroupPrompt : true
          return { kind: 'answerChoice', showTitle, showQuestionTitle, showQuestionTitleDescription, showGroupPrompt }
        }
        return { kind: 'playAudio', showTitle, audioSource: 'content', showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true }
      })

    return {
      version: 1,
      id: LISTENING_CHOICE_STANDARD_FLOW_ID,
      introShowTitle,
      introShowTitleDescription,
      introShowDescription,
      introCountdownEnabled,
      introCountdownShowTitle,
      introCountdownSeconds,
      introCountdownLabel,
      perGroupSteps: perGroupSteps.length ? perGroupSteps : DEFAULT_LISTENING_CHOICE_STANDARD_MODULE.perGroupSteps
    }
  } catch {
    return DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
  }
}

function pushValidationIssue(
  issues: ListeningChoiceFlowModuleValidationIssue[],
  level: ListeningChoiceFlowModuleIssueLevel,
  code: string,
  message: string
) {
  issues.push({ level, code, message })
}

export function validateListeningChoiceStandardModule(input: any): ListeningChoiceFlowModuleValidationResult {
  const src = input && typeof input === 'object' ? input : {}
  const rawSteps = Array.isArray(src.perGroupSteps) ? src.perGroupSteps.filter((s: any) => s && typeof s === 'object') : []
  const normalized = normalizeListeningChoiceStandardModule(src)
  const issues: ListeningChoiceFlowModuleValidationIssue[] = []

  if (!Array.isArray(src.perGroupSteps) || rawSteps.length === 0) {
    pushValidationIssue(
      issues,
      'error',
      'empty_per_group_steps',
      '每题组流程至少需要 1 个步骤。'
    )
  }

  const kinds = new Set(['playAudio', 'countdown', 'promptTone', 'answerChoice'])
  rawSteps.forEach((step: any, idx: number) => {
    const kind = String(step?.kind || '')
    if (!kinds.has(kind)) {
      pushValidationIssue(
        issues,
        'error',
        'invalid_step_kind',
        `第 ${idx + 1} 个每题组步骤类型无效：${kind || '空'}`
      )
      return
    }
    if (kind === 'promptTone') {
      const url = nonEmptyString(step?.url)
      if (!url) {
        pushValidationIssue(
          issues,
          'warning',
          'prompt_tone_missing_url',
          `第 ${idx + 1} 个提示音步骤未填写 URL，将使用默认提示音。`
        )
      }
    }
  })

  const perGroupSteps = Array.isArray(normalized.perGroupSteps) ? normalized.perGroupSteps : []
  const answerChoiceCount = perGroupSteps.filter(s => s?.kind === 'answerChoice').length
  const descriptionAudioCount = perGroupSteps.filter((s: any) => s?.kind === 'playAudio' && s?.audioSource === 'description').length
  const contentAudioCount = perGroupSteps.filter((s: any) => s?.kind === 'playAudio' && s?.audioSource === 'content').length
  const countdownCount = perGroupSteps.filter(s => s?.kind === 'countdown').length

  if (answerChoiceCount <= 0) {
    pushValidationIssue(issues, 'error', 'missing_answer_choice', '每题组流程至少需要 1 个「开始答题」步骤。')
  }
  if (descriptionAudioCount <= 0) {
    pushValidationIssue(issues, 'error', 'missing_description_audio', '每题组流程至少需要 1 个「播放描述音频」步骤。')
  }
  if (contentAudioCount <= 0) {
    pushValidationIssue(issues, 'error', 'missing_content_audio', '每题组流程至少需要 1 个「播放正文音频」步骤。')
  }
  if (countdownCount <= 0) {
    pushValidationIssue(issues, 'warning', 'missing_group_countdown', '当前流程没有每题组倒计时步骤。')
  }
  if (answerChoiceCount > 1) {
    pushValidationIssue(issues, 'warning', 'multiple_answer_choice', `当前流程包含 ${answerChoiceCount} 个答题步骤，请确认是否符合预期。`)
  }

  if (normalized.introCountdownEnabled !== false && Math.max(0, toInt(normalized.introCountdownSeconds, 0)) <= 0) {
    pushValidationIssue(
      issues,
      'warning',
      'intro_countdown_zero',
      '介绍页倒计时已启用但秒数为 0，实际不会产生倒计时步骤。'
    )
  }

  return {
    ok: issues.every(item => item.level !== 'error'),
    issues,
    errors: issues.filter(item => item.level === 'error'),
    warnings: issues.filter(item => item.level === 'warning')
  }
}

function buildListeningChoiceStandardPlan(question: any, moduleInput: any) {
  const module = normalizeListeningChoiceStandardModule(moduleInput)
  const introCountdownEnabled = module.introCountdownEnabled !== false
  const introCountdownSeconds = Math.max(0, toInt(module.introCountdownSeconds, 3))
  const introCountdownLabel = nonEmptyString(module.introCountdownLabel) || '准备'

  const plan: { key: string; step: any }[] = []
  plan.push({
    key: 'intro',
    step: {
      kind: 'intro',
      showTitle: getIntroBool(module, 'introShowTitle', true),
      showTitleDescription: getIntroBool(module, 'introShowTitleDescription', true),
      showDescription: getIntroBool(module, 'introShowDescription', true),
      autoNext: 'audioEnded'
    }
  })

  if (introCountdownEnabled && introCountdownSeconds > 0) {
    plan.push({
      key: 'intro.countdown',
      step: {
        kind: 'countdown',
        showTitle: module.introCountdownShowTitle ?? true,
        seconds: introCountdownSeconds,
        label: introCountdownLabel,
        autoNext: 'countdownEnded'
      }
    })
  }

  const groups = question?.content?.groups || []
  groups.forEach((g: any, idx: number) => {
    const groupId = g?.id ? String(g.id) : ''

    const kindCount: Record<string, number> = {}
      ;(module.perGroupSteps || []).forEach((def: any) => {
        const kind = String(def?.kind || '')
        kindCount[kind] = (kindCount[kind] || 0) + 1
        const suffix = kindCount[kind] > 1 ? String(kindCount[kind]) : ''
        const key = `g${idx}.${kind}${suffix}`

        if (kind === 'playAudio') {
          plan.push({
            key,
            step: {
              kind: 'playAudio',
              showTitle: getBool(def, 'showTitle', true),
              audioSource: normalizeAudioSource(def?.audioSource),
              showQuestionTitle: getBool(def, 'showQuestionTitle', true),
              showQuestionTitleDescription: getBool(def, 'showQuestionTitleDescription', true),
              showGroupPrompt: getBool(def, 'showGroupPrompt', true),
              groupId,
              autoNext: 'audioEnded'
            }
          })
          return
        }

      if (kind === 'countdown') {
        const seconds = Math.max(0, toInt(g?.prepareSeconds, Math.max(0, toInt(def?.seconds, 3))))
        const label = typeof def?.label === 'string' ? def.label : '准备'
        plan.push({ key, step: { kind: 'countdown', showTitle: getBool(def, 'showTitle', true), seconds, label, autoNext: 'countdownEnded' } })
        return
      }

      if (kind === 'promptTone') {
        const url = typeof def?.url === 'string' ? def.url : '/static/audio/small_time.mp3'
        plan.push({
          key,
          step: { kind: 'promptTone', showTitle: getBool(def, 'showTitle', true), url, groupId, autoNext: 'audioEnded' }
        })
        return
      }

      if (kind === 'answerChoice') {
        const answerSeconds = Math.max(0, toInt(g?.answerSeconds, 0))
        plan.push({
          key,
          step: {
            kind: 'answerChoice',
            showTitle: getBool(def, 'showTitle', true),
            showQuestionTitle: getBool(def, 'showQuestionTitle', true),
            showQuestionTitleDescription: getBool(def, 'showQuestionTitleDescription', true),
            showGroupPrompt: getBool(def, 'showGroupPrompt', true),
            groupId,
            autoNext: answerSeconds > 0 ? 'timeEnded' : 'tapNext'
          }
        })
        return
      }
    })
  })

  return plan
}

// NOTE: Implemented as pure functions with dependency injection for ID generation,
// so callers can reuse /templates.generateId while tests can pass a deterministic stub.
export function materializeListeningChoiceStandardSteps(
  question: any,
  opts?: { generateId?: IdFactory; overrides?: Record<string, any>; module?: ListeningChoiceStandardFlowModuleV1 }
) {
  const generateId = opts?.generateId || defaultGenerateId
  const overrides = opts?.overrides || {}
  const module = normalizeListeningChoiceStandardModule(opts?.module || DEFAULT_LISTENING_CHOICE_STANDARD_MODULE)
  const compiled = compileListeningChoiceFlow(question as any, {
    kind: 'listening_choice',
    id: module.id,
    version: 1,
    name: '听后选择标准流程',
    introShowTitle: module.introShowTitle,
    introShowTitleDescription: module.introShowTitleDescription,
    introShowDescription: module.introShowDescription,
    introCountdownEnabled: module.introCountdownEnabled,
    introCountdownShowTitle: module.introCountdownShowTitle,
    introCountdownSeconds: module.introCountdownSeconds,
    introCountdownLabel: module.introCountdownLabel,
    perGroupSteps: module.perGroupSteps as any
  }, {
    generateId,
    overrides
  })
  return compiled.steps as any
}

export function detectListeningChoiceStandardFlowOverrides(question: any, currentSteps: any[], opts?: { module?: ListeningChoiceStandardFlowModuleV1 }) {
  const module = opts?.module || DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
  const plan = buildListeningChoiceStandardPlan(question, module)
  if (!Array.isArray(currentSteps) || currentSteps.length !== plan.length) return { ok: false, overrides: {}, nextQuestion: question }

  // 1) Structural match check (ignore whitelisted param differences).
  for (let i = 0; i < plan.length; i += 1) {
    const expected = plan[i].step
    const actual = currentSteps[i]
    if (!actual || actual.kind !== expected.kind) return { ok: false, overrides: {}, nextQuestion: question }

    if (expected.kind === 'groupPrompt') {
      if (String(actual.groupId || '') !== String(expected.groupId || '')) return { ok: false, overrides: {}, nextQuestion: question }
      if (String(actual.autoNext || '') !== String(expected.autoNext || '')) return { ok: false, overrides: {}, nextQuestion: question }
      continue
    }

    // Structural expectations.
    if (expected.kind === 'playAudio') {
      if (String(actual.groupId || '') !== String(expected.groupId || '')) return { ok: false, overrides: {}, nextQuestion: question }
      if (String(actual.autoNext || '') !== String(expected.autoNext || '')) return { ok: false, overrides: {}, nextQuestion: question }
      if (String(actual.audioSource || '') !== String((expected as any).audioSource || '')) return { ok: false, overrides: {}, nextQuestion: question }
      continue
    }

    if (expected.kind === 'answerChoice') {
      const ids = Array.isArray(actual.questionIds) ? actual.questionIds : []
      if (ids.length > 0) return { ok: false, overrides: {}, nextQuestion: question }
      if (String(actual.groupId || '') !== String(expected.groupId || '')) return { ok: false, overrides: {}, nextQuestion: question }
      if (String(actual.autoNext || '') !== String(expected.autoNext || '')) return { ok: false, overrides: {}, nextQuestion: question }
      continue
    }

    if (expected.kind === 'promptTone') {
      if (String(actual.groupId || '') !== String(expected.groupId || '')) return { ok: false, overrides: {}, nextQuestion: question }
      if (String(actual.autoNext || '') !== String(expected.autoNext || '')) return { ok: false, overrides: {}, nextQuestion: question }
      continue
    }

    if (expected.kind === 'intro' || expected.kind === 'countdown') {
      if (String(actual.autoNext || '') !== String(expected.autoNext || '')) return { ok: false, overrides: {}, nextQuestion: question }
      continue
    }

    // Unknown kinds are not considered standard.
    return { ok: false, overrides: {}, nextQuestion: question }
  }

  // 2) Compute overrides (only whitelisted param differences).
  const overrides: Record<string, any> = {}
  for (let i = 0; i < plan.length; i += 1) {
    const { key, step: expected } = plan[i]
    const actual = currentSteps[i] || {}
    const patch: Record<string, any> = {}

    // showTitle is whitelisted for all standard steps
    const expectedShowTitle = getBool(expected, 'showTitle', true)
    const actualShowTitle = getBool(actual, 'showTitle', true)
    if (actualShowTitle !== expectedShowTitle) patch.showTitle = actualShowTitle

    if (expected.kind === 'intro') {
      const expectedShowTitleDescription = getBool(expected, 'showTitleDescription', true)
      const actualShowTitleDescription = getBool(actual, 'showTitleDescription', true)
      if (actualShowTitleDescription !== expectedShowTitleDescription) patch.showTitleDescription = actualShowTitleDescription

      const expectedShowDescription = getBool(expected, 'showDescription', true)
      const actualShowDescription = getBool(actual, 'showDescription', true)
      if (actualShowDescription !== expectedShowDescription) patch.showDescription = actualShowDescription
    }

    if (expected.kind === 'countdown') {
      const expectedLabel = typeof expected.label === 'string' ? expected.label : ''
      const actualLabel = typeof actual.label === 'string' ? actual.label : expectedLabel
      if (actualLabel !== expectedLabel) patch.label = actualLabel
    }

    if (expected.kind === 'answerChoice') {
      const expectedShowQuestionTitle = getBool(expected, 'showQuestionTitle', true)
      const actualShowQuestionTitle = getBool(actual, 'showQuestionTitle', true)
      if (actualShowQuestionTitle !== expectedShowQuestionTitle) patch.showQuestionTitle = actualShowQuestionTitle

      const expectedShowQuestionTitleDescription = getBool(expected, 'showQuestionTitleDescription', true)
      const actualShowQuestionTitleDescription = getBool(actual, 'showQuestionTitleDescription', true)
      if (actualShowQuestionTitleDescription !== expectedShowQuestionTitleDescription) patch.showQuestionTitleDescription = actualShowQuestionTitleDescription

      const expectedShowGroupPrompt = getBool(expected, 'showGroupPrompt', true)
      const actualShowGroupPrompt = getBool(actual, 'showGroupPrompt', true)
      if (actualShowGroupPrompt !== expectedShowGroupPrompt) patch.showGroupPrompt = actualShowGroupPrompt
    }

    if (expected.kind === 'playAudio') {
      const expectedShowQuestionTitle = getBool(expected, 'showQuestionTitle', true)
      const actualShowQuestionTitle = getBool(actual, 'showQuestionTitle', true)
      if (actualShowQuestionTitle !== expectedShowQuestionTitle) patch.showQuestionTitle = actualShowQuestionTitle

      const expectedShowQuestionTitleDescription = getBool(expected, 'showQuestionTitleDescription', true)
      const actualShowQuestionTitleDescription = getBool(actual, 'showQuestionTitleDescription', true)
      if (actualShowQuestionTitleDescription !== expectedShowQuestionTitleDescription) patch.showQuestionTitleDescription = actualShowQuestionTitleDescription

      const expectedShowGroupPrompt = getBool(expected, 'showGroupPrompt', true)
      const actualShowGroupPrompt = getBool(actual, 'showGroupPrompt', true)
      if (actualShowGroupPrompt !== expectedShowGroupPrompt) patch.showGroupPrompt = actualShowGroupPrompt
    }

    if (expected.kind === 'promptTone') {
      const expectedUrl = typeof expected.url === 'string' ? expected.url : ''
      const actualUrl = typeof actual.url === 'string' ? actual.url : expectedUrl
      if (actualUrl !== expectedUrl) patch.url = actualUrl
    }

    if (Object.keys(patch).length > 0) overrides[key] = patch
  }

  return { ok: true, overrides, nextQuestion: question }
}

export function concreteListeningChoiceStepsToTemplate(question: any, steps: any[]) {
  const groupIndexById = getGroupIndexById(question)
  const orderByQuestionId = getQuestionOrderById(question)

  const out: any[] = []

  for (let i = 0; i < (steps || []).length; i += 1) {
    const s = steps[i]
    if (!s || typeof s !== 'object') continue

    const base: any = { kind: s.kind }
    if (typeof s.showTitle === 'boolean') base.showTitle = s.showTitle
    if (typeof s.autoNext === 'string') base.autoNext = s.autoNext

    if (s.kind === 'intro') {
      if (typeof s.showTitleDescription === 'boolean') base.showTitleDescription = s.showTitleDescription
      if (typeof s.showDescription === 'boolean') base.showDescription = s.showDescription
    }

    if (s.kind === 'countdown') {
      if (typeof s.seconds === 'number') base.seconds = Math.max(0, Math.floor(s.seconds))
      if (typeof s.label === 'string') base.label = s.label

      const prev: any = steps[i - 1]
      if (prev?.kind === 'intro') {
        base.context = { kind: 'intro' }
      } else {
        const next: any = steps[i + 1]
        const groupId = (prev && typeof prev.groupId === 'string' ? prev.groupId : undefined) || (next && typeof next.groupId === 'string' ? next.groupId : undefined)
        const gi = groupId ? groupIndexById[String(groupId)] : undefined
        if (typeof gi === 'number') base.context = { kind: 'group', groupIndex: gi }
      }
    }

    if (s.kind === 'playAudio' || s.kind === 'groupPrompt' || s.kind === 'promptTone') {
      const gi = groupIndexById[String(s.groupId || '')]
      if (typeof gi === 'number') base.groupIndex = gi
      if (s.kind === 'playAudio') base.audioSource = normalizeAudioSource((s as any).audioSource)
      if (s.kind === 'promptTone' && typeof (s as any).url === 'string') base.url = (s as any).url
    }

    if (s.kind === 'answerChoice') {
      if (typeof s.showQuestionTitle === 'boolean') base.showQuestionTitle = s.showQuestionTitle
      if (typeof s.showQuestionTitleDescription === 'boolean') base.showQuestionTitleDescription = s.showQuestionTitleDescription
      if (typeof s.showGroupPrompt === 'boolean') base.showGroupPrompt = s.showGroupPrompt

      const ids = Array.isArray(s.questionIds) ? s.questionIds : []
      if (ids.length > 0) {
        const orders = ids
          .map((id: any) => orderByQuestionId[String(id)] || 0)
          .filter((n: number) => n > 0)
          .sort((a: number, b: number) => a - b)
        base.questionOrders = orders
      } else {
        const gi = groupIndexById[String(s.groupId || '')]
        if (typeof gi === 'number') base.groupIndex = gi
      }
    }

    if (s.kind === 'playAudio') {
      if (typeof s.showQuestionTitle === 'boolean') base.showQuestionTitle = s.showQuestionTitle
      if (typeof s.showQuestionTitleDescription === 'boolean') base.showQuestionTitleDescription = s.showQuestionTitleDescription
      if (typeof s.showGroupPrompt === 'boolean') base.showGroupPrompt = s.showGroupPrompt
    }

    if (s.kind === 'finish') {
      if (typeof s.text === 'string') base.text = s.text
    }

    out.push(base)
  }

  return out
}

export function materializeListeningChoiceTemplateSteps(question: any, templateSteps: any[], opts?: { generateId?: IdFactory }) {
  const generateId = opts?.generateId || defaultGenerateId
  const groups = question?.content?.groups || []
  const idByOrder = getQuestionIdByOrder(question)

  const out: any[] = []
  for (const s of templateSteps || []) {
    if (!s || typeof s !== 'object') continue

    const step: any = { id: generateId(), kind: s.kind }
    if (typeof s.showTitle === 'boolean') step.showTitle = s.showTitle
    if (typeof s.autoNext === 'string') step.autoNext = s.autoNext

    if (s.kind === 'intro') {
      if (typeof s.showTitleDescription === 'boolean') step.showTitleDescription = s.showTitleDescription
      if (typeof s.showDescription === 'boolean') step.showDescription = s.showDescription
    }

    if (s.kind === 'countdown') {
      if (typeof s.seconds === 'number') step.seconds = Math.max(0, Math.floor(s.seconds))
      if (typeof s.label === 'string') step.label = s.label
    }

    if (s.kind === 'playAudio' || s.kind === 'groupPrompt' || s.kind === 'promptTone') {
      const gi = typeof s.groupIndex === 'number' ? s.groupIndex : -1
      const groupId = gi >= 0 && groups[gi]?.id ? String(groups[gi].id) : undefined
      if (groupId) step.groupId = groupId
      if (s.kind === 'playAudio') step.audioSource = normalizeAudioSource((s as any).audioSource)
      if (s.kind === 'promptTone' && typeof s.url === 'string') step.url = s.url
    }

    if (s.kind === 'answerChoice') {
      if (typeof s.showQuestionTitle === 'boolean') step.showQuestionTitle = s.showQuestionTitle
      if (typeof s.showQuestionTitleDescription === 'boolean') step.showQuestionTitleDescription = s.showQuestionTitleDescription
      if (typeof s.showGroupPrompt === 'boolean') step.showGroupPrompt = s.showGroupPrompt

      const orders = Array.isArray(s.questionOrders) ? s.questionOrders : []
      if (orders.length > 0) {
        const ids = orders.map((o: any) => idByOrder[toInt(o, 0)]).filter(Boolean)
        if (ids.length > 0) step.questionIds = ids
      } else if (typeof s.groupIndex === 'number') {
        const gi = s.groupIndex
        const groupId = gi >= 0 && groups[gi]?.id ? String(groups[gi].id) : undefined
        if (groupId) step.groupId = groupId
      }
    }

    if (s.kind === 'playAudio') {
      if (typeof s.showQuestionTitle === 'boolean') step.showQuestionTitle = s.showQuestionTitle
      if (typeof s.showQuestionTitleDescription === 'boolean') step.showQuestionTitleDescription = s.showQuestionTitleDescription
      if (typeof s.showGroupPrompt === 'boolean') step.showGroupPrompt = s.showGroupPrompt
    }

    if (s.kind === 'finish') {
      if (typeof s.text === 'string') step.text = s.text
    }

    out.push(step)
  }

  return out
}

function stableStringify(value: any): string {
  if (value === null) return 'null'
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (t !== 'object') return JSON.stringify(value)

  const keys = Object.keys(value).sort()
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5 // 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    // 32-bit FNV-1a: hash *= 16777619 (with overflow)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function hashFlowTemplate(templateSteps: any[]) {
  const normalized = stableStringify(templateSteps || [])
  return fnv1a32(normalized).toString(36)
}
