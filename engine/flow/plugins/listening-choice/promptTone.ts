import type { FlowStepPlugin } from '../types.ts'
import { reduceByAutoNext } from './utils.ts'

export const listeningChoicePromptToneStepPlugin: FlowStepPlugin = {
  kind: 'promptTone',
  schema: {
    description: '听后选择-提示音步骤',
    requiredFields: ['kind'],
    optionalFields: ['url', 'groupId', 'showTitle', 'autoNext']
  },
  renderer: {
    view: 'unsupported',
    reusePreviousScreen: true,
    audioCarrier: 'promptTone',
    contextInfo: false
  },
  runtimeReducer: (ctx) => {
    return reduceByAutoNext(ctx.state, ctx.totalSteps, ctx.event.type, (ctx.step as any)?.autoNext)
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'promptTone') {
      errors.push('kind 必须为 promptTone')
    }

    if (!String(step?.url || '').trim()) {
      warnings.push('promptTone 未配置 url，将无法播放提示音')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
