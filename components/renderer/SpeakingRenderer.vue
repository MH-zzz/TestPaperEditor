<template>
  <view class="speaking-renderer">
    <!-- 进度指示 -->
    <view class="progress-bar">
      <view class="progress-steps">
        <view
          v-for="(step, index) in data.steps"
          :key="step.id"
          class="progress-step"
          :class="{
            'is-active': index === currentStepIndex,
            'is-done': index < currentStepIndex
          }"
        >
          <view class="step-dot">{{ index + 1 }}</view>
          <text class="step-title">{{ step.title }}</text>
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view class="content-area" scroll-y>
      <!-- 说明文字 -->
      <view v-if="currentStep.instruction" class="content-instruction">
        <RichTextRenderer :content="currentStep.instruction" />
      </view>

      <!-- 图片 -->
      <view v-if="currentStep.imageUrl" class="content-image">
        <img :src="currentStep.imageUrl" mode="aspectFit" />
      </view>

      <!-- 文章/段落 -->
      <view v-if="currentStep.passage" class="content-passage">
        <RichTextRenderer :content="currentStep.passage" />
      </view>

      <!-- 文字输入区域 -->
      <view v-if="currentStep.behavior === 'input'" class="content-input">
        <textarea
          v-model="inputText"
          class="input-textarea"
          placeholder="请输入你的答案..."
          :maxlength="-1"
        />
      </view>
    </scroll-view>

    <!-- 状态区域 -->
    <view class="status-area">
      <!-- 音频播放进度 -->
      <view v-if="currentStep.behavior === 'auto_play' && isPlaying" class="status-audio">
        <view class="audio-icon playing">
          <text class="icon">🔊</text>
        </view>
        <view class="audio-progress">
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: audioProgress + '%' }"></view>
          </view>
          <text class="progress-time">{{ formatTime(audioCurrentTime) }} / {{ formatTime(audioDuration) }}</text>
        </view>
      </view>

      <!-- 倒计时 -->
      <view v-if="showCountdown" class="status-countdown">
        <view class="countdown-circle">
          <text class="countdown-number">{{ countdown }}</text>
        </view>
        <text class="countdown-label">{{ countdownLabel }}</text>
      </view>

      <!-- 录音状态 -->
      <view v-if="currentStep.behavior === 'record' && isRecording" class="status-recording">
        <view class="recording-indicator">
          <view class="recording-dot"></view>
          <text class="recording-text">录音中</text>
        </view>
        <text class="recording-time">{{ formatTime(recordingTime) }} / {{ formatTime(currentStep.duration || 60) }}</text>
      </view>
    </view>

    <!-- 按钮区域 -->
    <view class="button-area" v-if="!currentStep.hideButton">
      <button
        class="main-button"
        :class="{ disabled: !canProceed }"
        :disabled="!canProceed"
        @click="handleButtonClick"
      >
        {{ buttonText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { SpeakingQuestion, SpeakingStep, RenderMode } from '/types'
import RichTextRenderer from './RichTextRenderer.vue'

const props = withDefaults(defineProps<{
  data: SpeakingQuestion
  mode?: RenderMode
}>(), {
  mode: 'preview'
})

const emit = defineEmits<{
  (e: 'complete', answers: { recordings: string[], inputs: string[] }): void
  (e: 'step-change', stepIndex: number): void
}>()

// ===== 状态 =====
const currentStepIndex = ref(0)
const countdown = ref(0)
const isPlaying = ref(false)
const isRecording = ref(false)
const audioProgress = ref(0)
const audioCurrentTime = ref(0)
const audioDuration = ref(0)
const recordingTime = ref(0)
const inputText = ref('')

// 收集的答案
const recordings = ref<string[]>([])
const inputs = ref<string[]>([])

// 定时器
let countdownTimer: number | null = null
let recordingTimer: number | null = null
let audioContext: any = null

// ===== 计算属性 =====
const currentStep = computed<SpeakingStep>(() => {
  return props.data.steps[currentStepIndex.value] || props.data.steps[0]
})

const isLastStep = computed(() => {
  return currentStepIndex.value >= props.data.steps.length - 1
})

const showCountdown = computed(() => {
  const behavior = currentStep.value.behavior
  return (behavior === 'countdown' || behavior === 'record') && countdown.value > 0
})

const countdownLabel = computed(() => {
  if (currentStep.value.behavior === 'record') {
    return isRecording.value ? '剩余时间' : '准备时间'
  }
  return '倒计时'
})

const canProceed = computed(() => {
  const behavior = currentStep.value.behavior
  switch (behavior) {
    case 'manual':
      return true
    case 'auto_play':
      return !isPlaying.value
    case 'countdown':
      return countdown.value === 0
    case 'record':
      return isRecording.value || countdown.value === 0
    case 'input':
      return inputText.value.trim().length > 0
    default:
      return true
  }
})

const buttonText = computed(() => {
  if (currentStep.value.buttonText) {
    return currentStep.value.buttonText
  }

  const behavior = currentStep.value.behavior

  if (isLastStep.value) {
    if (behavior === 'record' && isRecording.value) return '停止录音并提交'
    if (behavior === 'input') return '提交'
    return '完成'
  }

  switch (behavior) {
    case 'record':
      return isRecording.value ? '停止录音' : '开始录音'
    case 'input':
      return '提交答案'
    default:
      return '下一步'
  }
})

// ===== 方法 =====
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function playBeep() {
  // 播放提示音
  const beepUrl = props.data.beepAudioUrl || '/static/beep.mp3'
  const audio = uni.createInnerAudioContext()
  audio.src = beepUrl
  audio.play()
  audio.onEnded(() => audio.destroy())
}

function startStep() {
  const step = currentStep.value

  // 播放开始提示音
  if (step.beepOnStart) {
    playBeep()
  }

  // 根据行为类型初始化
  switch (step.behavior) {
    case 'auto_play':
      startAudioPlayback()
      break
    case 'countdown':
      startCountdown(step.duration || 10)
      break
    case 'record':
      // 录音前可能有准备倒计时
      countdown.value = 3 // 3秒准备
      startCountdown(3, () => {
        playBeep()
        startRecording()
      })
      break
    case 'input':
      inputText.value = ''
      break
  }
}

function startAudioPlayback() {
  const step = currentStep.value
  if (!step.audioUrl) {
    goToNextStep()
    return
  }

  isPlaying.value = true
  audioProgress.value = 0
  audioCurrentTime.value = 0

  audioContext = uni.createInnerAudioContext()
  audioContext.src = step.audioUrl

  audioContext.onCanplay(() => {
    audioDuration.value = audioContext.duration || 0
  })

  audioContext.onTimeUpdate(() => {
    audioCurrentTime.value = audioContext.currentTime || 0
    if (audioDuration.value > 0) {
      audioProgress.value = (audioCurrentTime.value / audioDuration.value) * 100
    }
  })

  audioContext.onEnded(() => {
    isPlaying.value = false
    audioProgress.value = 100
    // 自动播放完成后自动进入下一步
    setTimeout(() => goToNextStep(), 500)
  })

  audioContext.onError((err: any) => {
    console.error('Audio error:', err)
    isPlaying.value = false
    // 出错也进入下一步
    goToNextStep()
  })

  audioContext.play()
}

function startCountdown(seconds: number, onComplete?: () => void) {
  countdown.value = seconds

  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      if (onComplete) {
        onComplete()
      } else {
        // 倒计时结束自动进入下一步
        goToNextStep()
      }
    }
  }, 1000) as unknown as number
}

function startRecording() {
  isRecording.value = true
  recordingTime.value = 0
  const maxDuration = currentStep.value.duration || 60
  countdown.value = maxDuration

  // 录音计时
  recordingTimer = setInterval(() => {
    recordingTime.value++
    countdown.value = maxDuration - recordingTime.value

    if (recordingTime.value >= maxDuration) {
      stopRecording()
    }
  }, 1000) as unknown as number

  // TODO: 实际录音逻辑
  // const recorderManager = uni.getRecorderManager()
  // recorderManager.start({ duration: maxDuration * 1000 })
}

function stopRecording() {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
  isRecording.value = false
  countdown.value = 0

  // TODO: 保存录音文件
  recordings.value.push(`recording_${currentStepIndex.value}`)
}

function handleButtonClick() {
  if (!canProceed.value) return

  const behavior = currentStep.value.behavior

  if (behavior === 'record') {
    if (isRecording.value) {
      stopRecording()
      goToNextStep()
    } else {
      startRecording()
    }
    return
  }

  if (behavior === 'input') {
    inputs.value.push(inputText.value)
  }

  goToNextStep()
}

function goToNextStep() {
  // 清理当前步骤的状态
  cleanup()

  if (isLastStep.value) {
    // 完成所有步骤
    emit('complete', {
      recordings: recordings.value,
      inputs: inputs.value
    })
    return
  }

  currentStepIndex.value++
  emit('step-change', currentStepIndex.value)

  // 开始新步骤
  setTimeout(() => startStep(), 100)
}

function cleanup() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  isPlaying.value = false
  isRecording.value = false
  countdown.value = 0
}

// ===== 生命周期 =====
onMounted(() => {
  if (props.mode === 'exam') {
    startStep()
  }
})

onUnmounted(() => {
  cleanup()
})

// 监听步骤变化（预览模式手动切换）
watch(currentStepIndex, () => {
  if (props.mode === 'preview') {
    cleanup()
  }
})
</script>

<style lang="scss" scoped>
.speaking-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f7fa;
}

// 进度条
.progress-bar {
  padding: 16px;
  background-color: #fff;
  border-bottom: 1px solid $border-color;
}

.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 16px;
  background-color: #f0f0f0;
  transition: all 0.3s;

  .step-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #ccc;
    color: #fff;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .step-title {
    font-size: 12px;
    color: $text-secondary;
  }

  &.is-active {
    background-color: rgba($primary-color, 0.1);

    .step-dot {
      background-color: $primary-color;
    }
    .step-title {
      color: $primary-color;
      font-weight: 600;
    }
  }

  &.is-done {
    .step-dot {
      background-color: $success-color;
    }
  }
}

// 内容区域
.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.content-instruction {
  font-size: 16px;
  line-height: 1.8;
  color: $text-primary;
  margin-bottom: 20px;
}

.content-image {
  text-align: center;
  margin-bottom: 20px;

  img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
  }
}

.content-passage {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  border-left: 4px solid $primary-color;
  font-size: 15px;
  line-height: 2;
  color: $text-primary;
}

.content-input {
  margin-top: 20px;

  .input-textarea {
    width: 100%;
    min-height: 150px;
    padding: 16px;
    border: 1px solid $border-color;
    border-radius: 8px;
    font-size: 15px;
    line-height: 1.6;
    background-color: #fff;

    &:focus {
      border-color: $primary-color;
    }
  }
}

// 状态区域
.status-area {
  padding: 16px 20px;
  background-color: #fff;
  border-top: 1px solid $border-color;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-audio {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;

  .audio-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: $primary-color;
    display: flex;
    align-items: center;
    justify-content: center;

    .icon {
      font-size: 20px;
    }

    &.playing {
      animation: pulse 1s infinite;
    }
  }

  .audio-progress {
    flex: 1;

    .progress-track {
      height: 4px;
      background-color: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background-color: $primary-color;
        transition: width 0.3s;
      }
    }

    .progress-time {
      font-size: 12px;
      color: $text-secondary;
      margin-top: 4px;
      display: block;
    }
  }
}

.status-countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .countdown-circle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: $primary-color;
    display: flex;
    align-items: center;
    justify-content: center;

    .countdown-number {
      font-size: 28px;
      font-weight: bold;
      color: #fff;
    }
  }

  .countdown-label {
    font-size: 14px;
    color: $text-secondary;
  }
}

.status-recording {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .recording-indicator {
    display: flex;
    align-items: center;
    gap: 8px;

    .recording-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: $error-color;
      animation: blink 1s infinite;
    }

    .recording-text {
      font-size: 16px;
      font-weight: 600;
      color: $error-color;
    }
  }

  .recording-time {
    font-size: 14px;
    color: $text-secondary;
  }
}

// 按钮区域
.button-area {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1px solid $border-color;
}

.main-button {
  width: 100%;
  height: 48px;
  background-color: $primary-color;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 24px;
  border: none;

  &:active {
    opacity: 0.9;
  }

  &.disabled {
    background-color: #ccc;
    color: #999;
  }
}

// 动画
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
