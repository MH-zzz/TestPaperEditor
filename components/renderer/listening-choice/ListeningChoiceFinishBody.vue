<template>
  <view class="lc-step lc-step--center">
    <text v-if="text" class="lc-step__finish-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<style lang="scss" scoped>
.lc-step--center {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;
}

.lc-step__finish-text {
  color: $text-secondary;
  font-size: 14px;
}
</style>
