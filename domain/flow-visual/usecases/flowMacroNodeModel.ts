import type {
  FlowMacroAutoNextMode,
  FlowMacroGroupBindingMode,
  FlowMacroNodePayload
} from '/types'

type FlowMacroNodeInput = {
  nodeKind?: unknown
  snippet?: {
    baseId?: unknown
    version?: unknown
    name?: unknown
    hash?: unknown
  }
  binding?: {
    groupBindingMode?: unknown
    groupId?: unknown
    autoNextMode?: unknown
    autoNext?: unknown
  }
  expandedStepCount?: unknown
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function normalizeVersion(value: unknown): number | undefined {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  const normalized = Math.floor(parsed)
  if (normalized <= 0) return undefined
  return normalized
}

function normalizeExpandedStepCount(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  const normalized = Math.floor(parsed)
  return Math.max(1, normalized)
}

function normalizeGroupBindingMode(value: unknown): FlowMacroGroupBindingMode {
  const text = String(value || '').trim()
  if (text === 'fixed') return 'fixed'
  if (text === 'empty') return 'empty'
  return 'inherit'
}

function normalizeAutoNextMode(value: unknown): FlowMacroAutoNextMode {
  return String(value || '').trim() === 'override' ? 'override' : 'inherit'
}

export function normalizeFlowMacroNodePayload(input: unknown): FlowMacroNodePayload | null {
  const src = input as FlowMacroNodeInput | null | undefined
  if (!src || typeof src !== 'object') return null

  const snippetBaseId = normalizeText(src.snippet?.baseId)
  const snippetVersion = normalizeVersion(src.snippet?.version)
  if (!snippetBaseId || !snippetVersion) return null

  const snippetName = normalizeText(src.snippet?.name)
  const snippetHash = normalizeText(src.snippet?.hash)
  let groupBindingMode = normalizeGroupBindingMode(src.binding?.groupBindingMode)
  let groupId = normalizeText(src.binding?.groupId)
  let autoNextMode = normalizeAutoNextMode(src.binding?.autoNextMode)
  let autoNext = normalizeText(src.binding?.autoNext)

  if (groupBindingMode === 'fixed' && !groupId) {
    groupBindingMode = 'inherit'
  }
  if (groupBindingMode !== 'fixed') {
    groupId = undefined
  }
  if (autoNextMode === 'override' && !autoNext) {
    autoNextMode = 'inherit'
  }
  if (autoNextMode !== 'override') {
    autoNext = undefined
  }

  return {
    nodeKind: 'macroNode',
    snippet: {
      baseId: snippetBaseId,
      version: snippetVersion,
      name: snippetName,
      hash: snippetHash
    },
    binding: {
      groupBindingMode,
      groupId,
      autoNextMode,
      autoNext
    },
    expandedStepCount: normalizeExpandedStepCount(src.expandedStepCount)
  }
}

export function serializeFlowMacroNodePayload(input: unknown): Record<string, unknown> | null {
  const normalized = normalizeFlowMacroNodePayload(input)
  if (!normalized) return null

  const payload: Record<string, unknown> = {
    nodeKind: normalized.nodeKind,
    snippet: {
      baseId: normalized.snippet.baseId,
      version: normalized.snippet.version
    },
    binding: {
      groupBindingMode: normalized.binding.groupBindingMode,
      autoNextMode: normalized.binding.autoNextMode
    },
    expandedStepCount: normalized.expandedStepCount
  }

  if (normalized.snippet.name) {
    ;(payload.snippet as Record<string, unknown>).name = normalized.snippet.name
  }
  if (normalized.snippet.hash) {
    ;(payload.snippet as Record<string, unknown>).hash = normalized.snippet.hash
  }
  if (normalized.binding.groupBindingMode === 'fixed' && normalized.binding.groupId) {
    ;(payload.binding as Record<string, unknown>).groupId = normalized.binding.groupId
  }
  if (normalized.binding.autoNextMode === 'override' && normalized.binding.autoNext) {
    ;(payload.binding as Record<string, unknown>).autoNext = normalized.binding.autoNext
  }

  return payload
}
