import type { SpeakingStepsStep } from '/types'
import {
  createFlowRuntimeState,
  reduceFlowRuntimeState,
  type FlowRuntimeEvent,
  type FlowRuntimeState
} from '../runtime.ts'

export type SpeakingStepsRuntimeState = FlowRuntimeState
export type SpeakingStepsRuntimeEvent = FlowRuntimeEvent

type SpeakingStepsRuntimeProtocolStep = {
  id: string
  kind: string
  autoNext?: string
}

function toRuntimeProtocolSteps(steps: SpeakingStepsStep[]): SpeakingStepsRuntimeProtocolStep[] {
  return (steps || []).map((step: any, index: number) => ({
    id: String(step?.id || `speaking_step_${index + 1}`),
    kind: String(step?.type || 'unknown'),
    autoNext: typeof step?.autoNext === 'string' ? step.autoNext : undefined
  }))
}

export function createSpeakingStepsRuntimeState(initialStep = 0): SpeakingStepsRuntimeState {
  return createFlowRuntimeState(initialStep)
}

export function reduceSpeakingStepsRuntimeState(
  state: SpeakingStepsRuntimeState,
  steps: SpeakingStepsStep[],
  event: SpeakingStepsRuntimeEvent
): SpeakingStepsRuntimeState {
  return reduceFlowRuntimeState(state, toRuntimeProtocolSteps(steps) as any, event)
}
