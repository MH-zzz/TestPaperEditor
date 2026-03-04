import { reactive } from 'vue'
import type {
  ListeningChoiceQuestion,
  Question,
  QuestionMetadata,
  SpeakingHearAnswerQuestion
} from '/types'
import {
  createListeningHearAnswerTemplate,
  questionTemplates,
  migrateListeningChoiceFlowSplitIntro,
  createListeningChoiceTemplate,
  type TemplateKey,
  generateId
} from '/templates'
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
type DraftEntryMode = 'draft' | 'new' | 'library'

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
  if (!question || (question.type !== 'listening_choice' && question.type !== 'speaking_hear_answer')) return question

  if (!question.content || !question.flow) {
    return question.type === 'speaking_hear_answer'
      ? questionTemplates.speaking_hear_answer.create() as DraftQuestion
      : questionTemplates.listening_choice.create() as DraftQuestion
  }

  if (question.type === 'listening_choice') {
    const migrated = migrateListeningChoiceFlowSplitIntro(question as ListeningChoiceQuestion)
    return resolveListeningChoiceQuestion(migrated as ListeningChoiceQuestion, { generateId }) as DraftQuestion
  }
  return resolveListeningChoiceQuestion(question as SpeakingHearAnswerQuestion, { generateId }) as DraftQuestion
}

class QuestionDraftStore {
  state = reactive({
    currentQuestion: null as DraftQuestion | null,
    originalQuestion: null as DraftQuestion | null,
    entryMode: 'draft' as DraftEntryMode,
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
      entryMode?: DraftEntryMode
    } = {}
  ) {
    const snapshot = options.snapshot !== false
    const normalizeFlow = options.normalizeFlow !== false
    const persist = options.persist === true
    const persistImmediately = options.persistImmediately === true
    const markDirty = options.markDirty === true
    const entryMode = options.entryMode

    let normalized = clone(nextQuestion) as DraftQuestion
    if (normalizeFlow) normalized = normalizeListeningChoiceQuestion(normalized)
    normalized = ensureMetadata(normalized)

    this.state.currentQuestion = normalized
    if (snapshot) this.state.originalQuestion = clone(normalized)
    if (entryMode) this.state.entryMode = entryMode
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
        markDirty: false,
        entryMode: 'draft'
      })
    } catch (e) {
      console.error('Failed to load current question from storage', e)
      this.setCurrentQuestion(this.createDefaultQuestion(), {
        snapshot: true,
        normalizeFlow: true,
        persist: true,
        persistImmediately: true,
        markDirty: false,
        entryMode: 'draft'
      })
    }
    this.state.dirty = false
    return this.state.currentQuestion
  }

  createByType(type: TemplateKey, options: { useStoredTemplate?: boolean } = {}) {
    const template = questionTemplates[type]
    if (!template) return null
    let created: Question
    if (type === 'listening_choice' && options.useStoredTemplate === false) {
      created = createListeningChoiceTemplate({ useStoredTemplate: false })
    } else if (type === 'speaking_hear_answer' && options.useStoredTemplate === false) {
      created = createListeningHearAnswerTemplate({ useStoredTemplate: false })
    } else {
      created = template.create() as Question
    }
    this.setCurrentQuestion(created, {
      snapshot: true,
      normalizeFlow: true,
      persist: true,
      persistImmediately: true,
      markDirty: false,
      entryMode: 'new'
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
      markDirty: false,
      entryMode: 'library'
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

  updateMetadata(patch: { tags?: string[]; source?: string; region?: string }) {
    const current = this.state.currentQuestion
    if (!current) return

    ensureMetadata(current)
    if (patch.tags !== undefined) current.metadata.tags = [...patch.tags]
    if (patch.source !== undefined) current.metadata.source = patch.source
    if (patch.region !== undefined) {
      const region = String(patch.region || '').trim()
      if (region) current.metadata.region = region
      else delete current.metadata.region

      const flowContext = isObjectRecord(current.metadata.flowContext)
        ? { ...current.metadata.flowContext }
        : {}
      if (region) flowContext.region = region
      else delete flowContext.region
      if (Object.keys(flowContext).length > 0) current.metadata.flowContext = flowContext
      else delete current.metadata.flowContext
    }
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
