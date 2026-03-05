import test from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
import { deepClone } from '../utils/deepClone.ts'

test('deepClone should clone reactive arrays without DataCloneError', () => {
  const source = reactive({
    id: 'module_1',
    perGroupSteps: [
      { kind: 'playAudio', autoNext: 'audioEnded', groupId: 'group_1' },
      { kind: 'answerChoice', autoNext: 'timeEnded', groupId: 'group_1' }
    ]
  })

  const cloned = deepClone(source)
  assert.equal(Array.isArray(cloned.perGroupSteps), true)
  assert.equal(cloned.perGroupSteps.length, 2)
  assert.equal(cloned.perGroupSteps[0].kind, 'playAudio')
  assert.notEqual(cloned, source)
})

