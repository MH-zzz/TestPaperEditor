import type { FlowStepPlugin } from '../types.ts'

export const listeningChoiceFinishStepPlugin: FlowStepPlugin = {
  kind: 'finish',
  schema: {
    description: '听后选择-完成步骤',
    requiredFields: ['kind'],
    optionalFields: ['text', 'showTitle']
  },
  renderer: {
    view: 'finish',
    reusePreviousScreen: false,
    audioCarrier: null,
    contextInfo: false
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'finish') {
      errors.push('kind 必须为 finish')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
