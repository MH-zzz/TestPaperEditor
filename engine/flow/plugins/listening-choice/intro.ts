import type { FlowStepPlugin } from '../types.ts'
import { reduceByAutoNext } from './utils.ts'

export const listeningChoiceIntroStepPlugin: FlowStepPlugin = {
  kind: 'intro',
  schema: {
    description: '听后选择-介绍页步骤',
    requiredFields: ['kind'],
    optionalFields: ['showTitle', 'showTitleDescription', 'showDescription', 'autoNext']
  },
  renderer: {
    view: 'intro',
    reusePreviousScreen: false,
    audioCarrier: 'intro',
    contextInfo: false
  },
  runtimeReducer: (ctx) => {
    return reduceByAutoNext(ctx.state, ctx.totalSteps, ctx.event.type, (ctx.step as any)?.autoNext)
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'intro') {
      errors.push('kind 必须为 intro')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
