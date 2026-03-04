<template>
  <view v-if="show" class="lc-step__context">
    <text v-if="title" class="lc-step__context-title">{{ title }}</text>
    <text v-if="groupTitle" class="lc-step__context-group">{{ groupTitle }}</text>
    <RichTextRenderer
      v-if="showPrompt && prompt"
      :content="prompt"
      image-layout="full-row"
      placeholder="请输入题组说明"
    />
  </view>
</template>

<script setup lang="ts">
import type { RichTextContent } from '/types'
import RichTextRenderer from '../RichTextRenderer.vue'

defineProps<{
  show: boolean
  title?: string
  groupTitle?: string
  showPrompt?: boolean
  prompt?: RichTextContent
}>()
</script>

<style lang="scss" scoped>
.lc-step__context {
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.lc-step__context-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-primary;
}

.lc-step__context-group {
  font-size: 36rpx;
  color: $text-secondary;
}

.lc-step__context {
  :deep(.rich-text-renderer) {
    display: block;
    font-size: 36rpx;
    line-height: 1.5;
    color: #333;
    text-indent: 0;
    white-space: normal;
  }

  :deep(.rich-text-renderer text) {
    font-size: 36rpx;
    line-height: 1.5;
    color: #333;
    text-indent: 0;
    white-space: normal;
    word-break: break-word;
  }
}
</style>
