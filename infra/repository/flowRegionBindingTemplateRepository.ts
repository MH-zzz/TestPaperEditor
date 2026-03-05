import type { FlowModuleRef } from '/types'

export type FlowRegionBindingTemplateEntry = {
  region: string
  module: FlowModuleRef
  note?: string
}

export type FlowRegionBindingTemplateRecord = {
  id: string
  name: string
  questionType: 'listening_choice'
  defaultModuleRef: FlowModuleRef
  defaultNote?: string
  entries: FlowRegionBindingTemplateEntry[]
  createdAt: string
  updatedAt: string
}

const FLOW_REGION_BINDING_TEMPLATE_KEY = 'flow_region_binding_templates_v1'
const FLOW_REGION_BINDING_TEMPLATE_LIMIT = 80
const FLOW_REGION_BINDING_ENTRY_LIMIT = 120

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeNullableText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text || undefined
}

function toInt(value: unknown): number {
  const n = parseInt(String(value || '0'), 10)
  return Number.isFinite(n) ? n : 0
}

function normalizeModuleRef(input: unknown, fallback: FlowModuleRef): FlowModuleRef {
  if (!isObjectRecord(input)) return fallback
  const id = String(input.id || '').trim() || String(fallback.id || '')
  const version = Math.max(1, toInt(input.version || fallback.version || 1))
  return { id, version }
}

function normalizeTemplateEntry(input: unknown): FlowRegionBindingTemplateEntry | null {
  if (!isObjectRecord(input)) return null
  const region = normalizeNullableText(input.region)
  if (!region) return null
  const module = normalizeModuleRef(input.module, { id: '', version: 1 })
  if (!module.id) return null
  return {
    region,
    module,
    note: normalizeNullableText(input.note)
  }
}

function normalizeTemplateRecord(input: unknown): FlowRegionBindingTemplateRecord | null {
  if (!isObjectRecord(input)) return null
  const id = normalizeNullableText(input.id)
  const name = normalizeNullableText(input.name)
  if (!id || !name) return null

  const defaultModuleRef = normalizeModuleRef(input.defaultModuleRef, {
    id: '',
    version: 1
  })
  if (!defaultModuleRef.id) return null

  const seenRegions = new Set<string>()
  const entries = Array.isArray(input.entries)
    ? input.entries
      .map((item) => normalizeTemplateEntry(item))
      .filter((item): item is FlowRegionBindingTemplateEntry => Boolean(item))
      .filter((item) => {
        if (seenRegions.has(item.region)) return false
        seenRegions.add(item.region)
        return true
      })
      .slice(0, FLOW_REGION_BINDING_ENTRY_LIMIT)
    : []

  const createdAt = normalizeNullableText(input.createdAt) || new Date().toISOString()
  const updatedAt = normalizeNullableText(input.updatedAt) || createdAt

  return {
    id,
    name,
    questionType: 'listening_choice',
    defaultModuleRef,
    defaultNote: normalizeNullableText(input.defaultNote),
    entries,
    createdAt,
    updatedAt
  }
}

function normalizeTemplateRecords(input: unknown): FlowRegionBindingTemplateRecord[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => normalizeTemplateRecord(item))
    .filter((item): item is FlowRegionBindingTemplateRecord => Boolean(item))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, FLOW_REGION_BINDING_TEMPLATE_LIMIT)
}

export function loadFlowRegionBindingTemplates(): FlowRegionBindingTemplateRecord[] {
  try {
    const stored = uni.getStorageSync(FLOW_REGION_BINDING_TEMPLATE_KEY)
    if (!stored) return []
    const parsed = safeJsonParse(stored)
    return normalizeTemplateRecords(parsed)
  } catch {
    return []
  }
}

export function saveFlowRegionBindingTemplates(templates: FlowRegionBindingTemplateRecord[]): void {
  try {
    const normalized = normalizeTemplateRecords(templates || [])
    uni.setStorageSync(FLOW_REGION_BINDING_TEMPLATE_KEY, JSON.stringify(normalized))
  } catch {}
}
