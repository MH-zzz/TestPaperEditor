import type { FlowRuntimeEvent, FlowRuntimeState } from '/engine/flow/runtime.ts'

export type FlowStepPluginValidationResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export type FlowStepPluginSchema = {
  description?: string
  requiredFields?: string[]
  optionalFields?: string[]
}

export type FlowStepPluginRenderer = {
  view: string
  reusePreviousScreen?: boolean
  audioCarrier?: string | null
  contextInfo?: boolean
}

export type FlowStepPluginRuntimeReducerContext<TStep = any> = {
  state: FlowRuntimeState
  event: FlowRuntimeEvent
  step: TStep
  stepIndex: number
  totalSteps: number
}

export type FlowStepPluginRuntimeReducer<TStep = any> = (
  ctx: FlowStepPluginRuntimeReducerContext<TStep>
) => FlowRuntimeState | null

export interface FlowStepPlugin<TStep = any> {
  kind: string
  schema: FlowStepPluginSchema
  renderer: FlowStepPluginRenderer
  runtimeReducer?: FlowStepPluginRuntimeReducer<TStep>
  validator?: (step: TStep) => FlowStepPluginValidationResult
}
