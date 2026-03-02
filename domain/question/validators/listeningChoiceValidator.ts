import type {
  ListeningChoiceGroup,
  ListeningChoiceQuestion,
  Question,
  QuestionOption,
  RichTextContent,
  SpeakingHearAnswerQuestion,
  SubQuestion
} from '/types'

export interface ValidationIssue {
  code: string
  path: string
  message: string
}

export interface QuestionValidationResult {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  diagnostics: Record<string, unknown>
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function hasRichTextContent(value: unknown): value is RichTextContent {
  if (!value || typeof value !== 'object') return false
  const richtext = value as RichTextContent
  if (richtext.type !== 'richtext' || !Array.isArray(richtext.content)) return false
  return richtext.content.some((node) => {
    if (!node || typeof node !== 'object') return false
    if (node.type === 'text') return Boolean(String(node.text || '').trim())
    if (node.type === 'image') return Boolean(String(node.url || '').trim())
    return false
  })
}

type ListeningLikeQuestion = ListeningChoiceQuestion | SpeakingHearAnswerQuestion

function validateListeningLike(question: ListeningLikeQuestion, requireChoiceAnswer: boolean): QuestionValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const metadata = (question as { metadata?: Record<string, unknown> })?.metadata

  const intro = question.content?.intro
  if (!String(intro.title || '').trim()) {
    errors.push({
      code: 'intro_title_required',
      path: 'content.intro.title',
      message: '题目标题为必填项。'
    })
  }

  if (!hasRichTextContent(intro.text)) {
    warnings.push({
      code: 'intro_text_empty',
      path: 'content.intro.text',
      message: '说明文字为空，建议补充。'
    })
  }

  const groups = toArray(question.content?.groups)
  if (groups.length === 0) {
    errors.push({
      code: 'groups_required',
      path: 'content.groups',
      message: '至少需要一个题组。'
    })
  }

  groups.forEach((group: ListeningChoiceGroup, gIndex: number) => {
    const groupPath = `content.groups[${gIndex}]`
    const subQuestions = toArray<SubQuestion>(group?.subQuestions)
    if (subQuestions.length === 0) {
      errors.push({
        code: 'sub_questions_required',
        path: `${groupPath}.subQuestions`,
        message: `题组 ${gIndex + 1} 至少需要一道小题。`
      })
      return
    }

    subQuestions.forEach((sq: SubQuestion, sqIndex: number) => {
      const sqPath = `${groupPath}.subQuestions[${sqIndex}]`
      if (!hasRichTextContent(sq?.stem)) {
        errors.push({
          code: 'sub_question_stem_required',
          path: `${sqPath}.stem`,
          message: `题组 ${gIndex + 1} 第 ${sqIndex + 1} 题题干不能为空。`
        })
      }

      if (requireChoiceAnswer) {
        const options = toArray<QuestionOption>(sq?.options)
        if (options.length < 2) {
          errors.push({
            code: 'sub_question_options_too_few',
            path: `${sqPath}.options`,
            message: `题组 ${gIndex + 1} 第 ${sqIndex + 1} 题至少需要两个选项。`
          })
        }

        const optionKeys = options
          .map((opt) => String(opt?.key || '').trim())
          .filter(Boolean)
        const uniqueKeys = new Set(optionKeys)
        if (optionKeys.length !== options.length || uniqueKeys.size !== optionKeys.length) {
          errors.push({
            code: 'sub_question_option_key_invalid',
            path: `${sqPath}.options`,
            message: `题组 ${gIndex + 1} 第 ${sqIndex + 1} 题选项 key 不能为空且不能重复。`
          })
        }

        const answers = toArray<string>(sq?.answer).map((v) => String(v || '').trim()).filter(Boolean)
        if (answers.length === 0) {
          errors.push({
            code: 'sub_question_answer_required',
            path: `${sqPath}.answer`,
            message: `题组 ${gIndex + 1} 第 ${sqIndex + 1} 题至少需要一个答案。`
          })
        } else {
          const illegal = answers.filter(a => !uniqueKeys.has(a))
          if (illegal.length > 0) {
            errors.push({
              code: 'sub_question_answer_not_in_options',
              path: `${sqPath}.answer`,
              message: `题组 ${gIndex + 1} 第 ${sqIndex + 1} 题存在不在选项中的答案：${illegal.join(', ')}。`
            })
          }
        }
      }
    })
  })

  const flowIssueRaw = metadata && typeof metadata === 'object'
    ? (metadata as Record<string, unknown>).flowNormalizationIssue
    : null
  const flowIssue = flowIssueRaw && typeof flowIssueRaw === 'object'
    ? (flowIssueRaw as Record<string, unknown>)
    : null
  const flowIssueMessage = flowIssue ? String(flowIssue.message || '').trim() : ''
  if (flowIssueMessage) {
    errors.push({
      code: String(flowIssue.code || 'flow_normalization_issue'),
      path: 'metadata.flowNormalizationIssue',
      message: flowIssueMessage
    })
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    diagnostics: {
      questionType: question.type,
      groupCount: groups.length
    }
  }
}

function validateListeningChoice(question: ListeningChoiceQuestion): QuestionValidationResult {
  return validateListeningLike(question, true)
}

function validateSpeakingHearAnswer(question: SpeakingHearAnswerQuestion): QuestionValidationResult {
  return validateListeningLike(question, false)
}

function baseResult(): QuestionValidationResult {
  return {
    ok: true,
    errors: [],
    warnings: [],
    diagnostics: {}
  }
}

export function validateQuestionBeforeSave(question: Question): QuestionValidationResult {
  if (!question || typeof question !== 'object') {
    return {
      ok: false,
      errors: [{
        code: 'question_missing',
        path: '',
        message: '题目数据为空。'
      }],
      warnings: [],
      diagnostics: {}
    }
  }

  if (question.type === 'listening_choice') {
    return validateListeningChoice(question)
  }
  if (question.type === 'speaking_hear_answer') {
    return validateSpeakingHearAnswer(question)
  }

  return baseResult()
}
