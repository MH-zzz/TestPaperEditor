import type { ListeningChoiceQuestion, ListeningChoiceFlowStep, ListeningChoiceFlowSource, ListeningChoiceFlow } from '/types'
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

function toInt(v: any, fallback = 0) {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function normalizeCtxValue(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function resolveRoutingCtx(
  question: ListeningChoiceQuestion,
  ctx?: { region?: string; scene?: string; grade?: string }
) {
  const q: any = question as any
  const meta: any = q?.metadata && typeof q.metadata === 'object' ? q.metadata : {}
  const flowCtx: any = meta?.flowContext && typeof meta.flowContext === 'object' ? meta.flowContext : {}
  return {
    region: normalizeCtxValue(ctx?.region) || normalizeCtxValue(flowCtx?.region) || normalizeCtxValue(meta?.region),
    scene: normalizeCtxValue(ctx?.scene) || normalizeCtxValue(flowCtx?.scene) || normalizeCtxValue(meta?.scene),
    grade: normalizeCtxValue(ctx?.grade) || normalizeCtxValue(flowCtx?.grade) || normalizeCtxValue(meta?.grade)
  }
}

function buildModuleFromLegacyStandard() {
  const m: any = standardFlows.state.listeningChoice || {}
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
    perGroupSteps: Array.isArray(m.perGroupSteps) ? m.perGroupSteps : []
  }
}

function resolveFlowSource(question: ListeningChoiceQuestion) {
  const src = question?.flow?.source as any
  if (src && typeof src === 'object') return src
  return {
    kind: 'standard',
    id: LISTENING_CHOICE_STANDARD_FLOW_ID,
    version: 1,
    overrides: {}
  } as any
}

function resolveStandardModule(question: ListeningChoiceQuestion, source: any, ctx?: { region?: string; scene?: string; grade?: string }) {
  const isActiveModule = (module: any) => !!module && module.status !== 'archived'
  const explicitId = typeof source?.id === 'string' && source.id ? source.id : ''
  const explicitVersion = Number.isFinite(Number(source?.version)) ? Math.max(1, toInt(source.version, 1)) : 0
  const profileId = typeof source?.profileId === 'string' && source.profileId ? source.profileId : ''

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

function buildNormalizedFlowSource(source: any, patch: Record<string, any>): ListeningChoiceFlowSource {
  if (source?.kind === 'library') {
    return { kind: 'library', id: String(source.id || '') }
  }

  return {
    kind: 'standard',
    id: String(patch.id || source?.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: Number.isFinite(Number(patch.version)) ? Math.max(1, toInt(patch.version, 1)) : undefined,
    profileId: typeof patch.profileId === 'string' && patch.profileId ? patch.profileId : undefined,
    overrides: source?.overrides && typeof source.overrides === 'object' ? source.overrides : {}
  }
}

function toLegacyStandardModule(module: any) {
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
  opts?: { generateId?: IdFactory; ctx?: { region?: string; scene?: string; grade?: string } }
): { steps: ListeningChoiceFlowStep[]; source: ListeningChoiceFlowSource } {
  const source: any = resolveFlowSource(question)
  const routingCtx = resolveRoutingCtx(question, opts?.ctx)

  if (source.kind === 'library') {
    const moduleId = typeof source.id === 'string' ? source.id : ''
    const mod = moduleId ? flowLibrary.getById(moduleId) : null
    if (mod && Array.isArray(mod.steps)) {
      const steps = materializeListeningChoiceTemplateSteps(question, mod.steps, {
        generateId: opts?.generateId
      }) as any
      return {
        steps,
        source: buildNormalizedFlowSource(source, {})
      }
    }
  }

  const resolved = resolveStandardModule(question, source, routingCtx)
  const compiled = compileListeningChoiceFlow(question, resolved.module as any, {
    generateId: opts?.generateId,
    overrides: source?.overrides || {}
  })

  return {
    steps: compiled.steps as any,
    source: buildNormalizedFlowSource(source, {
      id: resolved.module.id,
      version: resolved.module.version,
      profileId: resolved.profileId
    })
  }
}

export function resolveListeningChoiceQuestion(
  question: ListeningChoiceQuestion,
  opts?: { generateId?: IdFactory; ctx?: { region?: string; scene?: string; grade?: string } }
): ListeningChoiceQuestion {
  const resolved = resolveListeningChoiceFlowSteps(question, opts)
  const flow: ListeningChoiceFlow = {
    ...(question.flow || { version: 1, mode: 'semi-auto' as const }),
    version: 1,
    source: resolved.source,
    steps: resolved.steps as any
  }

  return {
    ...question,
    flow
  }
}

export function normalizeListeningChoiceQuestionForSave(
  question: ListeningChoiceQuestion,
  opts?: { generateId?: IdFactory; ctx?: { region?: string; scene?: string; grade?: string } }
): ListeningChoiceQuestion {
  const resolvedQuestion = resolveListeningChoiceQuestion(question, opts)
  const src: any = resolvedQuestion.flow?.source || { kind: 'standard', id: LISTENING_CHOICE_STANDARD_FLOW_ID }

  if (src?.kind === 'library') {
    return resolvedQuestion
  }

  const routingCtx = resolveRoutingCtx(resolvedQuestion, opts?.ctx)
  const resolved = resolveStandardModule(resolvedQuestion, src, routingCtx)
  const legacyModule = toLegacyStandardModule(resolved.module)
  const steps = (resolvedQuestion.flow?.steps || []) as any[]
  const detected = detectListeningChoiceStandardFlowOverrides(resolvedQuestion as any, steps, {
    module: legacyModule as any
  })

  if (detected.ok) {
    const overrides = detected.overrides || {}
    const compiled = compileListeningChoiceFlow(resolvedQuestion, resolved.module as any, {
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
        steps: compiled.steps as any
      }
    }
  }

  const templateSteps = concreteListeningChoiceStepsToTemplate(resolvedQuestion, steps as any)
  const mod = flowLibrary.ensureModule('listening_choice', templateSteps)
  const materialized = materializeListeningChoiceTemplateSteps(resolvedQuestion, templateSteps, { generateId: opts?.generateId }) as any
  return {
    ...resolvedQuestion,
    flow: {
      ...resolvedQuestion.flow,
      source: { kind: 'library', id: mod.id },
      steps: materialized
    }
  }
}
