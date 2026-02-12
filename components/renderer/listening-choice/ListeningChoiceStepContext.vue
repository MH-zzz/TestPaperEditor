<template>
  <view v-if="show" class="lc-step__context">
    <text v-if="title" class="lc-step__context-title">{{ title }}</text>
    <text v-if="groupTitle" class="lc-step__context-group">{{ groupTitle }}</text>
    <RichTextRenderer
      v-if="showPrompt && prompt"
      :content="prompt"
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
  margin-bottom: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.lc-step__context-title {
  font-size: 14px;
  font-weight: 700;
  color: $text-primary;
}

.lc-step__context-group {
  font-size: 13px;
  color: $text-secondary;
}
</style>
