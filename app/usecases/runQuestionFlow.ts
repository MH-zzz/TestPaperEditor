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
import {
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
} from '/flows/listeningChoiceFlowModules'
import type {
  ListeningChoiceQuestion,
  Question,
  QuestionMetadata,
  SpeakingHearAnswerQuestion,
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

export type QuestionFlowRuntimeEntryMode = 'full' | 'partial'
export type QuestionFlowRuntimeEntryTimerState = 'reset' | 'resume'

export type QuestionFlowRuntimeEntry = {
  mode?: QuestionFlowRuntimeEntryMode
  stepIndex?: number
  groupId?: string
  questionId?: string
  timerState?: QuestionFlowRuntimeEntryTimerState
}

export type QuestionFlowRuntimeMeta = {
  sourceKind: string
  profileId: string
  moduleId: string
  moduleVersion: number
  moduleDisplayRef: string
  moduleNote: string
  moduleVersionText: string
  entryMode?: QuestionFlowRuntimeEntryMode
  entryStepIndex?: number
  entryGroupId?: string
  entryQuestionId?: string
  entryTimerState?: string
}

export type RunQuestionFlowOptions = {
  generateId?: () => string
  ctx?: FlowRoutingContext
  initialStepIndex?: number
  entry?: QuestionFlowRuntimeEntry
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

function clampStepIndex(stepIndex: number, total: number): number {
  const safe = Math.max(0, Math.floor(Number(stepIndex) || 0))
  if (!Number.isFinite(total) || total <= 0) return safe
  return Math.max(0, Math.min(safe, total - 1))
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
    region: normalizeText(flowCtx.region),
    scene: normalizeText(flowCtx.scene),
    grade: normalizeText(flowCtx.grade)
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

function readSpeakingStepsAutoNext(step: unknown): string | undefined {
  if (!isObjectRecord(step)) return undefined
  const raw = step.autoNext
  return typeof raw === 'string' ? raw : undefined
}

export function getQuestionFlowSteps(question: Question): RuntimeStepProtocol[] {
  if (question.type === 'listening_choice' || question.type === 'speaking_hear_answer') {
    const steps = (question as ListeningChoiceQuestion | SpeakingHearAnswerQuestion).flow?.steps || []
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

  return []
}

export function createQuestionFlowRuntimeState(
  question: Question,
  initialStepIndex = 0
): FlowRuntimeState {
  const initial = Math.max(0, toInt(initialStepIndex, 0))

  if (question.type === 'listening_choice' || question.type === 'speaking_hear_answer') {
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
  if (question.type === 'listening_choice' || question.type === 'speaking_hear_answer') {
    return reduceListeningChoiceRuntimeState(
      state,
      (question as ListeningChoiceQuestion | SpeakingHearAnswerQuestion).flow?.steps || [],
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
  if (question.type !== 'listening_choice' && question.type !== 'speaking_hear_answer') return question

  return resolveListeningChoiceQuestion(question as ListeningChoiceQuestion | SpeakingHearAnswerQuestion, {
    generateId: opts?.generateId,
    ctx: mergeRoutingContext(question, opts?.ctx)
  }) as Question
}

function resolveRuntimeEntryMode(entry?: QuestionFlowRuntimeEntry): QuestionFlowRuntimeEntryMode {
  return entry?.mode === 'partial' ? 'partial' : 'full'
}

function resolveRuntimeEntryStepIndex(
  steps: RuntimeStepProtocol[],
  opts?: RunQuestionFlowOptions
): number {
  const total = Array.isArray(steps) ? steps.length : 0
  const raw = opts?.entry?.stepIndex ?? opts?.initialStepIndex ?? 0
  return clampStepIndex(toInt(raw, 0), total)
}

function resolveRuntimeMeta(
  question: Question,
  entryStepIndex: number,
  opts?: RunQuestionFlowOptions
): QuestionFlowRuntimeMeta {
  const isListeningLike = question.type === 'listening_choice' || question.type === 'speaking_hear_answer'
  const entry = opts?.entry
  const entryMode = resolveRuntimeEntryMode(entry)
  const entryGroupId = normalizeText(entry?.groupId)
  const entryQuestionId = normalizeText(entry?.questionId)
  const entryTimerState = entry?.timerState === 'resume' ? 'resume' : 'reset'
  if (!isListeningLike) {
    return {
      sourceKind: 'inline',
      profileId: '',
      moduleId: '',
      moduleVersion: 0,
      moduleDisplayRef: '-',
      moduleNote: '',
      moduleVersionText: '-',
      entryMode,
      entryStepIndex,
      entryGroupId,
      entryQuestionId,
      entryTimerState
    }
  }

  const source = (question as ListeningChoiceQuestion | SpeakingHearAnswerQuestion).flow?.source
  const sourceKind = 'standard'
  const profileId = sourceKind === 'standard' && question.type === 'listening_choice' ? String(source?.profileId || '') : ''
  const defaultStandardId = question.type === 'speaking_hear_answer'
    ? LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
    : LISTENING_CHOICE_STANDARD_FLOW_ID
  const moduleId = String(source?.id || defaultStandardId)
  const moduleVersion = sourceKind === 'standard'
    ? Math.max(1, toInt(source?.version, 1))
    : 0

  const display = sourceKind === 'standard' && moduleId && opts?.resolveModuleDisplay
    ? opts.resolveModuleDisplay({ id: moduleId, version: moduleVersion })
    : null

  const moduleDisplayRef = display?.displayRef
    || `${moduleId} @ v${moduleVersion}`

  return {
    sourceKind,
    profileId,
    moduleId,
    moduleVersion,
    moduleDisplayRef,
    moduleNote: String(display?.note || ''),
    moduleVersionText: `v${moduleVersion}`,
    entryMode,
    entryStepIndex,
    entryGroupId,
    entryQuestionId,
    entryTimerState
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
  const steps = getQuestionFlowSteps(resolvedQuestion)
  const entryStepIndex = resolveRuntimeEntryStepIndex(steps, opts)
  const runtimeState = createQuestionFlowRuntimeState(resolvedQuestion, entryStepIndex)

  return {
    resolvedQuestion,
    runtimeState,
    totalSteps: steps.length,
    activeStepKind: getQuestionActiveStepKind(resolvedQuestion, runtimeState.stepIndex),
    meta: resolveRuntimeMeta(resolvedQuestion, runtimeState.stepIndex, opts),
    ctx: mergeRoutingContext(question, opts?.ctx)
  }
}
