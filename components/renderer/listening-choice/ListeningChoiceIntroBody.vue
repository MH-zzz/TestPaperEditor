<template>
  <view class="lc-intro-body">
    <RichTextRenderer
      v-if="showDescription"
      :content="introText"
      placeholder="请输入说明"
    />

    <view v-if="!introAudioUrl" class="lc-step__hint">
      <text>未配置说明音频 URL</text>
    </view>

    <view v-if="introAudioUrl && mode === 'preview'" class="lc-step__hint">
      <text>预览不会自动播放音频，也不会启动倒计时或自动进入下一步；请手动播放或点击下一步继续。</text>
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
.lc-step__hint {
  margin-top: $spacing-md;
  color: $text-hint;
  font-size: $font-size-sm;
}
</style>
