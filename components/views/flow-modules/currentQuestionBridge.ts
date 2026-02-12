import type {
  ListeningChoiceFlowSource,
  ListeningChoiceFlowStep,
  ListeningChoiceQuestion,
  Question,
  QuestionMetadata
} from '/types'

export type FlowContextInput = {
  region?: string
  scene?: string
  grade?: string
}

export type FlowContextSnapshot = {
  region: string
  scene: string
  grade: string
}

type QuestionWithMetadata<TQuestion extends Question = Question> = TQuestion & {
  metadata?: QuestionMetadata
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function normalizeNullableText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function readQuestionMetadata(question: unknown): QuestionMetadata {
  if (!isObjectRecord(question) || !isObjectRecord(question.metadata)) return {}
  return question.metadata as QuestionMetadata
}

export function readQuestionFlowContext(question: unknown): FlowContextSnapshot {
  const metadata = readQuestionMetadata(question)
  const flowContext = isObjectRecord(metadata.flowContext) ? metadata.flowContext : {}
  return {
    region: normalizeNullableText(flowContext.region) || normalizeNullableText(metadata.region) || '',
    scene: normalizeNullableText(flowContext.scene) || normalizeNullableText(metadata.scene) || '',
    grade: normalizeNullableText(flowContext.grade) || normalizeNullableText(metadata.grade) || ''
  }
}

export function patchQuestionFlowContext<TQuestion extends QuestionWithMetadata>(
  question: TQuestion,
  input: FlowContextInput
): TQuestion {
  const metadata = readQuestionMetadata(question)
  const region = normalizeNullableText(input.region)
  const scene = normalizeNullableText(input.scene)
  const grade = normalizeNullableText(input.grade)
  const flowContext: Record<string, string> = {}
  if (region) flowContext.region = region
  if (scene) flowContext.scene = scene
  if (grade) flowContext.grade = grade

  const nextMetadata: QuestionMetadata = { ...metadata }
  if (Object.keys(flowContext).length > 0) nextMetadata.flowContext = flowContext
  else delete nextMetadata.flowContext

  return {
    ...question,
    metadata: nextMetadata
  }
}

export function patchListeningChoiceQuestionFlow(
  question: ListeningChoiceQuestion,
  source: ListeningChoiceFlowSource,
  steps: ListeningChoiceFlowStep[]
): ListeningChoiceQuestion {
  return {
    ...question,
    flow: {
      ...question.flow,
      version: 1,
      mode: 'semi-auto',
      source,
      steps
    }
  } as ListeningChoiceQuestion
}
