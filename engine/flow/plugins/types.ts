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
  // Declares which step fields are editable in flow-config UI.
  configFields?: FlowStepConfigField[]
}

export type FlowStepConfigField =
  | 'showTitle'
  | 'showTitleDescription'
  | 'showDescription'
  | 'showQuestionTitle'
  | 'showQuestionTitleDescription'
  | 'showGroupPrompt'
  | 'audioSource'
  | 'repeatGapSeconds'
  | 'label'
  | 'url'
  | 'textSource'
  | 'screenStrategy'

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
