import type { FlowProfileV1 } from '/types'

export type FlowRoutingCtx = {
  region?: string
  scene?: string
  grade?: string
}

export type FlowProfileScoreDetail = {
  profile: FlowProfileV1
  regionScore: number
  sceneScore: number
  gradeScore: number
  priorityScore: number
  wildcardCount: number
  totalScore: number
}

export type FlowProfileConflict = {
  signature: string
  ids: string[]
}

export type FlowProfileDeadRule = {
  id: string
  blockedBy: string[]
}

export type FlowProfileWeakCoverage = {
  id: string
  wildcardDimensions: Array<'region' | 'scene' | 'grade'>
  reason: string
}

export type FlowProfileDiagnostics = {
  conflicts: FlowProfileConflict[]
  deadRules: FlowProfileDeadRule[]
  weakCoverage: FlowProfileWeakCoverage[]
}

export type FlowProfileFixSuggestion = {
  key: string
  targetId: string
  summary: string
  reason: string
  patch: Record<string, any>
  autoApplicable: boolean
}

export type FlowProfileScoreResult = {
  rankedCandidates: FlowProfileScoreDetail[]
  topCandidates: FlowProfileScoreDetail[]
  bestCandidate: FlowProfileScoreDetail | null
  diagnostics: FlowProfileDiagnostics
  fixSuggestions: FlowProfileFixSuggestion[]
}

export type FlowProfileSubmitValidation = {
  ok: boolean
  errors: string[]
  warnings: string[]
  diagnostics: FlowProfileDiagnostics
  fixSuggestions: FlowProfileFixSuggestion[]
}

function normalizeNullableText(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function normalizeRuleDim(v: string | undefined): string {
  return normalizeNullableText(v) || '*'
}

function coversRuleDimension(cover: string | undefined, target: string | undefined): boolean {
  const c = normalizeNullableText(cover) || ''
  const t = normalizeNullableText(target) || ''
  if (!t) return !c
  if (!c) return true
  return c === t
}

function dimScore(profileValue: string | undefined, requestValue: string | undefined): number {
  const p = normalizeNullableText(profileValue) || ''
  const r = normalizeNullableText(requestValue) || ''
  if (!p) return 1
  if (!r) return 0
  if (p === r) return 3
  return -999
}

function getWildcardDimensions(profile: FlowProfileV1): Array<'region' | 'scene' | 'grade'> {
  const out: Array<'region' | 'scene' | 'grade'> = []
  if (!normalizeNullableText(profile.region)) out.push('region')
  if (!normalizeNullableText(profile.scene)) out.push('scene')
  if (!normalizeNullableText(profile.grade)) out.push('grade')
  return out
}

function toRuleSignature(profile: FlowProfileV1): string {
  return [
    normalizeRuleDim(profile.region),
    normalizeRuleDim(profile.scene),
    normalizeRuleDim(profile.grade),
    String(Number(profile.priority || 0))
  ].join('|')
}

function toRuleSignatureText(profile: FlowProfileV1): string {
  return `${normalizeRuleDim(profile.region)} / ${normalizeRuleDim(profile.scene)} / ${normalizeRuleDim(profile.grade)} / priority=${Number(profile.priority || 0)}`
}

export function scoreSingleProfile(
  profile: FlowProfileV1,
  ctx: FlowRoutingCtx
): FlowProfileScoreDetail | null {
  const regionScore = dimScore(profile.region, ctx.region)
  const sceneScore = dimScore(profile.scene, ctx.scene)
  const gradeScore = dimScore(profile.grade, ctx.grade)

  if (regionScore < 0 || sceneScore < 0 || gradeScore < 0) return null

  const wildcardCount = getWildcardDimensions(profile).length
  const priorityScore = Number(profile.priority || 0) * 10

  return {
    profile,
    regionScore,
    sceneScore,
    gradeScore,
    priorityScore,
    wildcardCount,
    totalScore: regionScore + sceneScore + gradeScore + priorityScore
  }
}

export function rankFlowProfiles(
  profiles: FlowProfileV1[],
  ctx: FlowRoutingCtx,
  topN = 3
): FlowProfileScoreDetail[] {
  const list = (profiles || [])
    .filter(profile => profile?.enabled !== false)
    .map(profile => scoreSingleProfile(profile, ctx))
    .filter((item): item is FlowProfileScoreDetail => Boolean(item))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      const pa = Number(a.profile.priority || 0)
      const pb = Number(b.profile.priority || 0)
      if (pb !== pa) return pb - pa
      return a.wildcardCount - b.wildcardCount
    })

  if (!Number.isFinite(topN) || topN <= 0) return list
  return list.slice(0, Math.floor(topN))
}

export function diagnoseFlowProfileRules(profiles: FlowProfileV1[]): FlowProfileDiagnostics {
  const enabled = (profiles || []).filter(profile => profile?.enabled !== false)

  const conflictsMap: Record<string, FlowProfileV1[]> = {}
  enabled.forEach((profile) => {
    const key = toRuleSignature(profile)
    if (!conflictsMap[key]) conflictsMap[key] = []
    conflictsMap[key].push(profile)
  })

  const conflicts = Object.values(conflictsMap)
    .filter(group => group.length > 1)
    .map((group) => ({
      signature: toRuleSignatureText(group[0]),
      ids: group.map(item => item.id)
    }))

  const deadRules = enabled
    .map((target) => {
      const blockers = enabled
        .filter(profile => profile.id !== target.id)
        .filter(profile => Number(profile.priority || 0) > Number(target.priority || 0))
        .filter(profile => {
          return (
            coversRuleDimension(profile.region, target.region) &&
            coversRuleDimension(profile.scene, target.scene) &&
            coversRuleDimension(profile.grade, target.grade)
          )
        })

      if (blockers.length === 0) return null
      return {
        id: target.id,
        blockedBy: blockers.map(item => item.id)
      }
    })
    .filter((item): item is FlowProfileDeadRule => Boolean(item))

  const weakCoverage = enabled
    .map((profile) => {
      const wildcardDimensions = getWildcardDimensions(profile)
      if (wildcardDimensions.length < 2) return null

      const reason = wildcardDimensions.length === 3
        ? '规则全维度通配，容易吞掉特化规则；建议降低优先级或至少限定一个维度。'
        : `规则包含 ${wildcardDimensions.join('/')} 通配，覆盖范围偏大；建议补充更具体维度。`

      return {
        id: profile.id,
        wildcardDimensions,
        reason
      }
    })
    .filter((item): item is FlowProfileWeakCoverage => Boolean(item))

  return {
    conflicts,
    deadRules,
    weakCoverage
  }
}

export function buildFlowProfileFixSuggestions(
  diagnostics: FlowProfileDiagnostics,
  profiles: FlowProfileV1[]
): FlowProfileFixSuggestion[] {
  const map = new Map((profiles || []).map(profile => [profile.id, profile]))
  const out: FlowProfileFixSuggestion[] = []
  const seen = new Set<string>()

  ;(diagnostics?.conflicts || []).forEach((conflict) => {
    const ids = Array.isArray(conflict.ids) ? conflict.ids : []
    if (ids.length <= 1) return

    const keepId = ids[0]
    ids.slice(1).forEach((id, index) => {
      const key = `conflict:${id}`
      if (!id || seen.has(key)) return
      const profile = map.get(id)
      if (!profile) return

      const nextPriority = Number(profile.priority || 0) - (index + 1)
      out.push({
        key,
        targetId: id,
        summary: `冲突规则修复：${id} 下调优先级到 ${nextPriority}`,
        reason: `与 ${keepId} 同条件同优先级冲突（${conflict.signature}）`,
        patch: { priority: nextPriority },
        autoApplicable: true
      })
      seen.add(key)
    })
  })

  ;(diagnostics?.deadRules || []).forEach((deadRule) => {
    const key = `dead:${deadRule.id}`
    if (!deadRule?.id || seen.has(key)) return

    out.push({
      key,
      targetId: deadRule.id,
      summary: `死规则修复：${deadRule.id} 设为禁用`,
      reason: `被更高优先级规则覆盖：${(deadRule.blockedBy || []).join(' / ')}`,
      patch: { enabled: false },
      autoApplicable: true
    })
    seen.add(key)
  })

  ;(diagnostics?.weakCoverage || []).forEach((weakRule) => {
    const key = `weak:${weakRule.id}`
    if (!weakRule?.id || seen.has(key)) return

    const profile = map.get(weakRule.id)
    const priority = Number(profile?.priority || 0)
    const patch = priority > 0 ? { priority: 0 } : {}

    out.push({
      key,
      targetId: weakRule.id,
      summary: `弱覆盖建议：${weakRule.id}`,
      reason: weakRule.reason,
      patch,
      autoApplicable: Object.keys(patch).length > 0
    })
    seen.add(key)
  })

  return out
}

export function scoreProfiles(
  profiles: FlowProfileV1[],
  ctx: FlowRoutingCtx,
  options: { topN?: number } = {}
): FlowProfileScoreResult {
  const rankedCandidates = rankFlowProfiles(profiles || [], ctx || {}, Number.isFinite(options.topN) ? Number(options.topN) : 20)
  const topN = Number.isFinite(options.topN) ? Math.max(1, Math.floor(Number(options.topN))) : 3
  const diagnostics = diagnoseFlowProfileRules(profiles || [])
  const fixSuggestions = buildFlowProfileFixSuggestions(diagnostics, profiles || [])

  return {
    rankedCandidates,
    topCandidates: rankedCandidates.slice(0, topN),
    bestCandidate: rankedCandidates[0] || null,
    diagnostics,
    fixSuggestions
  }
}

function formatConflictError(conflict: FlowProfileConflict): string {
  const ids = (conflict.ids || []).join(' / ')
  return `冲突规则：${conflict.signature} -> ${ids}`
}

function formatDeadRuleError(item: FlowProfileDeadRule): string {
  return `死规则：${item.id} 被 ${item.blockedBy.join(' / ')} 覆盖`
}

function formatWeakCoverageWarning(item: FlowProfileWeakCoverage): string {
  return `弱覆盖：${item.id}（${item.wildcardDimensions.join('/')} 通配）`
}

export function canSubmitFlowProfiles(profiles: FlowProfileV1[]): FlowProfileSubmitValidation {
  const diagnostics = diagnoseFlowProfileRules(profiles || [])
  const fixSuggestions = buildFlowProfileFixSuggestions(diagnostics, profiles || [])

  const errors = [
    ...(diagnostics.conflicts || []).map(formatConflictError),
    ...(diagnostics.deadRules || []).map(formatDeadRuleError)
  ]

  const warnings = (diagnostics.weakCoverage || []).map(formatWeakCoverageWarning)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    diagnostics,
    fixSuggestions
  }
}
