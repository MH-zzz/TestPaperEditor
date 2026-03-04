<template>
  <view class="lc-intro-body">
    <RichTextRenderer
      v-if="showDescription"
      :content="introText"
      image-layout="full-row"
      placeholder="请输入说明"
    />

    <view v-if="!introAudioUrl" class="lc-step__hint">
      <text>未配置说明音频 URL</text>
    </view>


    <view v-if="autoNext === 'tapNext'" class="lc-step__hint">
      <text>点击下一步继续</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { RenderMode, RichTextContent } from '/types'
import RichTextRenderer from '../RichTextRenderer.vue'

withDefaults(defineProps<{
  showDescription: boolean
  introText: RichTextContent
  introAudioUrl?: string
  mode?: RenderMode
  autoNext?: string
}>(), {
  introAudioUrl: '',
  mode: 'preview',
  autoNext: ''
})
</script>

<style lang="scss" scoped>
.lc-intro-body {
  background: transparent;
  border-radius: 0;
  padding: 20rpx 0 36rpx;
  min-height: 720rpx;
  box-sizing: border-box;

  :deep(.rich-text-renderer) {
    display: block;
    font-size: 36rpx;
    margin-left: 0;
    padding-left: 0;
    text-indent: 0;
    white-space: normal;
    line-height: 1.5;
    color: #1a1a1a;
  }

  :deep(.rich-text-renderer text) {
    margin-left: 0;
    padding-left: 0;
    text-indent: 0;
    white-space: normal;
    word-break: break-word;
  }
}

.lc-step__hint {
  margin-top: $spacing-md;
  color: $text-hint;
  font-size: $font-size-sm;
}
</style>
