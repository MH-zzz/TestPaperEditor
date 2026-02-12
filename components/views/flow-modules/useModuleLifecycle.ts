import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type {
  FlowModuleRef,
  FlowModuleStatus,
  FlowProfileV1,
  ListeningChoiceFlowModuleV1
} from '/types'
import { flowModules } from '/stores/flowModules'
import {
  type FlowModulePublishLogRecord,
  loadFlowModulePublishLogs as loadFlowModulePublishLogsFromRepository,
  saveFlowModulePublishLogs as saveFlowModulePublishLogsToRepository
} from '/infra/repository/flowModuleRepository'
import { buildModuleDiffSummary, formatModuleDiffSummary } from '/domain/flow-module/usecases/buildModuleDiffSummary'
import {
  DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  type ListeningChoiceStandardFlowModuleV1,
  validateListeningChoiceStandardModule
} from '/flows/listeningChoiceFlowModules'

const DEFAULT_LISTENING_CHOICE_MODULE_NAME = '听后选择标准'

type FlowModulePublishLog = FlowModulePublishLogRecord

export type ModuleCommitMode = 'save' | 'publish'

export type ModuleCommitValidationPayload = {
  mode: ModuleCommitMode
  module: ListeningChoiceFlowModuleV1
  targetRef: FlowModuleRef
}

export type ModuleCommitValidationResult = {
  ok: boolean
  errors: string[]
  issues?: Array<{
    code?: string
    path?: string
    message?: string
  }>
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function nowIso() {
  return new Date().toISOString()
}

function toInt(v: unknown): number {
  const n = parseInt(String(v || '0'), 10)
  return Number.isFinite(n) ? n : 0
}

function normalizeText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function normalizeModuleName(name: unknown, fallback = DEFAULT_LISTENING_CHOICE_MODULE_NAME): string {
  return normalizeText(name) || fallback
}

function normalizeModuleNote(note: unknown): string {
  return normalizeText(note) || ''
}

function moduleNameFallbackById(id: string): string {
  return id === LISTENING_CHOICE_STANDARD_FLOW_ID ? DEFAULT_LISTENING_CHOICE_MODULE_NAME : id
}

function normalizeModuleStatus(v: unknown): FlowModuleStatus {
  if (v === 'draft' || v === 'published' || v === 'archived') return v
  return 'draft'
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toLegacyStandardModule(moduleInput: unknown): ListeningChoiceStandardFlowModuleV1 {
  const m = isObjectRecord(moduleInput) ? moduleInput : {}
  return {
    version: 1,
    id: String(m.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
    introShowTitle: m.introShowTitle,
    introShowTitleDescription: m.introShowTitleDescription,
    introShowDescription: m.introShowDescription,
    introCountdownEnabled: m.introCountdownEnabled,
    introCountdownShowTitle: m.introCountdownShowTitle,
    introCountdownSeconds: m.introCountdownSeconds,
    introCountdownLabel: m.introCountdownLabel,
    perGroupSteps: Array.isArray(m.perGroupSteps) ? m.perGroupSteps : []
  }
}

function getDefaultModule(): ListeningChoiceFlowModuleV1 {
  const module = flowModules.getListeningChoiceDefault()
  if (module) return module
  return {
    kind: 'listening_choice',
    id: LISTENING_CHOICE_STANDARD_FLOW_ID,
    version: 1,
    name: DEFAULT_LISTENING_CHOICE_MODULE_NAME,
    note: '',
    status: 'published',
    ...DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
  }
}

function formatFlowModuleValidationIssues(items: Array<{ message: string }>, max = 5) {
  if (!Array.isArray(items) || items.length === 0) return ''
  const head = items.slice(0, max).map((item, idx) => `${idx + 1}. ${item.message}`)
  const more = items.length > max ? `\n... 另有 ${items.length - max} 条` : ''
  return `${head.join('\n')}${more}`
}

function formatFlowProfileImpactLines(rules: FlowProfileV1[], max = 6) {
  if (!Array.isArray(rules) || rules.length === 0) return '无'
  const lines = rules.slice(0, max).map((p) => {
    const status = p.enabled === false ? '停用' : '启用'
    const note = String(p.note || '').trim()
    const suffix = note ? `（${note}）` : ''
    return `- ${p.id}${suffix} [${status}]`
  })
  if (rules.length > max) lines.push(`- ... 另有 ${rules.length - max} 条`)
  return lines.join('\n')
}

function formatFlowProfileVersionSummary(rules: FlowProfileV1[]) {
  const map: Record<string, number> = {}
  ;(rules || []).forEach((p) => {
    const v = `v${Math.max(1, toInt(p?.module?.version || 1))}`
    map[v] = (map[v] || 0) + 1
  })
  return Object.entries(map)
    .sort((a, b) => Number(b[0].slice(1)) - Number(a[0].slice(1)))
    .map(([v, count]) => `${v} x ${count}`)
    .join('，')
}

function formatModuleDisplayRef(refLike: Partial<FlowModuleRef & { name?: string | null }> | null | undefined): string {
  const id = String(refLike?.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const version = Math.max(1, toInt(refLike?.version || 1))
  const hit = flowModules.getListeningChoiceByRef({ id, version })
  const name = normalizeModuleName(refLike?.name || hit?.name, moduleNameFallbackById(id))
  return `${name} @ v${version}`
}

function formatCrossValidationErrors(errors: string[], max = 8): string {
  if (!Array.isArray(errors) || errors.length === 0) return '流程校验失败，请检查配置。'
  const lines = errors.slice(0, max).map((item, idx) => `${idx + 1}. ${item}`)
  if (errors.length > max) lines.push(`... 另有 ${errors.length - max} 条错误`)
  return lines.join('\n')
}

export function useModuleLifecycle(options: {
  draftModuleId: Ref<string>
  draftModuleVersion: Ref<number>
  draftModuleName: Ref<string>
  draftModuleNote: Ref<string>
  draftModuleDisplayRef: ComputedRef<string>
  listeningChoiceDraft: Ref<ListeningChoiceStandardFlowModuleV1>
  flowProfileRules: ComputedRef<FlowProfileV1[]>
  patchFlowProfile: (id: string, patch: Record<string, unknown>) => boolean
  validateBeforeCommit?: (payload: ModuleCommitValidationPayload) => ModuleCommitValidationResult
  onCommitValidationFailed?: (result: ModuleCommitValidationResult) => boolean
}) {
  const {
    draftModuleId,
    draftModuleVersion,
    draftModuleName,
    draftModuleNote,
    draftModuleDisplayRef,
    listeningChoiceDraft,
    flowProfileRules,
    patchFlowProfile,
    validateBeforeCommit,
    onCommitValidationFailed
  } = options

  const currentModuleRef = computed<FlowModuleRef>(() => ({
    id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: Math.max(1, toInt(draftModuleVersion.value || 1))
  }))
  const currentModule = computed(() => flowModules.getListeningChoiceByRef(currentModuleRef.value))
  const currentModuleExists = computed(() => Boolean(currentModule.value))
  const currentModuleStatus = computed<FlowModuleStatus>(() => normalizeModuleStatus(currentModule.value?.status))
  const currentModuleStatusLabel = computed(() => {
    if (!currentModuleExists.value) return '新建草稿'
    if (currentModuleStatus.value === 'draft') return '草稿'
    if (currentModuleStatus.value === 'published') return '已发布'
    return '已归档'
  })
  const currentModuleStatusHint = computed(() => {
    if (!currentModuleExists.value) return '当前版本尚未创建，保存后将作为草稿；草稿发布后才能作为稳定版本使用。'
    if (currentModuleStatus.value === 'draft') return '草稿可持续编辑；发布后进入已发布状态。'
    if (currentModuleStatus.value === 'published') return '已发布版本不可直接覆盖；如需修改，请“另存新版本”后编辑草稿。'
    return '已归档版本只读且不会再命中新题；如需调整，请“另存新版本”。'
  })
  const canSaveCurrentStandard = computed(() => !currentModuleExists.value || currentModuleStatus.value === 'draft')
  const canPublishCurrentStandard = computed(() => currentModuleExists.value && currentModuleStatus.value === 'draft')
  const canArchiveCurrentStandard = computed(() => currentModuleExists.value && currentModuleStatus.value !== 'archived')

  const flowProfilesMigratableToCurrentVersion = computed<FlowProfileV1[]>(() => {
    const targetId = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
    const targetVersion = Math.max(1, toInt(draftModuleVersion.value || 1))
    return (flowProfileRules.value || []).filter((profile) => {
      const moduleId = String(profile?.module?.id || '')
      const moduleVersion = Number(profile?.module?.version || 0)
      return moduleId === targetId && moduleVersion > 0 && moduleVersion !== targetVersion
    })
  })

  const flowModulePublishLogs = ref<FlowModulePublishLog[]>([])
  loadFlowModulePublishLogs()

  function syncDraftModuleMeta(module: unknown) {
    const mod = isObjectRecord(module) ? module : {}
    const id = String(mod.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
    draftModuleName.value = normalizeModuleName(mod.name, moduleNameFallbackById(id))
    draftModuleNote.value = normalizeModuleNote(mod.note)
  }

  function syncDraftFromModule(module: unknown) {
    const mod = isObjectRecord(module) ? module : {}
    draftModuleId.value = String(mod.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
    draftModuleVersion.value = Number(mod.version || 1)
    syncDraftModuleMeta(mod)
    listeningChoiceDraft.value = clone(toLegacyStandardModule(mod))
  }

  function loadFlowModulePublishLogs() {
    try {
      const list = loadFlowModulePublishLogsFromRepository()
      flowModulePublishLogs.value = list
        .map((item) => ({
          id: String(item?.id || ''),
          createdAt: String(item?.createdAt || ''),
          moduleId: String(item?.moduleId || ''),
          moduleVersion: Math.max(1, toInt(item?.moduleVersion || 1)),
          moduleDisplayRef: String(item?.moduleDisplayRef || ''),
          summaryLines: Array.isArray(item?.summaryLines) ? item.summaryLines.map((x) => String(x || '')) : []
        }))
        .filter((item: FlowModulePublishLog) => item.id)
        .slice(0, 60)
    } catch (e) {
      console.error('Failed to load flow module publish logs', e)
      flowModulePublishLogs.value = []
    }
  }

  function persistFlowModulePublishLogs() {
    try {
      saveFlowModulePublishLogsToRepository(flowModulePublishLogs.value)
    } catch (e) {
      console.error('Failed to save flow module publish logs', e)
    }
  }

  function appendFlowModulePublishLog(log: Omit<FlowModulePublishLog, 'id' | 'createdAt'>) {
    const item: FlowModulePublishLog = {
      id: `flow_publish_${Date.now()}`,
      createdAt: nowIso(),
      moduleId: String(log.moduleId || ''),
      moduleVersion: Math.max(1, toInt(log.moduleVersion || 1)),
      moduleDisplayRef: String(log.moduleDisplayRef || ''),
      summaryLines: Array.isArray(log.summaryLines) ? log.summaryLines.map((x) => String(x || '')) : []
    }
    flowModulePublishLogs.value = [item, ...(flowModulePublishLogs.value || [])].slice(0, 60)
    persistFlowModulePublishLogs()
  }

  function showPublishLogs() {
    const logs = flowModulePublishLogs.value || []
    if (logs.length <= 0) {
      uni.showToast({ title: '暂无发布日志', icon: 'none' })
      return
    }

    const lines = logs.slice(0, 8).flatMap((item, index) => {
      const head = `${index + 1}. ${item.createdAt} · ${item.moduleDisplayRef || `${item.moduleId} @ v${item.moduleVersion}`}`
      const body = (item.summaryLines || []).slice(0, 4).map(line => `   ${line}`)
      return [head, ...body]
    })
    if (logs.length > 8) lines.push(`... 另有 ${logs.length - 8} 条`)

    uni.showModal({
      title: '发布日志',
      content: lines.join('\n'),
      showCancel: false
    })
  }

  function getFlowModuleSaveImpact(target?: { id?: string; version?: number }) {
    const refId = String(target?.id || draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
    const refVersion = Math.max(1, toInt(target?.version || draftModuleVersion.value || 1))
    const matchedRules = (flowProfileRules.value || []).filter((p) => {
      return String(p?.module?.id || '') === refId && Number(p?.module?.version || 0) === refVersion
    })
    const enabledRules = matchedRules.filter(p => p?.enabled !== false)
    const exists = Boolean(flowModules.getListeningChoiceByRef({ id: refId, version: refVersion }))
    return {
      id: refId,
      version: refVersion,
      exists,
      matchedRuleCount: matchedRules.length,
      enabledRuleCount: enabledRules.length,
      matchedRules
    }
  }

  function checkModuleCommitGuard(mode: ModuleCommitMode, payload: ListeningChoiceFlowModuleV1, targetRef: FlowModuleRef): boolean {
    if (!validateBeforeCommit) return true
    const result = validateBeforeCommit({ mode, module: payload, targetRef })
    if (result?.ok) return true
    const handled = onCommitValidationFailed ? onCommitValidationFailed(result) : false
    if (handled) return false
    uni.showModal({
      title: '流程引用校验失败',
      content: formatCrossValidationErrors(result?.errors || []),
      showCancel: false
    })
    return false
  }

  function saveStandard(skipWarningCheck = false, skipImpactCheck = false, targetVersion?: number) {
    const effectiveVersion = Math.max(1, toInt(targetVersion || draftModuleVersion.value || 1))
    const targetRef = {
      id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
      version: effectiveVersion
    }
    const existing = flowModules.getListeningChoiceByRef(targetRef)

    if (existing?.status === 'archived') {
      uni.showModal({
        title: '归档版本只读',
        content: '当前版本已归档，不能直接保存。请使用“另存新版本”创建草稿后再编辑。',
        showCancel: false
      })
      return
    }

    if (existing?.status === 'published') {
      uni.showModal({
        title: '发布版本不可直接覆盖',
        content: '当前版本已发布。为保证可回溯，请使用“另存新版本”创建草稿版本进行修改。',
        showCancel: false
      })
      return
    }

    const moduleFallbackName = moduleNameFallbackById(targetRef.id)
    const moduleName = normalizeModuleName(draftModuleName.value, moduleFallbackName)
    const moduleNote = normalizeModuleNote(draftModuleNote.value)
    const draftPayload: ListeningChoiceFlowModuleV1 = {
      kind: 'listening_choice',
      id: targetRef.id,
      version: effectiveVersion,
      name: moduleName,
      note: moduleNote,
      status: 'draft',
      ...listeningChoiceDraft.value
    }
    const validation = validateListeningChoiceStandardModule(draftPayload)
    if (validation.errors.length > 0) {
      uni.showModal({
        title: '题型流程校验失败',
        content: formatFlowModuleValidationIssues(validation.errors),
        showCancel: false
      })
      return
    }

    if (!skipWarningCheck && validation.warnings.length > 0) {
      uni.showModal({
        title: '题型流程校验提醒',
        content: `${formatFlowModuleValidationIssues(validation.warnings)}\n\n是否仍然保存？`,
        confirmText: '仍然保存',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) return
          saveStandard(true, skipImpactCheck, targetVersion)
        }
      })
      return
    }

    if (!checkModuleCommitGuard('save', draftPayload, targetRef)) return

    if (!skipImpactCheck) {
      const impact = getFlowModuleSaveImpact({ id: draftPayload.id, version: effectiveVersion })
      const actionLabel = impact.exists ? '覆盖草稿版本' : '创建草稿版本'
      const diffSummary = buildModuleDiffSummary({
        previousModule: existing || null,
        nextModule: draftPayload,
        impactRules: impact.matchedRules
      })
      const contentLines = [
        `本次将${actionLabel}：${moduleName}（${draftPayload.id} @ v${effectiveVersion}）`,
        `变更摘要：\n${formatModuleDiffSummary(diffSummary)}`,
        '是否继续保存？'
      ]
      if (moduleNote) contentLines.splice(1, 0, `流程备注：${moduleNote}`)
      const content = contentLines.join('\n')
      uni.showModal({
        title: '确认保存题型流程',
        content,
        confirmText: '确认保存',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) return
          saveStandard(true, true, targetVersion)
        }
      })
      return
    }

    flowModules.upsertListeningChoice({
      ...draftPayload
    })
    const module = flowModules.getListeningChoiceByRef({
      id: draftModuleId.value,
      version: effectiveVersion
    })
    draftModuleVersion.value = effectiveVersion
    syncDraftModuleMeta(module || draftPayload)
    listeningChoiceDraft.value = clone(toLegacyStandardModule(module || getDefaultModule()))
    uni.showToast({ title: `已保存草稿 v${effectiveVersion}`, icon: 'success' })
  }

  function saveStandardAsNextVersion() {
    const moduleId = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
    const currentVersion = Math.max(1, toInt(draftModuleVersion.value || 1))
    const maxVersion = flowModules.getListeningChoiceMaxVersion(moduleId)
    const nextVersion = Math.max(currentVersion + 1, maxVersion + 1, 1)
    saveStandard(false, false, nextVersion)
  }

  function publishCurrentStandard(skipWarningCheck = false, skipImpactCheck = false) {
    const ref = {
      id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
      version: Math.max(1, toInt(draftModuleVersion.value || 1))
    }
    const hit = flowModules.getListeningChoiceByRef(ref)
    if (hit?.status === 'archived') {
      uni.showToast({ title: '归档版本不可发布', icon: 'none' })
      return
    }
    if (hit?.status === 'published') {
      uni.showToast({ title: '当前版本已发布', icon: 'none' })
      return
    }

    const moduleFallbackName = moduleNameFallbackById(ref.id)
    const moduleName = normalizeModuleName(draftModuleName.value, moduleFallbackName)
    const moduleNote = normalizeModuleNote(draftModuleNote.value)
    const publishPayload: ListeningChoiceFlowModuleV1 = {
      kind: 'listening_choice',
      id: ref.id,
      version: ref.version,
      name: moduleName,
      note: moduleNote,
      status: 'draft',
      ...listeningChoiceDraft.value
    }
    const validation = validateListeningChoiceStandardModule(publishPayload)
    if (validation.errors.length > 0) {
      uni.showModal({
        title: '题型流程校验失败',
        content: formatFlowModuleValidationIssues(validation.errors),
        showCancel: false
      })
      return
    }

    if (!skipWarningCheck && validation.warnings.length > 0) {
      uni.showModal({
        title: '题型流程校验提醒',
        content: `${formatFlowModuleValidationIssues(validation.warnings)}\n\n是否仍然发布？`,
        confirmText: '仍然发布',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) return
          publishCurrentStandard(true, skipImpactCheck)
        }
      })
      return
    }

    if (!checkModuleCommitGuard('publish', publishPayload, ref)) return

    if (!skipImpactCheck) {
      const impact = getFlowModuleSaveImpact(ref)
      const previousPublished = flowModules.getListeningChoiceLatestPublished(ref.id)
      const diffSummary = buildModuleDiffSummary({
        previousModule: previousPublished || null,
        nextModule: publishPayload,
        impactRules: impact.matchedRules
      })
      const contentLines = [
        `将发布版本：${moduleName}（${ref.id} @ v${ref.version}）`,
        `对比基线：${previousPublished ? formatModuleDisplayRef(previousPublished) : '无已发布基线'}`,
        `变更摘要：\n${formatModuleDiffSummary(diffSummary)}`,
        '发布后该版本可用于路由规则。是否继续？'
      ]
      if (moduleNote) contentLines.splice(1, 0, `流程备注：${moduleNote}`)
      const content = contentLines.join('\n')
      uni.showModal({
        title: '确认发布题型流程',
        content,
        confirmText: '确认发布',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) return
          publishCurrentStandard(true, true)
        }
      })
      return
    }

    const publishImpact = getFlowModuleSaveImpact(ref)
    const previousPublished = flowModules.getListeningChoiceLatestPublished(ref.id)
    const publishDiffSummary = buildModuleDiffSummary({
      previousModule: previousPublished || null,
      nextModule: publishPayload,
      impactRules: publishImpact.matchedRules
    })

    flowModules.upsertListeningChoice(publishPayload)
    const ok = flowModules.setListeningChoiceStatus(ref, 'published')
    if (!ok) {
      uni.showToast({ title: '发布失败', icon: 'none' })
      return
    }
    const latest = flowModules.getListeningChoiceByRef(ref)
    syncDraftModuleMeta(latest || publishPayload)
    if (latest) listeningChoiceDraft.value = clone(toLegacyStandardModule(latest))
    appendFlowModulePublishLog({
      moduleId: ref.id,
      moduleVersion: ref.version,
      moduleDisplayRef: `${moduleName} @ v${ref.version}`,
      summaryLines: publishDiffSummary.summaryLines
    })
    uni.showToast({ title: `已发布 v${ref.version}`, icon: 'success' })
  }

  function archiveCurrentStandard() {
    const ref = {
      id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
      version: Math.max(1, toInt(draftModuleVersion.value || 1))
    }
    const hit = flowModules.getListeningChoiceByRef(ref)
    if (!hit) {
      uni.showToast({ title: '当前版本不存在', icon: 'none' })
      return
    }
    if (hit.status === 'archived') {
      uni.showToast({ title: '当前版本已归档', icon: 'none' })
      return
    }
    if (!flowModules.canTransitionListeningChoiceStatus(ref, 'archived')) {
      uni.showToast({ title: '当前状态不允许归档', icon: 'none' })
      return
    }

    const impact = getFlowModuleSaveImpact(ref)
    const moduleName = normalizeModuleName(hit?.name, moduleNameFallbackById(ref.id))
    const content = [
      `将归档：${moduleName}（${ref.id} @ v${ref.version}）`,
      `命中路由规则：${impact.matchedRuleCount} 条（启用 ${impact.enabledRuleCount} 条）`,
      `受影响路由规则：\n${formatFlowProfileImpactLines(impact.matchedRules)}`,
      '归档后新题不会命中该版本。是否继续？'
    ].join('\n')

    uni.showModal({
      title: '归档当前版本',
      content,
      confirmText: '确认归档',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        const ok = flowModules.archiveListeningChoice(ref)
        if (!ok) {
          uni.showToast({ title: '归档失败', icon: 'none' })
          return
        }
        const fallback = flowModules.getListeningChoiceLatestPublished(ref.id) || getDefaultModule()
        if (fallback) syncDraftFromModule(fallback)
        uni.showToast({ title: '已归档当前版本', icon: 'success' })
      }
    })
  }

  function migrateFlowProfilesToCurrentVersion() {
    const targetId = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
    const targetVersion = Math.max(1, toInt(draftModuleVersion.value || 1))
    const candidates = flowProfilesMigratableToCurrentVersion.value || []

    if (candidates.length <= 0) {
      uni.showToast({ title: '没有可迁移路由', icon: 'none' })
      return
    }

    const content = [
      `将把以下路由迁移到：${draftModuleDisplayRef.value}（${targetId}）`,
      `待迁移规则：${candidates.length} 条`,
      `当前版本分布：${formatFlowProfileVersionSummary(candidates)}`,
      `规则列表：\n${formatFlowProfileImpactLines(candidates, 10)}`,
      '是否继续？'
    ].join('\n')

    uni.showModal({
      title: '批量迁移路由版本',
      content,
      confirmText: '批量迁移',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        candidates.forEach((profile) => {
          patchFlowProfile(profile.id, {
            module: {
              id: targetId,
              version: targetVersion
            }
          })
        })
        uni.showToast({ title: `已迁移 ${candidates.length} 条路由`, icon: 'success' })
      }
    })
  }

  function resetStandard() {
    uni.showModal({
      title: '恢复默认题型流程',
      content: '将恢复系统默认流程，并影响所有标准题目。是否继续？',
      confirmText: '恢复',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        flowModules.resetListeningChoiceToDefault()
        const module = getDefaultModule()
        syncDraftFromModule(module)
        uni.showToast({ title: '已恢复默认', icon: 'success' })
      }
    })
  }

  return {
    currentModuleRef,
    currentModule,
    currentModuleExists,
    currentModuleStatus,
    currentModuleStatusLabel,
    currentModuleStatusHint,
    canSaveCurrentStandard,
    canPublishCurrentStandard,
    canArchiveCurrentStandard,
    flowProfilesMigratableToCurrentVersion,
    flowModulePublishLogs,
    showPublishLogs,
    saveStandard,
    saveStandardAsNextVersion,
    publishCurrentStandard,
    archiveCurrentStandard,
    migrateFlowProfilesToCurrentVersion,
    resetStandard
  }
}
