import { createFlowStepPluginRegistry } from '../registry.ts'
import type { FlowStepPlugin, FlowStepPluginValidationResult } from '../types.ts'
import { listeningChoiceIntroStepPlugin } from './intro.ts'
import { listeningChoiceGroupPromptStepPlugin } from './groupPrompt.ts'
import { listeningChoiceCountdownStepPlugin } from './countdown.ts'
import { listeningChoicePlayAudioStepPlugin } from './playAudio.ts'
import { listeningChoicePromptToneStepPlugin } from './promptTone.ts'
import { listeningChoiceAnswerChoiceStepPlugin } from './answerChoice.ts'
import { listeningChoiceFinishStepPlugin } from './finish.ts'

const registry = createFlowStepPluginRegistry<FlowStepPlugin>('listening-choice')

export const LISTENING_CHOICE_STEP_PLUGINS: FlowStepPlugin[] = [
  listeningChoiceIntroStepPlugin,
  listeningChoiceGroupPromptStepPlugin,
  listeningChoiceCountdownStepPlugin,
  listeningChoicePlayAudioStepPlugin,
  listeningChoicePromptToneStepPlugin,
  listeningChoiceAnswerChoiceStepPlugin,
  listeningChoiceFinishStepPlugin
]

registry.registerMany(LISTENING_CHOICE_STEP_PLUGINS)

const UNKNOWN_STEP_PLUGIN: FlowStepPlugin = {
  kind: 'unknown',
  schema: {
    description: '未知步骤',
    requiredFields: ['kind']
  },
  renderer: {
    view: 'unsupported',
    reusePreviousScreen: false,
    audioCarrier: null,
    contextInfo: false
  },
  validator: () => ({
    ok: true,
    errors: [],
    warnings: []
  })
}

export function listListeningChoiceStepPlugins(): FlowStepPlugin[] {
  return registry.list()
}

export function getListeningChoiceStepPlugin(kind: string): FlowStepPlugin {
  const hit = registry.get(kind)
  return hit || { ...UNKNOWN_STEP_PLUGIN, kind: String(kind || 'unknown') }
}

export function validateListeningChoiceStep(kind: string, step: any): FlowStepPluginValidationResult {
  const plugin = getListeningChoiceStepPlugin(kind)
  if (typeof plugin.validator === 'function') {
    return plugin.validator(step)
  }
  return {
    ok: true,
    errors: [],
    warnings: []
  }
}

export function ensureListeningChoiceStepPlugin(kind: string): FlowStepPlugin {
  return registry.ensure(kind)
}
