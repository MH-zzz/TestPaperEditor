import test from 'node:test'
import assert from 'node:assert/strict'

test('readQuestionFlowContext should prefer metadata.flowContext then fallback fields', async () => {
  const mod = await import('../components/views/flow-modules/currentQuestionBridge.ts')

  const q1 = {
    metadata: {
      region: 'fallback-region',
      flowContext: { region: 'ctx-region', scene: 'ctx-scene' }
    }
  }
  const c1 = mod.readQuestionFlowContext(q1)
  assert.equal(c1.region, 'ctx-region')
  assert.equal(c1.scene, 'ctx-scene')
  assert.equal(c1.grade, '')

  const q2 = {
    metadata: {
      region: 'fallback-region',
      scene: 'fallback-scene',
      grade: 'fallback-grade'
    }
  }
  const c2 = mod.readQuestionFlowContext(q2)
  assert.equal(c2.region, 'fallback-region')
  assert.equal(c2.scene, 'fallback-scene')
  assert.equal(c2.grade, 'fallback-grade')
})

test('patchQuestionFlowContext should write and clear metadata.flowContext deterministically', async () => {
  const mod = await import('../components/views/flow-modules/currentQuestionBridge.ts')

  const base = {
    id: 'q1',
    type: 'listening_choice',
    metadata: {
      source: 'x',
      flowContext: { region: 'old' }
    }
  }

  const patched = mod.patchQuestionFlowContext(base, {
    region: '广东',
    scene: '中考',
    grade: '九年级'
  })
  assert.deepEqual(patched.metadata.flowContext, {
    region: '广东',
    scene: '中考',
    grade: '九年级'
  })

  const cleared = mod.patchQuestionFlowContext(patched, {
    region: '',
    scene: '',
    grade: ''
  })
  assert.equal('flowContext' in cleared.metadata, false)
})

test('patchListeningChoiceQuestionFlow should apply standard/library source and steps', async () => {
  const mod = await import('../components/views/flow-modules/currentQuestionBridge.ts')
  const question = {
    id: 'q1',
    type: 'listening_choice',
    flow: {
      version: 1,
      mode: 'semi-auto',
      source: { kind: 'standard', id: 'old', version: 1 },
      steps: [{ id: 'old_1', kind: 'intro' }]
    }
  }

  const next = mod.patchListeningChoiceQuestionFlow(
    question,
    { kind: 'library', id: 'new_lib' },
    [{ id: 's1', kind: 'playAudio' }]
  )

  assert.equal(next.flow.version, 1)
  assert.equal(next.flow.mode, 'semi-auto')
  assert.deepEqual(next.flow.source, { kind: 'library', id: 'new_lib' })
  assert.deepEqual(next.flow.steps, [{ id: 's1', kind: 'playAudio' }])
})
