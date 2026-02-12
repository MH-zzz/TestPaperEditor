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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('persistence scheduler should debounce repeated writes', async () => {
  const mod = await import('../stores/persistence.ts')
  let writes = 0
  const scheduler = mod.createPersistenceScheduler(() => {
    writes += 1
  }, 20)

  scheduler.schedule()
  scheduler.schedule()
  scheduler.schedule()
  await wait(50)
  assert.equal(writes, 1)

  scheduler.schedule()
  scheduler.flush()
  assert.equal(writes, 2)
})

test('flow module store should keep status transitions behind status API', async () => {
  const src = await readFile('stores/flowModules.ts')
  assert.ok(src.includes('status: defaultStatus'))
  assert.ok(src.includes('Status transitions must go through setListeningChoiceStatus.'))
  assert.ok(src.includes('setListeningChoiceStatus(ref: FlowModuleRef | null | undefined, nextStatus: FlowModuleStatus)'))
})

test('flow profile store compatibility APIs should route through diagnostics-safe methods', async () => {
  const src = await readFile('stores/flowProfiles.ts')
  assert.ok(src.includes('return this.upsertWithDiagnostics(profileInput)'))
  assert.ok(src.includes('return this.removeWithDiagnostics(id).ok'))
})

test('flow-related stores should use scheduler persistence instead of deep watch auto-save', async () => {
  const files = [
    'stores/flowModules.ts',
    'stores/flowProfiles.ts',
    'stores/contentTemplates.ts',
    'stores/flowLibrary.ts',
    'stores/standardFlows.ts'
  ]

  for (const file of files) {
    const src = await readFile(file)
    assert.ok(src.includes('createPersistenceScheduler'), `${file} should use createPersistenceScheduler`)
    assert.ok(!src.includes('{ deep: true }'), `${file} should not use deep watch auto-save`)
  }
})
