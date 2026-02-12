import type { FlowProfileV1 } from '/types'

type ListeningChoiceModuleLike = {
  id?: string
  version?: number
  name?: string
  introShowTitle?: boolean
  introShowTitleDescription?: boolean
  introShowDescription?: boolean
  introCountdownEnabled?: boolean
  introCountdownShowTitle?: boolean
  introCountdownSeconds?: number
  introCountdownLabel?: string
  perGroupSteps?: Array<Record<string, unknown>>
}

export type FlowModuleDiffSummary = {
  stepChanges: string[]
  paramChanges: string[]
  impactRules: string[]
  summaryLines: string[]
}

export type BuildModuleDiffSummaryOptions = {
  previousModule?: ListeningChoiceModuleLike | null
  nextModule: ListeningChoiceModuleLike
  impactRules?: FlowProfileV1[]
}

function normalizeText(v: unknown): string {
  return String(v ?? '').trim()
}

function normalizeInt(v: unknown, fallback = 0): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.floor(n)
}

function normalizeBoolean(v: unknown): boolean {
  return v === true
}

function toStepKinds(module?: ListeningChoiceModuleLike | null): string[] {
  if (!module) return []
  const out = ['intro']
  if (normalizeBoolean(module.introCountdownEnabled)) out.push('intro_countdown')
  const perGroupSteps = Array.isArray(module.perGroupSteps) ? module.perGroupSteps : []
  perGroupSteps.forEach((step) => {
    out.push(normalizeText(step?.kind) || 'unknown')
  })
  return out
}

function asStableJson(v: unknown): string {
  if (v === undefined) return ''
  if (v === null) return 'null'
  if (typeof v !== 'object') return String(v)

  if (Array.isArray(v)) {
    return `[${v.map(asStableJson).join(',')}]`
  }

  const keys = Object.keys(v).sort()
  return `{${keys.map((key) => `${key}:${asStableJson(v[key])}`).join(',')}}`
}

function toParamMap(module?: ListeningChoiceModuleLike | null): Record<string, string> {
  if (!module) return {}

  const map: Record<string, string> = {
    'intro.showTitle': String(normalizeBoolean(module.introShowTitle)),
    'intro.showTitleDescription': String(normalizeBoolean(module.introShowTitleDescription)),
    'intro.showDescription': String(normalizeBoolean(module.introShowDescription)),
    'intro.countdown.enabled': String(normalizeBoolean(module.introCountdownEnabled)),
    'intro.countdown.showTitle': String(normalizeBoolean(module.introCountdownShowTitle)),
    'intro.countdown.seconds': String(Math.max(0, normalizeInt(module.introCountdownSeconds, 0))),
    'intro.countdown.label': normalizeText(module.introCountdownLabel)
  }

  const perGroupSteps = Array.isArray(module.perGroupSteps) ? module.perGroupSteps : []
  perGroupSteps.forEach((step, index) => {
    const stepKey = `perGroup[${index}]`
    map[`${stepKey}.kind`] = normalizeText(step?.kind)
    Object.keys(step || {})
      .filter((key) => key !== 'kind')
      .sort()
      .forEach((key) => {
        map[`${stepKey}.${key}`] = asStableJson(step[key])
      })
  })

  return map
}

function buildStepChanges(previousKinds: string[], nextKinds: string[]): string[] {
  const changes: string[] = []

  if (previousKinds.length !== nextKinds.length) {
    changes.push(`步骤数量 ${previousKinds.length} -> ${nextKinds.length}`)
  }

  const total = Math.max(previousKinds.length, nextKinds.length)
  for (let i = 0; i < total; i += 1) {
    const prev = previousKinds[i] || '(无)'
    const next = nextKinds[i] || '(无)'
    if (prev === next) continue
    changes.push(`步骤 #${i + 1}: ${prev} -> ${next}`)
  }

  return changes
}

function buildParamChanges(prevMap: Record<string, string>, nextMap: Record<string, string>): string[] {
  const keys = Array.from(new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])).sort()
  const changes: string[] = []

  keys.forEach((key) => {
    const prev = prevMap[key] ?? ''
    const next = nextMap[key] ?? ''
    if (prev === next) return
    changes.push(`${key}: ${prev || '(空)'} -> ${next || '(空)'}`)
  })

  return changes
}

function formatImpactRules(rules: FlowProfileV1[]): string[] {
  if (!Array.isArray(rules) || rules.length === 0) return ['影响规则：0 条']

  const enabledCount = rules.filter(rule => rule?.enabled !== false).length
  const lines = [`影响规则：${rules.length} 条（启用 ${enabledCount} 条）`]

  rules.slice(0, 6).forEach((rule) => {
    const note = normalizeText(rule?.note)
    const status = rule?.enabled === false ? '停用' : '启用'
    lines.push(`- ${rule?.id || '(无ID)'} [${status}]${note ? `（${note}）` : ''}`)
  })

  if (rules.length > 6) lines.push(`- ... 另有 ${rules.length - 6} 条`)
  return lines
}

export function buildModuleDiffSummary(options: BuildModuleDiffSummaryOptions): FlowModuleDiffSummary {
  const previousModule = options.previousModule || null
  const nextModule = options.nextModule
  const impactRules = Array.isArray(options.impactRules) ? options.impactRules : []

  const previousKinds = toStepKinds(previousModule)
  const nextKinds = toStepKinds(nextModule)
  const stepChanges = buildStepChanges(previousKinds, nextKinds)

  const prevMap = toParamMap(previousModule)
  const nextMap = toParamMap(nextModule)
  const paramChanges = buildParamChanges(prevMap, nextMap)

  const impactLines = formatImpactRules(impactRules)

  const summaryLines = [
    `步骤变化：${stepChanges.length} 项`,
    ...(stepChanges.length > 0 ? stepChanges.slice(0, 8) : ['- 无']),
    `参数变化：${paramChanges.length} 项`,
    ...(paramChanges.length > 0 ? paramChanges.slice(0, 10) : ['- 无']),
    ...impactLines
  ]

  return {
    stepChanges,
    paramChanges,
    impactRules: impactLines,
    summaryLines
  }
}

export function formatModuleDiffSummary(summary: FlowModuleDiffSummary): string {
  return (summary.summaryLines || []).join('\n')
}
