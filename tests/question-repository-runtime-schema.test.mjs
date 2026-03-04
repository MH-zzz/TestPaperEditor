import test from 'node:test'
import assert from 'node:assert/strict'

const CURRENT_QUESTION_KEY = 'currentQuestion'
const RECENT_QUESTIONS_KEY = 'recentQuestions'

function mockUniStorage(seed = {}) {
  const storage = new Map(Object.entries(seed))
  globalThis.uni = {
    getStorageSync(key) {
      return storage.has(key) ? storage.get(key) : ''
    },
    setStorageSync(key, value) {
      storage.set(key, value)
    }
  }
  return storage
}

test('question repository should reject invalid current question snapshot by schema', async () => {
  mockUniStorage({
    [CURRENT_QUESTION_KEY]: JSON.stringify({
      id: 'q_bad',
      type: 'unknown_type'
    })
  })

  const repo = await import('../infra/repository/questionRepository.ts')
  const bad = repo.loadCurrentQuestionSnapshot()
  assert.equal(bad, null)

  mockUniStorage({
    [CURRENT_QUESTION_KEY]: JSON.stringify({
      id: 'q_ok',
      type: 'listening_choice',
      metadata: { tags: [] }
    })
  })
  const good = repo.loadCurrentQuestionSnapshot()
  assert.ok(good)
  assert.equal(good.id, 'q_ok')
  assert.equal(good.type, 'listening_choice')
})

test('question repository should filter invalid recent questions by schema', async () => {
  mockUniStorage({
    [RECENT_QUESTIONS_KEY]: JSON.stringify([
      { id: 'q1', type: 'listening_choice' },
      { id: '   ', type: 'listening_choice' },
      { id: 'q3', type: 'unknown_type' },
      { id: 'q4', type: 'speaking_hear_answer' }
    ])
  })

  const repo = await import('../infra/repository/questionRepository.ts')
  const list = repo.loadRecentQuestions()
  assert.equal(list.length, 2)
  assert.deepEqual(list.map(item => item.id), ['q1', 'q4'])
})
