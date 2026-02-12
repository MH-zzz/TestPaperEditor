import test from 'node:test'
import assert from 'node:assert/strict'

function createModule(overrides = {}) {
  return {
    kind: 'listening_choice',
    id: 'listening_choice.standard.v1',
    version: 1,
    name: '听后选择标准',
    status: 'draft',
    perGroupSteps: [
      { kind: 'playAudio', audioSource: 'description', showTitle: true },
      { kind: 'countdown', seconds: 3, label: '准备', showTitle: true },
      { kind: 'playAudio', audioSource: 'content', showTitle: true },
      { kind: 'answerChoice', showTitle: true }
    ],
    ...overrides
  }
}

function createTemplate(overrides = {}) {
  return {
    content: {
      groups: [
        {
          id: 'g1',
          prepareSeconds: 3,
          descriptionAudio: { url: '' },
          audio: { url: '' },
          subQuestions: [{ id: 'q1' }]
        }
      ]
    },
    ...overrides
  }
}

function createProfile(overrides = {}) {
  return {
    id: 'profile.default',
    questionType: 'listening_choice',
    module: { id: 'listening_choice.standard.v1', version: 1 },
    enabled: true,
    priority: 0,
    ...overrides
  }
}

test('cross-check validator should reject empty template groups', async () => {
  const mod = await import('../domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  const result = mod.validateListeningChoiceModuleCommitCrossChecks({
    mode: 'save',
    template: createTemplate({ content: { groups: [] } }),
    nextModule: createModule(),
    flowProfiles: [createProfile()],
    moduleCatalog: []
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'template_groups_empty'))
})

test('cross-check validator should require prepareSeconds when module includes countdown step', async () => {
  const mod = await import('../domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  const result = mod.validateListeningChoiceModuleCommitCrossChecks({
    mode: 'save',
    template: createTemplate({
      content: {
        groups: [{ id: 'g1', descriptionAudio: { url: '' }, audio: { url: '' }, subQuestions: [{ id: 'q1' }] }]
      }
    }),
    nextModule: createModule(),
    flowProfiles: [createProfile()],
    moduleCatalog: []
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'group_prepare_seconds_missing'))
})

test('cross-check validator should require descriptionAudio/audio when module uses both playAudio sources', async () => {
  const mod = await import('../domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  const result = mod.validateListeningChoiceModuleCommitCrossChecks({
    mode: 'save',
    template: createTemplate({
      content: {
        groups: [{ id: 'g1', prepareSeconds: 3, subQuestions: [{ id: 'q1' }] }]
      }
    }),
    nextModule: createModule(),
    flowProfiles: [createProfile()],
    moduleCatalog: []
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'group_description_audio_missing'))
  assert.ok(result.errors.some((item) => item.code === 'group_audio_missing'))
})

test('cross-check validator should reject route refs pointing to missing module versions', async () => {
  const mod = await import('../domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  const result = mod.validateListeningChoiceModuleCommitCrossChecks({
    mode: 'save',
    template: createTemplate(),
    nextModule: createModule(),
    flowProfiles: [createProfile({ module: { id: 'not.exists.module', version: 9 } })],
    moduleCatalog: []
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'route_missing_module_ref'))
})

test('cross-check validator should reject route refs pointing to archived modules', async () => {
  const mod = await import('../domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  const result = mod.validateListeningChoiceModuleCommitCrossChecks({
    mode: 'save',
    template: createTemplate(),
    nextModule: createModule(),
    flowProfiles: [createProfile({ module: { id: 'legacy.module', version: 2 } })],
    moduleCatalog: [createModule({ id: 'legacy.module', version: 2, status: 'archived' })]
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((item) => item.code === 'route_archived_module_ref'))
})

test('cross-check validator should warn (not block) publish when no enabled route points to target module', async () => {
  const mod = await import('../domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  const result = mod.validateListeningChoiceModuleCommitCrossChecks({
    mode: 'publish',
    template: createTemplate(),
    nextModule: createModule({ id: 'new.module', version: 3 }),
    flowProfiles: [createProfile({ module: { id: 'legacy.module', version: 2 } })],
    moduleCatalog: [createModule({ id: 'legacy.module', version: 2, status: 'published' })]
  })

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.ok(result.warnings.some((item) => item.code === 'publish_without_route_reference'))
})

test('cross-check validator should pass on valid save payload', async () => {
  const mod = await import('../domain/flow-module/usecases/validateModuleCommitCrossChecks.ts')
  const result = mod.validateListeningChoiceModuleCommitCrossChecks({
    mode: 'save',
    template: createTemplate(),
    nextModule: createModule({ status: 'draft' }),
    flowProfiles: [createProfile()],
    moduleCatalog: [createModule({ status: 'published' })]
  })

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
})
