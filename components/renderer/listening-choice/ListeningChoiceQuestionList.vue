<template>
  <view class="lc-questions">
    <view v-for="(sq, idx) in questions" :key="sq.id" class="lc-question">
      <view class="lc-question__stem">
        <text class="lc-question__number">{{ displayNumber(sq, idx) }}.</text>
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
          @click="handleOptionClick(sq.id, opt.key)"
        >
          <view class="lc-option__radio"></view>
          <view class="lc-option__key">{{ opt.key }}</view>
          <view class="lc-option__content">
            <RichTextRenderer :content="opt.content" placeholder="选项内容" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { RenderMode, SubQuestion } from '/types'
import AudioPlayer from '../AudioPlayer.vue'
import RichTextRenderer from '../RichTextRenderer.vue'

const props = withDefaults(defineProps<{
  questions: SubQuestion[]
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

function displayNumber(sq: SubQuestion, fallbackIndex: number) {
  return sq.order || fallbackIndex + 1
}

function getOptionClass(subQuestionId: string, optionKey: string, correctAnswer: string[]) {
  const userAnswer = props.answers[subQuestionId]
  const isSelected = Array.isArray(userAnswer) ? userAnswer.includes(optionKey) : userAnswer === optionKey
  const isCorrect = correctAnswer.includes(optionKey)

  return {
    'is-selected': isSelected,
    'is-correct': props.showAnswer && isCorrect,
    'is-wrong': props.showAnswer && isSelected && !isCorrect
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
  gap: $spacing-lg;
}

.lc-question__stem {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-start;
  margin-bottom: $spacing-sm;
}

.lc-question__number {
  min-width: 18px;
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
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #bbb;
  flex-shrink: 0;
  margin-top: 2px;
}

.lc-option__key {
  width: 18px;
  font-weight: 600;
  color: $text-secondary;
  flex-shrink: 0;
  margin-top: 1px;
}

.lc-option__content {
  flex: 1;
  min-width: 0;
}
</style>
