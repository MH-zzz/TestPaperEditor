import type { FlowRuntimeState } from '/engine/flow/runtime.ts'

function clamp(stepIndex: number, totalSteps: number) {
  if (totalSteps <= 0) return 0
  return Math.max(0, Math.min(stepIndex, totalSteps - 1))
}

export function reduceByAutoNext(
  state: FlowRuntimeState,
  totalSteps: number,
  eventType: string,
  autoNext?: string
): FlowRuntimeState | null {
  const event = String(eventType || '').trim()
  const nextSignal = String(autoNext || '').trim()
  if (!event || !nextSignal) return null
  if (nextSignal === 'tapNext') return null
  if (event !== nextSignal) return null

  return {
    stepIndex: clamp(state.stepIndex + 1, totalSteps)
  }
}
