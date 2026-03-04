import { reactive } from 'vue'
import type { FlowProfileV1, ListeningChoiceFlowModuleV1, Question } from '/types'
import { runQuestionFlow } from '/app/usecases/runQuestionFlow'
import { flowModules } from '/stores/flowModules'
import { flowProfiles } from '/stores/flowProfiles'
import {
  normalizeListeningChoiceStandardModule
} from '/flows/listeningChoiceFlowModules'
import {
  loadLocalLearningFlows,
  loadLocalLearningQuestions
} from '/infra/repository/localLearningRepository'
import { readFlowExportPackageV2 } from '/infra/repository/flowExportPackage'

export type LearningPartSummary = {
  name: string
  score: number
}

export type LearningUnit = {
  id: string
  textbook: string
  gradeLabel: string
  unitCode: string
  difficulty: number
  recentResult: string
  progress: number
  totalScore: number
  parts: LearningPartSummary[]
  questions: Question[]
}

type FlowExportPayload = {
  schemaVersion: 2
  exportCapabilities?: unknown
  listeningChoiceModules?: unknown
  flowProfiles?: unknown
  publishLogs?: unknown
}

type LocalLearningState = {
  loading: boolean
  hasLoaded: boolean
  loadError: string
  units: LearningUnit[]
  activeUnitId: string
  currentQuestionIndex: number
  currentQuestionStepIndex: number
  answers: Record<string, string | string[]>
  runtimeQuestion: Question | null
  flowImportCapabilities: string[]
}

const PART_ORDER = ['听后选择', '听后回答', '听后转述', '短文朗读']

export const localLearningState = reactive<LocalLearningState>({
  loading: false,
  hasLoaded: false,
  loadError: '',
  units: [],
  activeUnitId: '',
  currentQuestionIndex: 0,
  currentQuestionStepIndex: 0,
  answers: {},
  runtimeQuestion: null,
  flowImportCapabilities: []
})

let loadPromise: Promise<void> | null = null

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function toFinite(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function toPercent(value: unknown): number {
  const raw = toFinite(value, 0)
  const normalized = raw <= 1 ? raw * 100 : raw
  return Math.max(0, Math.min(100, Math.round(normalized)))
}

function readMetadata(question: Question): Record<string, unknown> {
  const metadata = (question as { metadata?: unknown }).metadata
  return isObjectRecord(metadata) ? metadata : {}
}

function extractUnitCode(questionId: string): string {
  const source = normalizeText(questionId).toUpperCase()
  const match = source.match(/(SU\d+[A-Z]?|U\d+[A-Z]?)/)
  return match ? match[1] : 'UNIT'
}

function resolveUnitDescriptor(question: Question) {
  const metadata = readMetadata(question)
  const textbook = normalizeText(metadata.textbook)
    || normalizeText(metadata.book)
    || normalizeText(metadata.source)
    || '本地教材'
  const gradeLabel = normalizeText(metadata.gradeLabel)
    || normalizeText(metadata.grade)
    || ''
  const unitCode = normalizeText(metadata.unitCode)
    || normalizeText(metadata.unit)
    || extractUnitCode(String(question.id || ''))
  return { textbook, gradeLabel, unitCode }
}

function resolvePartName(question: Question): string {
  const metadata = readMetadata(question)
  const fromMeta = normalizeText(metadata.partName)
  if (fromMeta) return fromMeta
  if (question.type === 'listening_choice') return '听后选择'
  if (question.type === 'speaking_hear_answer') return '听后回答'
  if (question.type === 'speaking_steps') return '听后转述'
  return '综合训练'
}

function resolvePartScore(question: Question): number {
  const metadata = readMetadata(question)
  const score = Math.floor(toFinite(metadata.partScore, toFinite(metadata.score, 10)))
  if (!Number.isFinite(score) || score <= 0) return 10
  return score
}

function resolveRecentResult(question: Question): string {
  const metadata = readMetadata(question)
  return normalizeText(metadata.recentResult)
    || normalizeText(metadata.recentScore)
    || '暂无练习'
}

function resolveDifficulty(question: Question): number {
  const metadata = readMetadata(question)
  return clamp01(toFinite(metadata.difficulty, 0.75))
}

function resolveProgress(question: Question): number {
  const metadata = readMetadata(question)
  return toPercent(metadata.progress)
}

function sortPartSummaries(parts: LearningPartSummary[]): LearningPartSummary[] {
  return [...parts].sort((a, b) => {
    const aIndex = PART_ORDER.indexOf(a.name)
    const bIndex = PART_ORDER.indexOf(b.name)
    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
}

function buildUnits(list: Question[]): LearningUnit[] {
  const map = new Map<string, {
    textbook: string
    gradeLabel: string
    unitCode: string
    questions: Question[]
    difficultyList: number[]
    progressList: number[]
    recentResult: string
    parts: Map<string, number>
  }>()

  ;(list || []).forEach((question) => {
    const descriptor = resolveUnitDescriptor(question)
    const key = `${descriptor.textbook}__${descriptor.gradeLabel}__${descriptor.unitCode}`
    let bucket = map.get(key)
    if (!bucket) {
      bucket = {
        textbook: descriptor.textbook,
        gradeLabel: descriptor.gradeLabel,
        unitCode: descriptor.unitCode,
        questions: [],
        difficultyList: [],
        progressList: [],
        recentResult: '暂无练习',
        parts: new Map<string, number>()
      }
      map.set(key, bucket)
    }

    bucket.questions.push(question)
    bucket.difficultyList.push(resolveDifficulty(question))
    bucket.progressList.push(resolveProgress(question))
    const recentResult = resolveRecentResult(question)
    if (bucket.recentResult === '暂无练习' && recentResult !== '暂无练习') {
      bucket.recentResult = recentResult
    }

    const partName = resolvePartName(question)
    const partScore = resolvePartScore(question)
    const current = bucket.parts.get(partName) || 0
    bucket.parts.set(partName, current + partScore)
  })

  return Array.from(map.entries()).map(([id, bucket]) => {
    const parts = sortPartSummaries(Array.from(bucket.parts.entries()).map(([name, score]) => ({ name, score })))
    const totalScore = parts.reduce((sum, part) => sum + part.score, 0)
    const difficulty = bucket.difficultyList.length > 0
      ? bucket.difficultyList.reduce((sum, n) => sum + n, 0) / bucket.difficultyList.length
      : 0.75
    const progress = bucket.progressList.length > 0
      ? Math.round(bucket.progressList.reduce((sum, n) => sum + n, 0) / bucket.progressList.length)
      : 0
    return {
      id,
      textbook: bucket.textbook,
      gradeLabel: bucket.gradeLabel,
      unitCode: bucket.unitCode,
      difficulty: clamp01(difficulty),
      recentResult: bucket.recentResult,
      progress,
      totalScore,
      parts,
      questions: bucket.questions
    }
  }).sort((a, b) => a.unitCode.localeCompare(b.unitCode))
}

function toListeningChoiceModules(raw: unknown): ListeningChoiceFlowModuleV1[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isObjectRecord)
    .map((item) => {
      const base = normalizeListeningChoiceStandardModule(item)
      const merged = {
        ...(item as Record<string, unknown>),
        ...base,
        kind: 'listening_choice'
      } as ListeningChoiceFlowModuleV1
      return merged
    })
}

function toFlowProfiles(raw: unknown): FlowProfileV1[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isObjectRecord)
    .map((item) => ({ ...item } as FlowProfileV1))
}

function resolveEnabledCapabilities(raw: unknown): string[] {
  if (!isObjectRecord(raw)) return []
  const out: string[] = []
  const entries = Object.entries(raw)
  for (const [key, value] of entries) {
    if (value === true) out.push(String(key))
  }
  return out.sort((a, b) => a.localeCompare(b))
}

function applyFlowPayload(payload: FlowExportPayload) {
  const pack = readFlowExportPackageV2(payload)
  if (!pack) {
    throw new Error('本地流程包格式不合法：仅支持 schemaVersion=2。')
  }

  localLearningState.flowImportCapabilities = resolveEnabledCapabilities(pack.exportCapabilities)

  const modules = toListeningChoiceModules(pack.listeningChoiceModules)
  if (modules.length > 0) {
    flowModules.state.listeningChoice = modules
  }

  const profiles = toFlowProfiles(pack.flowProfiles)
  if (profiles.length > 0) {
    flowProfiles.state.profiles = profiles
  }
}

function readQuestionFlowContext(question: Question) {
  const metadata = readMetadata(question)
  const flowContext = isObjectRecord(metadata.flowContext) ? metadata.flowContext : {}
  return {
    region: normalizeText(flowContext.region),
    scene: normalizeText(flowContext.scene),
    grade: normalizeText(flowContext.grade)
  }
}

export function resolveLoadErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (isObjectRecord(err) && typeof err.errMsg === 'string') return err.errMsg
  if (isObjectRecord(err) && typeof err.message === 'string') return err.message
  if (isObjectRecord(err)) {
    try {
      return JSON.stringify(err)
    } catch {}
  }
  return String(err || '未知错误')
}

function syncUnitSelection() {
  if (localLearningState.units.length <= 0) {
    localLearningState.activeUnitId = ''
    localLearningState.runtimeQuestion = null
    return
  }
  const exists = localLearningState.units.some((unit) => unit.id === localLearningState.activeUnitId)
  if (!exists) {
    localLearningState.activeUnitId = localLearningState.units[0].id
  }
}

export async function ensureLocalLearningLoaded(forceReload = false): Promise<void> {
  if (!forceReload && localLearningState.hasLoaded) return
  if (!forceReload && loadPromise) return loadPromise

  const run = async () => {
    localLearningState.loading = true
    localLearningState.loadError = ''
    try {
      const [questionList, flowPayload] = await Promise.all([
        loadLocalLearningQuestions<Question>(),
        loadLocalLearningFlows<FlowExportPayload>()
      ])
      applyFlowPayload(flowPayload)
      localLearningState.units = buildUnits(questionList)
      syncUnitSelection()
      localLearningState.hasLoaded = true
    } catch (err) {
      localLearningState.loadError = resolveLoadErrorMessage(err)
      localLearningState.hasLoaded = false
    } finally {
      localLearningState.loading = false
    }
  }

  loadPromise = run()
  try {
    await loadPromise
  } finally {
    loadPromise = null
  }
}

export function getActiveLearningUnit(): LearningUnit | null {
  return localLearningState.units.find((item) => item.id === localLearningState.activeUnitId) || null
}

export function selectLearningUnit(unitId: string) {
  localLearningState.activeUnitId = String(unitId || '')
}

export function prepareLocalLearningRuntimeQuestion() {
  const unit = getActiveLearningUnit()
  if (!unit) {
    localLearningState.runtimeQuestion = null
    return
  }

  const q = unit.questions[localLearningState.currentQuestionIndex]
  if (!q) {
    localLearningState.runtimeQuestion = null
    return
  }

  const resolved = runQuestionFlow(q, {
    ctx: readQuestionFlowContext(q)
  })
  localLearningState.runtimeQuestion = resolved.resolvedQuestion
  localLearningState.currentQuestionStepIndex = 0
}

export function startLocalLearningPractice() {
  if (!getActiveLearningUnit()) return
  localLearningState.currentQuestionIndex = 0
  localLearningState.currentQuestionStepIndex = 0
  localLearningState.answers = {}
  prepareLocalLearningRuntimeQuestion()
}

export function setLocalLearningAnswer(subQuestionId: string, value: string | string[]) {
  localLearningState.answers = {
    ...localLearningState.answers,
    [subQuestionId]: value
  }
}

export function setLocalLearningStepIndex(step: number) {
  localLearningState.currentQuestionStepIndex = Math.max(0, Math.floor(Number(step || 0)))
}

type RuntimeQuestionLike = Question & {
  flow?: { steps?: unknown[] }
  steps?: unknown[]
  totalSteps?: unknown
}

export function resolveRuntimeQuestionStepCount(question: Question | null | undefined): number {
  const q = question as RuntimeQuestionLike | null | undefined
  if (!q) return 0

  if (q.type === 'listening_choice' || q.type === 'speaking_hear_answer') {
    return Array.isArray(q.flow?.steps) ? q.flow.steps.length : 0
  }

  if (q.type === 'speaking_steps') {
    const totalSteps = Number(q.totalSteps)
    if (Number.isFinite(totalSteps) && totalSteps > 0) return Math.floor(totalSteps)
    return Array.isArray(q.steps) ? q.steps.length : 0
  }

  return 0
}
