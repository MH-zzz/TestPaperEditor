<template>
  <view class="flow-step-quick-add" :class="className">
    <template v-for="item in items" :key="item.key">
      <button
        v-if="item && item.visible !== false"
        class="btn btn-outline btn-xs"
        :disabled="!!item.disabled"
        @click="emit('add', item.key)"
      >
        + {{ item.label }}
      </button>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type FlowStepQuickAddItem = {
  key: string
  label: string
  visible?: boolean
  disabled?: boolean
}

const props = defineProps<{
  items: FlowStepQuickAddItem[]
  className?: string
}>()

const emit = defineEmits<{
  (e: 'add', key: string): void
}>()

const items = computed(() => {
  return props.items || []
})
</script>

<style lang="scss" scoped>
.flow-step-quick-add {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
