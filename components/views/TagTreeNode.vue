<template>
  <view class="tree-node">
    <view
      class="tree-row"
      :class="{ selected: selectedId === node.id }"
      :style="{ paddingLeft: `${10 + level * 14}px` }"
      @click="$emit('select', node.id)"
    >
      <view class="toggle" @click.stop="toggle" v-if="hasChildren">
        <text>{{ expanded ? '▾' : '▸' }}</text>
      </view>
      <view class="toggle placeholder" v-else></view>

      <view class="title-wrap">
        <text class="title">{{ node.title || '(未命名)' }}</text>
        <text v-if="isSystemRoot" class="badge">系统</text>
      </view>

      <text v-if="hasChildren" class="count">{{ node.children.length }}</text>
    </view>

    <view v-if="hasChildren && expanded" class="children">
      <TagTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :expanded-ids="expandedIds"
        :selected-id="selectedId"
        :system-root-titles="systemRootTitles"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagNode } from '/types/tag'

defineOptions({ name: 'TagTreeNode' })

const props = defineProps<{
  node: TagNode
  level: number
  expandedIds: string[]
  selectedId?: string | null
  systemRootTitles?: string[]
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'select', id: string): void
}>()

const hasChildren = computed(() => !!props.node.children && props.node.children.length > 0)
const expanded = computed(() => props.expandedIds.includes(props.node.id))
const isSystemRoot = computed(() => {
  if (props.level !== 0) return false
  const title = (props.node.title || '').trim()
  return (props.systemRootTitles || []).includes(title)
})

function toggle() {
  if (!hasChildren.value) return
  emit('toggle', props.node.id)
}
</script>

<style scoped lang="scss">
.tree-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: background-color 0.15s, border-color 0.15s;
  cursor: pointer;

  &:hover {
    background-color: rgba(15, 23, 42, 0.04);
  }
}

.tree-row.selected {
  background: rgba(33, 150, 243, 0.12);
  border-color: rgba(33, 150, 243, 0.25);
}

.toggle {
  width: 18px;
  text-align: center;
  margin-right: 8px;
  color: $text-secondary;
  cursor: pointer;

  &.placeholder {
    cursor: default;
  }
}

.title-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.title {
  font-size: 13px;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.10);
  color: rgba(15, 23, 42, 0.60);
}

.count {
  flex-shrink: 0;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.65);
}

.children {
  margin-left: 6px;
}
</style>
