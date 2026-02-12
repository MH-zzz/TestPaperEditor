import { reactive } from 'vue'
import {
  DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  normalizeListeningChoiceStandardModule,
  type ListeningChoiceStandardFlowModuleV1
} from '../flows/listeningChoiceFlowModules'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_standard_flow_modules_v1'

class StandardFlowsStore {
  state = reactive({
    listeningChoice: DEFAULT_LISTENING_CHOICE_STANDARD_MODULE as ListeningChoiceStandardFlowModuleV1
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
      if (parsed?.listeningChoice) {
        this.state.listeningChoice = normalizeListeningChoiceStandardModule(parsed.listeningChoice)
      }
    } catch (e) {
      console.error('Failed to load standard flows', e)
      this.state.listeningChoice = DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({
        listeningChoice: this.state.listeningChoice
      }))
    } catch (e) {
      console.error('Failed to save standard flows', e)
    }
  }

  setListeningChoice(module: any) {
    this.state.listeningChoice = normalizeListeningChoiceStandardModule(module)
    this.persistence.schedule()
  }

  resetListeningChoice() {
    this.state.listeningChoice = DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
    this.persistence.schedule()
  }
}

export const standardFlows = new StandardFlowsStore()
