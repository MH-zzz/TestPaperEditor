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

test('flow modules manager should keep professional mode controls always visible', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('套用标准到当前题目'))
  assert.ok(src.includes('恢复默认'))
  assert.ok(src.includes('查看流程图'))
  assert.ok(src.includes('class="module-meta-grid"'))
  assert.ok(!src.includes('当前模式：'))
})

test('flow modules manager should provide region binding workflow without route simulator panel', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const regionBindingSrc = await readFile('components/views/flow-modules/useRegionBindingOverview.ts')
  assert.ok(src.includes('useRegionBindingOverview'))
  assert.ok(regionBindingSrc.includes('export function useRegionBindingOverview'))
  assert.ok(regionBindingSrc.includes('isRegionBoundToCurrentFlowLine'))
  assert.ok(regionBindingSrc.includes('toggleRegionBindingForCurrentFlowLine'))
  assert.ok(src.includes('地区流程模板'))
  assert.ok(src.includes("class=\"region-template__item\""))
  assert.ok(!src.includes('useRouteSimulator'))
  assert.ok(!src.includes('路由模拟器'))
  assert.ok(!src.includes('Top 候选规则'))
  assert.ok(!src.includes('routeSimScoreSummaryText'))
  assert.ok(!src.includes('路由规则诊断'))
  assert.ok(!src.includes('showFlowProfileSubmitValidationSummary'))
  assert.ok(!src.includes('flowProfileFixSuggestions'))
  assert.ok(!src.includes('pendingFlowProfileFixSuggestions'))
})

test('flow modules manager should provide macro expansion preview in visual detail panel', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('宏展开预览'))
  assert.ok(src.includes('readonlyFlowSelectedMacroExpandedSteps'))
  assert.ok(src.includes('flow-visual-macro-expand'))
})
