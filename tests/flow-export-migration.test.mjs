import test from 'node:test'
import assert from 'node:assert/strict'

test('flow export reader should reject non-v2 payloads', async () => {
  const mod = await import('../infra/repository/flowExportPackage.ts')
  const payload = {
    exportedAt: '2026-03-04T00:00:00.000Z',
    schemaVersion: 1,
    modules: [{ id: 'module.v1' }],
    profiles: [{ id: 'profile.v1' }],
    logs: [{ id: 'log.v1' }]
  }

  const next = mod.readFlowExportPackageV2(payload)
  assert.equal(next, null)
})

test('flow export reader should preserve canonical v2 payload', async () => {
  const mod = await import('../infra/repository/flowExportPackage.ts')
  const payload = {
    exportedAt: '2026-03-04T00:00:00.000Z',
    schemaVersion: 2,
    exportCapabilities: {
      branchNodeMvp: true,
      loopNodeMvp: true
    },
    listeningChoiceModules: [{ id: 'module.v2' }],
    flowProfiles: [{ id: 'profile.v2' }],
    publishLogs: [{ id: 'log.v2' }]
  }

  const next = mod.readFlowExportPackageV2(payload)
  assert.ok(next)
  assert.equal(next.schemaVersion, 2)
  assert.equal(next.listeningChoiceModules.length, 1)
  assert.equal(next.flowProfiles.length, 1)
  assert.equal(next.publishLogs.length, 1)
  assert.ok(next.exportCapabilities.branchNodeMvp)
  assert.ok(next.exportCapabilities.loopNodeMvp)
})

test('flow export builder should emit schema v2 + capability markers', async () => {
  const mod = await import('../infra/repository/flowExportPackage.ts')
  const pack = mod.buildFlowExportPackageV2({
    exportedAt: '2026-03-04T00:00:00.000Z',
    listeningChoiceModules: [{ id: 'module.new' }],
    flowProfiles: [{ id: 'profile.new' }],
    publishLogs: [{ id: 'log.new' }]
  })

  assert.equal(pack.schemaVersion, 2)
  assert.equal(pack.exportedAt, '2026-03-04T00:00:00.000Z')
  assert.ok(pack.exportCapabilities.branchNodeMvp)
  assert.ok(pack.exportCapabilities.loopNodeMvp)
  assert.equal('migrationReport' in pack.exportCapabilities, false)
  assert.equal('migrationReport' in pack, false)
})

test('flow export reader should reject malformed v2 payload item ids', async () => {
  const mod = await import('../infra/repository/flowExportPackage.ts')
  const payload = {
    exportedAt: '2026-03-04T00:00:00.000Z',
    schemaVersion: 2,
    exportCapabilities: {
      branchNodeMvp: true,
      loopNodeMvp: true
    },
    listeningChoiceModules: [{ id: 'module.ok' }, { id: '   ' }],
    flowProfiles: [{ id: 'profile.ok' }],
    publishLogs: [{ id: 'log.ok' }]
  }

  const next = mod.readFlowExportPackageV2(payload)
  assert.equal(next, null)
})
