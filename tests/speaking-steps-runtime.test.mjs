import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  expandSpeakingQuestionSteps,
  resolveSpeakingStepFooterMode
} from '../engine/flow/speaking-steps/expand.ts'
import {
  createSpeakingStepsRuntimeState,
  reduceSpeakingStepsRuntimeState
} from '../engine/flow/speaking-steps/runtime.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

async function readFile(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), 'utf8')
}

function createSampleSpeakingStepsQuestion() {
  return {
    id: 'sp_q_1',
    type: 'speaking_steps',
    partType: 5,
    title: '听后转述',
    stem: { type: 'richtext', content: [{ type: 'text', text: '请完成听后转述' }] },
    steps: [
      {
        type: 'introduction',
        id: 'intro_1',
        title: '题型介绍',
        description: '请听音并作答'
      },
      {
        type: 'loop-sub-questions',
        id: 'loop_1',
        stepsPerQuestion: [
          {
            type: 'play-audio',
            id: 'play_1',
            audio: null,
            playCount: 1,
            showProgress: true,
            label: '请听问题'
          },
          {
            type: 'countdown',
            id: 'countdown_1',
            duration: 5,
            label: '请准备作答',
            showProgress: true
          },
          {
            type: 'record',
            id: 'record_1',
            duration: 15,
            playBeepBefore: true,
            showTimer: true,
            showStopButton: true,
            assessmentMode: 'H'
          }
        ]
      },
      {
        type: 'display-content',
        id: 'summary_1',
        content: { type: 'richtext', content: [{ type: 'text', text: '结束' }] },
        label: '总结'
      }
    ],
    subQuestions: [
      {
        id: 'sq_1',
        content: { type: 'richtext', content: [{ type: 'text', text: '问题1' }] },
        contentAudio: { url: '/static/q1.mp3', name: 'q1' }
      },
      {
        id: 'sq_2',
        content: { type: 'richtext', content: [{ type: 'text', text: '问题2' }] },
        contentAudio: { url: '/static/q2.mp3', name: 'q2' }
      }
    ],
    assessment: {
      mode: 'H'
    },
    totalSteps: 0
  }
}

test('speaking-steps loop-sub-questions expansion should be deterministic and stable', () => {
  const question = createSampleSpeakingStepsQuestion()
  const expanded = expandSpeakingQuestionSteps(question)

  assert.deepEqual(
    expanded.map((step) => step.type),
    ['introduction', 'play-audio', 'countdown', 'record', 'play-audio', 'countdown', 'record', 'display-content']
  )
  assert.ok(String(expanded[1].id).includes('__loop_1_q1'))
  assert.ok(String(expanded[4].id).includes('__loop_1_q2'))
})

test('speaking-steps runtime reducer should navigate expanded steps without skipping', () => {
  const question = createSampleSpeakingStepsQuestion()
  const expanded = expandSpeakingQuestionSteps(question)

  let state = createSpeakingStepsRuntimeState(0)
  state = reduceSpeakingStepsRuntimeState(state, expanded, { type: 'next' })
  assert.equal(state.stepIndex, 1)
  state = reduceSpeakingStepsRuntimeState(state, expanded, { type: 'goToStep', stepIndex: 6 })
  assert.equal(state.stepIndex, 6)
  state = reduceSpeakingStepsRuntimeState(state, expanded, { type: 'prev' })
  assert.equal(state.stepIndex, 5)
})

test('runQuestionFlow should compile speaking-steps runtime protocol from expanded steps', async () => {
  const question = createSampleSpeakingStepsQuestion()
  const expanded = expandSpeakingQuestionSteps(question)
  const src = await readFile('app/usecases/runQuestionFlow.ts')

  assert.equal(expanded.length, 8)
  assert.ok(src.includes('expandSpeakingQuestionSteps'))
  assert.ok(src.includes('const steps = expandSpeakingQuestionSteps(question as SpeakingStepsQuestion)'))
  assert.ok(src.includes('expandSpeakingQuestionSteps(question as SpeakingStepsQuestion),'))
})

test('speaking-steps footer mode resolver should match play/countdown/record expectations', () => {
  assert.equal(resolveSpeakingStepFooterMode({ type: 'play-audio' }), 'play-audio')
  assert.equal(resolveSpeakingStepFooterMode({ type: 'countdown' }), 'countdown')
  assert.equal(resolveSpeakingStepFooterMode({ type: 'record' }), 'record')
  assert.equal(resolveSpeakingStepFooterMode({ type: 'display-content' }), 'none')
})
