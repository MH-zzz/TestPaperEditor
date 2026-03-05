import type { FlowProfileV1 } from '/types'

export type FlowRoutingCtx = {
  region?: string
  scene?: string
  grade?: string
}

export const FLOW_REGION_GENERIC_LABEL = '通用'

export type FlowProfileScoreDetail = {
  profile: FlowProfileV1
  regionScore: number
  sceneScore: number
  gradeScore: number
  priorityScore: number
  wildcardCount: number
  totalScore: number
}

export type FlowProfileScoreResult = {
  rankedCandidates: FlowProfileScoreDetail[]
  topCandidates: FlowProfileScoreDetail[]
  bestCandidate: FlowProfileScoreDetail | null
}

function normalizeNullableText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function dimScore(profileValue: string | undefined, requestValue: string | undefined): number {
  const p = normalizeNullableText(profileValue) || ''
  const r = normalizeNullableText(requestValue) || ''
  if (!p) return 1
  if (!r) return -999
  if (p === r) return 3
  return -999
}

function regionDimScore(profileValue: string | undefined, requestValue: string | undefined): number {
  const p = normalizeNullableText(profileValue) || ''
  const r = normalizeNullableText(requestValue) || ''
  if (!p) return 1
  if (p === FLOW_REGION_GENERIC_LABEL) {
    if (!r) return -999
    if (r === FLOW_REGION_GENERIC_LABEL) return 3
    return 2
  }
  if (!r) return -999
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

export function scoreSingleProfile(
  profile: FlowProfileV1,
  ctx: FlowRoutingCtx
): FlowProfileScoreDetail | null {
  const regionScore = regionDimScore(profile.region, ctx.region)
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

export function scoreProfiles(
  profiles: FlowProfileV1[],
  ctx: FlowRoutingCtx,
  options: { topN?: number } = {}
): FlowProfileScoreResult {
  const rankedCandidates = rankFlowProfiles(profiles || [], ctx || {}, Number.isFinite(options.topN) ? Number(options.topN) : 20)
  const topN = Number.isFinite(options.topN) ? Math.max(1, Math.floor(Number(options.topN))) : 3

  return {
    rankedCandidates,
    topCandidates: rankedCandidates.slice(0, topN),
    bestCandidate: rankedCandidates[0] || null
  }
}
