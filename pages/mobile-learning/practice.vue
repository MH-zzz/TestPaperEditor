<template>
  <view class="local-learning local-learning--practice">
    <view v-if="state.loading" class="local-learning__state">
      <text class="local-learning__state-text">正在加载本地数据...</text>
    </view>

    <view v-else-if="state.loadError" class="local-learning__state local-learning__state--error">
      <text class="local-learning__state-title">加载失败</text>
      <text class="local-learning__state-text">{{ state.loadError }}</text>
      <button class="btn btn-outline btn-sm local-learning__action-btn" @click="backToOverview">返回单元概览</button>
    </view>

    <view v-else-if="state.runtimeQuestion" class="local-learning__body local-learning__body--practice">
      <view
        class="practice-content"
        @touchstart="onPracticeTouchStart"
        @touchend="onPracticeTouchEnd"
      >
        <QuestionRenderer
          :data="state.runtimeQuestion"
          :mode="'exam'"
          :answers="state.answers"
          :step-index="state.currentQuestionStepIndex"
          :show-step-nav="false"
          :fixed-bottom-dock="true"
          @select="handleSelect"
          @step-change="handleStepChange"
        />
      </view>
    </view>

    <view v-else class="local-learning__state">
      <text class="local-learning__state-text">当前单元暂无可练习题目</text>
      <button class="btn btn-outline btn-sm local-learning__action-btn" @click="backToOverview">返回单元概览</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import QuestionRenderer from '/components/renderer/QuestionRenderer.vue'
import {
  ensureLocalLearningLoaded,
  getActiveLearningUnit,
  localLearningState,
  prepareLocalLearningRuntimeQuestion,
  resolveRuntimeQuestionStepCount,
  selectLearningUnit,
  setLocalLearningAnswer,
  setLocalLearningStepIndex,
  startLocalLearningPractice
} from '/stores/localLearning'

const state = localLearningState
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeStartAt = ref(0)
const swipeTracking = ref(false)

const SWIPE_DISTANCE_PX = 56
const SWIPE_MAX_DURATION_MS = 900
const SWIPE_DIRECTION_RATIO = 1.2

function stackCount() {
  if (typeof getCurrentPages !== 'function') return 0
  const pages = getCurrentPages()
  return Array.isArray(pages) ? pages.length : 0
}

function backToOverview() {
  if (stackCount() > 1) {
    uni.navigateBack({ delta: 1 })
    return
  }
  uni.reLaunch({ url: '/pages/mobile-learning/unit-list' })
}

function handleSelect(subQuestionId: string, value: string | string[]) {
  setLocalLearningAnswer(subQuestionId, value)
}

function handleStepChange(step: number) {
  setLocalLearningStepIndex(step)
}

function showSwipeBoundaryTip(text: string) {
  if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
    uni.showToast({
      title: text,
      icon: 'none',
      duration: 1200
    })
  }
}

function goPrevStep() {
  if (state.currentQuestionStepIndex <= 0) {
    showSwipeBoundaryTip('已经是第一步')
    return
  }
  setLocalLearningStepIndex(state.currentQuestionStepIndex - 1)
}

function goNextStep() {
  const stepCount = resolveRuntimeQuestionStepCount(state.runtimeQuestion)
  if (stepCount > 0 && state.currentQuestionStepIndex >= stepCount - 1) {
    showSwipeBoundaryTip('已经是最后一步')
    return
  }
  setLocalLearningStepIndex(state.currentQuestionStepIndex + 1)
}

function resolveTouchPoint(event: unknown) {
  const payload = event as {
    changedTouches?: Array<{ clientX?: number; pageX?: number; clientY?: number; pageY?: number }>
    touches?: Array<{ clientX?: number; pageX?: number; clientY?: number; pageY?: number }>
  }
  const point = payload?.changedTouches?.[0] || payload?.touches?.[0] || null
  if (!point) return null
  const x = Number(point.clientX ?? point.pageX ?? 0)
  const y = Number(point.clientY ?? point.pageY ?? 0)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

function onPracticeTouchStart(event: unknown) {
  const point = resolveTouchPoint(event)
  if (!point) return
  swipeStartX.value = point.x
  swipeStartY.value = point.y
  swipeStartAt.value = Date.now()
  swipeTracking.value = true
}

function onPracticeTouchEnd(event: unknown) {
  if (!swipeTracking.value) return
  swipeTracking.value = false
  const point = resolveTouchPoint(event)
  if (!point) return

  const deltaX = point.x - swipeStartX.value
  const deltaY = point.y - swipeStartY.value
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  const duration = Date.now() - swipeStartAt.value

  if (duration > SWIPE_MAX_DURATION_MS) return
  if (absX < SWIPE_DISTANCE_PX) return
  if (absX <= absY * SWIPE_DIRECTION_RATIO) return

  if (deltaX > 0) goPrevStep()
  else goNextStep()
}

onMounted(async () => {
  await ensureLocalLearningLoaded(true)

  const unit = getActiveLearningUnit()
  if (!unit && state.units.length > 0) {
    selectLearningUnit(state.units[0].id)
  }

  if (!state.runtimeQuestion) {
    startLocalLearningPractice()
  } else {
    prepareLocalLearningRuntimeQuestion()
  }
})
</script>

<style lang="scss" scoped>
.local-learning {
  height: 100vh;
  min-height: 100vh;
  background: #f3f5f7;
  color: #0f172a;
  display: flex;
  flex-direction: column;
}

.local-learning--practice {
  overflow: hidden;
}

.local-learning__body {
  flex: 1;
  min-height: 0;
}

.local-learning__body--practice {
  overflow: hidden;
}

.practice-content {
  height: 100%;
  min-height: 0;
  background: #f3f5f7;
}

.local-learning__state {
  margin: 24rpx 32rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #fff;
}

.local-learning__state--error {
  background: rgba(254, 242, 242, 0.78);
  border: 1px solid rgba(220, 38, 38, 0.22);
}

.local-learning__state-title {
  display: block;
  color: #b91c1c;
  font-size: 30rpx;
  font-weight: 700;
}

.local-learning__state-text {
  display: block;
  margin-top: 10rpx;
  color: #64748b;
  font-size: 24rpx;
  line-height: 1.5;
}

.local-learning__action-btn {
  margin-top: 20rpx;
}
</style>
