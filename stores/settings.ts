import { reactive, watch } from 'vue'

const STORAGE_KEY = 'editor_global_settings'

class GlobalSettingsStore {
  state = reactive({
    defaultTags: [] as string[] // 默认选中的标签 ID 列表
  })

  constructor() {
    this.load()
    watch(() => this.state.defaultTags, () => {
      this.save()
    }, { deep: true })
  }

  load() {
    try {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.state.defaultTags = data.defaultTags || []
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
}

export const globalSettings = new GlobalSettingsStore()
