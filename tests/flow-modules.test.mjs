import test from 'node:test'
import assert from 'node:assert/strict'

function makeIdFactory(prefix = 'id') {
  let i = 0
  return () => `${prefix}_${++i}`
}

function makeListeningChoiceQuestion({ introCountdownSeconds = 3, groupCount = 2, qsPerGroup = 2, prepareSeconds = 3, answerSeconds = 0 } = {}) {
  let order = 1
  const groups = Array.from({ length: groupCount }, (_, gi) => {
    const groupId = `g${gi + 1}`
    const subQuestions = Array.from({ length: qsPerGroup }, (_, qi) => ({
      id: `q${order}`,
      order: order++,
      stem: { type: 'richtext', content: [{ type: 'text', text: `Q${gi + 1}-${qi + 1}` }] },
      options: [
        { key: 'A', content: { type: 'richtext', content: [{ type: 'text', text: 'A' }] } },
        { key: 'B', content: { type: 'richtext', content: [{ type: 'text', text: 'B' }] } }
      ],
      answerMode: 'single',
      answer: ['A']
    }))

    return {
      id: groupId,
      title: `G${gi + 1}`,
      prompt: { type: 'richtext', content: [{ type: 'text', text: `P${gi + 1}` }] },
      prepareSeconds,
      answerSeconds,
      descriptionAudio: { url: '', playCount: 1 },
      audio: { url: '', playCount: 2 },
      subQuestions
    }
  })

  return {
    id: 'lc1',
    type: 'listening_choice',
    content: {
      intro: {
        title: 'Intro',
        text: { type: 'richtext', content: [{ type: 'text', text: 'Intro text' }] },
        audio: { url: '', playCount: 1 },
        countdown: {
          seconds: introCountdownSeconds,
          label: '准备',
          endBeepUrl: '/static/beep.mp3'
        }
      },
      groups
    },
    flow: {
      version: 1,
      mode: 'semi-auto',
      steps: []
    }
  }
}

test('flow module helpers should exist (listening_choice)', async () => {
  let mod
  try {
    mod = await import('../flows/listeningChoiceFlowModules.ts')
  } catch (e) {
    // The import should exist once the feature is implemented.
    assert.fail(`Expected flows/listeningChoiceFlowModules.ts to be importable: ${e?.message || e}`)
  }

  assert.equal(typeof mod.LISTENING_CHOICE_STANDARD_FLOW_ID, 'string')
  assert.equal(typeof mod.materializeListeningChoiceStandardSteps, 'function')
  assert.equal(typeof mod.detectListeningChoiceStandardFlowOverrides, 'function')
  assert.equal(typeof mod.concreteListeningChoiceStepsToTemplate, 'function')
  assert.equal(typeof mod.materializeListeningChoiceTemplateSteps, 'function')
  assert.equal(typeof mod.hashFlowTemplate, 'function')
  assert.equal(typeof mod.validateListeningChoiceStandardModule, 'function')
})

test('flow module store should expose max-version and archive helpers', async () => {
  const src = await import('node:fs/promises')
  const path = await import('node:path')
  const file = path.resolve(process.cwd(), 'stores/flowModules.ts')
  const content = await src.readFile(file, 'utf8')
  assert.ok(content.includes('getListeningChoiceMaxVersion(moduleId: string)'))
  assert.ok(content.includes('archiveListeningChoice(ref?: FlowModuleRef | null)'))
  assert.ok(content.includes('status: defaultStatus'))
  assert.ok(content.includes('canTransitionListeningChoiceStatus(ref: FlowModuleRef | null | undefined, nextStatus: FlowModuleStatus)'))
  assert.ok(content.includes('setListeningChoiceStatus(ref: FlowModuleRef | null | undefined, nextStatus: FlowModuleStatus)'))
  assert.ok(content.includes('canListeningChoiceStatusTransition'))
})

test('flow module store should support business display name + optional note fields', async () => {
  const src = await import('node:fs/promises')
  const path = await import('node:path')
  const file = path.resolve(process.cwd(), 'stores/flowModules.ts')
  const content = await src.readFile(file, 'utf8')
  assert.ok(content.includes("const DEFAULT_LISTENING_CHOICE_MODULE_NAME = '听后选择标准'"))
  assert.ok(content.includes('function normalizeListeningChoiceModuleName(src: any)'))
  assert.ok(content.includes('note: normalizeText(src.note)'))
  assert.ok(content.includes('name: src.name == null ? existing.name : src.name'))
  assert.ok(content.includes('note: src.note == null ? existing.note : src.note'))
})

test('standard flow module validator should enforce core loop steps', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')

  const ok = mod.validateListeningChoiceStandardModule(mod.DEFAULT_LISTENING_CHOICE_STANDARD_MODULE)
  assert.equal(ok.ok, true)
  assert.equal(ok.errors.length, 0)

  const missingAnswer = mod.validateListeningChoiceStandardModule({
    ...mod.DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description' },
      { kind: 'countdown', seconds: 3, label: '准备' },
      { kind: 'playAudio', audioSource: 'content' }
    ]
  })
  assert.equal(missingAnswer.ok, false)
  assert.ok(missingAnswer.errors.some(item => item.code === 'missing_answer_choice'))

  const missingContentAudio = mod.validateListeningChoiceStandardModule({
    ...mod.DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description' },
      { kind: 'countdown', seconds: 3, label: '准备' },
      { kind: 'answerChoice' }
    ]
  })
  assert.equal(missingContentAudio.ok, false)
  assert.ok(missingContentAudio.errors.some(item => item.code === 'missing_content_audio'))
})

test('standard flow module validator should return warnings for risky but valid shapes', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')

  const withoutCountdown = mod.validateListeningChoiceStandardModule({
    ...mod.DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description' },
      { kind: 'playAudio', audioSource: 'content' },
      { kind: 'answerChoice' }
    ]
  })
  assert.equal(withoutCountdown.ok, true)
  assert.ok(withoutCountdown.warnings.some(item => item.code === 'missing_group_countdown'))

  const promptToneWithoutUrl = mod.validateListeningChoiceStandardModule({
    ...mod.DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description' },
      { kind: 'countdown', seconds: 3, label: '准备' },
      { kind: 'promptTone', url: '' },
      { kind: 'playAudio', audioSource: 'content' },
      { kind: 'answerChoice' }
    ]
  })
  assert.equal(promptToneWithoutUrl.ok, true)
  assert.ok(promptToneWithoutUrl.warnings.some(item => item.code === 'prompt_tone_missing_url'))
})

test('standard flow materialization should match expected step shape', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const q = makeListeningChoiceQuestion({ introCountdownSeconds: 3, groupCount: 2, qsPerGroup: 2 })
  const genId = makeIdFactory('s')

  const steps = mod.materializeListeningChoiceStandardSteps(q, { generateId: genId, overrides: {} })
  assert.equal(steps.length, 9)
  assert.deepEqual(steps.map(s => s.kind), ['intro', 'playAudio', 'countdown', 'playAudio', 'answerChoice', 'playAudio', 'countdown', 'playAudio', 'answerChoice'])

  assert.equal(steps[0].autoNext, 'audioEnded')
  assert.equal(steps[0].showTitleDescription, true)
  assert.equal(steps[0].showDescription, true)
  assert.equal(steps[1].autoNext, 'audioEnded')
  assert.equal(steps[2].autoNext, 'countdownEnded')
  assert.equal(steps[3].autoNext, 'audioEnded')
  assert.equal(steps[4].autoNext, 'tapNext')

  assert.equal(steps[1].audioSource, 'description')
  assert.equal(steps[3].audioSource, 'content')
  assert.equal(steps[5].audioSource, 'description')
  assert.equal(steps[7].audioSource, 'content')

  assert.equal(steps[1].groupId, 'g1')
  assert.equal(steps[7].groupId, 'g2')
  assert.equal(steps[4].groupId, 'g1')
  assert.equal(steps[8].groupId, 'g2')
})

test('standard flow should omit intro countdown step when intro countdown is disabled in module', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const q = makeListeningChoiceQuestion({ introCountdownSeconds: 0, groupCount: 1, qsPerGroup: 1 })
  const module = {
    ...mod.DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
    introCountdownEnabled: false
  }
  const steps = mod.materializeListeningChoiceStandardSteps(q, { generateId: makeIdFactory('s'), overrides: {}, module })
  assert.deepEqual(steps.map(s => s.kind), ['intro', 'playAudio', 'countdown', 'playAudio', 'answerChoice'])
  assert.equal(steps[1].audioSource, 'description')
  assert.equal(steps[3].audioSource, 'content')
})

test('standard flow should use group template timing for countdown and answer stage', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const q = makeListeningChoiceQuestion({ groupCount: 1, qsPerGroup: 1, prepareSeconds: 8, answerSeconds: 90 })
  const steps = mod.materializeListeningChoiceStandardSteps(q, { generateId: makeIdFactory('s'), overrides: {} })
  assert.deepEqual(steps.map(s => s.kind), ['intro', 'playAudio', 'countdown', 'playAudio', 'answerChoice'])
  assert.equal(steps[2].seconds, 8)
  assert.equal(steps[4].autoNext, 'timeEnded')
})

test('standard flow override detection should return overrides for whitelisted param changes', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const q = makeListeningChoiceQuestion({ introCountdownSeconds: 3, groupCount: 2, qsPerGroup: 1 })
  const genId = makeIdFactory('s')
  const standard = mod.materializeListeningChoiceStandardSteps(q, { generateId: genId, overrides: {} })

  // Mutate a couple whitelisted params.
  const current = standard.map(s => ({ ...s }))
  current[0] = { ...current[0], showTitleDescription: false, showDescription: false } // intro
  current[2] = { ...current[2], seconds: 5, label: 'Ready' } // g1 countdown (seconds should be ignored; label kept)
  current[8] = { ...current[8], showGroupPrompt: false, showQuestionTitleDescription: false } // g2 answerChoice

  const result = mod.detectListeningChoiceStandardFlowOverrides(q, current)
  assert.equal(result.ok, true)
  assert.deepEqual(result.overrides, {
    intro: { showTitleDescription: false, showDescription: false },
    'g0.countdown': { label: 'Ready' },
    'g1.answerChoice': { showGroupPrompt: false, showQuestionTitleDescription: false }
  })
})

test('standard flow override detection should fail when playAudio source differs', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const q = makeListeningChoiceQuestion({ introCountdownSeconds: 3, groupCount: 1, qsPerGroup: 1 })
  const standard = mod.materializeListeningChoiceStandardSteps(q, { generateId: makeIdFactory('s'), overrides: {} })
  const current = standard.map(s => ({ ...s }))
  current[1] = { ...current[1], audioSource: 'content' } // expected description

  const result = mod.detectListeningChoiceStandardFlowOverrides(q, current)
  assert.equal(result.ok, false)
})

test('standard flow override detection should fail when structure differs', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const q = makeListeningChoiceQuestion({ introCountdownSeconds: 3, groupCount: 1, qsPerGroup: 1 })
  const current = [
    { id: '1', kind: 'intro', autoNext: 'audioEnded', showTitle: true },
    { id: '2', kind: 'groupPrompt', groupId: 'g1', autoNext: 'tapNext', showTitle: true }
  ]
  const result = mod.detectListeningChoiceStandardFlowOverrides(q, current)
  assert.equal(result.ok, false)
})

test('concrete -> template -> materialize roundtrip should map groupIndex/questionOrders correctly', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const q = makeListeningChoiceQuestion({ introCountdownSeconds: 3, groupCount: 2, qsPerGroup: 2 })
  const steps = [
    { id: 'a', kind: 'intro', autoNext: 'audioEnded', showTitle: true, showTitleDescription: false, showDescription: false },
    { id: 'b', kind: 'countdown', seconds: 3, label: '准备', autoNext: 'countdownEnded', showTitle: true },
    { id: 'b2', kind: 'playAudio', groupId: 'g2', audioSource: 'description', autoNext: 'audioEnded', showTitle: true },
    { id: 'b3', kind: 'promptTone', groupId: 'g2', url: '/static/audio/small_time.mp3', autoNext: 'audioEnded', showTitle: true },
    { id: 'c', kind: 'answerChoice', questionIds: ['q1', 'q3'], autoNext: 'tapNext', showTitle: true, showGroupPrompt: false }
  ]

  const tpl = mod.concreteListeningChoiceStepsToTemplate(q, steps)
  assert.deepEqual(tpl, [
    { kind: 'intro', showTitle: true, showTitleDescription: false, showDescription: false, autoNext: 'audioEnded' },
    { kind: 'countdown', seconds: 3, label: '准备', autoNext: 'countdownEnded', showTitle: true, context: { kind: 'intro' } },
    { kind: 'playAudio', groupIndex: 1, audioSource: 'description', autoNext: 'audioEnded', showTitle: true },
    { kind: 'promptTone', groupIndex: 1, url: '/static/audio/small_time.mp3', autoNext: 'audioEnded', showTitle: true },
    { kind: 'answerChoice', questionOrders: [1, 3], autoNext: 'tapNext', showTitle: true, showGroupPrompt: false }
  ])

  const materialized = mod.materializeListeningChoiceTemplateSteps(q, tpl, { generateId: makeIdFactory('m') })
  assert.equal(materialized[0].showTitleDescription, false)
  assert.equal(materialized[0].showDescription, false)
  assert.equal(materialized[2].kind, 'playAudio')
  assert.equal(materialized[2].audioSource, 'description')
  assert.equal(materialized[2].groupId, 'g2')
  assert.equal(materialized[3].kind, 'promptTone')
  assert.equal(materialized[3].groupId, 'g2')
  assert.equal(materialized[4].kind, 'answerChoice')
  assert.deepEqual(materialized[4].questionIds, ['q1', 'q3'])
})

test('hashFlowTemplate should be stable regardless of object key insertion order', async () => {
  const mod = await import('../flows/listeningChoiceFlowModules.ts')
  const a = [{ kind: 'countdown', seconds: 3, label: '准备' }]
  const b = [{ label: '准备', kind: 'countdown', seconds: 3 }]
  assert.equal(mod.hashFlowTemplate(a), mod.hashFlowTemplate(b))
  assert.notEqual(mod.hashFlowTemplate([{ kind: 'countdown', seconds: 4, label: '准备' }]), mod.hashFlowTemplate(a))
})
