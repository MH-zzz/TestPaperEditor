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

test('flow modules manager should provide research/simple mode with guided next action', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('const isResearchSimpleMode = ref(true)'))
  assert.ok(src.includes('toggleResearchEditorMode'))
  assert.ok(src.includes('researchEditorModeSwitchText'))
  assert.ok(src.includes('researchGuidedNextAction'))
  assert.ok(src.includes('runResearchGuidedNextAction'))
  assert.ok(src.includes('推荐下一步：'))
  assert.ok(src.includes("v-if=\"!isResearchSimpleMode\""))
})

test('flow modules manager should provide region overview list for teaching workflow', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('地区视角总览'))
  assert.ok(src.includes('const regionOverviewRows = computed<RegionOverviewRow[]>(() => {'))
  assert.ok(src.includes('currentFlowBoundRegionCount'))
  assert.ok(src.includes('focusRegionBindingSection'))
  assert.ok(src.includes("class=\"region-overview__item\""))
})

test('flow modules manager should provide macro expansion preview in visual detail panel', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('宏展开预览'))
  assert.ok(src.includes('readonlyFlowSelectedMacroExpandedSteps'))
  assert.ok(src.includes('flow-visual-macro-expand'))
})
