import { reactive } from 'vue'
import type { FlowRoutingContext, QuestionFlowRuntimeMeta } from '/app/usecases/runQuestionFlow'

const MAX_EVENTS_PER_SESSION = 300

export type RuntimeDebugEvent = {
  id: string
  ts: number
  time: string
  type: string
  message: string
  payload?: any
}

export type RuntimeDebugSessionMeta = {
  questionId?: string
  questionType?: string
  mode?: string
  sourceKind?: string
  profileId?: string
  moduleId?: string
  moduleDisplayRef?: string
  moduleVersionText?: string
  moduleNote?: string
  ctx?: FlowRoutingContext
  [key: string]: any
}

export type RuntimeDebugSession = {
  id: string
  createdAt: string
  updatedAt: string
  meta: RuntimeDebugSessionMeta
  events: RuntimeDebugEvent[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

function makeEventId(): string {
  return `trace_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function mergeMeta(
  prev: RuntimeDebugSessionMeta,
  next: RuntimeDebugSessionMeta
): RuntimeDebugSessionMeta {
  return {
    ...prev,
    ...next,
    ctx: {
      ...(prev.ctx || {}),
      ...(next.ctx || {})
    }
  }
}

class RuntimeDebugStore {
  state = reactive({
    enabled: true,
    drawerOpen: false,
    activeSessionId: '',
    sessions: {} as Record<string, RuntimeDebugSession>
  })

  setEnabled(next: boolean) {
    this.state.enabled = next
  }

  getSession(sessionId: string): RuntimeDebugSession | null {
    const id = String(sessionId || '')
    if (!id) return null
    return this.state.sessions[id] || null
  }

  ensureSession(sessionId: string, meta: RuntimeDebugSessionMeta = {}): RuntimeDebugSession {
    const id = String(sessionId || '').trim()
    if (!id) {
      throw new Error('runtimeDebug.ensureSession requires sessionId')
    }

    const now = nowIso()
    const existing = this.state.sessions[id]

    if (existing) {
      const merged: RuntimeDebugSession = {
        ...existing,
        updatedAt: now,
        meta: mergeMeta(existing.meta || {}, meta || {})
      }
      this.state.sessions = { ...this.state.sessions, [id]: merged }
      return merged
    }

    const created: RuntimeDebugSession = {
      id,
      createdAt: now,
      updatedAt: now,
      meta: mergeMeta({}, meta || {}),
      events: []
    }

    this.state.sessions = {
      ...this.state.sessions,
      [id]: created
    }

    return created
  }

  setActiveSession(sessionId: string) {
    const id = String(sessionId || '').trim()
    if (!id) return
    this.ensureSession(id)
    this.state.activeSessionId = id
  }

  openDrawer(sessionId?: string) {
    if (sessionId) this.setActiveSession(sessionId)
    this.state.drawerOpen = true
  }

  closeDrawer() {
    this.state.drawerOpen = false
  }

  toggleDrawer(sessionId?: string) {
    if (sessionId) this.setActiveSession(sessionId)
    this.state.drawerOpen = !this.state.drawerOpen
  }

  resetSession(
    sessionId: string,
    options: { keepMeta?: boolean; meta?: RuntimeDebugSessionMeta } = {}
  ) {
    const id = String(sessionId || '').trim()
    if (!id) return

    const existing = this.state.sessions[id]
    const now = nowIso()
    const keepMeta = options.keepMeta === true

    const mergedMeta = keepMeta
      ? mergeMeta(existing?.meta || {}, options.meta || {})
      : mergeMeta({}, options.meta || {})

    const next: RuntimeDebugSession = {
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      meta: mergedMeta,
      events: []
    }

    this.state.sessions = { ...this.state.sessions, [id]: next }
  }

  applyRuntimeMeta(sessionId: string, meta: QuestionFlowRuntimeMeta, ctx?: FlowRoutingContext) {
    this.ensureSession(sessionId, {
      sourceKind: meta.sourceKind,
      profileId: meta.profileId,
      moduleId: meta.moduleId,
      moduleDisplayRef: meta.moduleDisplayRef,
      moduleVersionText: meta.moduleVersionText,
      moduleNote: meta.moduleNote,
      ctx: ctx || {}
    })
  }

  record(
    sessionId: string,
    event: { type: string; message: string; payload?: any }
  ): RuntimeDebugEvent | null {
    if (!this.state.enabled) return null

    const id = String(sessionId || '').trim()
    if (!id) return null

    const session = this.ensureSession(id)
    const ts = Date.now()
    const item: RuntimeDebugEvent = {
      id: makeEventId(),
      ts,
      time: formatTime(ts),
      type: String(event.type || 'info'),
      message: String(event.message || ''),
      payload: event.payload
    }

    const events = [item, ...(session.events || [])].slice(0, MAX_EVENTS_PER_SESSION)
    const next: RuntimeDebugSession = {
      ...session,
      updatedAt: nowIso(),
      events
    }

    this.state.sessions = { ...this.state.sessions, [id]: next }
    return item
  }

  exportDiagnostics(sessionId: string) {
    const session = this.getSession(sessionId)
    if (!session) return null

    return {
      exportedAt: nowIso(),
      session: clone(session)
    }
  }

  exportDiagnosticsJson(sessionId: string): string {
    const pack = this.exportDiagnostics(sessionId)
    if (!pack) return ''
    return JSON.stringify(pack, null, 2)
  }
}

export const runtimeDebug = new RuntimeDebugStore()
