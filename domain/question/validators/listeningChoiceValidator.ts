import type { Question, ListeningChoiceQuestion, RichTextContent } from '/types'

export interface ValidationIssue {
  code: string
  path: string
  message: string
}

export interface QuestionValidationResult {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  diagnostics: Record<string, any>
}

function toArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : []
}

function hasRichTextContent(value: any): value is RichTextContent {
  if (!value || value.type !== 'richtext' || !Array.isArray(value.content)) return false
  return value.content.some((node: any) => {
    if (!node || typeof node !== 'object') return false
    if (node.type === 'text') return Boolean(String(node.text || '').trim())
    if (node.type === 'image') return Boolean(String(node.url || '').trim())
    return false
  })
}

function validateListeningChoice(question: ListeningChoiceQuestion): QuestionValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  const intro = question.content?.intro || ({} as any)
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

  groups.forEach((group: any, gIndex: number) => {
    const groupPath = `content.groups[${gIndex}]`
    const subQuestions = toArray(group?.subQuestions)
    if (subQuestions.length === 0) {
      errors.push({
        code: 'sub_questions_required',
        path: `${groupPath}.subQuestions`,
        message: `题组 ${gIndex + 1} 至少需要一道小题。`
      })
      return
    }

    subQuestions.forEach((sq: any, sqIndex: number) => {
      const sqPath = `${groupPath}.subQuestions[${sqIndex}]`
      if (!hasRichTextContent(sq?.stem)) {
        errors.push({
          code: 'sub_question_stem_required',
          path: `${sqPath}.stem`,
          message: `题组 ${gIndex + 1} 第 ${sqIndex + 1} 题题干不能为空。`
        })
      }

      const options = toArray(sq?.options)
      if (options.length < 2) {
        errors.push({
          code: 'sub_question_options_too_few',
          path: `${sqPath}.options`,
          message: `题组 ${gIndex + 1} 第 ${sqIndex + 1} 题至少需要两个选项。`
        })
      }

      const optionKeys = options
        .map((opt: any) => String(opt?.key || '').trim())
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
    })
  })

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
    return validateListeningChoice(question as ListeningChoiceQuestion)
  }

  return baseResult()
}
