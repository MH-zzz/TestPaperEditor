import type { FlowProfileV1, ListeningChoiceFlowModuleV1 } from '/types'
import type { FlowModulePublishLogRecord } from '/infra/repository/flowModuleRepository'

export const FLOW_EXPORT_SCHEMA_VERSION = 2

export type FlowExportCapabilitiesV2 = {
  branchNodeMvp: boolean
  loopNodeMvp: boolean
  migrationReport: boolean
}

export type FlowExportMigrationEntry = {
  path: string
  reason: string
  before: string
  after: string
}

export type FlowExportMigrationReport = {
  fromVersion: number
  toVersion: number
  migrated: boolean
  migratedAt: string
  entries: FlowExportMigrationEntry[]
}

export type FlowExportPackageV2 = {
  exportedAt: string
  schemaVersion: 2
  exportCapabilities: FlowExportCapabilitiesV2
  listeningChoiceModules: ListeningChoiceFlowModuleV1[]
  flowProfiles: FlowProfileV1[]
  publishLogs: FlowModulePublishLogRecord[]
  migrationReport: FlowExportMigrationReport
}

type BuildFlowExportPackageInput = {
  exportedAt?: string
  listeningChoiceModules?: ListeningChoiceFlowModuleV1[]
  flowProfiles?: FlowProfileV1[]
  publishLogs?: FlowModulePublishLogRecord[]
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function toSchemaVersion(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  const normalized = Math.floor(parsed)
  return normalized > 0 ? normalized : 1
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function createDefaultCapabilities(): FlowExportCapabilitiesV2 {
  return {
    branchNodeMvp: true,
    loopNodeMvp: true,
    migrationReport: true
  }
}

function normalizeCapabilities(
  value: unknown,
  entries: FlowExportMigrationEntry[]
): FlowExportCapabilitiesV2 {
  const defaults = createDefaultCapabilities()
  if (!isObjectRecord(value)) {
    entries.push({
      path: 'exportCapabilities',
      reason: '缺少能力标识，已补充默认能力开关。',
      before: 'missing',
      after: 'default_capabilities_v2'
    })
    return defaults
  }

  const next: FlowExportCapabilitiesV2 = {
    branchNodeMvp: typeof value.branchNodeMvp === 'boolean' ? value.branchNodeMvp : defaults.branchNodeMvp,
    loopNodeMvp: typeof value.loopNodeMvp === 'boolean' ? value.loopNodeMvp : defaults.loopNodeMvp,
    migrationReport: typeof value.migrationReport === 'boolean' ? value.migrationReport : defaults.migrationReport
  }

  if (
    typeof value.branchNodeMvp !== 'boolean'
    || typeof value.loopNodeMvp !== 'boolean'
    || typeof value.migrationReport !== 'boolean'
  ) {
    entries.push({
      path: 'exportCapabilities',
      reason: '能力标识字段不完整，已按 V2 默认值补齐。',
      before: 'partial',
      after: 'normalized_v2'
    })
  }
  return next
}

function createMigrationReport(
  fromVersion: number,
  entries: FlowExportMigrationEntry[],
  migratedAt: string
): FlowExportMigrationReport {
  return {
    fromVersion,
    toVersion: FLOW_EXPORT_SCHEMA_VERSION,
    migrated: entries.length > 0 || fromVersion !== FLOW_EXPORT_SCHEMA_VERSION,
    migratedAt,
    entries
  }
}

export function buildFlowExportPackageV2(input?: BuildFlowExportPackageInput): FlowExportPackageV2 {
  const exportedAt = normalizeText(input?.exportedAt) || new Date().toISOString()
  const entries: FlowExportMigrationEntry[] = []
  const migrationReport = createMigrationReport(FLOW_EXPORT_SCHEMA_VERSION, entries, exportedAt)

  return {
    exportedAt,
    schemaVersion: 2,
    exportCapabilities: createDefaultCapabilities(),
    listeningChoiceModules: toArray<ListeningChoiceFlowModuleV1>(input?.listeningChoiceModules),
    flowProfiles: toArray<FlowProfileV1>(input?.flowProfiles),
    publishLogs: toArray<FlowModulePublishLogRecord>(input?.publishLogs),
    migrationReport
  }
}

export function migrateFlowExportPayloadToV2(payload: unknown): FlowExportPackageV2 {
  const src = isObjectRecord(payload) ? payload : {}
  const fromVersion = toSchemaVersion(src.schemaVersion)
  const exportedAt = normalizeText(src.exportedAt) || new Date().toISOString()
  const entries: FlowExportMigrationEntry[] = []

  const hasCanonicalModules = Array.isArray(src.listeningChoiceModules)
  const hasLegacyModules = Array.isArray(src.modules)
  const hasCanonicalProfiles = Array.isArray(src.flowProfiles)
  const hasLegacyProfiles = Array.isArray(src.profiles)
  const hasCanonicalLogs = Array.isArray(src.publishLogs)
  const hasLegacyLogs = Array.isArray(src.logs)

  if (!hasCanonicalModules && hasLegacyModules) {
    entries.push({
      path: 'modules -> listeningChoiceModules',
      reason: '兼容 V1 字段命名。',
      before: 'modules',
      after: 'listeningChoiceModules'
    })
  }
  if (!hasCanonicalProfiles && hasLegacyProfiles) {
    entries.push({
      path: 'profiles -> flowProfiles',
      reason: '兼容 V1 字段命名。',
      before: 'profiles',
      after: 'flowProfiles'
    })
  }
  if (!hasCanonicalLogs && hasLegacyLogs) {
    entries.push({
      path: 'logs -> publishLogs',
      reason: '兼容 V1 日志字段命名。',
      before: 'logs',
      after: 'publishLogs'
    })
  }
  if (fromVersion !== FLOW_EXPORT_SCHEMA_VERSION) {
    entries.push({
      path: 'schemaVersion',
      reason: '导出包升级到 V2 schema。',
      before: String(fromVersion),
      after: String(FLOW_EXPORT_SCHEMA_VERSION)
    })
  }

  const exportCapabilities = normalizeCapabilities(src.exportCapabilities, entries)
  const migrationReport = createMigrationReport(fromVersion, entries, exportedAt)

  return {
    exportedAt,
    schemaVersion: 2,
    exportCapabilities,
    listeningChoiceModules: hasCanonicalModules
      ? toArray<ListeningChoiceFlowModuleV1>(src.listeningChoiceModules)
      : toArray<ListeningChoiceFlowModuleV1>(src.modules),
    flowProfiles: hasCanonicalProfiles
      ? toArray<FlowProfileV1>(src.flowProfiles)
      : toArray<FlowProfileV1>(src.profiles),
    publishLogs: hasCanonicalLogs
      ? toArray<FlowModulePublishLogRecord>(src.publishLogs)
      : toArray<FlowModulePublishLogRecord>(src.logs),
    migrationReport
  }
}
