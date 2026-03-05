import { computed, ref, watch, type ComputedRef } from 'vue'
import type {
  ListeningChoiceContent,
  ListeningChoiceQuestion,
  SpeakingHearAnswerContent,
  SubQuestion
} from '/types'

export type FlowPreviewAnswers = Record<string, string | string[]>
type FlowPreviewGroup = ListeningChoiceContent['groups'][number] | SpeakingHearAnswerContent['groups'][number]

export function useFlowPreviewPanel(options: {
  demoQuestion: ComputedRef<ListeningChoiceQuestion>
  previewTotalSteps: ComputedRef<number>
  previewExpandedSegments: ComputedRef<number[]>
}) {
  const { demoQuestion, previewTotalSteps, previewExpandedSegments } = options

  const previewAnswers = ref<FlowPreviewAnswers>({})
  const showAnswer = ref(false)
  const previewVirtualIndex = ref(0)
  const currentStepIndex = ref(0)
  const configStepIndex = ref(0)

  function firstVirtualIndexOfLogicalStep(logicalIndex: number): number {
    const segments = previewExpandedSegments.value
    const hit = segments.findIndex((item) => item === logicalIndex)
    return hit >= 0 ? hit : 0
  }

  function setPreviewVirtualIndex(nextIndex: number) {
    const total = previewExpandedSegments.value.length
    if (total <= 0) {
      previewVirtualIndex.value = 0
      currentStepIndex.value = 0
      return
    }
    const safe = Math.max(0, Math.min(total - 1, nextIndex))
    previewVirtualIndex.value = safe
    const logicalIndex = previewExpandedSegments.value[safe]
    if (typeof logicalIndex === 'number' && Number.isFinite(logicalIndex)) {
      currentStepIndex.value = Math.max(0, Math.min(logicalIndex, Math.max(0, previewTotalSteps.value - 1)))
    }
  }

  const previewDisplayTotalSteps = computed(() => previewExpandedSegments.value.length)
  const previewDisplayStepIndex = computed(() => {
    if (previewDisplayTotalSteps.value <= 0) return 0
    const safe = Math.max(0, Math.min(previewVirtualIndex.value, previewDisplayTotalSteps.value - 1))
    return safe + 1
  })

  function jumpToStep(index: number) {
    const next = Math.max(0, Math.min(previewTotalSteps.value - 1, index))
    currentStepIndex.value = next
    previewVirtualIndex.value = firstVirtualIndexOfLogicalStep(next)
    if (configStepIndex.value === next) {
      configStepIndex.value = -1
      return
    }
    configStepIndex.value = next
  }

  function syncConfigStepToCurrent() {
    configStepIndex.value = currentStepIndex.value
  }

  function onPreviewStepChange(step: number) {
    setPreviewVirtualIndex(step)
    syncConfigStepToCurrent()
  }

  function findSubQuestionById(q: ListeningChoiceQuestion, id: string): SubQuestion | null {
    const groups = (q.content?.groups || []) as FlowPreviewGroup[]
    for (const group of groups) {
      const list = Array.isArray(group?.subQuestions) ? group.subQuestions : []
      for (const sq of list) {
        if (String(sq?.id || '') === id) return sq
      }
    }
    return null
  }

  function onPreviewSelect(subQuestionId: string, optionKey: string) {
    const q = demoQuestion.value
    const sq = findSubQuestionById(q, subQuestionId)
    if (!sq) return

    const mode = sq.answerMode === 'multiple' ? 'multiple' : 'single'
    const current = previewAnswers.value[subQuestionId]

    if (mode === 'multiple') {
      const list = Array.isArray(current) ? [...current] : []
      const idx = list.indexOf(optionKey)
      if (idx >= 0) list.splice(idx, 1)
      else list.push(optionKey)
      previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: list }
      return
    }

    previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: optionKey }
  }

  function resetFlowPreviewPanel() {
    previewAnswers.value = {}
    showAnswer.value = false
    previewVirtualIndex.value = 0
    currentStepIndex.value = 0
    configStepIndex.value = 0
  }

  watch(previewTotalSteps, (n) => {
    if (!Number.isFinite(n) || n <= 0) {
      previewVirtualIndex.value = 0
      currentStepIndex.value = 0
      configStepIndex.value = -1
      return
    }

    if (currentStepIndex.value > n - 1) currentStepIndex.value = n - 1
    if (configStepIndex.value > n - 1) configStepIndex.value = n - 1
    previewVirtualIndex.value = firstVirtualIndexOfLogicalStep(currentStepIndex.value)
  })

  watch(previewExpandedSegments, (segments) => {
    const total = segments.length
    if (total <= 0) {
      previewVirtualIndex.value = 0
      currentStepIndex.value = 0
      return
    }

    if (previewVirtualIndex.value >= total) {
      previewVirtualIndex.value = total - 1
    }
    setPreviewVirtualIndex(previewVirtualIndex.value)
  }, { immediate: true })

  return {
    previewAnswers,
    showAnswer,
    previewVirtualIndex,
    currentStepIndex,
    configStepIndex,
    previewDisplayTotalSteps,
    previewDisplayStepIndex,
    firstVirtualIndexOfLogicalStep,
    setPreviewVirtualIndex,
    jumpToStep,
    syncConfigStepToCurrent,
    onPreviewStepChange,
    onPreviewSelect,
    resetFlowPreviewPanel
  }
}
