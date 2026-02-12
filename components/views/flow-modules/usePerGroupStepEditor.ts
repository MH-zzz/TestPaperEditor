import { computed, type ComputedRef, type Ref } from 'vue'
import type { ListeningChoiceFlowStep, ListeningChoiceQuestion } from '/types'
import type {
  ListeningChoiceStandardFlowModuleV1,
  ListeningChoiceStandardPerGroupStepDef
} from '/flows/listeningChoiceFlowModules'

export type PerGroupKind = 'playAudio' | 'countdown' | 'promptTone' | 'answerChoice'
export type AudioSource = 'description' | 'content'
export type QuickAddPerGroupKind =
  | 'playAudioDescription'
  | 'playAudioContent'
  | 'countdown'
  | 'promptTone'
  | 'answerChoice'

export type SelectedConfig =
  | { type: 'intro' }
  | { type: 'intro_countdown' }
  | { type: 'per_group'; index: number; kind: PerGroupKind }
  | { type: 'other' }

type IntroBoolKey =
  | 'introShowTitle'
  | 'introShowTitleDescription'
  | 'introShowDescription'
  | 'introCountdownShowTitle'

function toInt(v: unknown): number {
  const n = parseInt(String(v || '0'), 10)
  return Number.isFinite(n) ? n : 0
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    intro: '介绍页',
    countdown: '倒计时',
    playAudio: '播放音频',
    promptTone: '提示音',
    answerChoice: '开始答题',
    groupPrompt: '题组提示',
    finish: '完成页'
  }
  return map[kind] || kind
}

function perGroupKindLabel(kind: PerGroupKind, audioSource?: AudioSource): string {
  if (kind === 'playAudio') return audioSource === 'description' ? '播放描述音频' : '播放正文音频'
  if (kind === 'countdown') return '倒计时'
  if (kind === 'promptTone') return '提示音'
  return '开始答题'
}

function createPerGroupStep(kind: QuickAddPerGroupKind): ListeningChoiceStandardPerGroupStepDef {
  if (kind === 'playAudioDescription') {
    return {
      kind: 'playAudio',
      showTitle: true,
      audioSource: 'description',
      showQuestionTitle: true,
      showQuestionTitleDescription: true,
      showGroupPrompt: true
    }
  }
  if (kind === 'playAudioContent') {
    return {
      kind: 'playAudio',
      showTitle: true,
      audioSource: 'content',
      showQuestionTitle: true,
      showQuestionTitleDescription: true,
      showGroupPrompt: true
    }
  }
  if (kind === 'countdown') {
    return { kind: 'countdown', showTitle: true, seconds: 3, label: '准备' }
  }
  if (kind === 'promptTone') {
    return { kind: 'promptTone', showTitle: true, url: '/static/audio/small_time.mp3' }
  }
  return {
    kind: 'answerChoice',
    showTitle: true,
    showQuestionTitle: true,
    showQuestionTitleDescription: true,
    showGroupPrompt: true
  }
}

function isPerGroupKind(kind: string): kind is PerGroupKind {
  return kind === 'playAudio' || kind === 'countdown' || kind === 'promptTone' || kind === 'answerChoice'
}

function getAudioSource(step: ListeningChoiceStandardPerGroupStepDef | undefined): AudioSource {
  if (!step || step.kind !== 'playAudio') return 'content'
  return step.audioSource === 'description' ? 'description' : 'content'
}

function getStepKinds(steps: ListeningChoiceFlowStep[]): string[] {
  return steps.map((step) => step.kind)
}

export function usePerGroupStepEditor(options: {
  demoQuestion: ComputedRef<ListeningChoiceQuestion>
  listeningChoiceDraft: Ref<ListeningChoiceStandardFlowModuleV1>
  currentStepIndex: Ref<number>
  configStepIndex: Ref<number>
}) {
  const { demoQuestion, listeningChoiceDraft, currentStepIndex, configStepIndex } = options

  function patchDraft(patch: Partial<ListeningChoiceStandardFlowModuleV1>) {
    listeningChoiceDraft.value = {
      ...listeningChoiceDraft.value,
      ...patch
    }
  }

  function calcPerGroupOffset(): number {
    const stepKinds = getStepKinds(demoQuestion.value.flow?.steps || [])
    let offset = 0
    if (stepKinds[0] === 'intro') offset += 1
    if (stepKinds[1] === 'countdown' && stepKinds[0] === 'intro') offset += 1
    return offset
  }

  function flowIndexByPerGroupIndex(perGroupIndex: number): number {
    return calcPerGroupOffset() + Math.max(0, perGroupIndex)
  }

  function resolveConfigByFlowIndex(idx: number): SelectedConfig | null {
    const steps = demoQuestion.value.flow?.steps || []
    if (idx < 0) return null
    const step = steps[idx]
    if (!step) return null

    if (step.kind === 'intro') return { type: 'intro' }

    const prev = steps[idx - 1]
    if (step.kind === 'countdown' && prev?.kind === 'intro') return { type: 'intro_countdown' }

    const perGroupIndex = idx - calcPerGroupOffset()
    const def = listeningChoiceDraft.value?.perGroupSteps?.[perGroupIndex]
    const kind = String(def?.kind || '')
    if (isPerGroupKind(kind)) {
      return { type: 'per_group', index: perGroupIndex, kind }
    }

    return { type: 'other' }
  }

  const selectedConfig = computed<SelectedConfig | null>(() => resolveConfigByFlowIndex(configStepIndex.value))

  const reorderableFlowIndices = computed<number[]>(() => {
    const steps = demoQuestion.value.flow?.steps || []
    const indices: number[] = []
    for (let i = 0; i < steps.length; i += 1) {
      const cfg = resolveConfigByFlowIndex(i)
      if (cfg?.type === 'per_group') indices.push(i)
    }
    return indices
  })

  const introShowTitle = computed(() => listeningChoiceDraft.value?.introShowTitle !== false)
  const introShowTitleDescription = computed(() => listeningChoiceDraft.value?.introShowTitleDescription !== false)
  const introShowDescription = computed(() => listeningChoiceDraft.value?.introShowDescription !== false)
  const introCountdownEnabled = computed(() => listeningChoiceDraft.value?.introCountdownEnabled !== false)
  const introCountdownShowTitle = computed(() => listeningChoiceDraft.value?.introCountdownShowTitle !== false)
  const introCountdownSeconds = computed(() => Math.max(0, toInt(listeningChoiceDraft.value?.introCountdownSeconds ?? 3)))
  const introCountdownLabel = computed(() => String(listeningChoiceDraft.value?.introCountdownLabel || '准备'))
  const flowQuickAddItems = computed(() => {
    const items: Array<{ key: string; label: string }> = []
    if (!introCountdownEnabled.value) items.push({ key: 'introCountdown', label: '介绍倒计时' })
    items.push({ key: 'playAudioDescription', label: '描述音频' })
    items.push({ key: 'playAudioContent', label: '正文音频' })
    items.push({ key: 'countdown', label: '倒计时' })
    items.push({ key: 'promptTone', label: '提示音' })
    items.push({ key: 'answerChoice', label: '开始答题' })
    return items
  })

  const selectedStepLabel = computed(() => {
    const step = (demoQuestion.value.flow?.steps || [])[configStepIndex.value]
    if (!step) return '请选择步骤'
    const config = selectedConfig.value
    if (config?.type === 'intro') return '介绍页配置'
    if (config?.type === 'intro_countdown') return '介绍页倒计时配置'
    if (config?.type === 'per_group') {
      const perStep = listeningChoiceDraft.value?.perGroupSteps?.[config.index]
      return `每题组流程 · ${perGroupKindLabel(config.kind, getAudioSource(perStep))}`
    }
    return kindLabel(String(step.kind || ''))
  })

  function toggleIntroBool(key: IntroBoolKey) {
    const raw = listeningChoiceDraft.value?.[key]
    const current = typeof raw === 'boolean' ? raw : true
    patchDraft({ [key]: !current })
  }

  function patchIntroCountdown(patch: Partial<ListeningChoiceStandardFlowModuleV1>) {
    patchDraft(patch)
  }

  function enableIntroCountdown() {
    patchIntroCountdown({
      introCountdownEnabled: true,
      introCountdownSeconds: Math.max(1, introCountdownSeconds.value || 3),
      introCountdownLabel: introCountdownLabel.value || '准备'
    })
    currentStepIndex.value = 1
    configStepIndex.value = 1
  }

  function disableIntroCountdown() {
    patchIntroCountdown({ introCountdownEnabled: false })
    if (configStepIndex.value <= 1) configStepIndex.value = 0
    if (currentStepIndex.value <= 1) currentStepIndex.value = 0
  }

  function getPerGroupRaw(index: number, key: string): unknown {
    const step = listeningChoiceDraft.value?.perGroupSteps?.[index]
    if (!step) return undefined
    return (step as unknown as Record<string, unknown>)[key]
  }

  function getPerGroupAudioSource(index: number): AudioSource {
    const step = listeningChoiceDraft.value?.perGroupSteps?.[index]
    return getAudioSource(step)
  }

  function getPerGroupBool(index: number, key: string, defaultValue: boolean): boolean {
    const v = getPerGroupRaw(index, key)
    if (typeof v === 'boolean') return v
    return defaultValue
  }

  function patchPerGroupStep(index: number, patch: Record<string, unknown>) {
    const list = [...(listeningChoiceDraft.value?.perGroupSteps || [])]
    const current = list[index]
    if (!current) return
    list[index] = {
      ...(current as unknown as Record<string, unknown>),
      ...patch
    } as ListeningChoiceStandardPerGroupStepDef
    patchDraft({ perGroupSteps: list })
  }

  function setPerGroupAudioSource(index: number, audioSource: AudioSource) {
    patchPerGroupStep(index, { audioSource })
  }

  function togglePerGroupBool(index: number, key: string, defaultValue: boolean) {
    const current = getPerGroupBool(index, key, defaultValue)
    patchPerGroupStep(index, { [key]: !current })
  }

  function insertPerGroupStep(index: number, kind: QuickAddPerGroupKind, position: 'before' | 'after' = 'after') {
    const list = [...(listeningChoiceDraft.value?.perGroupSteps || [])]
    const at = position === 'before' ? index : index + 1
    const safeAt = Math.max(0, Math.min(at, list.length))
    list.splice(safeAt, 0, createPerGroupStep(kind))
    patchDraft({ perGroupSteps: list })

    const flowIndex = flowIndexByPerGroupIndex(safeAt)
    currentStepIndex.value = flowIndex
    configStepIndex.value = flowIndex
  }

  function quickAddPerGroupStep(kind: QuickAddPerGroupKind) {
    const list = [...(listeningChoiceDraft.value?.perGroupSteps || [])]
    if (list.length === 0) {
      patchDraft({ perGroupSteps: [createPerGroupStep(kind)] })
      const flowIndex = flowIndexByPerGroupIndex(0)
      currentStepIndex.value = flowIndex
      configStepIndex.value = flowIndex
      return
    }
    const cfg = selectedConfig.value
    const anchor = cfg?.type === 'per_group' ? cfg.index : list.length - 1
    insertPerGroupStep(anchor, kind, 'after')
  }

  function removePerGroupStep(index: number) {
    const list = [...(listeningChoiceDraft.value?.perGroupSteps || [])]
    if (!list[index]) return
    if (list.length <= 1) {
      uni.showToast({ title: '每题组流程至少保留一个步骤', icon: 'none' })
      return
    }

    const removing = list[index]
    if (removing.kind === 'answerChoice') {
      const answerCount = list.filter((step) => step.kind === 'answerChoice').length
      if (answerCount <= 1) {
        uni.showToast({ title: '至少保留一个答题步骤', icon: 'none' })
        return
      }
    }

    list.splice(index, 1)
    patchDraft({ perGroupSteps: list })

    const nextIndex = Math.min(index, list.length - 1)
    const flowIndex = flowIndexByPerGroupIndex(nextIndex)
    currentStepIndex.value = flowIndex
    configStepIndex.value = flowIndex
  }

  function reorderPerGroupStepByFlowIndex(fromFlowIndex: number, toFlowIndex: number) {
    const fromCfg = resolveConfigByFlowIndex(fromFlowIndex)
    const toCfg = resolveConfigByFlowIndex(toFlowIndex)
    if (fromCfg?.type !== 'per_group' || toCfg?.type !== 'per_group') {
      uni.showToast({ title: '仅支持拖动每题组步骤', icon: 'none' })
      return
    }
    if (fromCfg.index === toCfg.index) return

    const list = [...(listeningChoiceDraft.value?.perGroupSteps || [])]
    if (!list[fromCfg.index] || !list[toCfg.index]) return

    const [moving] = list.splice(fromCfg.index, 1)
    const safeTarget = Math.max(0, Math.min(toCfg.index, list.length))
    list.splice(safeTarget, 0, moving)
    patchDraft({ perGroupSteps: list })

    const flowIndex = flowIndexByPerGroupIndex(safeTarget)
    currentStepIndex.value = flowIndex
    configStepIndex.value = flowIndex
  }

  return {
    toInt,
    introShowTitle,
    introShowTitleDescription,
    introShowDescription,
    introCountdownEnabled,
    introCountdownShowTitle,
    introCountdownSeconds,
    introCountdownLabel,
    flowQuickAddItems,
    selectedConfig,
    selectedStepLabel,
    reorderableFlowIndices,
    toggleIntroBool,
    patchIntroCountdown,
    enableIntroCountdown,
    disableIntroCountdown,
    getPerGroupRaw,
    getPerGroupAudioSource,
    getPerGroupBool,
    patchPerGroupStep,
    setPerGroupAudioSource,
    togglePerGroupBool,
    quickAddPerGroupStep,
    removePerGroupStep,
    reorderPerGroupStepByFlowIndex
  }
}
