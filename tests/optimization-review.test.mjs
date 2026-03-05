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

test('flow visual files should not keep console debug logs in production code', async () => {
  const managerSrc = await readFile('components/views/FlowModulesManager.vue')
  const canvasSrc = await readFile('components/editor/flow-visual/ReadonlyFlowCanvas.vue')
  const stepNodeSrc = await readFile('components/editor/flow-visual/StepFlowNode.vue')

  assert.ok(!managerSrc.includes('console.log('))
  assert.ok(!canvasSrc.includes('console.log('))
  assert.ok(!stepNodeSrc.includes('console.log('))
})

test('side navigation should avoid deep-watch on whole draft object', async () => {
  const src = await readFile('components/layout/SideNavigation.vue')
  assert.ok(src.includes('metadata?.tags'))
  assert.ok(src.includes('metadata?.source'))
  assert.ok(!src.includes('deep: true'))
})

test('region binding template repository should enforce template and entry limits', async () => {
  const src = await readFile('infra/repository/flowRegionBindingTemplateRepository.ts')

  assert.ok(src.includes('FLOW_REGION_BINDING_TEMPLATE_LIMIT'))
  assert.ok(src.includes('FLOW_REGION_BINDING_ENTRY_LIMIT'))
  assert.ok(src.includes('slice(0, FLOW_REGION_BINDING_ENTRY_LIMIT)'))
  assert.ok(src.includes('slice(0, FLOW_REGION_BINDING_TEMPLATE_LIMIT)'))
})

test('runtime debug store should avoid any typing and JSON stringify clone', async () => {
  const src = await readFile('stores/runtimeDebug.ts')
  assert.ok(!/\bany\b/.test(src))
  assert.ok(!src.includes('JSON.parse(JSON.stringify(value))'))
})

test('local learning repository should avoid unknown-double-cast flow pack return', async () => {
  const src = await readFile('infra/repository/localLearningRepository.ts')
  assert.ok(!src.includes('as unknown as'))
  assert.ok(src.includes('ParsedFlowExportPackageV2'))
})

test('key editing paths should use deepClone utility instead of JSON stringify clone', async () => {
  const questionDraftSrc = await readFile('stores/questionDraft.ts')
  const saveDraftSrc = await readFile('domain/question/usecases/saveQuestionDraft.ts')

  assert.ok(questionDraftSrc.includes('deepClone'))
  assert.ok(saveDraftSrc.includes('deepClone'))
  assert.ok(!questionDraftSrc.includes('JSON.parse(JSON.stringify(value))'))
  assert.ok(!saveDraftSrc.includes('JSON.parse(JSON.stringify(value))'))
})

test('flow manager chain should avoid JSON stringify clone helper', async () => {
  const managerSrc = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  const editableSrc = await readFile('components/views/flow-modules/useEditableFlowGraph.ts')

  assert.ok(managerSrc.includes('deepClone'))
  assert.ok(lifecycleSrc.includes('deepClone'))
  assert.ok(editableSrc.includes('deepClone'))
  assert.ok(!managerSrc.includes('JSON.parse(JSON.stringify(v))'))
  assert.ok(!lifecycleSrc.includes('JSON.parse(JSON.stringify(v))'))
  assert.ok(!editableSrc.includes('JSON.parse(JSON.stringify(source || []))'))
})

test('side navigation should avoid any typing in metadata and tree traversal', async () => {
  const src = await readFile('components/layout/SideNavigation.vue')
  assert.ok(!/\bany\b/.test(src))
})

test('flow manager should delegate page-switching workflow to dedicated composable', async () => {
  const managerSrc = await readFile('components/views/FlowModulesManager.vue')
  const composableSrc = await readFile('components/views/flow-modules/useFlowPageNavigation.ts')

  assert.ok(managerSrc.includes('useFlowPageNavigation'))
  assert.ok(composableSrc.includes('export function useFlowPageNavigation'))
  assert.ok(composableSrc.includes('function openFlowPage('))
  assert.ok(composableSrc.includes("openListeningChoice: () => openFlowPage('listening_choice')"))
  assert.ok(composableSrc.includes("openSpeakingHearAnswer: () => openFlowPage('speaking_hear_answer')"))
})

test('flow manager should delegate flow-line switching workflow to dedicated composable', async () => {
  const managerSrc = await readFile('components/views/FlowModulesManager.vue')
  const composableSrc = await readFile('components/views/flow-modules/useFlowLineSwitcher.ts')

  assert.ok(managerSrc.includes('useFlowLineSwitcher'))
  assert.ok(composableSrc.includes('export function useFlowLineSwitcher'))
  assert.ok(composableSrc.includes('function switchDraftToModuleRef('))
  assert.ok(composableSrc.includes('function switchToFlowLine('))
})
