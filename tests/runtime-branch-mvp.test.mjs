import test from 'node:test'
import assert from 'node:assert/strict'

test('runtime branch reducer should jump to pass path when score reaches threshold', async () => {
  const runtime = await import('../engine/flow/runtime.ts')
  const steps = [
    { id: 's1', kind: 'intro', nextStepId: 's2', autoNext: 'tapNext' },
    {
      id: 's2',
      kind: 'branchScore',
      autoNext: 'tapNext',
      branch: {
        condition: { type: 'score_gte', threshold: 60 },
        passStepId: 's3',
        failStepId: 's4',
        defaultStepId: 's4'
      }
    },
    { id: 's3', kind: 'answerChoice', autoNext: 'timeEnded' },
    { id: 's4', kind: 'countdown', autoNext: 'countdownEnded' }
  ]

  const next = runtime.reduceFlowRuntimeStateWithBranch(
    { stepIndex: 1 },
    steps,
    { type: 'next' },
    { totalScore: 80 }
  )
  assert.equal(next.stepIndex, 2)
})

test('runtime branch reducer should jump to fail path when score is below threshold', async () => {
  const runtime = await import('../engine/flow/runtime.ts')
  const steps = [
    { id: 's1', kind: 'intro', nextStepId: 's2', autoNext: 'tapNext' },
    {
      id: 's2',
      kind: 'branchScore',
      autoNext: 'tapNext',
      branch: {
        condition: { type: 'score_gte', threshold: 60 },
        passStepId: 's3',
        failStepId: 's4',
        defaultStepId: 's4'
      }
    },
    { id: 's3', kind: 'answerChoice', autoNext: 'timeEnded' },
    { id: 's4', kind: 'countdown', autoNext: 'countdownEnded' }
  ]

  const next = runtime.reduceFlowRuntimeStateWithBranch(
    { stepIndex: 1 },
    steps,
    { type: 'next' },
    { totalScore: 20 }
  )
  assert.equal(next.stepIndex, 3)
})

test('runtime branch reducer should fallback to default path when score context is missing', async () => {
  const runtime = await import('../engine/flow/runtime.ts')
  const steps = [
    { id: 's1', kind: 'intro', nextStepId: 's2', autoNext: 'tapNext' },
    {
      id: 's2',
      kind: 'branchScore',
      autoNext: 'tapNext',
      branch: {
        condition: { type: 'score_gte', threshold: 60 },
        passStepId: 's3',
        failStepId: 's4',
        defaultStepId: 's4'
      }
    },
    { id: 's3', kind: 'answerChoice', autoNext: 'timeEnded' },
    { id: 's4', kind: 'countdown', autoNext: 'countdownEnded' }
  ]

  const next = runtime.reduceFlowRuntimeStateWithBranch(
    { stepIndex: 1 },
    steps,
    { type: 'next' },
    {}
  )
  assert.equal(next.stepIndex, 3)
})
