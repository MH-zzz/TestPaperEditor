import { computed, ref, watch, type Ref } from 'vue'
import type { FlowVisualEdge, FlowVisualGraph, FlowVisualNode, ListeningChoiceQuestion } from '/types'
import {
  compileFlowVisualGraphToLinearSteps,
  type ResolveFlowMacroSnippet
} from '/domain/flow-visual/usecases/compileGraphToSteps'
import {
  buildLinearFlowFixSuggestions,
  type FlowLinearFixSuggestion
} from '/domain/flow-visual/usecases/buildLinearFlowFixSuggestions'
import type { FlowSnippetTemplateStep } from '/domain/flow-visual/usecases/buildFlowSnippetTemplate'
import {
  buildListeningChoiceReadonlyFlowGraph,
  type ReadonlyFlowNodePayload,
  type ReadonlyFlowStepCategory
} from './useReadonlyFlowGraph'

export type EditableFlowNodePayload = {
  index: number
  stepId: string
  stepKind: string
  autoNext: string
  autoNextLabel: string
  category: ReadonlyFlowStepCategory
  categoryLabel: string
  groupId: string
  questionCount: number
  nodeKind?: 'macroNode'
  snippet?: {
    baseId?: string
    version?: number
    hash?: string
  }
  binding?: {
    groupBindingMode?: 'inherit' | 'fixed' | 'empty'
    groupId?: string
    autoNextMode?: 'inherit' | 'override'
    autoNext?: string
  }
  expandedStepCount?: number
}

export type FlowStencilItem = {
  kind: string
  label: string
  color: string
  category: ReadonlyFlowStepCategory
  categoryLabel: string
  description: string
  defaultAutoNext: string
}

export type FlowVisualNodePatch = {
  stepKind?: string
  autoNext?: string
  groupId?: string
  macroSnippetBaseId?: string
  macroSnippetVersion?: string
  macroSnippetHash?: string
  macroGroupBindingMode?: string
  macroGroupId?: string
  macroAutoNextMode?: string
  macroAutoNext?: string
}

export type FlowNodeDropPosition = 'before' | 'after'

export type FlowPropertyFieldKey = keyof FlowVisualNodePatch

export type FlowPropertyFieldOption = {
  label: string
  value: string
}

export type FlowPropertyField = {
  key: FlowPropertyFieldKey
  label: string
  type: 'text' | 'select'
  placeholder?: string
  options?: FlowPropertyFieldOption[]
  hint?: string
}

export type FlowLinearConstraintCheck = {
  key: 'single_entry' | 'single_exit' | 'no_branch' | 'no_cycle' | 'fully_connected'
  label: string
  ok: boolean
  detail: string
  errorCode: string
}

export type FlowVisualInsertResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

export type FlowSnippetCaptureResult =
  | {
    ok: true
    suggestedName: string
    steps: FlowSnippetTemplateStep[]
    selectedNodeIds: string[]
  }
  | {
    ok: false
    code: string
    message: string
  }

export type FlowVisualBulkPatchResult =
  | {
    ok: true
    updatedNodeCount: number
  }
  | {
    ok: false
    code: string
    message: string
  }

export type FlowMacroSnippetRefInput = {
  baseId: string
  version: number
  hash?: string
  stepCount?: number
}

const STENCIL_ITEMS: FlowStencilItem[] = [
  { kind: 'intro', label: '介绍页', color: '#2563eb', category: 'control', categoryLabel: '控制', description: '展示题型介绍与说明', defaultAutoNext: 'tapNext' },
  { kind: 'countdown', label: '倒计时', color: '#f59e0b', category: 'control', categoryLabel: '控制', description: '等待倒计时结束自动推进', defaultAutoNext: 'countdownEnded' },
  { kind: 'playAudio', label: '播放音频', color: '#0284c7', category: 'media', categoryLabel: '媒体', description: '播放描述或正文音频', defaultAutoNext: 'audioEnded' },
  { kind: 'promptTone', label: '提示音', color: '#0ea5e9', category: 'media', categoryLabel: '媒体', description: '播放提示音后继续', defaultAutoNext: 'audioEnded' },
  { kind: 'answerChoice', label: '答题', color: '#16a34a', category: 'interaction', categoryLabel: '交互', description: '进入作答并等待时间结束', defaultAutoNext: 'timeEnded' },
  { kind: 'contextInfo', label: '上下文提示', color: '#7c3aed', category: 'control', categoryLabel: '控制', description: '展示上下文信息后继续', defaultAutoNext: 'tapNext' },
  { kind: 'macroNode', label: '宏节点', color: '#9333ea', category: 'control', categoryLabel: '复合', description: '引用流程片段并在编译阶段展开', defaultAutoNext: '' }
]

const AUTO_NEXT_LABEL: Record<string, string> = {
  audioEnded: '音频结束自动推进',
  countdownEnded: '倒计时结束自动推进',
  timeEnded: '作答时间结束自动推进',
  tapNext: '手动点击下一步'
}

const STEP_KIND_OPTIONS: FlowPropertyFieldOption[] = STENCIL_ITEMS.map((item) => ({
  label: item.label,
  value: item.kind
}))

const AUTO_NEXT_OPTIONS: FlowPropertyFieldOption[] = [
  { label: '手动推进', value: 'tapNext' },
  { label: '音频结束', value: 'audioEnded' },
  { label: '倒计时结束', value: 'countdownEnded' },
  { label: '作答时间结束', value: 'timeEnded' }
]

const MACRO_GROUP_BINDING_OPTIONS: FlowPropertyFieldOption[] = [
  { label: '继承上下文', value: 'inherit' },
  { label: '固定题组', value: 'fixed' },
  { label: '强制清空', value: 'empty' }
]

const MACRO_AUTO_NEXT_OPTIONS: FlowPropertyFieldOption[] = [
  { label: '继承片段', value: 'inherit' },
  { label: '覆盖触发', value: 'override' }
]

const NODE_WIDTH = 190
const NODE_HEIGHT = 70
const NODE_GAP_Y = 56
const NODE_START_X = 56
const NODE_START_Y = 34
const CANVAS_WIDTH = 320

function readMeta(kind: string): FlowStencilItem {
  const key = String(kind || '')
  const hit = STENCIL_ITEMS.find((item) => item.kind === key)
  if (hit) return hit
  return {
    kind: key || 'unknown',
    label: key || '未知步骤',
    color: '#475569',
    category: 'misc',
    categoryLabel: '其他',
    description: '未注册步骤',
    defaultAutoNext: ''
  }
}

function resolveAutoNextLabel(autoNext: string): string {
  const value = String(autoNext || '')
  if (!value) return '未配置自动推进'
  return AUTO_NEXT_LABEL[value] || `触发：${value}`
}

function normalizeMacroGroupBindingMode(value: unknown): 'inherit' | 'fixed' | 'empty' {
  const text = String(value || '').trim()
  if (text === 'fixed') return 'fixed'
  if (text === 'empty') return 'empty'
  return 'inherit'
}

function normalizeMacroAutoNextMode(value: unknown): 'inherit' | 'override' {
  return String(value || '').trim() === 'override' ? 'override' : 'inherit'
}

function normalizeMacroSnippetVersion(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.floor(parsed)
}

function normalizeMacroExpandedStepCount(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.floor(parsed))
}

function isMacroNodeStep(stepKind: string): boolean {
  return String(stepKind || '').trim() === 'macroNode'
}

function composeMacroNodeSubtitle(payload: EditableFlowNodePayload): string {
  const snippetBaseId = String(payload.snippet?.baseId || '').trim()
  const snippetVersion = Math.max(0, normalizeMacroSnippetVersion(payload.snippet?.version))
  const groupBindingMode = normalizeMacroGroupBindingMode(payload.binding?.groupBindingMode)
  const autoNextMode = normalizeMacroAutoNextMode(payload.binding?.autoNextMode)
  const parts: string[] = [
    snippetBaseId ? `片段 ${snippetBaseId}@v${snippetVersion || '?'}` : '片段未绑定'
  ]

  if (groupBindingMode === 'fixed') {
    parts.push(`题组固定 ${String(payload.binding?.groupId || '').trim() || '-'}`)
  } else if (groupBindingMode === 'inherit') {
    parts.push(`题组继承 ${payload.groupId || '-'}`)
  } else {
    parts.push('题组清空')
  }

  if (autoNextMode === 'override') {
    parts.push(`推进覆盖 ${String(payload.binding?.autoNext || '').trim() || '-'}`)
  } else {
    parts.push('推进继承片段')
  }
  return parts.join(' · ')
}

function composeNodeSubtitle(payload: EditableFlowNodePayload): string {
  if (isMacroNodeStep(payload.stepKind)) {
    return composeMacroNodeSubtitle(payload)
  }
  const parts: string[] = [payload.autoNextLabel]
  if (payload.groupId) parts.push(`题组 ${payload.groupId}`)
  if (payload.questionCount > 0) parts.push(`小题 ${payload.questionCount}`)
  return parts.join(' · ')
}

function buildPropertyFieldsByStepKind(stepKind: string): FlowPropertyField[] {
  const kind = String(stepKind || '').trim()
  if (isMacroNodeStep(kind)) {
    return [
      {
        key: 'stepKind',
        label: '节点类型',
        type: 'select',
        options: STEP_KIND_OPTIONS,
        hint: '宏节点在编译阶段展开为多个步骤。'
      },
      {
        key: 'macroSnippetBaseId',
        label: '片段 BaseId',
        type: 'text',
        placeholder: '例如：snippet_listen_answer_loop'
      },
      {
        key: 'macroSnippetVersion',
        label: '片段版本',
        type: 'text',
        placeholder: '例如：3',
        hint: '版本必须为正整数。'
      },
      {
        key: 'macroSnippetHash',
        label: '片段 Hash（可选）',
        type: 'text',
        placeholder: '例如：ab12cd'
      },
      {
        key: 'groupId',
        label: '上下文题组 ID',
        type: 'text',
        placeholder: '例如：group_1',
        hint: '当组绑定模式为“继承上下文”时生效。'
      },
      {
        key: 'macroGroupBindingMode',
        label: '题组绑定策略',
        type: 'select',
        options: MACRO_GROUP_BINDING_OPTIONS
      },
      {
        key: 'macroGroupId',
        label: '固定题组 ID',
        type: 'text',
        placeholder: '例如：group_2',
        hint: '仅在“固定题组”模式下生效。'
      },
      {
        key: 'macroAutoNextMode',
        label: '自动推进策略',
        type: 'select',
        options: MACRO_AUTO_NEXT_OPTIONS
      },
      {
        key: 'macroAutoNext',
        label: '覆盖自动推进',
        type: 'text',
        placeholder: '例如：audioEnded',
        hint: '仅在“覆盖触发”模式下生效。'
      }
    ]
  }

  const fields: FlowPropertyField[] = [
    {
      key: 'stepKind',
      label: '步骤类型',
      type: 'select',
      options: STEP_KIND_OPTIONS,
      hint: '切换类型后将保留通用字段（autoNext/groupId）。'
    },
    {
      key: 'autoNext',
      label: '自动推进',
      type: 'select',
      options: AUTO_NEXT_OPTIONS
    }
  ]

  // Intro-like steps do not require group binding.
  if (kind === 'intro' || kind === 'finish' || kind === 'contextInfo') {
    return fields
  }

  fields.push({
    key: 'groupId',
    label: '题组 ID',
    type: 'text',
    placeholder: '例如：group_1',
    hint: '按需填写；为空时由运行时按默认规则处理。'
  })
  return fields
}

function buildNodeId(kind: string): string {
  const seed = Math.random().toString(36).slice(2, 8)
  return `visual_${String(kind || 'step')}_${Date.now()}_${seed}`
}

function relayoutNode(
  node: FlowVisualNode<EditableFlowNodePayload>,
  index: number
): FlowVisualNode<EditableFlowNodePayload> {
  const stepKind = String(node.data?.stepKind || node.kind || '').trim()
  const meta = readMeta(stepKind)
  const isMacro = isMacroNodeStep(stepKind)
  const macroGroupBindingMode = normalizeMacroGroupBindingMode(node.data?.binding?.groupBindingMode)
  const macroAutoNextMode = normalizeMacroAutoNextMode(node.data?.binding?.autoNextMode)
  const macroGroupId = String(node.data?.binding?.groupId || '').trim()
  const macroAutoNext = String(node.data?.binding?.autoNext || '').trim()
  const macroSnippetBaseId = String(node.data?.snippet?.baseId || '').trim()
  const macroSnippetHash = String(node.data?.snippet?.hash || '').trim()
  const macroSnippetVersion = normalizeMacroSnippetVersion(node.data?.snippet?.version)
  const data: EditableFlowNodePayload = {
    ...node.data,
    index,
    stepKind: stepKind || meta.kind,
    autoNext: String(node.data?.autoNext || ''),
    autoNextLabel: resolveAutoNextLabel(String(node.data?.autoNext || '')),
    category: meta.category,
    categoryLabel: meta.categoryLabel,
    groupId: String(node.data?.groupId || ''),
    questionCount: Number(node.data?.questionCount || 0),
    stepId: String(node.data?.stepId || node.id || buildNodeId(meta.kind))
  }

  if (isMacro) {
    data.nodeKind = 'macroNode'
    data.snippet = {
      baseId: macroSnippetBaseId,
      version: macroSnippetVersion,
      hash: macroSnippetHash || undefined
    }
    data.binding = {
      groupBindingMode: macroGroupBindingMode,
      groupId: macroGroupBindingMode === 'fixed' ? macroGroupId : undefined,
      autoNextMode: macroAutoNextMode,
      autoNext: macroAutoNextMode === 'override' ? macroAutoNext : undefined
    }
    data.expandedStepCount = normalizeMacroExpandedStepCount(node.data?.expandedStepCount)
    data.autoNext = macroAutoNextMode === 'override' ? macroAutoNext : ''
    data.autoNextLabel = macroAutoNextMode === 'override'
      ? resolveAutoNextLabel(macroAutoNext)
      : '继承片段'
  } else {
    data.nodeKind = undefined
    data.snippet = undefined
    data.binding = undefined
    data.expandedStepCount = undefined
  }

  return {
    ...node,
    kind: data.stepKind,
    label: `${index + 1}. ${meta.label}`,
    subtitle: composeNodeSubtitle(data),
    color: meta.color,
    position: {
      x: NODE_START_X,
      y: NODE_START_Y + index * (NODE_HEIGHT + NODE_GAP_Y)
    },
    size: {
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    },
    data
  }
}

function relayoutNodes(nodes: FlowVisualNode<EditableFlowNodePayload>[]): FlowVisualNode<EditableFlowNodePayload>[] {
  return (nodes || []).map((node, index) => relayoutNode(node, index))
}

function buildEdges(nodes: FlowVisualNode<EditableFlowNodePayload>[]): FlowVisualEdge[] {
  const result: FlowVisualEdge[] = []
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const source = nodes[i]
    const target = nodes[i + 1]
    const sourceBottom = source.position.y + source.size.height
    const targetTop = target.position.y
    result.push({
      id: `edge_${source.id}_${target.id}`,
      source: source.id,
      target: target.id,
      x: Math.round(source.position.x + source.size.width / 2),
      y: sourceBottom,
      height: Math.max(8, targetTop - sourceBottom)
    })
  }
  return result
}

function buildCanvasHeight(nodeCount: number): number {
  if (nodeCount <= 0) return 180
  return NODE_START_Y + nodeCount * (NODE_HEIGHT + NODE_GAP_Y) - NODE_GAP_Y + 46
}

type GraphConstraintStats = {
  entryCount: number
  exitCount: number
  branchNodeCount: number
  hasCycle: boolean
  disconnectedNodeCount: number
}

function buildGraphConstraintStats(graph: FlowVisualGraph): GraphConstraintStats {
  const nodes = graph.nodes || []
  const edges = graph.edges || []
  const inMap = new Map<string, number>()
  const outMap = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const node of nodes) {
    inMap.set(node.id, 0)
    outMap.set(node.id, [])
    inDegree.set(node.id, 0)
  }

  for (const edge of edges) {
    const source = String(edge.source || '')
    const target = String(edge.target || '')
    if (!inMap.has(source) || !inMap.has(target)) continue
    outMap.get(source)?.push(target)
    inMap.set(target, (inMap.get(target) || 0) + 1)
    inDegree.set(target, (inDegree.get(target) || 0) + 1)
  }

  const entryIds = nodes
    .map((node) => String(node.id || ''))
    .filter((id) => (inMap.get(id) || 0) === 0)
  const exitCount = nodes.filter((node) => (outMap.get(node.id)?.length || 0) === 0).length
  const branchNodeCount = nodes.filter((node) => {
    const incoming = inMap.get(node.id) || 0
    const outgoing = outMap.get(node.id)?.length || 0
    return incoming > 1 || outgoing > 1
  }).length

  const topoQueue: string[] = []
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) topoQueue.push(id)
  }
  let visitedByTopo = 0
  while (topoQueue.length > 0) {
    const current = topoQueue.shift() as string
    visitedByTopo += 1
    for (const next of outMap.get(current) || []) {
      const deg = (inDegree.get(next) || 0) - 1
      inDegree.set(next, deg)
      if (deg === 0) topoQueue.push(next)
    }
  }
  const hasCycle = nodes.length > 0 && visitedByTopo !== nodes.length

  let disconnectedNodeCount = 0
  if (entryIds.length === 1) {
    const reachable = new Set<string>()
    const queue: string[] = [entryIds[0]]
    while (queue.length > 0) {
      const current = queue.shift() as string
      if (reachable.has(current)) continue
      reachable.add(current)
      for (const next of outMap.get(current) || []) {
        if (!reachable.has(next)) queue.push(next)
      }
    }
    disconnectedNodeCount = Math.max(0, nodes.length - reachable.size)
  } else if (nodes.length > 1) {
    disconnectedNodeCount = nodes.length
  }

  return {
    entryCount: entryIds.length,
    exitCount,
    branchNodeCount,
    hasCycle,
    disconnectedNodeCount
  }
}

function createStencilNode(
  kind: string,
  index: number,
  overrides?: {
    autoNext?: string
    groupId?: string
  }
): FlowVisualNode<EditableFlowNodePayload> {
  const meta = readMeta(kind)
  const isMacro = isMacroNodeStep(meta.kind)
  const autoNext = typeof overrides?.autoNext === 'string'
    ? String(overrides.autoNext || '').trim()
    : meta.defaultAutoNext
  const payload: EditableFlowNodePayload = {
    index,
    stepId: buildNodeId(meta.kind),
    stepKind: meta.kind,
    autoNext,
    autoNextLabel: resolveAutoNextLabel(autoNext),
    category: meta.category,
    categoryLabel: meta.categoryLabel,
    groupId: String(overrides?.groupId || ''),
    questionCount: 0,
    nodeKind: isMacro ? 'macroNode' : undefined,
    snippet: isMacro
      ? {
        baseId: '',
        version: 1
      }
      : undefined,
    binding: isMacro
      ? {
        groupBindingMode: 'inherit',
        autoNextMode: 'inherit'
      }
      : undefined,
    expandedStepCount: isMacro ? 1 : undefined
  }
  return relayoutNode({
    id: buildNodeId(meta.kind),
    kind: meta.kind,
    label: `${index + 1}. ${meta.label}`,
    subtitle: composeNodeSubtitle(payload),
    color: meta.color,
    position: { x: 0, y: 0 },
    size: { width: NODE_WIDTH, height: NODE_HEIGHT },
    data: payload
  }, index)
}

function findFirstNodeIndexByKind(nodes: FlowVisualNode<EditableFlowNodePayload>[], kind: string): number {
  const target = String(kind || '').trim()
  for (let i = 0; i < (nodes || []).length; i += 1) {
    const current = nodes[i]
    const currentKind = String(current?.data?.stepKind || current?.kind || '').trim()
    if (currentKind === target) return i
  }
  return -1
}

function validateStencilInsertion(
  nodes: FlowVisualNode<EditableFlowNodePayload>[],
  kind: string,
  insertIndex: number
): FlowVisualInsertResult {
  const nextKind = String(kind || '').trim()
  const safeInsertIndex = Math.max(0, Math.min(insertIndex, nodes.length))
  const currentKinds = (nodes || []).map((item) => String(item?.data?.stepKind || item?.kind || ''))

  if (nextKind === 'intro') {
    const hasIntro = currentKinds.some((item) => item === 'intro')
    if (hasIntro) {
      return { ok: false, code: 'intro_duplicate', message: '介绍页步骤只能存在 1 个。' }
    }
    if (safeInsertIndex !== 0) {
      return { ok: false, code: 'intro_must_be_first', message: '介绍页步骤必须放在流程首位。' }
    }
  }

  if (nextKind === 'answerChoice') {
    const hasPlayAudioBefore = currentKinds
      .slice(0, safeInsertIndex)
      .some((item) => item === 'playAudio' || item === 'macroNode')
    if (!hasPlayAudioBefore) {
      return { ok: false, code: 'answer_requires_play_audio', message: '答题步骤前至少需要 1 个播放音频步骤（或宏节点）。' }
    }
  }

  if (nextKind === 'countdown' && safeInsertIndex <= 0) {
    return { ok: false, code: 'countdown_requires_prev_step', message: '倒计时步骤不能作为首步骤。' }
  }

  return { ok: true }
}

function normalizeSnippetTemplateSteps(steps: FlowSnippetTemplateStep[]): FlowSnippetTemplateStep[] {
  const source = Array.isArray(steps) ? steps : []
  const result: FlowSnippetTemplateStep[] = []
  for (const item of source) {
    const kind = String(item?.kind || '').trim()
    if (!kind) continue
    result.push({
      kind,
      autoNext: String(item?.autoNext || '').trim(),
      groupBinding: item?.groupBinding === 'inherit' ? 'inherit' : 'empty'
    })
  }
  return result
}

function normalizeMacroSnippetRef(input: FlowMacroSnippetRefInput | null | undefined): FlowMacroSnippetRefInput | null {
  if (!input || typeof input !== 'object') return null
  const baseId = String(input.baseId || '').trim()
  const version = Math.floor(Number(input.version || 0))
  if (!baseId || version <= 0) return null
  const hash = String(input.hash || '').trim()
  const stepCount = Math.max(1, Math.floor(Number(input.stepCount || 1)))
  return {
    baseId,
    version,
    hash: hash || undefined,
    stepCount
  }
}

function readAllowedFieldKeySetByStepKind(stepKind: string): Set<FlowPropertyFieldKey> {
  const fields = buildPropertyFieldsByStepKind(stepKind)
  return new Set(fields.map((item) => item.key))
}

function readPatchValue(raw: string | undefined): string {
  return String(raw || '').trim()
}

function applyNodePatchPayload(
  payload: EditableFlowNodePayload,
  patch: FlowVisualNodePatch,
  allowedKeys?: Set<FlowPropertyFieldKey>
): EditableFlowNodePayload {
  const canWrite = (key: FlowPropertyFieldKey): boolean => !allowedKeys || allowedKeys.has(key)

  let nextStepKind = payload.stepKind
  if (patch.stepKind !== undefined && canWrite('stepKind')) {
    const value = readPatchValue(patch.stepKind)
    if (value) nextStepKind = value
  }

  let nextAutoNext = payload.autoNext
  if (patch.autoNext !== undefined && canWrite('autoNext')) {
    nextAutoNext = readPatchValue(patch.autoNext)
  }

  let nextGroupId = payload.groupId
  if (patch.groupId !== undefined && canWrite('groupId')) {
    nextGroupId = readPatchValue(patch.groupId)
  }

  let macroSnippetBaseId = String(payload.snippet?.baseId || '').trim()
  if (patch.macroSnippetBaseId !== undefined && canWrite('macroSnippetBaseId')) {
    macroSnippetBaseId = readPatchValue(patch.macroSnippetBaseId)
  }

  let macroSnippetHash = String(payload.snippet?.hash || '').trim()
  if (patch.macroSnippetHash !== undefined && canWrite('macroSnippetHash')) {
    macroSnippetHash = readPatchValue(patch.macroSnippetHash)
  }

  let macroSnippetVersion = normalizeMacroSnippetVersion(payload.snippet?.version)
  if (macroSnippetVersion <= 0) macroSnippetVersion = 1
  if (patch.macroSnippetVersion !== undefined && canWrite('macroSnippetVersion')) {
    const raw = readPatchValue(patch.macroSnippetVersion)
    macroSnippetVersion = raw ? normalizeMacroSnippetVersion(raw) : 0
  }

  let macroGroupBindingMode = normalizeMacroGroupBindingMode(payload.binding?.groupBindingMode)
  if (patch.macroGroupBindingMode !== undefined && canWrite('macroGroupBindingMode')) {
    macroGroupBindingMode = normalizeMacroGroupBindingMode(patch.macroGroupBindingMode)
  }

  let macroGroupId = String(payload.binding?.groupId || '').trim()
  if (patch.macroGroupId !== undefined && canWrite('macroGroupId')) {
    macroGroupId = readPatchValue(patch.macroGroupId)
  }

  let macroAutoNextMode = normalizeMacroAutoNextMode(payload.binding?.autoNextMode)
  if (patch.macroAutoNextMode !== undefined && canWrite('macroAutoNextMode')) {
    macroAutoNextMode = normalizeMacroAutoNextMode(patch.macroAutoNextMode)
  }

  let macroAutoNext = String(payload.binding?.autoNext || '').trim()
  if (patch.macroAutoNext !== undefined && canWrite('macroAutoNext')) {
    macroAutoNext = readPatchValue(patch.macroAutoNext)
  }

  const nextPayload: EditableFlowNodePayload = {
    ...payload,
    stepKind: nextStepKind,
    autoNext: nextAutoNext,
    groupId: nextGroupId
  }

  if (isMacroNodeStep(nextStepKind)) {
    nextPayload.nodeKind = 'macroNode'
    nextPayload.snippet = {
      baseId: macroSnippetBaseId,
      version: macroSnippetVersion,
      hash: macroSnippetHash || undefined
    }
    nextPayload.binding = {
      groupBindingMode: macroGroupBindingMode,
      groupId: macroGroupBindingMode === 'fixed' ? macroGroupId : undefined,
      autoNextMode: macroAutoNextMode,
      autoNext: macroAutoNextMode === 'override' ? macroAutoNext : undefined
    }
    nextPayload.expandedStepCount = normalizeMacroExpandedStepCount(payload.expandedStepCount)
  } else {
    nextPayload.nodeKind = undefined
    nextPayload.snippet = undefined
    nextPayload.binding = undefined
    nextPayload.expandedStepCount = undefined
  }

  return nextPayload
}

function isSameEditableNodePayload(
  a: EditableFlowNodePayload,
  b: EditableFlowNodePayload
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function createEditableNodeFromReadonly(
  node: FlowVisualNode<ReadonlyFlowNodePayload>,
  index: number
): FlowVisualNode<EditableFlowNodePayload> {
  const payload: EditableFlowNodePayload = {
    index,
    stepId: String(node.data?.stepId || node.id || buildNodeId(node.kind)),
    stepKind: String(node.data?.stepKind || node.kind || ''),
    autoNext: String(node.data?.autoNext || ''),
    autoNextLabel: resolveAutoNextLabel(String(node.data?.autoNext || '')),
    category: node.data?.category || 'misc',
    categoryLabel: node.data?.categoryLabel || '其他',
    groupId: String(node.data?.groupId || ''),
    questionCount: Number(node.data?.questionCount || 0)
  }
  return relayoutNode({
    id: String(node.id || buildNodeId(payload.stepKind)),
    kind: payload.stepKind,
    label: node.label,
    subtitle: node.subtitle,
    color: node.color,
    position: node.position,
    size: node.size,
    data: payload
  }, index)
}

type ListeningChoiceStep = ListeningChoiceQuestion['flow']['steps'][number]

function buildStepSignature(question: ListeningChoiceQuestion | null | undefined): string {
  const steps = question?.flow?.steps || []
  if (!Array.isArray(steps) || steps.length <= 0) return ''
  const lines: string[] = []
  for (const step of steps) {
    const groupId = String((step as ListeningChoiceStep & { groupId?: unknown }).groupId || '')
    lines.push([step.id, step.kind, String(step.autoNext || ''), groupId].join('|'))
  }
  return lines.join('>')
}

type UseEditableFlowGraphOptions = {
  resolveMacroSnippet?: ResolveFlowMacroSnippet
}

export function useEditableFlowGraph(
  questionRef: Ref<ListeningChoiceQuestion | null | undefined>,
  options: UseEditableFlowGraphOptions = {}
) {
  const nodes = ref<FlowVisualNode<EditableFlowNodePayload>[]>([])
  const selectedNodeId = ref('')
  const snippetSelectionAnchorId = ref('')
  const recentlyMovedNodeId = ref('')
  const dirty = ref(false)
  const lastDirtyAction = ref('')
  const lastDirtyAt = ref(0)
  const lastCleanReason = ref('')
  const lastCleanAt = ref(0)
  const lastQuestionSignature = ref('')
  const historyPast = ref<FlowVisualNode<EditableFlowNodePayload>[][]>([])
  const historyFuture = ref<FlowVisualNode<EditableFlowNodePayload>[][]>([])
  const HISTORY_LIMIT = 40
  let movedTimer: ReturnType<typeof setTimeout> | null = null

  function markDirty(action: string) {
    dirty.value = true
    lastDirtyAction.value = String(action || 'unknown')
    lastDirtyAt.value = Date.now()
  }

  function markClean(reason: string) {
    dirty.value = false
    lastCleanReason.value = String(reason || 'unknown')
    lastCleanAt.value = Date.now()
  }

  function markRecentlyMoved(nodeId: string) {
    const id = String(nodeId || '')
    if (!id) return
    recentlyMovedNodeId.value = id
    if (movedTimer) clearTimeout(movedTimer)
    movedTimer = setTimeout(() => {
      recentlyMovedNodeId.value = ''
      movedTimer = null
    }, 420)
  }

  function ensureSelectedNode() {
    const list = nodes.value || []
    if (list.length <= 0) {
      selectedNodeId.value = ''
      snippetSelectionAnchorId.value = ''
      return
    }
    const hit = list.some((item) => item.id === selectedNodeId.value)
    if (!hit) selectedNodeId.value = list[0].id
    const anchorHit = list.some((item) => item.id === snippetSelectionAnchorId.value)
    if (!anchorHit) snippetSelectionAnchorId.value = ''
  }

  function cloneNodes(source: FlowVisualNode<EditableFlowNodePayload>[]): FlowVisualNode<EditableFlowNodePayload>[] {
    return JSON.parse(JSON.stringify(source || [])) as FlowVisualNode<EditableFlowNodePayload>[]
  }

  function pushHistorySnapshot() {
    historyPast.value.push(cloneNodes(nodes.value))
    if (historyPast.value.length > HISTORY_LIMIT) historyPast.value.shift()
    historyFuture.value = []
  }

  function resetHistory() {
    historyPast.value = []
    historyFuture.value = []
  }

  function loadFromQuestion(question: ListeningChoiceQuestion | null | undefined) {
    const graph = buildListeningChoiceReadonlyFlowGraph(question)
    const nextNodes = (graph.nodes || []).map((item, index) => createEditableNodeFromReadonly(item, index))
    nodes.value = relayoutNodes(nextNodes)
    resetHistory()
    markClean('load_from_question')
    ensureSelectedNode()
  }

  function reloadFromQuestion() {
    const question = questionRef.value
    lastQuestionSignature.value = buildStepSignature(question)
    loadFromQuestion(question)
  }

  function clearDirty() {
    markClean('clear_dirty')
  }

  watch(() => buildStepSignature(questionRef.value), (signature) => {
    if (signature === lastQuestionSignature.value && nodes.value.length > 0) return
    if (dirty.value) return
    lastQuestionSignature.value = signature
    loadFromQuestion(questionRef.value)
  }, { immediate: true })

  function selectNode(nodeId: string) {
    selectedNodeId.value = String(nodeId || '')
    ensureSelectedNode()
  }

  function setSnippetSelectionAnchor(nodeId?: string) {
    const list = nodes.value || []
    if (list.length <= 0) {
      snippetSelectionAnchorId.value = ''
      return
    }
    const target = String(nodeId || selectedNodeId.value || list[0]?.id || '')
    const hit = list.some((item) => item.id === target)
    snippetSelectionAnchorId.value = hit ? target : list[0].id
  }

  function clearSnippetSelectionAnchor() {
    snippetSelectionAnchorId.value = ''
  }

  function appendNode(kind: string): FlowVisualInsertResult {
    const check = validateStencilInsertion(nodes.value, kind, nodes.value.length)
    if (!check.ok) return check
    pushHistorySnapshot()
    const next = [...nodes.value, createStencilNode(kind, nodes.value.length)]
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = next[next.length - 1]?.id || ''
    markRecentlyMoved(selectedNodeId.value)
    markDirty('append_node')
    return { ok: true }
  }

  function insertNodeNearTarget(kind: string, targetNodeId: string, position: FlowNodeDropPosition = 'after'): FlowVisualInsertResult {
    const targetId = String(targetNodeId || '')
    const targetIndex = nodes.value.findIndex((item) => item.id === targetId)
    if (targetIndex < 0) {
      return appendNode(kind)
    }
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
    const check = validateStencilInsertion(nodes.value, kind, insertIndex)
    if (!check.ok) return check
    pushHistorySnapshot()
    const next = [...nodes.value]
    const node = createStencilNode(kind, insertIndex)
    next.splice(insertIndex, 0, node)
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = node.id
    markRecentlyMoved(node.id)
    markDirty('insert_node_near_target')
    return { ok: true }
  }

  function insertStencilAt(kind: 'playAudio' | 'countdown' | 'answerChoice', insertIndex: number): boolean {
    const safeIndex = Math.max(0, Math.min(insertIndex, nodes.value.length))
    const check = validateStencilInsertion(nodes.value, kind, safeIndex)
    if (!check.ok) return false
    pushHistorySnapshot()
    const next = [...nodes.value]
    const node = createStencilNode(kind, safeIndex)
    next.splice(safeIndex, 0, node)
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = node.id
    markRecentlyMoved(node.id)
    markDirty('apply_quick_fix_insert')
    return true
  }

  function moveNodeToIndex(sourceIndex: number, targetIndex: number): boolean {
    if (sourceIndex < 0 || sourceIndex >= nodes.value.length) return false
    const safeTarget = Math.max(0, Math.min(targetIndex, nodes.value.length - 1))
    if (sourceIndex === safeTarget) return false
    pushHistorySnapshot()
    const next = [...nodes.value]
    const [moved] = next.splice(sourceIndex, 1)
    if (!moved) return false
    const adjustedTarget = sourceIndex < safeTarget ? safeTarget - 1 : safeTarget
    next.splice(adjustedTarget, 0, moved)
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = moved.id
    markRecentlyMoved(moved.id)
    markDirty('apply_quick_fix_move')
    return true
  }

  function resolveContextGroupIdByInsertIndex(insertIndex: number): string {
    const safeIndex = Math.max(0, Math.min(insertIndex, nodes.value.length))
    const previous = nodes.value[safeIndex - 1]
    const next = nodes.value[safeIndex]
    const prevGroupId = String(previous?.data?.groupId || '').trim()
    if (prevGroupId) return prevGroupId
    const nextGroupId = String(next?.data?.groupId || '').trim()
    if (nextGroupId) return nextGroupId
    for (const item of nodes.value) {
      const groupId = String(item?.data?.groupId || '').trim()
      if (groupId) return groupId
    }
    return ''
  }

  function insertSnippetSteps(steps: FlowSnippetTemplateStep[], insertIndex: number): FlowVisualInsertResult {
    const normalizedSteps = normalizeSnippetTemplateSteps(steps)
    if (normalizedSteps.length <= 0) {
      return { ok: false, code: 'snippet_empty', message: '片段为空，无法插入。' }
    }
    const safeIndex = Math.max(0, Math.min(insertIndex, nodes.value.length))
    const contextGroupId = resolveContextGroupIdByInsertIndex(safeIndex)
    const workingNodes = [...nodes.value]
    const insertedIds: string[] = []
    let cursor = safeIndex

    for (let i = 0; i < normalizedSteps.length; i += 1) {
      const step = normalizedSteps[i]
      const check = validateStencilInsertion(workingNodes, step.kind, cursor)
      if (!check.ok) {
        return {
          ok: false,
          code: check.code,
          message: `片段第 ${i + 1} 步插入失败：${check.message}`
        }
      }
      const groupId = step.groupBinding === 'inherit' ? contextGroupId : ''
      const node = createStencilNode(step.kind, cursor, {
        autoNext: step.autoNext,
        groupId
      })
      workingNodes.splice(cursor, 0, node)
      insertedIds.push(node.id)
      cursor += 1
    }

    pushHistorySnapshot()
    nodes.value = relayoutNodes(workingNodes)
    const lastInsertedId = insertedIds[insertedIds.length - 1]
    if (lastInsertedId) {
      selectedNodeId.value = lastInsertedId
      markRecentlyMoved(lastInsertedId)
    }
    markDirty('insert_snippet_steps')
    return { ok: true }
  }

  function insertSnippetNearTarget(
    steps: FlowSnippetTemplateStep[],
    targetNodeId: string,
    position: FlowNodeDropPosition = 'after'
  ): FlowVisualInsertResult {
    const targetId = String(targetNodeId || '')
    const targetIndex = nodes.value.findIndex((item) => item.id === targetId)
    if (targetIndex < 0) return insertSnippetAtTail(steps)
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
    return insertSnippetSteps(steps, insertIndex)
  }

  function insertSnippetAtTail(steps: FlowSnippetTemplateStep[]): FlowVisualInsertResult {
    return insertSnippetSteps(steps, nodes.value.length)
  }

  function buildMacroNodeFromSnippetRef(input: FlowMacroSnippetRefInput, insertIndex: number): FlowVisualNode<EditableFlowNodePayload> {
    const normalized = normalizeMacroSnippetRef(input)
    const node = createStencilNode('macroNode', insertIndex, {
      groupId: resolveContextGroupIdByInsertIndex(insertIndex)
    })
    if (!normalized) return node
    return relayoutNode({
      ...node,
      data: {
        ...node.data,
        snippet: {
          baseId: normalized.baseId,
          version: normalized.version,
          hash: normalized.hash
        },
        binding: {
          groupBindingMode: 'inherit',
          autoNextMode: 'inherit'
        },
        expandedStepCount: normalized.stepCount
      }
    }, insertIndex)
  }

  function insertMacroSnippetNode(refInput: FlowMacroSnippetRefInput, insertIndex: number): FlowVisualInsertResult {
    const normalized = normalizeMacroSnippetRef(refInput)
    if (!normalized) {
      return { ok: false, code: 'macro_snippet_ref_invalid', message: '片段引用无效，无法作为宏节点插入。' }
    }

    const safeIndex = Math.max(0, Math.min(insertIndex, nodes.value.length))
    const check = validateStencilInsertion(nodes.value, 'macroNode', safeIndex)
    if (!check.ok) return check

    pushHistorySnapshot()
    const next = [...nodes.value]
    const node = buildMacroNodeFromSnippetRef(normalized, safeIndex)
    next.splice(safeIndex, 0, node)
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = node.id
    markRecentlyMoved(node.id)
    markDirty('insert_macro_snippet')
    return { ok: true }
  }

  function insertMacroSnippetNearTarget(
    refInput: FlowMacroSnippetRefInput,
    targetNodeId: string,
    position: FlowNodeDropPosition = 'after'
  ): FlowVisualInsertResult {
    const targetId = String(targetNodeId || '')
    const targetIndex = nodes.value.findIndex((item) => item.id === targetId)
    if (targetIndex < 0) return insertMacroSnippetAtTail(refInput)
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
    return insertMacroSnippetNode(refInput, insertIndex)
  }

  function insertMacroSnippetAtTail(refInput: FlowMacroSnippetRefInput): FlowVisualInsertResult {
    return insertMacroSnippetNode(refInput, nodes.value.length)
  }

  function patchSelectedNode(patch: FlowVisualNodePatch) {
    const nodeId = selectedNodeId.value
    if (!nodeId) return
    let changed = false
    const nextNodes = nodes.value.map((item) => {
      if (item.id !== nodeId) return item
      const nextData = applyNodePatchPayload(item.data, patch)
      if (isSameEditableNodePayload(nextData, item.data)) return item
      changed = true
      return {
        ...item,
        data: nextData
      }
    })
    if (!changed) return
    pushHistorySnapshot()
    nodes.value = relayoutNodes(nextNodes)
    markDirty('patch_selected_node')
  }

  function resolveCommonPropertyFieldsByNodeIds(nodeIds: string[]): FlowPropertyField[] {
    const ids = Array.isArray(nodeIds) ? nodeIds.map((id) => String(id || '').trim()).filter(Boolean) : []
    if (ids.length <= 0) return []
    const idSet = new Set(ids)
    const selectedNodes = nodes.value.filter((item) => idSet.has(item.id))
    if (selectedNodes.length <= 0) return []

    const first = selectedNodes[0]
    const firstFields = buildPropertyFieldsByStepKind(first.data.stepKind)
    let commonKeys = new Set(firstFields.map((item) => item.key))

    for (let i = 1; i < selectedNodes.length; i += 1) {
      const currentFields = buildPropertyFieldsByStepKind(selectedNodes[i].data.stepKind)
      const keySet = new Set(currentFields.map((item) => item.key))
      commonKeys = new Set([...commonKeys].filter((key) => keySet.has(key)))
      if (commonKeys.size <= 0) break
    }

    return firstFields.filter((item) => commonKeys.has(item.key))
  }

  function patchNodesByIds(
    nodeIds: string[],
    patch: FlowVisualNodePatch,
    dirtyAction = 'patch_nodes_by_ids'
  ): FlowVisualBulkPatchResult {
    const ids = Array.isArray(nodeIds) ? nodeIds.map((id) => String(id || '').trim()).filter(Boolean) : []
    if (ids.length <= 0) {
      return { ok: false, code: 'bulk_patch_empty_selection', message: '请先选中需要批量修改的节点。' }
    }
    const idSet = new Set(ids)
    const hasAnyPatch = Object.values(patch).some((value) => value !== undefined)
    if (!hasAnyPatch) {
      return { ok: false, code: 'bulk_patch_empty_patch', message: '未检测到可应用的批量字段。' }
    }

    let changed = false
    let updatedNodeCount = 0
    const nextNodes = nodes.value.map((item) => {
      if (!idSet.has(item.id)) return item
      const allowedKeys = readAllowedFieldKeySetByStepKind(item.data.stepKind)
      const nextData = applyNodePatchPayload(item.data, patch, allowedKeys)
      if (isSameEditableNodePayload(nextData, item.data)) return item

      changed = true
      updatedNodeCount += 1
      return {
        ...item,
        data: nextData
      }
    })

    if (!changed) {
      return { ok: false, code: 'bulk_patch_noop', message: '批量更新未产生变更，请检查字段与选区。' }
    }

    pushHistorySnapshot()
    nodes.value = relayoutNodes(nextNodes)
    ensureSelectedNode()
    markRecentlyMoved(selectedNodeId.value)
    markDirty(dirtyAction)
    return {
      ok: true,
      updatedNodeCount
    }
  }

  function patchSelectionRange(patch: FlowVisualNodePatch): FlowVisualBulkPatchResult {
    const ids = snippetSelectionNodeIds.value
    if (ids.length <= 1) {
      return { ok: false, code: 'bulk_patch_selection_too_small', message: '请至少选择 2 个节点再进行批量修改。' }
    }
    return patchNodesByIds(ids, patch, 'patch_selection_range')
  }

  function removeSelectedNode() {
    const nodeId = selectedNodeId.value
    if (!nodeId) return
    pushHistorySnapshot()
    nodes.value = relayoutNodes(nodes.value.filter((item) => item.id !== nodeId))
    markDirty('remove_selected_node')
    ensureSelectedNode()
  }

  function duplicateSelectedNode() {
    const nodeId = selectedNodeId.value
    if (!nodeId) return
    const currentIndex = nodes.value.findIndex((item) => item.id === nodeId)
    if (currentIndex < 0) return
    const current = nodes.value[currentIndex]
    if (!current) return

    pushHistorySnapshot()
    const duplicate = createStencilNode(current.data.stepKind, currentIndex + 1)
    const next = [...nodes.value]
    next.splice(currentIndex + 1, 0, {
      ...duplicate,
      data: {
        ...duplicate.data,
        ...current.data,
        stepId: buildNodeId(current.data.stepKind || duplicate.data.stepKind)
      }
    })
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = next[currentIndex + 1]?.id || ''
    markRecentlyMoved(selectedNodeId.value)
    markDirty('duplicate_selected_node')
  }

  function selectAdjacentNode(step: -1 | 1) {
    if ((nodes.value || []).length <= 0) return
    const currentId = selectedNodeId.value
    const currentIndex = nodes.value.findIndex((item) => item.id === currentId)
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = Math.max(0, Math.min(nodes.value.length - 1, fallbackIndex + step))
    selectedNodeId.value = nodes.value[nextIndex]?.id || selectedNodeId.value
  }

  function moveSelectedNode(step: -1 | 1) {
    const nodeId = selectedNodeId.value
    if (!nodeId) return
    const current = nodes.value.findIndex((item) => item.id === nodeId)
    if (current < 0) return
    const nextIndex = current + step
    if (nextIndex < 0 || nextIndex >= nodes.value.length) return
    pushHistorySnapshot()
    const next = [...nodes.value]
    const currentNode = next[current]
    next[current] = next[nextIndex]
    next[nextIndex] = currentNode
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = currentNode.id
    markRecentlyMoved(currentNode.id)
    markDirty('move_selected_node')
  }

  function reorderNodes(sourceNodeId: string, targetNodeId: string, position: FlowNodeDropPosition = 'before') {
    const sourceId = String(sourceNodeId || '')
    const targetId = String(targetNodeId || '')
    if (!sourceId || !targetId || sourceId === targetId) return

    const sourceIndex = nodes.value.findIndex((item) => item.id === sourceId)
    if (sourceIndex < 0) return

    pushHistorySnapshot()
    const next = [...nodes.value]
    const [moved] = next.splice(sourceIndex, 1)
    if (!moved) return
    const normalizedTargetIndex = next.findIndex((item) => item.id === targetId)
    if (normalizedTargetIndex < 0) return
    const insertIndex = position === 'after'
      ? normalizedTargetIndex + 1
      : normalizedTargetIndex
    next.splice(insertIndex, 0, moved)
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = moved.id
    markRecentlyMoved(moved.id)
    markDirty('reorder_nodes')
  }

  const canUndo = computed(() => historyPast.value.length > 0)
  const canRedo = computed(() => historyFuture.value.length > 0)

  function undo() {
    const previous = historyPast.value.pop()
    if (!previous) return
    historyFuture.value.push(cloneNodes(nodes.value))
    if (historyFuture.value.length > HISTORY_LIMIT) historyFuture.value.shift()
    nodes.value = relayoutNodes(cloneNodes(previous))
    ensureSelectedNode()
    markRecentlyMoved(selectedNodeId.value)
    markDirty('undo')
  }

  function redo() {
    const next = historyFuture.value.pop()
    if (!next) return
    historyPast.value.push(cloneNodes(nodes.value))
    if (historyPast.value.length > HISTORY_LIMIT) historyPast.value.shift()
    nodes.value = relayoutNodes(cloneNodes(next))
    ensureSelectedNode()
    markRecentlyMoved(selectedNodeId.value)
    markDirty('redo')
  }

  const snippetSelectionNodeIds = computed<string[]>(() => {
    const list = nodes.value || []
    if (list.length <= 0) return []
    const selectedId = String(selectedNodeId.value || list[0]?.id || '')
    if (!selectedId) return []
    const selectedIndex = list.findIndex((item) => item.id === selectedId)
    if (selectedIndex < 0) return []

    const anchorId = String(snippetSelectionAnchorId.value || '').trim()
    if (!anchorId) return [selectedId]
    const anchorIndex = list.findIndex((item) => item.id === anchorId)
    if (anchorIndex < 0) return [selectedId]

    const start = Math.min(anchorIndex, selectedIndex)
    const end = Math.max(anchorIndex, selectedIndex)
    return list.slice(start, end + 1).map((item) => item.id)
  })
  const bulkPropertyFieldsForSelection = computed<FlowPropertyField[]>(() => {
    const ids = snippetSelectionNodeIds.value
    if (ids.length <= 1) return []
    return resolveCommonPropertyFieldsByNodeIds(ids)
  })

  function buildSuggestedSnippetName(steps: FlowSnippetTemplateStep[]): string {
    if (steps.length <= 0) return '流程片段'
    const labels = steps.slice(0, 3).map((step) => readMeta(step.kind).label)
    const suffix = steps.length > 3 ? ` +${steps.length - 3}` : ''
    return `${labels.join(' · ')}${suffix}`
  }

  function saveSnippetFromSelectionRange(): FlowSnippetCaptureResult {
    const selectedIds = snippetSelectionNodeIds.value
    if (selectedIds.length <= 0) {
      return { ok: false, code: 'snippet_selection_empty', message: '请先选中至少 1 个步骤。' }
    }
    const idSet = new Set(selectedIds)
    const selectedNodes = nodes.value.filter((item) => idSet.has(item.id))
    if (selectedNodes.length <= 0) {
      return { ok: false, code: 'snippet_selection_missing', message: '当前选区不存在可保存节点。' }
    }
    const steps: FlowSnippetTemplateStep[] = selectedNodes.map((node) => {
      return {
        kind: String(node.data?.stepKind || node.kind || '').trim(),
        autoNext: String(node.data?.autoNext || '').trim(),
        groupBinding: String(node.data?.groupId || '').trim() ? 'inherit' : 'empty'
      }
    }).filter((item) => !!item.kind)

    if (steps.length <= 0) {
      return { ok: false, code: 'snippet_steps_empty', message: '选区中没有可保存的步骤。' }
    }

    return {
      ok: true,
      suggestedName: buildSuggestedSnippetName(steps),
      steps,
      selectedNodeIds: selectedIds
    }
  }

  const graph = computed<FlowVisualGraph<EditableFlowNodePayload>>(() => {
    const arranged = relayoutNodes(nodes.value)
    return {
      nodes: arranged,
      edges: buildEdges(arranged),
      canvas: {
        width: CANVAS_WIDTH,
        height: buildCanvasHeight(arranged.length)
      }
    }
  })

  const selectedNode = computed<FlowVisualNode<EditableFlowNodePayload> | null>(() => {
    const list = graph.value.nodes || []
    if (list.length <= 0) return null
    const hit = list.find((item) => item.id === selectedNodeId.value)
    return hit || list[0]
  })

  const compileResult = computed(() => compileFlowVisualGraphToLinearSteps(graph.value, {
    resolveMacroSnippet: options.resolveMacroSnippet
  }))
  const compiledStepPreview = computed(() => compileResult.value.steps.slice(0, 6))
  const quickFixSuggestions = computed<FlowLinearFixSuggestion[]>(() => {
    return buildLinearFlowFixSuggestions({
      steps: compileResult.value.steps,
      errors: compileResult.value.errors,
      warnings: compileResult.value.warnings
    })
  })

  function applyQuickFixSuggestion(key: string): boolean {
    const target = quickFixSuggestions.value.find((item) => item.key === key)
    if (!target) return false
    const action = target.action
    if (action.type === 'insert') {
      if (action.at === 'start') return insertStencilAt(action.kind, 0)
      if (action.at === 'end') return insertStencilAt(action.kind, nodes.value.length)
      if (action.at === 'after_intro') {
        const introIndex = findFirstNodeIndexByKind(nodes.value, 'intro')
        return insertStencilAt(action.kind, introIndex >= 0 ? introIndex + 1 : 0)
      }
      if (action.at === 'after_first_play_audio') {
        const playAudioIndex = findFirstNodeIndexByKind(nodes.value, 'playAudio')
        return insertStencilAt(action.kind, playAudioIndex >= 0 ? playAudioIndex + 1 : nodes.value.length)
      }
      return false
    }

    if (action.type === 'move_answer_after_first_play_audio') {
      const answerIndex = findFirstNodeIndexByKind(nodes.value, 'answerChoice')
      const playAudioIndex = findFirstNodeIndexByKind(nodes.value, 'playAudio')
      if (answerIndex < 0 || playAudioIndex < 0) return false
      if (answerIndex > playAudioIndex) return false
      return moveNodeToIndex(answerIndex, playAudioIndex + 1)
    }

    if (action.type === 'move_intro_to_start') {
      const introIndex = findFirstNodeIndexByKind(nodes.value, 'intro')
      if (introIndex <= 0) return false
      return moveNodeToIndex(introIndex, 0)
    }

    if (action.type === 'remove_extra_intro') {
      const introIndexes: number[] = []
      for (let i = 0; i < nodes.value.length; i += 1) {
        if (String(nodes.value[i]?.data?.stepKind || nodes.value[i]?.kind || '') === 'intro') {
          introIndexes.push(i)
        }
      }
      if (introIndexes.length <= 1) return false
      pushHistorySnapshot()
      const keep = introIndexes[0]
      const next = nodes.value.filter((_, idx) => !(idx !== keep && introIndexes.includes(idx)))
      nodes.value = relayoutNodes(next)
      ensureSelectedNode()
      markRecentlyMoved(selectedNodeId.value)
      markDirty('apply_quick_fix_remove')
      return true
    }

    return false
  }
  const linearConstraintChecks = computed<FlowLinearConstraintCheck[]>(() => {
    const stats = buildGraphConstraintStats(graph.value)
    return [
      {
        key: 'single_entry',
        label: '单入口',
        ok: stats.entryCount === 1,
        detail: `入口节点 ${stats.entryCount}`,
        errorCode: 'entry_count_invalid'
      },
      {
        key: 'single_exit',
        label: '单出口',
        ok: stats.exitCount === 1,
        detail: `出口节点 ${stats.exitCount}`,
        errorCode: 'exit_count_invalid'
      },
      {
        key: 'no_branch',
        label: '无分支',
        ok: stats.branchNodeCount === 0,
        detail: `分支节点 ${stats.branchNodeCount}`,
        errorCode: 'branch_not_supported'
      },
      {
        key: 'no_cycle',
        label: '无环路',
        ok: !stats.hasCycle,
        detail: stats.hasCycle ? '检测到环路' : '未检测到环路',
        errorCode: 'cycle_detected'
      },
      {
        key: 'fully_connected',
        label: '全连通',
        ok: stats.disconnectedNodeCount === 0,
        detail: stats.disconnectedNodeCount > 0
          ? `未连通节点 ${stats.disconnectedNodeCount}`
          : '全部节点可达',
        errorCode: 'graph_disconnected'
      }
    ]
  })
  const propertyFieldsForSelectedNode = computed<FlowPropertyField[]>(() => {
    const node = selectedNode.value
    if (!node) return []
    return buildPropertyFieldsByStepKind(node.data.stepKind)
  })
  const debugInfo = computed(() => ({
    dirty: dirty.value,
    lastDirtyAction: lastDirtyAction.value,
    lastDirtyAt: lastDirtyAt.value,
    lastCleanReason: lastCleanReason.value,
    lastCleanAt: lastCleanAt.value
  }))

  return {
    stencilItems: STENCIL_ITEMS,
    graph,
    selectedNodeId,
    snippetSelectionAnchorId,
    snippetSelectionNodeIds,
    bulkPropertyFieldsForSelection,
    selectedNode,
    compileResult,
    compiledStepPreview,
    quickFixSuggestions,
    linearConstraintChecks,
    propertyFieldsForSelectedNode,
    canUndo,
    canRedo,
    recentlyMovedNodeId,
    dirty,
    debugInfo,
    selectNode,
    setSnippetSelectionAnchor,
    clearSnippetSelectionAnchor,
    appendNode,
    insertNodeNearTarget,
    insertSnippetNearTarget,
    insertSnippetAtTail,
    insertMacroSnippetNearTarget,
    insertMacroSnippetAtTail,
    saveSnippetFromSelectionRange,
    patchSelectionRange,
    patchSelectedNode,
    removeSelectedNode,
    duplicateSelectedNode,
    selectPrevNode: () => selectAdjacentNode(-1),
    selectNextNode: () => selectAdjacentNode(1),
    moveSelectedNodeUp: () => moveSelectedNode(-1),
    moveSelectedNodeDown: () => moveSelectedNode(1),
    reorderNodes,
    applyQuickFixSuggestion,
    undo,
    redo,
    reloadFromQuestion,
    clearDirty
  }
}
