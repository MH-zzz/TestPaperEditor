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

function makeIdFactory(prefix = 'id') {
  let i = 0
  return () => `${prefix}_${++i}`
}

function makeQuestion() {
  return {
    id: 'q1',
    type: 'listening_choice',
    optionStyle: 'ABCD',
    content: {
      intro: {
        title: '听后选择',
        title_description: '(共9分,每小题1.5分)',
        text: { type: 'richtext', content: [{ type: 'text', text: 'intro' }] },
        audio: { url: '', playCount: 1 }
      },
      groups: [
        {
          id: 'g1',
          title: '题组1',
          prepareSeconds: 5,
          answerSeconds: 60,
          descriptionAudio: { url: '', playCount: 1 },
          audio: { url: '', playCount: 2 },
          subQuestions: []
        }
      ]
    },
    flow: { version: 1, mode: 'semi-auto', steps: [] }
  }
}

test('flow engine compiler should compile listening-choice module', async () => {
  const engine = await import('../engine/flow/index.ts')
  const question = makeQuestion()
  const module = {
    kind: 'listening_choice',
    id: 'listening_choice.standard.v1',
    version: 1,
    name: '标准',
    introShowTitle: true,
    introShowTitleDescription: true,
    introShowDescription: true,
    introCountdownEnabled: false,
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description', showTitle: true, showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true },
      { kind: 'countdown', showTitle: true, seconds: 3, label: '准备' },
      { kind: 'playAudio', audioSource: 'content', showTitle: true, showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true },
      { kind: 'answerChoice', showTitle: true, showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true }
    ]
  }
  const out = engine.compileListeningChoiceFlow(question, module, { generateId: makeIdFactory('s') })
  assert.deepEqual(out.steps.map(s => s.kind), ['intro', 'playAudio', 'countdown', 'playAudio', 'answerChoice'])
  assert.equal(out.steps[2].seconds, 5)
  assert.equal(out.steps[4].autoNext, 'timeEnded')
})

test('flow engine runtime reducer should honor autoNext events', async () => {
  const engine = await import('../engine/flow/index.ts')
  const steps = [
    { id: 's1', kind: 'intro', autoNext: 'audioEnded' },
    { id: 's2', kind: 'countdown', autoNext: 'countdownEnded' },
    { id: 's3', kind: 'answerChoice', autoNext: 'timeEnded' }
  ]
  let state = engine.createListeningChoiceRuntimeState(0)
  state = engine.reduceListeningChoiceRuntimeState(state, steps, { type: 'audioEnded' })
  assert.equal(state.stepIndex, 1)
  state = engine.reduceListeningChoiceRuntimeState(state, steps, { type: 'countdownEnded' })
  assert.equal(state.stepIndex, 2)
  state = engine.reduceListeningChoiceRuntimeState(state, steps, { type: 'timeEnded' })
  assert.equal(state.stepIndex, 2)
})

test('generic flow runtime reducer should support unified navigation and auto-next semantics', async () => {
  const engine = await import('../engine/flow/index.ts')
  const steps = [
    { id: 'g1', kind: 'intro', autoNext: 'audioEnded' },
    { id: 'g2', kind: 'answerChoice', autoNext: 'tapNext' }
  ]

  let state = engine.createFlowRuntimeState(0)
  state = engine.reduceFlowRuntimeState(state, steps, { type: 'audioEnded' })
  assert.equal(state.stepIndex, 1)

  // tapNext means no automatic advance on runtime auto events.
  state = engine.reduceFlowRuntimeState(state, steps, { type: 'timeEnded' })
  assert.equal(state.stepIndex, 1)

  state = engine.reduceFlowRuntimeState(state, steps, { type: 'prev' })
  assert.equal(state.stepIndex, 0)

  state = engine.reduceFlowRuntimeState(state, steps, { type: 'goToStep', stepIndex: 10 })
  assert.equal(state.stepIndex, 1)
})

test('generic flow runtime reducer should allow per-step custom reducer override', async () => {
  const engine = await import('../engine/flow/index.ts')
  const steps = [
    { id: 'p1', kind: 'intro', autoNext: 'audioEnded' },
    { id: 'p2', kind: 'countdown', autoNext: 'countdownEnded' },
    { id: 'p3', kind: 'finish', autoNext: 'tapNext' }
  ]

  let state = engine.createFlowRuntimeState(0)
  state = engine.reduceFlowRuntimeStateWithStepReducer(state, steps, { type: 'audioEnded' }, () => {
    return ({ event, state: current, totalSteps }) => {
      if (event.type !== 'audioEnded') return null
      return { stepIndex: Math.min(totalSteps - 1, current.stepIndex + 2) }
    }
  })

  assert.equal(state.stepIndex, 2)

  // When custom reducer returns null, fallback should still use autoNext semantics.
  state = engine.reduceFlowRuntimeStateWithStepReducer(
    engine.createFlowRuntimeState(0),
    steps,
    { type: 'audioEnded' },
    () => null
  )
  assert.equal(state.stepIndex, 1)
})

test('speaking-steps runtime should also reuse generic flow reducer', async () => {
  const engine = await import('../engine/flow/index.ts')
  const steps = [
    { id: 'sp1', type: 'introduction' },
    { id: 'sp2', type: 'display-content' },
    { id: 'sp3', type: 'record' }
  ]

  let state = engine.createSpeakingStepsRuntimeState(0)
  state = engine.reduceSpeakingStepsRuntimeState(state, steps, { type: 'next' })
  assert.equal(state.stepIndex, 1)
  state = engine.reduceSpeakingStepsRuntimeState(state, steps, { type: 'next' })
  assert.equal(state.stepIndex, 2)
  state = engine.reduceSpeakingStepsRuntimeState(state, steps, { type: 'next' })
  assert.equal(state.stepIndex, 2)
  state = engine.reduceSpeakingStepsRuntimeState(state, steps, { type: 'prev' })
  assert.equal(state.stepIndex, 1)
})

test('QuestionRenderer should route by config map instead of template hardcoded chains', async () => {
  const src = await readFile('components/renderer/QuestionRenderer.vue')
  assert.ok(src.includes('const QUESTION_RENDERER_ROUTES'))
  assert.ok(src.includes('<component'))
  assert.ok(src.includes('const activeRoute = computed(() =>'))
  assert.ok(!src.includes("v-if=\"data.type === 'listening_choice'\""))
  assert.ok(!src.includes("v-else-if=\"data.type === 'listening_match'\""))
})

test('ListeningChoiceRenderer should branch by plugin render behavior in runtime entry', async () => {
  const src = await readFile('components/renderer/ListeningChoiceRenderer.vue')
  assert.ok(src.includes('const activeStepRenderView = computed(() => resolveListeningChoiceStepRenderView(activeStep.value))'))
  assert.ok(src.includes('const renderView = activeStepRenderView.value'))
  assert.ok(src.includes('const carrier = resolveListeningChoiceStepAudioCarrier(step)'))
  assert.ok(src.includes("if (renderView === 'intro')"))
})
