<template>
  <view class="lc-step">
    <ListeningChoiceStepContext
      :show="Boolean(contextTitle || contextGroupTitle || (contextShowPrompt && prompt))"
      :title="contextTitle"
      :group-title="contextGroupTitle"
      :show-prompt="contextShowPrompt"
      :prompt="prompt"
    />

    <ListeningChoiceQuestionList
      v-if="questions.length > 0"
      :questions="questions"
      :answers="answers"
      :show-answer="showAnswer"
      :mode="mode"
      @select="handleOptionClick"
    />

    <view v-if="!playAudioUrl" class="lc-step__hint">
      <text>{{ playAudioSource === 'description' ? '未配置题组描述音频 URL' : '未配置题组正文音频 URL' }}</text>
    </view>

    <view v-if="audioRemaining > 0" class="lc-step__hint">
      <text>剩余播放 {{ audioRemaining }} 次</text>
    </view>

    <view v-if="mode === 'preview'" class="lc-step__hint">
      <text>预览不会自动播放音频，也不会启动倒计时或自动进入下一步；请手动播放或点击下一步继续。</text>
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
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  mode?: RenderMode
  playAudioUrl?: string
  playAudioSource?: 'description' | 'content'
  audioRemaining?: number
}>(), {
  contextTitle: '',
  contextGroupTitle: '',
  contextShowPrompt: true,
  questions: () => [],
  answers: () => ({}),
  showAnswer: false,
  mode: 'preview',
  playAudioUrl: '',
  playAudioSource: 'content',
  audioRemaining: 0
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
