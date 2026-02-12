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

test('preview page should render in preview mode (no exam auto behaviors)', async () => {
  const src = await readFile('pages/preview/index.vue')
  const m = src.match(/<QuestionRenderer[\s\S]*?\bmode\s*=\s*"([^"]+)"/)
  assert.ok(m, 'Expected <QuestionRenderer ... mode="..."> in pages/preview/index.vue')
  assert.equal(m[1], 'preview')
})

test('preview page should load question snapshot via repository instead of direct storage access', async () => {
  const src = await readFile('pages/preview/index.vue')
  assert.ok(src.includes("import { loadCurrentQuestionSnapshot, saveCurrentQuestionSnapshot } from '/infra/repository/questionRepository'"))
  assert.ok(src.includes('const snapshot = loadCurrentQuestionSnapshot<Question>()'))
  assert.ok(!src.includes("uni.getStorageSync('currentQuestion')"))
  assert.ok(!src.includes("uni.setStorageSync('currentQuestion'"))
})

test('ListeningChoiceRenderer preview should not simulate audio playback countdown', async () => {
  const src = await readFile('components/renderer/ListeningChoiceRenderer.vue')

  // Simulation constants/UI text should not exist once preview auto-timers are removed.
  assert.ok(!src.includes('PREVIEW_AUDIO_SIM_SECONDS_PER_PLAY'))
  assert.ok(!src.includes('预览模拟音频'))
  assert.ok(!src.includes('不播放也会按倒计时自动进入下一步'))
})

test('ListeningChoiceRenderer should short-circuit auto timers in preview before step branching', async () => {
  const src = await readFile('components/renderer/ListeningChoiceRenderer.vue')
  const start = src.indexOf('function enterActiveStep()')
  assert.notEqual(start, -1, 'Expected function enterActiveStep() in ListeningChoiceRenderer.vue')

  const windowSrc = src.slice(start, start + 2400)
  const previewGuard = windowSrc.indexOf('if (isPreview.value)')
  const introBranch = windowSrc.indexOf("if (step.kind === 'intro')")

  assert.notEqual(previewGuard, -1, 'Expected preview guard in enterActiveStep()')
  assert.notEqual(introBranch, -1, 'Expected step branching in enterActiveStep()')
  assert.ok(previewGuard < introBranch, 'Preview guard should run before step branching')
})

test('EditorWorkspace phone preview should not wrap renderers in an outer scroll-view (allows fixed bottom bars)', async () => {
  const src = await readFile('components/views/EditorWorkspace.vue')
  assert.ok(!src.includes('<scroll-view v-else scroll-y class="phone-content">'))
  assert.ok(!src.includes(':deep(.uni-scroll-view-content)'))
})

test('ListeningChoiceRenderer countdown labels should reflect what happens next', async () => {
  const src = await readFile('components/renderer/ListeningChoiceRenderer.vue')
  assert.ok(src.includes('播放描述音频前-倒计时'))
  assert.ok(src.includes('播放正文音频前-倒计时'))
  assert.ok(src.includes('答题前-倒计时'))
})

test('FlowModulesManager should support template-data + flow-rule + preview workflow', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')
  assert.ok(src.includes('<ListeningChoiceEditor'))
  assert.ok(src.includes('题型模板数据'))
  assert.ok(src.includes('enableIntroCountdown'))
  assert.ok(src.includes('disableIntroCountdown'))
  assert.ok(src.includes("quickAddPerGroupStep('countdown')"))
  assert.ok(src.includes("quickAddPerGroupStep('promptTone')"))
  assert.ok(src.includes("quickAddPerGroupStep('playAudioDescription')"))
  assert.ok(src.includes("quickAddPerGroupStep('playAudioContent')"))
  assert.ok(src.includes("quickAddPerGroupStep('answerChoice')"))
  assert.ok(src.includes(':sortable="true"'))
  assert.ok(src.includes('@reorder="reorderPerGroupStepByFlowIndex"'))
  assert.ok(src.includes('function reorderPerGroupStepByFlowIndex'))
})

test('ListeningChoiceRenderer answerChoice should not render early-next button', async () => {
  const src = await readFile('components/renderer/ListeningChoiceRenderer.vue')
  assert.ok(!src.includes('提前进入下一步'))
})

test('ListeningChoiceRenderer promptTone should reuse previous view instead of standalone page', async () => {
  const src = await readFile('components/renderer/ListeningChoiceRenderer.vue')
  assert.ok(src.includes('function resolveDisplayStepIndex'))
  assert.ok(!src.includes('<text>播放提示音</text>'))
})

test('ListeningChoiceFlowDiagram should expose drag handle and reorder emit', async () => {
  const src = await readFile('components/editor/ListeningChoiceFlowDiagram.vue')
  assert.ok(src.includes("draggable=\"true\""))
  assert.ok(src.includes("(e: 'reorder', fromIndex: number, toIndex: number): void"))
})

test('quick add step buttons should be shared by a reusable component', async () => {
  const shared = await readFile('components/editor/FlowStepQuickAdd.vue')
  const manager = await readFile('components/views/FlowModulesManager.vue')
  const standardEditor = await readFile('components/editor/ListeningChoiceStandardFlowEditor.vue')
  const flowPanel = await readFile('components/editor/ListeningChoiceFlowPanel.vue')

  assert.ok(shared.includes('defineProps<{'))
  assert.ok(shared.includes("v-for=\"item in items\""))
  assert.ok(manager.includes('<FlowStepQuickAdd'))
  assert.ok(standardEditor.includes('<FlowStepQuickAdd'))
  assert.ok(flowPanel.includes('<FlowStepQuickAdd'))
})

test('index page should sync currentType from questionDraft store on mount', async () => {
  const src = await readFile('pages/index/index.vue')
  assert.ok(src.includes("import { questionDraft } from '/stores/questionDraft'"))
  assert.ok(src.includes('questionDraft.loadFromStorage()'))
  assert.ok(src.includes('syncTypeFromCurrentDraft()'))
})

test('side navigation should expose learning module entry', async () => {
  const src = await readFile('components/layout/SideNavigation.vue')
  assert.ok(src.includes("currentModule === 'learning'"))
  assert.ok(src.includes("switchModule('learning')"))
  assert.ok(src.includes('学习'))
})

test('index page should route learning module to LearningWorkspace', async () => {
  const src = await readFile('pages/index/index.vue')
  assert.ok(src.includes("import LearningWorkspace from '/components/views/LearningWorkspace.vue'"))
  assert.ok(src.includes("<LearningWorkspace v-else-if=\"currentModule === 'learning'\" />"))
})

test('question library should load recent questions via repository', async () => {
  const src = await readFile('components/views/QuestionLibrary.vue')
  assert.ok(src.includes("import { loadRecentQuestions } from '/infra/repository/questionRepository'"))
  assert.ok(src.includes('questions.value = loadRecentQuestions<Question>()'))
})

test('learning workspace should support local-library simulation, flow context, and step traces', async () => {
  const src = await readFile('components/views/LearningWorkspace.vue')
  assert.ok(src.includes("import { loadRecentQuestions } from '/infra/repository/questionRepository'"))
  assert.ok(src.includes('const list = loadRecentQuestions<LocalQuestion>()'))
  assert.ok(src.includes('runQuestionFlow'))
  assert.ok(src.includes('reduceQuestionFlowRuntimeState'))
  assert.ok(src.includes('flowModules.getListeningChoiceByRef'))
  assert.ok(src.includes('simRegion'))
  assert.ok(src.includes('simScene'))
  assert.ok(src.includes('simGrade'))
  assert.ok(src.includes('runtimeMeta'))
  assert.ok(src.includes('moduleDisplayRef'))
  assert.ok(src.includes('模块备注'))
  assert.ok(src.includes('class="learning-left"'))
  assert.ok(src.includes('class="learning-middle"'))
  assert.ok(src.includes('panel panel--trace'))
  assert.ok(src.includes('traceEvents'))
  assert.ok(src.includes('开始演练'))
  assert.ok(src.includes('步骤轨迹'))
  assert.ok(src.includes('RuntimeDebugDrawer'))
  assert.ok(src.includes('learningDebugSessionId'))
})

test('phone preview panel should support configurable render mode', async () => {
  const src = await readFile('components/layout/PhonePreviewPanel.vue')
  assert.ok(src.includes('renderMode?: RenderMode'))
  assert.ok(src.includes(':mode=\"renderMode\"'))
  assert.ok(src.includes('runtimeMeta?: RuntimeMetaInfo | null'))
  assert.ok(src.includes('来源：{{ runtimeMeta?.sourceKind || \'-\' }}'))
})

test('ListeningChoiceEditor sub-questions should support collapse and expand', async () => {
  const src = await readFile('components/editor/ListeningChoiceEditor.vue')
  assert.ok(src.includes('isSubQuestionExpanded'))
  assert.ok(src.includes('toggleSubQuestion'))
  assert.ok(src.includes('▾'))
  assert.ok(src.includes('▸'))
})

test('listening choice group should include prepare/answer timing and audio play-count fields in type/template/editor', async () => {
  const typeSrc = await readFile('types/question.ts')
  const storeSrc = await readFile('stores/contentTemplates.ts')
  const editorSrc = await readFile('components/editor/ListeningChoiceEditor.vue')

  assert.ok(typeSrc.includes('prepareSeconds?: number'))
  assert.ok(typeSrc.includes('answerSeconds?: number'))
  assert.ok(storeSrc.includes('prepareSeconds'))
  assert.ok(storeSrc.includes('answerSeconds'))
  assert.ok(editorSrc.includes('题组准备时间（秒）'))
  assert.ok(editorSrc.includes('题组答题时间（秒，0=不限时）'))
  assert.ok(editorSrc.includes('题组正文音频播放次数'))
})
