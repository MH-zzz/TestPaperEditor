<template>
  <view
    class="base-flow-node"
    :class="{
      active,
      'is-dragging': dragging,
      'is-drop-target': dropTarget,
      'is-drop-before': dropPosition === 'before',
      'is-drop-after': dropPosition === 'after',
      'is-just-moved': justMoved
    }"
    :style="nodeStyle"
    :draggable="draggable"
    @click="emit('select')"
    @dragstart="emit('drag-start', $event)"
    @dragover.stop.prevent="emit('drag-over', $event)"
    @drop.stop.prevent="emit('drop', $event)"
    @dragend="emit('drag-end', $event)"
  >
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  x: number
  y: number
  width: number
  height: number
  borderColor?: string
  active?: boolean
  draggable?: boolean
  dragging?: boolean
  dropTarget?: boolean
  dropPosition?: '' | 'before' | 'after'
  justMoved?: boolean
}>(), {
  borderColor: '#475569',
  active: false,
  draggable: false,
  dragging: false,
  dropTarget: false,
  dropPosition: '',
  justMoved: false
})

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'drag-start', event: Event): void
  (e: 'drag-over', event: Event): void
  (e: 'drop', event: Event): void
  (e: 'drag-end', event: Event): void
}>()

const nodeStyle = computed(() => {
  return {
    left: `${props.x}px`,
    top: `${props.y}px`,
    width: `${props.width}px`,
    height: `${props.height}px`,
    borderColor: props.borderColor
  }
})
</script>

<style lang="scss" scoped>
.base-flow-node {
  position: absolute;
  transition: top 180ms ease, box-shadow 140ms ease, opacity 120ms ease, transform 180ms ease;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-left-width: 4px;
  border-radius: 12px;
  padding: 8px 10px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
}

.base-flow-node.active {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.16), 0 6px 14px rgba(15, 23, 42, 0.1);
}

.base-flow-node.is-dragging {
  opacity: 0.68;
}

.base-flow-node.is-drop-target {
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.22), 0 8px 18px rgba(15, 23, 42, 0.12);
}

.base-flow-node.is-drop-before::before,
.base-flow-node.is-drop-after::after {
  content: '';
  position: absolute;
  left: -6px;
  right: -6px;
  height: 3px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.88);
  pointer-events: none;
}

.base-flow-node.is-drop-before::before {
  top: -6px;
}

.base-flow-node.is-drop-after::after {
  bottom: -6px;
}

.base-flow-node.is-just-moved {
  animation: flow-node-moved 360ms ease;
}

@keyframes flow-node-moved {
  0% {
    transform: scale(1.015);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2), 0 10px 18px rgba(15, 23, 42, 0.14);
  }
  100% {
    transform: scale(1);
  }
}
</style>
