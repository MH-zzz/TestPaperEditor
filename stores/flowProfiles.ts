import { reactive } from 'vue'
import type { FlowProfileV1, QuestionType } from '/types'
import { LISTENING_CHOICE_STANDARD_FLOW_ID } from '../flows/listeningChoiceFlowModules'
import {
  canSubmitFlowProfiles,
  diagnoseFlowProfileRules,
  scoreProfiles,
  type FlowRoutingCtx,
  type FlowProfileDiagnostics,
  type FlowProfileSubmitValidation,
  type FlowProfileScoreResult
} from '/domain/flow-profile/usecases/scoreProfiles'
import { createPersistenceScheduler } from './persistence'

const STORAGE_KEY = 'editor_flow_profiles_v1'

function nowIso() {
  return new Date().toISOString()
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeQuestionType(v: unknown): QuestionType {
  const s = String(v || '')
  if (s === 'listening_choice') return 'listening_choice'
  if (s === 'listening_fill') return 'listening_fill'
  if (s === 'listening_match') return 'listening_match'
  if (s === 'listening_order') return 'listening_order'
  if (s === 'speaking') return 'speaking'
  if (s === 'speaking_steps') return 'speaking_steps'
  return 'listening_choice'
}

function normalizeProfile(input: unknown): FlowProfileV1 {
  const src = isObjectRecord(input) ? input : {}
  const module = isObjectRecord(src.module) ? src.module : {}
  const now = nowIso()
  return {
    id: typeof src.id === 'string' && src.id ? src.id : `profile_${Date.now()}`,
    questionType: normalizeQuestionType(src.questionType),
    region: typeof src.region === 'string' ? src.region : undefined,
    scene: typeof src.scene === 'string' ? src.scene : undefined,
    grade: typeof src.grade === 'string' ? src.grade : undefined,
    module: {
      id: typeof module.id === 'string' && module.id ? module.id : LISTENING_CHOICE_STANDARD_FLOW_ID,
      version: Number.isFinite(Number(module.version)) ? Math.max(1, Math.floor(Number(module.version))) : 1
    },
    priority: Number.isFinite(Number(src.priority)) ? Number(src.priority) : 0,
    enabled: typeof src.enabled === 'boolean' ? src.enabled : true,
    note: typeof src.note === 'string' ? src.note : undefined,
    createdAt: typeof src.createdAt === 'string' && src.createdAt ? src.createdAt : now,
    updatedAt: typeof src.updatedAt === 'string' && src.updatedAt ? src.updatedAt : now
  }
}

const DEFAULT_LISTENING_CHOICE_PROFILE: FlowProfileV1 = normalizeProfile({
  id: 'profile:listening_choice:default',
  questionType: 'listening_choice',
  module: { id: LISTENING_CHOICE_STANDARD_FLOW_ID, version: 1 },
  priority: 0,
  enabled: true,
  note: '听后选择默认流程'
})

class FlowProfilesStore {
  state = reactive({
    profiles: [DEFAULT_LISTENING_CHOICE_PROFILE] as FlowProfileV1[]
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
      const list = Array.isArray(parsed?.profiles) ? parsed.profiles : []
      const normalized = list.map((p) => normalizeProfile(p))
      this.state.profiles = normalized.length ? normalized : [DEFAULT_LISTENING_CHOICE_PROFILE]
    } catch (e) {
      console.error('Failed to load flow profiles', e)
      this.state.profiles = [DEFAULT_LISTENING_CHOICE_PROFILE]
    }
  }

  save() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify({
        profiles: this.state.profiles
      }))
    } catch (e) {
      console.error('Failed to save flow profiles', e)
    }
  }

  listByQuestionType(questionType: QuestionType) {
    return this.state.profiles
      .filter(p => p.questionType === questionType)
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
  }

  getById(id: string) {
    return this.state.profiles.find(p => p.id === id) || null
  }

  private buildNextProfilesWithUpsert(profile: FlowProfileV1) {
    const idx = this.state.profiles.findIndex(p => p.id === profile.id)
    const next = [...this.state.profiles]
    if (idx >= 0) {
      const createdAt = next[idx].createdAt || profile.createdAt
      next[idx] = { ...profile, createdAt }
    } else {
      next.push(profile)
    }
    return next
  }

  private buildNextProfilesAfterRemove(id: string) {
    const idx = this.state.profiles.findIndex(p => p.id === id)
    if (idx < 0) return { ok: false as const, reason: 'not_found', next: this.state.profiles }

    const target = this.state.profiles[idx]
    const next = this.state.profiles.filter(p => p.id !== id)

    // Keep at least one routing rule per question type.
    const hasSameType = next.some(p => p.questionType === target.questionType)
    if (!hasSameType) {
      if (target?.questionType === 'listening_choice') {
        next.push(DEFAULT_LISTENING_CHOICE_PROFILE)
      } else {
        return { ok: false as const, reason: 'must_keep_one_per_type', next: this.state.profiles }
      }
    }

    return { ok: true as const, reason: '', next, target }
  }

  private commitProfiles(next: FlowProfileV1[], _payload: Record<string, unknown>) {
    this.state.profiles = next
    this.persistence.schedule()
  }

  score(
    questionType: QuestionType,
    ctx?: FlowRoutingCtx,
    options: { topN?: number } = {}
  ): FlowProfileScoreResult {
    const list = this.listByQuestionType(questionType)
    return scoreProfiles(list, ctx || {}, options)
  }

  diagnose(questionType: QuestionType): FlowProfileDiagnostics {
    const list = this.listByQuestionType(questionType)
    return diagnoseFlowProfileRules(list)
  }

  validateBeforeSubmit(questionType: QuestionType): FlowProfileSubmitValidation {
    const list = this.listByQuestionType(questionType)
    return canSubmitFlowProfiles(list)
  }

  upsertWithDiagnostics(profileInput: unknown) {
    const inputRecord = isObjectRecord(profileInput) ? profileInput : {}
    const profile = normalizeProfile({ ...inputRecord, updatedAt: nowIso() })
    const next = this.buildNextProfilesWithUpsert(profile)
    const nextQuestionTypeProfiles = next.filter(p => p.questionType === profile.questionType)
    const validation = canSubmitFlowProfiles(nextQuestionTypeProfiles)
    if (!validation.ok) {
      return {
        ok: false,
        profile,
        validation
      }
    }
    this.commitProfiles(next, { id: profile.id })
    return {
      ok: true,
      profile,
      validation
    }
  }

  upsert(profileInput: unknown) {
    return this.upsertWithDiagnostics(profileInput)
  }

  removeWithDiagnostics(id: string) {
    const removed = this.buildNextProfilesAfterRemove(id)
    if (!removed.ok) {
      return {
        ok: false,
        reason: removed.reason,
        validation: null
      }
    }

    const questionType = removed.target?.questionType || 'listening_choice'
    const nextQuestionTypeProfiles = removed.next.filter(p => p.questionType === questionType)
    const validation = canSubmitFlowProfiles(nextQuestionTypeProfiles)
    if (!validation.ok) {
      return {
        ok: false,
        reason: 'diagnostics_failed',
        validation
      }
    }

    this.commitProfiles(removed.next, { id, removed: true })
    return {
      ok: true,
      reason: '',
      validation
    }
  }

  remove(id: string) {
    return this.removeWithDiagnostics(id).ok
  }

  resolve(questionType: QuestionType, ctx?: { region?: string; scene?: string; grade?: string }) {
    const scored = this.score(questionType, ctx || {}, { topN: 1 })
    if (scored.bestCandidate?.profile) return scored.bestCandidate.profile

    const fallback = this.listByQuestionType(questionType)[0]
    return fallback || null
  }

  resetToDefault() {
    this.state.profiles = [DEFAULT_LISTENING_CHOICE_PROFILE]
    this.persistence.schedule()
  }
}

export const flowProfiles = new FlowProfilesStore()
