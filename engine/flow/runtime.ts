import type { FlowStepBranchProtocol, FlowStepProtocol } from '/types'

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

export type FlowRuntimeBranchContext = {
  totalScore?: number
  [key: string]: unknown
}

function clampStep(stepIndex: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(stepIndex, total - 1))
}

function normalizeEventType(v: unknown): string {
  return String(v || '').trim()
}

function normalizeStepId(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const normalized = v.trim()
  return normalized || undefined
}

function resolveBranchConditionResult(
  branch: FlowStepBranchProtocol,
  context?: FlowRuntimeBranchContext
): boolean | null {
  const condition = branch.condition as { type?: unknown; threshold?: unknown }
  const conditionType = normalizeEventType(condition?.type)
  if (conditionType !== 'score_gte') return null

  const threshold = Number(condition?.threshold)
  const score = Number(context?.totalScore)
  if (!Number.isFinite(threshold) || !Number.isFinite(score)) {
    return null
  }
  return score >= threshold
}

function resolveBranchTargetStepId(
  branch: FlowStepBranchProtocol,
  context?: FlowRuntimeBranchContext
): string | undefined {
  const passStepId = normalizeStepId(branch.passStepId)
  const failStepId = normalizeStepId(branch.failStepId)
  const defaultStepId = normalizeStepId(branch.defaultStepId) || failStepId || passStepId
  if (!passStepId && !failStepId && !defaultStepId) return undefined

  const result = resolveBranchConditionResult(branch, context)
  if (result === true) return passStepId || defaultStepId
  if (result === false) return failStepId || defaultStepId
  return defaultStepId
}

function shouldTriggerBranchTransition(step: FlowStepProtocol, eventType: string): boolean {
  if (eventType === 'next') return true
  const autoNext = normalizeEventType(step.autoNext)
  if (!autoNext || autoNext === 'tapNext') return false
  return eventType === autoNext
}

function buildStepIdIndexMap<TStep extends FlowStepProtocol>(steps: TStep[]): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = 0; i < steps.length; i += 1) {
    const stepId = normalizeStepId(steps[i]?.id)
    if (!stepId || map.has(stepId)) continue
    map.set(stepId, i)
  }
  return map
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
  const active = steps[current] as TStep | undefined
  const eventType = normalizeEventType(event?.type)

  if (event.type === 'goToStep' || eventType === 'goToStep') {
    const target = Number(event.type === 'goToStep' ? event.stepIndex : 0)
    return { stepIndex: clampStep(target, total) }
  }
  if (eventType === 'next') return { stepIndex: clampStep(current + 1, total) }
  if (eventType === 'prev') return { stepIndex: clampStep(current - 1, total) }

  const customReducer = typeof resolveStepReducer === 'function' && active
    ? resolveStepReducer(active, current)
    : null
  if (typeof customReducer === 'function') {
    const customState = normalizeReducerState(
      customReducer({
        state: { stepIndex: current },
        event,
        step: active as TStep,
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

export function reduceFlowRuntimeStateWithBranch<TStep extends FlowStepProtocol>(
  state: FlowRuntimeState,
  steps: TStep[],
  event: FlowRuntimeEvent,
  context?: FlowRuntimeBranchContext
): FlowRuntimeState {
  const total = Array.isArray(steps) ? steps.length : 0
  const current = clampStep(state.stepIndex, total)
  const active = steps[current] as TStep | undefined
  const eventType = normalizeEventType(event?.type)

  if (event.type === 'goToStep' || eventType === 'goToStep') {
    const target = Number(event.type === 'goToStep' ? event.stepIndex : 0)
    return { stepIndex: clampStep(target, total) }
  }
  if (eventType === 'prev') {
    return { stepIndex: clampStep(current - 1, total) }
  }

  if (active?.branch && shouldTriggerBranchTransition(active, eventType)) {
    const stepIdIndexMap = buildStepIdIndexMap(steps)
    const targetStepId = resolveBranchTargetStepId(active.branch, context)
    const targetStepIndex = typeof targetStepId === 'string'
      ? stepIdIndexMap.get(targetStepId)
      : undefined
    if (typeof targetStepIndex === 'number') {
      return { stepIndex: clampStep(targetStepIndex, total) }
    }
    return { stepIndex: current }
  }

  if (eventType === 'next') return { stepIndex: clampStep(current + 1, total) }

  const autoNext = normalizeEventType(active?.autoNext)
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
