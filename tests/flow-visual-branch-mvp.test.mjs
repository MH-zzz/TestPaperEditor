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

test('branch mvp compiler should compile a score-threshold branch graph into executable steps', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' }),
      createNode('n3', 'branchScore', { stepKind: 'branchScore', autoNext: 'tapNext', branchScoreThreshold: 60 }),
      createNode('n4', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' }),
      createNode('n5', 'countdown', { stepKind: 'countdown', autoNext: 'countdownEnded' }),
      createNode('n6', 'promptTone', { stepKind: 'promptTone', autoNext: 'audioEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3'),
      createEdge('e3', 'n3', 'n4'),
      createEdge('e4', 'n3', 'n5'),
      createEdge('e5', 'n4', 'n6'),
      createEdge('e6', 'n5', 'n6')
    ],
    canvas: { width: 520, height: 360 }
  }

  const result = mod.compileFlowVisualGraphToBranchMvpSteps(graph)
  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  const branchStep = result.steps.find((item) => item.id === 'n3')
  assert.ok(branchStep)
  assert.equal(branchStep.kind, 'branchScore')
  assert.ok(branchStep.branch)
  assert.equal(branchStep.branch.condition.type, 'score_gte')
  assert.equal(branchStep.branch.condition.threshold, 60)
  assert.equal(branchStep.branch.passStepId, 'n4')
  assert.equal(branchStep.branch.failStepId, 'n5')
  assert.equal(branchStep.branch.defaultStepId, 'n5')
})

test('branch mvp compiler should reject non-branch nodes with multi-out edges', async () => {
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

  const result = mod.compileFlowVisualGraphToBranchMvpSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'branch_node_required'))
})

test('branch mvp compiler should reject branch nodes without pass/fail outgoing paths', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'branchScore', { stepKind: 'branchScore', autoNext: 'tapNext', branchScoreThreshold: 60 }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3')
    ],
    canvas: { width: 420, height: 280 }
  }

  const result = mod.compileFlowVisualGraphToBranchMvpSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'branch_out_degree_invalid'))
})
