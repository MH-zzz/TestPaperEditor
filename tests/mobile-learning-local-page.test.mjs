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

test('pages.json should register mobile local learning routes', async () => {
  const src = await readFile('pages.json')
  assert.ok(src.includes('"path": "pages/mobile-learning/index"'))
  assert.ok(src.includes('"path": "pages/mobile-learning/unit-list"'))
  assert.ok(src.includes('"path": "pages/mobile-learning/unit-overview"'))
  assert.ok(src.includes('"path": "pages/mobile-learning/practice"'))
})

test('local learning repository should load questions/flows json from static folder', async () => {
  const src = await readFile('infra/repository/localLearningRepository.ts')
  assert.ok(src.includes("'/static/local-learning/questions.json'"))
  assert.ok(src.includes("'/static/local-learning/flows.json'"))
  assert.ok(src.includes("'_www/static/local-learning/questions.json'"))
  assert.ok(src.includes("'_www/static/local-learning/flows.json'"))
  assert.ok(src.includes('export async function loadLocalLearningQuestions'))
  assert.ok(src.includes('export async function loadLocalLearningFlows'))
})

test('mobile learning should split into 3 pages: unit list -> overview -> practice', async () => {
  const listSrc = await readFile('pages/mobile-learning/unit-list.vue')
  const overviewSrc = await readFile('pages/mobile-learning/unit-overview.vue')
  const practiceSrc = await readFile('pages/mobile-learning/practice.vue')
  assert.ok(listSrc.includes('本地学习'))
  assert.ok(listSrc.includes('/pages/mobile-learning/unit-overview'))
  assert.ok(overviewSrc.includes('继续练习'))
  assert.ok(overviewSrc.includes('/pages/mobile-learning/practice'))
  assert.ok(practiceSrc.includes('<QuestionRenderer'))
})

test('mobile learning practice should render QuestionRenderer in exam mode', async () => {
  const src = await readFile('pages/mobile-learning/practice.vue')
  assert.ok(src.includes('<QuestionRenderer'))
  assert.ok(src.includes(":mode=\"'exam'\""))
  assert.ok(src.includes('@step-change="handleStepChange"'))
})

test('mobile learning practice should support swipe gestures for previous/next step', async () => {
  const src = await readFile('pages/mobile-learning/practice.vue')
  assert.ok(src.includes('@touchstart="onPracticeTouchStart"'))
  assert.ok(src.includes('@touchend="onPracticeTouchEnd"'))
  assert.ok(src.includes('function goPrevStep()'))
  assert.ok(src.includes('function goNextStep()'))
})

test('mobile learning page should render as a real full-screen page (no simulated phone frame)', async () => {
  const src = await readFile('pages/mobile-learning/practice.vue')
  assert.ok(src.includes('class="local-learning local-learning--practice"'))
  assert.ok(!src.includes('class="mobile-stage"'))
  assert.ok(!src.includes('class="mobile-stage__frame"'))
  assert.ok(!src.includes('class="mobile-stage__content"'))
})

test('mobile learning page should format object-style load errors for readable message', async () => {
  const src = await readFile('stores/localLearning.ts')
  assert.ok(src.includes('function resolveLoadErrorMessage(err: unknown): string {'))
  assert.ok(src.includes("if (isObjectRecord(err) && typeof err.errMsg === 'string') return err.errMsg"))
  assert.ok(src.includes('localLearningState.loadError = resolveLoadErrorMessage(err)'))
})

test('local learning should normalize hear-answer modules to V2 recordGuide flow', async () => {
  const src = await readFile('stores/localLearning.ts')
  assert.ok(src.includes('normalizeListeningChoiceStandardModule'))
  assert.ok(src.includes('LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID'))
  assert.ok(src.includes("String((step as { kind?: unknown })?.kind || '') === 'recordGuide'"))
  assert.ok(src.includes('DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE.perGroupSteps'))
})

test('App launch should redirect to mobile local learning page on APP-PLUS', async () => {
  const src = await readFile('App.vue')
  assert.ok(src.includes('// #ifdef APP-PLUS'))
  assert.ok(src.includes('uni.reLaunch({'))
  assert.ok(src.includes("url: '/pages/mobile-learning/unit-list'"))
})
