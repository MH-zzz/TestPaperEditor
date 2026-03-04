import type { Question } from '/types'
import { validateQuestionBeforeSave, type QuestionValidationResult } from '../validators/listeningChoiceValidator.ts'
import { parseQuestionSnapshot } from '../../schemas/runtimeBoundarySchemas.ts'

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

type QuestionWithMetadata = Question & {
  metadata?: {
    tags?: string[]
    updatedAt?: string
    [key: string]: unknown
  }
}

function createSchemaInvalidResult(code: string, message: string): SaveQuestionDraftResult {
  return {
    ok: false,
    errors: [{
      code,
      path: '',
      message
    }],
    warnings: [],
    diagnostics: {}
  }
}

function applyMetadataDefaults(question: QuestionWithMetadata, defaultTags: string[]) {
  if (!question.metadata || typeof question.metadata !== 'object') question.metadata = {}
  if ((!Array.isArray(question.metadata.tags) || question.metadata.tags.length === 0) && defaultTags.length > 0) {
    question.metadata.tags = [...defaultTags]
  }
  question.metadata.updatedAt = new Date().toLocaleString()
}

export function saveQuestionDraft(
  question: Question,
  options: SaveQuestionDraftOptions = {}
): SaveQuestionDraftResult {
  const defaultTags = Array.isArray(options.defaultTags) ? options.defaultTags : []

  const safeInput = parseQuestionSnapshot(question)
  if (!safeInput) {
    return createSchemaInvalidResult('question_schema_invalid', '题目结构不合法，无法保存。')
  }

  let next = clone(safeInput) as Question
  if (typeof options.normalizeQuestion === 'function') {
    next = options.normalizeQuestion(next)
    const normalized = parseQuestionSnapshot(next)
    if (!normalized) {
      return createSchemaInvalidResult('normalized_question_schema_invalid', '题目标准化结果不合法，无法保存。')
    }
    next = normalized
  }
  applyMetadataDefaults(next as QuestionWithMetadata, defaultTags)

  const validation = validateQuestionBeforeSave(next)
  if (!validation.ok) return validation

  return {
    ...validation,
    question: clone(next)
  }
}
