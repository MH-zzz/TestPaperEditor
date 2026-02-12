<template>
  <view class="lc-step">
    <RichTextRenderer
      v-if="prompt"
      :content="prompt"
      placeholder="请输入题组说明"
    />

    <ListeningChoiceQuestionList
      v-if="questions.length > 0"
      :questions="questions"
      :answers="answers"
      :show-answer="showAnswer"
      :mode="mode"
      @select="handleOptionClick"
    />

    <view class="lc-step__hint">
      <text>点击下一步开始</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { RenderMode, RichTextContent, SubQuestion } from '/types'
import RichTextRenderer from '../RichTextRenderer.vue'
import ListeningChoiceQuestionList from './ListeningChoiceQuestionList.vue'

const props = withDefaults(defineProps<{
  prompt?: RichTextContent
  questions?: SubQuestion[]
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  mode?: RenderMode
}>(), {
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
