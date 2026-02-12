import { reactive } from 'vue'
import type { FlowModuleRef, FlowModuleStatus, ListeningChoiceFlowModuleV1 } from '/types'
import {
  DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  normalizeListeningChoiceStandardModule
} from '../flows/listeningChoiceFlowModules'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_flow_modules_v2'
const DEFAULT_LISTENING_CHOICE_MODULE_NAME = '听后选择标准'

function nowIso() {
  return new Date().toISOString()
}

function normalizeText(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function normalizeListeningChoiceModuleName(src: any): string {
  const id = normalizeText(src?.id) || LISTENING_CHOICE_STANDARD_FLOW_ID
  const raw = normalizeText(src?.name)
  if (id === LISTENING_CHOICE_STANDARD_FLOW_ID) {
    if (!raw || raw === '听后选择题型流程') return DEFAULT_LISTENING_CHOICE_MODULE_NAME
  }
  return raw || id
}

function normalizeStatus(v: any): 'draft' | 'published' | 'archived' {
  if (v === 'draft' || v === 'published' || v === 'archived') return v
  return 'published'
}

function canListeningChoiceStatusTransition(from: FlowModuleStatus, to: FlowModuleStatus): boolean {
  if (from === to) return true
  if (from === 'draft' && (to === 'published' || to === 'archived')) return true
  if (from === 'published' && to === 'archived') return true
  return false
}

function normalizeListeningChoiceModule(input: any): ListeningChoiceFlowModuleV1 {
  const src = input && typeof input === 'object' ? input : {}
  const base = normalizeListeningChoiceStandardModule(src)
  const now = nowIso()

  return {
    kind: 'listening_choice',
    id: typeof src.id === 'string' && src.id ? src.id : LISTENING_CHOICE_STANDARD_FLOW_ID,
    version: Number.isFinite(Number(src.version)) ? Math.max(1, Math.floor(Number(src.version))) : 1,
    name: normalizeListeningChoiceModuleName(src),
    note: normalizeText(src.note),
    status: normalizeStatus(src.status),
    introShowTitle: base.introShowTitle,
    introShowTitleDescription: base.introShowTitleDescription,
    introShowDescription: base.introShowDescription,
    introCountdownEnabled: base.introCountdownEnabled,
    introCountdownShowTitle: base.introCountdownShowTitle,
    introCountdownSeconds: base.introCountdownSeconds,
    introCountdownLabel: base.introCountdownLabel,
    perGroupSteps: base.perGroupSteps as any,
    createdAt: typeof src.createdAt === 'string' && src.createdAt ? src.createdAt : now,
    updatedAt: typeof src.updatedAt === 'string' && src.updatedAt ? src.updatedAt : now
  }
}

const DEFAULT_LISTENING_CHOICE_FLOW_MODULE = normalizeListeningChoiceModule({
  ...DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  kind: 'listening_choice',
  id: LISTENING_CHOICE_STANDARD_FLOW_ID,
  version: 1,
  name: DEFAULT_LISTENING_CHOICE_MODULE_NAME,
  status: 'published'
})

class FlowModulesStore {
  state = reactive({
    listeningChoice: [DEFAULT_LISTENING_CHOICE_FLOW_MODULE] as ListeningChoiceFlowModuleV1[]
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
      const list = Array.isArray(parsed?.listeningChoice) ? parsed.listeningChoice : []
      const normalized = list.map((m: any) => normalizeListeningChoiceModule(m))
      this.state.listeningChoice = normalized.length ? normalized : [DEFAULT_LISTENING_CHOICE_FLOW_MODULE]
    } catch (e) {
      console.error('Failed to load flow modules', e)
      this.state.listeningChoice = [DEFAULT_LISTENING_CHOICE_FLOW_MODULE]
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({
        listeningChoice: this.state.listeningChoice
      }))
    } catch (e) {
      console.error('Failed to save flow modules', e)
    }
  }

  listListeningChoice() {
    return [...this.state.listeningChoice]
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  }

  getListeningChoiceByRef(ref?: FlowModuleRef | null) {
    if (!ref) return null
    return this.state.listeningChoice.find(m => m.id === ref.id && m.version === ref.version) || null
  }

  getListeningChoiceLatestPublished(moduleId?: string) {
    const list = this.state.listeningChoice
      .filter(m => m.status === 'published' && (!moduleId || m.id === moduleId))
      .sort((a, b) => b.version - a.version)
    return list[0] || null
  }

  getListeningChoiceDefault() {
    const published = this.getListeningChoiceLatestPublished(LISTENING_CHOICE_STANDARD_FLOW_ID)
    return published || this.getListeningChoiceLatestPublished() || this.state.listeningChoice[0] || null
  }

  getListeningChoiceMaxVersion(moduleId: string) {
    const id = String(moduleId || '').trim()
    if (!id) return 0
    return this.state.listeningChoice
      .filter(m => m.id === id)
      .reduce((max, m) => Math.max(max, Number(m.version || 0)), 0)
  }

  upsertListeningChoice(input: any) {
    const src = input && typeof input === 'object' ? input : {}
    const idx = this.state.listeningChoice.findIndex(m => m.id === src.id && m.version === src.version)
    const existing = idx >= 0 ? this.state.listeningChoice[idx] : null
    const defaultStatus = existing ? existing.status : 'draft'
    const normalizedInput = existing
      ? {
          ...src,
          // Status transitions must go through setListeningChoiceStatus.
          status: defaultStatus,
          name: src.name == null ? existing.name : src.name,
          note: src.note == null ? existing.note : src.note
        }
      : {
          ...src,
          status: defaultStatus
        }
    const module = normalizeListeningChoiceModule({ ...normalizedInput, updatedAt: nowIso() })
    const nextIdx = this.state.listeningChoice.findIndex(m => m.id === module.id && m.version === module.version)
    if (nextIdx >= 0) {
      const createdAt = this.state.listeningChoice[nextIdx].createdAt || module.createdAt
      this.state.listeningChoice[nextIdx] = { ...module, createdAt }
    } else {
      this.state.listeningChoice.push(module)
    }
    this.persistence.schedule()
  }

  canTransitionListeningChoiceStatus(ref: FlowModuleRef | null | undefined, nextStatus: FlowModuleStatus) {
    if (!ref) return false
    const target = this.getListeningChoiceByRef(ref)
    if (!target) return false
    return canListeningChoiceStatusTransition(normalizeStatus(target.status), normalizeStatus(nextStatus))
  }

  setListeningChoiceStatus(ref: FlowModuleRef | null | undefined, nextStatus: FlowModuleStatus) {
    if (!ref) return false
    const idx = this.state.listeningChoice.findIndex(m => m.id === ref.id && m.version === ref.version)
    if (idx < 0) return false

    const target = this.state.listeningChoice[idx]
    const fromStatus = normalizeStatus(target.status)
    const toStatus = normalizeStatus(nextStatus)
    if (!canListeningChoiceStatusTransition(fromStatus, toStatus)) return false
    if (fromStatus === toStatus) return true

    this.state.listeningChoice[idx] = {
      ...target,
      status: toStatus,
      updatedAt: nowIso()
    }
    this.persistence.schedule()
    return true
  }

  archiveListeningChoice(ref?: FlowModuleRef | null) {
    return this.setListeningChoiceStatus(ref || null, 'archived')
  }

  resetListeningChoiceToDefault() {
    this.state.listeningChoice = [DEFAULT_LISTENING_CHOICE_FLOW_MODULE]
    this.persistence.schedule()
  }
}

export const flowModules = new FlowModulesStore()
