<template>
  <view class="lc-step lc-step--center">
    <text>不支持的步骤类型：{{ kind }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  kind?: string
}>(), {
  kind: ''
})
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
</style>
