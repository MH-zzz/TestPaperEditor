import type {
  ListeningChoiceStandardFlowModuleV1,
  ListeningChoiceStandardPerGroupStepDef
} from '/flows/listeningChoiceFlowModules'
import type { VisualLinearStep } from './compileGraphToSteps'

export type VisualToModuleIssue = {
  code: string
  message: string
  path: string
}

export type BuildListeningChoiceModuleFromLinearStepsOptions = {
  baseModule: ListeningChoiceStandardFlowModuleV1
  defaultCountdownSeconds?: number
  defaultCountdownLabel?: string
}

export type BuildListeningChoiceModuleFromLinearStepsResult = {
  ok: boolean
  module: ListeningChoiceStandardFlowModuleV1
  errors: VisualToModuleIssue[]
  warnings: VisualToModuleIssue[]
}

type MutableModule = ListeningChoiceStandardFlowModuleV1

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function toInt(value: unknown, fallback = 0): number {
  const n = parseInt(String(value || ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const s = value.trim()
  return s || fallback
}

function issue(code: string, message: string, path: string): VisualToModuleIssue {
  return { code, message, path }
}

const ALLOWED_PER_GROUP_KINDS = new Set(['playAudio', 'countdown', 'promptTone', 'answerChoice'])
const GROUP_ANCHOR_KINDS = new Set(['playAudio', 'promptTone', 'answerChoice', 'groupPrompt'])

function isPerGroupStepKind(kind: string): boolean {
  return ALLOWED_PER_GROUP_KINDS.has(String(kind || ''))
}

function isGroupAnchorKind(kind: string): boolean {
  return GROUP_ANCHOR_KINDS.has(String(kind || ''))
}

function createDefaultDescriptionAudioStep(): ListeningChoiceStandardPerGroupStepDef {
  return {
    kind: 'playAudio',
    showTitle: true,
    audioSource: 'description',
    showQuestionTitle: true,
    showQuestionTitleDescription: true,
    showGroupPrompt: true
  }
}

function createDefaultContentAudioStep(): ListeningChoiceStandardPerGroupStepDef {
  return {
    kind: 'playAudio',
    showTitle: true,
    audioSource: 'content',
    showQuestionTitle: true,
    showQuestionTitleDescription: true,
    showGroupPrompt: true
  }
}

function createDefaultAnswerChoiceStep(): ListeningChoiceStandardPerGroupStepDef {
  return {
    kind: 'answerChoice',
    showTitle: true,
    showQuestionTitle: true,
    showQuestionTitleDescription: true,
    showGroupPrompt: true
  }
}

function buildPerGroupSteps(
  steps: VisualLinearStep[],
  defaultCountdownSeconds: number,
  defaultCountdownLabel: string,
  warnings: VisualToModuleIssue[]
): ListeningChoiceStandardPerGroupStepDef[] {
  const result: ListeningChoiceStandardPerGroupStepDef[] = []
  let audioCount = 0

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]
    const kind = String(step.kind || '').trim()
    if (!isPerGroupStepKind(kind)) {
      warnings.push(issue(
        'unsupported_in_per_group',
        `步骤 ${step.id}(${kind || 'unknown'}) 无法映射到每题组流程，已跳过。`,
        `steps(${i})`
      ))
      continue
    }

    if (kind === 'playAudio') {
      const audioSource = audioCount % 2 === 0 ? 'description' : 'content'
      audioCount += 1
      result.push({
        kind: 'playAudio',
        showTitle: true,
        audioSource,
        showQuestionTitle: true,
        showQuestionTitleDescription: true,
        showGroupPrompt: true
      })
      continue
    }

    if (kind === 'countdown') {
      result.push({
        kind: 'countdown',
        showTitle: true,
        seconds: Math.max(0, defaultCountdownSeconds),
        label: defaultCountdownLabel
      })
      continue
    }

    if (kind === 'promptTone') {
      result.push({
        kind: 'promptTone',
        showTitle: true,
        url: '/static/audio/small_time.mp3'
      })
      continue
    }

    result.push(createDefaultAnswerChoiceStep())
  }

  return result
}

function ensureRequiredPerGroupSteps(
  steps: ListeningChoiceStandardPerGroupStepDef[],
  warnings: VisualToModuleIssue[]
): ListeningChoiceStandardPerGroupStepDef[] {
  const next = [...steps]
  const hasAnswerChoice = next.some((item) => item.kind === 'answerChoice')
  const hasDescriptionAudio = next.some((item) => item.kind === 'playAudio' && item.audioSource === 'description')
  const hasContentAudio = next.some((item) => item.kind === 'playAudio' && item.audioSource === 'content')

  if (!hasDescriptionAudio) {
    next.unshift(createDefaultDescriptionAudioStep())
    warnings.push(issue(
      'auto_insert_description_audio',
      '未检测到描述音频步骤，已自动补齐 1 个「播放描述音频」。',
      'module.perGroupSteps'
    ))
  }

  if (!hasContentAudio) {
    const answerIndex = next.findIndex((item) => item.kind === 'answerChoice')
    const insertAt = answerIndex >= 0 ? answerIndex : next.length
    next.splice(insertAt, 0, createDefaultContentAudioStep())
    warnings.push(issue(
      'auto_insert_content_audio',
      '未检测到正文音频步骤，已自动补齐 1 个「播放正文音频」。',
      'module.perGroupSteps'
    ))
  }

  if (!hasAnswerChoice) {
    next.push(createDefaultAnswerChoiceStep())
    warnings.push(issue(
      'auto_insert_answer_choice',
      '未检测到答题步骤，已自动补齐 1 个「答题」步骤。',
      'module.perGroupSteps'
    ))
  }

  return next
}

function applyIntroRules(
  module: MutableModule,
  steps: VisualLinearStep[],
  defaultCountdownSeconds: number,
  defaultCountdownLabel: string,
  warnings: VisualToModuleIssue[]
) {
  const normalized = steps.map((item) => ({
    id: String(item.id || ''),
    kind: String(item.kind || '').trim()
  }))

  const firstGroupAnchorIndex = normalized.findIndex((item) => isGroupAnchorKind(item.kind))
  const introIndex = normalized.findIndex((item) => item.kind === 'intro')
  const hasIntro = introIndex >= 0

  if (!hasIntro) {
    module.introShowTitle = false
    module.introShowTitleDescription = false
    module.introShowDescription = false
    warnings.push(issue(
      'intro_missing',
      '未检测到介绍步骤，已关闭介绍页显示字段。',
      'module.introShowTitle'
    ))
  } else {
    module.introShowTitle = true
    module.introShowTitleDescription = true
    module.introShowDescription = true
  }

  // Treat countdown between intro and first per-group step as intro countdown.
  let introCountdownDetected = false
  for (let i = 0; i < normalized.length; i += 1) {
    const current = normalized[i]
    if (current.kind !== 'countdown') continue
    const beforePerGroup = firstGroupAnchorIndex < 0 || i < firstGroupAnchorIndex
    const afterIntro = hasIntro ? i > introIndex : true
    if (beforePerGroup && afterIntro) {
      introCountdownDetected = true
      break
    }
  }

  module.introCountdownEnabled = introCountdownDetected
  if (introCountdownDetected) {
    module.introCountdownShowTitle = true
    module.introCountdownSeconds = Math.max(0, defaultCountdownSeconds)
    module.introCountdownLabel = defaultCountdownLabel
  } else {
    module.introCountdownShowTitle = module.introCountdownShowTitle ?? true
    module.introCountdownSeconds = module.introCountdownSeconds ?? Math.max(0, defaultCountdownSeconds)
    module.introCountdownLabel = module.introCountdownLabel || defaultCountdownLabel
  }
}

export function buildListeningChoiceModuleFromLinearSteps(
  steps: VisualLinearStep[],
  options: BuildListeningChoiceModuleFromLinearStepsOptions
): BuildListeningChoiceModuleFromLinearStepsResult {
  const errors: VisualToModuleIssue[] = []
  const warnings: VisualToModuleIssue[] = []

  const base = options?.baseModule
  if (!base || typeof base !== 'object') {
    return {
      ok: false,
      module: {
        version: 1,
        id: 'listening_choice.standard.v1',
        perGroupSteps: []
      },
      errors: [issue('base_module_missing', '缺少基础流程模块，无法映射。', 'options.baseModule')],
      warnings
    }
  }

  const normalizedSteps = Array.isArray(steps) ? steps : []
  if (normalizedSteps.length <= 0) {
    return {
      ok: false,
      module: clone(base),
      errors: [issue('compiled_steps_empty', '可视流程为空，无法映射到流程草稿。', 'steps')],
      warnings
    }
  }

  const defaultCountdownSeconds = Math.max(0, toInt(options.defaultCountdownSeconds, 3))
  const defaultCountdownLabel = normalizeText(options.defaultCountdownLabel, '准备')

  const module = clone(base)
  applyIntroRules(module, normalizedSteps, defaultCountdownSeconds, defaultCountdownLabel, warnings)

  const firstGroupAnchorIndex = normalizedSteps.findIndex((item) => isGroupAnchorKind(String(item.kind || '').trim()))
  const firstPerGroupIndex = normalizedSteps.findIndex((item) => isPerGroupStepKind(String(item.kind || '').trim()))
  const sourceStart = firstGroupAnchorIndex >= 0 ? firstGroupAnchorIndex : firstPerGroupIndex
  const perGroupSource = sourceStart >= 0 ? normalizedSteps.slice(sourceStart) : normalizedSteps

  const rawPerGroup = buildPerGroupSteps(perGroupSource, defaultCountdownSeconds, defaultCountdownLabel, warnings)
  const ensuredPerGroup = ensureRequiredPerGroupSteps(rawPerGroup, warnings)

  if (ensuredPerGroup.length <= 0) {
    errors.push(issue('per_group_steps_empty', '无法生成每题组步骤。', 'module.perGroupSteps'))
    return { ok: false, module, errors, warnings }
  }

  module.perGroupSteps = ensuredPerGroup

  return {
    ok: errors.length === 0,
    module,
    errors,
    warnings
  }
}
