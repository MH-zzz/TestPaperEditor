import type { ListeningChoiceQuestion, Question } from '/types'

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

function normalizeNullableText(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

export function readQuestionFlowContext(question: any): FlowContextSnapshot {
  const metadata = question?.metadata && typeof question.metadata === 'object' ? question.metadata : {}
  const flowContext = metadata.flowContext && typeof metadata.flowContext === 'object' ? metadata.flowContext : {}
  return {
    region: normalizeNullableText(flowContext.region) || normalizeNullableText(metadata.region) || '',
    scene: normalizeNullableText(flowContext.scene) || normalizeNullableText(metadata.scene) || '',
    grade: normalizeNullableText(flowContext.grade) || normalizeNullableText(metadata.grade) || ''
  }
}

export function patchQuestionFlowContext<TQuestion extends Question>(
  question: TQuestion,
  input: FlowContextInput
): TQuestion {
  const metadata = question?.metadata && typeof question.metadata === 'object' ? question.metadata : {}
  const region = normalizeNullableText(input.region)
  const scene = normalizeNullableText(input.scene)
  const grade = normalizeNullableText(input.grade)
  const flowContext: Record<string, string> = {}
  if (region) flowContext.region = region
  if (scene) flowContext.scene = scene
  if (grade) flowContext.grade = grade

  const nextMetadata: Record<string, any> = { ...metadata }
  if (Object.keys(flowContext).length > 0) nextMetadata.flowContext = flowContext
  else delete nextMetadata.flowContext

  return {
    ...(question as any),
    metadata: nextMetadata
  } as TQuestion
}

export function patchListeningChoiceQuestionFlow(
  question: ListeningChoiceQuestion,
  source: Record<string, any>,
  steps: any[]
): ListeningChoiceQuestion {
  return {
    ...(question as any),
    flow: {
      ...(((question as any)?.flow || {}) as Record<string, any>),
      version: 1,
      mode: 'semi-auto',
      source,
      steps
    }
  } as ListeningChoiceQuestion
}
