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

test('flow visual compiler should compile a valid linear graph in topological order', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')

  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice', groupId: 'group_1' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3')
    ],
    canvas: { width: 400, height: 300 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph)
  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.steps.length, 3)
  assert.deepEqual(result.steps.map((item) => item.id), ['n1', 'n2', 'n3'])
  assert.deepEqual(result.steps.map((item) => item.kind), ['intro', 'playAudio', 'answerChoice'])
  assert.equal(result.steps[1].autoNext, 'audioEnded')
  assert.equal(result.steps[2].groupId, 'group_1')
})

test('flow visual compiler should reject branch graph in linear mode', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio' }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n1', 'n3')
    ],
    canvas: { width: 400, height: 300 }
  }

  const validation = mod.validateFlowVisualGraph(graph)
  assert.equal(validation.ok, false)
  assert.ok(validation.errors.some((item) => item.code === 'branch_not_supported'))

  const result = mod.compileFlowVisualGraphToLinearSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'branch_not_supported'))
})

test('flow visual compiler should reject cycle graph in linear mode', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n1')
    ],
    canvas: { width: 300, height: 220 }
  }

  const result = mod.validateFlowVisualGraph(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'cycle_detected'))
})

test('flow visual compiler should reject edges pointing to missing nodes', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'answerChoice', { stepKind: 'answerChoice' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'missing_node', 'n2')
    ],
    canvas: { width: 300, height: 220 }
  }

  const result = mod.validateFlowVisualGraph(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'edge_missing_source'))
})
