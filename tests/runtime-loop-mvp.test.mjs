import test from 'node:test'
import assert from 'node:assert/strict'

test('runtime loop reducer should continue loop until maxIterations then exit', async () => {
  const runtime = await import('../engine/flow/runtime.ts')
  const steps = [
    { id: 's1', kind: 'playAudio', nextStepId: 's2', autoNext: 'audioEnded' },
    {
      id: 's2',
      kind: 'loopNode',
      autoNext: 'tapNext',
      loop: {
        maxIterations: 2,
        continueStepId: 's1',
        exitStepId: 's3',
        defaultStepId: 's3'
      }
    },
    { id: 's3', kind: 'answerChoice', autoNext: 'timeEnded' }
  ]

  let state = { stepIndex: 1 }
  state = runtime.reduceFlowRuntimeStateWithLoop(state, steps, { type: 'next' })
  assert.equal(state.stepIndex, 0)
  assert.equal(state.loopCounters.s2, 1)

  state = runtime.reduceFlowRuntimeStateWithLoop(state, steps, { type: 'audioEnded' })
  assert.equal(state.stepIndex, 1)

  state = runtime.reduceFlowRuntimeStateWithLoop(state, steps, { type: 'next' })
  assert.equal(state.stepIndex, 0)
  assert.equal(state.loopCounters.s2, 2)

  state = runtime.reduceFlowRuntimeStateWithLoop(state, steps, { type: 'audioEnded' })
  assert.equal(state.stepIndex, 1)

  state = runtime.reduceFlowRuntimeStateWithLoop(state, steps, { type: 'next' })
  assert.equal(state.stepIndex, 2)
  assert.equal(state.loopCounters.s2, 2)
})

test('runtime loop reducer should trigger on autoNext event when configured', async () => {
  const runtime = await import('../engine/flow/runtime.ts')
  const steps = [
    { id: 's1', kind: 'countdown', nextStepId: 's2', autoNext: 'countdownEnded' },
    {
      id: 's2',
      kind: 'loopNode',
      autoNext: 'timeEnded',
      loop: {
        maxIterations: 1,
        continueStepId: 's1',
        exitStepId: 's3',
        defaultStepId: 's3'
      }
    },
    { id: 's3', kind: 'finish', autoNext: 'tapNext' }
  ]

  const next = runtime.reduceFlowRuntimeStateWithLoop(
    { stepIndex: 1 },
    steps,
    { type: 'timeEnded' }
  )
  assert.equal(next.stepIndex, 0)
  assert.equal(next.loopCounters.s2, 1)
})

test('runtime loop reducer should fallback to default path when continue target is missing', async () => {
  const runtime = await import('../engine/flow/runtime.ts')
  const steps = [
    {
      id: 's1',
      kind: 'loopNode',
      autoNext: 'tapNext',
      loop: {
        maxIterations: 3,
        continueStepId: 'missing_step',
        exitStepId: 's2',
        defaultStepId: 's2'
      }
    },
    { id: 's2', kind: 'finish', autoNext: 'tapNext' }
  ]

  const next = runtime.reduceFlowRuntimeStateWithLoop(
    { stepIndex: 0 },
    steps,
    { type: 'next' }
  )
  assert.equal(next.stepIndex, 1)
})
