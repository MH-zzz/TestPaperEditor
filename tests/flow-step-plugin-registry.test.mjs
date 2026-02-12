import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

async function readFile(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), 'utf8')
}

test('flow step plugin registry should enforce protocol shape and duplicate protection', async () => {
  const mod = await import('../engine/flow/plugins/registry.ts')

  const registry = mod.createFlowStepPluginRegistry('test')
  registry.register({
    kind: 'intro',
    schema: { requiredFields: ['kind'] },
    renderer: { view: 'intro' }
  })

  assert.equal(typeof registry.get('intro'), 'object')

  assert.throws(() => {
    registry.register({
      kind: 'intro',
      schema: { requiredFields: ['kind'] },
      renderer: { view: 'intro' }
    })
  }, /duplicate plugin kind/)
})

test('listening-choice plugin registry should register all core step kinds', async () => {
  const mod = await import('../engine/flow/plugins/listening-choice/index.ts')

  const list = mod.listListeningChoiceStepPlugins()
  const kinds = list.map(item => item.kind)

  assert.ok(kinds.includes('intro'))
  assert.ok(kinds.includes('groupPrompt'))
  assert.ok(kinds.includes('countdown'))
  assert.ok(kinds.includes('playAudio'))
  assert.ok(kinds.includes('promptTone'))
  assert.ok(kinds.includes('answerChoice'))
  assert.ok(kinds.includes('finish'))

  const unknown = mod.getListeningChoiceStepPlugin('unknown-kind')
  assert.equal(unknown.renderer.view, 'unsupported')
})

test('listening-choice renderer step behavior helper should consume engine plugin registry', async () => {
  const src = await readFile('components/renderer/listening-choice/stepPlugins.ts')

  assert.ok(src.includes("from '/engine/flow/plugins/listening-choice/index.ts'"))
  assert.ok(src.includes('listListeningChoiceStepPlugins()'))
  assert.ok(src.includes('STEP_BEHAVIOR_PLUGINS'))
  assert.ok(src.includes('getListeningChoiceStepPlugin(kind)'))
  assert.ok(src.includes('resolveListeningChoiceStepRenderView'))
})

test('listening-choice runtime should delegate step auto transitions to plugin reducers', async () => {
  const src = await readFile('engine/flow/listening-choice/runtime.ts')
  assert.ok(src.includes('reduceFlowRuntimeStateWithStepReducer'))
  assert.ok(src.includes('getListeningChoiceStepPlugin'))
  assert.ok(src.includes('plugin.runtimeReducer'))
})
