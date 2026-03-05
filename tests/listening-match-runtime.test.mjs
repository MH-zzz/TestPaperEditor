import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildListeningMatchPairsFromAnswers,
  applyListeningMatchSelection
} from '../engine/flow/listening-match/runtime.ts'

test('listening-match pair builder should normalize scalar/array values', () => {
  const pairs = buildListeningMatchPairsFromAnswers({
    L1: 'R1',
    L2: ['R2', 'R3'],
    L3: ''
  })

  assert.deepEqual(pairs, [
    { left: 'L1', right: 'R1' },
    { left: 'L2', right: 'R2' },
    { left: 'L2', right: 'R3' }
  ])
})

test('listening-match selection should enforce one-to-one uniqueness', () => {
  const current = {
    L1: 'R1',
    L2: 'R2'
  }

  const next = applyListeningMatchSelection(current, 'L3', 'R1', 'one-to-one')
  assert.deepEqual(next, {
    L2: 'R2',
    L3: 'R1'
  })
})

test('listening-match selection should toggle one-to-many relations per left key', () => {
  const current = {
    L1: ['R1', 'R2']
  }

  const removed = applyListeningMatchSelection(current, 'L1', 'R2', 'one-to-many')
  assert.deepEqual(removed, { L1: ['R1'] })

  const added = applyListeningMatchSelection(removed, 'L1', 'R3', 'one-to-many')
  assert.deepEqual(added, { L1: ['R1', 'R3'] })
})
