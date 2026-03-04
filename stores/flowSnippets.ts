import { reactive } from 'vue'
import {
  createFlowSnippetTemplateRevision,
  normalizeFlowSnippetTemplate,
  type FlowSnippetTemplate,
  type FlowSnippetTemplateStep
} from '/domain/flow-visual/usecases/buildFlowSnippetTemplate'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_flow_snippets_v1'
const MAX_SNIPPET_COUNT = 80

function sortByUpdatedAtDesc(list: FlowSnippetTemplate[]): FlowSnippetTemplate[] {
  return [...list].sort((a, b) => {
    const at = Date.parse(String(a.updatedAt || ''))
    const bt = Date.parse(String(b.updatedAt || ''))
    if (Number.isFinite(at) && Number.isFinite(bt)) return bt - at
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  })
}

class FlowSnippetsStore {
  state = reactive({
    snippets: [] as FlowSnippetTemplate[]
  })

  private readonly persistence = createPersistenceScheduler(() => this.save(), 300)

  constructor() {
    this.load()
  }

  load() {
    try {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      const source = Array.isArray(parsed?.snippets) ? parsed.snippets : (Array.isArray(parsed) ? parsed : [])
      const normalized = source
        .map((item) => normalizeFlowSnippetTemplate(item))
        .filter((item): item is FlowSnippetTemplate => !!item)
      this.state.snippets = sortByUpdatedAtDesc(normalized).slice(0, MAX_SNIPPET_COUNT)
    } catch (e) {
      console.error('Failed to load flow snippets', e)
      this.state.snippets = []
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({
        snippets: this.state.snippets
      }))
    } catch (e) {
      console.error('Failed to save flow snippets', e)
    }
  }

  getById(id: string): FlowSnippetTemplate | null {
    const key = String(id || '').trim()
    if (!key) return null
    const found = this.state.snippets.find((item) => String(item.id || '') === key)
    return found || null
  }

  listLatest(limit = 12): FlowSnippetTemplate[] {
    const count = Math.max(1, Math.floor(Number(limit || 12)))
    return sortByUpdatedAtDesc(this.state.snippets).slice(0, count)
  }

  findLatestByName(name: string): FlowSnippetTemplate | null {
    const key = String(name || '').trim()
    if (!key) return null
    const list = this.state.snippets
      .filter((item) => String(item.name || '').trim() === key)
      .sort((a, b) => Number(b.version || 0) - Number(a.version || 0))
    return list[0] || null
  }

  saveSnippet(input: { name: string; steps: FlowSnippetTemplateStep[] }): FlowSnippetTemplate | null {
    const name = String(input?.name || '').trim()
    const steps = Array.isArray(input?.steps) ? input.steps : []
    if (!name || steps.length <= 0) return null
    const previous = this.findLatestByName(name)
    const next = createFlowSnippetTemplateRevision({
      previous,
      name,
      steps
    })
    this.state.snippets = sortByUpdatedAtDesc([next, ...this.state.snippets]).slice(0, MAX_SNIPPET_COUNT)
    this.persistence.schedule()
    return next
  }
}

export const flowSnippets = new FlowSnippetsStore()
