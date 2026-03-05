import { computed, ref, type Ref } from 'vue'
import type { FlowModuleRef } from '/types'

type FlowLineWizardBaseline = 'current' | 'standard'

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

type FlowLineWizardCreateResult = {
  ok: boolean
  newFlowLineId?: string
}

export function useFlowLineWizard(options: {
  activeFlowDisplayName: Ref<string>
  isRegionRoutingEnabled: Ref<boolean>
  regionRoutingBindings: Ref<RegionRoutingBinding[]>
  readCurrentFlowNameForWizard: () => string
  performCreateFlowLine: (payload: {
    name: string
    note: string
    baseline: FlowLineWizardBaseline
  }) => FlowLineWizardCreateResult
  normalizeNullableText: (value: unknown) => string | undefined
  isGeneralRegion: (region: string) => boolean
  ensureRegionRoutingMode: (silent?: boolean) => boolean
  replaceRegionRoutingBindings: (
    bindings: RegionRoutingBinding[],
    options?: ReplaceRegionRoutingBindingsOptions
  ) => boolean
  buildRegionProfileId: (region: string) => string
}) {
  const {
    activeFlowDisplayName,
    isRegionRoutingEnabled,
    regionRoutingBindings,
    readCurrentFlowNameForWizard,
    performCreateFlowLine,
    normalizeNullableText,
    isGeneralRegion,
    ensureRegionRoutingMode,
    replaceRegionRoutingBindings,
    buildRegionProfileId
  } = options

  const flowLineWizardVisible = ref(false)
  const flowLineWizardBaseline = ref<FlowLineWizardBaseline>('current')
  const flowLineWizardName = ref('')
  const flowLineWizardNote = ref('')
  const flowLineWizardRegions = ref<string[]>([])

  const canCreateFlowLineFromWizard = computed(() => {
    return String(flowLineWizardName.value || '').trim().length > 0
  })

  function suggestFlowLineNameByRegions(regions: string[]): string {
    const prefix = activeFlowDisplayName.value
    if (regions.length === 1) return `${prefix}-${regions[0]}`
    if (regions.length > 1) return `${prefix}-多地区`
    return `${prefix}-新流程线`
  }

  function openFlowLineCreateWizard() {
    ensureRegionRoutingMode(true)
    flowLineWizardVisible.value = true
    flowLineWizardBaseline.value = 'current'
    flowLineWizardRegions.value = []
    flowLineWizardName.value = `${readCurrentFlowNameForWizard()}-副本`
    flowLineWizardNote.value = ''
  }

  function closeFlowLineCreateWizard() {
    flowLineWizardVisible.value = false
  }

  function isFlowLineWizardRegionSelected(rawRegion: string): boolean {
    const region = normalizeNullableText(rawRegion)
    if (!region) return false
    return flowLineWizardRegions.value.includes(region)
  }

  function toggleFlowLineWizardRegion(rawRegion: string) {
    const region = normalizeNullableText(rawRegion)
    if (!region) return
    const list = [...flowLineWizardRegions.value]
    const idx = list.indexOf(region)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(region)
    flowLineWizardRegions.value = list

    const hasManualName = String(flowLineWizardName.value || '').trim().length > 0
    if (!hasManualName) {
      flowLineWizardName.value = suggestFlowLineNameByRegions(list)
    }
  }

  function confirmCreateFlowLineFromWizard() {
    const name = String(flowLineWizardName.value || '').trim()
    if (!name) {
      uni.showToast({ title: '请先填写流程线名称', icon: 'none' })
      return
    }
    const note = String(flowLineWizardNote.value || '').trim()
    const createResult = performCreateFlowLine({
      name,
      note,
      baseline: flowLineWizardBaseline.value
    })
    if (!createResult.ok || !createResult.newFlowLineId) return
    const nextId = createResult.newFlowLineId

    const regions = isRegionRoutingEnabled.value
      ? (flowLineWizardRegions.value || [])
        .map((item) => normalizeNullableText(item))
        .filter((item): item is string => Boolean(item))
      : []
    if (isRegionRoutingEnabled.value && regions.length > 0) {
      ensureRegionRoutingMode(true)
      const hasGeneralRegion = regions.some((region) => isGeneralRegion(region))
      const specificRegions = regions.filter((region) => !isGeneralRegion(region))
      const nextMap = new Map<string, RegionRoutingBinding>()
      regionRoutingBindings.value.forEach((item) => {
        nextMap.set(item.region, item)
      })
      specificRegions.forEach((region) => {
        const previous = nextMap.get(region)
        nextMap.set(region, {
          region,
          module: {
            id: nextId,
            version: 1
          },
          note: previous?.note || (isGeneralRegion(region) ? '地区未命中通用流程' : `${region}地区流程`),
          id: previous?.id || buildRegionProfileId(region),
          createdAt: previous?.createdAt,
          updatedAt: previous?.updatedAt
        })
      })
      replaceRegionRoutingBindings(Array.from(nextMap.values()), hasGeneralRegion
        ? {
            defaultModuleRef: {
              id: nextId,
              version: 1
            },
            defaultNote: '听后选择通用流程'
          }
        : {})
    }

    closeFlowLineCreateWizard()
  }

  return {
    flowLineWizardVisible,
    flowLineWizardBaseline,
    flowLineWizardName,
    flowLineWizardNote,
    flowLineWizardRegions,
    canCreateFlowLineFromWizard,
    openFlowLineCreateWizard,
    closeFlowLineCreateWizard,
    isFlowLineWizardRegionSelected,
    toggleFlowLineWizardRegion,
    confirmCreateFlowLineFromWizard
  }
}
