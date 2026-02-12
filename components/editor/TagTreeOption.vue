<template>
  <view class="tree-option">
    <view
      class="tree-row"
      :class="{
        'tree-row--child-selected': !selected && descendantSelectedCount > 0,
        'tree-row--selected': selected
      }"
      :style="{ paddingLeft: `${level * 14}px` }"
    >
      <view class="toggle" @click.stop="toggleExpand" v-if="hasChildren">
        <text>{{ expanded ? '▾' : '▸' }}</text>
      </view>
      <view class="toggle placeholder" v-else></view>
      <view class="check" @click.stop="onToggleSelect">
        <view class="box" :class="{ active: selected, partial: !selected && descendantSelectedCount > 0, disabled: selectDisabled }">
          <text v-if="selected">✓</text>
          <text v-else-if="descendantSelectedCount > 0">•</text>
        </view>
      </view>
      <text class="title" @click.stop="onToggleSelect">{{ node.title || '(未命名)' }}</text>
      <view v-if="!selected && descendantSelectedCount > 0" class="meta">
        <text class="badge">{{ descendantSelectedCount }}</text>
      </view>
    </view>

    <view v-if="hasChildren && expanded" class="children">
      <TagTreeOption
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :expanded-ids="expandedIds"
        :selected-ids="selectedIds"
        :disable-root-select="disableRootSelect"
        :descendant-selected-count-by-id="descendantSelectedCountById"
        @toggle="$emit('toggle', $event)"
        @toggle-select="$emit('toggle-select', $event)"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagNode } from '/types/tag'

defineOptions({ name: 'TagTreeOption' })

const props = defineProps<{
  node: TagNode
  level: number
  expandedIds: string[]
  selectedIds: string[]
  disableRootSelect?: boolean
  descendantSelectedCountById?: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'toggle-select', id: string): void
}>()

const hasChildren = computed(() => !!props.node.children && props.node.children.length > 0)
const expanded = computed(() => props.expandedIds.includes(props.node.id))
const selected = computed(() => props.selectedIds.includes(props.node.id))
const selectDisabled = computed(() => !!props.disableRootSelect && props.level === 0)

const descendantSelectedCount = computed(() => {
  return props.descendantSelectedCountById?.[props.node.id] || 0
})

function toggleExpand() {
  if (!hasChildren.value) return
  emit('toggle', props.node.id)
}

function onToggleSelect() {
  if (selectDisabled.value) {
    toggleExpand()
    return
  }
  emit('toggle-select', props.node.id)
}
</script>

<style scoped lang="scss">
.tree-row {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f7f8fa;
  }
}

.tree-row--child-selected {
  background: rgba(33, 150, 243, 0.06);
}

.tree-row--selected {
  background: rgba(33, 150, 243, 0.10);
}

.toggle {
  width: 16px;
  text-align: center;
  margin-right: 6px;
  color: $text-secondary;
  cursor: pointer;

  &.placeholder {
    cursor: default;
  }
}

.check {
  margin-right: 6px;
}

.box {
  width: 16px;
  height: 16px;
  border: 1px solid $border-color;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  background-color: #fff;
  &.active {
    background-color: $primary-color;
    border-color: $primary-color;
  }
  &.partial {
    background-color: rgba(33, 150, 243, 0.12);
    border-color: rgba(33, 150, 243, 0.35);
    color: #0b63c6;
  }
  &.disabled {
    opacity: 0.55;
  }
  &.disabled.partial {
    opacity: 0.9;
  }
}

.title {
  flex: 1;
  font-size: 13px;
  color: $text-primary;
}

.meta {
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
}

.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(33, 150, 243, 0.16);
  border: 1px solid rgba(33, 150, 243, 0.22);
  color: #0b63c6;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.children {
  margin-left: 6px;
}
</style>
