<template>
  <view class="speaking-steps">
    <!-- 主内容区域 -->
    <scroll-view scroll-y class="speaking-steps__main">
      <view class="speaking-steps__main-inner">
        <view v-if="displayTitle" class="question-title">
          <text class="question-title__text">{{ displayTitle }}</text>
        </view>

        <!-- 当前步骤内容 -->
        <view class="speaking-steps__content" v-if="currentStepData">
          <view class="step-header">
            <text class="step-title">第 {{ currentStepIndex + 1 }} 步</text>
            <text class="step-type">{{ getStepTypeName(currentStepData.type) }}</text>
          </view>

          <!-- 步骤预览内容 -->
          <StepPreview :step="currentStepData" mode="preview" />
        </view>
      </view>
    </scroll-view>

    <!-- 底部区域（固定在底部） -->
    <view class="speaking-steps__footer">
      <!-- 音频/倒计时控制区 -->
      <view v-if="currentStepData?.type === 'play-audio'" class="footer-control">
        <button class="control-play-btn" @click="toggleAudio">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <view class="control-progress">
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: `${audioProgress}%` }"></view>
            <view class="progress-thumb" :style="{ left: `${audioProgress}%` }"></view>
          </view>
        </view>
        <text class="control-time">{{ formatTime(currentTime) }}/{{ formatTime(totalTime) }}</text>
      </view>

      <view v-else-if="currentStepData?.type === 'countdown'" class="footer-control">
        <view class="countdown-display">
          <text class="countdown-icon">⏱</text>
          <view class="control-progress">
            <view class="progress-track">
              <view class="progress-fill" :style="{ width: '60%' }"></view>
            </view>
          </view>
          <text class="control-time">{{ currentStepData.duration }}秒</text>
        </view>
      </view>

      <view v-else-if="currentStepData?.type === 'record'" class="footer-control">
        <view class="record-display">
          <text class="record-icon">🎤</text>
          <view class="control-progress">
            <view class="progress-track progress-track--record">
              <view class="progress-fill progress-fill--record" style="width: 30%"></view>
            </view>
          </view>
          <text class="control-time">00:00/{{ formatTime(currentStepData.duration) }}</text>
        </view>
      </view>

      <!-- 导航按钮 -->
      <view class="footer-nav">
        <button
          class="btn btn-outline"
          :disabled="currentStepIndex <= 0"
          @click="prevStep"
        >上一步</button>
        <button
          class="btn btn-primary"
          :disabled="currentStepIndex >= expandedSteps.length - 1"
          @click="nextStep"
        >下一步</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SpeakingStepsQuestion, SpeakingStepsStep, RenderMode } from '/types'
import type { SpeakingStepsRuntimeEvent } from '/engine/flow/speaking-steps/runtime.ts'
import { createSpeakingStepsRuntimeState, reduceSpeakingStepsRuntimeState } from '/engine/flow/speaking-steps/runtime.ts'
import StepPreview from '../editor/speaking/StepPreview.vue'

const props = withDefaults(defineProps<{
  data: SpeakingStepsQuestion
  mode?: RenderMode
  stepIndex?: number
}>(), {
  mode: 'preview',
  stepIndex: 0
})

const emit = defineEmits<{
  (e: 'stepChange', step: number): void
  (e: 'complete', answers: any): void
}>()

const currentStepIndex = ref(Math.max(0, Number(props.stepIndex || 0)))

const displayTitle = computed(() => {
  const title = String(props.data?.title || '').trim()
  const desc = String((props.data as any)?.title_description || '').trim()
  return (title + (desc ? ` ${desc}` : '')).trim()
})

// 监听外部步骤索引变化
watch(() => props.stepIndex, (newIndex) => {
  if (newIndex !== undefined && newIndex !== currentStepIndex.value) {
    dispatchRuntime({ type: 'goToStep', stepIndex: Number(newIndex || 0) })
  }
})
const isPlaying = ref(false)
const audioProgress = ref(0)
const currentTime = ref(0)
const totalTime = ref(0)

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 切换音频播放
function toggleAudio() {
  isPlaying.value = !isPlaying.value
  // 预览模式：模拟播放
  if (isPlaying.value) {
    totalTime.value = 25 // 示例时长
  }
}

// 展开循环步骤，生成完整的步骤列表
const expandedSteps = computed<SpeakingStepsStep[]>(() => {
  const result: SpeakingStepsStep[] = []
  const subQuestions = props.data.subQuestions || []

  for (const step of props.data.steps) {
    if (step.type === 'loop-sub-questions') {
      // 为每个小题展开循环步骤
      for (let i = 0; i < subQuestions.length; i++) {
        for (const subStep of step.stepsPerQuestion) {
          result.push({
            ...subStep,
            id: `${subStep.id}_q${i}`
          })
        }
      }
    } else {
      result.push(step)
    }
  }

  return result
})

// 当前步骤数据
const currentStepData = computed(() => {
  return expandedSteps.value[currentStepIndex.value]
})

watch(expandedSteps, (list) => {
  const total = Array.isArray(list) ? list.length : 0
  if (total <= 0) {
    currentStepIndex.value = 0
    return
  }
  if (currentStepIndex.value > total - 1) {
    currentStepIndex.value = total - 1
    emit('stepChange', currentStepIndex.value)
  }
}, { immediate: true })

// 获取步骤类型名称
function getStepTypeName(type: string): string {
  const names: Record<string, string> = {
    'introduction': '题型介绍',
    'display-content': '显示内容',
    'play-audio': '播放音频',
    'countdown': '倒计时',
    'record': '录音',
    'fill-blank': '填空'
  }
  return names[type] || type
}

// 上一步
function prevStep() {
  dispatchRuntime({ type: 'prev' })
}

// 下一步
function nextStep() {
  const before = currentStepIndex.value
  dispatchRuntime({ type: 'next' })
  if (before === currentStepIndex.value && before >= expandedSteps.value.length - 1) {
    // 已到最后一步，触发完成
    emit('complete', {})
  }
}

function dispatchRuntime(event: SpeakingStepsRuntimeEvent) {
  const current = createSpeakingStepsRuntimeState(currentStepIndex.value)
  const next = reduceSpeakingStepsRuntimeState(current, expandedSteps.value, event)
  const nextIndex = Number(next?.stepIndex || 0)
  if (nextIndex === currentStepIndex.value) return
  currentStepIndex.value = nextIndex
  emit('stepChange', nextIndex)
}
</script>

<style lang="scss" scoped>
.speaking-steps {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__main {
    flex: 1;
    min-height: 0;
    height: 0;
  }

  &__main-inner {
    min-height: 100%;
    padding: $spacing-sm;
    box-sizing: border-box;
  }

  &__content {
    background-color: $bg-white;
    border-radius: $border-radius-md;
    padding: $spacing-sm;
  }

  &__footer {
    flex-shrink: 0;
    padding: $spacing-xs $spacing-sm;
    border-top: 1px solid $border-color;
    background: $bg-white;
  }
}

// 题目标题
.question-title {
  margin-bottom: $spacing-sm;
  padding: $spacing-sm;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: $border-radius-md;
  background: rgba(255, 255, 255, 0.86);

  &__text {
    font-size: 14px;
    font-weight: 700;
    color: rgba(15, 23, 42, 0.86);
  }
}

// 底部控制区
.footer-control {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs 0;
  margin-bottom: $spacing-xs;
}

.control-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $primary-color;
  color: white;
  border: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.control-progress {
  flex: 1;
  position: relative;
}

.progress-track {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  position: relative;

  &--record {
    background: #ffcdd2;
  }
}

.progress-fill {
  height: 100%;
  background: $primary-color;
  border-radius: 2px;

  &--record {
    background: #f44336;
  }
}

.progress-thumb {
  width: 12px;
  height: 12px;
  background: $primary-color;
  border-radius: 50%;
  position: absolute;
  top: -4px;
  transform: translateX(-50%);
}

.control-time {
  font-size: 11px;
  color: $text-hint;
  flex-shrink: 0;
  min-width: 60px;
  text-align: right;
}

.countdown-display,
.record-display {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  width: 100%;
}

.countdown-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.record-icon {
  font-size: 18px;
  color: #f44336;
  flex-shrink: 0;
}

// 底部导航
.footer-nav {
  display: flex;
  justify-content: center;
  gap: $spacing-md;
}


.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid $border-color;

  .step-title {
    font-size: $font-size-base;
    font-weight: 500;
  }

  .step-type {
    font-size: $font-size-xs;
    color: $text-hint;
    padding: 2px 8px;
    background: #f5f5f5;
    border-radius: 10px;
  }
}

.btn {
  min-width: 80px;
  padding: $spacing-xs $spacing-md;
  border-radius: 16px;
  font-size: $font-size-xs;
  cursor: pointer;
  border: none;

  &-outline {
    background: $bg-white;
    border: 1px solid $border-color;
    color: $text-secondary;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &-primary {
    background: $primary-color;
    color: white;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
</style>
