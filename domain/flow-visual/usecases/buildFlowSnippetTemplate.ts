export type FlowSnippetGroupBinding = 'inherit' | 'empty'

export type FlowSnippetTemplateStep = {
  kind: string
  autoNext: string
  groupBinding: FlowSnippetGroupBinding
}

export type FlowSnippetTemplate = {
  id: string
  baseId: string
  version: number
  name: string
  hash: string
  steps: FlowSnippetTemplateStep[]
  createdAt: string
  updatedAt: string
}

type FlowSnippetTemplateStepInput = Partial<FlowSnippetTemplateStep> & {
  kind?: unknown
  autoNext?: unknown
  groupBinding?: unknown
}

type CreateFlowSnippetTemplateRevisionInput = {
  previous?: FlowSnippetTemplate | null
  name?: unknown
  steps?: FlowSnippetTemplateStepInput[] | null
  nowIso?: string
  nowMs?: number
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  const t = typeof value
  if (t === 'number' || t === 'boolean') return JSON.stringify(value)
  if (t === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',')}}`
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function normalizeFlowSnippetName(name: unknown): string {
  const text = String(name || '').trim()
  return text || '流程片段'
}

function normalizeFlowSnippetStepKind(kind: unknown): string {
  return String(kind || '').trim()
}

function normalizeFlowSnippetStepAutoNext(autoNext: unknown): string {
  return String(autoNext || '').trim()
}

function normalizeFlowSnippetGroupBinding(input: unknown): FlowSnippetGroupBinding {
  return String(input || '').trim() === 'inherit' ? 'inherit' : 'empty'
}

function normalizeFlowSnippetTemplateSteps(steps: FlowSnippetTemplateStepInput[] | null | undefined): FlowSnippetTemplateStep[] {
  const source = Array.isArray(steps) ? steps : []
  const result: FlowSnippetTemplateStep[] = []
  for (const item of source) {
    const kind = normalizeFlowSnippetStepKind(item?.kind)
    if (!kind) continue
    result.push({
      kind,
      autoNext: normalizeFlowSnippetStepAutoNext(item?.autoNext),
      groupBinding: normalizeFlowSnippetGroupBinding(item?.groupBinding)
    })
  }
  return result
}

function slugifySnippetName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
  return normalized || 'flow'
}

function buildFlowSnippetBaseId(name: string, nowMs: number): string {
  return `snippet_${slugifySnippetName(name)}_${Math.max(1, Math.floor(nowMs)).toString(36)}`
}

export function hashFlowSnippetTemplateSteps(steps: FlowSnippetTemplateStepInput[]): string {
  const normalized = normalizeFlowSnippetTemplateSteps(steps)
  return fnv1a32(stableStringify(normalized)).toString(36)
}

export function createFlowSnippetTemplateRevision(input: CreateFlowSnippetTemplateRevisionInput): FlowSnippetTemplate {
  const previous = input?.previous || null
  const nowIso = String(input?.nowIso || new Date().toISOString())
  const nowMs = Number.isFinite(Number(input?.nowMs)) ? Number(input?.nowMs) : Date.now()
  const name = normalizeFlowSnippetName(input?.name ?? previous?.name)
  const steps = normalizeFlowSnippetTemplateSteps(input?.steps || previous?.steps || [])
  const hash = hashFlowSnippetTemplateSteps(steps)
  const baseId = String(previous?.baseId || buildFlowSnippetBaseId(name, nowMs))
  const version = previous ? Math.max(1, Number(previous.version || 1) + 1) : 1
  const id = `${baseId}@v${version}`

  return {
    id,
    baseId,
    version,
    name,
    hash,
    steps,
    createdAt: previous?.createdAt || nowIso,
    updatedAt: nowIso
  }
}

export function normalizeFlowSnippetTemplate(input: unknown): FlowSnippetTemplate | null {
  const raw = input as Partial<FlowSnippetTemplate> | null | undefined
  if (!raw || typeof raw !== 'object') return null
  const name = normalizeFlowSnippetName(raw.name)
  const steps = normalizeFlowSnippetTemplateSteps(raw.steps || [])
  if (steps.length <= 0) return null
  const nowIso = new Date().toISOString()
  const baseId = String(raw.baseId || buildFlowSnippetBaseId(name, Date.now()))
  const version = Number.isFinite(Number(raw.version)) ? Math.max(1, Math.floor(Number(raw.version))) : 1
  const hash = String(raw.hash || hashFlowSnippetTemplateSteps(steps))
  return {
    id: String(raw.id || `${baseId}@v${version}`),
    baseId,
    version,
    name,
    hash,
    steps,
    createdAt: String(raw.createdAt || nowIso),
    updatedAt: String(raw.updatedAt || nowIso)
  }
}
