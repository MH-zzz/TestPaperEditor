import { computed, type Ref } from 'vue'
import type { FlowModuleRef } from '/types'

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

export function useRegionBindingOverview(options: {
  isRegionRoutingEnabled: Ref<boolean>
  regionRoutingBindings: Ref<RegionRoutingBinding[]>
  defaultRoutingModuleRef: Ref<FlowModuleRef>
  currentFlowLineRef: Ref<FlowModuleRef>
  readRegionTagOptions: () => string[]
  normalizeNullableText: (value: unknown) => string | undefined
  isGeneralRegion: (region: string) => boolean
  formatModuleDisplayRef: (ref: FlowModuleRef) => string
  ensureRegionRoutingMode: (silent?: boolean) => boolean
  replaceRegionRoutingBindings: (
    bindings: RegionRoutingBinding[],
    options?: ReplaceRegionRoutingBindingsOptions
  ) => boolean
  buildRegionProfileId: (region: string) => string
  getPublishedFallbackModuleRef: () => FlowModuleRef
}) {
  const {
    isRegionRoutingEnabled,
    regionRoutingBindings,
    defaultRoutingModuleRef,
    currentFlowLineRef,
    readRegionTagOptions,
    normalizeNullableText,
    isGeneralRegion,
    formatModuleDisplayRef,
    ensureRegionRoutingMode,
    replaceRegionRoutingBindings,
    buildRegionProfileId,
    getPublishedFallbackModuleRef
  } = options

  const regionBindingMap = computed(() => {
    const map = new Map<string, RegionRoutingBinding>()
    regionRoutingBindings.value.forEach((item) => {
      map.set(item.region, item)
    })
    return map
  })

  const regionBindingOptions = computed<string[]>(() => {
    const fromTags = readRegionTagOptions()
    const fromBindings = regionRoutingBindings.value.map((item) => item.region)
    const unique = new Set<string>(['通用', ...fromTags, ...fromBindings])
    return Array.from(unique.values()).sort((a, b) => {
      if (a === '通用') return -1
      if (b === '通用') return 1
      return a.localeCompare(b, 'zh-Hans-CN')
    })
  })

  function isRegionBoundToCurrentFlowLine(rawRegion: string): boolean {
    const region = normalizeNullableText(rawRegion)
    if (!region) return false
    if (isGeneralRegion(region)) {
      const ref = defaultRoutingModuleRef.value
      return (
        String(ref.id || '') === String(currentFlowLineRef.value.id || '') &&
        Number(ref.version || 0) === Number(currentFlowLineRef.value.version || 0)
      )
    }
    const binding = regionBindingMap.value.get(region)
    if (!binding) return false
    return (
      String(binding.module.id || '') === String(currentFlowLineRef.value.id || '') &&
      Number(binding.module.version || 0) === Number(currentFlowLineRef.value.version || 0)
    )
  }

  const currentFlowBoundRegionCount = computed(() => {
    if (!isRegionRoutingEnabled.value) return 0
    return regionBindingOptions.value.filter((region) => isRegionBoundToCurrentFlowLine(region)).length
  })

  function formatRegionBindingTarget(rawRegion: string): string {
    const region = normalizeNullableText(rawRegion)
    if (!region) return '未绑定'
    if (isGeneralRegion(region)) {
      if (isRegionBoundToCurrentFlowLine(region)) return '当前流程线'
      return formatModuleDisplayRef(defaultRoutingModuleRef.value)
    }
    const binding = regionBindingMap.value.get(region)
    if (!binding) return `通用：${formatModuleDisplayRef(defaultRoutingModuleRef.value)}`
    if (isRegionBoundToCurrentFlowLine(region)) return '当前流程线'
    return formatModuleDisplayRef(binding.module)
  }

  function toggleRegionBindingForCurrentFlowLine(rawRegion: string) {
    if (!isRegionRoutingEnabled.value) return
    const region = normalizeNullableText(rawRegion)
    if (!region) return
    ensureRegionRoutingMode(true)

    if (isGeneralRegion(region)) {
      const currentlyBound = isRegionBoundToCurrentFlowLine(region)
      const targetModuleRef = currentlyBound
        ? getPublishedFallbackModuleRef()
        : currentFlowLineRef.value
      const ok = replaceRegionRoutingBindings(regionRoutingBindings.value, {
        defaultModuleRef: targetModuleRef,
        defaultNote: currentlyBound ? '听后选择默认流程' : '听后选择通用流程'
      })
      if (!ok) return
      uni.showToast({
        title: currentlyBound ? '已恢复标准默认流程' : '已设置通用流程',
        icon: 'success'
      })
      return
    }

    const nextMap = new Map<string, RegionRoutingBinding>()
    regionRoutingBindings.value.forEach((item) => {
      nextMap.set(item.region, item)
    })

    const currentlyBound = isRegionBoundToCurrentFlowLine(region)
    if (currentlyBound) {
      nextMap.delete(region)
    } else {
      const previous = nextMap.get(region)
      nextMap.set(region, {
        region,
        module: currentFlowLineRef.value,
        note: previous?.note || (isGeneralRegion(region) ? '地区未命中通用流程' : `${region}地区流程`),
        id: previous?.id || buildRegionProfileId(region),
        createdAt: previous?.createdAt,
        updatedAt: previous?.updatedAt
      })
    }

    const ok = replaceRegionRoutingBindings(Array.from(nextMap.values()))
    if (!ok) return
    uni.showToast({
      title: currentlyBound ? `已取消 ${region} 绑定` : `已绑定 ${region}`,
      icon: 'success'
    })
  }

  return {
    regionBindingOptions,
    currentFlowBoundRegionCount,
    isRegionBoundToCurrentFlowLine,
    formatRegionBindingTarget,
    toggleRegionBindingForCurrentFlowLine
  }
}
