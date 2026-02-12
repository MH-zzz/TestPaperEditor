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

test('runtime debug store should support session trace + diagnostic export', async () => {
  const src = await readFile('stores/runtimeDebug.ts')

  assert.ok(src.includes('class RuntimeDebugStore'))
  assert.ok(src.includes('ensureSession(sessionId: string'))
  assert.ok(src.includes('record('))
  assert.ok(src.includes('applyRuntimeMeta('))
  assert.ok(src.includes('resetSession('))
  assert.ok(src.includes('exportDiagnostics('))
  assert.ok(src.includes('exportDiagnosticsJson('))
  assert.ok(src.includes('MAX_EVENTS_PER_SESSION'))
})

test('runtime debug drawer should display trace events and export diagnostics package', async () => {
  const src = await readFile('components/layout/RuntimeDebugDrawer.vue')

  assert.ok(src.includes('导出诊断包'))
  assert.ok(src.includes('清空轨迹'))
  assert.ok(src.includes('runtimeDebug.exportDiagnosticsJson'))
  assert.ok(src.includes('runtimeDebug.resetSession'))
  assert.ok(src.includes('setClipboardData'))
})

test('editor and learning workspaces should write route/step traces to shared runtime debug store', async () => {
  const editorSrc = await readFile('components/views/EditorWorkspace.vue')
  const learningSrc = await readFile('components/views/LearningWorkspace.vue')

  assert.ok(editorSrc.includes("import { runtimeDebug } from '/stores/runtimeDebug'"))
  assert.ok(editorSrc.includes('runtimeDebug.record(editorDebugSessionId'))
  assert.ok(editorSrc.includes('runtimeDebug.toggleDrawer(editorDebugSessionId)'))
  assert.ok(editorSrc.includes('<RuntimeDebugDrawer :session-id="editorDebugSessionId"'))

  assert.ok(learningSrc.includes("import { runtimeDebug } from '/stores/runtimeDebug'"))
  assert.ok(learningSrc.includes('runtimeDebug.record(learningDebugSessionId'))
  assert.ok(learningSrc.includes('runtimeDebug.toggleDrawer(learningDebugSessionId)'))
  assert.ok(learningSrc.includes('<RuntimeDebugDrawer :session-id="learningDebugSessionId"'))
})
