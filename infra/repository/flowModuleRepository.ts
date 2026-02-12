export type FlowModulePublishLogRecord = {
  id: string
  createdAt: string
  moduleId: string
  moduleVersion: number
  moduleDisplayRef: string
  summaryLines: string[]
}

const FLOW_MODULE_PUBLISH_LOG_KEY = 'flow_module_publish_logs_v1'

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadFlowModulePublishLogs(): FlowModulePublishLogRecord[] {
  try {
    const stored = uni.getStorageSync(FLOW_MODULE_PUBLISH_LOG_KEY)
    if (!stored) return []
    const parsed = safeJsonParse(stored)
    return Array.isArray(parsed) ? (parsed as FlowModulePublishLogRecord[]) : []
  } catch {
    return []
  }
}

export function saveFlowModulePublishLogs(logs: FlowModulePublishLogRecord[]): void {
  try {
    uni.setStorageSync(FLOW_MODULE_PUBLISH_LOG_KEY, JSON.stringify(logs || []))
  } catch {}
}
