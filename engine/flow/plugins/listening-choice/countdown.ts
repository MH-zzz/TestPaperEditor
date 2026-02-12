import type { FlowStepPlugin } from '../types.ts'
import { reduceByAutoNext } from './utils.ts'

export const listeningChoiceCountdownStepPlugin: FlowStepPlugin = {
  kind: 'countdown',
  schema: {
    description: '听后选择-倒计时步骤',
    requiredFields: ['kind', 'seconds'],
    optionalFields: ['label', 'showTitle', 'autoNext']
  },
  renderer: {
    view: 'countdown',
    reusePreviousScreen: false,
    audioCarrier: null,
    contextInfo: false
  },
  runtimeReducer: (ctx) => {
    return reduceByAutoNext(ctx.state, ctx.totalSteps, ctx.event.type, (ctx.step as any)?.autoNext)
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'countdown') {
      errors.push('kind 必须为 countdown')
    }
    const seconds = Number(step?.seconds || 0)
    if (!Number.isFinite(seconds) || seconds < 0) {
      errors.push('countdown.seconds 必须为非负数')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
