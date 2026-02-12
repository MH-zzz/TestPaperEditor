import type { FlowStepPlugin } from '../types.ts'
import { reduceByAutoNext } from './utils.ts'

export const listeningChoiceAnswerChoiceStepPlugin: FlowStepPlugin = {
  kind: 'answerChoice',
  schema: {
    description: '听后选择-答题步骤',
    requiredFields: ['kind'],
    optionalFields: ['groupId', 'questionIds', 'showQuestionTitle', 'showQuestionTitleDescription', 'showGroupPrompt', 'autoNext']
  },
  renderer: {
    view: 'answerChoice',
    reusePreviousScreen: false,
    audioCarrier: null,
    contextInfo: true
  },
  runtimeReducer: (ctx) => {
    return reduceByAutoNext(ctx.state, ctx.totalSteps, ctx.event.type, (ctx.step as any)?.autoNext)
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'answerChoice') {
      errors.push('kind 必须为 answerChoice')
    }

    const groupId = String(step?.groupId || '').trim()
    const questionIds = Array.isArray(step?.questionIds) ? step.questionIds : []
    if (!groupId && questionIds.length === 0) {
      warnings.push('answerChoice 未配置 groupId/questionIds，可能无法匹配题目')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
