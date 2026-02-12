<template>
  <view class="lc-step">
    <template v-if="contextKind === 'intro'">
      <RichTextRenderer
        v-if="introShowDescription && introText"
        :content="introText"
        placeholder="请输入说明"
      />
    </template>

    <template v-else-if="contextKind === 'group'">
      <RichTextRenderer
        v-if="groupPrompt"
        :content="groupPrompt"
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
    </template>

    <view v-else class="lc-step__hint">
      <text>{{ label || '准备' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { RenderMode, RichTextContent, SubQuestion } from '/types'
import RichTextRenderer from '../RichTextRenderer.vue'
import ListeningChoiceQuestionList from './ListeningChoiceQuestionList.vue'

const props = withDefaults(defineProps<{
  contextKind?: 'intro' | 'group' | ''
  introText?: RichTextContent
  introShowDescription?: boolean
  groupPrompt?: RichTextContent
  questions?: SubQuestion[]
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  mode?: RenderMode
  label?: string
}>(), {
  contextKind: '',
  introShowDescription: true,
  questions: () => [],
  answers: () => ({}),
  showAnswer: false,
  mode: 'preview',
  label: ''
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
