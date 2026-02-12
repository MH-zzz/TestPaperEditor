<template>
  <view class="lc-step">
    <ListeningChoiceStepContext
      :show="Boolean(contextTitle || contextGroupTitle || (contextShowPrompt && prompt))"
      :title="contextTitle"
      :group-title="contextGroupTitle"
      :show-prompt="contextShowPrompt"
      :prompt="prompt"
    />

    <view v-if="questions.length === 0" class="lc-step__hint">
      <text>未找到要展示的小题</text>
    </view>

    <ListeningChoiceQuestionList
      v-else
      :questions="questions"
      :answers="answers"
      :show-answer="showAnswer"
      :mode="mode"
      @select="handleOptionClick"
    />
  </view>
</template>

<script setup lang="ts">
import type { RenderMode, RichTextContent, SubQuestion } from '/types'
import ListeningChoiceQuestionList from './ListeningChoiceQuestionList.vue'
import ListeningChoiceStepContext from './ListeningChoiceStepContext.vue'

const props = withDefaults(defineProps<{
  contextTitle?: string
  contextGroupTitle?: string
  contextShowPrompt?: boolean
  prompt?: RichTextContent
  questions?: SubQuestion[]
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  mode?: RenderMode
}>(), {
  contextTitle: '',
  contextGroupTitle: '',
  contextShowPrompt: true,
  questions: () => [],
  answers: () => ({}),
  showAnswer: false,
  mode: 'preview'
})

const emit = defineEmits<{
  (e: 'select', subQuestionId: string, optionKey: string): void
}>()

function handleOptionClick(subQuestionId: string, optionKey: string) {
  emit('select', subQuestionId, optionKey)
}
</script>

<style lang="scss" scoped>
.lc-step__hint {
  margin-top: $spacing-md;
  color: $text-hint;
  font-size: $font-size-sm;
}
</style>
