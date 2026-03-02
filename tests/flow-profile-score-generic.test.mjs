import test from 'node:test'
import assert from 'node:assert/strict'

function buildProfile({ id, region, priority = 0, moduleId }) {
  return {
    id,
    questionType: 'listening_choice',
    region,
    scene: undefined,
    grade: undefined,
    module: { id: moduleId || id, version: 1 },
    priority,
    enabled: true,
    note: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

test('scoreProfiles should prefer exact region over 通用 fallback and default', async () => {
  const { scoreProfiles } = await import('../domain/flow-profile/usecases/scoreProfiles.ts')

  const profiles = [
    buildProfile({ id: 'default', region: undefined, priority: 0, moduleId: 'std' }),
    buildProfile({ id: 'generic', region: '通用', priority: 10, moduleId: 'generic_mod' }),
    buildProfile({ id: 'beijing', region: '北京', priority: 10, moduleId: 'bj_mod' })
  ]

  const result = scoreProfiles(profiles, { region: '北京' }, { topN: 3 })
  assert.equal(result.bestCandidate?.profile?.id, 'beijing')
})

test('scoreProfiles should fallback to 通用 when specific region does not exist', async () => {
  const { scoreProfiles } = await import('../domain/flow-profile/usecases/scoreProfiles.ts')

  const profiles = [
    buildProfile({ id: 'default', region: undefined, priority: 0, moduleId: 'std' }),
    buildProfile({ id: 'generic', region: '通用', priority: 10, moduleId: 'generic_mod' }),
    buildProfile({ id: 'beijing', region: '北京', priority: 10, moduleId: 'bj_mod' })
  ]

  const result = scoreProfiles(profiles, { region: '成都' }, { topN: 3 })
  assert.equal(result.bestCandidate?.profile?.id, 'generic')
})

test('scoreProfiles should keep default route when region is missing', async () => {
  const { scoreProfiles } = await import('../domain/flow-profile/usecases/scoreProfiles.ts')

  const profiles = [
    buildProfile({ id: 'default', region: undefined, priority: 0, moduleId: 'std' }),
    buildProfile({ id: 'generic', region: '通用', priority: 10, moduleId: 'generic_mod' }),
    buildProfile({ id: 'beijing', region: '北京', priority: 10, moduleId: 'bj_mod' })
  ]

  const result = scoreProfiles(profiles, {}, { topN: 3 })
  assert.equal(result.bestCandidate?.profile?.id, 'default')
})
