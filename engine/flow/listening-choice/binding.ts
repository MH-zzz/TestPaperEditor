import type {
  ListeningChoiceQuestion,
  SpeakingHearAnswerQuestion,
  ListeningChoiceFlow,
  ListeningChoiceFlowModuleV1,
  ListeningChoiceFlowSource,
  ListeningChoiceFlowStep,
  QuestionMetadata
} from '/types'
import { compileListeningChoiceFlow } from './compiler.ts'
import { flowModules } from '/stores/flowModules'
import { flowProfiles } from '/stores/flowProfiles'
import { flowLibrary } from '/stores/flowLibrary'
import { standardFlows } from '/stores/standardFlows'
import {
  LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID,
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  detectListeningChoiceStandardFlowOverrides,
  materializeListeningChoiceTemplateSteps
} from '../../../flows/listeningChoiceFlowModules.ts'

type IdFactory = () => string

type FlowRoutingContext = { region?: string; scene?: string; grade?: string }
type ListeningChoiceLikeQuestion = ListeningChoiceQuestion | SpeakingHearAnswerQuestion
type QuestionWithMetadata = ListeningChoiceLikeQuestion & { metadata?: QuestionMetadata }
type FlowOverrides = Record<string, Record<string, unknown>>
const FLOW_NORMALIZATION_ISSUE_CODE = 'flow_override_not_supported'
const FLOW_NORMALIZATION_ISSUE_MESSAGE = '当前题目流程与题型流程线不一致，且无法自动映射。请先到「题型流程」修正流程线后再保存题目。'

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function toInt(v: unknown, fallback = 0) {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function normalizeCtxValue(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function readMetadata(question: ListeningChoiceLikeQuestion): QuestionMetadata {
  const metadata = (question as QuestionWithMetadata).metadata
  return isObjectRecord(metadata) ? (metadata as QuestionMetadata) : {}
}

function isHearAnswerVariant(question: ListeningChoiceLikeQuestion): boolean {
  if (question.type === 'speaking_hear_answer') return true
  const metadata = readMetadata(question)
  const variant = typeof metadata?.questionVariant === 'string' ? metadata.questionVariant.trim() : ''
  return variant === 'hear_answer'
}

function withFlowNormalizationIssue<T extends ListeningChoiceLikeQuestion>(
  question: T,
  issue: { code: string; message: string } | null
): T {
  const metadata = { ...readMetadata(question) } as QuestionMetadata
  if (issue) {
    metadata.flowNormalizationIssue = {
      code: issue.code,
      message: issue.message
    }
  } else {
    delete metadata.flowNormalizationIssue
  }
  return {
    ...question,
    metadata
  } as T
}

function normalizeFlowOverrides(raw: unknown): FlowOverrides {
  if (!isObjectRecord(raw)) return {}
  const output: FlowOverrides = {}
  Object.entries(raw).forEach(([key, value]) => {
    if (!isObjectRecord(value)) return
    output[String(key)] = { ...value }
  })
  return output
}

function resolveRoutingCtx(
  question: ListeningChoiceLikeQuestion,
  ctx?: FlowRoutingContext
) {
  const meta = readMetadata(question)
  const flowCtx = isObjectRecord(meta.flowContext) ? meta.flowContext : {}
  return {
    region: normalizeCtxValue(ctx?.region) || normalizeCtxValue(flowCtx.region) || normalizeCtxValue(meta.region),
    scene: normalizeCtxValue(ctx?.scene) || normalizeCtxValue(flowCtx.scene) || normalizeCtxValue(meta.scene),
    grade: normalizeCtxValue(ctx?.grade) || normalizeCtxValue(flowCtx.grade) || normalizeCtxValue(meta.grade)
  }
}

function resolveFlowSource(question: ListeningChoiceLikeQuestion): ListeningChoiceFlowSource {
  const defaultSourceId = isHearAnswerVariant(question)
    ? LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
    : LISTENING_CHOICE_STANDARD_FLOW_ID
  const src = question?.flow?.source
  if (src?.kind === 'library') {
    return {
      kind: 'library',
      id: String(src.id || '')
    }
  }

  if (src?.kind === 'standard') {
    const rawId = String(src.id || defaultSourceId)
    const migratedId = defaultSourceId === LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID && rawId === LISTENING_CHOICE_STANDARD_FLOW_ID
      ? LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
      : rawId
    return {
      kind: 'standard',
      id: migratedId,
      version: Number.isFinite(Number(src.version)) ? Math.max(1, toInt(src.version, 1)) : 1,
      profileId: normalizeCtxValue(src.profileId),
      overrides: normalizeFlowOverrides(src.overrides)
    }
  }

  return {
    kind: 'standard',
    id: defaultSourceId,
    version: 1,
    overrides: {}
  }
}

function buildModuleFromLegacyStandard(defaultModuleId = LISTENING_CHOICE_STANDARD_FLOW_ID): ListeningChoiceFlowModuleV1 {
  const fallbackName = defaultModuleId === LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID ? '听后回答题型流程' : '听后选择题型流程'
  const m = standardFlows.state.listeningChoice
  return {
    kind: 'listening_choice' as const,
    id: String(defaultModuleId || m.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: 1,
    name: fallbackName,
    status: 'published' as const,
    introShowTitle: m.introShowTitle,
    introShowTitleDescription: m.introShowTitleDescription,
    introShowDescription: m.introShowDescription,
    introCountdownEnabled: m.introCountdownEnabled,
    introCountdownShowTitle: m.introCountdownShowTitle,
    introCountdownSeconds: m.introCountdownSeconds,
    introCountdownLabel: m.introCountdownLabel,
    perGroupSteps: Array.isArray(m.perGroupSteps) ? [...m.perGroupSteps] : []
  }
}

function resolveStandardModule(
  question: ListeningChoiceLikeQuestion,
  source: ListeningChoiceFlowSource,
  ctx?: FlowRoutingContext
) {
  const hearAnswerVariant = isHearAnswerVariant(question)
  const defaultModuleId = hearAnswerVariant
    ? LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
    : LISTENING_CHOICE_STANDARD_FLOW_ID
  const isActiveModule = (module: ListeningChoiceFlowModuleV1 | null | undefined): module is ListeningChoiceFlowModuleV1 => {
    return !!module && module.status !== 'archived'
  }
  const standardSource = source.kind === 'standard' ? source : null
  const explicitId = standardSource?.id ? String(standardSource.id) : String(defaultModuleId)
  const explicitVersion = Number.isFinite(Number(standardSource?.version))
    ? Math.max(1, toInt(standardSource?.version, 1))
    : 0
  const profileId = normalizeCtxValue(standardSource?.profileId) || ''
  const hasRoutingCtx = Boolean(
    normalizeCtxValue(ctx?.region) ||
    normalizeCtxValue(ctx?.scene) ||
    normalizeCtxValue(ctx?.grade)
  )
  let matchedProfile = null as ReturnType<typeof flowProfiles.resolve>

  if (isHearAnswerVariant(question)) {
    if (explicitId && explicitVersion >= 1) {
      const hit = flowModules.getListeningChoiceByRef({ id: explicitId, version: explicitVersion })
      if (isActiveModule(hit)) return { module: hit, profileId: undefined }
    }

    if (explicitId) {
      const latest = flowModules.getListeningChoiceLatestPublished(explicitId)
      if (latest) return { module: latest, profileId: undefined }
    }

    const hearAnswerDefault = flowModules.getListeningChoiceLatestPublished(LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID)
    if (hearAnswerDefault) return { module: hearAnswerDefault, profileId: undefined }

    return { module: buildModuleFromLegacyStandard(defaultModuleId), profileId: undefined }
  }

  // When routing context exists (e.g. region tag), prefer profile routing over stale source refs.
  if (hasRoutingCtx) {
    matchedProfile = flowProfiles.resolve('listening_choice', ctx)
    if (matchedProfile?.module) {
      const hit = flowModules.getListeningChoiceByRef(matchedProfile.module)
      if (isActiveModule(hit)) return { module: hit, profileId: matchedProfile.id }
    }
  }

  if (explicitId && explicitVersion > 0) {
    const hit = flowModules.getListeningChoiceByRef({ id: explicitId, version: explicitVersion })
    if (isActiveModule(hit)) return { module: hit, profileId: profileId || undefined }
  }

  if (profileId) {
    const p = flowProfiles.getById(profileId)
    if (p?.questionType === 'listening_choice') {
      const hit = flowModules.getListeningChoiceByRef(p.module)
      if (isActiveModule(hit)) return { module: hit, profileId }
    }
  }

  if (explicitId) {
    const latest = flowModules.getListeningChoiceLatestPublished(explicitId)
    if (latest) return { module: latest, profileId: profileId || undefined }
  }

  if (!matchedProfile) matchedProfile = flowProfiles.resolve('listening_choice', ctx)
  if (matchedProfile?.module) {
    const hit = flowModules.getListeningChoiceByRef(matchedProfile.module)
    if (isActiveModule(hit)) return { module: hit, profileId: matchedProfile.id }
  }

  const fallback = flowModules.getListeningChoiceDefault(defaultModuleId)
  if (fallback) return { module: fallback, profileId: profileId || matchedProfile?.id }

  return { module: buildModuleFromLegacyStandard(defaultModuleId), profileId: profileId || matchedProfile?.id }
}

function buildNormalizedFlowSource(
  question: ListeningChoiceLikeQuestion,
  source: ListeningChoiceFlowSource,
  patch: { id?: string; version?: number; profileId?: string }
): ListeningChoiceFlowSource {
  if (source?.kind === 'library') {
    return { kind: 'library', id: String(source.id || '') }
  }

  const defaultSourceId = isHearAnswerVariant(question)
    ? LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
    : LISTENING_CHOICE_STANDARD_FLOW_ID
  const id = String(patch.id || source?.id || defaultSourceId)
  const versionInput = patch.version == null ? source?.version : patch.version
  const version = Number.isFinite(Number(versionInput))
    ? Math.max(1, toInt(versionInput, 1))
    : undefined
  const profileId = normalizeCtxValue(patch.profileId == null ? source?.profileId : patch.profileId)

  return {
    kind: 'standard',
    id,
    version,
    profileId,
    overrides: source?.overrides && isObjectRecord(source.overrides)
      ? normalizeFlowOverrides(source.overrides)
      : {}
  }
}

function toLegacyStandardModule(module: ListeningChoiceFlowModuleV1) {
  return {
    version: 1,
    id: String(module?.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
    introShowTitle: module?.introShowTitle,
    introShowTitleDescription: module?.introShowTitleDescription,
    introShowDescription: module?.introShowDescription,
    introCountdownEnabled: module?.introCountdownEnabled,
    introCountdownShowTitle: module?.introCountdownShowTitle,
    introCountdownSeconds: module?.introCountdownSeconds,
    introCountdownLabel: module?.introCountdownLabel,
    perGroupSteps: Array.isArray(module?.perGroupSteps) ? module.perGroupSteps : []
  }
}

export function resolveListeningChoiceFlowSteps(
  question: ListeningChoiceLikeQuestion,
  opts?: { generateId?: IdFactory; ctx?: FlowRoutingContext }
): { steps: ListeningChoiceFlowStep[]; source: ListeningChoiceFlowSource } {
  const source = resolveFlowSource(question)
  const routingCtx = resolveRoutingCtx(question, opts?.ctx)

  if (source.kind === 'library') {
    const moduleId = typeof source.id === 'string' ? source.id : ''
    const mod = moduleId ? flowLibrary.getById(moduleId) : null
    if (mod && Array.isArray(mod.steps)) {
      const steps = materializeListeningChoiceTemplateSteps(question, mod.steps, {
        generateId: opts?.generateId
      }) as ListeningChoiceFlowStep[]
      return {
        steps,
        source: buildNormalizedFlowSource(question, source, {})
      }
    }
  }

  const resolved = resolveStandardModule(question, source, routingCtx)
  const compiled = compileListeningChoiceFlow(question, resolved.module, {
    generateId: opts?.generateId,
    overrides: source?.kind === 'standard' ? source.overrides || {} : {}
  })

  return {
    steps: compiled.steps,
    source: buildNormalizedFlowSource(question, source, {
      id: resolved.module.id,
      version: resolved.module.version,
      profileId: resolved.profileId
    })
  }
}

export function resolveListeningChoiceQuestion<T extends ListeningChoiceLikeQuestion>(
  question: T,
  opts?: { generateId?: IdFactory; ctx?: FlowRoutingContext }
): T {
  const resolved = resolveListeningChoiceFlowSteps(question, opts)
  const flow: ListeningChoiceFlow = {
    ...(question.flow || { version: 1, mode: 'semi-auto' as const }),
    version: 1,
    source: resolved.source,
    steps: resolved.steps
  }

  return {
    ...question,
    flow
  } as T
}

export function normalizeListeningChoiceQuestionForSave<T extends ListeningChoiceLikeQuestion>(
  question: T,
  opts?: { generateId?: IdFactory; ctx?: FlowRoutingContext }
): T {
  const resolvedQuestion = resolveListeningChoiceQuestion(question, opts)
  const defaultSourceId = isHearAnswerVariant(resolvedQuestion)
    ? LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
    : LISTENING_CHOICE_STANDARD_FLOW_ID
  const src = resolvedQuestion.flow?.source || { kind: 'standard', id: defaultSourceId }

  if (src?.kind === 'library') {
    return withFlowNormalizationIssue(resolvedQuestion, null)
  }

  const routingCtx = resolveRoutingCtx(resolvedQuestion, opts?.ctx)
  const resolved = resolveStandardModule(resolvedQuestion, src, routingCtx)
  const legacyModule = toLegacyStandardModule(resolved.module)
  const steps = resolvedQuestion.flow?.steps || []
  const detected = detectListeningChoiceStandardFlowOverrides(resolvedQuestion, steps, {
    module: legacyModule
  })

  if (detected.ok) {
    const overrides = normalizeFlowOverrides(detected.overrides)
    const compiled = compileListeningChoiceFlow(resolvedQuestion, resolved.module, {
      generateId: opts?.generateId,
      overrides
    })
    return withFlowNormalizationIssue({
      ...resolvedQuestion,
      flow: {
        ...resolvedQuestion.flow,
        source: {
          kind: 'standard',
          id: resolved.module.id,
          version: resolved.module.version,
          profileId: resolved.profileId,
          overrides
        },
        steps: compiled.steps
      }
    } as T, null)
  }
  return withFlowNormalizationIssue(resolvedQuestion, {
    code: FLOW_NORMALIZATION_ISSUE_CODE,
    message: FLOW_NORMALIZATION_ISSUE_MESSAGE
  })
}
