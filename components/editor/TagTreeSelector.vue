<template>
  <view v-if="visible" class="modal-mask">
    <view class="modal-content">
      <view class="modal-header">
        <text>选择标签</text>
        <text class="close" @click="$emit('close')">×</text>
      </view>

      <view class="modal-body">
        <view class="left-panel">
          <input
            class="search-input"
            v-model="search"
            placeholder="搜索标签..."
          />
          <view v-if="search" class="search-results">
            <view
              v-for="item in filteredResults"
              :key="item.id"
              class="search-item"
              @click="toggleSelect(item.id)"
            >
              <text class="search-path">{{ item.path }}</text>
            </view>
            <view v-if="filteredResults.length === 0" class="empty-tip">无匹配结果</view>
          </view>
          <view v-else class="tree-list">
            <TagTreeOption
              v-for="node in treeRoots"
              :key="node.id"
              :node="node"
              :level="0"
              :expanded-ids="expandedIds"
              :selected-ids="modelValue"
              @toggle="toggleExpand"
              @toggle-select="toggleSelect"
            />
          </view>
        </view>

        <view class="right-panel">
          <view class="panel-section">
            <view class="section-title">已选标签</view>
            <view v-for="(items, category) in groupedSelected" :key="category" class="group-block">
              <text class="group-title">{{ category }}</text>
              <view class="pill-list">
                <view v-for="item in items" :key="item.id" class="pill">
                  <text class="pill-text">{{ item.path }}</text>
                  <text class="pill-remove" @click="removeTag(item.id)">×</text>
                </view>
              </view>
            </view>
          </view>

          <view class="panel-section">
            <view class="section-title">来源</view>
            <input
              class="source-input"
              v-model="localSource"
              placeholder="请输入来源（手动）"
              @input="emitSource"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TagTreeOption from './TagTreeOption.vue'
import { tagStore } from '/stores/tag'

const props = defineProps<{
  visible: boolean
  modelValue: string[]
  source?: string
  activeRoot?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'update:source', value: string): void
  (e: 'close'): void
}>()

const SINGLE_ROOTS = new Set(['教材版本', '学期', '年级', '年份', '难度'])
const MULTI_ROOTS = new Set(['知识点', '地区', '场景'])

const expandedIds = ref<string[]>([])
const search = ref('')
const localSource = ref(props.source || '')

watch(() => props.source, (val) => {
  localSource.value = val || ''
})

const activeRootNode = computed(() => {
  if (!props.activeRoot) return null
  return tagStore.state.tree.find(node => (node.title || '').trim() === props.activeRoot) || null
})

const treeRoots = computed(() => {
  if (props.activeRoot) {
    return activeRootNode.value?.children || []
  }
  return tagStore.state.tree
})

const filteredResults = computed(() => {
  const keyword = search.value.trim()
  if (!keyword) return []
  const results: { id: string; path: string }[] = []
  Object.entries(tagStore.state.index.pathById).forEach(([id, path]) => {
    if (path.includes(keyword)) {
      if (props.activeRoot && !path.startsWith(props.activeRoot)) return
      results.push({ id, path })
    }
  })
  return results.slice(0, 200)
})

const groupedSelected = computed(() => {
  const groups: Record<string, { id: string; path: string }[]> = {}
  props.modelValue.forEach((id) => {
    const category = tagStore.getRootCategory(id) || '其他'
    const path = tagStore.getPath(id) || id
    if (!groups[category]) groups[category] = []
    groups[category].push({ id, path })
  })
  if (props.activeRoot) {
    return { [props.activeRoot]: groups[props.activeRoot] || [] }
  }
  return groups
})

function toggleExpand(id: string) {
  const list = expandedIds.value
  if (list.includes(id)) {
    expandedIds.value = list.filter(x => x !== id)
  } else {
    expandedIds.value = [...list, id]
  }
}

function toggleSelect(id: string) {
  const root = tagStore.getRootCategory(id)
  if (!root) return
  if (props.activeRoot && root !== props.activeRoot) return

  let next = [...props.modelValue]
  const exists = next.includes(id)

  if (SINGLE_ROOTS.has(root)) {
    next = next.filter(tid => tagStore.getRootCategory(tid) !== root)
    if (!exists) next.push(id)
  } else if (MULTI_ROOTS.has(root)) {
    if (exists) next = next.filter(tid => tid !== id)
    else next.push(id)
  } else {
    if (exists) next = next.filter(tid => tid !== id)
    else next.push(id)
  }

  emit('update:modelValue', next)
}

function removeTag(id: string) {
  emit('update:modelValue', props.modelValue.filter(tid => tid !== id))
}

function emitSource() {
  emit('update:source', localSource.value)
}
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 860px;
  max-width: 92vw;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.close {
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.left-panel {
  flex: 1;
  min-height: 420px;
  border-right: 1px solid #f0f0f0;
  padding-right: 16px;
}

.right-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input {
  width: 100%;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0 10px;
  margin-bottom: 12px;
  font-size: 13px;
}

.tree-list {
  max-height: 480px;
  overflow-y: auto;
}

.search-results {
  max-height: 480px;
  overflow-y: auto;
}

.search-item {
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 6px;
  &:hover { background-color: #f7f8fa; }
}

.search-path {
  font-size: 12px;
  color: $text-primary;
}

.empty-tip {
  font-size: 12px;
  color: $text-hint;
  padding: 8px;
}

.panel-section {
  background-color: #fafafa;
  border-radius: 8px;
  padding: 12px;
}

.section-title {
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 8px;
}

.group-block {
  margin-bottom: 10px;
  &:last-child { margin-bottom: 0; }
}

.group-title {
  font-size: 12px;
  color: $text-secondary;
  display: block;
  margin-bottom: 6px;
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background-color: #fff;
  border: 1px solid $border-color;
  border-radius: 12px;
  font-size: 11px;
}

.pill-remove {
  color: #999;
  cursor: pointer;
}

.source-input {
  width: 100%;
  height: 34px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
}
</style>
