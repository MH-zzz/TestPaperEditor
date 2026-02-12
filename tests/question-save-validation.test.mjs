import test from 'node:test'
import assert from 'node:assert/strict'

const storage = new Map()

globalThis.uni = {
  getStorageSync(key) {
    return storage.has(key) ? storage.get(key) : ''
  },
  setStorageSync(key, value) {
    storage.set(key, value)
  },
  showToast() {},
  showModal() {},
  $emit() {},
  $on() {},
  $off() {}
}

function createValidListeningChoiceQuestion() {
  return {
    id: 'q_validation_ok',
    type: 'listening_choice',
    optionStyle: 'ABCD',
    content: {
      intro: {
        title: '听后选择',
        text: { type: 'richtext', content: [{ type: 'text', text: '说明' }] },
        audio: { url: '', playCount: 1 }
      },
      groups: [
        {
          id: 'g1',
          title: '题组1',
          prepareSeconds: 3,
          answerSeconds: 30,
          descriptionAudio: { url: '', playCount: 1 },
          audio: { url: '', playCount: 2 },
          subQuestions: [
            {
              id: 'sq1',
              order: 1,
              stem: { type: 'richtext', content: [{ type: 'text', text: '题干1' }] },
              options: [
                { key: 'A', content: { type: 'richtext', content: [{ type: 'text', text: 'A选项' }] } },
                { key: 'B', content: { type: 'richtext', content: [{ type: 'text', text: 'B选项' }] } }
              ],
              answerMode: 'single',
              answer: ['A']
            }
          ]
        }
      ]
    },
    flow: {
      version: 1,
      mode: 'semi-auto',
      steps: []
    },
    metadata: {
      tags: []
    }
  }
}

test('validateQuestionBeforeSave should return field-level errors for invalid listening-choice question', async () => {
  const { validateQuestionBeforeSave } = await import('../domain/question/validators/listeningChoiceValidator.ts')

  const invalid = createValidListeningChoiceQuestion()
  invalid.content.intro.title = ''
  invalid.content.groups[0].subQuestions[0].stem = { type: 'richtext', content: [] }
  invalid.content.groups[0].subQuestions[0].options = [
    { key: 'A', content: { type: 'richtext', content: [{ type: 'text', text: 'A选项' }] } }
  ]
  invalid.content.groups[0].subQuestions[0].answer = ['B']

  const result = validateQuestionBeforeSave(invalid)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some(e => e.path === 'content.intro.title'))
  assert.ok(result.errors.some(e => e.path === 'content.groups[0].subQuestions[0].stem'))
  assert.ok(result.errors.some(e => e.path === 'content.groups[0].subQuestions[0].options'))
  assert.ok(result.errors.some(e => e.path === 'content.groups[0].subQuestions[0].answer'))
})

test('saveQuestionDraft should validate, enrich metadata, and persist both draft and recent list', async () => {
  const { saveQuestionDraft } = await import('../domain/question/usecases/saveQuestionDraft.ts')

  const question = createValidListeningChoiceQuestion()
  const result = saveQuestionDraft(question, { defaultTags: ['tag_default'] })
  assert.equal(result.ok, true)
  assert.ok(result.question)

  assert.deepEqual(result.question.metadata.tags, ['tag_default'])
  assert.ok(typeof result.question.metadata.updatedAt === 'string' && result.question.metadata.updatedAt.length > 0)
})

test('questionDraft store should distinguish updateDraft and saveToRecent semantics', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(new URL('../stores/questionDraft.ts', import.meta.url), 'utf8')

  assert.ok(src.includes('dirty: false'))
  assert.ok(src.includes('updateDraft(nextQuestion: Question, options: { persistDraft?: boolean } = {})'))
  assert.ok(src.includes('const persistDraft = options.persistDraft === true'))
  assert.ok(src.includes('markDirty: true'))
  assert.ok(src.includes('this.state.dirty = false'))
  assert.ok(src.includes('this.state.originalQuestion = clone(current)'))
})

test('editor workspace should persist to recent list only after saveQuestionDraft passes', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(new URL('../components/views/EditorWorkspace.vue', import.meta.url), 'utf8')

  assert.ok(src.includes('const result = saveQuestionDraft(questionData.value'))
  assert.ok(src.includes('if (!result.ok) {'))
  assert.ok(src.includes('questionDraft.saveToRecent(50)'))
})
