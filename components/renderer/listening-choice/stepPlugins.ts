import type { FlowStepPlugin } from '/engine/flow/plugins/types.ts'
import {
  getListeningChoiceStepPlugin,
  listListeningChoiceStepPlugins
} from '/engine/flow/plugins/listening-choice/index.ts'

export type ListeningChoiceStepAudioCarrier = 'intro' | 'playAudio' | 'promptTone' | null
export type ListeningChoiceStepRenderView =
  | 'intro'
  | 'groupPrompt'
  | 'countdown'
  | 'playAudio'
  | 'answerChoice'
  | 'finish'
  | 'unsupported'
export type ListeningChoiceStepKind =
  | 'intro'
  | 'groupPrompt'
  | 'countdown'
  | 'playAudio'
  | 'promptTone'
  | 'answerChoice'
  | 'finish'
  | 'unknown'

export interface ListeningChoiceStepBehaviorPlugin {
  kind: string
  reusePreviousScreen?: boolean
  audioCarrier?: ListeningChoiceStepAudioCarrier
  renderView?: ListeningChoiceStepRenderView
  contextInfo?: boolean
}

const DEFAULT_PLUGIN: ListeningChoiceStepBehaviorPlugin = {
  kind: 'unknown',
  reusePreviousScreen: false,
  audioCarrier: null,
  renderView: 'unsupported',
  contextInfo: false
}

function normalizeRendererView(view: any): ListeningChoiceStepRenderView {
  const next = String(view || '').trim()
  if (
    next === 'intro' ||
    next === 'groupPrompt' ||
    next === 'countdown' ||
    next === 'playAudio' ||
    next === 'answerChoice' ||
    next === 'finish'
  ) {
    return next
  }
  return 'unsupported'
}

function normalizeAudioCarrier(carrier: any): ListeningChoiceStepAudioCarrier {
  const next = String(carrier || '').trim()
  if (next === 'intro' || next === 'playAudio' || next === 'promptTone') return next
  return null
}

function toBehaviorPlugin(plugin?: FlowStepPlugin | null): ListeningChoiceStepBehaviorPlugin {
  if (!plugin) return DEFAULT_PLUGIN
  return {
    kind: String(plugin.kind || 'unknown'),
    reusePreviousScreen: plugin.renderer?.reusePreviousScreen === true,
    audioCarrier: normalizeAudioCarrier(plugin.renderer?.audioCarrier),
    renderView: normalizeRendererView(plugin.renderer?.view),
    contextInfo: plugin.renderer?.contextInfo === true
  }
}

const STEP_BEHAVIOR_PLUGINS: Record<string, ListeningChoiceStepBehaviorPlugin> =
  listListeningChoiceStepPlugins().reduce((acc, plugin) => {
    const kind = String(plugin?.kind || '').trim()
    if (!kind) return acc
    acc[kind] = toBehaviorPlugin(plugin)
    return acc
  }, {} as Record<string, ListeningChoiceStepBehaviorPlugin>)

function normalizeStepKind(step: any): string {
  return String(step?.kind || '').trim()
}

export function getListeningChoiceStepKind(step: any): ListeningChoiceStepKind {
  const kind = normalizeStepKind(step)
  if (!kind) return 'unknown'
  if (
    kind === 'intro' ||
    kind === 'groupPrompt' ||
    kind === 'countdown' ||
    kind === 'playAudio' ||
    kind === 'promptTone' ||
    kind === 'answerChoice' ||
    kind === 'finish'
  ) {
    return kind
  }
  return 'unknown'
}

export function isListeningChoiceStepKind(step: any, kind: ListeningChoiceStepKind): boolean {
  return getListeningChoiceStepKind(step) === kind
}

export function isListeningChoiceStepOneOf(step: any, kinds: ListeningChoiceStepKind[]): boolean {
  const set = new Set(kinds)
  return set.has(getListeningChoiceStepKind(step))
}

export function isListeningChoiceContextInfoStep(step: any): boolean {
  return getListeningChoiceStepBehavior(step).contextInfo === true
}

export function isListeningChoiceQuestionCarrierStep(step: any): boolean {
  return isListeningChoiceStepOneOf(step, ['groupPrompt', 'playAudio', 'answerChoice'])
}

export function getListeningChoiceStepBehavior(step: any): ListeningChoiceStepBehaviorPlugin {
  const kind = normalizeStepKind(step)
  if (!kind) return DEFAULT_PLUGIN
  const cached = STEP_BEHAVIOR_PLUGINS[kind]
  if (cached) return cached
  return toBehaviorPlugin(getListeningChoiceStepPlugin(kind))
}

export function shouldReuseListeningChoicePreviousScreen(step: any): boolean {
  return getListeningChoiceStepBehavior(step).reusePreviousScreen === true
}

export function resolveListeningChoiceStepAudioCarrier(step: any): ListeningChoiceStepAudioCarrier {
  return getListeningChoiceStepBehavior(step).audioCarrier || null
}

export function resolveListeningChoiceStepRenderView(step: any): ListeningChoiceStepRenderView {
  return getListeningChoiceStepBehavior(step).renderView || 'unsupported'
}
