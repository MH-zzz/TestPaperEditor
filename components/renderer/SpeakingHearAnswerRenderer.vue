<template>
  <ListeningChoiceRenderer
    :data="bridgedData"
    :mode="mode"
    :answers="answers"
    :show-answer="showAnswer"
    :step-index="stepIndex"
    :show-step-nav="showStepNav"
    :fixed-bottom-dock="fixedBottomDock"
    @select="(subQuestionId, optionKey) => emit('select', subQuestionId, optionKey)"
    @step-change="(step) => emit('stepChange', step)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ListeningChoiceQuestion, RenderMode, SpeakingHearAnswerQuestion } from '/types'
import ListeningChoiceRenderer from './ListeningChoiceRenderer.vue'

const props = withDefaults(defineProps<{
  data: SpeakingHearAnswerQuestion
  mode?: RenderMode
  answers?: Record<string, any>
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
  (e: 'select', subQuestionId: string, value: any): void
  (e: 'stepChange', step: number): void
}>()

const bridgedData = computed<ListeningChoiceQuestion>(() => {
  return {
    ...(props.data as any),
    type: 'listening_choice',
    metadata: {
      ...((props.data as any)?.metadata || {}),
      questionVariant: 'hear_answer'
    }
  } as ListeningChoiceQuestion
})
</script>
