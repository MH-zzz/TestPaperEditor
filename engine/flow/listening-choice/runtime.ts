import type { ListeningChoiceFlowStep } from '/types'
import {
  createFlowRuntimeState,
  reduceFlowRuntimeStateWithStepReducer,
  type FlowRuntimeEvent,
  type FlowRuntimeState
} from '../runtime.ts'
import { getListeningChoiceStepPlugin } from '../plugins/listening-choice/index.ts'

export type ListeningChoiceRuntimeState = FlowRuntimeState
export type ListeningChoiceRuntimeEvent = FlowRuntimeEvent

export function createListeningChoiceRuntimeState(initialStep = 0): ListeningChoiceRuntimeState {
  return createFlowRuntimeState(initialStep)
}

export function reduceListeningChoiceRuntimeState(
  state: ListeningChoiceRuntimeState,
  steps: ListeningChoiceFlowStep[],
  event: ListeningChoiceRuntimeEvent
): ListeningChoiceRuntimeState {
  return reduceFlowRuntimeStateWithStepReducer(state, steps as any, event, (step: any) => {
    const plugin = getListeningChoiceStepPlugin(String(step?.kind || ''))
    return typeof plugin.runtimeReducer === 'function' ? plugin.runtimeReducer : null
  })
}
