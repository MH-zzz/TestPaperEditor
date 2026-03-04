<template>
  <view class="lc-questions">
    <view v-for="(sq, idx) in questions" :key="sq.id" class="lc-question">
      <view class="lc-question__stem">
        <text v-if="showQuestionNumber" class="lc-question__number">{{ displayNumber(sq, idx) }}.</text>
        <RichTextRenderer :content="sq.stem" placeholder="请输入题干" />
      </view>

      <AudioPlayer
        v-if="sq.audio?.url && sq.audio?.position === 'above'"
        class="lc-question__audio"
        :src="sq.audio.url"
        :auto-play="false"
      />

      <view class="lc-question__options">
        <view
          v-for="opt in sq.options"
          :key="opt.key"
          class="lc-option"
          :class="getOptionClass(sq.id, opt.key, sq.answer)"
          @tap.stop="handleOptionClick(sq.id, opt.key)"
          @click.stop="handleOptionClick(sq.id, opt.key)"
          @touchstart.stop
          @touchend.stop
        >
          <view class="lc-option__radio"></view>
          <view class="lc-option__text">
            <RichTextRenderer
              class="lc-option__content"
              :content="buildOptionContent(opt.key, opt.content)"
              :force-color="resolveOptionTextColor(sq.id, opt.key)"
              placeholder="选项内容"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { RenderMode, RichTextContent, SubQuestion } from '/types'
import AudioPlayer from '../AudioPlayer.vue'
import RichTextRenderer from '../RichTextRenderer.vue'

const props = withDefaults(defineProps<{
  questions: SubQuestion[]
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
  showQuestionNumber?: boolean
  mode?: RenderMode
}>(), {
  questions: () => [],
  answers: () => ({}),
  showAnswer: false,
  showQuestionNumber: true,
  mode: 'preview'
})

const emit = defineEmits<{
  (e: 'select', subQuestionId: string, optionKey: string): void
}>()

function displayNumber(sq: SubQuestion, fallbackIndex: number) {
  return sq.order || fallbackIndex + 1
}

function getOptionClass(subQuestionId: string, optionKey: string, correctAnswer: string[]) {
  const isSelected = isOptionSelected(subQuestionId, optionKey)
  const isCorrect = correctAnswer.includes(optionKey)

  return {
    'is-selected': isSelected,
    'is-correct': props.showAnswer && isCorrect,
    'is-wrong': props.showAnswer && isSelected && !isCorrect
  }
}

function isOptionSelected(subQuestionId: string, optionKey: string) {
  const userAnswer = props.answers[subQuestionId]
  return Array.isArray(userAnswer) ? userAnswer.includes(optionKey) : userAnswer === optionKey
}

function resolveOptionTextColor(subQuestionId: string, optionKey: string) {
  return isOptionSelected(subQuestionId, optionKey) ? '#FD6F27' : '#333333'
}

function buildOptionContent(optionKey: string, content: RichTextContent | null | undefined): RichTextContent {
  const safeNodes = Array.isArray(content?.content) ? content.content : []
  return {
    type: 'richtext',
    content: [
      { type: 'text', text: `${optionKey}. ` },
      ...safeNodes
    ]
  }
}

function handleOptionClick(subQuestionId: string, optionKey: string) {
  if (props.mode === 'review') return
  emit('select', subQuestionId, optionKey)
}
</script>

<style lang="scss" scoped>
.lc-questions {
  display: flex;
  flex-direction: column;
  gap: 36rpx;
}

.lc-question__stem {
  display: block;
  margin-bottom: 20rpx;
  background: transparent;

  :deep(.rich-text-renderer) {
    display: inline;
    font-size: 36rpx;
    white-space: normal;
    line-height: 1.35;
    color: #333;
  }

  :deep(.rich-text-renderer text) {
    white-space: normal;
    word-break: break-word;
  }
}

.lc-question__number {
  display: inline;
  margin-right: 4rpx;
  min-width: 0;
  font-weight: 400;
  font-size: 36rpx;
  color: #333;
  line-height: 1.35;
}

.lc-question__options {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.lc-option {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.lc-option.is-selected {
  background: transparent;

  .lc-option__radio {
    border-color: #fd6f27;
    background: #fff;
    position: relative;
  }

  .lc-option__radio::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 18rpx;
    height: 18rpx;
    border-radius: 50%;
    background: #fd6f27;
    transform: translate(-50%, -50%);
  }

  .lc-option__text {
    color: #fd6f27;
  }
}

.lc-option.is-correct {
  background: transparent;
}

.lc-option.is-wrong {
  background: transparent;
}

.lc-option__radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 1px solid #bdbdbd;
  flex-shrink: 0;
  margin-top: 4rpx;
  box-sizing: border-box;
  background: #fff;
}

.lc-option__text {
  display: flex;
  flex: 1;
  align-items: flex-start;
  min-width: 0;
  font-size: 36rpx;
  line-height: 1.35;
  color: #333;
}

.lc-option__content {
  display: block;
  flex: 1;
  min-width: 0;

  :deep(.rich-text-renderer) {
    display: block;
    font-size: 36rpx;
    white-space: normal;
    line-height: 1.35;
    color: #333;
  }

  :deep(.rich-text-renderer text) {
    font-size: 36rpx;
    line-height: 1.35;
    color: inherit;
    white-space: normal;
    word-break: break-word;
  }
}
</style>
