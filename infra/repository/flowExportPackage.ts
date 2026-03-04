import type { FlowProfileV1, ListeningChoiceFlowModuleV1 } from '/types'
import type { FlowModulePublishLogRecord } from '/infra/repository/flowModuleRepository'
import { parseFlowExportPackageV2 } from '../../domain/schemas/runtimeBoundarySchemas.ts'

export const FLOW_EXPORT_SCHEMA_VERSION = 2

export type FlowExportCapabilitiesV2 = {
  branchNodeMvp: boolean
  loopNodeMvp: boolean
}

export type FlowExportPackageV2 = {
  exportedAt: string
  schemaVersion: 2
  exportCapabilities: FlowExportCapabilitiesV2
  listeningChoiceModules: ListeningChoiceFlowModuleV1[]
  flowProfiles: FlowProfileV1[]
  publishLogs: FlowModulePublishLogRecord[]
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

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function createDefaultCapabilities(): FlowExportCapabilitiesV2 {
  return {
    branchNodeMvp: true,
    loopNodeMvp: true
  }
}

function normalizeCapabilities(value: unknown): FlowExportCapabilitiesV2 {
  const defaults = createDefaultCapabilities()
  if (!isObjectRecord(value)) return defaults

  return {
    branchNodeMvp: typeof value.branchNodeMvp === 'boolean' ? value.branchNodeMvp : defaults.branchNodeMvp,
    loopNodeMvp: typeof value.loopNodeMvp === 'boolean' ? value.loopNodeMvp : defaults.loopNodeMvp
  }
}

export function buildFlowExportPackageV2(input?: BuildFlowExportPackageInput): FlowExportPackageV2 {
  const exportedAt = normalizeText(input?.exportedAt) || new Date().toISOString()

  return {
    exportedAt,
    schemaVersion: 2,
    exportCapabilities: createDefaultCapabilities(),
    listeningChoiceModules: toArray<ListeningChoiceFlowModuleV1>(input?.listeningChoiceModules),
    flowProfiles: toArray<FlowProfileV1>(input?.flowProfiles),
    publishLogs: toArray<FlowModulePublishLogRecord>(input?.publishLogs)
  }
}

export function readFlowExportPackageV2(payload: unknown): FlowExportPackageV2 | null {
  const parsed = parseFlowExportPackageV2(payload)
  if (!parsed) return null

  const exportedAt = normalizeText(parsed.exportedAt) || new Date().toISOString()
  const exportCapabilities = normalizeCapabilities(parsed.exportCapabilities)

  return {
    exportedAt,
    schemaVersion: 2,
    exportCapabilities,
    listeningChoiceModules: toArray<ListeningChoiceFlowModuleV1>(parsed.listeningChoiceModules),
    flowProfiles: toArray<FlowProfileV1>(parsed.flowProfiles),
    publishLogs: toArray<FlowModulePublishLogRecord>(parsed.publishLogs)
  }
}
