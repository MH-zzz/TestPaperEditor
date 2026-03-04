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

test('flow visual compiler should block when core loop steps are missing', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2')
    ],
    canvas: { width: 320, height: 200 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'missing_answer_choice'))
})

test('flow visual compiler should block answerChoice that appears before first playAudio', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' }),
      createNode('n3', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3')
    ],
    canvas: { width: 380, height: 260 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'answer_before_play_audio'))
})

test('flow visual compiler should return stable warning codes for unusual but compilable chains', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' }),
      createNode('n3', 'promptTone', { stepKind: 'promptTone', autoNext: 'audioEnded' }),
      createNode('n4', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3'),
      createEdge('e3', 'n3', 'n4')
    ],
    canvas: { width: 420, height: 300 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph)
  assert.equal(result.ok, true)
  const warningCodes = result.warnings.map((item) => item.code).sort()
  assert.ok(warningCodes.includes('group_id_missing'))
  assert.ok(warningCodes.includes('prompt_tone_context_unusual'))
  assert.equal(result.errors.length, 0)
})

test('flow visual compiler should block intro placement issues with stable error codes', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'playAudio', { stepKind: 'playAudio', autoNext: 'audioEnded' }),
      createNode('n2', 'intro', { stepKind: 'intro' }),
      createNode('n3', 'intro', { stepKind: 'intro' }),
      createNode('n4', 'answerChoice', { stepKind: 'answerChoice', autoNext: 'timeEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3'),
      createEdge('e3', 'n3', 'n4')
    ],
    canvas: { width: 440, height: 320 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'intro_not_first'))
  assert.ok(result.errors.some((item) => item.code === 'intro_duplicate'))
})

test('flow visual compiler should expand macro node with snippet resolver', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'macroNode', {
        nodeKind: 'macroNode',
        groupId: 'group_2',
        snippet: {
          baseId: 'snippet_hear_answer_loop',
          version: 2,
          hash: 'hash_v2'
        },
        binding: {
          groupBindingMode: 'inherit',
          autoNextMode: 'override',
          autoNext: 'audioEnded'
        }
      }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice', groupId: 'group_2', autoNext: 'timeEnded' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3')
    ],
    canvas: { width: 440, height: 320 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph, {
    resolveMacroSnippet: () => ({
      baseId: 'snippet_hear_answer_loop',
      version: 2,
      hash: 'hash_v2',
      steps: [
        { kind: 'playAudio', autoNext: 'tapNext', groupBinding: 'inherit' },
        { kind: 'countdown', autoNext: 'countdownEnded', groupBinding: 'empty' }
      ]
    })
  })

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.deepEqual(result.steps.map((item) => item.id), ['n1', 'n2::macro::1', 'n2::macro::2', 'n3'])
  assert.deepEqual(result.steps.map((item) => item.kind), ['intro', 'playAudio', 'countdown', 'answerChoice'])
  assert.equal(result.steps[1].autoNext, 'audioEnded')
  assert.equal(result.steps[1].groupId, 'group_2')
  assert.equal(result.steps[2].autoNext, 'audioEnded')
  assert.equal(result.steps[2].groupId, undefined)
})

test('flow visual compiler should fail macro expansion when snippet resolver is missing', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'macroNode', {
        nodeKind: 'macroNode',
        snippet: {
          baseId: 'snippet_hear_answer_loop',
          version: 2
        },
        binding: {
          groupBindingMode: 'inherit',
          autoNextMode: 'inherit'
        }
      }),
      createNode('n3', 'answerChoice', { stepKind: 'answerChoice' })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2'),
      createEdge('e2', 'n2', 'n3')
    ],
    canvas: { width: 420, height: 280 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'macro_snippet_resolver_missing'))
})

test('flow visual compiler should keep lint behavior on expanded macro steps', async () => {
  const mod = await import('../domain/flow-visual/usecases/compileGraphToSteps.ts')
  const graph = {
    nodes: [
      createNode('n1', 'intro', { stepKind: 'intro' }),
      createNode('n2', 'macroNode', {
        nodeKind: 'macroNode',
        snippet: {
          baseId: 'snippet_play_only',
          version: 1
        },
        binding: {
          groupBindingMode: 'inherit',
          autoNextMode: 'inherit'
        }
      })
    ],
    edges: [
      createEdge('e1', 'n1', 'n2')
    ],
    canvas: { width: 320, height: 200 }
  }

  const result = mod.compileFlowVisualGraphToLinearSteps(graph, {
    resolveMacroSnippet: () => ({
      baseId: 'snippet_play_only',
      version: 1,
      steps: [
        { kind: 'playAudio', autoNext: 'audioEnded', groupBinding: 'inherit' }
      ]
    })
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'missing_answer_choice'))
})
