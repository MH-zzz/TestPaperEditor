import type { FlowStepPlugin } from '../types.ts'
import { reduceByAutoNext } from './utils.ts'

export const listeningChoicePlayAudioStepPlugin: FlowStepPlugin = {
  kind: 'playAudio',
  schema: {
    description: '听后选择-播放音频步骤',
    requiredFields: ['kind', 'groupId', 'audioSource'],
    optionalFields: ['showTitle', 'showQuestionTitle', 'showQuestionTitleDescription', 'showGroupPrompt', 'autoNext']
  },
  renderer: {
    view: 'playAudio',
    reusePreviousScreen: false,
    audioCarrier: 'playAudio',
    contextInfo: true
  },
  runtimeReducer: (ctx) => {
    return reduceByAutoNext(ctx.state, ctx.totalSteps, ctx.event.type, (ctx.step as any)?.autoNext)
  },
  validator: (step: any) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (String(step?.kind || '') !== 'playAudio') {
      errors.push('kind 必须为 playAudio')
    }

    if (!String(step?.groupId || '').trim()) {
      errors.push('playAudio 缺少 groupId')
    }

    const audioSource = String(step?.audioSource || '')
    if (audioSource !== 'description' && audioSource !== 'content') {
      errors.push('playAudio.audioSource 必须是 description 或 content')
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    }
  }
}
