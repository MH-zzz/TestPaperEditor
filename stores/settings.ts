import { reactive } from 'vue'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_global_settings'

function normalizeDefaultTags(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const out = input
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  return Array.from(new Set(out))
}

class GlobalSettingsStore {
  state = reactive({
    defaultTags: [] as string[] // 默认选中的标签 ID 列表
  })
  private readonly persistence = createPersistenceScheduler(() => this.save(), 300)

  constructor() {
    this.load()
  }

  load() {
    try {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.state.defaultTags = normalizeDefaultTags(data.defaultTags)
      }
    } catch (e) {
      console.error('Failed to load global settings', e)
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.state))
    } catch (e) {
      console.error('Failed to save global settings', e)
    }
  }

  setDefaultTags(tags: unknown) {
    this.state.defaultTags = normalizeDefaultTags(tags)
    this.persistence.schedule()
  }

  resetDefaultTags() {
    this.state.defaultTags = []
    this.persistence.schedule()
  }
}

export const globalSettings = new GlobalSettingsStore()
