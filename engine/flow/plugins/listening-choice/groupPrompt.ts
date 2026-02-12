import type { FlowStepPlugin } from '../types.ts'

export const listeningChoiceGroupPromptStepPlugin: FlowStepPlugin = {
  kind: 'groupPrompt',
  schema: {
    description: '听后选择-题组提示步骤',
    requiredFields: ['kind', 'groupId'],
    optionalFields: ['showTitle', 'autoNext']
  },
  renderer: {
    view: 'groupPrompt',
    reusePreviousScreen: false,
    audioCarrier: null,
    contextInfo: false
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'groupPrompt') {
      errors.push('kind 必须为 groupPrompt')
    }
    if (!String(step?.groupId || '').trim()) {
      errors.push('groupPrompt 缺少 groupId')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
