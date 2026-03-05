import type { Ref } from 'vue'
import type { ListeningChoiceFlowModuleV1 } from '/types'
import type { ListeningChoiceStandardFlowModuleV1 } from '/flows/listeningChoiceFlowModules'

export type FlowPageType = 'listening_choice' | 'speaking_hear_answer'
export type FlowPage = 'home' | FlowPageType

export function useFlowPageNavigation(options: {
  page: Ref<FlowPage>
  activeFlowPageType: Ref<FlowPageType>
  flowLineWizardVisible: Ref<boolean>
  draftModuleId: Ref<string>
  draftModuleVersion: Ref<number>
  listeningChoiceDraft: Ref<ListeningChoiceStandardFlowModuleV1>
  listeningChoiceStandardFlowId: string
  listeningHearAnswerStandardFlowId: string
  ensureRegionRoutingMode: (silent?: boolean) => boolean
  syncTemplateFromLibraryQuestion: (pageType: FlowPageType) => boolean
  getDefaultModule: (pageType: FlowPageType) => ListeningChoiceFlowModuleV1
  syncDraftModuleMeta: (module: unknown) => void
  toDraftStandardModule: (moduleInput: unknown) => ListeningChoiceStandardFlowModuleV1
  clone: <T>(v: T) => T
  clearPreviewOverrides: () => void
  resetFlowPreviewPanel: () => void
}) {
  const {
    page,
    activeFlowPageType,
    flowLineWizardVisible,
    draftModuleId,
    draftModuleVersion,
    listeningChoiceDraft,
    listeningChoiceStandardFlowId,
    listeningHearAnswerStandardFlowId,
    ensureRegionRoutingMode,
    syncTemplateFromLibraryQuestion,
    getDefaultModule,
    syncDraftModuleMeta,
    toDraftStandardModule,
    clone,
    clearPreviewOverrides,
    resetFlowPreviewPanel
  } = options

  function goHome() {
    page.value = 'home'
    flowLineWizardVisible.value = false
  }

  function openFlowPage(pageType: FlowPageType) {
    if (pageType === 'listening_choice') ensureRegionRoutingMode(true)
    activeFlowPageType.value = pageType
    syncTemplateFromLibraryQuestion(pageType)
    flowLineWizardVisible.value = false

    const module = getDefaultModule(pageType)
    const fallbackModuleId = pageType === 'speaking_hear_answer'
      ? listeningHearAnswerStandardFlowId
      : listeningChoiceStandardFlowId

    draftModuleId.value = String(module.id || fallbackModuleId)
    draftModuleVersion.value = Number(module.version || 1)
    syncDraftModuleMeta(module)
    listeningChoiceDraft.value = clone(toDraftStandardModule(module))
    clearPreviewOverrides()
    resetFlowPreviewPanel()
    page.value = pageType
  }

  return {
    goHome,
    openListeningChoice: () => openFlowPage('listening_choice'),
    openSpeakingHearAnswer: () => openFlowPage('speaking_hear_answer')
  }
}
