<template>
  <view class="local-learning">
    <view v-if="state.loading" class="local-learning__state">
      <text class="local-learning__state-text">正在加载本地数据...</text>
    </view>

    <view v-else-if="state.loadError" class="local-learning__state local-learning__state--error">
      <text class="local-learning__state-title">加载失败</text>
      <text class="local-learning__state-text">{{ state.loadError }}</text>
      <text class="local-learning__state-text">请确认文件存在于 `static/local-learning/questions.json` 和 `static/local-learning/flows.json`。</text>
      <button class="btn btn-outline btn-sm local-learning__action-btn" @click="reloadAndBack">返回单元列表</button>
    </view>

    <view v-else-if="activeUnit" class="local-learning__body">
      <view class="unit-overview__header">
        <text class="unit-overview__book">({{ activeUnit.textbook }})</text>
        <text class="unit-overview__grade">{{ activeUnit.gradeLabel || '年级未标注' }}</text>
        <text class="unit-overview__code">{{ activeUnit.unitCode }}</text>
        <view class="unit-overview__chips">
          <text class="unit-overview__chip">难度系数: {{ activeUnit.difficulty.toFixed(2) }}</text>
          <text class="unit-overview__recent">最近成绩: {{ activeUnit.recentResult }}</text>
        </view>
      </view>

      <view class="unit-overview__card">
        <view class="unit-overview__card-head">
          <text>共 {{ activeUnit.parts.length }} 个部分</text>
          <text>共 {{ activeUnit.totalScore }} 分</text>
        </view>

        <view v-for="part in activeUnit.parts" :key="part.name" class="unit-overview__row">
          <text>{{ part.name }}</text>
          <text>{{ part.score }} 分</text>
        </view>
      </view>

      <view class="unit-overview__actions">
        <button class="btn btn-outline btn-sm unit-overview__btn" @click="backToList">重新选单元</button>
        <button class="btn btn-primary btn-sm unit-overview__btn" @click="startPractice">
          继续练习 ({{ activeUnit.progress }}%)
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  ensureLocalLearningLoaded,
  getActiveLearningUnit,
  localLearningState,
  selectLearningUnit,
  startLocalLearningPractice
} from '/stores/localLearning'

const state = localLearningState
const activeUnit = computed(() => getActiveLearningUnit())

function stackCount() {
  if (typeof getCurrentPages !== 'function') return 0
  const pages = getCurrentPages()
  return Array.isArray(pages) ? pages.length : 0
}

function backToList() {
  if (stackCount() > 1) {
    uni.navigateBack({ delta: 1 })
    return
  }
  uni.reLaunch({ url: '/pages/mobile-learning/unit-list' })
}

function reloadAndBack() {
  ensureLocalLearningLoaded(true).finally(() => {
    backToList()
  })
}

function startPractice() {
  if (!activeUnit.value) return
  startLocalLearningPractice()
  uni.navigateTo({
    url: '/pages/mobile-learning/practice'
  })
}

onMounted(async () => {
  await ensureLocalLearningLoaded(false)
  if (!state.activeUnitId && state.units.length > 0) {
    selectLearningUnit(state.units[0].id)
  }
})
</script>

<style lang="scss" scoped>
.local-learning {
  height: 100vh;
  min-height: 100vh;
  background: linear-gradient(180deg, #eef3ff 0%, #f8f9fb 48%, #ffffff 100%);
  color: #0f172a;
  display: flex;
  flex-direction: column;
}

.local-learning__body {
  flex: 1;
  min-height: 0;
  padding: 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
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

.unit-overview__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.unit-overview__book {
  font-size: 28rpx;
  color: #64748b;
}

.unit-overview__grade {
  font-size: 46rpx;
  font-weight: 800;
  color: #111827;
}

.unit-overview__code {
  font-size: 50rpx;
  font-weight: 900;
  color: #0f172a;
}

.unit-overview__chips {
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.unit-overview__chip {
  font-size: 24rpx;
  color: #334155;
  background: rgba(96, 165, 250, 0.14);
  border-radius: 999rpx;
  padding: 8rpx 18rpx;
}

.unit-overview__recent {
  font-size: 24rpx;
  color: #64748b;
}

.unit-overview__card {
  margin-top: 26rpx;
  flex: 1;
  min-height: 0;
  border-radius: 24rpx;
  background: #fff;
  padding: 28rpx;
}

.unit-overview__card-head {
  display: flex;
  justify-content: space-between;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
}

.unit-overview__row {
  margin-top: 26rpx;
  display: flex;
  justify-content: space-between;
  color: #1f2937;
  font-size: 30rpx;
}

.unit-overview__actions {
  margin-top: 28rpx;
  display: flex;
  gap: 20rpx;
}

.unit-overview__btn {
  flex: 1;
}
</style>
