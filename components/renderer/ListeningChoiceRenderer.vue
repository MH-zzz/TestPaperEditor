<template>
    <view class="lc-flow">
      <view class="lc-flow__top">
      <view v-if="showStepNav" class="lc-flow__nav">
        <button class="btn btn-outline btn-sm" :disabled="currentStepIndex <= 0" @click="prevStep">上一步</button>
        <text class="lc-flow__nav-text">{{ steps.length ? currentStepIndex + 1 : 0 }} / {{ steps.length }}</text>
        <button class="btn btn-outline btn-sm" :disabled="currentStepIndex >= steps.length - 1" @click="nextStep">下一步</button>
      </view>

      <view v-if="activeTitle" class="lc-flow__title">{{ activeTitle }}</view>
    </view>

    <scroll-view scroll-y class="lc-flow__body" v-if="displayStep">
      <view class="lc-flow__body-inner">
        <component
          :is="displayRenderer"
          v-bind="displayRendererProps"
          @select="handleOptionClick"
        />
      </view>
    </scroll-view>

    <!-- 底部状态栏（贴底，左右贴边） -->
    <view v-if="bottomDockVisible" class="lc-flow__bottom">
      <view v-if="bottomCountdown" class="lc-bottom__countdown">
        <text class="lc-bottom__countdown-label">{{ bottomCountdown.label }}</text>
        <text class="lc-bottom__countdown-number">{{ bottomCountdownDisplay }}</text>
      </view>

      <view v-if="bottomAudioUrl" class="lc-bottom__audio">
        <AudioPlayer
          :key="audioKey"
          :src="bottomAudioUrl"
          :auto-play="shouldAutoPlay"
          @play="onAudioPlay"
          @ended="onAudioEnded"
        />
      </view>

      <view v-else-if="bottomExpectAudio && mode === 'preview'" class="lc-bottom__no-audio">
        <text class="lc-bottom__no-audio-text">{{ bottomMissingAudioText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { ListeningChoiceQuestion, RenderMode, SubQuestion } from '/types'
import type { ListeningChoiceRuntimeEvent } from '/engine/flow/listening-choice/runtime.ts'
import { createListeningChoiceRuntimeState, reduceListeningChoiceRuntimeState } from '/engine/flow/listening-choice/runtime.ts'
import type { ListeningChoiceStepRenderView } from './listening-choice/stepPlugins'
import {
  isListeningChoiceContextInfoStep,
  resolveListeningChoiceStepAudioCarrier,
  resolveListeningChoiceStepRenderView,
  shouldReuseListeningChoicePreviousScreen
} from './listening-choice/stepPlugins'
import ListeningChoiceAnswerChoiceBody from './listening-choice/ListeningChoiceAnswerChoiceBody.vue'
import AudioPlayer from './AudioPlayer.vue'
import ListeningChoiceCountdownBody from './listening-choice/ListeningChoiceCountdownBody.vue'
import ListeningChoiceFinishBody from './listening-choice/ListeningChoiceFinishBody.vue'
import ListeningChoiceGroupPromptBody from './listening-choice/ListeningChoiceGroupPromptBody.vue'
import ListeningChoiceIntroBody from './listening-choice/ListeningChoiceIntroBody.vue'
import ListeningChoicePlayAudioBody from './listening-choice/ListeningChoicePlayAudioBody.vue'
import ListeningChoiceUnsupportedBody from './listening-choice/ListeningChoiceUnsupportedBody.vue'

const props = withDefaults(defineProps<{
  data: ListeningChoiceQuestion
  mode?: RenderMode
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  stepIndex?: number
  showStepNav?: boolean
}>(), {
  mode: 'preview',
  answers: () => ({}),
  showAnswer: false,
  stepIndex: 0,
  showStepNav: true
})

const emit = defineEmits<{
  (e: 'select', subQuestionId: string, optionKey: string): void
  (e: 'stepChange', step: number): void
}>()

const steps = computed(() => props.data.flow?.steps || [])
const groups = computed(() => props.data.content?.groups || [])

const groupsById = computed(() => {
  const map: Record<string, ListeningChoiceQuestion['content']['groups'][number]> = {}
  groups.value.forEach((g) => {
    map[g.id] = g
  })
  return map
})

const questionsById = computed(() => {
  const map: Record<string, SubQuestion> = {}
  groups.value.forEach((g) => {
    ;(g.subQuestions || []).forEach((q) => {
      map[q.id] = q
    })
  })
  return map
})

const questionGroupIdById = computed(() => {
  const map: Record<string, string> = {}
  groups.value.forEach((g) => {
    ;(g.subQuestions || []).forEach((q) => {
      map[q.id] = g.id
    })
  })
  return map
})

const currentStepIndex = ref(props.stepIndex || 0)
const audioKey = ref(0)
const audioRemaining = ref(0)
const countdownLeft = ref(0)
const introCountdownLeft = ref(0)

let tickTimer: any = null

const activeStep = computed(() => steps.value[currentStepIndex.value] || null)
const activeStepRenderView = computed(() => resolveListeningChoiceStepRenderView(activeStep.value))

function resolveDisplayStepIndex(index: number): number {
  const step = steps.value[index] as any
  if (!step) return -1
  if (!shouldReuseListeningChoicePreviousScreen(step)) return index

  // Steps like "promptTone" should keep the previous screen visible.
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = steps.value[i] as any
    if (!prev) continue
    if (shouldReuseListeningChoicePreviousScreen(prev)) continue
    return i
  }
  return index
}

const displayStepIndex = computed(() => resolveDisplayStepIndex(currentStepIndex.value))
const displayStep = computed(() => {
  const idx = displayStepIndex.value
  if (idx < 0) return null
  return (steps.value[idx] as any) || null
})
const displayStepRenderView = computed(() => resolveListeningChoiceStepRenderView(displayStep.value))
const DISPLAY_RENDERERS: Record<ListeningChoiceStepRenderView, any> = {
  intro: ListeningChoiceIntroBody,
  groupPrompt: ListeningChoiceGroupPromptBody,
  countdown: ListeningChoiceCountdownBody,
  playAudio: ListeningChoicePlayAudioBody,
  answerChoice: ListeningChoiceAnswerChoiceBody,
  finish: ListeningChoiceFinishBody,
  unsupported: ListeningChoiceUnsupportedBody
}

const displayRenderer = computed(() => {
  return DISPLAY_RENDERERS[displayStepRenderView.value] || ListeningChoiceUnsupportedBody
})

function resolveAnswerChoiceGroupId(step: any): string | undefined {
  if (!step) return undefined
  if (step.groupId) return String(step.groupId)
  const ids = Array.isArray(step.questionIds) ? step.questionIds : []
  const groupIds = Array.from(new Set(ids.map(id => questionGroupIdById.value[id]).filter(Boolean)))
  if (groupIds.length === 1) return String(groupIds[0])
  return undefined
}

function resolveStepGroupId(step: any): string | undefined {
  if (!step) return undefined
  const renderView = resolveListeningChoiceStepRenderView(step)
  if (renderView === 'answerChoice') return resolveAnswerChoiceGroupId(step)
  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (renderView === 'groupPrompt' || renderView === 'playAudio' || carrier === 'promptTone') {
    return step.groupId ? String(step.groupId) : undefined
  }
  return undefined
}

function resolveAnswerSeconds(step: any): number {
  if (!step || resolveListeningChoiceStepRenderView(step) !== 'answerChoice') return 0
  const groupId = resolveAnswerChoiceGroupId(step)
  if (!groupId) return 0
  const raw = (groupsById.value[groupId] as any)?.answerSeconds
  const n = Math.floor(Number(raw))
  if (Number.isFinite(n) && n > 0) return n
  return 0
}

const activeGroup = computed(() => {
  const step = displayStep.value
  if (!step) return null
  const groupId = resolveStepGroupId(step as any)
  if (groupId) return groupsById.value[groupId] || null
  return null
})

const introAudioUrl = computed(() => props.data.content?.intro?.audio?.url || '')
const introAudioPlayCount = computed(() => props.data.content?.intro?.audio?.playCount || 0)
const introCountdownSeconds = computed(() => props.data.content?.intro?.countdown?.seconds || 0)
const introCountdownLabel = computed(() => props.data.content?.intro?.countdown?.label || '准备')

const activePlayAudioSource = computed<'description' | 'content'>(() => {
  const step: any = displayStep.value
  if (!step || displayStepRenderView.value !== 'playAudio') return 'content'
  return step.audioSource === 'description' ? 'description' : 'content'
})

const playAudioUrl = computed(() => {
  const g = activeGroup.value
  if (!g) return ''
  if (activePlayAudioSource.value === 'description') return g.descriptionAudio?.url || ''
  return g.audio?.url || ''
})
const playAudioPlayCount = computed(() => {
  const g = activeGroup.value
  if (!g) return 0
  if (activePlayAudioSource.value === 'description') return g.descriptionAudio?.playCount || 0
  return g.audio?.playCount || 0
})

const isPreview = computed(() => props.mode === 'preview')
const shouldAutoPlay = computed(() => props.mode === 'exam')

const introBaseTitle = computed(() => String(props.data.content?.intro?.title || '').trim())
const introTitleDescription = computed(() => String((props.data.content?.intro as any)?.title_description || '').trim())

function toBool(v: any, defaultValue = true) {
  if (typeof v === 'boolean') return v
  return defaultValue
}

function buildIntroTitle(showTitleDescription = true) {
  const title = introBaseTitle.value
  const titleDescription = introTitleDescription.value
  if (!showTitleDescription) return title
  if (title && titleDescription) return `${title} ${titleDescription}`
  return title || titleDescription
}

function stepShowTitle(step: any) {
  return toBool(step?.showTitle, true)
}

function stepShowTitleDescription(step: any) {
  return toBool(step?.showTitleDescription, true)
}

function stepShowDescription(step: any) {
  return toBool(step?.showDescription, true)
}

function stepShowQuestionTitle(step: any) {
  return toBool(step?.showQuestionTitle, true)
}

function stepShowQuestionTitleDescription(step: any) {
  return toBool(step?.showQuestionTitleDescription, true)
}

function stepShowGroupPrompt(step: any) {
  return toBool(step?.showGroupPrompt, true)
}

const activeContextTitle = computed(() => {
  const step: any = displayStep.value
  if (!step) return ''
  if (!isListeningChoiceContextInfoStep(step)) return ''
  if (!stepShowQuestionTitle(step)) return ''
  return buildIntroTitle(stepShowQuestionTitleDescription(step))
})

const activeContextGroupTitle = computed(() => {
  const step: any = displayStep.value
  if (!step) return ''
  if (!isListeningChoiceContextInfoStep(step)) return ''
  if (!stepShowTitle(step)) return ''
  const groupId = resolveStepGroupId(step)
  return getGroupDisplayName(groupId)
})

const activeContextShowPrompt = computed(() => {
  const step: any = displayStep.value
  if (!step) return false
  if (!isListeningChoiceContextInfoStep(step)) return false
  return stepShowGroupPrompt(step)
})

const activeTitle = computed(() => {
  const step: any = displayStep.value as any
  if (!step) return ''
  if (!stepShowTitle(step)) return ''

  if (displayStepRenderView.value === 'intro') return buildIntroTitle(stepShowTitleDescription(step))

  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (displayStepRenderView.value === 'groupPrompt' || carrier === 'promptTone') {
    return getGroupDisplayName(step.groupId)
  }

  if (displayStepRenderView.value === 'playAudio' || displayStepRenderView.value === 'answerChoice') return ''

  if (displayStepRenderView.value === 'countdown') {
    const ctx = countdownContext.value
    if (ctx?.kind === 'intro') {
      const introStep = resolveIntroStepForCountdown(displayStepIndex.value)
      return buildIntroTitle(stepShowTitleDescription(introStep))
    }
    if (ctx?.kind === 'group') return getGroupDisplayName(ctx.groupId)
    return ''
  }

  return ''
})

function getGroupDisplayName(groupId: string | undefined | null): string {
  if (!groupId) return ''
  const gid = String(groupId)
  const g = groupsById.value[gid]
  if (g?.title) return g.title
  const idx = groups.value.findIndex(x => x.id === gid)
  if (idx >= 0) return `第${idx + 1}题组`
  return '题组'
}

function hasSeparateIntroCountdownStep(index: number) {
  const cur = steps.value[index] as any
  const next = steps.value[index + 1] as any
  return resolveListeningChoiceStepRenderView(cur) === 'intro' && resolveListeningChoiceStepRenderView(next) === 'countdown'
}

function resolveIntroStepForCountdown(index: number): any | null {
  const prev = steps.value[index - 1] as any
  if (resolveListeningChoiceStepRenderView(prev) === 'intro') return prev
  const intro = (steps.value || []).find((s: any) => resolveListeningChoiceStepRenderView(s) === 'intro')
  return intro || null
}

const activeIntroShowDescription = computed(() => {
  const step: any = displayStep.value as any
  if (!step || displayStepRenderView.value !== 'intro') return true
  return stepShowDescription(step)
})

const countdownContext = computed(() => {
  const step = displayStep.value
  if (!step || displayStepRenderView.value !== 'countdown') return null

  const baseIndex = displayStepIndex.value
  const prev = steps.value[baseIndex - 1] as any
  const next = steps.value[baseIndex + 1] as any

  if (resolveListeningChoiceStepRenderView(prev) === 'intro') return { kind: 'intro' as const }

  const groupIdFromStep = (s: any): string | null => {
    if (!s) return null
    const renderView = resolveListeningChoiceStepRenderView(s)
    const carrier = resolveListeningChoiceStepAudioCarrier(s)
    if (renderView === 'groupPrompt' || renderView === 'playAudio' || renderView === 'answerChoice' || carrier === 'promptTone') {
      return s.groupId ? String(s.groupId) : null
    }
    return null
  }

  const groupId = groupIdFromStep(prev) || groupIdFromStep(next)
  if (groupId) return { kind: 'group' as const, groupId: String(groupId) }

  return null
})

const countdownContextGroup = computed(() => {
  if (countdownContext.value?.kind !== 'group') return null
  return groupsById.value[countdownContext.value.groupId] || null
})

const countdownIntroShowDescription = computed(() => {
  const step = displayStep.value
  if (!step || displayStepRenderView.value !== 'countdown') return true
  if (countdownContext.value?.kind !== 'intro') return true
  const introStep = resolveIntroStepForCountdown(displayStepIndex.value)
  return stepShowDescription(introStep)
})

const bottomAudioUrl = computed(() => {
  const step = activeStep.value
  if (!step) return ''
  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (carrier === 'intro') return introAudioUrl.value
  if (carrier === 'playAudio') return playAudioUrl.value
  if (carrier === 'promptTone') return String((step as any).url || '')
  return ''
})

const bottomExpectAudio = computed(() => {
  const step = activeStep.value
  if (!step) return false
  return resolveListeningChoiceStepAudioCarrier(step) !== null
})

const bottomMissingAudioText = computed(() => {
  const step = activeStep.value
  if (!step) return ''
  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (carrier === 'intro') return '未配置说明音频 URL'
  if (carrier === 'playAudio') return activePlayAudioSource.value === 'description' ? '未配置题组描述音频 URL' : '未配置题组正文音频 URL'
  if (carrier === 'promptTone') return '未配置提示音 URL'
  return ''
})

const activeQuestions = computed(() => {
  const step = displayStep.value
  if (!step || displayStepRenderView.value !== 'answerChoice') return []

  const ids = (step as any).questionIds as string[] | undefined
  if (ids && ids.length > 0) {
    return ids.map(id => questionsById.value[id]).filter(Boolean)
  }

  const groupId = (step as any).groupId as string | undefined
  if (groupId) {
    return (groupsById.value[groupId]?.subQuestions || []) as SubQuestion[]
  }

  return []
})

const contextQuestions = computed(() => {
  const step = displayStep.value as any
  if (!step) return []

  // Answer page: honor explicit questionIds first (if provided).
  if (displayStepRenderView.value === 'answerChoice') return activeQuestions.value

  if (displayStepRenderView.value === 'groupPrompt' || displayStepRenderView.value === 'playAudio') {
    const groupId = step.groupId as string | undefined
    if (!groupId) return []
    return (groupsById.value[groupId]?.subQuestions || []) as SubQuestion[]
  }

  if (displayStepRenderView.value === 'countdown') {
    const ctx = countdownContext.value
    if (ctx?.kind !== 'group') return []
    return (groupsById.value[ctx.groupId]?.subQuestions || []) as SubQuestion[]
  }

  return []
})

const displayRendererProps = computed<Record<string, any>>(() => {
  const step: any = displayStep.value || {}
  const shared = {
    answers: props.answers,
    showAnswer: props.showAnswer,
    mode: props.mode
  }

  if (displayStepRenderView.value === 'intro') {
    return {
      ...shared,
      showDescription: activeIntroShowDescription.value,
      introText: props.data.content?.intro?.text,
      introAudioUrl: introAudioUrl.value,
      autoNext: String(step.autoNext || '')
    }
  }

  if (displayStepRenderView.value === 'groupPrompt') {
    return {
      ...shared,
      prompt: activeGroup.value?.prompt,
      questions: contextQuestions.value
    }
  }

  if (displayStepRenderView.value === 'countdown') {
    return {
      ...shared,
      contextKind: countdownContext.value?.kind || '',
      introText: props.data.content?.intro?.text,
      introShowDescription: countdownIntroShowDescription.value,
      groupPrompt: countdownContextGroup.value?.prompt,
      questions: contextQuestions.value,
      label: String(step.label || '')
    }
  }

  if (displayStepRenderView.value === 'playAudio') {
    return {
      ...shared,
      contextTitle: activeContextTitle.value,
      contextGroupTitle: activeContextGroupTitle.value,
      contextShowPrompt: activeContextShowPrompt.value,
      prompt: activeGroup.value?.prompt,
      questions: contextQuestions.value,
      playAudioUrl: playAudioUrl.value,
      playAudioSource: activePlayAudioSource.value,
      audioRemaining: audioRemaining.value
    }
  }

  if (displayStepRenderView.value === 'answerChoice') {
    return {
      ...shared,
      contextTitle: activeContextTitle.value,
      contextGroupTitle: activeContextGroupTitle.value,
      contextShowPrompt: activeContextShowPrompt.value,
      prompt: activeGroup.value?.prompt,
      questions: activeQuestions.value
    }
  }

  if (displayStepRenderView.value === 'finish') {
    return {
      text: String(step.text || '')
    }
  }

  return {
    kind: String(step.kind || '')
  }
})

const bottomCountdown = computed(() => {
  const step = activeStep.value
  if (!step) return null
  const renderView = activeStepRenderView.value

  // Branch order marker for regression tests: if (step.kind === 'intro')
  if (renderView === 'intro') {
    if (introCountdownLeft.value > 0) {
      return {
        label: `介绍页-${introCountdownLabel.value || '准备'}-倒计时`,
        seconds: introCountdownLeft.value
      }
    }
    return null
  }

  if (renderView === 'countdown') {
    if (countdownLeft.value <= 0) return null

    const next = steps.value[currentStepIndex.value + 1] as any
    const nextRenderView = resolveListeningChoiceStepRenderView(next)
    const nextCarrier = resolveListeningChoiceStepAudioCarrier(next)

    let label = step.label ? `${step.label}-倒计时` : '倒计时'
    if (countdownContext.value?.kind === 'intro') {
      // Intro countdown is already self-explanatory; keep it stable regardless of what comes next.
      label = `${step.label || introCountdownLabel.value || '准备'}-倒计时`
    } else if (nextRenderView === 'playAudio') {
      const nextSource = next?.audioSource === 'description' ? 'description' : 'content'
      label = nextSource === 'description' ? '播放描述音频前-倒计时' : '播放正文音频前-倒计时'
    } else if (nextCarrier === 'promptTone') {
      label = '提示音前-倒计时'
    } else if (nextRenderView === 'answerChoice') {
      label = '答题前-倒计时'
    } else if (nextRenderView === 'groupPrompt') {
      label = '题组提示前-倒计时'
    } else if (nextRenderView === 'finish') {
      label = '完成前-倒计时'
    }

    const ctx = countdownContext.value
    if (ctx?.kind === 'intro') label = `介绍页-${label}`
    else if (ctx?.kind === 'group') label = `${getGroupDisplayName(ctx.groupId)}-${label}`
    else label = `切换页面-${label}`

    return {
      label,
      seconds: countdownLeft.value
    }
  }

  if (renderView === 'answerChoice') {
    if (countdownLeft.value <= 0) return null
    const groupId = resolveAnswerChoiceGroupId(step as any)
    const groupLabel = getGroupDisplayName(groupId)
    return {
      label: groupLabel ? `${groupLabel}-答题倒计时` : '答题倒计时',
      seconds: countdownLeft.value
    }
  }

  return null
})

const bottomCountdownDisplay = computed(() => {
  const v = bottomCountdown.value
  if (!v) return ''
  if (v.seconds <= 99) return String(v.seconds)
  return formatSeconds(v.seconds)
})

const bottomDockVisible = computed(() => {
  return Boolean(bottomAudioUrl.value || bottomCountdown.value || (isPreview.value && bottomExpectAudio.value))
})

function clearTickTimer() {
  if (!tickTimer) return
  clearInterval(tickTimer)
  tickTimer = null
}

function dispatchRuntime(event: ListeningChoiceRuntimeEvent) {
  const current = createListeningChoiceRuntimeState(currentStepIndex.value)
  const next = reduceListeningChoiceRuntimeState(current, steps.value as any, event)
  const nextIndex = Number(next?.stepIndex || 0)
  if (nextIndex === currentStepIndex.value) return
  currentStepIndex.value = nextIndex
  emit('stepChange', nextIndex)
}

function goToStep(nextIndex: number) {
  dispatchRuntime({ type: 'goToStep', stepIndex: nextIndex })
}

function prevStep() {
  dispatchRuntime({ type: 'prev' })
}

function nextStep() {
  dispatchRuntime({ type: 'next' })
}

function startCountdown(seconds: number, onDone: () => void) {
  clearTickTimer()
  countdownLeft.value = seconds
  tickTimer = setInterval(() => {
    countdownLeft.value -= 1
    if (countdownLeft.value <= 0) {
      countdownLeft.value = 0
      clearTickTimer()
      onDone()
    }
  }, 1000)
}

function startIntroCountdown() {
  const seconds = introCountdownSeconds.value
  if (!seconds || seconds <= 0) {
    dispatchRuntime({ type: 'countdownEnded' })
    return
  }

  clearTickTimer()
  introCountdownLeft.value = seconds
  tickTimer = setInterval(() => {
    introCountdownLeft.value -= 1
    if (introCountdownLeft.value <= 0) {
      introCountdownLeft.value = 0
      clearTickTimer()
      dispatchRuntime({ type: 'countdownEnded' })
    }
  }, 1000)
}

function startAudioLoop(playCount: number, onDone: () => void) {
  // AudioPlayer will auto-play on mount; we restart it by bumping key.
  const count = Math.max(1, playCount || 1)
  audioRemaining.value = count
  audioKey.value += 1

  // If there is no audio URL, treat as done.
  if (!bottomAudioUrl.value) {
    audioRemaining.value = 0
    onDone()
  }
}

function enterActiveStep() {
  clearTickTimer()
  countdownLeft.value = 0
  introCountdownLeft.value = 0
  audioRemaining.value = 0

  const step = activeStep.value
  if (!step) return
  const renderView = activeStepRenderView.value

  if (isPreview.value) {
    // Preview mode should never auto-play audio, start timers, or auto-advance steps.
    // Keep some configured durations visible (static), so authors can verify flow settings.
    if (renderView === 'intro') {
      // If intro countdown is represented as a separate flow step, do not show it here.
      if (hasSeparateIntroCountdownStep(currentStepIndex.value)) return

      if (step.autoNext === 'countdownEnded') {
        const seconds = introCountdownSeconds.value
        if (seconds && seconds > 0) introCountdownLeft.value = seconds
      }
      return
    }

    if (renderView === 'countdown') {
      countdownLeft.value = step.seconds || 0
      return
    }

    if (renderView === 'answerChoice') {
      if (step.autoNext === 'timeEnded') {
        countdownLeft.value = resolveAnswerSeconds(step)
      }
      return
    }

    return
  }

  // Branch order marker for regression tests: if (step.kind === 'intro')
  if (renderView === 'intro') {
    const splitCountdown = hasSeparateIntroCountdownStep(currentStepIndex.value)
    const autoNext = String(step.autoNext || '')

    // exam: audio (optional) -> (intro countdown either here or next step) -> auto next
    const count = introAudioPlayCount.value || 0
    if (splitCountdown) {
      if (introAudioUrl.value && count > 0) {
        startAudioLoop(count, () => {
          dispatchRuntime({ type: 'audioEnded' })
        })
      } else {
        dispatchRuntime({ type: 'audioEnded' })
      }
      return
    }

    if (autoNext === 'audioEnded') {
      if (introAudioUrl.value && count > 0) startAudioLoop(count, () => dispatchRuntime({ type: 'audioEnded' }))
      else dispatchRuntime({ type: 'audioEnded' })
      return
    }

    if (autoNext === 'countdownEnded') {
      if (introAudioUrl.value && count > 0) startAudioLoop(count, () => startIntroCountdown())
      else startIntroCountdown()
      return
    }

    return
  }

  if (renderView === 'countdown') {
    startCountdown(step.seconds || 0, () => {
      dispatchRuntime({ type: 'countdownEnded' })
    })
    return
  }

  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (carrier === 'playAudio') {
    const count = Math.max(1, playAudioPlayCount.value || 1)

    startAudioLoop(count, () => {
      dispatchRuntime({ type: 'audioEnded' })
    })
    return
  }

  if (carrier === 'promptTone') {
    startAudioLoop(1, () => {
      dispatchRuntime({ type: 'audioEnded' })
    })
    return
  }

  if (renderView === 'answerChoice') {
    const seconds = resolveAnswerSeconds(step)
    if (step.autoNext === 'timeEnded' && seconds > 0) {
      startCountdown(seconds, () => {
        dispatchRuntime({ type: 'timeEnded' })
      })
    }
    return
  }
}

function onAudioEnded() {
  if (audioRemaining.value <= 0) return
  audioRemaining.value -= 1
  if (audioRemaining.value > 0) {
    audioKey.value += 1
    return
  }

  const step = activeStep.value
  if (!step) return
  const renderView = activeStepRenderView.value

  if (renderView === 'intro') {
    if (isPreview.value) return

    // If intro countdown is a separate step, audio ending should advance to it.
    if (hasSeparateIntroCountdownStep(currentStepIndex.value)) {
      dispatchRuntime({ type: 'audioEnded' })
      return
    }

    if (step.autoNext === 'countdownEnded') startIntroCountdown()
    else dispatchRuntime({ type: 'audioEnded' })
    return
  }

  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (carrier === 'playAudio' || carrier === 'promptTone') {
    dispatchRuntime({ type: 'audioEnded' })
  }
}

function onAudioPlay() {
  // No-op in exam mode. In preview mode there should be no timers, but keep this as defensive cleanup.
  if (!isPreview.value) return
  clearTickTimer()
  countdownLeft.value = 0
}

watch(() => props.stepIndex, (v) => {
  if (typeof v !== 'number') return
  if (v === currentStepIndex.value) return
  currentStepIndex.value = Math.max(0, Math.min(v, steps.value.length - 1))
})

watch(activeStep, () => {
  enterActiveStep()
}, { immediate: true })

onUnmounted(() => {
  clearTickTimer()
})

function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleOptionClick(subQuestionId: string, optionKey: string) {
  if (props.mode === 'review') return
  emit('select', subQuestionId, optionKey)
}
</script>

<style lang="scss" scoped>
.lc-flow {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.lc-flow__top {
  padding: $spacing-md;
  border-bottom: 1px solid #eee;
  background: #fff;
}

.lc-flow__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lc-flow__nav-text {
  color: $text-secondary;
  font-size: $font-size-sm;
}

.lc-flow__title {
  margin-top: $spacing-sm;
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.lc-flow__timer {
  margin-top: 6px;
  font-size: $font-size-sm;
  color: $warning-color;
}

.lc-flow__body {
  flex: 1;
  min-height: 0;
  height: 0;
}

.lc-flow__body-inner {
  min-height: 100%;
  padding: $spacing-md;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.lc-flow__bottom {
  flex-shrink: 0;
  background: #f3f5f7;
  border-top: 1px solid #e9edf3;
  /* No horizontal padding here so the dock can touch the phone frame edges. */
  padding: 0;
  padding-bottom: env(safe-area-inset-bottom);

  .lc-bottom__countdown {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
  }

  .lc-bottom__countdown-label {
    font-size: 12px;
    color: $text-secondary;
    font-weight: 500;
  }

  .lc-bottom__countdown-number {
    font-size: 44px;
    font-weight: 800;
    color: $primary-color;
    line-height: 1;
  }

  .lc-bottom__timer {
    padding: 10px 12px;
  }

  .lc-bottom__timer-text {
    font-size: 12px;
    color: $warning-color;
    font-weight: 600;
  }

  .lc-bottom__no-audio {
    padding: 10px 12px;
  }

  .lc-bottom__no-audio-text {
    font-size: 12px;
    color: $text-hint;
    font-weight: 600;
  }

  :deep(.audio-player) {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px 10px;
    background: transparent;
    border-radius: 0;
  }

  :deep(.audio-player__btn) {
    width: 48px;
    height: 48px;
  }
}

.lc-step__heading {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: $spacing-sm;
}

.lc-step__audio {
  margin-top: $spacing-md;
}

.lc-step__hint {
  margin-top: $spacing-md;
  color: $text-hint;
  font-size: $font-size-sm;
}

.lc-step--center {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;
}

.lc-step__countdown-label {
  color: $text-secondary;
  font-size: 14px;
}

.lc-step__countdown-seconds {
  font-size: 48px;
  font-weight: 700;
  color: $primary-color;
}

.lc-questions {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.lc-question__stem {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-start;
  margin-bottom: $spacing-sm;
}

.lc-question__number {
  min-width: 18px;
  font-weight: 600;
  color: $text-primary;
}

.lc-question__options {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.lc-option {
  display: flex;
  // Multi-line option text should align with the radio/key on the first line.
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-sm;
  border: 1px solid #eee;
  border-radius: $border-radius-md;
  background: #fff;
}

.lc-option.is-selected {
  border-color: $primary-color;
  background: $primary-light;
}

.lc-option.is-correct {
  border-color: $success-color;
  background: rgba(76, 175, 80, 0.12);
}

.lc-option.is-wrong {
  border-color: $error-color;
  background: rgba(244, 67, 54, 0.12);
}

.lc-option__radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #bbb;
  flex-shrink: 0;
  margin-top: 2px;
}

.lc-option__key {
  width: 18px;
  font-weight: 600;
  color: $text-secondary;
  flex-shrink: 0;
  margin-top: 1px;
}

.lc-option__content {
  flex: 1;
  min-width: 0;
}

.lc-step__actions {
  margin-top: $spacing-lg;
  display: flex;
  justify-content: flex-end;
}

.lc-step__finish-text {
  color: $text-secondary;
  font-size: 14px;
}
</style>
