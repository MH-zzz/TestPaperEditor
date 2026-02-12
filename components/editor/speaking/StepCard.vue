<template>
  <view
    class="step-card"
    :class="{
      'step-card--expanded': expanded,
      'step-card--loop': step.type === 'loop-sub-questions'
    }"
  >
    <!-- 折叠状态的卡片头 -->
    <view class="step-card__header" @click="$emit('toggle')">
      <view class="step-card__left">
        <text class="step-card__number">{{ index + 1 }}</text>
        <text class="step-card__icon">{{ stepIcon }}</text>
        <text class="step-card__type">{{ stepTypeName }}</text>
        <text v-if="!expanded" class="step-card__summary">{{ stepSummary }}</text>
      </view>
      <view class="step-card__right">
        <view class="step-card__actions" @click.stop>
          <button
            class="action-btn"
            :class="{ 'action-btn--disabled': isFirst }"
            :disabled="isFirst"
            @click="!isFirst && $emit('move-up')"
            title="上移"
          >↑</button>
          <button
            class="action-btn"
            :class="{ 'action-btn--disabled': isLast }"
            :disabled="isLast"
            @click="!isLast && $emit('move-down')"
            title="下移"
          >↓</button>
          <button
            class="action-btn action-btn--danger"
            :class="{ 'action-btn--disabled': totalSteps <= 1 }"
            :disabled="totalSteps <= 1"
            @click="totalSteps > 1 && $emit('delete')"
            title="删除"
          >×</button>
        </view>
        <text class="step-card__toggle">{{ expanded ? '▲' : '▼' }}</text>
      </view>
    </view>

    <!-- 展开状态的编辑区 -->
    <view v-if="expanded" class="step-card__body">
      <!-- 题型介绍步骤 -->
      <template v-if="step.type === 'introduction'">
        <view class="form-group">
          <text class="form-label">标题</text>
          <input
            class="form-input"
            :value="step.title"
            @input="(e) => updateField('title', e.detail.value)"
            placeholder="题型名称"
          />
        </view>
        <view class="form-group">
          <text class="form-label">说明文字</text>
          <textarea
            class="form-textarea"
            :value="step.description"
            @input="(e) => updateField('description', e.detail.value)"
            placeholder="题型说明"
          />
        </view>
      </template>

      <!-- 显示内容步骤 -->
      <template v-else-if="step.type === 'display-content'">
        <view class="form-group">
          <text class="form-label">区域标签</text>
          <input
            class="form-input"
            :value="step.label"
            @input="(e) => updateField('label', e.detail.value)"
            placeholder="如：短文内容"
          />
        </view>
        <view class="form-group">
          <text class="form-label">内容</text>
          <RichTextEditor
            :model-value="step.content"
            @update:model-value="(val) => updateField('content', val)"
            placeholder="请输入显示内容"
          />
        </view>
      </template>

      <!-- 播放音频步骤 -->
      <template v-else-if="step.type === 'play-audio'">
        <view class="form-group">
          <text class="form-label">提示文字</text>
          <input
            class="form-input"
            :value="step.label"
            @input="(e) => updateField('label', e.detail.value)"
            placeholder="如：请听示范朗读"
          />
        </view>
        <view class="form-group">
          <text class="form-label">音频文件</text>
          <view class="audio-selector">
            <input
              class="form-input"
              :value="step.audio?.url || ''"
              @input="(e) => updateAudioUrl(e.detail.value)"
              placeholder="音频 URL 或选择文件"
            />
            <button class="btn btn-outline btn-sm" @click="selectAudio">选择</button>
          </view>
          <view v-if="step.audio?.url" class="audio-preview">
            <text class="audio-name">{{ step.audio.name || '音频文件' }}</text>
            <button class="btn-play" @click="playAudio">▶ 试听</button>
          </view>
        </view>
        <view class="form-row">
          <view class="form-group form-group--half">
            <text class="form-label">播放次数</text>
            <input
              class="form-input"
              type="number"
              :value="step.playCount"
              @input="(e) => updateField('playCount', parseInt(e.detail.value) || 1)"
            />
          </view>
          <view class="form-group form-group--half">
            <label class="checkbox-label">
              <checkbox :checked="step.showProgress" @change="(e) => updateField('showProgress', e.detail.value)" />
              <text>显示进度条</text>
            </label>
            <label class="checkbox-label">
              <checkbox :checked="step.showPlayCount" @change="(e) => updateField('showPlayCount', e.detail.value)" />
              <text>显示播放遍数</text>
            </label>
          </view>
        </view>
      </template>

      <!-- 倒计时步骤 -->
      <template v-else-if="step.type === 'countdown'">
        <view class="form-group">
          <text class="form-label">提示文字</text>
          <input
            class="form-input"
            :value="step.label"
            @input="(e) => updateField('label', e.detail.value)"
            placeholder="如：请准备朗读"
          />
        </view>
        <view class="form-row">
          <view class="form-group form-group--half">
            <text class="form-label">倒计时（秒）</text>
            <input
              class="form-input"
              type="number"
              :value="step.duration"
              @input="(e) => updateField('duration', parseInt(e.detail.value) || 30)"
            />
          </view>
          <view class="form-group form-group--half">
            <label class="checkbox-label">
              <checkbox :checked="step.showProgress" @change="(e) => updateField('showProgress', e.detail.value)" />
              <text>显示进度条</text>
            </label>
            <label class="checkbox-label">
              <checkbox :checked="step.showSkipButton" @change="(e) => updateField('showSkipButton', e.detail.value)" />
              <text>显示跳过按钮</text>
            </label>
          </view>
        </view>
        <view v-if="step.showSkipButton" class="form-group">
          <text class="form-label">跳过按钮文字</text>
          <input
            class="form-input"
            :value="step.skipButtonText"
            @input="(e) => updateField('skipButtonText', e.detail.value)"
            placeholder="如：开始录音"
          />
        </view>
      </template>

      <!-- 录音步骤 -->
      <template v-else-if="step.type === 'record'">
        <view class="form-row">
          <view class="form-group form-group--half">
            <text class="form-label">录音时长（秒）</text>
            <input
              class="form-input"
              type="number"
              :value="step.duration"
              @input="(e) => updateField('duration', parseInt(e.detail.value) || 60)"
            />
          </view>
          <view class="form-group form-group--half">
            <text class="form-label">评测模式</text>
            <picker
              :value="assessmentModeIndex"
              :range="assessmentModes"
              range-key="label"
              @change="(e) => updateField('assessmentMode', assessmentModes[e.detail.value].value)"
            >
              <view class="form-picker">
                {{ currentAssessmentModeLabel }}
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="form-group">
          <label class="checkbox-label">
            <checkbox :checked="step.playBeepBefore" @change="(e) => updateField('playBeepBefore', e.detail.value)" />
            <text>录音前播放嘀声</text>
          </label>
          <label class="checkbox-label">
            <checkbox :checked="step.showTimer" @change="(e) => updateField('showTimer', e.detail.value)" />
            <text>显示录音计时</text>
          </label>
          <label class="checkbox-label">
            <checkbox :checked="step.showStopButton" @change="(e) => updateField('showStopButton', e.detail.value)" />
            <text>显示停止按钮</text>
          </label>
        </view>
        <view class="form-group">
          <text class="form-label">评测参考文本（可选）</text>
          <textarea
            class="form-textarea"
            :value="step.referenceText"
            @input="(e) => updateField('referenceText', e.detail.value)"
            placeholder="用于评测的参考文本"
          />
        </view>
      </template>

      <!-- 小题循环步骤 -->
      <template v-else-if="step.type === 'loop-sub-questions'">
        <view class="loop-info">
          <text class="loop-info__icon">🔄</text>
          <text class="loop-info__text">以下步骤对每个小题重复执行</text>
        </view>
        <view class="loop-steps">
          <view
            v-for="(subStep, subIndex) in step.stepsPerQuestion"
            :key="subStep.id"
            class="loop-step-item"
          >
            <text class="loop-step-item__number">{{ index + 1 }}.{{ subIndex + 1 }}</text>
            <text class="loop-step-item__icon">{{ getStepIcon(subStep.type) }}</text>
            <text class="loop-step-item__name">{{ getStepTypeName(subStep.type) }}</text>
          </view>
        </view>
      </template>

      <!-- 填空步骤 -->
      <template v-else-if="step.type === 'fill-blank'">
        <view class="form-group">
          <text class="form-label">答题时间（秒）</text>
          <input
            class="form-input"
            type="number"
            :value="step.duration"
            @input="(e) => updateField('duration', parseInt(e.detail.value) || 60)"
          />
        </view>
        <view class="form-group">
          <text class="form-label">填空项</text>
          <view class="blanks-list">
            <view v-for="(blank, blankIndex) in step.blanks" :key="blank.id" class="blank-item">
              <text class="blank-item__number">{{ blankIndex + 1 }}</text>
              <input
                class="form-input"
                :value="blank.answer"
                @input="(e) => updateBlankAnswer(blankIndex, e.detail.value)"
                placeholder="正确答案"
              />
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  SpeakingStepsStep,
  IntroductionStep,
  DisplayContentStep,
  PlayAudioStep,
  CountdownStep,
  RecordStep,
  FillBlankStep,
  LoopSubQuestionsStep,
  AssessmentMode
} from '/types'
import RichTextEditor from '../RichTextEditor.vue'

const props = defineProps<{
  step: SpeakingStepsStep
  index: number
  expanded: boolean
  isFirst: boolean
  isLast: boolean
  totalSteps: number
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'update', step: SpeakingStepsStep): void
  (e: 'delete'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
}>()

// 步骤图标映射
const stepIcons: Record<string, string> = {
  'introduction': '📢',
  'display-content': '📖',
  'play-audio': '🔊',
  'countdown': '⏱️',
  'record': '🎤',
  'fill-blank': '📝',
  'loop-sub-questions': '🔄'
}

// 步骤类型名称映射
const stepTypeNames: Record<string, string> = {
  'introduction': '题型介绍',
  'display-content': '显示内容',
  'play-audio': '播放音频',
  'countdown': '倒计时',
  'record': '录音',
  'fill-blank': '填空',
  'loop-sub-questions': '小题循环'
}

// 评测模式选项
const assessmentModes = [
  { value: 'E', label: 'E - 文章朗读' },
  { value: 'B', label: 'B - 情景问答' },
  { value: 'C', label: 'C - 转述评测' },
  { value: 'G', label: 'G - 单词音标' },
  { value: 'H', label: 'H - 口头选择' }
]

const stepIcon = computed(() => stepIcons[props.step.type] || '❓')
const stepTypeName = computed(() => stepTypeNames[props.step.type] || props.step.type)

// 步骤摘要
const stepSummary = computed(() => {
  const step = props.step
  switch (step.type) {
    case 'introduction':
      return `"${step.title}"`
    case 'display-content':
      return step.label || '内容'
    case 'play-audio':
      return step.label || (step.audio?.name || '音频')
    case 'countdown':
      return `${step.duration}秒 · "${step.label}"`
    case 'record':
      return `${step.duration}秒 · ${step.assessmentMode}模式`
    case 'fill-blank':
      return `${step.duration}秒 · ${step.blanks.length}个空`
    case 'loop-sub-questions':
      return `${step.stepsPerQuestion.length}个子步骤`
    default:
      return ''
  }
})

// 录音步骤的评测模式索引
const assessmentModeIndex = computed(() => {
  if (props.step.type !== 'record') return 0
  return assessmentModes.findIndex(m => m.value === (props.step as RecordStep).assessmentMode)
})

const currentAssessmentModeLabel = computed(() => {
  if (props.step.type !== 'record') return ''
  const mode = assessmentModes.find(m => m.value === (props.step as RecordStep).assessmentMode)
  return mode?.label || '选择'
})

// 辅助函数
function getStepIcon(type: string): string {
  return stepIcons[type] || '❓'
}

function getStepTypeName(type: string): string {
  return stepTypeNames[type] || type
}

// 更新字段
function updateField(field: string, value: any) {
  emit('update', { ...props.step, [field]: value } as SpeakingStepsStep)
}

// 更新音频 URL
function updateAudioUrl(url: string) {
  const step = props.step as PlayAudioStep
  emit('update', {
    ...step,
    audio: { ...step.audio, url, name: url.split('/').pop() || '' }
  } as PlayAudioStep)
}

// 选择音频
function selectAudio() {
  // TODO: 实现音频选择器
  console.log('Select audio')
}

// 播放音频
function playAudio() {
  const step = props.step as PlayAudioStep
  if (step.audio?.url) {
    const audio = uni.createInnerAudioContext()
    audio.src = step.audio.url
    audio.play()
  }
}

// 更新填空答案
function updateBlankAnswer(blankIndex: number, answer: string) {
  const step = props.step as FillBlankStep
  const newBlanks = [...step.blanks]
  newBlanks[blankIndex] = { ...newBlanks[blankIndex], answer }
  emit('update', { ...step, blanks: newBlanks } as FillBlankStep)
}
</script>

<style lang="scss" scoped>
.step-card {
  border: 1px solid $border-color;
  border-radius: $border-radius-md;
  background: $bg-white;
  overflow: hidden;

  &--expanded {
    border-color: $primary-color;
  }

  &--loop {
    border: 2px solid #ffa500;
    background: #fffaf0;
  }
}

.step-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  cursor: pointer;
  background: #fafafa;
  min-height: 48px;

  &:hover {
    background: #f0f0f0;
  }
}

.step-card__left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex: 1;
  overflow: hidden;
}

.step-card__number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: $primary-color;
  color: white;
  font-size: $font-size-xs;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-card__icon {
  font-size: 18px;
  flex-shrink: 0;
}

.step-card__type {
  font-weight: 500;
  font-size: $font-size-sm;
  flex-shrink: 0;
}

.step-card__summary {
  font-size: $font-size-xs;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-card__right {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.step-card__actions {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: #e8e8e8;
  border-radius: $border-radius-sm;
}

.action-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  border-radius: $border-radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all 0.2s;

  &:hover:not(.action-btn--disabled) {
    background: $bg-white;
    color: $text-primary;
  }

  &--danger:hover:not(.action-btn--disabled) {
    background: #ffebee;
    color: $error-color;
  }

  &--disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.step-card__toggle {
  color: $text-hint;
  font-size: 10px;
}

.step-card__body {
  padding: $spacing-md;
  border-top: 1px solid $border-color;
}

// 表单样式
.form-group {
  margin-bottom: $spacing-md;

  &--half {
    flex: 1;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.form-row {
  display: flex;
  gap: $spacing-md;
}

.form-label {
  display: block;
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $spacing-xs;
}

.form-input {
  width: 100%;
  height: 36px;
  padding: 0 $spacing-sm;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  line-height: 34px;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 80px;
  padding: $spacing-sm;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  resize: vertical;
}

.form-picker {
  height: 36px;
  padding: 0 $spacing-sm;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  line-height: 34px;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-arrow {
  color: $text-hint;
  font-size: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-sm;
  margin-bottom: $spacing-xs;

  checkbox {
    transform: scale(0.8);
  }
}

// 音频选择器
.audio-selector {
  display: flex;
  gap: $spacing-sm;

  .form-input {
    flex: 1;
  }
}

.audio-preview {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  background: #f5f5f5;
  border-radius: $border-radius-sm;
}

.audio-name {
  flex: 1;
  font-size: $font-size-sm;
  color: $text-secondary;
}

.btn-play {
  padding: $spacing-xs $spacing-sm;
  font-size: $font-size-xs;
  color: $primary-color;
  background: none;
  border: 1px solid $primary-color;
  border-radius: $border-radius-sm;
}

// 循环步骤
.loop-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: #fff3e0;
  border-radius: $border-radius-sm;
  margin-bottom: $spacing-md;

  &__icon {
    font-size: 18px;
  }

  &__text {
    font-size: $font-size-sm;
    color: #e65100;
  }
}

.loop-steps {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.loop-step-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: #fafafa;
  border-radius: $border-radius-sm;
  border-left: 3px solid #ffa500;

  &__number {
    font-size: $font-size-xs;
    color: $text-hint;
    width: 32px;
  }

  &__icon {
    font-size: 14px;
  }

  &__name {
    font-size: $font-size-sm;
  }
}

// 填空项
.blanks-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.blank-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  &__number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #e0e0e0;
    font-size: $font-size-xs;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-input {
    flex: 1;
  }
}

// 按钮
.btn {
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  cursor: pointer;
  border: none;

  &-outline {
    background: $bg-white;
    border: 1px solid $border-color;
    color: $text-primary;
  }

  &-sm {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
  }
}
</style>
