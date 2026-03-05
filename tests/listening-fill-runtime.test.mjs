import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parseListeningFillTemplate,
  resolveListeningFillWordBank,
  isListeningFillAnswerCorrect,
  seededShuffleByText
} from '../engine/flow/listening-fill/runtime.ts'

test('listening-fill template parser should split text and blank parts deterministically', () => {
  const parts = parseListeningFillTemplate('A {{1}} B {{2}} C')
  assert.deepEqual(parts, [
    { type: 'text', value: 'A ' },
    { type: 'blank', id: 'blank_1', index: '1' },
    { type: 'text', value: ' B ' },
    { type: 'blank', id: 'blank_2', index: '2' },
    { type: 'text', value: ' C' }
  ])
})

test('listening-fill answer checker should respect acceptVariants flag', () => {
  const strictBlank = { id: 'blank_1', answer: ['Doctor'], acceptVariants: false }
  const variantBlank = { id: 'blank_2', answer: ['Doctor'], acceptVariants: true }

  assert.equal(isListeningFillAnswerCorrect(strictBlank, 'Doctor'), true)
  assert.equal(isListeningFillAnswerCorrect(strictBlank, 'doctor'), false)
  assert.equal(isListeningFillAnswerCorrect(variantBlank, ' doctor '), true)
})

test('listening-fill word-bank resolver should keep deterministic order and fallback from answers', () => {
  const qWithBank = {
    id: 'q_fill_1',
    template: 'A {{1}} B',
    blanks: [{ id: 'blank_1', answer: ['apple'] }],
    wordBank: ['apple', 'banana', 'orange']
  }
  const qWithoutBank = {
    id: 'q_fill_2',
    template: 'A {{1}} B {{2}}',
    blanks: [
      { id: 'blank_1', answer: ['dog'] },
      { id: 'blank_2', answer: ['cat'] }
    ]
  }

  const a = resolveListeningFillWordBank(qWithBank)
  const b = resolveListeningFillWordBank(qWithBank)
  assert.deepEqual(a, b)

  const fallback = resolveListeningFillWordBank(qWithoutBank)
  assert.deepEqual(new Set(fallback), new Set(['dog', 'cat']))
})

test('seeded shuffle should be stable and non-mutating', () => {
  const source = ['a', 'b', 'c', 'd']
  const copy = [...source]
  const one = seededShuffleByText(source, 'seed_x')
  const two = seededShuffleByText(source, 'seed_x')
  const three = seededShuffleByText(source, 'seed_y')

  assert.deepEqual(one, two)
  assert.notDeepEqual(one, three)
  assert.deepEqual(source, copy)
})
