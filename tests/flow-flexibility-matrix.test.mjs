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

async function loadLocalLearningFlowModules() {
  const raw = await fs.readFile(path.join(repoRoot, 'static/local-learning/flows.json'), 'utf8')
  const payload = JSON.parse(raw)
  const modules = Array.isArray(payload?.listeningChoiceModules) ? payload.listeningChoiceModules : []
  return modules.filter((item) => item && typeof item === 'object')
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

function moduleKey(moduleLike) {
  return `${String(moduleLike?.id || '')}@${Math.max(1, Number(moduleLike?.version || 1))}`
}

function dedupeModules(modules) {
  const map = new Map()
  ;(modules || []).forEach((item) => {
    const key = moduleKey(item)
    if (!key || map.has(key)) return
    map.set(key, item)
  })
  return Array.from(map.values())
}

function buildModuleCandidatesForQuestion(question, localModules, defaults) {
  const fromLocal = (localModules || []).map((item) => toEngineModule(item, String(item?.name || 'local-module')))
  const fromDefaults = [
    toEngineModule(defaults.DEFAULT_LISTENING_CHOICE_STANDARD_MODULE, 'listening-choice-default'),
    toEngineModule(defaults.DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE, 'hear-answer-default')
  ]
  const all = dedupeModules([...fromLocal, ...fromDefaults])
  if (question?.type === 'speaking_hear_answer') {
    return all.filter((item) => String(item?.id || '').includes('hear_answer') || String(item?.name || '').includes('听后回答'))
  }
  return all.filter((item) => !String(item?.id || '').includes('hear_answer'))
}

function isNoopMutation(seedQuestion, mutation) {
  const before = JSON.stringify(seedQuestion)
  const next = clone(seedQuestion)
  mutation.apply(next)
  return JSON.stringify(next) === before
}

function buildMutationCases(seedQuestion) {
  const out = []
  const push = (name, tags, apply) => out.push({ name, tags, apply })

  push('missing_intro_audio_url', ['intro', 'audio'], (q) => {
    removePath(q, 'content.intro.audio.url')
  })

  const groups = Array.isArray(seedQuestion?.content?.groups) ? seedQuestion.content.groups : []
  groups.forEach((group, gIndex) => {
    push(`g${gIndex}_missing_description_audio_url`, ['group', 'audio'], (q) => {
      removePath(q, `content.groups.${gIndex}.descriptionAudio.url`)
    })
    push(`g${gIndex}_missing_content_audio_url`, ['group', 'audio'], (q) => {
      removePath(q, `content.groups.${gIndex}.audio.url`)
    })
    push(`g${gIndex}_description_play_count_zero`, ['group', 'audio', 'playCount'], (q) => {
      setPath(q, `content.groups.${gIndex}.descriptionAudio.playCount`, 0)
    })
    push(`g${gIndex}_content_play_count_zero`, ['group', 'audio', 'playCount'], (q) => {
      setPath(q, `content.groups.${gIndex}.audio.playCount`, 0)
    })
    push(`g${gIndex}_prepare_seconds_zero`, ['group', 'timing'], (q) => {
      setPath(q, `content.groups.${gIndex}.prepareSeconds`, 0)
    })
    push(`g${gIndex}_missing_prompt`, ['group', 'recordGuide'], (q) => {
      removePath(q, `content.groups.${gIndex}.prompt`)
    })
    push(`g${gIndex}_empty_sub_questions`, ['group', 'question'], (q) => {
      setPath(q, `content.groups.${gIndex}.subQuestions`, [])
    })

    const subQuestions = Array.isArray(group?.subQuestions) ? group.subQuestions : []
    subQuestions.forEach((_, qIndex) => {
      push(`g${gIndex}_q${qIndex}_missing_question_id`, ['question', 'id'], (q) => {
        setPath(q, `content.groups.${gIndex}.subQuestions.${qIndex}.id`, '')
      })
      push(`g${gIndex}_q${qIndex}_missing_record_guide_audio`, ['question', 'recordGuide'], (q) => {
        removePath(q, `content.groups.${gIndex}.subQuestions.${qIndex}.recordGuideAudio.url`)
      })
      push(`g${gIndex}_q${qIndex}_missing_record_guide_text`, ['question', 'recordGuide'], (q) => {
        removePath(q, `content.groups.${gIndex}.subQuestions.${qIndex}.recordGuideText`)
      })
    })
  })

  if (seedQuestion?.type === 'speaking_hear_answer') {
    push('hear_answer_missing_all_prompts', ['recordGuide', 'global'], (q) => {
      const list = Array.isArray(q?.content?.groups) ? q.content.groups : []
      list.forEach((_, gIndex) => {
        removePath(q, `content.groups.${gIndex}.prompt`)
        removePath(q, `content.groups.${gIndex}.recordGuideText`)
        removePath(q, `content.groups.${gIndex}.recordGuideAudio.url`)
      })
    })
  }

  const singles = out.filter((item) => !isNoopMutation(seedQuestion, item))
  const comboSeed = singles
    .filter((item) => item.tags.includes('audio') || item.tags.includes('timing') || item.tags.includes('question'))
    .slice(0, 10)
  const combos = []
  for (let i = 0; i < comboSeed.length; i += 1) {
    for (let j = i + 1; j < comboSeed.length; j += 1) {
      if (combos.length >= 18) break
      const a = comboSeed[i]
      const b = comboSeed[j]
      combos.push({
        name: `combo__${a.name}__${b.name}`,
        tags: Array.from(new Set([...(a.tags || []), ...(b.tags || [])])),
        apply(question) {
          a.apply(question)
          b.apply(question)
        }
      })
    }
    if (combos.length >= 18) break
  }

  return singles.concat(combos)
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

test('standard-flow compile should auto-derive missing-field and multi-flow scenario matrix from 2 local-learning seeds', async () => {
  const { compileListeningChoiceFlow } = await import('../engine/flow/listening-choice/compiler.ts')
  const {
    DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE
  } = await import('../flows/listeningChoiceFlowModules.ts')
  const seeds = await loadLocalLearningSeeds()
  const localModules = await loadLocalLearningFlowModules()
  const defaults = {
    DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    DEFAULT_LISTENING_HEAR_ANSWER_STANDARD_MODULE
  }

  let executedScenarios = 0

  for (const seed of seeds) {
    const moduleCandidates = buildModuleCandidatesForQuestion(seed, localModules, defaults)
    assert.ok(moduleCandidates.length > 0, `[${seed.type}] 至少要有 1 条流程模块候选`)

    const mutationCases = buildMutationCases(seed)
    assert.ok(mutationCases.length >= 24, `[${seed.type}] 自动衍生 mutation 数不足，当前=${mutationCases.length}`)

    const scenarioCases = [
      {
        name: 'baseline',
        apply() {}
      },
      ...mutationCases
    ]

    for (const module of moduleCandidates) {
      for (const mutation of scenarioCases) {
        const q = clone(seed)
        mutation.apply(q)
        const out = compileListeningChoiceFlow(q, module, {
          generateId: (() => {
            let i = 0
            return () => `mx_${++i}`
          })()
        })
        q.flow = { ...(q.flow || {}), version: 1, steps: out.steps }
        assert.ok(
          out.steps.length > 0,
          `[${q.type}] module=${moduleKey(module)} scenario=${mutation.name} 应生成可执行流程`
        )
        assertCompiledStepsSkippableWhenFieldsMissing(q)
        executedScenarios += 1
      }
    }
  }

  assert.ok(executedScenarios >= 100, `自动衍生场景数不足，当前=${executedScenarios}`)
})
