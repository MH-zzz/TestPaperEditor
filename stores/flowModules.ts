import { reactive } from 'vue'
import type { FlowModuleRef, FlowModuleStatus, ListeningChoiceFlowModuleV1 } from '/types'
import {
  DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE,
  DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID,
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  normalizeListeningChoiceStandardModule
} from '../flows/listeningChoiceFlowModules'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_flow_modules_v2'
const DEFAULT_LISTENING_CHOICE_MODULE_NAME = '听后选择标准'
const DEFAULT_LISTENING_HEAR_ANSWER_MODULE_NAME = '听后回答标准'

function nowIso() {
  return new Date().toISOString()
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function normalizeText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function normalizeListeningChoiceModuleName(src: Record<string, unknown>): string {
  const id = normalizeText(src?.id) || LISTENING_CHOICE_STANDARD_FLOW_ID
  const raw = normalizeText(src?.name)
  if (id === LISTENING_CHOICE_STANDARD_FLOW_ID) {
    if (!raw || raw === '听后选择题型流程') return DEFAULT_LISTENING_CHOICE_MODULE_NAME
  }
  if (id === LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID) {
    if (!raw || raw === '听后回答题型流程') return DEFAULT_LISTENING_HEAR_ANSWER_MODULE_NAME
  }
  return raw || id
}

function normalizeStatus(v: unknown): 'draft' | 'published' | 'archived' {
  if (v === 'draft' || v === 'published' || v === 'archived') return v
  return 'published'
}

function canListeningChoiceStatusTransition(from: FlowModuleStatus, to: FlowModuleStatus): boolean {
  if (from === to) return true
  if (from === 'draft' && (to === 'published' || to === 'archived')) return true
  if (from === 'published' && to === 'archived') return true
  return false
}

function normalizeListeningChoiceModule(input: unknown): ListeningChoiceFlowModuleV1 {
  const src = isObjectRecord(input) ? input : {}
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
    perGroupSteps: base.perGroupSteps,
    createdAt: typeof src.createdAt === 'string' && src.createdAt ? src.createdAt : now,
    updatedAt: typeof src.updatedAt === 'string' && src.updatedAt ? src.updatedAt : now
  }
}

function isHearAnswerModuleId(moduleId: unknown): boolean {
  const id = normalizeText(moduleId) || ''
  if (!id) return false
  return id === LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID || id.startsWith('listening_hear_answer.line.')
}

type PerGroupStepDef = ListeningChoiceFlowModuleV1['perGroupSteps'][number]

function createHearAnswerRecordGuideStep(): PerGroupStepDef {
  return {
    kind: 'recordGuide',
    showTitle: false,
    showQuestionTitle: true,
    showQuestionTitleDescription: true,
    showGroupPrompt: false,
    textSource: 'question',
    audioSource: 'question',
    screenStrategy: 'replaceBody'
  }
}

function ensureHearAnswerRecordGuideStep(module: ListeningChoiceFlowModuleV1): ListeningChoiceFlowModuleV1 {
  if (!isHearAnswerModuleId(module.id)) return module
  const steps = Array.isArray(module.perGroupSteps) ? module.perGroupSteps : []
  const hasAnswerChoice = steps.some((step) => step.kind === 'answerChoice')
  const hasRecordGuide = steps.some((step) => step.kind === 'recordGuide')
  if (!hasAnswerChoice || hasRecordGuide) return module

  const nextSteps: PerGroupStepDef[] = []
  for (const step of steps) {
    if (step.kind === 'answerChoice') {
      let inserted = false
      let insertIndex = -1
      for (let i = nextSteps.length - 1; i >= 0; i -= 1) {
        const current = nextSteps[i]
        if (current.kind === 'answerChoice') break
        if (current.kind === 'promptTone') {
          insertIndex = i
          break
        }
      }

      if (insertIndex >= 0) {
        const prev = nextSteps[insertIndex - 1]
        if (!prev || prev.kind !== 'recordGuide') {
          nextSteps.splice(insertIndex, 0, createHearAnswerRecordGuideStep())
        }
        inserted = true
      }

      if (!inserted) {
        const prev = nextSteps[nextSteps.length - 1]
        if (!prev || prev.kind !== 'recordGuide') {
          nextSteps.push(createHearAnswerRecordGuideStep())
        }
      }
    }
    nextSteps.push(step)
  }

  if (nextSteps.length === steps.length) return module
  return {
    ...module,
    perGroupSteps: nextSteps,
    updatedAt: nowIso()
  }
}

function isLegacyHearAnswerStandardTitleConfig(module: ListeningChoiceFlowModuleV1): boolean {
  if (String(module?.id || '') !== LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID) return false
  const steps = Array.isArray(module?.perGroupSteps) ? module.perGroupSteps : []
  if (steps.length !== 5) return false
  const kinds = steps.map((step) => String((step as { kind?: unknown })?.kind || ''))
  if (kinds.join(',') !== 'playAudio,countdown,playAudio,promptTone,answerChoice') return false

  const allShowTitleTrue = steps.every((step) => (step as { showTitle?: unknown })?.showTitle === true)
  if (!allShowTitleTrue) return false

  const first = steps[0] as { audioSource?: unknown; showQuestionTitle?: unknown; showQuestionTitleDescription?: unknown; showGroupPrompt?: unknown }
  const second = steps[1] as { seconds?: unknown; label?: unknown }
  const third = steps[2] as { audioSource?: unknown; showQuestionTitle?: unknown; showQuestionTitleDescription?: unknown; showGroupPrompt?: unknown }
  const fourth = steps[3] as { url?: unknown }
  const fifth = steps[4] as { showQuestionTitle?: unknown; showQuestionTitleDescription?: unknown; showGroupPrompt?: unknown }

  return first.audioSource === 'description'
    && first.showQuestionTitle === true
    && first.showQuestionTitleDescription === true
    && first.showGroupPrompt === true
    && Number(second.seconds || 0) === 5
    && String(second.label || '') === '答题准备'
    && third.audioSource === 'content'
    && third.showQuestionTitle === true
    && third.showQuestionTitleDescription === true
    && third.showGroupPrompt === true
    && String(fourth.url || '') === '/static/audio/small_time.mp3'
    && fifth.showQuestionTitle === true
    && fifth.showQuestionTitleDescription === true
    && fifth.showGroupPrompt === true
}

function isLegacyHearAnswerPromptToneConfig(module: ListeningChoiceFlowModuleV1): boolean {
  if (String(module?.id || '') !== LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID) return false
  const steps = Array.isArray(module?.perGroupSteps) ? module.perGroupSteps : []
  if (steps.length !== 5) return false
  const kinds = steps.map((step) => String((step as { kind?: unknown })?.kind || ''))
  if (kinds.join(',') !== 'playAudio,countdown,playAudio,promptTone,answerChoice') return false

  const first = steps[0] as { audioSource?: unknown }
  const second = steps[1] as { seconds?: unknown; label?: unknown }
  const third = steps[2] as { audioSource?: unknown }
  const fourth = steps[3] as { url?: unknown }

  return first.audioSource === 'description'
    && Number(second.seconds || 0) === 5
    && String(second.label || '') === '答题准备'
    && third.audioSource === 'content'
    && String(fourth.url || '') === '/static/audio/small_time.mp3'
}

function applyHearAnswerDefaultTitleConfig(module: ListeningChoiceFlowModuleV1): ListeningChoiceFlowModuleV1 {
  const perGroupSteps = (module.perGroupSteps || []).map((step) => ({ ...step, showTitle: false }))
  return normalizeListeningChoiceModule({
    ...module,
    perGroupSteps,
    updatedAt: nowIso()
  })
}

function applyHearAnswerDefaultPromptToneConfig(module: ListeningChoiceFlowModuleV1): ListeningChoiceFlowModuleV1 {
  const perGroupSteps = (DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE.perGroupSteps || []).map((step) => ({ ...step }))
  return normalizeListeningChoiceModule({
    ...module,
    perGroupSteps,
    updatedAt: nowIso()
  })
}

const DEFAULT_LISTENING_CHOICE_FLOW_MODULE = normalizeListeningChoiceModule({
  ...DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  kind: 'listening_choice',
  id: LISTENING_CHOICE_STANDARD_FLOW_ID,
  version: 1,
  name: DEFAULT_LISTENING_CHOICE_MODULE_NAME,
  status: 'published'
})

const DEFAULT_LISTENING_HEAR_ANSWER_FLOW_MODULE = normalizeListeningChoiceModule({
  ...DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE,
  kind: 'listening_choice',
  id: LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID,
  version: 1,
  name: DEFAULT_LISTENING_HEAR_ANSWER_MODULE_NAME,
  status: 'published'
})

function ensurePublishedStandardBaseline(modules: ListeningChoiceFlowModuleV1[]): ListeningChoiceFlowModuleV1[] {
  const list = Array.isArray(modules) ? modules : []
  if (list.length <= 0) {
    return [DEFAULT_LISTENING_CHOICE_FLOW_MODULE, DEFAULT_LISTENING_HEAR_ANSWER_FLOW_MODULE]
  }

  const ensureBaselineById = (
    input: ListeningChoiceFlowModuleV1[],
    baselineId: string,
    baselineName: string,
    baselineSource: unknown
  ) => {
    const hasPublishedBaseline = input.some((m) => {
      const id = String(m?.id || '')
      const status = normalizeStatus(m?.status)
      return id === baselineId && status === 'published'
    })
    if (hasPublishedBaseline) return input

    const maxVersion = input.reduce((max, m) => {
      const id = String(m?.id || '')
      if (id !== baselineId) return max
      const version = Number(m?.version || 0)
      return Number.isFinite(version) ? Math.max(max, Math.floor(version)) : max
    }, 0)

    const baseline = normalizeListeningChoiceModule({
      ...(isObjectRecord(baselineSource) ? baselineSource : {}),
      kind: 'listening_choice',
      id: baselineId,
      version: Math.max(1, maxVersion + 1),
      name: baselineName,
      status: 'published'
    })
    return [baseline, ...input]
  }

  let next = [...list]
  next = ensureBaselineById(
    next,
    LISTENING_CHOICE_STANDARD_FLOW_ID,
    DEFAULT_LISTENING_CHOICE_MODULE_NAME,
    DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
  )
  next = ensureBaselineById(
    next,
    LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID,
    DEFAULT_LISTENING_HEAR_ANSWER_MODULE_NAME,
    DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE
  )
  return next
}

class FlowModulesStore {
  state = reactive({
    listeningChoice: [DEFAULT_LISTENING_CHOICE_FLOW_MODULE, DEFAULT_LISTENING_HEAR_ANSWER_FLOW_MODULE] as ListeningChoiceFlowModuleV1[]
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
      const normalized = list.map((m: unknown) => normalizeListeningChoiceModule(m))
      let migrated = false
      const migratedList = normalized.map((module) => {
        let next = module
        if (isLegacyHearAnswerStandardTitleConfig(next)) {
          migrated = true
          next = applyHearAnswerDefaultTitleConfig(next)
        }
        if (isLegacyHearAnswerPromptToneConfig(next)) {
          migrated = true
          next = applyHearAnswerDefaultPromptToneConfig(next)
        }
        const beforeHasRecordGuide = (next.perGroupSteps || []).some((step) => step.kind === 'recordGuide')
        const ensured = ensureHearAnswerRecordGuideStep(next)
        const afterHasRecordGuide = (ensured.perGroupSteps || []).some((step) => step.kind === 'recordGuide')
        if (!beforeHasRecordGuide && afterHasRecordGuide) {
          migrated = true
        }
        next = ensured
        return next
      })
      this.state.listeningChoice = migratedList.length
        ? ensurePublishedStandardBaseline(migratedList)
        : [DEFAULT_LISTENING_CHOICE_FLOW_MODULE, DEFAULT_LISTENING_HEAR_ANSWER_FLOW_MODULE]
      if (migrated) {
        this.save()
      }
    } catch (e) {
      console.error('Failed to load flow modules', e)
      this.state.listeningChoice = [DEFAULT_LISTENING_CHOICE_FLOW_MODULE, DEFAULT_LISTENING_HEAR_ANSWER_FLOW_MODULE]
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

  getListeningChoiceDefault(preferredModuleId?: string) {
    const preferredId = normalizeText(preferredModuleId)
    if (preferredId) {
      const preferred = this.getListeningChoiceLatestPublished(preferredId)
      if (preferred) return preferred
    }
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

  upsertListeningChoice(input: unknown) {
    const src = isObjectRecord(input) ? input : {}
    const inputId = normalizeText(src.id)
    const inputVersion = Number.isFinite(Number(src.version))
      ? Math.max(1, Math.floor(Number(src.version)))
      : 1
    const idx = this.state.listeningChoice.findIndex(m => m.id === inputId && m.version === inputVersion)
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
    const normalizedModule = normalizeListeningChoiceModule({ ...normalizedInput, updatedAt: nowIso() })
    const module = ensureHearAnswerRecordGuideStep(normalizedModule)
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
    this.state.listeningChoice = [DEFAULT_LISTENING_CHOICE_FLOW_MODULE, DEFAULT_LISTENING_HEAR_ANSWER_FLOW_MODULE]
    this.persistence.schedule()
  }
}

export const flowModules = new FlowModulesStore()
