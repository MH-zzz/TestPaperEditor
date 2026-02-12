export type FlowVisualPosition = {
  x: number
  y: number
}

export type FlowVisualPortDirection = 'in' | 'out'

export interface FlowVisualPort {
  id: string
  label: string
  direction: FlowVisualPortDirection
  maxLinks?: number
}

export type FlowVisualSize = {
  width: number
  height: number
}

export interface FlowVisualNode<T = Record<string, unknown>> {
  id: string
  kind: string
  label: string
  subtitle?: string
  color: string
  ports?: FlowVisualPort[]
  position: FlowVisualPosition
  size: FlowVisualSize
  data: T
}

export interface FlowVisualEdge {
  id: string
  source: string
  target: string
  x?: number
  y?: number
  height?: number
}

export interface FlowVisualCanvas {
  width: number
  height: number
}

export interface FlowVisualGraph<T = Record<string, unknown>> {
  nodes: FlowVisualNode<T>[]
  edges: FlowVisualEdge[]
  canvas: FlowVisualCanvas
}

export interface FlowVisualCompileIssue {
  code: string
  message: string
  path: string
}

export interface FlowVisualCompileResult<TStep = Record<string, unknown>> {
  ok: boolean
  steps: TStep[]
  errors: FlowVisualCompileIssue[]
  warnings: FlowVisualCompileIssue[]
}
