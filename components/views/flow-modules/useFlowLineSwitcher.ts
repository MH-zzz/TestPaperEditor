import type { ComputedRef, Ref } from 'vue'
import type {
  FlowModuleRef,
  FlowModuleStatus,
  ListeningChoiceFlowModuleV1
} from '/types'
import type { ListeningChoiceStandardFlowModuleV1 } from '/flows/listeningChoiceFlowModules'
import type { FlowPageType } from './useFlowPageNavigation'

export function useFlowLineSwitcher(options: {
  activeFlowPageType: Ref<FlowPageType>
  listeningChoiceModules: ComputedRef<ListeningChoiceFlowModuleV1[]>
  draftModuleId: Ref<string>
  draftModuleVersion: Ref<number>
  listeningChoiceDraft: Ref<ListeningChoiceStandardFlowModuleV1>
  getStandardModuleIdByPageType: (pageType: FlowPageType) => string
  toInt: (value: unknown) => number
  normalizeFlowModuleStatus: (value: unknown) => FlowModuleStatus
  getListeningChoiceByRef: (ref: FlowModuleRef) => ListeningChoiceFlowModuleV1 | null | undefined
  syncDraftModuleMeta: (module: unknown) => void
  toDraftStandardModule: (moduleInput: unknown) => ListeningChoiceStandardFlowModuleV1
  clone: <T>(v: T) => T
  clearPreviewOverrides: () => void
  clearCommitValidationIssues: () => void
  syncFlowVisualAfterDraftSwitch: () => void
  showToast: (title: string) => void
}) {
  const {
    activeFlowPageType,
    listeningChoiceModules,
    draftModuleId,
    draftModuleVersion,
    listeningChoiceDraft,
    getStandardModuleIdByPageType,
    toInt,
    normalizeFlowModuleStatus,
    getListeningChoiceByRef,
    syncDraftModuleMeta,
    toDraftStandardModule,
    clone,
    clearPreviewOverrides,
    clearCommitValidationIssues,
    syncFlowVisualAfterDraftSwitch,
    showToast
  } = options

  function switchDraftToModuleRef(ref: FlowModuleRef) {
    const fallbackStandardId = getStandardModuleIdByPageType(activeFlowPageType.value)
    const targetRef = {
      id: String(ref?.id || fallbackStandardId),
      version: Math.max(1, toInt(ref?.version || 1))
    }
    const module = getListeningChoiceByRef(targetRef)
    if (!module) {
      showToast('目标流程版本不存在')
      return
    }

    draftModuleId.value = targetRef.id
    draftModuleVersion.value = targetRef.version
    syncDraftModuleMeta(module)
    listeningChoiceDraft.value = clone(toDraftStandardModule(module))
    clearPreviewOverrides()
    clearCommitValidationIssues()
    syncFlowVisualAfterDraftSwitch()
  }

  function switchToFlowLine(lineId: string) {
    const targetId = String(lineId || '').trim()
    if (!targetId) return

    const candidates = (listeningChoiceModules.value || [])
      .filter((module) => String(module?.id || '') === targetId)
      .sort((a, b) => Number(b.version || 0) - Number(a.version || 0))

    if (candidates.length <= 0) {
      showToast('流程线不存在')
      return
    }

    const preferred = candidates.find((module) => normalizeFlowModuleStatus(module?.status) !== 'archived') || candidates[0]
    if (!preferred) return

    switchDraftToModuleRef({
      id: String(preferred.id || targetId),
      version: Math.max(1, toInt(preferred.version || 1))
    })
  }

  return {
    switchDraftToModuleRef,
    switchToFlowLine
  }
}
