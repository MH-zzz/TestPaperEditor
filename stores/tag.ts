import { reactive, watch } from 'vue'
import type { TagNode, TagTree, TagIndex } from '/types/tag'
import { ensureNodeIds, buildTagIndex, addChildNode, updateNodeTitle, removeNodeById } from './tagTree'

// JSON imports (bundled at build time, no runtime require)
import knowledgeRoots from '../题型知识点标签.json'

const STORAGE_KEY = 'editor_tag_tree'

// Historical data/source files may contain doc-like roots that should not appear in the real tag tree.
// We only keep metadata categories (知识点/教材版本/学期/年级/年份/难度/地区/场景).
// "题型标签" is a question-type selector (not metadata tags) and must be hidden here.
const PRUNED_ROOT_TITLES = new Set(['其他标签', '题型标签'])

// When the bundled knowledge JSON is updated, users may still have an old tree in storage.
// Older versions contained doc-like placeholder nodes (e.g. "10个子主题...") that should be removed.
const OUTDATED_PLACEHOLDER_RE = /^\s*\d+\s*个子(?:主题|项)/

function shouldPruneRootTitle(title: string): boolean {
  if (PRUNED_ROOT_TITLES.has(title)) return true
  // "交互方式（外显题型）" belongs to question type system, not metadata tags.
  if (title.includes('交互方式')) return true
  return false
}

const REQUIRED_CATEGORIES: { title: string; children?: string[] }[] = [
  { title: '教材版本', children: ['人教社', '外研社', '新华社'] },
  { title: '学期', children: ['上学期', '下学期'] },
  { title: '年级', children: Array.from({ length: 12 }, (_, i) => `${i + 1} 年级`) },
  { title: '年份', children: ['2024', '2025', '2026'] },
  { title: '难度', children: ['简单', '中等', '困难'] },
  { title: '知识点' },
  { title: '地区', children: ['成都', '北京'] },
  { title: '场景', children: ['期中', '期末', '月度'] }
]

const knowledgeRootsTyped = knowledgeRoots as TagTree

function pruneRootNodes(tree: TagTree): { tree: TagTree; changed: boolean } {
  const next = tree.filter(node => !shouldPruneRootTitle((node.title || '').trim()))
  return { tree: next, changed: next.length !== tree.length }
}

function containsOutdatedKnowledgePlaceholders(tree: TagTree): boolean {
  const visit = (node: TagNode): boolean => {
    const title = (node.title || '').trim()
    if (OUTDATED_PLACEHOLDER_RE.test(title)) return true
    return (node.children || []).some(visit)
  }
  return tree.some(visit)
}

function replaceKnowledgeRootFromSeed(tree: TagTree, seed: TagTree): { tree: TagTree; changed: boolean } {
  const knowledgeTitle = '知识点'
  const target = tree.find(n => (n.title || '').trim() === knowledgeTitle)
  const source = seed.find(n => (n.title || '').trim() === knowledgeTitle)
  if (!target || !source) return { tree, changed: false }
  const next = tree.map((n) => {
    if (n.id !== target.id) return n
    return { ...n, children: source.children || [] }
  })
  return { tree: ensureNodeIds(next), changed: true }
}

function buildInitialTree(): TagTree {
  const roots = [...knowledgeRootsTyped]
    .filter(node => (node.title || '').trim() !== '括号图')
  const normalized = ensureNodeIds(roots)
  const pruned = pruneRootNodes(normalized)
  const ensured = ensureRequiredCategories(pruned.tree)
  return mergeKnowledgeRoots(ensured.tree).tree
}

function ensureRequiredCategories(tree: TagTree): { tree: TagTree; changed: boolean } {
  const existingTitles = new Set(tree.map(node => (node.title || '').trim()))
  let changed = false
  const additions: TagNode[] = []
  const merged = tree.map(node => ({ ...node }))

  REQUIRED_CATEGORIES.forEach((category) => {
    if (existingTitles.has(category.title)) return
    const children = (category.children || []).map(title => ({ id: '', title }))
    additions.push({
      id: '',
      title: category.title,
      children: children.length ? children : undefined
    })
    changed = true
  })

  // Merge defaults into existing categories if missing children
  REQUIRED_CATEGORIES.forEach((category) => {
    if (!category.children || category.children.length === 0) return
    const index = merged.findIndex(node => (node.title || '').trim() === category.title)
    if (index === -1) return
    const node = merged[index]
    const existingChildTitles = new Set((node.children || []).map(child => (child.title || '').trim()))
    const missing = category.children.filter(title => !existingChildTitles.has(title))
    if (missing.length === 0) return
    const newChildren = [
      ...(node.children || []),
      ...missing.map(title => ({ id: '', title }))
    ]
    merged[index] = { ...node, children: newChildren }
    changed = true
  })

  if (!changed) return { tree, changed: false }

  const result = [...merged, ...additions]
  return { tree: ensureNodeIds(result), changed: true }
}

function mergeKnowledgeRoots(tree: TagTree): { tree: TagTree; changed: boolean } {
  const knowledgeTitle = '知识点'
  const knowledgeNode = tree.find(node => (node.title || '').trim() === knowledgeTitle)
  if (!knowledgeNode) return { tree, changed: false }

  const flattenKnowledgeWrappers = (children: TagNode[]): { children: TagNode[]; changed: boolean } => {
    let changed = false
    const out: TagNode[] = []
    children.forEach((child) => {
      const title = (child.title || '').trim()
      if (title === '知识点标签') {
        if (child.children && child.children.length) {
          out.push(...child.children)
        }
        changed = true
        return
      }
      out.push(child)
    })

    // Dedupe by id to avoid duplicates after flatten/merge.
    const seen = new Set<string>()
    const deduped: TagNode[] = []
    out.forEach((n) => {
      if (seen.has(n.id)) {
        changed = true
        return
      }
      seen.add(n.id)
      deduped.push(n)
    })
    return { children: deduped, changed }
  }

  const moved: TagNode[] = []
  const remaining: TagNode[] = []
  tree.forEach((node) => {
    const title = (node.title || '').trim()
    if (node.id === knowledgeNode.id) {
      remaining.push(node)
      return
    }
    if (title.includes('知识点') && title !== knowledgeTitle) {
      // Flatten wrappers like "知识点标签" so users see the real categories directly under "知识点".
      if (title === '知识点标签' && node.children && node.children.length) {
        moved.push(...node.children)
      } else {
        moved.push(node)
      }
    } else {
      remaining.push(node)
    }
  })

  const mergedChildren = [...(knowledgeNode.children || []), ...moved]
  const flattened = flattenKnowledgeWrappers(mergedChildren)
  const changed = moved.length > 0 || flattened.changed
  if (!changed) return { tree, changed: false }

  const updatedKnowledge = { ...knowledgeNode, children: flattened.children }
  const updatedTree = remaining.map(node => (node.id === knowledgeNode.id ? updatedKnowledge : node))
  return { tree: ensureNodeIds(updatedTree), changed: true }
}

class TagStore {
  state = reactive({
    tree: [] as TagTree,
    index: { byId: {}, pathById: {}, rootById: {} } as TagIndex
  })

  constructor() {
    this.load()
    watch(() => this.state.tree, () => {
      this.save()
      this.rebuildIndex()
    }, { deep: true })
  }

  rebuildIndex() {
    this.state.index = buildTagIndex(this.state.tree)
  }

  load() {
    try {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        const parsed = ensureNodeIds(JSON.parse(stored))
        const cleaned = parsed.filter(node => (node.title || '').trim() !== '括号图')
        const pruned = pruneRootNodes(cleaned)
        if (pruned.tree.length === 0) {
          this.state.tree = buildInitialTree()
          this.save()
        } else {
          const ensured = ensureRequiredCategories(pruned.tree)
          const merged = mergeKnowledgeRoots(ensured.tree)
          let nextTree = merged.tree
          let changed = cleaned.length !== parsed.length || pruned.changed || ensured.changed || merged.changed

          if (containsOutdatedKnowledgePlaceholders(nextTree)) {
            const seed = buildInitialTree()
            const replaced = replaceKnowledgeRootFromSeed(nextTree, seed)
            nextTree = replaced.tree
            changed = true
          }

          this.state.tree = nextTree
          if (changed) this.save()
        }
      } else {
        this.state.tree = buildInitialTree()
        this.save()
      }
      this.rebuildIndex()
    } catch (e) {
      console.error('Failed to load tag tree', e)
      this.state.tree = buildInitialTree()
      this.rebuildIndex()
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.state.tree))
    } catch (e) {
      console.error('Failed to save tag tree', e)
    }
  }

  getPath(id: string): string {
    return this.state.index.pathById[id] || ''
  }

  getRootCategory(id: string): string {
    return this.state.index.rootById[id] || ''
  }

  // Legacy compatibility (TagSelector will be replaced)
  getByCategory(_category: string) {
    return []
  }

  addTag(_name: string, _category: string) {
    uni.showToast({ title: '标签系统已升级', icon: 'none' })
  }

  removeTag(_id: string) {}

  addChild(parentId: string | null, title: string) {
    const node: TagNode = { id: '', title: title.trim() }
    const parentPath = parentId ? (this.state.index.pathById[parentId] || '') : ''
    const pathParts = parentPath ? parentPath.split('/') : []
    const [normalized] = ensureNodeIds([node], pathParts)
    this.state.tree = addChildNode(this.state.tree, parentId, normalized)
  }

  rename(id: string, title: string) {
    this.state.tree = updateNodeTitle(this.state.tree, id, title.trim())
  }

  remove(id: string) {
    this.state.tree = removeNodeById(this.state.tree, id)
  }
}

export const tagStore = new TagStore()
