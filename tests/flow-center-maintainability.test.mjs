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

test('flow center should keep maintainability guardrail and split roadmap', async () => {
  const managerSrc = await readFile('components/views/FlowModulesManager.vue')
  const managerLineCount = managerSrc.split('\n').length
  assert.ok(
    managerLineCount <= 4200,
    `FlowModulesManager.vue line count exceeded guardrail: ${managerLineCount} > 4200`
  )
  assert.ok(managerSrc.includes('<style src="./flow-modules/FlowModulesManager.scss" lang="scss" scoped></style>'))
  assert.ok(!managerSrc.includes('useFlowProfileDiagnostics'))
  assert.ok(managerSrc.includes('useCommitValidationIssues'))
  assert.ok(managerSrc.includes('useRegionBindingOverview'))
  assert.ok(managerSrc.includes('useRegionBindingTemplates'))
  assert.ok(managerSrc.includes('useFlowLineWizard'))
  assert.ok(managerSrc.includes('useFlowPreviewPanel'))

  const managerStyle = await readFile('components/views/flow-modules/FlowModulesManager.scss')
  assert.ok(managerStyle.includes('.flow-center'))
  assert.ok(managerStyle.includes('.flow-visual-modal'))
  assert.ok(!managerStyle.includes('.route-check'))

  const commitIssuesComposable = await readFile('components/views/flow-modules/useCommitValidationIssues.ts')
  assert.ok(commitIssuesComposable.includes('export function useCommitValidationIssues'))
  assert.ok(commitIssuesComposable.includes('jumpToCommitValidationIssue'))
  assert.ok(commitIssuesComposable.includes('handleModuleCommitValidationFailed'))

  const regionBindingComposable = await readFile('components/views/flow-modules/useRegionBindingOverview.ts')
  assert.ok(regionBindingComposable.includes('export function useRegionBindingOverview'))
  assert.ok(regionBindingComposable.includes('toggleRegionBindingForCurrentFlowLine'))

  const wizardComposable = await readFile('components/views/flow-modules/useFlowLineWizard.ts')
  assert.ok(wizardComposable.includes('export function useFlowLineWizard'))
  assert.ok(wizardComposable.includes('flowLineWizardVisible'))
  assert.ok(wizardComposable.includes('confirmCreateFlowLineFromWizard'))

  const regionTemplateComposable = await readFile('components/views/flow-modules/useRegionBindingTemplates.ts')
  assert.ok(regionTemplateComposable.includes('export function useRegionBindingTemplates'))
  assert.ok(regionTemplateComposable.includes('saveRegionBindingTemplateFromCurrent'))
  assert.ok(regionTemplateComposable.includes('applyRegionBindingTemplate'))

  const flowPreviewComposable = await readFile('components/views/flow-modules/useFlowPreviewPanel.ts')
  assert.ok(flowPreviewComposable.includes('export function useFlowPreviewPanel'))
  assert.ok(flowPreviewComposable.includes('previewDisplayTotalSteps'))
  assert.ok(flowPreviewComposable.includes('setPreviewVirtualIndex'))

  const roadmap = await readFile('docs/plans/2026-03-04-type-coverage-and-flow-center-maintainability.md')
  assert.ok(roadmap.includes('FlowModulesManager.vue'))
  assert.ok(roadmap.includes('Phase 1'))
  assert.ok(roadmap.includes('Phase 2'))
  assert.ok(roadmap.includes('Phase 3'))
  assert.ok(roadmap.includes('<= 5000'))
})

test('governance should mark hear-answer baseline as accepted with dedicated doc', async () => {
  const registry = await readFile('docs/governance/question-type-registry.md')
  const standards = await readFile('docs/governance/flow-ui-standards.md')
  const baseline = await readFile('docs/question-types/speaking-hear-answer-ui-baseline.md')

  assert.ok(registry.includes('`speaking_hear_answer`'))
  assert.ok(registry.includes('| Done | Done |'))
  assert.ok(registry.includes('docs/question-types/speaking-hear-answer-ui-baseline.md'))
  assert.ok(standards.includes('docs/question-types/speaking-hear-answer-ui-baseline.md'))
  assert.ok(standards.includes('UI: accepted (current baseline).'))
  assert.ok(baseline.includes('Speaking Hear-Answer UI Baseline'))
  assert.ok(baseline.includes('录音预览'))
  assert.ok(baseline.includes('recordGuide'))
})

test('governance should mark speaking-steps baseline as accepted with dedicated doc', async () => {
  const registry = await readFile('docs/governance/question-type-registry.md')
  const standards = await readFile('docs/governance/flow-ui-standards.md')
  const baseline = await readFile('docs/question-types/speaking-steps-ui-baseline.md')

  assert.ok(registry.includes('`speaking_steps`'))
  assert.ok(registry.includes('| Done | Done |'))
  assert.ok(registry.includes('docs/question-types/speaking-steps-ui-baseline.md'))
  assert.ok(standards.includes('docs/question-types/speaking-steps-ui-baseline.md'))
  assert.ok(standards.includes('UI: accepted (current baseline).'))
  assert.ok(baseline.includes('Speaking Steps UI Baseline'))
  assert.ok(baseline.includes('Acceptance Verdict'))
})

test('governance should mark listening-fill and listening-match baselines as accepted with dedicated docs', async () => {
  const registry = await readFile('docs/governance/question-type-registry.md')
  const standards = await readFile('docs/governance/flow-ui-standards.md')
  const fillBaseline = await readFile('docs/question-types/listening-fill-ui-baseline.md')
  const matchBaseline = await readFile('docs/question-types/listening-match-ui-baseline.md')

  assert.ok(registry.includes('`listening_fill`'))
  assert.ok(registry.includes('`listening_match`'))
  assert.ok(registry.includes('docs/question-types/listening-fill-ui-baseline.md'))
  assert.ok(registry.includes('docs/question-types/listening-match-ui-baseline.md'))
  assert.ok(registry.includes('| Done | Done |'))
  assert.ok(registry.includes('engine/flow/listening-fill/runtime.ts'))
  assert.ok(registry.includes('engine/flow/listening-match/runtime.ts'))
  assert.ok(standards.includes('docs/question-types/listening-fill-ui-baseline.md'))
  assert.ok(standards.includes('docs/question-types/listening-match-ui-baseline.md'))
  assert.ok(standards.includes('UI: accepted (current baseline).'))
  assert.ok(fillBaseline.includes('Listening Fill UI Baseline'))
  assert.ok(matchBaseline.includes('Listening Match UI Baseline'))
  assert.ok(fillBaseline.includes('Acceptance Verdict'))
  assert.ok(matchBaseline.includes('Acceptance Verdict'))
})
