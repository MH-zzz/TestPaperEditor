import { reactive } from 'vue'
import type { Question, ListeningChoiceQuestion, QuestionMetadata } from '/types'
import { questionTemplates, migrateListeningChoiceFlowSplitIntro, type TemplateKey, generateId } from '/templates'
import { resolveListeningChoiceQuestion } from '../engine/flow/listening-choice/binding.ts'
import { createPersistenceScheduler } from './persistence'
import {
  loadCurrentQuestionSnapshot,
  loadRecentQuestions,
  saveCurrentQuestionSnapshot,
  saveRecentQuestions
} from '/infra/repository/questionRepository'

type DraftQuestion = Question & {
  metadata?: QuestionMetadata
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function ensureMetadata(question: DraftQuestion): DraftQuestion {
  if (!isObjectRecord(question.metadata)) question.metadata = {}
  if (!Array.isArray(question.metadata.tags)) question.metadata.tags = []
  return question
}

function normalizeListeningChoiceQuestion(question: DraftQuestion): DraftQuestion {
  if (!question || question.type !== 'listening_choice') return question

  if (!question.content || !question.flow) {
    return questionTemplates.listening_choice.create() as DraftQuestion
  }

  const migrated = migrateListeningChoiceFlowSplitIntro(question as ListeningChoiceQuestion)
  return resolveListeningChoiceQuestion(migrated as ListeningChoiceQuestion, { generateId }) as DraftQuestion
}

class QuestionDraftStore {
  state = reactive({
    currentQuestion: null as DraftQuestion | null,
    originalQuestion: null as DraftQuestion | null,
    dirty: false,
    lastDraftSavedAt: '',
    lastLibrarySavedAt: ''
  })
  private readonly draftPersistence = createPersistenceScheduler(() => this.persistCurrentNow(), 300)

  constructor() {
    this.loadFromStorage()
  }

  private setCurrentQuestion(
    nextQuestion: Question,
    options: {
      snapshot?: boolean
      normalizeFlow?: boolean
      persist?: boolean
      persistImmediately?: boolean
      markDirty?: boolean
    } = {}
  ) {
    const snapshot = options.snapshot !== false
    const normalizeFlow = options.normalizeFlow !== false
    const persist = options.persist === true
    const persistImmediately = options.persistImmediately === true
    const markDirty = options.markDirty === true

    let normalized = clone(nextQuestion) as DraftQuestion
    if (normalizeFlow) normalized = normalizeListeningChoiceQuestion(normalized)
    normalized = ensureMetadata(normalized)

    this.state.currentQuestion = normalized
    if (snapshot) this.state.originalQuestion = clone(normalized)
    if (markDirty) this.state.dirty = true
    if (persist) {
      if (persistImmediately) this.draftPersistence.flush()
      else this.draftPersistence.schedule()
    }
  }

  private createDefaultQuestion() {
    return questionTemplates.listening_choice.create() as Question
  }

  private persistCurrentNow() {
    if (!this.state.currentQuestion) return
    saveCurrentQuestionSnapshot(this.state.currentQuestion)
    this.state.lastDraftSavedAt = nowIso()
  }

  loadFromStorage() {
    try {
      const loaded = loadCurrentQuestionSnapshot<Question>() || this.createDefaultQuestion()
      this.setCurrentQuestion(loaded as Question, {
        snapshot: true,
        normalizeFlow: true,
        persist: true,
        persistImmediately: true,
        markDirty: false
      })
    } catch (e) {
      console.error('Failed to load current question from storage', e)
      this.setCurrentQuestion(this.createDefaultQuestion(), {
        snapshot: true,
        normalizeFlow: true,
        persist: true,
        persistImmediately: true,
        markDirty: false
      })
    }
    this.state.dirty = false
    return this.state.currentQuestion
  }

  createByType(type: TemplateKey) {
    const template = questionTemplates[type]
    if (!template) return null
    const created = template.create() as Question
    this.setCurrentQuestion(created, {
      snapshot: true,
      normalizeFlow: true,
      persist: true,
      persistImmediately: true,
      markDirty: false
    })
    this.state.dirty = false
    return this.state.currentQuestion
  }

  loadQuestion(question: Question) {
    this.setCurrentQuestion(question, {
      snapshot: true,
      normalizeFlow: true,
      persist: true,
      persistImmediately: true,
      markDirty: false
    })
    this.state.dirty = false
    return this.state.currentQuestion
  }

  updateDraft(nextQuestion: Question, options: { persistDraft?: boolean } = {}) {
    const persistDraft = options.persistDraft === true
    this.setCurrentQuestion(nextQuestion, {
      snapshot: false,
      normalizeFlow: false,
      persist: persistDraft,
      persistImmediately: false,
      markDirty: true
    })
  }

  saveDraft() {
    if (!this.state.currentQuestion) return
    ensureMetadata(this.state.currentQuestion)
    this.draftPersistence.flush()
  }

  resetToOriginal() {
    if (!this.state.originalQuestion) return
    this.state.currentQuestion = clone(this.state.originalQuestion)
    this.draftPersistence.flush()
    this.state.dirty = false
  }

  updateMetadata(patch: { tags?: string[]; source?: string }) {
    const current = this.state.currentQuestion
    if (!current) return

    ensureMetadata(current)
    if (patch.tags !== undefined) current.metadata.tags = [...patch.tags]
    if (patch.source !== undefined) current.metadata.source = patch.source
    this.draftPersistence.schedule()
    this.state.dirty = true
  }

  saveToRecent(limit = 50) {
    const current = this.state.currentQuestion
    if (!current) return

    try {
      this.draftPersistence.flush()
      let list = loadRecentQuestions<DraftQuestion>()

      list = list.filter(q => q.id !== current.id)
      list.unshift(clone(current))
      list = list.slice(0, Math.max(1, limit))

      saveRecentQuestions(list)
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
