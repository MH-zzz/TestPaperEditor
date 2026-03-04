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

test('editable flow graph should support inserting snippets as macro nodes', async () => {
  const src = await readFile('components/views/flow-modules/useEditableFlowGraph.ts')
  assert.ok(src.includes('export type FlowMacroSnippetRefInput'))
  assert.ok(src.includes('function normalizeMacroSnippetRef('))
  assert.ok(src.includes('function buildMacroNodeFromSnippetRef('))
  assert.ok(src.includes('function insertMacroSnippetNearTarget('))
  assert.ok(src.includes('function insertMacroSnippetAtTail('))
  assert.ok(src.includes("markDirty('insert_macro_snippet')"))
})

test('flow modules manager should expose snippet->macro insert action', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('作为宏插入'))
  assert.ok(src.includes('function applyReadonlyFlowVisualSnippetAsMacro('))
  assert.ok(src.includes('flowVisualEditor.insertMacroSnippetNearTarget('))
  assert.ok(src.includes('flowVisualEditor.insertMacroSnippetAtTail('))
})
