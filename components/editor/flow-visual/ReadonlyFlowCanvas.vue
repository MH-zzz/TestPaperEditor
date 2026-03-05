<template>
  <view class="readonly-flow-canvas" @click="closeContextMenu">
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
      ref="graphRef"
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
        @pointer-drag-start="onPointerDragStart"
        @pointer-drag-over="onPointerDragOver"
        @pointer-drag-drop="onPointerDragDrop"
        @pointer-drag-end="onPointerDragEnd"
        @context-menu="onNodeContextMenu"
      />

      <view
        v-if="contextMenu"
        class="readonly-flow-canvas__context-menu"
        :style="{ left: `${contextMenu.left}px`, top: `${contextMenu.top}px` }"
        @click.stop
      >
        <button
          class="readonly-flow-canvas__context-action"
          @click="previewFromNodeInContextMenu"
        >从此步预览</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
  (e: 'preview-from-node', payload: { nodeId: string }): void
}>()

const draggingNodeId = ref('')
const dropTarget = ref<{ nodeId: string; position: 'before' | 'after' } | null>(null)
const graphRef = ref<HTMLElement | null>(null)
const contextMenu = ref<{ nodeId: string; left: number; top: number } | null>(null)

type PointerPoint = {
  clientX: number
  clientY: number
}

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
  contextMenu.value = null
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
    clearDragState()
    return
  }

  if (!sourceId || !targetId || sourceId === targetId) {
    clearDragState()
    return
  }
  emit('reorder-node', { sourceId, targetId, position })
  clearDragState()
}

function onNodeDragEnd() {
  clearDragState()
}

function onPointerDragStart(payload: { nodeId: string }) {
  const nodeId = String(payload?.nodeId || '')
  if (!nodeId) return
  draggingNodeId.value = nodeId
  dropTarget.value = null
}

function onPointerDragOver(payload: { nodeId: string; position: 'before' | 'after' }) {
  if (!draggingNodeId.value) return
  const target = String(payload?.nodeId || '')
  const position = payload?.position === 'after' ? 'after' : 'before'
  if (!target || target === draggingNodeId.value) return
  dropTarget.value = { nodeId: target, position }
}

function onPointerDragDrop(payload: { targetId: string; position: 'before' | 'after' }) {
  const sourceId = String(draggingNodeId.value || '')
  const targetId = String(payload?.targetId || '')
  const position = payload?.position === 'after' ? 'after' : 'before'
  if (!sourceId || !targetId || sourceId === targetId) {
    clearDragState()
    return
  }
  emit('reorder-node', { sourceId, targetId, position })
  clearDragState()
}

function onPointerDragEnd() {
  clearDragState()
}

function clearDragState() {
  draggingNodeId.value = ''
  dropTarget.value = null
}

function clampContextMenuPosition(left: number, top: number): { left: number; top: number } {
  const menuWidth = 122
  const menuHeight = 38
  const maxLeft = Math.max(8, Number(props.graph.canvas.width || 0) - menuWidth - 8)
  const maxTop = Math.max(8, Number(props.graph.canvas.height || 0) - menuHeight - 8)
  return {
    left: Math.max(8, Math.min(left, maxLeft)),
    top: Math.max(8, Math.min(top, maxTop))
  }
}

function onNodeContextMenu(payload: { nodeId: string; clientX: number; clientY: number }) {
  const nodeId = String(payload?.nodeId || '')
  if (!nodeId) return
  const graphEl = graphRef.value
  if (!graphEl) return
  const rect = graphEl.getBoundingClientRect()
  const rawLeft = Number(payload.clientX || 0) - rect.left + 6
  const rawTop = Number(payload.clientY || 0) - rect.top + 6
  const next = clampContextMenuPosition(rawLeft, rawTop)
  contextMenu.value = {
    nodeId,
    left: next.left,
    top: next.top
  }
}

function closeContextMenu() {
  contextMenu.value = null
}

function previewFromNodeInContextMenu() {
  if (!contextMenu.value) return
  emit('preview-from-node', { nodeId: contextMenu.value.nodeId })
  closeContextMenu()
}

function resolveDropTargetFromPoint(point: PointerPoint): { nodeId: string; position: 'before' | 'after' } | null {
  if (typeof document === 'undefined') return null
  const el = document.elementFromPoint(point.clientX, point.clientY) as HTMLElement | null
  const nodeEl = el?.closest?.('[data-flow-node-id]') as HTMLElement | null
  if (!nodeEl) return null
  const nodeId = String(nodeEl.dataset.flowNodeId || '')
  if (!nodeId || nodeId === draggingNodeId.value) return null
  const rect = nodeEl.getBoundingClientRect()
  const middle = rect.top + rect.height / 2
  const position: 'before' | 'after' = point.clientY > middle ? 'after' : 'before'
  return { nodeId, position }
}

function syncDropTargetFromPoint(point: PointerPoint) {
  if (!draggingNodeId.value) return
  const next = resolveDropTargetFromPoint(point)
  dropTarget.value = next
}

function onWindowPointerMove(event: MouseEvent) {
  if (!draggingNodeId.value) return
  syncDropTargetFromPoint({ clientX: event.clientX, clientY: event.clientY })
}

function onWindowPointerRelease(event: MouseEvent) {
  if (!draggingNodeId.value) return
  const target = resolveDropTargetFromPoint({ clientX: event.clientX, clientY: event.clientY }) || dropTarget.value
  if (target) {
    emit('reorder-node', {
      sourceId: draggingNodeId.value,
      targetId: target.nodeId,
      position: target.position
    })
  }
  clearDragState()
}

function onWindowClickOutside(event: MouseEvent) {
  if (!contextMenu.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest?.('.readonly-flow-canvas__context-menu')) return
  closeContextMenu()
}

function readTouchPoint(evt: TouchEvent): PointerPoint | null {
  const touch = evt.touches?.[0] || evt.changedTouches?.[0]
  if (!touch) return null
  return {
    clientX: touch.clientX,
    clientY: touch.clientY
  }
}

function onWindowTouchMove(event: TouchEvent) {
  if (!draggingNodeId.value) return
  const point = readTouchPoint(event)
  if (!point) return
  syncDropTargetFromPoint(point)
}

function onWindowTouchEnd(event: TouchEvent) {
  if (!draggingNodeId.value) return
  const point = readTouchPoint(event)
  const target = point ? (resolveDropTargetFromPoint(point) || dropTarget.value) : dropTarget.value
  if (target) {
    emit('reorder-node', {
      sourceId: draggingNodeId.value,
      targetId: target.nodeId,
      position: target.position
    })
  }
  clearDragState()
}

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('mousemove', onWindowPointerMove)
  window.addEventListener('mouseup', onWindowPointerRelease)
  window.addEventListener('touchmove', onWindowTouchMove)
  window.addEventListener('touchend', onWindowTouchEnd)
  window.addEventListener('mousedown', onWindowClickOutside)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('mousemove', onWindowPointerMove)
  window.removeEventListener('mouseup', onWindowPointerRelease)
  window.removeEventListener('touchmove', onWindowTouchMove)
  window.removeEventListener('touchend', onWindowTouchEnd)
  window.removeEventListener('mousedown', onWindowClickOutside)
})
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

.readonly-flow-canvas__context-menu {
  position: absolute;
  z-index: 12;
  min-width: 118px;
  padding: 4px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
}

.readonly-flow-canvas__context-action {
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.08);
  color: rgba(29, 78, 216, 0.95);
  font-size: 12px;
  font-weight: 700;
  padding: 7px 8px;
  line-height: 1;
}
</style>
