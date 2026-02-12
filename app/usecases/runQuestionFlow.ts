import type { FlowRuntimeState, FlowRuntimeEvent } from '/engine/flow/runtime.ts'
import { createFlowRuntimeState, reduceFlowRuntimeState } from '/engine/flow/runtime.ts'
import {
  createListeningChoiceRuntimeState,
  reduceListeningChoiceRuntimeState
} from '/engine/flow/listening-choice/runtime.ts'
import {
  createSpeakingStepsRuntimeState,
  reduceSpeakingStepsRuntimeState
} from '/engine/flow/speaking-steps/runtime.ts'
import { resolveListeningChoiceQuestion } from '/engine/flow/listening-choice/binding.ts'
import { LISTENING_CHOICE_STANDARD_FLOW_ID } from '/flows/listeningChoiceFlowModules'
import type {
  ListeningChoiceQuestion,
  Question,
  QuestionMetadata,
  SpeakingQuestion,
  SpeakingStepsQuestion
} from '/types'

export type FlowRoutingContext = {
  region?: string
  scene?: string
  grade?: string
}

export type RuntimeModuleDisplay = {
  displayRef: string
  note?: string
}

export type RuntimeModuleDisplayResolver = (
  ref: { id: string; version: number }
) => RuntimeModuleDisplay | null | undefined

export type QuestionFlowRuntimeMeta = {
  sourceKind: string
  profileId: string
  moduleId: string
  moduleVersion: number
  moduleDisplayRef: string
  moduleNote: string
  moduleVersionText: string
}

export type RunQuestionFlowOptions = {
  generateId?: () => string
  ctx?: FlowRoutingContext
  initialStepIndex?: number
  resolveModuleDisplay?: RuntimeModuleDisplayResolver
}

export type RunQuestionFlowResult = {
  resolvedQuestion: Question
  runtimeState: FlowRuntimeState
  totalSteps: number
  activeStepKind: string
  meta: QuestionFlowRuntimeMeta
  ctx: FlowRoutingContext
}

type RuntimeStepProtocol = {
  id: string
  kind: string
  autoNext?: string
}

type QuestionWithMetadata = Question & { metadata?: QuestionMetadata }

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function normalizeText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function toInt(v: unknown, fallback = 0): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.floor(n)
}

function normalizeRoutingContext(ctx?: FlowRoutingContext): FlowRoutingContext {
  return {
    region: normalizeText(ctx?.region),
    scene: normalizeText(ctx?.scene),
    grade: normalizeText(ctx?.grade)
  }
}

function readQuestionMetadata(question: Question): QuestionMetadata {
  const metadata = (question as QuestionWithMetadata).metadata
  return isObjectRecord(metadata) ? (metadata as QuestionMetadata) : {}
}

function getQuestionRoutingContext(question: Question): FlowRoutingContext {
  const meta = readQuestionMetadata(question)
  const flowCtx = isObjectRecord(meta.flowContext) ? meta.flowContext : {}
  return {
    region: normalizeText(flowCtx.region) || normalizeText(meta.region),
    scene: normalizeText(flowCtx.scene) || normalizeText(meta.scene),
    grade: normalizeText(flowCtx.grade) || normalizeText(meta.grade)
  }
}

function mergeRoutingContext(question: Question, inputCtx?: FlowRoutingContext): FlowRoutingContext {
  const ctx = normalizeRoutingContext(inputCtx)
  const fallback = getQuestionRoutingContext(question)
  return {
    region: ctx.region || fallback.region,
    scene: ctx.scene || fallback.scene,
    grade: ctx.grade || fallback.grade
  }
}

function toSpeakingRuntimeSteps(question: SpeakingQuestion): RuntimeStepProtocol[] {
  return (question.steps || []).map((step, index) => ({
    id: String(step?.id || `speaking_${index + 1}`),
    kind: String(step?.behavior || 'manual')
  }))
}

function readSpeakingStepsAutoNext(step: unknown): string | undefined {
  if (!isObjectRecord(step)) return undefined
  const raw = step.autoNext
  return typeof raw === 'string' ? raw : undefined
}

export function getQuestionFlowSteps(question: Question): RuntimeStepProtocol[] {
  if (question.type === 'listening_choice') {
    const steps = (question as ListeningChoiceQuestion).flow?.steps || []
    return steps.map((step, index) => ({
      id: String(step?.id || `flow_${index + 1}`),
      kind: String(step?.kind || 'unknown'),
      autoNext: typeof step?.autoNext === 'string' ? step.autoNext : undefined
    }))
  }

  if (question.type === 'speaking_steps') {
    const steps = (question as SpeakingStepsQuestion).steps || []
    return steps.map((step, index) => ({
      id: String(step?.id || `speaking_steps_${index + 1}`),
      kind: String(step?.type || 'unknown'),
      autoNext: readSpeakingStepsAutoNext(step)
    }))
  }

  if (question.type === 'speaking') {
    return toSpeakingRuntimeSteps(question as SpeakingQuestion)
  }

  return []
}

export function createQuestionFlowRuntimeState(
  question: Question,
  initialStepIndex = 0
): FlowRuntimeState {
  const initial = Math.max(0, toInt(initialStepIndex, 0))

  if (question.type === 'listening_choice') {
    return createListeningChoiceRuntimeState(initial)
  }

  if (question.type === 'speaking_steps') {
    return createSpeakingStepsRuntimeState(initial)
  }

  return createFlowRuntimeState(initial)
}

export function reduceQuestionFlowRuntimeState(
  question: Question,
  state: FlowRuntimeState,
  event: FlowRuntimeEvent
): FlowRuntimeState {
  if (question.type === 'listening_choice') {
    return reduceListeningChoiceRuntimeState(
      state,
      (question as ListeningChoiceQuestion).flow?.steps || [],
      event
    )
  }

  if (question.type === 'speaking_steps') {
    return reduceSpeakingStepsRuntimeState(
      state,
      (question as SpeakingStepsQuestion).steps || [],
      event
    )
  }

  return reduceFlowRuntimeState(state, getQuestionFlowSteps(question), event)
}

function resolveQuestion(question: Question, opts?: RunQuestionFlowOptions): Question {
  if (question.type !== 'listening_choice') return question

  return resolveListeningChoiceQuestion(question as ListeningChoiceQuestion, {
    generateId: opts?.generateId,
    ctx: mergeRoutingContext(question, opts?.ctx)
  }) as Question
}

function resolveRuntimeMeta(
  question: Question,
  opts?: RunQuestionFlowOptions
): QuestionFlowRuntimeMeta {
  if (question.type !== 'listening_choice') {
    return {
      sourceKind: 'inline',
      profileId: '',
      moduleId: '',
      moduleVersion: 0,
      moduleDisplayRef: '-',
      moduleNote: '',
      moduleVersionText: '-'
    }
  }

  const source = (question as ListeningChoiceQuestion).flow?.source
  const sourceKind = source?.kind === 'library' ? 'library' : 'standard'
  const profileId = sourceKind === 'standard' ? String(source?.profileId || '') : ''
  const moduleId = sourceKind === 'library'
    ? String(source?.id || '')
    : String(source?.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const moduleVersion = sourceKind === 'standard'
    ? Math.max(1, toInt(source?.version, 1))
    : 0

  const display = sourceKind === 'standard' && moduleId && opts?.resolveModuleDisplay
    ? opts.resolveModuleDisplay({ id: moduleId, version: moduleVersion })
    : null

  const moduleDisplayRef = display?.displayRef
    || (sourceKind === 'library' ? (moduleId ? `流程库:${moduleId}` : '流程库') : `${moduleId} @ v${moduleVersion}`)

  return {
    sourceKind,
    profileId,
    moduleId,
    moduleVersion,
    moduleDisplayRef,
    moduleNote: String(display?.note || ''),
    moduleVersionText: sourceKind === 'standard' ? `v${moduleVersion}` : '-'
  }
}

export function getQuestionActiveStepKind(question: Question, stepIndex: number): string {
  const steps = getQuestionFlowSteps(question)
  const index = Math.max(0, Math.min(steps.length - 1, toInt(stepIndex, 0)))
  const step = steps[index]
  return String(step?.kind || '')
}

export function runQuestionFlow(
  question: Question,
  opts?: RunQuestionFlowOptions
): RunQuestionFlowResult {
  const resolvedQuestion = resolveQuestion(question, opts)
  const runtimeState = createQuestionFlowRuntimeState(resolvedQuestion, opts?.initialStepIndex || 0)
  const steps = getQuestionFlowSteps(resolvedQuestion)

  return {
    resolvedQuestion,
    runtimeState,
    totalSteps: steps.length,
    activeStepKind: getQuestionActiveStepKind(resolvedQuestion, runtimeState.stepIndex),
    meta: resolveRuntimeMeta(resolvedQuestion, opts),
    ctx: mergeRoutingContext(question, opts?.ctx)
  }
}
