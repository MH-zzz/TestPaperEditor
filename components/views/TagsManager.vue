<template>
  <view class="tags-manager">
    <view class="tm-header">
      <view class="tm-title">
        <text class="tm-title__main">标签管理</text>
        <text class="tm-title__sub">维护标签树，支持新增/改名/删除</text>
      </view>

      <view class="tm-header__actions">
        <button class="btn btn-outline btn-sm" @click="startCreateRoot">+ 新建根类</button>
        <button class="btn btn-text btn-sm" @click="expandAll">展开全部</button>
        <button class="btn btn-text btn-sm" @click="collapseAll">收起全部</button>
      </view>
    </view>

    <view class="tm-body">
      <!-- Left: Tree -->
      <view class="tm-left">
        <view class="panel">
          <view class="panel__top">
            <text class="panel__title">标签树</text>
            <view class="panel__tools">
              <text class="panel__tip">点击节点查看详情</text>
            </view>
          </view>

          <view class="panel__search">
            <input
              class="search-input"
              v-model="keyword"
              placeholder="搜索标签 (按名称或路径)..."
              @confirm="onSearchConfirm"
            />
            <button v-if="keyword" class="btn btn-outline btn-xs" @click="clearSearch">清除</button>
          </view>

          <scroll-view scroll-y class="panel__scroll">
            <view v-if="keyword" class="results">
              <view class="results__meta">
                <text class="results__meta-text">匹配 {{ searchResults.length }} 条</text>
              </view>
              <view
                v-for="item in searchResults"
                :key="item.id"
                class="result-item"
                @click="openSearchResult(item.id)"
              >
                <text class="result-path">{{ item.path }}</text>
              </view>
              <view v-if="searchResults.length === 0" class="empty-tip">无匹配结果</view>
            </view>

            <view v-else class="tree">
              <TagTreeNode
                v-for="node in treeRoots"
                :key="node.id"
                :node="node"
                :level="0"
                :expanded-ids="expandedIds"
                :selected-id="selectedId"
                :system-root-titles="SYSTEM_ROOT_TITLES_ARRAY"
                @toggle="toggleExpand"
                @select="selectNode"
              />
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- Right: Details -->
      <view class="tm-right">
        <view class="panel detail">
          <view class="panel__top">
            <text class="panel__title">详情</text>
            <view class="panel__tools">
              <text v-if="selectedPath" class="detail-path">{{ selectedPath }}</text>
            </view>
          </view>

          <scroll-view scroll-y class="detail__scroll">
            <view v-if="creatingRoot" class="detail__content">
              <view class="section">
                <text class="section__title">新建根类</text>
                <text class="section__hint">根类会作为标签树的一级目录。</text>
              </view>

              <view class="field">
                <text class="field__label">名称</text>
                <input
                  class="text-input"
                  v-model="newRootTitle"
                  placeholder="例如：题型来源"
                  @confirm="createRoot"
                />
              </view>

              <view class="actions-row">
                <button class="btn btn-outline btn-sm" @click="cancelCreateRoot">取消</button>
                <button class="btn btn-primary btn-sm" :disabled="!newRootTitle.trim()" @click="createRoot">创建</button>
              </view>
            </view>

            <view v-else-if="!selectedNode" class="detail__empty">
              <text class="empty-title">未选择节点</text>
              <text class="empty-sub">在左侧点击一个节点，或新建根类。</text>
            </view>

            <view v-else class="detail__content">
              <view v-if="crumbs.length" class="crumbs">
                <view
                  v-for="(c, idx) in crumbs"
                  :key="c.id"
                  class="crumb"
                  @click="selectNode(c.id, true)"
                >
                  <text class="crumb__text">{{ c.title }}</text>
                  <text v-if="idx < crumbs.length - 1" class="crumb__sep">/</text>
                </view>
              </view>

              <view class="section">
                <text class="section__title">{{ selectedNode.title || '(未命名)' }}</text>
                <view class="section__meta">
                  <text v-if="isSystemRootSelected" class="sys-flag">系统根类</text>
                  <text v-if="selectedNode.children?.length" class="meta-pill">{{ selectedNode.children.length }} 子级</text>
                </view>
              </view>

              <!-- Rename -->
              <view class="field">
                <text class="field__label">改名</text>
                <view class="field__row">
                  <input
                    class="text-input"
                    v-model="draftTitle"
                    :disabled="isSystemRootSelected"
                    placeholder="输入新名称"
                    @confirm="saveRename"
                  />
                  <button
                    class="btn btn-primary btn-sm"
                    :disabled="!canRename"
                    @click="saveRename"
                  >保存</button>
                  <button
                    class="btn btn-outline btn-sm"
                    :disabled="!hasRenameChanges"
                    @click="resetDraftTitle"
                  >还原</button>
                </view>
                <text v-if="isSystemRootSelected" class="hint">系统根类不支持改名。</text>
              </view>

              <!-- Add child -->
              <view class="field">
                <text class="field__label">新增子级</text>
                <view class="field__row">
                  <input
                    class="text-input"
                    v-model="newChildTitle"
                    placeholder="输入子标签名称"
                    @confirm="addChild"
                  />
                  <button class="btn btn-outline btn-sm" :disabled="!newChildTitle.trim()" @click="addChild">+ 添加</button>
                </view>
              </view>

              <!-- Children quick list -->
              <view v-if="(selectedNode.children || []).length" class="field">
                <text class="field__label">子级</text>
                <view class="chip-list">
                  <view
                    v-for="child in selectedNode.children"
                    :key="child.id"
                    class="chip"
                    @click="selectNode(child.id, true)"
                  >
                    <text class="chip__text">{{ child.title || '(未命名)' }}</text>
                    <text v-if="child.children?.length" class="chip__count">{{ child.children.length }}</text>
                  </view>
                </view>
              </view>

              <!-- Danger -->
              <view class="danger">
                <view class="danger__head">
                  <text class="danger__title">危险操作</text>
                  <text class="danger__sub">删除节点会同时移除其子节点，已选中的题目标签将失效。</text>
                </view>
                <button class="btn btn-outline btn-sm danger-btn" :disabled="isSystemRootSelected" @click="deleteSelected">
                  删除此节点
                </button>
                <text v-if="isSystemRootSelected" class="hint">系统根类不可删除。</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import type { TagNode, TagTree } from '/types/tag'
import { tagStore } from '/stores/tag'
import { createIdFromPath } from '/stores/tagTree'
import TagTreeNode from './TagTreeNode.vue'

const SYSTEM_ROOT_TITLES = new Set(['知识点', '教材版本', '学期', '年级', '年份', '难度', '地区', '场景'])
const SYSTEM_ROOT_TITLES_ARRAY = Array.from(SYSTEM_ROOT_TITLES)
const ROOT_ORDER = ['知识点', '教材版本', '学期', '年级', '年份', '难度', '地区', '场景']

const keyword = ref('')
const expandedIds = ref<string[]>([])
const selectedId = ref<string | null>(null)
const creatingRoot = ref(false)

const draftTitle = ref('')
const newChildTitle = ref('')
const newRootTitle = ref('')

function orderIndex(title: string) {
  const idx = ROOT_ORDER.indexOf(title)
  return idx === -1 ? 9999 : idx
}

const treeRoots = computed<TagTree>(() => {
  const roots = (tagStore.state.tree || []).slice()
  roots.sort((a, b) => {
    const at = (a.title || '').trim()
    const bt = (b.title || '').trim()
    const ai = orderIndex(at)
    const bi = orderIndex(bt)
    if (ai !== bi) return ai - bi
    return at.localeCompare(bt)
  })
  return roots
})

const selectedNode = computed<TagNode | null>(() => {
  if (!selectedId.value) return null
  return (tagStore.state.index.byId[selectedId.value] as any) || null
})

function findChain(nodes: TagNode[], targetId: string, acc: TagNode[] = []): TagNode[] | null {
  for (const node of nodes) {
    const next = [...acc, node]
    if (node.id === targetId) return next
    const children = node.children || []
    if (children.length) {
      const found = findChain(children, targetId, next)
      if (found) return found
    }
  }
  return null
}

const crumbs = computed<{ id: string; title: string }[]>(() => {
  if (!selectedId.value) return []
  const chain = findChain(tagStore.state.tree as any, selectedId.value) || []
  return chain.map(n => ({ id: n.id, title: (n.title || '').trim() || '(未命名)' }))
})

const selectedPath = computed(() => {
  if (!selectedId.value) return ''
  return tagStore.getPath(selectedId.value) || ''
})

const isSystemRootSelected = computed(() => {
  if (!selectedNode.value) return false
  // Only lock system roots (level 0 nodes)
  const chain = findChain(tagStore.state.tree as any, selectedNode.value.id) || []
  if (chain.length !== 1) return false
  const title = (selectedNode.value.title || '').trim()
  return SYSTEM_ROOT_TITLES.has(title)
})

const hasRenameChanges = computed(() => {
  if (!selectedNode.value) return false
  return (draftTitle.value || '').trim() !== ((selectedNode.value.title || '').trim())
})

const canRename = computed(() => {
  if (!selectedNode.value) return false
  if (isSystemRootSelected.value) return false
  const nextTitle = (draftTitle.value || '').trim()
  const currentTitle = (selectedNode.value.title || '').trim()
  if (!nextTitle) return false
  if (nextTitle === currentTitle) return false
  return true
})

const searchResults = computed(() => {
  const k = keyword.value.trim()
  if (!k) return [] as { id: string; path: string }[]
  const out: { id: string; path: string }[] = []
  Object.entries(tagStore.state.index.pathById).forEach(([id, path]) => {
    if (!path.includes(k)) return
    out.push({ id, path })
  })
  out.sort((a, b) => a.path.length - b.path.length)
  return out.slice(0, 200)
})

watch(selectedNode, (node) => {
  draftTitle.value = (node?.title || '').trim()
  newChildTitle.value = ''
})

function ensureExpandedTo(id: string, includeSelf: boolean) {
  const chain = findChain(tagStore.state.tree as any, id) || []
  const ids = chain.map(n => n.id)
  const toExpand = includeSelf ? ids : ids.slice(0, -1)
  expandedIds.value = Array.from(new Set([...expandedIds.value, ...toExpand]))
}

function selectNode(id: string, expandTo = false) {
  creatingRoot.value = false
  selectedId.value = id
  if (expandTo) ensureExpandedTo(id, false)
}

function toggleExpand(id: string) {
  const list = expandedIds.value
  if (list.includes(id)) expandedIds.value = list.filter(x => x !== id)
  else expandedIds.value = [...list, id]
}

function collapseAll() {
  expandedIds.value = []
}

function expandAll() {
  const ids: string[] = []
  const walk = (nodes: TagNode[]) => {
    nodes.forEach((n) => {
      if (n.children && n.children.length) {
        ids.push(n.id)
        walk(n.children)
      }
    })
  }
  walk(tagStore.state.tree as any)
  expandedIds.value = Array.from(new Set(ids))
}

function clearSearch() {
  keyword.value = ''
}

function onSearchConfirm() {
  if (searchResults.value.length === 1) {
    openSearchResult(searchResults.value[0].id)
  }
}

function openSearchResult(id: string) {
  keyword.value = ''
  selectNode(id, true)
}

function startCreateRoot() {
  creatingRoot.value = true
  selectedId.value = null
  newRootTitle.value = ''
}

function cancelCreateRoot() {
  creatingRoot.value = false
  newRootTitle.value = ''
}

function createRoot() {
  const title = newRootTitle.value.trim()
  if (!title) return

  const exists = (tagStore.state.tree || []).some(n => (n.title || '').trim() === title)
  if (exists) {
    uni.showToast({ title: '根类已存在', icon: 'none' })
    return
  }

  tagStore.addChild(null, title)
  const id = createIdFromPath(title)
  creatingRoot.value = false
  newRootTitle.value = ''
  nextTick(() => selectNode(id, true))
}

function resetDraftTitle() {
  draftTitle.value = (selectedNode.value?.title || '').trim()
}

function saveRename() {
  if (!selectedNode.value) return
  if (!canRename.value) return
  const nextTitle = draftTitle.value.trim()
  const chain = findChain(tagStore.state.tree as any, selectedNode.value.id) || []
  const parent = chain.length >= 2 ? chain[chain.length - 2] : null
  const siblings = parent ? (parent.children || []) : (tagStore.state.tree || [])
  const conflict = siblings.some(n => n.id !== selectedNode.value!.id && ((n.title || '').trim() === nextTitle))
  if (conflict) {
    uni.showToast({ title: '同级已存在同名标签', icon: 'none' })
    return
  }

  tagStore.rename(selectedNode.value.id, nextTitle)
  uni.showToast({ title: '已改名', icon: 'success' })
}

function addChild() {
  if (!selectedNode.value) return
  const title = newChildTitle.value.trim()
  if (!title) return

  const children = selectedNode.value.children || []
  if (children.some(c => (c.title || '').trim() === title)) {
    uni.showToast({ title: '同级已存在同名标签', icon: 'none' })
    return
  }

  const parentId = selectedNode.value.id
  const parentPath = tagStore.getPath(parentId) || ''
  const newId = createIdFromPath(parentPath ? `${parentPath}/${title}` : title)

  tagStore.addChild(parentId, title)
  newChildTitle.value = ''
  ensureExpandedTo(parentId, true)
  nextTick(() => selectNode(newId, true))
}

function deleteSelected() {
  if (!selectedNode.value) return
  if (isSystemRootSelected.value) return

  const id = selectedNode.value.id
  const chain = findChain(tagStore.state.tree as any, id) || []
  const parentId = chain.length >= 2 ? chain[chain.length - 2].id : null

  uni.showModal({
    title: '确认删除',
    content: '删除节点会同时移除其子节点，已选中的题目标签将失效。',
    success: async (res) => {
      if (!res.confirm) return
      tagStore.remove(id)
      expandedIds.value = expandedIds.value.filter(x => x !== id)
      await nextTick()
      selectedId.value = parentId
      uni.showToast({ title: '已删除', icon: 'success' })
    }
  })
}

onMounted(() => {
  // Default: expand system roots
  expandedIds.value = treeRoots.value.map(n => n.id)
  // Default: select "知识点" if exists
  const first = treeRoots.value.find(n => (n.title || '').trim() === '知识点') || treeRoots.value[0]
  if (first) selectNode(first.id, false)
})
</script>

<style lang="scss" scoped>
.tags-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  background:
    radial-gradient(1200px 520px at 10% -10%, rgba(33, 150, 243, 0.10), rgba(255, 255, 255, 0) 60%),
    radial-gradient(900px 420px at 92% 0%, rgba(255, 152, 0, 0.06), rgba(255, 255, 255, 0) 55%),
    linear-gradient(180deg, #f7f9fc, #eef2f7);
}

.tm-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 28px rgba(15, 23, 42, 0.06);
  flex-shrink: 0;
}

.tm-title__main {
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.tm-title__sub {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.tm-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tm-body {
  flex: 1;
  display: flex;
  gap: 14px;
  overflow: hidden;
  margin-top: 14px;
}

.tm-left {
  width: 420px;
  min-width: 320px;
  max-width: 520px;
  display: flex;
  flex-direction: column;
}

.tm-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.90));
  box-shadow: 0 18px 28px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.panel__title {
  font-weight: 800;
  color: rgba(15, 23, 42, 0.80);
}

.panel__tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel__tip {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.48);
}

.panel__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.search-input {
  flex: 1;
  height: 34px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0 10px;
  font-size: 12px;
  background: rgba(248, 250, 252, 0.9);
}

.panel__scroll {
  flex: 1;
  height: 0;
  padding: 10px 10px 12px;
}

.results__meta {
  padding: 0 4px 10px;
}

.results__meta-text {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.result-item {
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.88);
  margin-bottom: 8px;
}

.result-item:hover {
  border-color: rgba(33, 150, 243, 0.25);
  background: rgba(227, 242, 253, 0.7);
}

.result-path {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.78);
}

.empty-tip {
  padding: 10px 4px;
  color: rgba(15, 23, 42, 0.45);
  font-size: 12px;
}

.detail-path {
  max-width: 56vw;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail__scroll {
  flex: 1;
  height: 0;
  padding: 12px 14px 16px;
}

.detail__empty {
  padding: 24px 6px;
}

.empty-title {
  display: block;
  font-size: 16px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.78);
}

.empty-sub {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.50);
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.06);
  margin-bottom: 12px;
}

.crumb {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.crumb__text {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.72);
}

.crumb__sep {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.35);
}

.section {
  margin-bottom: 12px;
}

.section__title {
  display: block;
  font-size: 18px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.82);
}

.section__hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.50);
}

.section__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.sys-flag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.65);
}

.meta-pill {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(33, 150, 243, 0.18);
  background: rgba(33, 150, 243, 0.10);
  color: #0b63c6;
}

.field {
  margin-top: 14px;
}

.field__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.62);
  margin-bottom: 8px;
}

.field__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.text-input {
  flex: 1;
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 14px;
  background: rgba(248, 250, 252, 0.9);
}

.text-input:disabled {
  opacity: 0.7;
  background: rgba(248, 250, 252, 0.65);
}

.hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.45);
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.85);
}

.chip:hover {
  border-color: rgba(33, 150, 243, 0.25);
  background: rgba(227, 242, 253, 0.7);
}

.chip__text {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.76);
}

.chip__count {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.60);
}

.danger {
  margin-top: 18px;
  padding: 12px 12px;
  border-radius: 16px;
  border: 1px solid rgba(244, 67, 54, 0.18);
  background: rgba(244, 67, 54, 0.06);
}

.danger__title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: rgba(244, 67, 54, 0.88);
}

.danger__sub {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.danger-btn {
  margin-top: 10px;
  border-color: rgba(244, 67, 54, 0.35);
  color: rgba(244, 67, 54, 0.92);
}

.danger-btn:hover {
  border-color: rgba(244, 67, 54, 0.55);
  background: rgba(244, 67, 54, 0.08);
}

@media (max-width: 980px) {
  .tm-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .tm-header__actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .tm-body {
    flex-direction: column;
  }

  .tm-left {
    width: 100%;
    max-width: none;
  }

  .detail-path {
    max-width: 86vw;
  }
}
</style>
