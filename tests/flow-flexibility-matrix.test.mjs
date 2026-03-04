import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeText(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function hasRichTextContent(value) {
  if (!value || typeof value !== 'object') return false
  if (value.type !== 'richtext' || !Array.isArray(value.content)) return false
  return value.content.some((node) => {
    if (!node || typeof node !== 'object') return false
    if (node.type === 'text') return Boolean(normalizeText(node.text))
    if (node.type === 'image') return Boolean(normalizeText(node.url))
    return false
  })
}

async function loadLocalLearningSeeds() {
  const raw = await fs.readFile(path.join(repoRoot, 'static/local-learning/questions.json'), 'utf8')
  const list = JSON.parse(raw)
  const listeningChoice = list.find((item) => item?.type === 'listening_choice')
  const hearAnswer = list.find((item) => item?.type === 'speaking_hear_answer')
  assert.ok(listeningChoice, '缺少 listening_choice 标准题')
  assert.ok(hearAnswer, '缺少 speaking_hear_answer 标准题')
  return [listeningChoice, hearAnswer]
}

function removePath(target, pathText) {
  const parts = String(pathText || '').split('.').filter(Boolean)
  if (parts.length <= 0) return

  let cursor = target
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]
    if (!cursor || typeof cursor !== 'object') return
    cursor = cursor[key]
  }
  if (!cursor || typeof cursor !== 'object') return
  delete cursor[parts[parts.length - 1]]
}

function setPath(target, pathText, value) {
  const parts = String(pathText || '').split('.').filter(Boolean)
  if (parts.length <= 0) return

  let cursor = target
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {}
    cursor = cursor[key]
  }
  cursor[parts[parts.length - 1]] = value
}

function buildQuestionIndices(question) {
  const groups = Array.isArray(question?.content?.groups) ? question.content.groups : []
  const groupById = new Map(groups.map((group) => [String(group?.id || ''), group]))
  const questionById = new Map()
  groups.forEach((group) => {
    const subQuestions = Array.isArray(group?.subQuestions) ? group.subQuestions : []
    subQuestions.forEach((sq) => {
      const id = String(sq?.id || '')
      if (!id) return
      questionById.set(id, sq)
    })
  })
  return { groups, groupById, questionById }
}

function assertCompiledStepsSkippableWhenFieldsMissing(question) {
  const steps = Array.isArray(question?.flow?.steps) ? question.flow.steps : []
  const { groupById, questionById } = buildQuestionIndices(question)

  steps.forEach((step, index) => {
    const stepKind = String(step?.kind || '')
    const stepPath = `step[${index}](${stepKind})`

    if (stepKind === 'playAudio') {
      const group = groupById.get(String(step?.groupId || ''))
      const source = step?.audioSource === 'description' ? 'description' : 'content'
      const url = source === 'description'
        ? normalizeText(group?.descriptionAudio?.url)
        : normalizeText(group?.audio?.url)
      assert.ok(url, `${stepPath} 不应保留缺失音频字段的播放步骤`)
    }

    if (stepKind === 'countdown') {
      const seconds = Number(step?.seconds || 0)
      assert.ok(Number.isFinite(seconds) && seconds > 0, `${stepPath} 不应保留 0 秒倒计时步骤`)
    }

    if (stepKind === 'promptTone') {
      assert.ok(normalizeText(step?.url), `${stepPath} 不应保留缺失提示音 URL 的步骤`)
    }

    if (stepKind === 'recordGuide') {
      const guideText = step?.guideText
      const hasText = hasRichTextContent(guideText)
      const hasAudio = Boolean(normalizeText(step?.guideAudioUrl))
      assert.ok(hasText || hasAudio, `${stepPath} 不应保留无文本无音频的录音说明步骤`)
    }

    if (stepKind === 'answerChoice') {
      if (question?.type === 'speaking_hear_answer') {
        const ids = Array.isArray(step?.questionIds) ? step.questionIds.map((id) => String(id || '')).filter(Boolean) : []
        assert.ok(ids.length > 0, `${stepPath} 听后回答答题步骤必须绑定 questionIds`)
        ids.forEach((id) => {
          assert.ok(questionById.has(id), `${stepPath} 绑定了不存在的小题: ${id}`)
        })
      } else {
        const group = groupById.get(String(step?.groupId || ''))
        const subQuestions = Array.isArray(group?.subQuestions) ? group.subQuestions : []
        assert.ok(subQuestions.length > 0, `${stepPath} 不应指向空题组`)
      }
    }
  })
}

function toEngineModule(baseModule, fallbackName) {
  return {
    kind: 'listening_choice',
    id: String(baseModule?.id || 'test.module'),
    version: 1,
    name: fallbackName,
    introShowTitle: baseModule?.introShowTitle,
    introShowTitleDescription: baseModule?.introShowTitleDescription,
    introShowDescription: baseModule?.introShowDescription,
    introCountdownEnabled: baseModule?.introCountdownEnabled,
    introCountdownShowTitle: baseModule?.introCountdownShowTitle,
    introCountdownSeconds: baseModule?.introCountdownSeconds,
    introCountdownLabel: baseModule?.introCountdownLabel,
    perGroupSteps: Array.isArray(baseModule?.perGroupSteps) ? baseModule.perGroupSteps : []
  }
}

test('compiler should skip corresponding steps when required fields are missing', async () => {
  const { compileListeningChoiceFlow } = await import('../engine/flow/listening-choice/compiler.ts')

  const question = {
    id: 'q_skip_steps',
    type: 'speaking_hear_answer',
    metadata: { questionVariant: 'hear_answer' },
    content: {
      intro: {
        title: '听后回答',
        text: { type: 'richtext', content: [{ type: 'text', text: '说明' }] },
        audio: { url: '', playCount: 1 }
      },
      groups: [
        {
          id: 'g1',
          prepareSeconds: 0,
          answerSeconds: 15,
          descriptionAudio: { url: '', playCount: 1 },
          audio: { url: '', playCount: 1 },
          subQuestions: [
            {
              id: 'sq1',
              order: 1,
              stem: { type: 'richtext', content: [{ type: 'text', text: '题干' }] }
            }
          ]
        }
      ]
    },
    flow: { version: 1, mode: 'semi-auto', steps: [] }
  }

  const module = {
    kind: 'listening_choice',
    id: 'tmp.module',
    version: 1,
    name: 'tmp',
    introShowTitle: true,
    introShowTitleDescription: true,
    introShowDescription: true,
    introCountdownEnabled: false,
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description' },
      { kind: 'countdown', seconds: 3, label: '准备' },
      { kind: 'playAudio', audioSource: 'content' },
      { kind: 'recordGuide', textSource: 'question', audioSource: 'question' },
      { kind: 'promptTone', url: '' },
      { kind: 'answerChoice' }
    ]
  }

  const out = compileListeningChoiceFlow(question, module, {
    generateId: (() => {
      let i = 0
      return () => `s_${++i}`
    })()
  })

  assert.deepEqual(out.steps.map((item) => item.kind), ['intro', 'answerChoice'])
})

test('standard-flow compile should keep malformed-variant execution skippable across both local-learning seed types', async () => {
  const { compileListeningChoiceFlow } = await import('../engine/flow/listening-choice/compiler.ts')
  const {
    DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE
  } = await import('../flows/listeningChoiceFlowModules.ts')
  const seeds = await loadLocalLearningSeeds()

  const mutateCases = [
    {
      name: 'missing_intro_audio',
      apply(question) {
        removePath(question, 'content.intro.audio.url')
      }
    },
    {
      name: 'missing_group_description_audio',
      apply(question) {
        removePath(question, 'content.groups.0.descriptionAudio.url')
      }
    },
    {
      name: 'missing_group_content_audio',
      apply(question) {
        removePath(question, 'content.groups.0.audio.url')
      }
    },
    {
      name: 'zero_prepare_seconds',
      apply(question) {
        setPath(question, 'content.groups.0.prepareSeconds', 0)
      }
    },
    {
      name: 'missing_sub_questions_in_first_group',
      apply(question) {
        setPath(question, 'content.groups.0.subQuestions', [])
      }
    },
    {
      name: 'missing_hear_answer_record_guide_materials',
      apply(question) {
        if (question.type !== 'speaking_hear_answer') return
        removePath(question, 'content.groups.0.recordGuideAudio.url')
        removePath(question, 'content.groups.0.recordGuideText')
        removePath(question, 'content.groups.0.prompt')
        removePath(question, 'content.groups.0.subQuestions.0.recordGuideAudio.url')
        removePath(question, 'content.groups.0.subQuestions.0.recordGuideText')
      }
    }
  ]

  for (const seed of seeds) {
    for (const mutate of mutateCases) {
      const q = clone(seed)
      mutate.apply(q)
      const module = q.type === 'speaking_hear_answer'
        ? toEngineModule(DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE, 'hear-answer-default')
        : toEngineModule(DEFAULT_LISTENING_CHOICE_STANDARD_MODULE, 'listening-choice-default')
      const out = compileListeningChoiceFlow(q, module, {
        generateId: (() => {
          let i = 0
          return () => `m_${++i}`
        })()
      })
      q.flow = { ...(q.flow || {}), version: 1, steps: out.steps }
      assert.ok(out.steps.length > 0, `[${q.type}] ${mutate.name} 应生成可执行流程`)
      assertCompiledStepsSkippableWhenFieldsMissing(q)
    }
  }
})
