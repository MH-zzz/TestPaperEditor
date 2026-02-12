import type { FlowStepProtocol } from '/types'

export interface FlowRuntimeState {
  stepIndex: number
}

export type FlowRuntimeEvent =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'audioEnded' }
  | { type: 'countdownEnded' }
  | { type: 'timeEnded' }
  | { type: 'goToStep'; stepIndex: number }

export type FlowRuntimeStepReducerContext<TStep extends FlowStepProtocol = FlowStepProtocol> = {
  state: FlowRuntimeState
  event: FlowRuntimeEvent
  step: TStep
  stepIndex: number
  totalSteps: number
}

export type FlowRuntimeStepReducer<TStep extends FlowStepProtocol = FlowStepProtocol> = (
  ctx: FlowRuntimeStepReducerContext<TStep>
) => FlowRuntimeState | null

export type FlowRuntimeStepReducerResolver<TStep extends FlowStepProtocol = FlowStepProtocol> = (
  step: TStep,
  stepIndex: number
) => FlowRuntimeStepReducer<TStep> | null

function clampStep(stepIndex: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(stepIndex, total - 1))
}

function normalizeEventType(v: any): string {
  return String(v || '').trim()
}

function normalizeReducerState(state: FlowRuntimeState | null, current: number, total: number): FlowRuntimeState | null {
  if (!state || typeof state !== 'object') return null
  const raw = typeof state.stepIndex === 'number' ? state.stepIndex : Number.NaN
  if (!Number.isFinite(raw)) return { stepIndex: current }
  return { stepIndex: clampStep(Math.floor(raw), total) }
}

export function createFlowRuntimeState(initialStep = 0): FlowRuntimeState {
  return { stepIndex: Math.max(0, Math.floor(Number(initialStep) || 0)) }
}

export function reduceFlowRuntimeStateWithStepReducer<TStep extends FlowStepProtocol>(
  state: FlowRuntimeState,
  steps: TStep[],
  event: FlowRuntimeEvent,
  resolveStepReducer?: FlowRuntimeStepReducerResolver<TStep> | null
): FlowRuntimeState {
  const total = Array.isArray(steps) ? steps.length : 0
  const current = clampStep(state.stepIndex, total)
  const active: any = steps[current]
  const eventType = normalizeEventType(event?.type)

  if (event.type === 'goToStep' || eventType === 'goToStep') {
    const target = Number(event.type === 'goToStep' ? event.stepIndex : 0)
    return { stepIndex: clampStep(target, total) }
  }
  if (eventType === 'next') return { stepIndex: clampStep(current + 1, total) }
  if (eventType === 'prev') return { stepIndex: clampStep(current - 1, total) }

  const customReducer = typeof resolveStepReducer === 'function' ? resolveStepReducer(active, current) : null
  if (typeof customReducer === 'function') {
    const customState = normalizeReducerState(
      customReducer({
        state: { stepIndex: current },
        event,
        step: active,
        stepIndex: current,
        totalSteps: total
      }),
      current,
      total
    )
    if (customState) return customState
  }

  const autoNext = normalizeEventType(active?.autoNext)
  // "tapNext" means manual navigation; runtime auto events should not advance.
  if (!autoNext || autoNext === 'tapNext') {
    return { stepIndex: current }
  }

  if (eventType === autoNext) {
    return { stepIndex: clampStep(current + 1, total) }
  }

  return { stepIndex: current }
}

export function reduceFlowRuntimeState<TStep extends FlowStepProtocol>(
  state: FlowRuntimeState,
  steps: TStep[],
  event: FlowRuntimeEvent
): FlowRuntimeState {
  return reduceFlowRuntimeStateWithStepReducer(state, steps, event, null)
}
