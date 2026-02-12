import { reactive } from 'vue'

export type AppModule = 'editor' | 'learning' | 'templates' | 'flows' | 'tags' | 'library'

function normalizeModule(v: string): AppModule {
  if (v === 'learning') return 'learning'
  if (v === 'templates') return 'templates'
  if (v === 'flows') return 'flows'
  if (v === 'tags') return 'tags'
  if (v === 'library') return 'library'
  return 'editor'
}

class AppShellStore {
  state = reactive({
    currentModule: 'editor' as AppModule
  })

  switchModule(next: string) {
    this.state.currentModule = normalizeModule(next)
  }
}

export const appShell = new AppShellStore()
