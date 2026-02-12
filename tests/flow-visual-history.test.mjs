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

test('editable flow graph should provide history stack and undo/redo APIs', async () => {
  const src = await readFile('components/views/flow-modules/useEditableFlowGraph.ts')
  assert.ok(src.includes('historyPast'))
  assert.ok(src.includes('historyFuture'))
  assert.ok(src.includes('HISTORY_LIMIT'))
  assert.ok(src.includes('pushHistorySnapshot'))
  assert.ok(src.includes('canUndo'))
  assert.ok(src.includes('canRedo'))
  assert.ok(src.includes('function undo()'))
  assert.ok(src.includes('function redo()'))
  assert.ok(src.includes('function duplicateSelectedNode()'))
  assert.ok(src.includes('selectPrevNode: () => selectAdjacentNode(-1)'))
  assert.ok(src.includes('selectNextNode: () => selectAdjacentNode(1)'))
  assert.ok(src.includes('linearConstraintChecks'))
})

test('flow center should expose visual undo/redo buttons and keyboard shortcuts', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const propertySrc = await readFile('components/editor/flow-visual/PropertyPanel.vue')
  assert.ok(src.includes('撤销'))
  assert.ok(src.includes('重做'))
  assert.ok(src.includes('canReadonlyFlowVisualUndo'))
  assert.ok(src.includes('canReadonlyFlowVisualRedo'))
  assert.ok(src.includes('undoReadonlyFlowVisual'))
  assert.ok(src.includes('redoReadonlyFlowVisual'))
  assert.ok(propertySrc.includes('Ctrl/Cmd+Z'))
  assert.ok(src.includes("if (lower === 'z' && event.shiftKey)"))
  assert.ok(src.includes("if (lower === 'y')"))
  assert.ok(src.includes("if (lower === 'z')"))
  assert.ok(src.includes("if (lower === 'd')"))
  assert.ok(src.includes("if (event.key === 'ArrowUp')"))
  assert.ok(src.includes("if (event.key === 'ArrowDown')"))
  assert.ok(src.includes('readFlowVisualIssueNodeId'))
  assert.ok(src.includes('locateReadonlyFlowVisualIssue'))
  assert.ok(src.includes('readonlyFlowLinearChecks'))
  assert.ok(propertySrc.includes('Ctrl/Cmd+D'))
})
