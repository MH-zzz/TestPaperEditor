<template>
  <view class="local-learning-redirect">
    <text class="local-learning-redirect__text">正在进入本地学习...</text>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

function goUnitList() {
  uni.redirectTo({
    url: '/pages/mobile-learning/unit-list',
    fail: () => {
      uni.reLaunch({
        url: '/pages/mobile-learning/unit-list'
      })
    }
  })
}

onMounted(() => {
  goUnitList()
})
</script>

<style lang="scss" scoped>
.local-learning-redirect {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f5f7;
}

.local-learning-redirect__text {
  color: #64748b;
  font-size: 28rpx;
}
</style>
