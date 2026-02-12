<template>
  <view class="flow-stencil">
    <text class="flow-stencil__title">元件库</text>
    <text class="flow-stencil__desc">线性模式：点击元件追加到流程尾部</text>

    <view
      v-for="item in items"
      :key="item.kind"
      class="flow-stencil__item"
      :style="{ borderLeftColor: item.color }"
      draggable="true"
      @dragstart="(e) => onDragStart(e, item.kind)"
      @dragend="emit('drag-end')"
    >
      <view class="flow-stencil__main">
        <text class="flow-stencil__name">{{ item.label }}</text>
        <text class="flow-stencil__meta">{{ item.categoryLabel }} · {{ item.description }}</text>
      </view>
      <button class="btn btn-outline btn-xs" @click="emit('add', item.kind)">添加</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { FlowStencilItem } from '/components/views/flow-modules/useEditableFlowGraph'

defineProps<{
  items: FlowStencilItem[]
}>()

const emit = defineEmits<{
  (e: 'add', kind: string): void
  (e: 'drag-start', kind: string): void
  (e: 'drag-end'): void
}>()

function onDragStart(event: Event, kind: string) {
  const drag = event as DragEvent
  const dataTransfer = drag.dataTransfer
  if (dataTransfer) {
    dataTransfer.effectAllowed = 'copy'
    dataTransfer.setData('text/flow-kind', kind)
    dataTransfer.setData('text/plain', kind)
  }
  emit('drag-start', kind)
}
</script>

<style lang="scss" scoped>
.flow-stencil {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-stencil__title {
  font-size: 13px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.88);
}

.flow-stencil__desc {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.flow-stencil__item {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-left-width: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  padding: 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.flow-stencil__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.flow-stencil__name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.86);
}

.flow-stencil__meta {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
  line-height: 1.35;
}
</style>
