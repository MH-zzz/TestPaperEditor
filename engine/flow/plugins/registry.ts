import type { FlowStepPlugin } from './types.ts'

function normalizeKind(v: any): string {
  return String(v || '').trim()
}

function validatePluginShape(namespace: string, plugin: FlowStepPlugin) {
  const kind = normalizeKind(plugin?.kind)
  if (!kind) throw new Error(`[flow-plugin:${namespace}] missing plugin kind`)
  if (!plugin || typeof plugin !== 'object') {
    throw new Error(`[flow-plugin:${namespace}] plugin ${kind} must be an object`)
  }
  if (!plugin.schema || typeof plugin.schema !== 'object') {
    throw new Error(`[flow-plugin:${namespace}] plugin ${kind} missing schema`)
  }
  if (!plugin.renderer || typeof plugin.renderer !== 'object') {
    throw new Error(`[flow-plugin:${namespace}] plugin ${kind} missing renderer`)
  }
  if (!normalizeKind((plugin.renderer as any).view)) {
    throw new Error(`[flow-plugin:${namespace}] plugin ${kind} renderer.view is required`)
  }
}

export class FlowStepPluginRegistry<TPlugin extends FlowStepPlugin = FlowStepPlugin> {
  private readonly plugins = new Map<string, TPlugin>()
  private readonly namespace: string

  constructor(namespace: string) {
    this.namespace = namespace
  }

  register(plugin: TPlugin): this {
    validatePluginShape(this.namespace, plugin)

    const kind = normalizeKind(plugin.kind)
    if (this.plugins.has(kind)) {
      throw new Error(`[flow-plugin:${this.namespace}] duplicate plugin kind: ${kind}`)
    }

    this.plugins.set(kind, plugin)
    return this
  }

  registerMany(plugins: TPlugin[]): this {
    ;(plugins || []).forEach((plugin) => {
      this.register(plugin)
    })
    return this
  }

  get(kind: string): TPlugin | null {
    const key = normalizeKind(kind)
    if (!key) return null
    return this.plugins.get(key) || null
  }

  ensure(kind: string): TPlugin {
    const hit = this.get(kind)
    if (hit) return hit
    throw new Error(`[flow-plugin:${this.namespace}] plugin not found: ${normalizeKind(kind) || '(empty)'}`)
  }

  list(): TPlugin[] {
    return Array.from(this.plugins.values())
  }
}

export function createFlowStepPluginRegistry<TPlugin extends FlowStepPlugin = FlowStepPlugin>(
  namespace: string
) {
  return new FlowStepPluginRegistry<TPlugin>(normalizeKind(namespace) || 'default')
}
