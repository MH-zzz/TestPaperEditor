<template>
  <view class="readonly-flow-canvas">
    <view class="readonly-flow-canvas__legend">
      <view
        v-for="item in legendItems"
        :key="item.key"
        class="readonly-flow-canvas__legend-item"
      >
        <text class="readonly-flow-canvas__legend-dot" :style="{ backgroundColor: item.color }" />
        <text class="readonly-flow-canvas__legend-text">{{ item.label }}</text>
      </view>
    </view>

    <view
      class="readonly-flow-canvas__graph"
      :style="{ width: `${graph.canvas.width}px`, height: `${graph.canvas.height}px` }"
    >
      <view
        v-for="edge in graph.edges"
        :key="edge.id"
        class="readonly-flow-canvas__edge"
        :style="{
          left: `${Number(edge.x || 0)}px`,
          top: `${Number(edge.y || 0)}px`,
          height: `${Math.max(0, Number(edge.height || 0))}px`
        }"
      />

      <StepFlowNode
        v-for="node in graph.nodes"
        :key="node.id"
        :node="node"
        :active="node.id === activeNodeId"
        :reorderable="true"
        :dragging="node.id === draggingNodeId"
        :drop-target="dropTarget?.nodeId === node.id"
        :drop-position="dropTarget?.nodeId === node.id ? dropTarget.position : ''"
        :just-moved="node.id === props.recentlyMovedNodeId"
        @select="emit('select-node', node.id)"
        @drag-start="onNodeDragStart"
        @drag-over="onNodeDragOver"
        @drop-on-node="onNodeDrop"
        @drag-end="onNodeDragEnd"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FlowVisualGraph } from '/types'
import type { ReadonlyFlowNodePayload } from '/components/views/flow-modules/useReadonlyFlowGraph'
import StepFlowNode from './StepFlowNode.vue'

type LegendItem = {
  key: string
  label: string
  color: string
}

const props = defineProps<{
  graph: FlowVisualGraph<ReadonlyFlowNodePayload>
  activeNodeId: string
  recentlyMovedNodeId?: string
}>()

const emit = defineEmits<{
  (e: 'select-node', nodeId: string): void
  (e: 'reorder-node', payload: { sourceId: string; targetId: string; position: 'before' | 'after' }): void
  (e: 'insert-stencil-near-node', payload: { kind: string; targetId: string; position: 'before' | 'after' }): void
}>()

const draggingNodeId = ref('')
const dropTarget = ref<{ nodeId: string; position: 'before' | 'after' } | null>(null)

const legendItems = computed<LegendItem[]>(() => {
  const map = new Map<string, LegendItem>()
  for (const node of props.graph.nodes || []) {
    const key = String(node.data?.category || 'misc')
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: node.data?.categoryLabel || '其他',
        color: node.color
      })
    }
  }
  return Array.from(map.values())
})

function onNodeDragStart(nodeId: string) {
  draggingNodeId.value = String(nodeId || '')
  dropTarget.value = null
}

function onNodeDragOver(payload: { nodeId: string; position: 'before' | 'after' }) {
  const target = String(payload?.nodeId || '')
  const position = payload?.position === 'after' ? 'after' : 'before'
  if (!target || target === draggingNodeId.value) return
  dropTarget.value = {
    nodeId: target,
    position
  }
}

function onNodeDrop(payload: { sourceId: string; targetId: string; position: 'before' | 'after'; flowKind?: string }) {
  const sourceId = String(payload?.sourceId || draggingNodeId.value || '')
  const targetId = String(payload?.targetId || '')
  const position = payload?.position === 'after' ? 'after' : 'before'
  const flowKind = String(payload?.flowKind || '')

  if (!sourceId && flowKind && targetId) {
    emit('insert-stencil-near-node', {
      kind: flowKind,
      targetId,
      position
    })
    draggingNodeId.value = ''
    dropTarget.value = null
    return
  }

  if (!sourceId || !targetId || sourceId === targetId) {
    draggingNodeId.value = ''
    dropTarget.value = null
    return
  }
  emit('reorder-node', { sourceId, targetId, position })
  draggingNodeId.value = ''
  dropTarget.value = null
}

function onNodeDragEnd() {
  draggingNodeId.value = ''
  dropTarget.value = null
}
</script>

<style lang="scss" scoped>
.readonly-flow-canvas {
  min-width: 0;
}

.readonly-flow-canvas__legend {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.readonly-flow-canvas__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.86);
}

.readonly-flow-canvas__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.readonly-flow-canvas__legend-text {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.66);
}

.readonly-flow-canvas__graph {
  position: relative;
  margin: 0 auto;
}

.readonly-flow-canvas__edge {
  position: absolute;
  width: 2px;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.42);
  border-radius: 999px;
}
</style>
