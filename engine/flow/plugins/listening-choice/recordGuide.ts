import type { FlowStepPlugin } from '../types.ts'
import { reduceByAutoNext } from './utils.ts'

export const listeningChoiceRecordGuideStepPlugin: FlowStepPlugin = {
  kind: 'recordGuide',
  schema: {
    description: '听后回答-录音说明步骤',
    requiredFields: ['kind'],
    optionalFields: [
      'groupId',
      'questionIds',
      'guideText',
      'guideAudioUrl',
      'showTitle',
      'showQuestionTitle',
      'showQuestionTitleDescription',
      'showGroupPrompt',
      'screenStrategy',
      'autoNext'
    ]
  },
  renderer: {
    view: 'recordGuide',
    reusePreviousScreen: false,
    audioCarrier: 'recordGuide',
    contextInfo: true
  },
  runtimeReducer: (ctx) => {
    return reduceByAutoNext(ctx.state, ctx.totalSteps, ctx.event.type, (ctx.step as any)?.autoNext)
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'recordGuide') {
      errors.push('kind 必须为 recordGuide')
    }

    const groupId = String(step?.groupId || '').trim()
    const questionIds = Array.isArray(step?.questionIds) ? step.questionIds : []
    if (!groupId && questionIds.length === 0) {
      warnings.push('recordGuide 未配置 groupId/questionIds，可能无法匹配题目')
    }

    const audioUrl = String(step?.guideAudioUrl || '').trim()
    if (!audioUrl) {
      warnings.push('recordGuide 未配置 guideAudioUrl，将无法播放录音说明音频')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
