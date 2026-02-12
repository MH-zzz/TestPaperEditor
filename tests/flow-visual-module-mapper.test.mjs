import test from 'node:test'
import assert from 'node:assert/strict'

function createBaseModule() {
  return {
    version: 1,
    id: 'listening_choice.standard.v1',
    introShowTitle: true,
    introShowTitleDescription: true,
    introShowDescription: true,
    introCountdownEnabled: false,
    introCountdownShowTitle: true,
    introCountdownSeconds: 3,
    introCountdownLabel: '准备',
    perGroupSteps: []
  }
}

test('visual mapper should map linear steps to module draft and infer intro countdown', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildListeningChoiceModuleFromLinearSteps.ts')
  const result = mod.buildListeningChoiceModuleFromLinearSteps([
    { id: 's1', kind: 'intro', autoNext: 'tapNext' },
    { id: 's2', kind: 'countdown', autoNext: 'countdownEnded' },
    { id: 's3', kind: 'playAudio', autoNext: 'audioEnded', groupId: 'group_1' },
    { id: 's4', kind: 'countdown', autoNext: 'countdownEnded', groupId: 'group_1' },
    { id: 's5', kind: 'playAudio', autoNext: 'audioEnded', groupId: 'group_1' },
    { id: 's6', kind: 'answerChoice', autoNext: 'timeEnded', groupId: 'group_1' }
  ], {
    baseModule: createBaseModule(),
    defaultCountdownSeconds: 5,
    defaultCountdownLabel: '准备'
  })

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.module.introCountdownEnabled, true)
  assert.ok(result.module.perGroupSteps.length >= 4)

  const audios = result.module.perGroupSteps.filter((item) => item.kind === 'playAudio')
  assert.ok(audios.length >= 2)
  assert.equal(audios[0].audioSource, 'description')
  assert.equal(audios[1].audioSource, 'content')
})

test('visual mapper should auto-insert required core per-group steps when missing', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildListeningChoiceModuleFromLinearSteps.ts')
  const result = mod.buildListeningChoiceModuleFromLinearSteps([
    { id: 's1', kind: 'intro', autoNext: 'tapNext' },
    { id: 's2', kind: 'countdown', autoNext: 'countdownEnded' }
  ], {
    baseModule: createBaseModule(),
    defaultCountdownSeconds: 4,
    defaultCountdownLabel: '准备'
  })

  assert.equal(result.ok, true)
  const kinds = result.module.perGroupSteps.map((item) => item.kind)
  assert.ok(kinds.includes('playAudio'))
  assert.ok(kinds.includes('answerChoice'))
  assert.ok(result.warnings.some((item) => item.code === 'auto_insert_description_audio'))
  assert.ok(result.warnings.some((item) => item.code === 'auto_insert_content_audio'))
  assert.ok(result.warnings.some((item) => item.code === 'auto_insert_answer_choice'))
})

test('visual mapper should close intro fields when intro step is missing', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildListeningChoiceModuleFromLinearSteps.ts')
  const result = mod.buildListeningChoiceModuleFromLinearSteps([
    { id: 's1', kind: 'playAudio', autoNext: 'audioEnded' },
    { id: 's2', kind: 'answerChoice', autoNext: 'timeEnded' }
  ], {
    baseModule: createBaseModule(),
    defaultCountdownSeconds: 3,
    defaultCountdownLabel: '准备'
  })

  assert.equal(result.ok, true)
  assert.equal(result.module.introShowTitle, false)
  assert.equal(result.module.introShowTitleDescription, false)
  assert.equal(result.module.introShowDescription, false)
  assert.ok(result.warnings.some((item) => item.code === 'intro_missing'))
})

test('visual mapper should return error when compiled steps are empty', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildListeningChoiceModuleFromLinearSteps.ts')
  const result = mod.buildListeningChoiceModuleFromLinearSteps([], {
    baseModule: createBaseModule()
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'compiled_steps_empty'))
})
