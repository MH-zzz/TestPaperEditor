<template>
  <BaseFlowNode
    :node-id="node.id"
    :x="node.position.x"
    :y="node.position.y"
    :width="node.size.width"
    :height="node.size.height"
    :border-color="node.color"
    :active="active"
    :draggable="false"
    :dragging="dragging"
    :drop-target="dropTarget"
    :drop-position="dropPosition"
    :just-moved="justMoved"
    @select="emit('select')"
    @drag-start="onDragStart"
    @drag-over="onDragOver"
    @drop="onDrop"
    @drag-end="onDragEnd"
    @pointer-down="onPointerDown"
    @pointer-move="onPointerMove"
    @pointer-up="onPointerUp"
    @context-menu="onContextMenu"
  >
    <text class="step-flow-node__title">{{ node.label }}</text>
    <text class="step-flow-node__subtitle">{{ node.subtitle || '无附加信息' }}</text>
    <text class="step-flow-node__meta">{{ metaLine }}</text>
  </BaseFlowNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowVisualNode } from '/types'
import type { ReadonlyFlowNodePayload } from '/components/views/flow-modules/useReadonlyFlowGraph'
import BaseFlowNode from './BaseFlowNode.vue'

type FlowNodeDropPosition = 'before' | 'after'

const props = withDefaults(defineProps<{
  node: FlowVisualNode<ReadonlyFlowNodePayload>
  active?: boolean
  reorderable?: boolean
  dragging?: boolean
  dropTarget?: boolean
  dropPosition?: '' | FlowNodeDropPosition
  justMoved?: boolean
}>(), {
  active: false,
  reorderable: false,
  dragging: false,
  dropTarget: false,
  dropPosition: '',
  justMoved: false
})

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'drag-start', nodeId: string): void
  (e: 'drag-over', payload: { nodeId: string; position: FlowNodeDropPosition }): void
  (e: 'drop-on-node', payload: { sourceId: string; targetId: string; position: FlowNodeDropPosition; flowKind?: string }): void
  (e: 'drag-end', nodeId: string): void
  (e: 'pointer-drag-start', payload: { nodeId: string }): void
  (e: 'pointer-drag-over', payload: { nodeId: string; position: FlowNodeDropPosition }): void
  (e: 'pointer-drag-drop', payload: { targetId: string; position: FlowNodeDropPosition }): void
  (e: 'pointer-drag-end'): void
  (e: 'context-menu', payload: { nodeId: string; clientX: number; clientY: number }): void
}>()

const metaLine = computed(() => {
  const data = props.node?.data
  if (!data) return ''
  const list: string[] = []
  if (data.categoryLabel) list.push(data.categoryLabel)
  if (data.autoNextLabel) list.push(data.autoNextLabel)
  return list.join(' · ')
})

function onDragStart(event: Event) {
  if (!props.reorderable) return
  const drag = event as DragEvent
  const transfer = drag.dataTransfer
  if (transfer) {
    transfer.effectAllowed = 'move'
    transfer.setData('text/flow-node-id', props.node.id)
  }
  emit('drag-start', props.node.id)
}

function resolveDropPosition(event: Event): FlowNodeDropPosition {
  const drag = event as DragEvent
  // Fix: currentTarget is null when passed out of the component scope.
  // We use target.closest to find the wrapper element.
  let target = drag.target as Element | null
  // Handle text nodes if necessary (though rare in this setup)
  if (target && target.nodeType === 3) {
    target = target.parentElement
  }
  
  const nodeEl = target?.closest?.('.base-flow-node')
  if (!nodeEl) return 'before'

  const rect = nodeEl.getBoundingClientRect()
  const middle = rect.top + rect.height / 2
  return drag.clientY > middle ? 'after' : 'before'
}

function onDragOver(event: Event) {
  if (!props.reorderable) return
  console.log('[StepFlowNode] onDragOver', props.node.id)
  emit('drag-over', {
    nodeId: props.node.id,
    position: resolveDropPosition(event)
  })
}

function onDrop(event: Event) {
  if (!props.reorderable) return
  const drag = event as DragEvent
  const sourceId = String(drag.dataTransfer?.getData('text/flow-node-id') || '')
  const flowKind = String(drag.dataTransfer?.getData('text/flow-kind') || '')
  console.log('[StepFlowNode] onDrop', { sourceId, flowKind, targetId: props.node.id })
  emit('drop-on-node', {
    sourceId,
    targetId: props.node.id,
    position: resolveDropPosition(event),
    flowKind: flowKind || undefined
  })
}

function onDragEnd() {
  if (!props.reorderable) return
  emit('drag-end', props.node.id)
}

function onPointerDown() {
  if (!props.reorderable) return
  emit('pointer-drag-start', { nodeId: props.node.id })
}

function onPointerMove(event: Event) {
  if (!props.reorderable) return
  emit('pointer-drag-over', {
    nodeId: props.node.id,
    position: resolveDropPosition(event)
  })
}

function onPointerUp(event: Event) {
  if (!props.reorderable) return
  emit('pointer-drag-drop', {
    targetId: props.node.id,
    position: resolveDropPosition(event)
  })
  emit('pointer-drag-end')
}

function onContextMenu(event: Event) {
  const mouse = event as MouseEvent
  emit('context-menu', {
    nodeId: props.node.id,
    clientX: Number(mouse.clientX || 0),
    clientY: Number(mouse.clientY || 0)
  })
}
</script>

<style lang="scss" scoped>
.step-flow-node__title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.86);
}

.step-flow-node__subtitle {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.58);
  line-height: 1.4;
}

.step-flow-node__meta {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(2, 132, 199, 0.8);
}
</style>
