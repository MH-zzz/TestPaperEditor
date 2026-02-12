import test from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'

function createMinimalQuestion() {
  return {
    id: 'q_visual_history',
    type: 'listening_choice',
    optionStyle: 'single',
    content: {
      intro: {
        title: '',
        titleDescription: '',
        description: ''
      },
      groups: [
        {
          id: 'group_1',
          title: '',
          description: '',
          prepareSeconds: 3,
          answerSeconds: 5,
          descriptionAudio: { url: '/a.mp3' },
          audio: { url: '/b.mp3' },
          subQuestions: []
        }
      ]
    },
    flow: {
      version: 1,
      steps: [
        {
          id: 'step_1',
          kind: 'intro',
          autoNext: 'tapNext'
        }
      ]
    }
  }
}

test('editable flow graph should support undo/redo around append and patch', async () => {
  const mod = await import('../components/views/flow-modules/useEditableFlowGraph.ts')
  const questionRef = ref(createMinimalQuestion())
  const editor = mod.useEditableFlowGraph(questionRef)

  const baseNodeCount = editor.graph.value.nodes.length
  assert.equal(editor.canUndo.value, false)
  assert.equal(editor.canRedo.value, false)

  editor.appendNode('playAudio')
  assert.equal(editor.graph.value.nodes.length, baseNodeCount + 1)
  assert.equal(editor.canUndo.value, true)

  editor.patchSelectedNode({ groupId: 'group_1' })
  const selectedAfterPatch = editor.selectedNode.value
  assert.equal(String(selectedAfterPatch?.data.groupId || ''), 'group_1')

  editor.undo()
  assert.equal(String(editor.selectedNode.value?.data.groupId || ''), '')
  assert.equal(editor.canRedo.value, true)

  editor.undo()
  assert.equal(editor.graph.value.nodes.length, baseNodeCount)

  editor.redo()
  assert.equal(editor.graph.value.nodes.length, baseNodeCount + 1)

  editor.redo()
  assert.equal(String(editor.selectedNode.value?.data.groupId || ''), 'group_1')
})

test('editable flow graph should reorder and recover by undo/redo', async () => {
  const mod = await import('../components/views/flow-modules/useEditableFlowGraph.ts')
  const questionRef = ref(createMinimalQuestion())
  const editor = mod.useEditableFlowGraph(questionRef)

  editor.appendNode('playAudio')
  editor.appendNode('answerChoice')

  const idsBefore = editor.graph.value.nodes.map((item) => item.id)
  const sourceId = idsBefore[2]
  const targetId = idsBefore[0]

  editor.reorderNodes(sourceId, targetId, 'before')
  const idsAfter = editor.graph.value.nodes.map((item) => item.id)
  assert.equal(idsAfter[0], sourceId)

  editor.undo()
  const idsUndo = editor.graph.value.nodes.map((item) => item.id)
  assert.deepEqual(idsUndo, idsBefore)

  editor.redo()
  const idsRedo = editor.graph.value.nodes.map((item) => item.id)
  assert.equal(idsRedo[0], sourceId)
})
