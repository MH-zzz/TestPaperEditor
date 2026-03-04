import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

async function readFile(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), 'utf8')
}

test('editable flow graph should expose macro node fields and resolver-driven compilation', async () => {
  const src = await readFile('components/views/flow-modules/useEditableFlowGraph.ts')
  assert.ok(src.includes("kind: 'macroNode'"))
  assert.ok(src.includes('macroSnippetBaseId'))
  assert.ok(src.includes('macroSnippetVersion'))
  assert.ok(src.includes('macroGroupBindingMode'))
  assert.ok(src.includes('macroAutoNextMode'))
  assert.ok(src.includes('function applyNodePatchPayload('))
  assert.ok(src.includes('resolveMacroSnippet?: ResolveFlowMacroSnippet'))
  assert.ok(src.includes('resolveMacroSnippet: options.resolveMacroSnippet'))
})

test('property panel should support macro node read/write fields', async () => {
  const src = await readFile('components/editor/flow-visual/PropertyPanel.vue')
  assert.ok(src.includes("if (key === 'macroSnippetBaseId')"))
  assert.ok(src.includes("if (key === 'macroSnippetVersion')"))
  assert.ok(src.includes("if (key === 'macroGroupBindingMode')"))
  assert.ok(src.includes("if (key === 'macroAutoNextMode')"))
  assert.ok(src.includes("emit('patch', { macroAutoNext: value })"))
})

test('flow modules manager should wire macro snippet resolver and macro preview fallback', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('function resolveReadonlyFlowMacroSnippet'))
  assert.ok(src.includes('resolveMacroSnippet: resolveReadonlyFlowMacroSnippet'))
  assert.ok(src.includes("startsWith(`${targetNodeId}::macro::`)"))
  assert.ok(src.includes("raw.split('::macro::')[0]"))
  assert.ok(src.includes('function readFlowVisualCompiledStepNodeId(stepId: string)'))
  assert.ok(src.includes('function locateReadonlyFlowVisualCompiledStep(stepId: string)'))
  assert.ok(src.includes('formatReadonlyFlowCompiledStepLine(item, index)'))
  assert.ok(src.includes('片段：{{ readonlyFlowVisualActiveNode.data.snippet?.baseId || \'-\' }}@v{{ readonlyFlowVisualActiveNode.data.snippet?.version || \'-\' }}'))
})
