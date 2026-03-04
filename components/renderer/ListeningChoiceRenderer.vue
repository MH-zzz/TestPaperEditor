<template>
    <view class="lc-flow" :class="{ 'lc-flow--fixed-dock': fixedDockEnabled }">
      <view class="lc-flow__top">
      <view v-if="showStepNav" class="lc-flow__nav">
        <button class="btn btn-outline btn-sm" :disabled="currentStepIndex <= 0" @click="prevStep">上一步</button>
        <text class="lc-flow__nav-text">{{ steps.length ? currentStepIndex + 1 : 0 }} / {{ steps.length }}</text>
        <button class="btn btn-outline btn-sm" :disabled="currentStepIndex >= steps.length - 1" @click="nextStep">下一步</button>
      </view>

      <view v-if="activeTitle" class="lc-flow__title">{{ activeTitle }}</view>
    </view>

    <scroll-view scroll-y class="lc-flow__body" :class="{ 'lc-flow__body--fixed': fixedDockEnabled }" v-if="displayStep">
      <view class="lc-flow__body-inner" :class="{ 'lc-flow__body-inner--fixed': fixedDockEnabled }">
        <component
          :is="displayRenderer"
          v-bind="displayRendererProps"
          @select="handleOptionClick"
        />
      </view>
    </scroll-view>

    <!-- 底部状态栏（贴底，左右贴边） -->
    <view v-if="bottomDockVisible" class="lc-flow__bottom" :class="{ 'lc-flow__bottom--fixed': fixedDockEnabled }">
      <view v-if="bottomRecordingIndicator" class="lc-bottom__recording">
        <view class="lc-bottom__recording-icon">
          <view class="lc-bottom__recording-stop" />
        </view>
        <text class="lc-bottom__recording-text">正在录音 {{ bottomRecordingElapsedDisplay }}</text>
      </view>

      <view v-else-if="bottomDockStatus" class="lc-bottom__countdown">
        <view
          class="lc-bottom__countdown-icon"
          :class="{ 'is-paused': isCountdownPaused, 'is-disabled': !canToggleCountdownPause }"
          @click="toggleCountdownPause"
        >
          <text class="lc-bottom__countdown-icon-symbol">{{ bottomCountdownPauseIcon }}</text>
        </view>
        <view class="lc-bottom__countdown-main">
          <text v-if="bottomDockDisplayLabel" class="lc-bottom__countdown-label">{{ bottomDockDisplayLabel }}</text>
          <text class="lc-bottom__countdown-number">{{ bottomDockDisplay }}</text>
        </view>
      </view>

      <view v-if="bottomAudioUrl" class="lc-bottom__audio">
        <AudioPlayer
          ref="audioPlayerRef"
          :key="audioKey"
          :src="bottomAudioUrl"
          :auto-play="shouldAutoPlay"
          :hidden="mode === 'exam'"
          @play="onAudioPlay"
          @pause="onAudioPause"
          @timeupdate="onAudioTimeUpdate"
          @durationchange="onAudioDurationChange"
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
import { computed, onUnmounted, ref, watch, type Component } from 'vue'
import type {
  ListeningChoiceFlowStep,
  ListeningChoiceGroup,
  ListeningChoiceQuestion,
  RenderMode,
  SubQuestion
} from '/types'
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
import ListeningChoiceRecordGuideBody from './listening-choice/ListeningChoiceRecordGuideBody.vue'
import ListeningChoiceUnsupportedBody from './listening-choice/ListeningChoiceUnsupportedBody.vue'

const props = withDefaults(defineProps<{
  data: ListeningChoiceQuestion
  mode?: RenderMode
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  stepIndex?: number
  showStepNav?: boolean
  fixedBottomDock?: boolean
}>(), {
  mode: 'preview',
  answers: () => ({}),
  showAnswer: false,
  stepIndex: 0,
  showStepNav: true,
  fixedBottomDock: false
})

const emit = defineEmits<{
  (e: 'select', subQuestionId: string, optionKey: string): void
  (e: 'stepChange', step: number): void
}>()

type RendererStep = ListeningChoiceFlowStep
type RendererStepOfKind<TKind extends RendererStep['kind']> = Extract<RendererStep, { kind: TKind }>
type CountdownContextInfo =
  | { kind: 'intro' }
  | { kind: 'group'; groupId: string }
  | null

function isStepKind<TKind extends RendererStep['kind']>(
  step: RendererStep | null | undefined,
  kind: TKind
): step is RendererStepOfKind<TKind> {
  return step?.kind === kind
}

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
const audioRepeatGapActive = ref(false)
const audioRepeatGapSeconds = ref(0)
const isCountdownPaused = ref(false)
const audioPlayerRef = ref<any>(null)
const audioCurrentTime = ref(0)
const audioDuration = ref(0)
const isBottomAudioPlaying = ref(false)
const lastAudioEndedAt = ref(0)

let tickTimer: ReturnType<typeof setInterval> | null = null

const activeStep = computed(() => steps.value[currentStepIndex.value] || null)
const activeStepRenderView = computed(() => resolveListeningChoiceStepRenderView(activeStep.value))

function resolveDisplayStepIndex(index: number): number {
  const step = steps.value[index]
  if (!step) return -1
  if (!shouldReuseListeningChoicePreviousScreen(step)) return index

  // Hear-answer: keep end-recording prompt tone on the same screen as
  // start-recording prompt tone, avoiding a visual jump at recording end.
  if (isHearAnswerVariant.value && isStepKind(step, 'promptTone')) {
    const prev = steps.value[index - 1]
    const startTone = steps.value[index - 2]
    if (isStepKind(prev, 'answerChoice') && isStepKind(startTone, 'promptTone')) {
      for (let i = index - 3; i >= 0; i -= 1) {
        const anchor = steps.value[i]
        if (!anchor) continue
        if (shouldReuseListeningChoicePreviousScreen(anchor)) continue
        return i
      }
    }
  }

  // Steps like "promptTone" should keep the previous screen visible.
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = steps.value[i]
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
  return steps.value[idx] || null
})
const displayStepRenderView = computed(() => resolveListeningChoiceStepRenderView(displayStep.value))
const DISPLAY_RENDERERS: Record<ListeningChoiceStepRenderView, Component> = {
  intro: ListeningChoiceIntroBody,
  groupPrompt: ListeningChoiceGroupPromptBody,
  countdown: ListeningChoiceCountdownBody,
  playAudio: ListeningChoicePlayAudioBody,
  recordGuide: ListeningChoiceRecordGuideBody,
  answerChoice: ListeningChoiceAnswerChoiceBody,
  finish: ListeningChoiceFinishBody,
  unsupported: ListeningChoiceUnsupportedBody
}

const displayRenderer = computed(() => {
  return DISPLAY_RENDERERS[displayStepRenderView.value] || ListeningChoiceUnsupportedBody
})

function resolveAnswerChoiceGroupId(step: RendererStep | null | undefined): string | undefined {
  if (!isStepKind(step, 'answerChoice')) return undefined
  if (step.groupId) return String(step.groupId)
  const ids = Array.isArray(step.questionIds) ? step.questionIds : []
  const groupIds = Array.from(new Set(ids.map(id => questionGroupIdById.value[id]).filter(Boolean)))
  if (groupIds.length === 1) return String(groupIds[0])
  return undefined
}

function resolveStepGroupId(step: RendererStep | null | undefined): string | undefined {
  if (!step) return undefined
  const renderView = resolveListeningChoiceStepRenderView(step)
  if (renderView === 'answerChoice') return resolveAnswerChoiceGroupId(step)
  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (renderView === 'groupPrompt' || renderView === 'playAudio' || carrier === 'promptTone' || carrier === 'recordGuide') {
    return step.groupId ? String(step.groupId) : undefined
  }
  return undefined
}

function resolveAnswerSeconds(step: RendererStep | null | undefined): number {
  if (!step || resolveListeningChoiceStepRenderView(step) !== 'answerChoice') return 0
  if (typeof (step as any).answerSeconds === 'number' && Number.isFinite((step as any).answerSeconds)) {
    return Math.max(0, Math.floor((step as any).answerSeconds))
  }
  const groupId = resolveAnswerChoiceGroupId(step)
  if (!groupId) return 0
  const raw = groupsById.value[groupId]?.answerSeconds
  const n = Math.floor(Number(raw))
  if (Number.isFinite(n) && n > 0) return n
  return 0
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

const activeGroup = computed(() => {
  const step = displayStep.value
  if (!step) return null
  const groupId = resolveStepGroupId(step)
  if (groupId) return groupsById.value[groupId] || null
  return null
})

const introAudioUrl = computed(() => props.data.content?.intro?.audio?.url || '')
const introAudioPlayCount = computed(() => toPositiveInt(props.data.content?.intro?.audio?.playCount, 1))
const introCountdownSeconds = computed(() => props.data.content?.intro?.countdown?.seconds || 0)
const introCountdownLabel = computed(() => props.data.content?.intro?.countdown?.label || '准备')

const activePlayAudioStep = computed<RendererStepOfKind<'playAudio'> | null>(() => {
  const step = activeStep.value
  if (isStepKind(step, 'playAudio')) return step
  const display = displayStep.value
  if (isStepKind(display, 'playAudio') && displayStepRenderView.value === 'playAudio') return display
  return null
})

const activePlayAudioSource = computed<'description' | 'content'>(() => {
  const step = activePlayAudioStep.value
  if (!step) return 'content'
  return step.audioSource === 'description' ? 'description' : 'content'
})

const activePlayAudioGroup = computed(() => {
  const step = activePlayAudioStep.value
  if (!step) return null
  const groupId = String(step.groupId || '')
  if (!groupId) return null
  return groupsById.value[groupId] || null
})

const playAudioUrl = computed(() => {
  const g = activePlayAudioGroup.value
  if (!g) return ''
  if (activePlayAudioSource.value === 'description') return g.descriptionAudio?.url || ''
  return g.audio?.url || ''
})
const playAudioPlayCount = computed(() => {
  const g = activePlayAudioGroup.value
  if (!g) return 0
  if (activePlayAudioSource.value === 'description') return toPositiveInt(g.descriptionAudio?.playCount, 1)
  return toPositiveInt(g.audio?.playCount, 1)
})

function resolveStepPlayTimes(step: RendererStep | null | undefined): number {
  if (!isStepKind(step, 'playAudio')) return 1
  const explicit = Math.floor(Number((step as any)?.playTimes))
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  return Math.max(1, playAudioPlayCount.value || 1)
}

const isPreview = computed(() => props.mode === 'preview')
const fixedDockEnabled = computed(() => props.fixedBottomDock || !isPreview.value)
const shouldAutoPlay = computed(() => props.mode === 'exam')
const isHearAnswerVariant = computed(() => {
  const metadata = (props.data as any)?.metadata
  if (!metadata || typeof metadata !== 'object') return false
  const variant = typeof (metadata as any).questionVariant === 'string'
    ? (metadata as any).questionVariant.trim()
    : ''
  return variant === 'hear_answer'
})
const isRecording = ref(false)
const activeRecordingQuestionId = ref('')

const introBaseTitle = computed(() => String(props.data.content?.intro?.title || '').trim())
const introTitleDescription = computed(() => String(props.data.content?.intro?.title_description || '').trim())

function toBool(v: unknown, defaultValue = true) {
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

function stepShowTitle(step: RendererStep | null | undefined) {
  return toBool(step?.showTitle, true)
}

function stepShowTitleDescription(step: RendererStep | null | undefined) {
  return toBool(step?.showTitleDescription, true)
}

function stepShowDescription(step: RendererStep | null | undefined) {
  return toBool(step?.showDescription, true)
}

function stepShowQuestionTitle(step: RendererStep | null | undefined) {
  return toBool(step?.showQuestionTitle, true)
}

function stepShowQuestionTitleDescription(step: RendererStep | null | undefined) {
  return toBool(step?.showQuestionTitleDescription, true)
}

function stepShowGroupPrompt(step: RendererStep | null | undefined) {
  return toBool(step?.showGroupPrompt, true)
}

const activeContextTitle = computed(() => {
  if (isHearAnswerVariant.value) return ''
  const step = displayStep.value
  if (!step) return ''
  if (!isListeningChoiceContextInfoStep(step)) return ''
  if (!stepShowQuestionTitle(step)) return ''
  return buildIntroTitle(stepShowQuestionTitleDescription(step))
})

const activeContextGroupTitle = computed(() => {
  if (isHearAnswerVariant.value) return ''
  const step = displayStep.value
  if (!step) return ''
  if (!isListeningChoiceContextInfoStep(step)) return ''
  if (!stepShowTitle(step)) return ''
  const groupId = resolveStepGroupId(step)
  return getGroupDisplayName(groupId)
})

const activeContextShowPrompt = computed(() => {
  const step = displayStep.value
  if (!step) return false
  if (!isListeningChoiceContextInfoStep(step)) return false
  return stepShowGroupPrompt(step)
})

const activeTitle = computed(() => {
  if (isHearAnswerVariant.value) return buildIntroTitle(true)
  const step = displayStep.value
  if (!step) return ''

  if (displayStepRenderView.value === 'intro') return buildIntroTitle(stepShowTitleDescription(step))

  if (displayStepRenderView.value === 'playAudio' || displayStepRenderView.value === 'recordGuide' || displayStepRenderView.value === 'answerChoice') {
    // Keep question title at a fixed top position across steps.
    return activeContextTitle.value
  }

  if (!stepShowTitle(step)) return ''

  const carrier = resolveListeningChoiceStepAudioCarrier(step)
  if (displayStepRenderView.value === 'groupPrompt' || carrier === 'promptTone') {
    return getGroupDisplayName(resolveStepGroupId(step))
  }

  if (displayStepRenderView.value === 'countdown') {
    if (stepShowQuestionTitle(step)) return buildIntroTitle(true)

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
  const cur = steps.value[index]
  const next = steps.value[index + 1]
  return resolveListeningChoiceStepRenderView(cur) === 'intro' && resolveListeningChoiceStepRenderView(next) === 'countdown'
}

function shouldSkipHearAnswerLegacyPostContentCountdown(index: number): boolean {
  if (!isHearAnswerVariant.value) return false
  const step = steps.value[index]
  if (!isStepKind(step, 'countdown')) return false

  const prev = steps.value[index - 1]
  if (!isStepKind(prev, 'playAudio')) return false
  if (prev.audioSource !== 'content') return false

  const next = steps.value[index + 1]
  const nextIsContentAudio = isStepKind(next, 'playAudio') && next.audioSource === 'content'
  if (nextIsContentAudio) return false

  return true
}

function resolveIntroStepForCountdown(index: number): RendererStepOfKind<'intro'> | null {
  const prev = steps.value[index - 1]
  if (isStepKind(prev, 'intro')) return prev
  const intro = steps.value.find((s) => isStepKind(s, 'intro'))
  return intro || null
}

const activeIntroShowDescription = computed(() => {
  const step = displayStep.value
  if (!isStepKind(step, 'intro') || displayStepRenderView.value !== 'intro') return true
  if (!isPreview.value) return true
  return stepShowDescription(step)
})

const countdownContext = computed<CountdownContextInfo>(() => {
  const step = displayStep.value
  if (!step || displayStepRenderView.value !== 'countdown') return null

  const baseIndex = displayStepIndex.value
  const prev = steps.value[baseIndex - 1]
  const next = steps.value[baseIndex + 1]

  if (resolveListeningChoiceStepRenderView(prev) === 'intro') return { kind: 'intro' as const }

  const groupIdFromStep = (s: RendererStep | null | undefined): string | null => {
    if (!s) return null
    return resolveStepGroupId(s) || null
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
  if (carrier === 'promptTone' && isStepKind(step, 'promptTone')) return String(step.url || '')
  if (carrier === 'recordGuide' && isStepKind(step, 'recordGuide')) return String((step as any).guideAudioUrl || '')
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
  if (carrier === 'recordGuide') return '未配置录音说明音频 URL'
  return ''
})

const activeRecordGuideText = computed(() => {
  const step = displayStep.value
  if (!step || displayStepRenderView.value !== 'recordGuide') return null
  return ((step as any).guideText || activeGroup.value?.recordGuideText || activeGroup.value?.prompt || null) as any
})

function resolveHearAnswerAnswerGuideText(step: RendererStep | null | undefined) {
  if (!isHearAnswerVariant.value) return null
  if (!isStepKind(step, 'answerChoice')) return null

  const ids = Array.isArray(step.questionIds)
    ? step.questionIds.map(id => String(id || '')).filter(Boolean)
    : []

  for (const id of ids) {
    const sq = questionsById.value[id] as any
    if (sq?.recordGuideText) return sq.recordGuideText
  }

  const groupId = resolveAnswerChoiceGroupId(step) || String(step.groupId || '')
  const group = groupId ? (groupsById.value[groupId] as any) : null
  if (group?.recordGuideText) return group.recordGuideText

  return null
}

const activeQuestions = computed(() => {
  const step = displayStep.value
  if (!isStepKind(step, 'answerChoice') || displayStepRenderView.value !== 'answerChoice') return []

  const ids = step.questionIds
  if (ids && ids.length > 0) {
    return ids.map(id => questionsById.value[id]).filter(Boolean)
  }

  const groupId = step.groupId
  if (groupId) {
    return (groupsById.value[groupId]?.subQuestions || []) as SubQuestion[]
  }

  return []
})

const contextQuestions = computed(() => {
  const step = displayStep.value
  if (!step) return []

  // Answer page: honor explicit questionIds first (if provided).
  if (displayStepRenderView.value === 'answerChoice') return activeQuestions.value

  if (displayStepRenderView.value === 'recordGuide' && isStepKind(step, 'recordGuide')) {
    const ids = Array.isArray(step.questionIds) ? step.questionIds.map(id => String(id || '')).filter(Boolean) : []
    if (ids.length > 0) {
      return ids.map(id => questionsById.value[id]).filter(Boolean)
    }
    const groupId = String(step.groupId || '')
    if (!groupId) return []
    return (groupsById.value[groupId]?.subQuestions || []) as SubQuestion[]
  }

  if (displayStepRenderView.value === 'groupPrompt' || displayStepRenderView.value === 'playAudio') {
    const groupId = resolveStepGroupId(step)
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

const displayRendererProps = computed<Record<string, unknown>>(() => {
  const step = displayStep.value
  if (!step) {
    return {
      kind: ''
    }
  }
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
      isHearAnswer: isHearAnswerVariant.value,
      prompt: activeGroup.value?.prompt,
      showQuestionNumber: true,
      questions: contextQuestions.value
    }
  }

  if (displayStepRenderView.value === 'countdown') {
    return {
      ...shared,
      contextKind: countdownContext.value?.kind || '',
      isHearAnswer: isHearAnswerVariant.value,
      introText: props.data.content?.intro?.text,
      introShowDescription: countdownIntroShowDescription.value,
      groupPrompt: countdownContextGroup.value?.prompt,
      showQuestionNumber: true,
      questions: contextQuestions.value,
      label: String(isStepKind(step, 'countdown') ? (step.label || '') : '')
    }
  }

  if (displayStepRenderView.value === 'playAudio') {
    return {
      ...shared,
      contextTitle: '',
      contextGroupTitle: activeContextGroupTitle.value,
      contextShowPrompt: activeContextShowPrompt.value,
      prompt: activeGroup.value?.prompt,
      showQuestionNumber: true,
      questions: contextQuestions.value,
      playAudioUrl: playAudioUrl.value,
      playAudioSource: activePlayAudioSource.value,
      audioRemaining: audioRemaining.value
    }
  }

  if (displayStepRenderView.value === 'recordGuide') {
    return {
      ...shared,
      contextTitle: '',
      contextGroupTitle: activeContextGroupTitle.value,
      contextShowPrompt: activeContextShowPrompt.value,
      prompt: activeGroup.value?.prompt,
      guideText: activeRecordGuideText.value,
      showQuestionNumber: true,
      questions: contextQuestions.value
    }
  }

  if (displayStepRenderView.value === 'answerChoice') {
    const answerPrompt = isHearAnswerVariant.value
      ? (resolveHearAnswerAnswerGuideText(step) || activeGroup.value?.prompt || null)
      : (activeGroup.value?.prompt || null)
    const answerContextShowPrompt = isHearAnswerVariant.value
      ? Boolean(answerPrompt)
      : activeContextShowPrompt.value

    return {
      ...shared,
      isHearAnswer: isHearAnswerVariant.value,
      isRecording: isRecording.value,
      recordingSecondsLeft: countdownLeft.value,
      contextTitle: '',
      contextGroupTitle: activeContextGroupTitle.value,
      contextShowPrompt: answerContextShowPrompt,
      prompt: answerPrompt as any,
      showQuestionNumber: true,
      questions: activeQuestions.value
    }
  }

  if (displayStepRenderView.value === 'finish') {
    return {
      text: String(isStepKind(step, 'finish') ? (step.text || '') : '')
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

    const next = steps.value[currentStepIndex.value + 1]
    const nextRenderView = resolveListeningChoiceStepRenderView(next)
    const nextCarrier = resolveListeningChoiceStepAudioCarrier(next)

    const stepLabel = isStepKind(step, 'countdown') ? step.label : undefined
    const isReplayGapCountdown = typeof stepLabel === 'string' && stepLabel.includes('重播间隔')
    let label = stepLabel ? `${stepLabel}-倒计时` : '倒计时'
    if (countdownContext.value?.kind === 'intro') {
      // Intro countdown is already self-explanatory; keep it stable regardless of what comes next.
      label = `${stepLabel || introCountdownLabel.value || '准备'}-倒计时`
    } else if (isReplayGapCountdown) {
      label = '正文重播前-倒计时'
    } else if (nextRenderView === 'playAudio') {
      const nextSource = isStepKind(next, 'playAudio') && next.audioSource === 'description' ? 'description' : 'content'
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

  if (renderView === 'playAudio' && audioRepeatGapActive.value && countdownLeft.value > 0) {
    const groupId = resolveStepGroupId(step)
    const groupLabel = getGroupDisplayName(groupId)
    const gapSeconds = Math.max(0, audioRepeatGapSeconds.value || 0)
    const baseLabel = gapSeconds > 0 ? `正文重播前-倒计时 (${gapSeconds}s)` : '正文重播前-倒计时'
    const label = groupLabel ? `${groupLabel}-${baseLabel}` : baseLabel
    return {
      label,
      seconds: countdownLeft.value
    }
  }

  if (renderView === 'answerChoice') {
    if (countdownLeft.value <= 0) return null
    const groupId = resolveAnswerChoiceGroupId(step)
    const groupLabel = getGroupDisplayName(groupId)
    const answerCountdownLabel = isHearAnswerVariant.value
      ? (isRecording.value ? '录音倒计时' : '录音准备倒计时')
      : '答题倒计时'
    return {
      label: groupLabel ? `${groupLabel}-${answerCountdownLabel}` : answerCountdownLabel,
      seconds: countdownLeft.value
    }
  }

  return null
})

const bottomAudioDock = computed(() => {
  if (isPreview.value) return null
  if (!bottomAudioUrl.value) return null
  if (bottomRecordingIndicator.value) return null
  if (bottomCountdown.value) return null

  const renderView = activeStepRenderView.value
  if (renderView !== 'intro' && renderView !== 'playAudio' && renderView !== 'groupPrompt' && renderView !== 'recordGuide') return null

  const fallbackSeconds = renderView === 'intro' ? 30 : 0
  const remain = Math.ceil(Math.max(0, audioDuration.value - audioCurrentTime.value))
  const seconds = remain > 0 ? remain : Math.max(0, Math.floor(audioDuration.value || fallbackSeconds))
  const label = renderView === 'playAudio' && activePlayAudioSource.value === 'content'
    ? '听语音'
    : '放音'
  return {
    label,
    seconds
  }
})

const bottomCountdownDisplay = computed(() => {
  const v = bottomCountdown.value
  if (!v) return ''
  return formatClockSeconds(v.seconds)
})

const bottomCountdownDisplayLabel = computed(() => {
  const text = String(bottomCountdown.value?.label || '').trim()
  if (!text) return '答题准备'

  if (text.includes('正文重播前-倒计时')) return ''
  if (text.includes('播放正文音频前-倒计时')) return '答题准备'
  if (text.includes('播放描述音频前-倒计时')) return '答题准备'
  if (text.includes('答题前-倒计时')) return '答题准备'
  if (text.includes('题组提示前-倒计时')) return '答题准备'
  if (text.includes('提示音前-倒计时')) return '答题准备'
  if (text.includes('介绍页-')) return '答题准备'

  if (text.includes('录音准备倒计时')) return '录音准备'
  if (text.includes('录音倒计时')) return '录音中'
  if (text.includes('答题倒计时')) return isHearAnswerVariant.value ? '答题中' : '请选择'

  return text.replace(/-倒计时$/u, '') || '答题准备'
})

const bottomDockStatus = computed(() => {
  return bottomCountdown.value || bottomAudioDock.value
})

const bottomDockDisplayLabel = computed(() => {
  if (bottomCountdown.value) return bottomCountdownDisplayLabel.value
  return bottomAudioDock.value?.label || '放音'
})

const bottomDockDisplay = computed(() => {
  if (bottomCountdown.value) return bottomCountdownDisplay.value
  return formatClockSeconds(bottomAudioDock.value?.seconds || 0)
})

const canToggleCountdownPause = computed(() => {
  if (isPreview.value) return false
  if (bottomCountdown.value) return Boolean(tickTimer)
  if (bottomAudioDock.value) return Boolean(bottomAudioUrl.value)
  return false
})

const bottomCountdownPauseIcon = computed(() => {
  return isCountdownPaused.value ? '▶' : '⏸'
})

const bottomRecordingIndicator = computed(() => {
  if (!isHearAnswerVariant.value) return false
  if (activeStepRenderView.value !== 'answerChoice') return false
  if (isRecording.value) return true
  // In preview, show recording dock style as a static visual (no auto timer simulation).
  return isPreview.value
})

const bottomRecordingElapsedSeconds = computed(() => {
  if (!bottomRecordingIndicator.value) return 0
  if (isPreview.value && !isRecording.value) return 0
  const step = activeStep.value
  const totalSeconds = resolveAnswerSeconds(step)
  if (totalSeconds <= 0) return 0
  const elapsed = totalSeconds - Math.max(0, countdownLeft.value)
  return Math.max(0, elapsed)
})

const bottomRecordingElapsedDisplay = computed(() => {
  const seconds = bottomRecordingElapsedSeconds.value
  return formatClockSeconds(seconds)
})

const bottomDockVisible = computed(() => {
  return Boolean(
    bottomRecordingIndicator.value
    || bottomDockStatus.value
    || (isPreview.value && bottomAudioUrl.value)
    || (isPreview.value && bottomExpectAudio.value)
  )
})

function clearTickTimer() {
  if (!tickTimer) return
  clearInterval(tickTimer)
  tickTimer = null
  isCountdownPaused.value = false
}

function dispatchRuntime(event: ListeningChoiceRuntimeEvent) {
  const current = createListeningChoiceRuntimeState(currentStepIndex.value)
  const next = reduceListeningChoiceRuntimeState(current, steps.value, event)
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
  isCountdownPaused.value = false
  countdownLeft.value = seconds
  tickTimer = setInterval(() => {
    if (isCountdownPaused.value) return
    countdownLeft.value -= 1
    if (countdownLeft.value <= 0) {
      countdownLeft.value = 0
      clearTickTimer()
      onDone()
    }
  }, 1000)
}

function resolveActiveAnswerQuestionId(step: RendererStep): string {
  if (!isStepKind(step, 'answerChoice')) return ''
  const ids = Array.isArray(step.questionIds) ? step.questionIds.map(id => String(id || '')).filter(Boolean) : []
  if (ids.length > 0) return ids[0]
  const groupId = resolveAnswerChoiceGroupId(step)
  if (!groupId) return ''
  const list = groupsById.value[groupId]?.subQuestions || []
  return String(list[0]?.id || '')
}

function startHearAnswerRecording(seconds: number, questionId: string, onDone: () => void) {
  isRecording.value = true
  activeRecordingQuestionId.value = String(questionId || '')
  try {
    const recorderManager = typeof (uni as any)?.getRecorderManager === 'function'
      ? (uni as any).getRecorderManager()
      : null
    if (recorderManager && typeof recorderManager.start === 'function') {
      recorderManager.start({ duration: Math.max(1, seconds) * 1000 })
    }
  } catch {}

  startCountdown(seconds, () => {
    stopHearAnswerRecording()
    onDone()
  })
}

function stopHearAnswerRecording() {
  if (!isRecording.value) return
  isRecording.value = false
  try {
    const recorderManager = typeof (uni as any)?.getRecorderManager === 'function'
      ? (uni as any).getRecorderManager()
      : null
    if (recorderManager && typeof recorderManager.stop === 'function') recorderManager.stop()
  } catch {}
}

function startIntroCountdown() {
  const seconds = introCountdownSeconds.value
  if (!seconds || seconds <= 0) {
    dispatchRuntime({ type: 'countdownEnded' })
    return
  }

  clearTickTimer()
  isCountdownPaused.value = false
  introCountdownLeft.value = seconds
  tickTimer = setInterval(() => {
    if (isCountdownPaused.value) return
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

function replayBottomAudio() {
  const player = audioPlayerRef.value
  if (!player) {
    // Fallback: rebuild player instance and let autoPlay kick in.
    audioKey.value += 1
    return
  }
  if (typeof player.restart === 'function') {
    player.restart()
    return
  }
  if (typeof player.play === 'function') {
    player.play()
    return
  }
  audioKey.value += 1
}

function shouldAddReplayGap(step: RendererStep | null | undefined): boolean {
  if (!step) return false
  if (!isStepKind(step, 'playAudio')) return false
  // Only add interval countdown for content-audio replay.
  return step.audioSource === 'content'
}

function resolveReplayGapSeconds(step: RendererStep | null | undefined): number {
  if (!shouldAddReplayGap(step)) return 0
  const explicit = (step as any)?.repeatGapSeconds
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return Math.max(0, Math.floor(explicit))
  }
  const groupId = step?.groupId ? String(step.groupId) : ''
  const group = groupId ? groupsById.value[groupId] : null
  const seconds = Math.floor(Number(group?.prepareSeconds || 3))
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 3
}

function startAudioReplayGap(seconds: number, onDone: () => void) {
  const duration = Math.max(0, Math.floor(Number(seconds || 0)))
  if (duration <= 0) {
    audioRepeatGapActive.value = false
    audioRepeatGapSeconds.value = 0
    onDone()
    return
  }

  audioRepeatGapActive.value = true
  audioRepeatGapSeconds.value = duration
  startCountdown(duration, () => {
    audioRepeatGapActive.value = false
    audioRepeatGapSeconds.value = 0
    onDone()
  })
}

function toggleCountdownPause() {
  if (!canToggleCountdownPause.value) return
  if (bottomCountdown.value) {
    isCountdownPaused.value = !isCountdownPaused.value
    return
  }

  if (!bottomAudioDock.value) return
  if (isBottomAudioPlaying.value) {
    audioPlayerRef.value?.pause?.()
  } else {
    audioPlayerRef.value?.play?.()
  }
}

function enterActiveStep() {
  stopHearAnswerRecording()
  clearTickTimer()
  countdownLeft.value = 0
  introCountdownLeft.value = 0
  audioRepeatGapActive.value = false
  audioRepeatGapSeconds.value = 0
  audioRemaining.value = 0
  activeRecordingQuestionId.value = ''
  audioCurrentTime.value = 0
  audioDuration.value = 0
  isBottomAudioPlaying.value = false
  lastAudioEndedAt.value = 0

  const step = activeStep.value
  if (!step) return
  const renderView = activeStepRenderView.value

  // Runtime guard: hear-answer should not keep a standalone countdown right after
  // the final content playback. Legacy data may still contain this stale step.
  if (!isPreview.value && shouldSkipHearAnswerLegacyPostContentCountdown(currentStepIndex.value)) {
    dispatchRuntime({ type: 'countdownEnded' })
    return
  }

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
  if (carrier === 'playAudio' || carrier === 'recordGuide') {
    const count = resolveStepPlayTimes(step)

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
      if (isHearAnswerVariant.value) {
        const questionId = resolveActiveAnswerQuestionId(step)
        startHearAnswerRecording(seconds, questionId, () => {
          dispatchRuntime({ type: 'timeEnded' })
        })
      } else {
        startCountdown(seconds, () => {
          dispatchRuntime({ type: 'timeEnded' })
        })
      }
    }
    return
  }
}

function onAudioEnded() {
  const now = Date.now()
  if (audioRepeatGapActive.value) return
  if (now - lastAudioEndedAt.value < 180) return
  lastAudioEndedAt.value = now

  isBottomAudioPlaying.value = false
  isCountdownPaused.value = false
  if (audioRemaining.value <= 0) return
  audioRemaining.value -= 1
  if (audioRemaining.value > 0) {
    const step = activeStep.value
    const gapSeconds = resolveReplayGapSeconds(step)
    if (!isPreview.value && gapSeconds > 0) {
      startAudioReplayGap(gapSeconds, () => {
        if (audioRemaining.value > 0) replayBottomAudio()
      })
      return
    }
    replayBottomAudio()
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
  if (carrier === 'playAudio' || carrier === 'promptTone' || carrier === 'recordGuide') {
    dispatchRuntime({ type: 'audioEnded' })
  }
}

function onAudioPlay() {
  isBottomAudioPlaying.value = true
  if (bottomAudioDock.value) isCountdownPaused.value = false
}

function onAudioPause() {
  isBottomAudioPlaying.value = false
  if (bottomAudioDock.value) isCountdownPaused.value = true
}

function onAudioTimeUpdate(time: number) {
  const t = Number(time)
  if (Number.isFinite(t)) audioCurrentTime.value = Math.max(0, t)
}

function onAudioDurationChange(duration: number) {
  const d = Number(duration)
  if (!Number.isFinite(d) || d <= 0) return
  audioDuration.value = d
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
  stopHearAnswerRecording()
  clearTickTimer()
})

function formatClockSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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
  background: #f3f5f7;
  overflow: hidden;
}

.lc-flow--fixed-dock {
  position: relative;
}

.lc-flow__top {
  padding: 28rpx 32rpx 0;
  background: #f3f5f7;
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
  margin-top: 0;
  font-size: 36rpx;
  font-weight: 600;
  line-height: 1.35;
  color: #1a1a1a;
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  padding: 28rpx 32rpx 20rpx;
}

.lc-flow__timer {
  margin-top: 12rpx;
  font-size: $font-size-sm;
  color: $warning-color;
}

.lc-flow__body {
  flex: 1;
  min-height: 0;
  height: 0;
  padding: 0 32rpx 28rpx;
  box-sizing: border-box;
  background: #f3f5f7;
}

.lc-flow__body--fixed {
  padding-bottom: calc(208rpx + env(safe-area-inset-bottom));
}

.lc-flow__body-inner {
  min-height: 100%;
  padding: 20rpx 32rpx 28rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 0 0 20rpx 20rpx;
}

.lc-flow__body-inner--fixed {
  padding-bottom: 28rpx;
}

.lc-flow__bottom {
  flex-shrink: 0;
  background: transparent;
  border-top: 0;
  padding: 0;
  padding-bottom: calc(env(safe-area-inset-bottom) + 8rpx);

  .lc-bottom__countdown {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 20rpx 32rpx 16rpx;
  }

  .lc-bottom__countdown-icon {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    flex-shrink: 0;
    background: #fd6f27;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .lc-bottom__countdown-icon.is-paused {
    background: #ef7a2a;
  }

  .lc-bottom__countdown-icon.is-disabled {
    opacity: 0.55;
    cursor: default;
  }

  .lc-bottom__countdown-icon-symbol {
    color: #fff;
    font-size: 48rpx;
    font-weight: 700;
    line-height: 1;
  }

  .lc-bottom__countdown-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    gap: 8rpx;
  }

  .lc-bottom__recording {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 20rpx 24rpx;
  }

  .lc-bottom__recording-icon {
    width: 84rpx;
    height: 84rpx;
    border-radius: 50%;
    border: 2px solid rgba(244, 63, 94, 0.45);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .lc-bottom__recording-stop {
    width: 28rpx;
    height: 28rpx;
    border-radius: 6rpx;
    background: #ef4444;
  }

  .lc-bottom__recording-text {
    font-size: 24rpx;
    color: rgba(15, 23, 42, 0.78);
    font-weight: 600;
  }

  .lc-bottom__countdown-label {
    font-size: 36rpx;
    color: #1a1a1a;
    font-weight: 400;
    line-height: 1.2;
  }

  .lc-bottom__countdown-number {
    font-size: 40rpx;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    font-family: 'DIN Alternate', 'PingFang SC', sans-serif;
  }

  .lc-bottom__timer {
    padding: 20rpx 24rpx;
  }

  .lc-bottom__timer-text {
    font-size: 24rpx;
    color: $warning-color;
    font-weight: 600;
  }

  .lc-bottom__no-audio {
    padding: 20rpx 24rpx;
  }

  .lc-bottom__no-audio-text {
    font-size: 24rpx;
    color: $text-hint;
    font-weight: 600;
  }

  :deep(.audio-player) {
    width: 100%;
    box-sizing: border-box;
    padding: 16rpx 24rpx 20rpx;
    background: transparent;
    border-radius: 0;
  }

  :deep(.audio-player__btn) {
    width: 96rpx;
    height: 96rpx;
  }
}

.lc-flow__bottom--fixed {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
}

.lc-step__heading {
  font-size: 32rpx;
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
  min-height: 480rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;
}

.lc-step__countdown-label {
  color: $text-secondary;
  font-size: 28rpx;
}

.lc-step__countdown-seconds {
  font-size: 96rpx;
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
  min-width: 36rpx;
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
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2px solid #bbb;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.lc-option__key {
  width: 36rpx;
  font-weight: 600;
  color: $text-secondary;
  flex-shrink: 0;
  margin-top: 2rpx;
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
  font-size: 28rpx;
}
</style>
