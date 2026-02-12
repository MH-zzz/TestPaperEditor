<template>
  <view class="question-renderer">
    <component
      v-if="activeRenderer"
      :is="activeRenderer"
      v-bind="activeRendererProps"
      @select="handleSelect"
      @step-change="handleStepChange"
      @complete="handleComplete"
    />

    <!-- 其他题型占位 -->
    <view v-else class="question-renderer__unsupported">
      <text>暂不支持的题型：{{ data.type }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { Question, RenderMode } from '/types'
import ListeningChoiceRenderer from './ListeningChoiceRenderer.vue'
import ListeningMatchRenderer from './ListeningMatchRenderer.vue'
import ListeningFillRenderer from './ListeningFillRenderer.vue'
import SpeakingStepsRenderer from './SpeakingStepsRenderer.vue'

const props = withDefaults(defineProps<{
  data: Question
  mode?: RenderMode
  answers?: Record<string, any>
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
  (e: 'select', subQuestionId: string, value: any): void
  (e: 'stepChange', step: number): void
  (e: 'complete', answers: any): void
}>()

type RendererRoute = {
  component: Component
  resolveProps: (p: {
    data: Question
    mode: RenderMode
    answers: Record<string, any>
    showAnswer: boolean
    stepIndex: number
    showStepNav: boolean
  }) => Record<string, any>
}

const QUESTION_RENDERER_ROUTES: Record<string, RendererRoute> = {
  listening_choice: {
    component: ListeningChoiceRenderer,
    resolveProps: (p) => ({
      data: p.data,
      mode: p.mode,
      answers: p.answers,
      showAnswer: p.showAnswer,
      stepIndex: p.stepIndex,
      showStepNav: p.showStepNav
    })
  },
  listening_match: {
    component: ListeningMatchRenderer,
    resolveProps: (p) => ({
      data: p.data,
      mode: p.mode,
      answers: p.answers,
      showAnswer: p.showAnswer
    })
  },
  listening_fill: {
    component: ListeningFillRenderer,
    resolveProps: (p) => ({
      data: p.data,
      mode: p.mode,
      answers: p.answers,
      showAnswer: p.showAnswer
    })
  },
  speaking_steps: {
    component: SpeakingStepsRenderer,
    resolveProps: (p) => ({
      data: p.data,
      mode: p.mode,
      stepIndex: p.stepIndex
    })
  }
}

const activeRoute = computed(() => {
  const type = String(props.data?.type || '').trim()
  if (!type) return null
  return QUESTION_RENDERER_ROUTES[type] || null
})

const activeRenderer = computed(() => activeRoute.value?.component || null)

const activeRendererProps = computed(() => {
  const route = activeRoute.value
  if (!route) return {}

  return route.resolveProps({
    data: props.data,
    mode: props.mode,
    answers: props.answers,
    showAnswer: props.showAnswer,
    stepIndex: props.stepIndex,
    showStepNav: props.showStepNav
  })
})

function handleSelect(subQuestionId: string, optionKey: string) {
  emit('select', subQuestionId, optionKey)
}

function handleStepChange(step: number) {
  emit('stepChange', step)
}

function handleComplete(answers: any) {
  emit('complete', answers)
}
</script>

<style lang="scss" scoped>
.question-renderer {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  // 让子组件填满容器
  > :first-child {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  &__unsupported {
    padding: $spacing-lg;
    text-align: center;
    color: $text-hint;
    background-color: #f5f5f5;
    border-radius: $border-radius-md;
  }
}
</style>
