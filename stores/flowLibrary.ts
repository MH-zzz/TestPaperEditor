import { reactive } from 'vue'
import { hashFlowTemplate } from '../flows/listeningChoiceFlowModules'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_flow_library_v1'

export type FlowModuleType = 'listening_choice'

export interface FlowModule {
  id: string
  type: FlowModuleType
  hash: string
  steps: any[]
  createdAt: string
}

class FlowLibraryStore {
  state = reactive({
    modules: [] as FlowModule[]
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
      if (Array.isArray(parsed?.modules)) {
        this.state.modules = parsed.modules
      } else if (Array.isArray(parsed)) {
        // Legacy: allow storing the array directly.
        this.state.modules = parsed
      }
    } catch (e) {
      console.error('Failed to load flow library', e)
      this.state.modules = []
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({ modules: this.state.modules }))
    } catch (e) {
      console.error('Failed to save flow library', e)
    }
  }

  getById(id: string): FlowModule | null {
    const found = this.state.modules.find(m => m.id === id)
    return found || null
  }

  getByHash(type: FlowModuleType, hash: string): FlowModule | null {
    const found = this.state.modules.find(m => m.type === type && m.hash === hash)
    return found || null
  }

  // Ensure an immutable module (deduped by template hash).
  ensureModule(type: FlowModuleType, templateSteps: any[]): FlowModule {
    const hash = hashFlowTemplate(templateSteps || [])
    const existing = this.getByHash(type, hash)
    if (existing) return existing

    const module: FlowModule = {
      id: `flow:${type}:${hash}`,
      type,
      hash,
      steps: templateSteps || [],
      createdAt: new Date().toLocaleString()
    }
    this.state.modules = [module, ...this.state.modules]
    this.persistence.schedule()
    return module
  }
}

export const flowLibrary = new FlowLibraryStore()
