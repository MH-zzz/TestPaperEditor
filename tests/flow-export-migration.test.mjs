import test from 'node:test'
import assert from 'node:assert/strict'

test('flow export migration should upgrade legacy v1 payload to v2 fields with report', async () => {
  const mod = await import('../infra/repository/flowExportPackage.ts')
  const payload = {
    exportedAt: '2026-03-04T00:00:00.000Z',
    schemaVersion: 1,
    modules: [{ id: 'module.v1' }],
    profiles: [{ id: 'profile.v1' }],
    logs: [{ id: 'log.v1' }]
  }

  const next = mod.migrateFlowExportPayloadToV2(payload)
  assert.equal(next.schemaVersion, 2)
  assert.equal(next.listeningChoiceModules.length, 1)
  assert.equal(next.flowProfiles.length, 1)
  assert.equal(next.publishLogs.length, 1)
  assert.ok(next.exportCapabilities.branchNodeMvp)
  assert.ok(next.exportCapabilities.loopNodeMvp)
  assert.equal(next.migrationReport.fromVersion, 1)
  assert.equal(next.migrationReport.toVersion, 2)
  assert.equal(next.migrationReport.migrated, true)
  assert.ok(next.migrationReport.entries.some((item) => item.path === 'modules -> listeningChoiceModules'))
  assert.ok(next.migrationReport.entries.some((item) => item.path === 'profiles -> flowProfiles'))
  assert.ok(next.migrationReport.entries.some((item) => item.path === 'logs -> publishLogs'))
})

test('flow export migration should preserve canonical v2 payload with stable report shape', async () => {
  const mod = await import('../infra/repository/flowExportPackage.ts')
  const payload = {
    exportedAt: '2026-03-04T00:00:00.000Z',
    schemaVersion: 2,
    exportCapabilities: {
      branchNodeMvp: true,
      loopNodeMvp: true,
      migrationReport: true
    },
    listeningChoiceModules: [{ id: 'module.v2' }],
    flowProfiles: [{ id: 'profile.v2' }],
    publishLogs: [{ id: 'log.v2' }]
  }

  const next = mod.migrateFlowExportPayloadToV2(payload)
  assert.equal(next.schemaVersion, 2)
  assert.equal(next.listeningChoiceModules.length, 1)
  assert.equal(next.flowProfiles.length, 1)
  assert.equal(next.publishLogs.length, 1)
  assert.equal(next.migrationReport.fromVersion, 2)
  assert.equal(next.migrationReport.toVersion, 2)
  assert.equal(next.migrationReport.migrated, false)
  assert.equal(next.migrationReport.entries.length, 0)
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
  assert.ok(pack.exportCapabilities.migrationReport)
  assert.equal(pack.migrationReport.fromVersion, 2)
  assert.equal(pack.migrationReport.toVersion, 2)
  assert.equal(pack.migrationReport.migrated, false)
})
