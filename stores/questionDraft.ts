import { reactive } from 'vue'
import type { Question, ListeningChoiceQuestion } from '/types'
import { questionTemplates, migrateListeningChoiceFlowSplitIntro, type TemplateKey, generateId } from '/templates'
import { resolveListeningChoiceQuestion } from '../engine/flow/listening-choice/binding.ts'

const CURRENT_QUESTION_KEY = 'currentQuestion'
const RECENT_QUESTIONS_KEY = 'recentQuestions'

type DraftQuestion = Question & {
  metadata?: {
    tags?: string[]
    source?: string
    [key: string]: any
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function ensureMetadata(question: any) {
  if (!question || typeof question !== 'object') return
  if (!question.metadata || typeof question.metadata !== 'object') question.metadata = {}
  if (!Array.isArray(question.metadata.tags)) question.metadata.tags = []
}

function normalizeListeningChoiceQuestion(question: any) {
  if (!question || question.type !== 'listening_choice') return question

  if (!question.content || !question.flow) {
    return questionTemplates.listening_choice.create()
  }

  const migrated = migrateListeningChoiceFlowSplitIntro(question as ListeningChoiceQuestion)
  return resolveListeningChoiceQuestion(migrated as ListeningChoiceQuestion, { generateId }) as any
}

class QuestionDraftStore {
  state = reactive({
    currentQuestion: null as DraftQuestion | null,
    originalQuestion: null as DraftQuestion | null,
    dirty: false,
    lastDraftSavedAt: '',
    lastLibrarySavedAt: ''
  })

  constructor() {
    this.loadFromStorage()
  }

  private setCurrentQuestion(
    nextQuestion: Question,
    options: { snapshot?: boolean; normalizeFlow?: boolean; persist?: boolean; markDirty?: boolean } = {}
  ) {
    const snapshot = options.snapshot !== false
    const normalizeFlow = options.normalizeFlow !== false
    const persist = options.persist === true
    const markDirty = options.markDirty === true

    let normalized = clone(nextQuestion) as any
    if (normalizeFlow) normalized = normalizeListeningChoiceQuestion(normalized)
    ensureMetadata(normalized)

    this.state.currentQuestion = normalized as DraftQuestion
    if (snapshot) this.state.originalQuestion = clone(normalized as DraftQuestion)
    if (markDirty) this.state.dirty = true
    if (persist) {
      this.persistCurrent()
      this.state.lastDraftSavedAt = nowIso()
    }
  }

  private createDefaultQuestion() {
    return questionTemplates.listening_choice.create() as Question
  }

  private persistCurrent() {
    if (!this.state.currentQuestion) return
    uni.setStorageSync(CURRENT_QUESTION_KEY, JSON.stringify(this.state.currentQuestion))
  }

  loadFromStorage() {
    try {
      const stored = uni.getStorageSync(CURRENT_QUESTION_KEY)
      const loaded = stored ? JSON.parse(stored) : this.createDefaultQuestion()
      this.setCurrentQuestion(loaded as Question, { snapshot: true, normalizeFlow: true, persist: true, markDirty: false })
    } catch (e) {
      console.error('Failed to load current question from storage', e)
      this.setCurrentQuestion(this.createDefaultQuestion(), { snapshot: true, normalizeFlow: true, persist: true, markDirty: false })
    }
    this.state.dirty = false
    return this.state.currentQuestion
  }

  createByType(type: TemplateKey) {
    const template = questionTemplates[type]
    if (!template) return null
    const created = template.create() as Question
    this.setCurrentQuestion(created, { snapshot: true, normalizeFlow: true, persist: true, markDirty: false })
    this.state.dirty = false
    return this.state.currentQuestion
  }

  loadQuestion(question: Question) {
    this.setCurrentQuestion(question, { snapshot: true, normalizeFlow: true, persist: true, markDirty: false })
    this.state.dirty = false
    return this.state.currentQuestion
  }

  updateDraft(nextQuestion: Question, options: { persistDraft?: boolean } = {}) {
    const persistDraft = options.persistDraft === true
    this.setCurrentQuestion(nextQuestion, {
      snapshot: false,
      normalizeFlow: false,
      persist: persistDraft,
      markDirty: true
    })
  }

  saveDraft() {
    if (!this.state.currentQuestion) return
    ensureMetadata(this.state.currentQuestion)
    this.persistCurrent()
    this.state.lastDraftSavedAt = nowIso()
  }

  resetToOriginal() {
    if (!this.state.originalQuestion) return
    this.state.currentQuestion = clone(this.state.originalQuestion)
    this.persistCurrent()
    this.state.dirty = false
    this.state.lastDraftSavedAt = nowIso()
  }

  updateMetadata(patch: { tags?: string[]; source?: string }) {
    const current = this.state.currentQuestion as any
    if (!current) return

    ensureMetadata(current)
    if (patch.tags !== undefined) current.metadata.tags = [...patch.tags]
    if (patch.source !== undefined) current.metadata.source = patch.source
    this.persistCurrent()
    this.state.dirty = true
    this.state.lastDraftSavedAt = nowIso()
  }

  saveToRecent(limit = 50) {
    const current = this.state.currentQuestion
    if (!current) return

    try {
      const stored = uni.getStorageSync(RECENT_QUESTIONS_KEY)
      let list: DraftQuestion[] = stored ? JSON.parse(stored) : []

      list = list.filter(q => q.id !== current.id)
      list.unshift(clone(current))
      list = list.slice(0, Math.max(1, limit))

      uni.setStorageSync(RECENT_QUESTIONS_KEY, JSON.stringify(list))
      this.state.originalQuestion = clone(current)
      this.state.dirty = false
      const now = nowIso()
      this.state.lastDraftSavedAt = now
      this.state.lastLibrarySavedAt = now
    } catch (e) {
      console.error('Failed to save recent questions', e)
    }
  }
}

export const questionDraft = new QuestionDraftStore()
