<template>
  <view class="rich-text-renderer">
    <template v-if="content?.content?.length">
      <template v-for="(node, index) in content.content" :key="index">
        <!-- 图片节点 -->
        <img
          v-if="node.type === 'image'"
          :src="(node as any).url"
          class="rich-text-image"
        />
        <!-- 文本节点 -->
        <text
          v-else
          :style="getNodeStyle(node.marks)"
          :class="getNodeClass(node.marks)"
        >{{ node.text }}</text>
      </template>
    </template>
    <text v-else class="placeholder">{{ placeholder }}</text>
  </view>
</template>

<script setup lang="ts">
import type { RichTextContent, TextMark, RichTextTextNode } from '/types'

const props = withDefaults(defineProps<{
  content: RichTextContent | null | undefined
  placeholder?: string
}>(), {
  placeholder: ''
})

// 根据 marks 生成样式
function getNodeStyle(marks?: TextMark[]): Record<string, string> {
  if (!marks) return {}

  const style: Record<string, string> = {}

  marks.forEach(mark => {
    if (mark.startsWith('color:')) {
      style.color = mark.split(':')[1]
    }
    if (mark.startsWith('bg:')) {
      style.backgroundColor = mark.split(':')[1]
    }
  })

  return style
}

// 根据 marks 生成 class
function getNodeClass(marks?: TextMark[]): Record<string, boolean> {
  if (!marks) return {}

  return {
    'is-bold': marks.includes('bold'),
    'is-italic': marks.includes('italic'),
    'is-underline': marks.includes('underline')
  }
}
</script>

<style lang="scss" scoped>
.rich-text-renderer {
  white-space: pre-wrap; // 保留换行符
  display: inline;

  .is-bold {
    font-weight: bold;
  }

  .is-italic {
    font-style: italic;
  }

  .is-underline {
    text-decoration: underline;
  }

  .placeholder {
    color: $text-hint;
  }

  .rich-text-image {
    max-width: 100%;
    max-height: 80px;
    height: auto;
    border-radius: 4px;
    vertical-align: middle;
    object-fit: contain;
  }
}
</style>
