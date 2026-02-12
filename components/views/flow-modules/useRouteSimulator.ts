import { computed, ref, type ComputedRef } from 'vue'
import type { FlowProfileV1, Question } from '/types'
import { flowModules } from '/stores/flowModules'
import { scoreProfiles, type FlowProfileScoreDetail } from '/domain/flow-profile/usecases/scoreProfiles'
import { patchQuestionFlowContext, readQuestionFlowContext } from './currentQuestionBridge'

function normalizeNullableText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

export function useRouteSimulator(options: {
  flowProfileRules: ComputedRef<FlowProfileV1[]>
  getCurrentQuestionSnapshot: () => Question | null
  persistCurrentQuestion: (next: Question) => void
}) {
  const { flowProfileRules, getCurrentQuestionSnapshot, persistCurrentQuestion } = options

  const routeSimRegion = ref('')
  const routeSimScene = ref('')
  const routeSimGrade = ref('')
  const routeSimScoreResult = computed(() => {
    return scoreProfiles(flowProfileRules.value || [], {
      region: normalizeNullableText(routeSimRegion.value),
      scene: normalizeNullableText(routeSimScene.value),
      grade: normalizeNullableText(routeSimGrade.value)
    }, { topN: 5 })
  })
  const simulatedRankedCandidates = computed<FlowProfileScoreDetail[]>(() => routeSimScoreResult.value.rankedCandidates || [])
  const simulatedBestCandidate = computed<FlowProfileScoreDetail | null>(() => routeSimScoreResult.value.bestCandidate || null)
  const simulatedProfile = computed<FlowProfileV1 | null>(() => simulatedBestCandidate.value?.profile || null)
  const simulatedModule = computed(() => {
    const profile = simulatedProfile.value
    if (!profile?.module) return null
    return flowModules.getListeningChoiceByRef(profile.module)
  })

  function loadRouteSimFromCurrentQuestion() {
    try {
      const data = getCurrentQuestionSnapshot()
      if (!data) {
        uni.showToast({ title: '当前没有题目', icon: 'none' })
        return
      }
      const ctx = readQuestionFlowContext(data)
      routeSimRegion.value = ctx.region
      routeSimScene.value = ctx.scene
      routeSimGrade.value = ctx.grade
      uni.showToast({ title: '已读取当前题目上下文', icon: 'success' })
    } catch (e) {
      console.error('Failed to load route simulator context from current question', e)
      uni.showToast({ title: '读取失败', icon: 'none' })
    }
  }

  function syncRouteSimToCurrentQuestion() {
    try {
      const data = getCurrentQuestionSnapshot()
      if (!data) {
        uni.showToast({ title: '当前没有题目', icon: 'none' })
        return
      }
      const next = patchQuestionFlowContext(data, {
        region: routeSimRegion.value,
        scene: routeSimScene.value,
        grade: routeSimGrade.value
      })
      persistCurrentQuestion(next)
      uni.showToast({ title: '已写回当前题目上下文', icon: 'success' })
    } catch (e) {
      console.error('Failed to sync route simulator context to current question', e)
      uni.showToast({ title: '写回失败', icon: 'none' })
    }
  }

  return {
    routeSimRegion,
    routeSimScene,
    routeSimGrade,
    routeSimScoreResult,
    simulatedRankedCandidates,
    simulatedBestCandidate,
    simulatedProfile,
    simulatedModule,
    loadRouteSimFromCurrentQuestion,
    syncRouteSimToCurrentQuestion
  }
}
