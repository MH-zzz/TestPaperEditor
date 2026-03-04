import test from 'node:test'
import assert from 'node:assert/strict'

test('flow macro model should normalize and serialize a valid payload', async () => {
  const mod = await import('../domain/flow-visual/usecases/flowMacroNodeModel.ts')
  const input = {
    nodeKind: 'macroNode',
    snippet: {
      baseId: 'snippet_dialog_loop',
      version: 3,
      name: '对话循环',
      hash: 'abc123'
    },
    binding: {
      groupBindingMode: 'fixed',
      groupId: 'group_1',
      autoNextMode: 'override',
      autoNext: 'timeEnded'
    },
    expandedStepCount: 5
  }

  const normalized = mod.normalizeFlowMacroNodePayload(input)
  assert.ok(normalized)
  assert.equal(normalized.nodeKind, 'macroNode')
  assert.equal(normalized.snippet.baseId, 'snippet_dialog_loop')
  assert.equal(normalized.snippet.version, 3)
  assert.equal(normalized.binding.groupBindingMode, 'fixed')
  assert.equal(normalized.binding.groupId, 'group_1')
  assert.equal(normalized.binding.autoNextMode, 'override')
  assert.equal(normalized.binding.autoNext, 'timeEnded')
  assert.equal(normalized.expandedStepCount, 5)

  const serialized = mod.serializeFlowMacroNodePayload(input)
  assert.ok(serialized)
  assert.deepEqual(serialized, {
    nodeKind: 'macroNode',
    snippet: {
      baseId: 'snippet_dialog_loop',
      version: 3,
      name: '对话循环',
      hash: 'abc123'
    },
    binding: {
      groupBindingMode: 'fixed',
      autoNextMode: 'override',
      groupId: 'group_1',
      autoNext: 'timeEnded'
    },
    expandedStepCount: 5
  })
})

test('flow macro model should reject payload without valid snippet ref', async () => {
  const mod = await import('../domain/flow-visual/usecases/flowMacroNodeModel.ts')
  const input = {
    nodeKind: 'macroNode',
    snippet: {
      baseId: '   ',
      version: 0
    }
  }

  const normalized = mod.normalizeFlowMacroNodePayload(input)
  assert.equal(normalized, null)
  const serialized = mod.serializeFlowMacroNodePayload(input)
  assert.equal(serialized, null)
})

test('flow macro model should downgrade invalid binding overrides to inherit', async () => {
  const mod = await import('../domain/flow-visual/usecases/flowMacroNodeModel.ts')
  const input = {
    snippet: {
      baseId: 'snippet_listen_answer',
      version: 1
    },
    binding: {
      groupBindingMode: 'fixed',
      groupId: '',
      autoNextMode: 'override',
      autoNext: '   '
    },
    expandedStepCount: -2
  }

  const normalized = mod.normalizeFlowMacroNodePayload(input)
  assert.ok(normalized)
  assert.equal(normalized.binding.groupBindingMode, 'inherit')
  assert.equal(normalized.binding.groupId, undefined)
  assert.equal(normalized.binding.autoNextMode, 'inherit')
  assert.equal(normalized.binding.autoNext, undefined)
  assert.equal(normalized.expandedStepCount, 1)
})
