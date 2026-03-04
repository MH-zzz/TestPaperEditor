import type { FlowVisualCompileIssue } from '/types'
import type { VisualLinearStep } from './compileGraphToSteps'

export type FlowLinearFixAction =
  | { type: 'insert'; kind: 'playAudio' | 'countdown' | 'answerChoice'; at: 'start' | 'end' | 'after_intro' | 'after_first_play_audio' }
  | { type: 'move_answer_after_first_play_audio' }
  | { type: 'move_intro_to_start' }
  | { type: 'remove_extra_intro' }

export type FlowLinearFixSuggestion = {
  key: string
  code: string
  label: string
  detail: string
  severity: 'error' | 'warning'
  action: FlowLinearFixAction
}

type BuildFlowLinearFixSuggestionsInput = {
  steps: VisualLinearStep[]
  errors: FlowVisualCompileIssue[]
  warnings?: FlowVisualCompileIssue[]
}

function hasKind(steps: VisualLinearStep[], kind: string): boolean {
  return (steps || []).some((item) => String(item?.kind || '') === kind)
}

export function buildLinearFlowFixSuggestions(
  input: BuildFlowLinearFixSuggestionsInput
): FlowLinearFixSuggestion[] {
  const steps = Array.isArray(input?.steps) ? input.steps : []
  const errors = Array.isArray(input?.errors) ? input.errors : []
  const warnings = Array.isArray(input?.warnings) ? input.warnings : []

  const codeSet = new Set<string>()
  for (const item of errors) {
    codeSet.add(String(item?.code || ''))
  }
  for (const item of warnings) {
    codeSet.add(String(item?.code || ''))
  }

  const suggestions: FlowLinearFixSuggestion[] = []

  if (codeSet.has('missing_play_audio') && !hasKind(steps, 'playAudio')) {
    suggestions.push({
      key: 'fix_missing_play_audio',
      code: 'missing_play_audio',
      label: '补 1 个播放音频',
      detail: '在介绍页后补充播放音频步骤。',
      severity: 'error',
      action: { type: 'insert', kind: 'playAudio', at: 'after_intro' }
    })
  }

  if (codeSet.has('missing_answer_choice') && !hasKind(steps, 'answerChoice')) {
    suggestions.push({
      key: 'fix_missing_answer_choice',
      code: 'missing_answer_choice',
      label: '补 1 个答题步骤',
      detail: '在流程末尾补充答题步骤。',
      severity: 'error',
      action: { type: 'insert', kind: 'answerChoice', at: 'end' }
    })
  }

  if (codeSet.has('missing_countdown') && !hasKind(steps, 'countdown')) {
    suggestions.push({
      key: 'fix_missing_countdown',
      code: 'missing_countdown',
      label: '补 1 个倒计时',
      detail: '在首个播放音频后补充倒计时步骤。',
      severity: 'warning',
      action: { type: 'insert', kind: 'countdown', at: 'after_first_play_audio' }
    })
  }

  if (codeSet.has('answer_before_play_audio')) {
    suggestions.push({
      key: 'fix_answer_before_play_audio',
      code: 'answer_before_play_audio',
      label: '调整答题顺序',
      detail: '将首个答题步骤移动到首个播放音频之后。',
      severity: 'error',
      action: { type: 'move_answer_after_first_play_audio' }
    })
  }

  if (codeSet.has('intro_not_first')) {
    suggestions.push({
      key: 'fix_intro_not_first',
      code: 'intro_not_first',
      label: '介绍页移到首位',
      detail: '将介绍页步骤移动到流程第一步。',
      severity: 'error',
      action: { type: 'move_intro_to_start' }
    })
  }

  if (codeSet.has('intro_duplicate')) {
    suggestions.push({
      key: 'fix_intro_duplicate',
      code: 'intro_duplicate',
      label: '删除重复介绍页',
      detail: '保留首个介绍页，其余介绍页步骤删除。',
      severity: 'error',
      action: { type: 'remove_extra_intro' }
    })
  }

  return suggestions
}
