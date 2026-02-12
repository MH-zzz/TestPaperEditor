import type { Question } from '/types'
import { validateQuestionBeforeSave, type QuestionValidationResult } from '../validators/listeningChoiceValidator.ts'

type NormalizeQuestionFn = (question: Question) => Question

type SaveQuestionDraftOptions = {
  defaultTags?: string[]
  normalizeQuestion?: NormalizeQuestionFn
}

export type SaveQuestionDraftResult = QuestionValidationResult & {
  question?: Question
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function applyMetadataDefaults(question: any, defaultTags: string[]) {
  if (!question.metadata) question.metadata = {}
  if ((!question.metadata.tags || question.metadata.tags.length === 0) && defaultTags.length > 0) {
    question.metadata.tags = [...defaultTags]
  }
  question.metadata.updatedAt = new Date().toLocaleString()
}

export function saveQuestionDraft(
  question: Question,
  options: SaveQuestionDraftOptions = {}
): SaveQuestionDraftResult {
  const defaultTags = Array.isArray(options.defaultTags) ? options.defaultTags : []

  let next = clone(question) as Question
  if (typeof options.normalizeQuestion === 'function') {
    next = options.normalizeQuestion(next)
  }
  applyMetadataDefaults(next as any, defaultTags)

  const validation = validateQuestionBeforeSave(next)
  if (!validation.ok) return validation

  return {
    ...validation,
    question: clone(next)
  }
}
