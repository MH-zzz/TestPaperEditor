import { computed, ref, type Ref } from 'vue'
import type { FlowModuleRef } from '/types'
import {
  loadFlowRegionBindingTemplates,
  saveFlowRegionBindingTemplates,
  type FlowRegionBindingTemplateRecord
} from '/infra/repository/flowRegionBindingTemplateRepository'

type RegionRoutingBinding = {
  region: string
  module: FlowModuleRef
  note?: string
  id?: string
  createdAt?: string
  updatedAt?: string
}

type ReplaceRegionRoutingBindingsOptions = {
  defaultModuleRef?: FlowModuleRef
  defaultNote?: string
}

export type RegionBindingTemplateRow = {
  id: string
  name: string
  defaultTargetText: string
  regionCount: number
  regionPreviewText: string
  updatedAtText: string
}

function normalizeNullableText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text || undefined
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatTimeText(raw: string | undefined): string {
  const value = String(raw || '').trim()
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function useRegionBindingTemplates(options: {
  activeFlowDisplayName: Ref<string>
  isRegionRoutingEnabled: Ref<boolean>
  regionBindingOptions: Ref<string[]>
  regionRoutingBindings: Ref<RegionRoutingBinding[]>
  defaultRoutingModuleRef: Ref<FlowModuleRef>
  ensureRegionRoutingMode: (silent?: boolean) => boolean
  replaceRegionRoutingBindings: (
    bindings: RegionRoutingBinding[],
    options?: ReplaceRegionRoutingBindingsOptions
  ) => boolean
  buildRegionProfileId: (region: string) => string
  isGeneralRegion: (region: string) => boolean
  toInt: (value: unknown) => number
  formatModuleDisplayRef: (ref: FlowModuleRef) => string
}) {
  const {
    activeFlowDisplayName,
    isRegionRoutingEnabled,
    regionBindingOptions,
    regionRoutingBindings,
    defaultRoutingModuleRef,
    ensureRegionRoutingMode,
    replaceRegionRoutingBindings,
    buildRegionProfileId,
    isGeneralRegion,
    toInt,
    formatModuleDisplayRef
  } = options

  const regionBindingTemplateName = ref('')
  const regionBindingTemplates = ref<FlowRegionBindingTemplateRecord[]>([])

  function refreshRegionBindingTemplates() {
    regionBindingTemplates.value = loadFlowRegionBindingTemplates()
  }

  refreshRegionBindingTemplates()

  function buildDefaultTemplateName(): string {
    const date = new Date()
    const timeText = `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
    return `${activeFlowDisplayName.value}-地区模板-${timeText}`
  }

  function normalizeModuleRef(rawRef: Partial<FlowModuleRef> | null | undefined, fallback: FlowModuleRef): FlowModuleRef {
    return {
      id: String(rawRef?.id || fallback.id || ''),
      version: Math.max(1, toInt(rawRef?.version || fallback.version || 1))
    }
  }

  function saveRegionBindingTemplateFromCurrent() {
    if (!isRegionRoutingEnabled.value) return
    const now = new Date().toISOString()
    const name = normalizeNullableText(regionBindingTemplateName.value) || buildDefaultTemplateName()
    const byRegion = new Map<string, RegionRoutingBinding>()
    regionRoutingBindings.value.forEach((item) => {
      byRegion.set(String(item.region || ''), item)
    })
    const entries = (regionBindingOptions.value || [])
      .map((region) => normalizeNullableText(region))
      .filter((region): region is string => Boolean(region) && !isGeneralRegion(region))
      .map((region) => {
        const hit = byRegion.get(region)
        if (!hit) return null
        return {
          region,
          module: normalizeModuleRef(hit.module, defaultRoutingModuleRef.value),
          note: normalizeNullableText(hit.note)
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    const existing = regionBindingTemplates.value.find((item) => normalizeNullableText(item.name) === name)
    const record: FlowRegionBindingTemplateRecord = {
      id: existing?.id || `region_template_${Date.now()}`,
      name,
      questionType: 'listening_choice',
      defaultModuleRef: normalizeModuleRef(defaultRoutingModuleRef.value, defaultRoutingModuleRef.value),
      defaultNote: normalizeNullableText(existing?.defaultNote) || '听后选择通用流程',
      entries,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    }

    const next = [...regionBindingTemplates.value.filter((item) => item.id !== record.id), record]
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    saveFlowRegionBindingTemplates(next)
    refreshRegionBindingTemplates()
    regionBindingTemplateName.value = ''
    uni.showToast({
      title: existing ? '已更新地区模板' : '已沉淀当前绑定',
      icon: 'success'
    })
  }

  function applyRegionBindingTemplate(templateId: string) {
    if (!isRegionRoutingEnabled.value) return
    const id = String(templateId || '').trim()
    if (!id) return
    const target = regionBindingTemplates.value.find((item) => item.id === id)
    if (!target) {
      uni.showToast({ title: '模板不存在', icon: 'none' })
      return
    }
    ensureRegionRoutingMode(true)

    const prevMap = new Map<string, RegionRoutingBinding>()
    regionRoutingBindings.value.forEach((item) => {
      prevMap.set(String(item.region || ''), item)
    })
    const nextBindings: RegionRoutingBinding[] = (target.entries || [])
      .map((entry) => {
        const region = normalizeNullableText(entry?.region)
        if (!region || isGeneralRegion(region)) return null
        const previous = prevMap.get(region)
        return {
          region,
          module: normalizeModuleRef(entry.module, defaultRoutingModuleRef.value),
          note: normalizeNullableText(entry.note) || `${region}地区流程`,
          id: previous?.id || buildRegionProfileId(region),
          createdAt: previous?.createdAt,
          updatedAt: previous?.updatedAt
        }
      })
      .filter((item): item is RegionRoutingBinding => Boolean(item))
      .sort((a, b) => a.region.localeCompare(b.region, 'zh-Hans-CN'))

    const ok = replaceRegionRoutingBindings(nextBindings, {
      defaultModuleRef: normalizeModuleRef(target.defaultModuleRef, defaultRoutingModuleRef.value),
      defaultNote: normalizeNullableText(target.defaultNote) || '听后选择通用流程'
    })
    if (!ok) return
    uni.showToast({
      title: `已应用模板：${target.name}`,
      icon: 'success'
    })
  }

  function removeRegionBindingTemplate(templateId: string) {
    const id = String(templateId || '').trim()
    if (!id) return
    const next = regionBindingTemplates.value.filter((item) => item.id !== id)
    if (next.length === regionBindingTemplates.value.length) return
    saveFlowRegionBindingTemplates(next)
    refreshRegionBindingTemplates()
    uni.showToast({ title: '已删除模板', icon: 'none' })
  }

  const regionBindingTemplateRows = computed<RegionBindingTemplateRow[]>(() => {
    return (regionBindingTemplates.value || []).map((item) => {
      const regions = (item.entries || [])
        .map((entry) => normalizeNullableText(entry.region))
        .filter((entry): entry is string => Boolean(entry))
      const regionPreviewText = regions.length <= 0
        ? '仅通用流程'
        : regions.slice(0, 3).join(' / ') + (regions.length > 3 ? ` 等 ${regions.length} 个地区` : '')
      return {
        id: item.id,
        name: item.name,
        defaultTargetText: formatModuleDisplayRef(item.defaultModuleRef),
        regionCount: regions.length,
        regionPreviewText,
        updatedAtText: formatTimeText(item.updatedAt)
      }
    })
  })

  return {
    regionBindingTemplateName,
    regionBindingTemplates,
    regionBindingTemplateRows,
    saveRegionBindingTemplateFromCurrent,
    applyRegionBindingTemplate,
    removeRegionBindingTemplate,
    refreshRegionBindingTemplates
  }
}
