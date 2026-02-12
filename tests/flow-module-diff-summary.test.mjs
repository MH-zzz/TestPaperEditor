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

test('buildModuleDiffSummary should report step/param/impact changes', async () => {
  const mod = await import('../domain/flow-module/usecases/buildModuleDiffSummary.ts')

  const previousModule = {
    id: 'listening_choice.standard',
    version: 1,
    introShowTitle: true,
    introShowTitleDescription: true,
    introShowDescription: true,
    introCountdownEnabled: false,
    introCountdownSeconds: 0,
    introCountdownLabel: '',
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description' },
      { kind: 'countdown', seconds: 3, label: '准备' },
      { kind: 'playAudio', audioSource: 'content' },
      { kind: 'answerChoice', showGroupPrompt: true }
    ]
  }

  const nextModule = {
    ...previousModule,
    introCountdownEnabled: true,
    introCountdownSeconds: 5,
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description' },
      { kind: 'promptTone', url: '/beep.mp3' },
      { kind: 'countdown', seconds: 2, label: '准备' },
      { kind: 'playAudio', audioSource: 'content' },
      { kind: 'answerChoice', showGroupPrompt: false }
    ]
  }

  const summary = mod.buildModuleDiffSummary({
    previousModule,
    nextModule,
    impactRules: [
      { id: 'rule_a', enabled: true, note: '广东中考' },
      { id: 'rule_b', enabled: false, note: '' }
    ]
  })

  assert.ok(summary.stepChanges.length > 0)
  assert.ok(summary.paramChanges.length > 0)
  assert.ok(summary.impactRules[0].includes('影响规则'))
  assert.ok(mod.formatModuleDiffSummary(summary).includes('步骤变化'))
  assert.ok(mod.formatModuleDiffSummary(summary).includes('参数变化'))
})

test('flow center should use module diff summary in save/publish confirm and publish logs', async () => {
  const src = await readFile('components/views/FlowModulesManager.vue')

  assert.ok(src.includes("from '/domain/flow-module/usecases/buildModuleDiffSummary'"))
  assert.ok(src.includes('buildModuleDiffSummary({'))
  assert.ok(src.includes('formatModuleDiffSummary(diffSummary)'))
  assert.ok(src.includes('FLOW_MODULE_PUBLISH_LOG_KEY'))
  assert.ok(src.includes('appendFlowModulePublishLog('))
  assert.ok(src.includes('showPublishLogs'))
  assert.ok(src.includes('发布日志'))
})
