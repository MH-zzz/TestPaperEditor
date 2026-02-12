<template>
  <view class="side-navigation">
    <!-- 一级导航 (图标栏) -->
    <view class="nav-primary">
      <view class="logo-area">
        <image class="logo-icon" src="/static/Icon.png" mode="aspectFit" />
      </view>
      
      <view 
        class="nav-item" 
        :class="{ active: currentModule === 'editor' }"
        @click="switchModule('editor')"
      >
        <text class="nav-icon">✏️</text>
        <text class="nav-label">编辑</text>
      </view>

      <view
        class="nav-item"
        :class="{ active: currentModule === 'learning' }"
        @click="switchModule('learning')"
      >
        <text class="nav-icon">🎯</text>
        <text class="nav-label">学习</text>
      </view>

      <view
        class="nav-item"
        :class="{ active: currentModule === 'templates' }"
        @click="switchModule('templates')"
      >
        <text class="nav-icon">🧩</text>
        <text class="nav-label">题型模板</text>
      </view>

      <view
        class="nav-item"
        :class="{ active: currentModule === 'flows' }"
        @click="switchModule('flows')"
      >
        <text class="nav-icon">🧭</text>
        <text class="nav-label">题型流程</text>
      </view>
      
      <view 
        class="nav-item" 
        :class="{ active: currentModule === 'tags' }"
        @click="switchModule('tags')"
      >
        <text class="nav-icon">🏷️</text>
        <text class="nav-label">标签</text>
      </view>
      
      <view 
        class="nav-item" 
        :class="{ active: currentModule === 'library' }"
        @click="switchModule('library')"
      >
        <text class="nav-icon">📚</text>
        <text class="nav-label">题库</text>
      </view>
    </view>

    <!-- 二级导航 (扩展栏) -->
    <view class="nav-secondary" v-if="currentModule === 'editor'">
      <view class="nav-scroll-content">
        <!-- 标签设置 -->
        <view class="sec-group">
          <view class="sec-title">预设标签</view>
          <view class="tag-panel">
            <!-- Tree -->
            <view class="tree-list">
              <TagTreeOption
                v-for="node in treeRoots"
                :key="node.id"
                :node="node"
                :level="0"
                :expanded-ids="expandedIds"
                :selected-ids="selectedTags"
                :disable-root-select="true"
                :descendant-selected-count-by-id="descendantSelectedCountById"
                @toggle="toggleExpand"
                @toggle-select="toggleSelect"
              />
            </view>

            <!-- Selected -->
            <view class="selected-panel">
              <view class="selected-header">
                <text class="selected-title">已选</text>
                <view class="selected-actions">
                  <button class="btn btn-text btn-xs" @click="clearAll">清空全部</button>
                </view>
              </view>
              <view class="pill-list">
                <view v-for="item in displayedSelected" :key="item.id" class="pill">
                  <text class="pill-text">{{ item.path }}</text>
                  <text class="pill-remove" @click.stop="removeTag(item.id)">×</text>
                </view>
                <view v-if="displayedSelected.length === 0" class="tag-empty">暂无已选</view>
              </view>
            </view>

            <!-- Source -->
            <view class="source-panel">
              <text class="source-title">来源</text>
              <input
                class="source-input"
                v-model="sourceText"
                placeholder="手动输入来源"
                @input="onSourceInput"
              />
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TagTreeOption from '/components/editor/TagTreeOption.vue'
import { tagStore } from '/stores/tag'
import { questionDraft } from '/stores/questionDraft'

const props = defineProps<{
  module?: string
}>()

const emit = defineEmits<{
  (e: 'update:module', module: string): void
}>()

const currentModule = computed<string>({
  get: () => props.module || 'editor',
  set: (mod) => emit('update:module', mod)
})
const selectedTags = ref<string[]>([])
const sourceText = ref('')
const expandedIds = ref<string[]>([])

const SINGLE_ROOTS = new Set(['教材版本', '学期', '年级', '年份', '难度'])
const MULTI_ROOTS = new Set(['知识点', '地区', '场景'])

function switchModule(mod: string) {
  currentModule.value = mod
}

function loadCurrentQuestion() {
  const data: any = questionDraft.state.currentQuestion
  if (!data) {
    selectedTags.value = []
    sourceText.value = ''
    return
  }
  if (!data.metadata) data.metadata = {}
  if (!data.metadata.tags) data.metadata.tags = []
  selectedTags.value = [...data.metadata.tags]
  sourceText.value = data.metadata.source || ''
}

function saveCurrentQuestion(tags: string[], source?: string) {
  questionDraft.updateMetadata({
    tags,
    source
  })
}

function updateTags(tags: string[]) {
  selectedTags.value = tags
  saveCurrentQuestion(tags)
}

function updateSource(val: string) {
  sourceText.value = val
  saveCurrentQuestion(selectedTags.value, val)
}

function onSourceInput(e: any) {
  const value = e?.detail?.value ?? sourceText.value
  updateSource(value)
}

function removeTag(id: string) {
  const next = selectedTags.value.filter(t => t !== id)
  updateTags(next)
}

const treeRoots = computed(() => {
  return tagStore.state.tree
})

const descendantSelectedCountById = computed<Record<string, number>>(() => {
  const selectedSet = new Set(selectedTags.value)
  const map: Record<string, number> = {}

  const walk = (node: any): number => {
    let total = selectedSet.has(node.id) ? 1 : 0
    ;(node.children || []).forEach((c: any) => {
      total += walk(c)
    })
    map[node.id] = total - (selectedSet.has(node.id) ? 1 : 0)
    return total
  }

  tagStore.state.tree.forEach((n: any) => walk(n))
  return map
})

const displayedSelected = computed(() => {
  const out: { id: string; path: string }[] = []
  selectedTags.value.forEach((id) => {
    out.push({ id, path: tagStore.getPath(id) || id })
  })
  return out
})

function toggleExpand(id: string) {
  const list = expandedIds.value
  if (list.includes(id)) expandedIds.value = list.filter(x => x !== id)
  else expandedIds.value = [...list, id]
}

function toggleSelect(id: string) {
  const root = tagStore.getRootCategory(id)
  if (!root) return

  // Prevent selecting root category nodes; treat as expand/collapse.
  const isRootNode = tagStore.state.tree.some(n => n.id === id)
  if (isRootNode) {
    toggleExpand(id)
    return
  }

  let next = [...selectedTags.value]
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

  updateTags(next)
}

function clearAll() {
  updateTags([])
}

watch(() => questionDraft.state.currentQuestion, loadCurrentQuestion, { deep: true, immediate: true })
</script>

<style lang="scss" scoped>
.side-navigation {
  display: flex;
  height: 100%;
  background-color: #fff;
  border-right: 1px solid $border-color;
}

// 一级导航
.nav-primary {
  width: 64px;
  background-color: #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  flex-shrink: 0;
}

.logo-area {
  margin-bottom: 30px;
  .logo-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }
}

.nav-item {
  width: 100%;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #a0aec0;
  transition: all 0.2s;
  
  &:hover {
    color: #fff;
    background-color: rgba(255,255,255,0.1);
  }
  
  &.active {
    color: #fff;
    background-color: $primary-color;
  }
  
  .nav-icon {
    font-size: 20px;
    margin-bottom: 4px;
  }
  
  .nav-label {
    font-size: 10px;
  }
}

// 二级导航
.nav-secondary {
  width: 220px;
  background-color: #f8f9fa;
  border-right: 1px solid $border-color;
  display: flex;
  flex-direction: column;
}

.nav-scroll-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
}

.sec-group {
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.sec-title {
  padding: 20px 16px 10px;
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  text-transform: uppercase;
}

.tag-summary {
  padding: 0 12px 12px;
}

.tag-panel {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.tree-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  padding: 6px;
}

.selected-panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 10px 10px;
  background: rgba(255, 255, 255, 0.85);
}

.selected-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.selected-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.75);
}

.selected-actions {
  display: flex;
  gap: 6px;
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
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: #fff;
  font-size: 11px;
}

.pill-text {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pill-remove {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.45);
}

.source-panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 10px 10px;
  background: rgba(255, 255, 255, 0.85);
}

.source-title {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.75);
  margin-bottom: 8px;
}

.tag-group {
  margin-bottom: 10px;
}

.tag-group__title {
  font-size: 11px;
  color: $text-secondary;
  margin-bottom: 6px;
  display: block;
}

.tag-group__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background-color: #fff;
  border: 1px solid $border-color;
  border-radius: 10px;
  font-size: 11px;
}

.tag-remove {
  font-size: 12px;
  color: #999;
}

.tag-empty {
  font-size: 11px;
  color: $text-hint;
  padding: 2px 0;
}

.source-input {
  width: 100%;
  height: 34px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0 10px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.9);
}

.type-list {
  padding: 8px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: $text-primary;
  transition: all 0.2s;

  .type-icon {
    font-size: 16px;
  }

  &:hover {
    background-color: #e9ecef;
  }

  &.active {
    background-color: #fff;
    color: $primary-color;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    font-weight: 500;
  }
}
</style>
