<template>
  <view class="local-learning">
    <view class="local-learning__top">
      <view>
        <text class="local-learning__title">本地学习</text>
        <text class="local-learning__subtitle">从本地 `questions.json` + `flows.json` 进入练习</text>
      </view>
      <button class="btn btn-outline btn-xs" @click="reloadLocalPack">重新加载</button>
    </view>

    <view v-if="state.loading" class="local-learning__state">
      <text class="local-learning__state-text">正在加载本地数据...</text>
    </view>

    <view v-else-if="state.loadError" class="local-learning__state local-learning__state--error">
      <text class="local-learning__state-title">加载失败</text>
      <text class="local-learning__state-text">{{ state.loadError }}</text>
      <text class="local-learning__state-text">请确认文件存在于 `static/local-learning/questions.json` 和 `static/local-learning/flows.json`。</text>
    </view>

    <scroll-view v-else scroll-y class="local-learning__body">
      <view v-if="state.units.length <= 0" class="local-learning__state">
        <text class="local-learning__state-text">没有可用的本地题目</text>
      </view>

      <view v-else class="unit-list">
        <view
          v-for="unit in state.units"
          :key="unit.id"
          class="unit-card"
          @click="openUnit(unit.id)"
        >
          <text class="unit-card__book">({{ unit.textbook }})</text>
          <text class="unit-card__grade">{{ unit.gradeLabel || '年级未标注' }}</text>
          <text class="unit-card__code">{{ unit.unitCode }}</text>
          <view class="unit-card__meta">
            <text>题目 {{ unit.questions.length }} 题</text>
            <text>总分 {{ unit.totalScore }} 分</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import {
  ensureLocalLearningLoaded,
  localLearningState,
  selectLearningUnit
} from '/stores/localLearning'

const state = localLearningState

function openUnit(unitId: string) {
  selectLearningUnit(unitId)
  uni.navigateTo({
    url: '/pages/mobile-learning/unit-overview'
  })
}

function reloadLocalPack() {
  ensureLocalLearningLoaded(true)
}

onMounted(() => {
  ensureLocalLearningLoaded(false)
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

.local-learning__top {
  padding: 32rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.local-learning__title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
}

.local-learning__subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 26rpx;
  line-height: 1.45;
}

.local-learning__body {
  flex: 1;
  min-height: 0;
  padding: 0 32rpx 32rpx;
  box-sizing: border-box;
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

.unit-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.unit-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
}

.unit-card__book {
  font-size: 26rpx;
  color: #64748b;
}

.unit-card__grade {
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.unit-card__code {
  margin-top: 6rpx;
  font-size: 42rpx;
  font-weight: 800;
  color: #111827;
}

.unit-card__meta {
  margin-top: 18rpx;
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 24rpx;
}
</style>
