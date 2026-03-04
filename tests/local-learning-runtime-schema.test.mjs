import test from 'node:test'
import assert from 'node:assert/strict'

function mockUniRequestWithPayload(payload) {
  globalThis.uni = {
    request({ success }) {
      success({
        statusCode: 200,
        data: payload
      })
    }
  }
}

test('local learning repository should throw when questions payload violates schema', async () => {
  mockUniRequestWithPayload([
    { id: 'q_ok', type: 'listening_choice' },
    { id: '   ', type: 'listening_choice' }
  ])

  const repo = await import('../infra/repository/localLearningRepository.ts')
  await assert.rejects(
    () => repo.loadLocalLearningQuestions(),
    /本地学习题目数据不合法/
  )
})

test('local learning repository should throw when flows payload violates schema', async () => {
  mockUniRequestWithPayload({
    schemaVersion: 2,
    listeningChoiceModules: [{ id: 'module.ok' }, { id: '' }],
    flowProfiles: [{ id: 'profile.ok' }],
    publishLogs: [{ id: 'log.ok' }]
  })

  const repo = await import('../infra/repository/localLearningRepository.ts')
  await assert.rejects(
    () => repo.loadLocalLearningFlows(),
    /本地学习流程包数据不合法/
  )
})

test('local learning repository should pass with valid strict payloads', async () => {
  const repo = await import('../infra/repository/localLearningRepository.ts')

  mockUniRequestWithPayload([
    { id: 'q1', type: 'listening_choice', metadata: { tags: [] } },
    { id: 'q2', type: 'speaking_hear_answer' }
  ])
  const questions = await repo.loadLocalLearningQuestions()
  assert.equal(questions.length, 2)

  mockUniRequestWithPayload({
    schemaVersion: 2,
    exportedAt: '2026-03-04T00:00:00.000Z',
    exportCapabilities: {
      branchNodeMvp: true,
      loopNodeMvp: true
    },
    listeningChoiceModules: [{ id: 'module.v2' }],
    flowProfiles: [{ id: 'profile.v2' }],
    publishLogs: [{ id: 'log.v2' }]
  })
  const flowPack = await repo.loadLocalLearningFlows()
  assert.equal(flowPack.schemaVersion, 2)
})
