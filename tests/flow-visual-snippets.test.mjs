import test from 'node:test'
import assert from 'node:assert/strict'

test('flow snippet template hash should be stable for equivalent payloads', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildFlowSnippetTemplate.ts')

  const hashA = mod.hashFlowSnippetTemplateSteps([
    { kind: 'playAudio', autoNext: 'audioEnded', groupBinding: 'inherit' },
    { kind: 'answerChoice', autoNext: 'timeEnded', groupBinding: 'inherit' }
  ])
  const hashB = mod.hashFlowSnippetTemplateSteps([
    { autoNext: 'audioEnded', groupBinding: 'inherit', kind: 'playAudio' },
    { groupBinding: 'inherit', kind: 'answerChoice', autoNext: 'timeEnded' }
  ])

  assert.equal(hashA, hashB)
})

test('flow snippet template hash should change when steps differ', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildFlowSnippetTemplate.ts')

  const hashA = mod.hashFlowSnippetTemplateSteps([
    { kind: 'playAudio', autoNext: 'audioEnded', groupBinding: 'inherit' },
    { kind: 'answerChoice', autoNext: 'timeEnded', groupBinding: 'inherit' }
  ])
  const hashB = mod.hashFlowSnippetTemplateSteps([
    { kind: 'playAudio', autoNext: 'audioEnded', groupBinding: 'inherit' },
    { kind: 'countdown', autoNext: 'countdownEnded', groupBinding: 'inherit' },
    { kind: 'answerChoice', autoNext: 'timeEnded', groupBinding: 'inherit' }
  ])

  assert.notEqual(hashA, hashB)
})

test('flow snippet template revision should increment version and keep base id', async () => {
  const mod = await import('../domain/flow-visual/usecases/buildFlowSnippetTemplate.ts')

  const base = mod.createFlowSnippetTemplateRevision({
    name: '听后回答录音环路',
    steps: [
      { kind: 'recordGuide', autoNext: 'audioEnded', groupBinding: 'inherit' },
      { kind: 'promptTone', autoNext: 'audioEnded', groupBinding: 'inherit' },
      { kind: 'answerChoice', autoNext: 'timeEnded', groupBinding: 'inherit' }
    ]
  })

  const next = mod.createFlowSnippetTemplateRevision({
    previous: base,
    name: '听后回答录音环路（改）',
    steps: [
      { kind: 'recordGuide', autoNext: 'audioEnded', groupBinding: 'inherit' },
      { kind: 'answerChoice', autoNext: 'timeEnded', groupBinding: 'inherit' }
    ]
  })

  assert.equal(base.version, 1)
  assert.equal(next.version, 2)
  assert.equal(next.baseId, base.baseId)
  assert.notEqual(next.hash, base.hash)
})
