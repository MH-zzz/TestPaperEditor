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
      :show-question-number="showQuestionNumber"
      :mode="mode"
      @select="handleOptionClick"
    />

    <view v-if="isHearAnswer" class="lc-hear-answer__recording" :class="{ 'is-recording': isRecording }">
      <text v-if="mode === 'preview'">录音预览（考试模式自动开始录音）</text>
      <text v-else-if="isRecording">正在录音 · 剩余 {{ Math.max(0, Number(recordingSecondsLeft || 0)) }} 秒</text>
      <text v-else>等待录音开始</text>
    </view>
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
  isHearAnswer?: boolean
  isRecording?: boolean
  recordingSecondsLeft?: number
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  showQuestionNumber?: boolean
  mode?: RenderMode
}>(), {
  contextTitle: '',
  contextGroupTitle: '',
  contextShowPrompt: true,
  questions: () => [],
  isHearAnswer: false,
  isRecording: false,
  recordingSecondsLeft: 0,
  answers: () => ({}),
  showAnswer: false,
  showQuestionNumber: true,
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

.lc-hear-answer__recording {
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  border: 1px solid #eee;
  border-radius: $border-radius-sm;
  color: $text-secondary;
  font-size: $font-size-sm;
  background: #fafafa;
}

.lc-hear-answer__recording.is-recording {
  border-color: rgba(239, 68, 68, 0.45);
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.08);
}
</style>
