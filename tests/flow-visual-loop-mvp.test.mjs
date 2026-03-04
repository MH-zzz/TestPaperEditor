import test from 'node:test'
import assert from 'node:assert/strict'

function createNode(id, kind, data = {}) {
  return {
    id,
    kind,
    label: id,
    color: '#2563eb',
    position: { x: 0, y: 0 },
    size: { width: 160, height: 64 },
    data
  }
}

function createEdge(id, source, target) {
  return {
    id,
    source,
    target,
    x: 0,
    y: 0,
    height: 20
  }
}

test('loop mvp compiler should compile valid loop node with max iterations and exit path', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' }),
      createNode('n4', 'loopNode', { stepKind: 'loopNode', autoNext: 'tapNext', loopMaxIterations: 2 }),
      createNode('n5', 'promptTone', { stepKind: 'promptTone', autoNext: 'audioEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3'),
      createEdge('e3', 'n3', 'n4'),
      createEdge('e4', 'n4', 'n2'),
      createEdge('e5', 'n4', 'n5')
    ],
    canvas: { width: 520, height: 360 }
  }

  const result = mod.compileFlowVisualGraphToLoopMvpSteps(graph)
  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  const loopStep = result.steps.find((item) => item.id === 'n4')
  assert.ok(loopStep)
  assert.equal(loopStep.kind, 'loopNode')
  assert.ok(loopStep.loop)
  assert.equal(loopStep.loop.maxIterations, 2)
  assert.equal(loopStep.loop.continueStepId, 'n2')
  assert.equal(loopStep.loop.exitStepId, 'n5')
  assert.equal(loopStep.loop.defaultStepId, 'n5')
})

test('loop mvp compiler should reject non-loop nodes with multi-out edges', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' }),
      createNode('n4', 'countdown', { stepKind: 'countdown', autoNext: 'countdownEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3'),
      createEdge('e3', 'n2', 'n4')
    ],
    canvas: { width: 420, height: 300 }
  }

  const result = mod.compileFlowVisualGraphToLoopMvpSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'loop_node_required'))
})

test('loop mvp compiler should reject loop node when exit path is missing', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'loopNode', { stepKind: 'loopNode', autoNext: 'tapNext', loopMaxIterations: 2 }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3')
    ],
    canvas: { width: 420, height: 280 }
  }

  const result = mod.compileFlowVisualGraphToLoopMvpSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'loop_out_degree_invalid'))
})

test('loop mvp compiler should reject loop node with invalid maxIterations', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'loopNode', { stepKind: 'loopNode', autoNext: 'tapNext', loopMaxIterations: 0 }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' }),
      createNode('n4', 'promptTone', { stepKind: 'promptTone', autoNext: 'audioEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3'),
      createEdge('e3', 'n2', 'n4')
    ],
    canvas: { width: 420, height: 280 }
  }

  const result = mod.compileFlowVisualGraphToLoopMvpSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'loop_max_iterations_invalid'))
})
