import type { FlowProfileV1, ListeningChoiceFlowModuleV1 } from '/types'

type ValidationLevel = 'error' | 'warning'

export type ModuleCommitCrossValidationIssue = {
  level: ValidationLevel
  code: string
  path: string
  message: string
}

export type ModuleCommitCrossValidationResult = {
  ok: boolean
  issues: ModuleCommitCrossValidationIssue[]
  errors: ModuleCommitCrossValidationIssue[]
  warnings: ModuleCommitCrossValidationIssue[]
}

type ValidateListeningChoiceModuleCommitInput = {
  mode: 'save' | 'publish'
  template: unknown
  nextModule: ListeningChoiceFlowModuleV1
  flowProfiles: FlowProfileV1[]
  moduleCatalog: ListeningChoiceFlowModuleV1[]
}

type TemplateGroupLike = {
  id?: unknown
  prepareSeconds?: unknown
  audio?: unknown
  descriptionAudio?: unknown
  subQuestions?: unknown
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toTemplateGroups(input: unknown): TemplateGroupLike[] {
  if (!isObjectRecord(input)) return []
  const content = isObjectRecord(input.content) ? input.content : {}
  return Array.isArray(content.groups) ? (content.groups as TemplateGroupLike[]) : []
}

function hasKind(module: ListeningChoiceFlowModuleV1, kind: string): boolean {
  return (module.perGroupSteps || []).some((step) => String(step?.kind || '') === kind)
}

function hasPlayAudioSource(module: ListeningChoiceFlowModuleV1, source: 'description' | 'content'): boolean {
  return (module.perGroupSteps || []).some((step) => {
    return String(step?.kind || '') === 'playAudio' && String((step as Record<string, unknown>).audioSource || '') === source
  })
}

function toRefKey(id: string, version: number): string {
  return `${id}@@${version}`
}

function pushIssue(
  issues: ModuleCommitCrossValidationIssue[],
  level: ValidationLevel,
  code: string,
  path: string,
  message: string
) {
  issues.push({ level, code, path, message })
}

export function validateListeningChoiceModuleCommitCrossChecks(
  input: ValidateListeningChoiceModuleCommitInput
): ModuleCommitCrossValidationResult {
  const issues: ModuleCommitCrossValidationIssue[] = []
  const mode = input.mode
  const templateGroups = toTemplateGroups(input.template)
  const module = input.nextModule
  const profiles = Array.isArray(input.flowProfiles) ? input.flowProfiles : []
  const catalog = Array.isArray(input.moduleCatalog) ? input.moduleCatalog : []

  if (templateGroups.length <= 0) {
    pushIssue(
      issues,
      'error',
      'template_groups_empty',
      'content.groups',
      '题型模板至少需要 1 个题组，当前无法保存/发布流程。'
    )
  }

  const needsCountdown = hasKind(module, 'countdown')
  const needsAnswerChoice = hasKind(module, 'answerChoice')
  const needsDescriptionAudio = hasPlayAudioSource(module, 'description')
  const needsContentAudio = hasPlayAudioSource(module, 'content')

  templateGroups.forEach((group, index) => {
    const path = `content.groups[${index}]`
    if (!String(group.id || '').trim()) {
      pushIssue(issues, 'error', 'group_id_missing', `${path}.id`, `第 ${index + 1} 个题组缺少 id。`)
    }

    if (needsCountdown) {
      const seconds = Number(group.prepareSeconds)
      if (!Number.isFinite(seconds) || seconds < 0) {
        pushIssue(
          issues,
          'error',
          'group_prepare_seconds_missing',
          `${path}.prepareSeconds`,
          '流程包含倒计时步骤，题组必须配置非负的 prepareSeconds。'
        )
      }
    }

    if (needsAnswerChoice) {
      const subQuestions = Array.isArray(group.subQuestions) ? group.subQuestions : []
      if (subQuestions.length <= 0) {
        pushIssue(
          issues,
          'error',
          'group_sub_questions_empty',
          `${path}.subQuestions`,
          '流程包含答题步骤，题组必须至少包含一道小题。'
        )
      }
    }

    if (needsDescriptionAudio && !isObjectRecord(group.descriptionAudio)) {
      pushIssue(
        issues,
        'error',
        'group_description_audio_missing',
        `${path}.descriptionAudio`,
        '流程包含“播放描述音频”步骤，题组必须提供 descriptionAudio 字段。'
      )
    }

    if (needsContentAudio && !isObjectRecord(group.audio)) {
      pushIssue(
        issues,
        'error',
        'group_audio_missing',
        `${path}.audio`,
        '流程包含“播放正文音频”步骤，题组必须提供 audio 字段。'
      )
    }
  })

  const moduleRefMap = new Map<string, ListeningChoiceFlowModuleV1>()
  catalog.forEach((item) => {
    if (!item?.id || !Number.isFinite(Number(item.version))) return
    moduleRefMap.set(toRefKey(String(item.id), Math.max(1, Math.floor(Number(item.version)))), item)
  })
  moduleRefMap.set(toRefKey(String(module.id), Math.max(1, Math.floor(Number(module.version)))), module)

  const enabledProfiles = profiles.filter((profile) => profile?.enabled !== false)
  enabledProfiles.forEach((profile, index) => {
    const path = `flowProfiles[${index}](${profile.id})`
    const moduleId = String(profile?.module?.id || '').trim()
    const rawVersion = Number(profile?.module?.version)

    if (!moduleId) {
      pushIssue(
        issues,
        'error',
        'route_module_id_missing',
        `${path}.module.id`,
        '路由规则缺少 module.id。'
      )
      return
    }
    if (!Number.isFinite(rawVersion) || rawVersion <= 0) {
      pushIssue(
        issues,
        'error',
        'route_module_version_invalid',
        `${path}.module.version`,
        '路由规则 module.version 必须是正整数。'
      )
      return
    }
    const moduleVersion = Math.floor(rawVersion)

    const hit = moduleRefMap.get(toRefKey(moduleId, moduleVersion))
    if (!hit) {
      pushIssue(
        issues,
        'error',
        'route_missing_module_ref',
        `${path}.module`,
        `路由规则引用了不存在的流程版本：${moduleId} @ v${moduleVersion}。`
      )
      return
    }
    if (hit.status === 'archived') {
      pushIssue(
        issues,
        'error',
        'route_archived_module_ref',
        `${path}.module`,
        `路由规则引用了已归档流程版本：${moduleId} @ v${moduleVersion}。`
      )
    }
  })

  const targetRuleCount = enabledProfiles.filter((profile) => {
    return String(profile?.module?.id || '') === String(module.id) && Number(profile?.module?.version || 0) === Number(module.version)
  }).length
  if (mode === 'publish' && targetRuleCount <= 0) {
    pushIssue(
      issues,
      'warning',
      'publish_without_route_reference',
      'flowProfiles',
      `当前没有启用路由指向 ${module.id} @ v${module.version}，发布后可能不会被命中。`
    )
  }

  return {
    ok: issues.every((item) => item.level !== 'error'),
    issues,
    errors: issues.filter((item) => item.level === 'error'),
    warnings: issues.filter((item) => item.level === 'warning')
  }
}
