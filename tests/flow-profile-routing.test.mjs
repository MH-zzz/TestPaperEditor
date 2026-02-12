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

test('question metadata should expose flow profile routing context fields', async () => {
  const src = await readFile('types/question.ts')
  assert.ok(src.includes('flowContext?: {'))
  assert.ok(src.includes('region?: string'))
  assert.ok(src.includes('scene?: string'))
  assert.ok(src.includes('grade?: string'))
})

test('listening-choice binding should derive routing context from opts + metadata', async () => {
  const src = await readFile('engine/flow/listening-choice/binding.ts')

  assert.ok(src.includes('function resolveRoutingCtx('))
  assert.ok(src.includes('flowContext'))
  assert.ok(src.includes('resolveRoutingCtx(question, opts?.ctx)'))
  assert.ok(src.includes('resolveStandardModule(question, source, routingCtx)'))
  assert.ok(src.includes('resolveStandardModule(resolvedQuestion, src, routingCtx)'))
})

test('flow center copy should use the new "题型流程" terminology', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')

  assert.ok(src.includes('保存题型流程'))
  assert.ok(src.includes('题型流程图'))
  assert.ok(src.includes('题型流程库'))
  assert.ok(!src.includes('保存流程模板'))
})

test('flow center should provide profile routing management in listening-choice flow page', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')

  assert.ok(src.includes('题型流程路由'))
  assert.ok(src.includes('新增路由'))
  assert.ok(src.includes('绑定当前流程版本'))
  assert.ok(src.includes('重置路由'))
})

test('flow profile store should support removing profile rules safely', async () => {
  const src = await readFile('stores/flowProfiles.ts')
  assert.ok(src.includes('remove(id: string)'))
  assert.ok(src.includes('this.state.profiles = next'))
})

test('flow profile domain usecase should provide scoring, diagnostics and submit validation', async () => {
  const src = await readFile('domain/flow-profile/usecases/scoreProfiles.ts')
  assert.ok(src.includes('export function scoreProfiles('))
  assert.ok(src.includes('export function diagnoseFlowProfileRules('))
  assert.ok(src.includes('export function buildFlowProfileFixSuggestions('))
  assert.ok(src.includes('export function canSubmitFlowProfiles('))
  assert.ok(src.includes('weakCoverage'))
})

test('flow profile store should support diagnostic-gated submit helpers', async () => {
  const src = await readFile('stores/flowProfiles.ts')
  assert.ok(src.includes('upsertWithDiagnostics(profileInput: unknown)'))
  assert.ok(src.includes('removeWithDiagnostics(id: string)'))
  assert.ok(src.includes('validateBeforeSubmit(questionType: QuestionType)'))
  assert.ok(src.includes('canSubmitFlowProfiles('))
  assert.ok(src.includes('scoreProfiles('))
})

test('flow center should provide a routing hit simulator', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('路由命中模拟'))
  assert.ok(src.includes('模拟地区'))
  assert.ok(src.includes('模拟场景'))
  assert.ok(src.includes('模拟年级'))
  assert.ok(src.includes('匹配结果'))
})

test('flow center simulator should support loading context from current question metadata', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const sim = await readFile('components/views/flow-modules/useRouteSimulator.ts')
  assert.ok(src.includes('读取当前题目上下文'))
  assert.ok(src.includes('loadRouteSimFromCurrentQuestion'))
  assert.ok(src.includes("from './flow-modules/useRouteSimulator'"))
  assert.ok(src.includes('routeSimulator.loadRouteSimFromCurrentQuestion()'))
  assert.ok(sim.includes('readQuestionFlowContext(data)'))
})

test('flow center simulator should support writing context back to current question metadata', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const sim = await readFile('components/views/flow-modules/useRouteSimulator.ts')
  assert.ok(src.includes('写回当前题目上下文'))
  assert.ok(src.includes('syncRouteSimToCurrentQuestion'))
  assert.ok(src.includes("import { questionDraft } from '/stores/questionDraft'"))
  assert.ok(src.includes('routeSimulator.syncRouteSimToCurrentQuestion()'))
  assert.ok(sim.includes('patchQuestionFlowContext'))
  assert.ok(sim.includes('persistCurrentQuestion(next)'))
  assert.ok(src.includes('questionDraft.updateDraft(next, { persistDraft: true })'))
})

test('editor workspace should allow editing flow context and trigger listening-choice flow resolve', async () => {
  const src = await readFile('components/views/EditorWorkspace.vue')
  assert.ok(src.includes('流程上下文'))
  assert.ok(src.includes('地区'))
  assert.ok(src.includes('场景'))
  assert.ok(src.includes('年级'))
  assert.ok(src.includes('function updateFlowContext('))
  assert.ok(src.includes('resolveListeningChoiceFlowSource('))
})

test('editor workspace should map 听说-听后选择 to listening_choice template', async () => {
  const src = await readFile('components/views/EditorWorkspace.vue')
  assert.ok(src.includes("if (leaf === '听后选择') return { templateKey: 'listening_choice', enabled: true, reason: '' }"))
  assert.ok(!src.includes("if (leaf === '听后选择') return { templateKey: 'speaking_hear_choice', enabled: true, reason: '' }"))
})

test('flow center should provide routing diagnostics for conflict and dead rules', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('路由规则检查'))
  assert.ok(src.includes('冲突规则'))
  assert.ok(src.includes('潜在死规则'))
  assert.ok(src.includes('diagnoseFlowProfileRules'))
})

test('flow center should include weak-coverage diagnostics and submission status', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('弱覆盖提示'))
  assert.ok(src.includes('flowProfileSubmitValidation'))
  assert.ok(src.includes('可提交'))
})

test('flow center simulator should show scoring breakdown for matched rule', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const sim = await readFile('components/views/flow-modules/useRouteSimulator.ts')
  assert.ok(src.includes('匹配分解'))
  assert.ok(src.includes('总分'))
  assert.ok(src.includes('simulatedRankedCandidates'))
  assert.ok(src.includes('useRouteSimulator'))
  assert.ok(sim.includes('scoreProfiles('))
})

test('flow center should provide auto-fix suggestions for routing diagnostics', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('自动修复建议'))
  assert.ok(src.includes('flowProfileFixSuggestions'))
  assert.ok(src.includes('applyFlowProfileFixSuggestion'))
  assert.ok(src.includes('applyAllFlowProfileFixSuggestions'))
})

test('flow center should preview fix suggestions before applying changes', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('修复预览'))
  assert.ok(src.includes('pendingFlowProfileFixSuggestions'))
  assert.ok(src.includes('openFlowProfileFixPreview'))
  assert.ok(src.includes('confirmFlowProfileFixPreview'))
})

test('flow center fix preview should show field-level before and after details', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('修改前'))
  assert.ok(src.includes('修改后'))
  assert.ok(src.includes('previewFields'))
})

test('flow center should confirm before applying previewed fixes', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes("title: '确认应用修复预览'"))
  assert.ok(src.includes('uni.showModal'))
})

test('flow center should block route submissions when diagnostics fail', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes("title: '路由诊断未通过'"))
  assert.ok(src.includes('showFlowProfileSubmitBlocked'))
  assert.ok(src.includes('flowProfiles.upsertWithDiagnostics'))
  assert.ok(src.includes('flowProfiles.removeWithDiagnostics'))
})

test('flow center should validate listening-choice module before save', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  assert.ok(lifecycleSrc.includes('validateListeningChoiceStandardModule'))
  assert.ok(lifecycleSrc.includes("title: '题型流程校验失败'"))
  assert.ok(lifecycleSrc.includes("title: '题型流程校验提醒'"))
  assert.ok(src.includes('saveStandard(skipWarningCheck = false, skipImpactCheck = false, targetVersion?: number)'))
  assert.ok(src.includes('moduleLifecycle.saveStandard(skipWarningCheck, skipImpactCheck, targetVersion)'))
  assert.ok(lifecycleSrc.includes("title: '确认保存题型流程'"))
  assert.ok(lifecycleSrc.includes('命中路由规则'))
  assert.ok(lifecycleSrc.includes('受影响路由规则'))
})

test('flow center should support save-as-next-version and archive-current-version', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  assert.ok(src.includes('另存新版本'))
  assert.ok(src.includes('发布当前版本'))
  assert.ok(src.includes('归档当前版本'))
  assert.ok(src.includes('saveStandardAsNextVersion'))
  assert.ok(src.includes('publishCurrentStandard'))
  assert.ok(src.includes('archiveCurrentStandard'))
  assert.ok(lifecycleSrc.includes("title: '归档当前版本'"))
  assert.ok(lifecycleSrc.includes('flowModules.archiveListeningChoice'))
})

test('flow center should enforce module status state-machine rules in UI and save logic', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  assert.ok(src.includes('module-state'))
  assert.ok(src.includes('currentModuleStatus'))
  assert.ok(src.includes('canSaveCurrentStandard'))
  assert.ok(lifecycleSrc.includes("title: '归档版本只读'"))
  assert.ok(lifecycleSrc.includes("title: '发布版本不可直接覆盖'"))
  assert.ok(lifecycleSrc.includes("status: 'draft'"))
  assert.ok(lifecycleSrc.includes("flowModules.setListeningChoiceStatus(ref, 'published')"))
})

test('flow center should allow editing module display name and note for save/publish', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  assert.ok(src.includes('流程名称'))
  assert.ok(src.includes('流程备注'))
  assert.ok(src.includes('draftModuleName'))
  assert.ok(src.includes('draftModuleNote'))
  assert.ok(lifecycleSrc.includes('const moduleName = normalizeModuleName(draftModuleName.value'))
  assert.ok(lifecycleSrc.includes('const moduleNote = normalizeModuleNote(draftModuleNote.value)'))
  assert.ok(lifecycleSrc.includes('name: moduleName'))
  assert.ok(lifecycleSrc.includes('note: moduleNote'))
})

test('flow center should show module names in routing cards and published-version chips', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('function formatModuleDisplayRef('))
  assert.ok(src.includes('{{ formatModuleDisplayRef(profile.module) }}'))
  assert.ok(src.includes('{{ formatModuleDisplayRef(m) }}（已发布）'))
  assert.ok(src.includes('当前版本：{{ draftModuleDisplayRef }}'))
})

test('listening-choice binding should skip archived module refs and fallback', async () => {
  const src = await readFile('engine/flow/listening-choice/binding.ts')
  assert.ok(src.includes('const isActiveModule = (module: ListeningChoiceFlowModuleV1 | null | undefined): module is ListeningChoiceFlowModuleV1 => {'))
  assert.ok(src.includes('if (isActiveModule(hit)) return { module: hit, profileId: profileId || undefined }'))
})

test('flow center should support bulk migrating profile rules to current module version', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  assert.ok(src.includes('迁移到当前版本'))
  assert.ok(src.includes('flowProfilesMigratableToCurrentVersion'))
  assert.ok(src.includes('migrateFlowProfilesToCurrentVersion'))
  assert.ok(lifecycleSrc.includes("title: '批量迁移路由版本'"))
  assert.ok(lifecycleSrc.includes('formatFlowProfileVersionSummary'))
})

test('flow center should run template/module/profile cross-checks before module commit', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  const validatorSrc = await readFile('domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  assert.ok(src.includes('validateModuleCommitBeforeSavePublish(payload: ModuleCommitValidationPayload)'))
  assert.ok(src.includes('validateListeningChoiceModuleCommitCrossChecks'))
  assert.ok(src.includes('validateBeforeCommit: validateModuleCommitBeforeSavePublish'))
  assert.ok(lifecycleSrc.includes('checkModuleCommitGuard'))
  assert.ok(lifecycleSrc.includes("title: '流程引用校验失败'"))
  assert.ok(validatorSrc.includes('template_groups_empty'))
  assert.ok(validatorSrc.includes('group_prepare_seconds_missing'))
  assert.ok(validatorSrc.includes('route_missing_module_ref'))
  assert.ok(validatorSrc.includes('route_archived_module_ref'))
})

test('flow center should provide field-level blocking issues with one-click jump for commit validation', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  const lifecycleSrc = await readFile('components/views/flow-modules/useModuleLifecycle.ts')
  const editorSrc = await readFile('components/editor/ListeningChoiceEditor.vue')

  assert.ok(src.includes('保存/发布阻断项'))
  assert.ok(src.includes('jumpToCommitValidationIssue'))
  assert.ok(src.includes('jumpToFirstCommitValidationIssue'))
  assert.ok(src.includes(':focus-path="templateFocusPath"'))
  assert.ok(src.includes("onCommitValidationFailed: handleModuleCommitValidationFailed"))
  assert.ok(src.includes("class=\"panel\" :class=\"{ 'panel--focus': routePanelFocusActive }\""))
  assert.ok(src.includes(":class=\"{ 'is-focus': routePanelFocusProfileId === profile.id }\""))
  assert.ok(lifecycleSrc.includes('onCommitValidationFailed?: (result: ModuleCommitValidationResult) => boolean'))
  assert.ok(lifecycleSrc.includes('const handled = onCommitValidationFailed ? onCommitValidationFailed(result) : false'))
  assert.ok(editorSrc.includes('focusPath?: string'))
  assert.ok(editorSrc.includes('card--focused'))
  assert.ok(editorSrc.includes('sub-card--focused'))
})

test('flow engine should provide generic flow protocol and reducer abstractions for multi-question types', async () => {
  const typeSrc = await readFile('types/flow-engine.ts')
  assert.ok(typeSrc.includes('export interface FlowStepProtocol'))
  assert.ok(typeSrc.includes('export interface FlowModuleProtocol'))
  assert.ok(typeSrc.includes('export type FlowAutoNextSignal'))

  const runtimeSrc = await readFile('engine/flow/runtime.ts')
  assert.ok(runtimeSrc.includes('export function createFlowRuntimeState'))
  assert.ok(runtimeSrc.includes('export function reduceFlowRuntimeState'))

  const indexSrc = await readFile('engine/flow/index.ts')
  assert.ok(indexSrc.includes("export * from './runtime.ts'"))

  const listeningRuntimeSrc = await readFile('engine/flow/listening-choice/runtime.ts')
  assert.ok(listeningRuntimeSrc.includes('createFlowRuntimeState'))
  assert.ok(listeningRuntimeSrc.includes('reduceFlowRuntimeState'))
})

test('listening-choice renderer should read step-kind behavior from plugin registry', async () => {
  const pluginSrc = await readFile('components/renderer/listening-choice/stepPlugins.ts')
  assert.ok(pluginSrc.includes('STEP_BEHAVIOR_PLUGINS'))
  assert.ok(pluginSrc.includes('shouldReuseListeningChoicePreviousScreen'))
  assert.ok(pluginSrc.includes('resolveListeningChoiceStepAudioCarrier'))
  assert.ok(pluginSrc.includes('resolveListeningChoiceStepRenderView'))
  assert.ok(pluginSrc.includes('isListeningChoiceStepKind'))
  assert.ok(pluginSrc.includes('isListeningChoiceContextInfoStep'))

  const rendererSrc = await readFile('components/renderer/ListeningChoiceRenderer.vue')
  assert.ok(rendererSrc.includes("from './listening-choice/stepPlugins'"))
  assert.ok(rendererSrc.includes("import ListeningChoiceIntroBody from './listening-choice/ListeningChoiceIntroBody.vue'"))
  assert.ok(rendererSrc.includes("import ListeningChoicePlayAudioBody from './listening-choice/ListeningChoicePlayAudioBody.vue'"))
  assert.ok(rendererSrc.includes('const DISPLAY_RENDERERS'))
  assert.ok(rendererSrc.includes(':is="displayRenderer"'))
  assert.ok(rendererSrc.includes('displayRendererProps'))
  assert.ok(rendererSrc.includes('shouldReuseListeningChoicePreviousScreen(step)'))
  assert.ok(rendererSrc.includes('resolveListeningChoiceStepAudioCarrier(step)'))
  assert.ok(rendererSrc.includes('resolveListeningChoiceStepRenderView(displayStep.value)'))
  assert.ok(rendererSrc.includes('const activeStepRenderView = computed(() => resolveListeningChoiceStepRenderView(activeStep.value))'))
  assert.ok(rendererSrc.includes('const renderView = activeStepRenderView.value'))
})

test('speaking-steps renderer should use unified flow runtime reducer for step navigation', async () => {
  const runtimeSrc = await readFile('engine/flow/speaking-steps/runtime.ts')
  assert.ok(runtimeSrc.includes('createSpeakingStepsRuntimeState'))
  assert.ok(runtimeSrc.includes('reduceSpeakingStepsRuntimeState'))
  assert.ok(runtimeSrc.includes('reduceFlowRuntimeState'))

  const rendererSrc = await readFile('components/renderer/SpeakingStepsRenderer.vue')
  assert.ok(rendererSrc.includes("from '/engine/flow/speaking-steps/runtime.ts'"))
  assert.ok(rendererSrc.includes('dispatchRuntime({ type: \'next\' })'))
  assert.ok(rendererSrc.includes('dispatchRuntime({ type: \'prev\' })'))
})
