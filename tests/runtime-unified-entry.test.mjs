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

test('runQuestionFlow usecase should provide a unified runtime entry + reducer', async () => {
  const src = await readFile('app/usecases/runQuestionFlow.ts')

  assert.ok(src.includes('export function runQuestionFlow('))
  assert.ok(src.includes('export function reduceQuestionFlowRuntimeState('))
  assert.ok(src.includes('export function createQuestionFlowRuntimeState('))
  assert.ok(src.includes('export function getQuestionFlowSteps('))
  assert.ok(src.includes('resolveListeningChoiceQuestion'))
  assert.ok(src.includes('resolveModuleDisplay'))
  assert.ok(src.includes('moduleDisplayRef'))
})

test('editor workspace should run preview flow via unified runtime usecase', async () => {
  const src = await readFile('components/views/EditorWorkspace.vue')

  assert.ok(src.includes("from '/app/usecases/runQuestionFlow'"))
  assert.ok(src.includes('const runtimeResult = computed(() => {'))
  assert.ok(src.includes('runQuestionFlow(q, {'))
  assert.ok(src.includes('reduceQuestionFlowRuntimeState('))
  assert.ok(src.includes(':data="runtimeQuestion"'))
  assert.ok(src.includes(':runtime-meta="runtimeMeta"'))
  assert.ok(src.includes('flow-context-bar__runtime'))
  assert.ok(src.includes('来源：{{ runtimeMeta.sourceKind || \'-\' }}'))
  assert.ok(src.includes('规则：{{ runtimeMeta.profileId || \'默认规则\' }}'))
})

test('learning workspace should run exam flow via unified runtime usecase', async () => {
  const src = await readFile('components/views/LearningWorkspace.vue')

  assert.ok(src.includes("from '/app/usecases/runQuestionFlow'"))
  assert.ok(src.includes('const run = runQuestionFlow(cloned, {'))
  assert.ok(src.includes('reduceQuestionFlowRuntimeState('))
  assert.ok(src.includes('dispatchRuntime({ type: \'goToStep\', stepIndex: index }, \'step\')'))
  assert.ok(src.includes(':runtime-meta="runtimeMeta"'))
  assert.ok(src.includes('规则'))
  assert.ok(src.includes('模块'))
  assert.ok(src.includes('版本'))
  assert.ok(src.includes('来源'))
})
