<template>
  <view class="lc-record-guide">
    <ListeningChoiceStepContext
      :show="Boolean(contextTitle || contextGroupTitle || (contextShowPrompt && prompt))"
      :title="contextTitle"
      :group-title="contextGroupTitle"
      :show-prompt="contextShowPrompt"
      :prompt="prompt"
    />

    <RichTextRenderer
      v-if="guideText"
      :content="guideText"
      image-layout="full-row"
      placeholder="请配置录音说明文案"
    />

    <view v-else class="lc-step__hint">
      <text>未配置录音说明文案</text>
    </view>

    <view v-if="questions.length > 0" class="lc-record-guide__questions">
      <view v-for="(sq, idx) in questions" :key="sq.id" class="lc-record-guide__question">
        <text v-if="showQuestionNumber" class="lc-record-guide__question-number">{{ displayNumber(sq, idx) }}.</text>
        <RichTextRenderer
          class="lc-record-guide__question-stem"
          :content="sq.stem"
          image-layout="full-row"
          placeholder="请输入题干"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { RichTextContent, SubQuestion } from '/types'
import ListeningChoiceStepContext from './ListeningChoiceStepContext.vue'
import RichTextRenderer from '../RichTextRenderer.vue'

withDefaults(defineProps<{
  contextTitle?: string
  contextGroupTitle?: string
  contextShowPrompt?: boolean
  prompt?: RichTextContent
  guideText?: RichTextContent
  questions?: SubQuestion[]
  showQuestionNumber?: boolean
}>(), {
  contextTitle: '',
  contextGroupTitle: '',
  contextShowPrompt: false,
  questions: () => [],
  showQuestionNumber: true
})

function displayNumber(sq: SubQuestion, fallbackIndex: number) {
  return sq.order || fallbackIndex + 1
}
</script>

<style lang="scss" scoped>
.lc-record-guide {
  :deep(.rich-text-renderer) {
    display: block;
    font-size: 36rpx;
    white-space: normal;
    line-height: 1.5;
    color: #333;
  }

  :deep(.rich-text-renderer text) {
    font-size: 36rpx;
    line-height: 1.5;
    color: #333;
    white-space: normal;
    word-break: break-word;
  }
}

.lc-step__hint {
  margin-top: $spacing-md;
  color: $text-hint;
  font-size: $font-size-sm;
}

.lc-record-guide__questions {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.lc-record-guide__question {
  display: flex;
  align-items: flex-start;
  gap: 6rpx;
}

.lc-record-guide__question-number {
  font-size: 36rpx;
  line-height: 1.4;
  color: #333;
}

.lc-record-guide__question-stem {
  flex: 1;

  :deep(.rich-text-renderer) {
    display: block;
    font-size: 36rpx;
    line-height: 1.4;
    color: #333;
    white-space: normal;
  }

  :deep(.rich-text-renderer text) {
    font-size: 36rpx;
    line-height: 1.4;
    color: #333;
    white-space: normal;
    word-break: break-word;
  }
}
</style>
