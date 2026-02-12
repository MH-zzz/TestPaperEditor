import type {
  ListeningChoiceQuestion,
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
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  concreteListeningChoiceStepsToTemplate,
  detectListeningChoiceStandardFlowOverrides,
  materializeListeningChoiceTemplateSteps
} from '../../../flows/listeningChoiceFlowModules.ts'

type IdFactory = () => string

type FlowRoutingContext = { region?: string; scene?: string; grade?: string }
type QuestionWithMetadata = ListeningChoiceQuestion & { metadata?: QuestionMetadata }
type FlowOverrides = Record<string, Record<string, unknown>>

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

function readMetadata(question: ListeningChoiceQuestion): QuestionMetadata {
  const metadata = (question as QuestionWithMetadata).metadata
  return isObjectRecord(metadata) ? (metadata as QuestionMetadata) : {}
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
  question: ListeningChoiceQuestion,
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

function buildModuleFromLegacyStandard(): ListeningChoiceFlowModuleV1 {
  const m = standardFlows.state.listeningChoice
  return {
    kind: 'listening_choice' as const,
    id: String(m.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: 1,
    name: '听后选择题型流程',
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

function resolveFlowSource(question: ListeningChoiceQuestion): ListeningChoiceFlowSource {
  const src = question?.flow?.source
  if (src?.kind === 'library') {
    return {
      kind: 'library',
      id: String(src.id || '')
    }
  }

  if (src?.kind === 'standard') {
    return {
      kind: 'standard',
      id: String(src.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
      version: Number.isFinite(Number(src.version)) ? Math.max(1, toInt(src.version, 1)) : 1,
      profileId: normalizeCtxValue(src.profileId),
      overrides: normalizeFlowOverrides(src.overrides)
    }
  }

  return {
    kind: 'standard',
    id: LISTENING_CHOICE_STANDARD_FLOW_ID,
    version: 1,
    overrides: {}
  }
}

function resolveStandardModule(
  question: ListeningChoiceQuestion,
  source: ListeningChoiceFlowSource,
  ctx?: FlowRoutingContext
) {
  const isActiveModule = (module: ListeningChoiceFlowModuleV1 | null | undefined): module is ListeningChoiceFlowModuleV1 => {
    return !!module && module.status !== 'archived'
  }
  const standardSource = source.kind === 'standard' ? source : null
  const explicitId = standardSource?.id ? String(standardSource.id) : ''
  const explicitVersion = Number.isFinite(Number(standardSource?.version))
    ? Math.max(1, toInt(standardSource?.version, 1))
    : 0
  const profileId = normalizeCtxValue(standardSource?.profileId) || ''

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

  const matchedProfile = flowProfiles.resolve('listening_choice', ctx)
  if (matchedProfile?.module) {
    const hit = flowModules.getListeningChoiceByRef(matchedProfile.module)
    if (isActiveModule(hit)) return { module: hit, profileId: matchedProfile.id }
  }

  const fallback = flowModules.getListeningChoiceDefault()
  if (fallback) return { module: fallback, profileId: profileId || matchedProfile?.id }

  return { module: buildModuleFromLegacyStandard(), profileId: profileId || matchedProfile?.id }
}

function buildNormalizedFlowSource(
  source: ListeningChoiceFlowSource,
  patch: { id?: string; version?: number; profileId?: string }
): ListeningChoiceFlowSource {
  if (source?.kind === 'library') {
    return { kind: 'library', id: String(source.id || '') }
  }

  const id = String(patch.id || source?.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
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
  question: ListeningChoiceQuestion,
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
        source: buildNormalizedFlowSource(source, {})
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
    source: buildNormalizedFlowSource(source, {
      id: resolved.module.id,
      version: resolved.module.version,
      profileId: resolved.profileId
    })
  }
}

export function resolveListeningChoiceQuestion(
  question: ListeningChoiceQuestion,
  opts?: { generateId?: IdFactory; ctx?: FlowRoutingContext }
): ListeningChoiceQuestion {
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
  }
}

export function normalizeListeningChoiceQuestionForSave(
  question: ListeningChoiceQuestion,
  opts?: { generateId?: IdFactory; ctx?: FlowRoutingContext }
): ListeningChoiceQuestion {
  const resolvedQuestion = resolveListeningChoiceQuestion(question, opts)
  const src = resolvedQuestion.flow?.source || { kind: 'standard', id: LISTENING_CHOICE_STANDARD_FLOW_ID }

  if (src?.kind === 'library') {
    return resolvedQuestion
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
    return {
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
    }
  }

  const templateSteps = concreteListeningChoiceStepsToTemplate(resolvedQuestion, steps)
  const mod = flowLibrary.ensureModule('listening_choice', templateSteps)
  const materialized = materializeListeningChoiceTemplateSteps(resolvedQuestion, templateSteps, {
    generateId: opts?.generateId
  }) as ListeningChoiceFlowStep[]
  return {
    ...resolvedQuestion,
    flow: {
      ...resolvedQuestion.flow,
      source: { kind: 'library', id: mod.id },
      steps: materialized
    }
  }
}
