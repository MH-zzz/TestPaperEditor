import test from 'node:test'
import assert from 'node:assert/strict'

test('buildLinearFlowFixSuggestions should return core insert suggestions for missing steps', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildLinearFlowFixSuggestions.ts')
  const suggestions = mod.buildLinearFlowFixSuggestions({
    steps: [{ id: 'n1', kind: 'intro' }],
    errors: [
      { code: 'missing_play_audio', message: '', path: 'graph.nodes' },
      { code: 'missing_answer_choice', message: '', path: 'graph.nodes' }
    ],
    warnings: [{ code: 'missing_countdown', message: '', path: 'graph.nodes' }]
  })

  const keys = suggestions.map((item) => item.key)
  assert.ok(keys.includes('fix_missing_play_audio'))
  assert.ok(keys.includes('fix_missing_answer_choice'))
  assert.ok(keys.includes('fix_missing_countdown'))
})

test('buildLinearFlowFixSuggestions should return order and intro repair suggestions', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildLinearFlowFixSuggestions.ts')
  const suggestions = mod.buildLinearFlowFixSuggestions({
    steps: [
      { id: 'n1', kind: 'answerChoice' },
      { id: 'n2', kind: 'playAudio' },
      { id: 'n3', kind: 'intro' },
      { id: 'n4', kind: 'intro' }
    ],
    errors: [
      { code: 'answer_before_play_audio', message: '', path: 'graph.nodes(n1)' },
      { code: 'intro_not_first', message: '', path: 'graph.nodes(n3)' },
      { code: 'intro_duplicate', message: '', path: 'graph.nodes' }
    ],
    warnings: []
  })

  const keys = suggestions.map((item) => item.key)
  assert.ok(keys.includes('fix_answer_before_play_audio'))
  assert.ok(keys.includes('fix_intro_not_first'))
  assert.ok(keys.includes('fix_intro_duplicate'))
})
