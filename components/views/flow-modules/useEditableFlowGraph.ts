import { computed, ref, watch, type Ref } from 'vue'
import type { FlowVisualEdge, FlowVisualGraph, FlowVisualNode, ListeningChoiceQuestion } from '/types'
import { compileFlowVisualGraphToLinearSteps } from '/domain/flow-visual/usecases/compileGraphToSteps'
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

const STENCIL_ITEMS: FlowStencilItem[] = [
  { kind: 'intro', label: '介绍页', color: '#2563eb', category: 'control', categoryLabel: '控制', description: '展示题型介绍与说明', defaultAutoNext: 'tapNext' },
  { kind: 'countdown', label: '倒计时', color: '#f59e0b', category: 'control', categoryLabel: '控制', description: '等待倒计时结束自动推进', defaultAutoNext: 'countdownEnded' },
  { kind: 'playAudio', label: '播放音频', color: '#0284c7', category: 'media', categoryLabel: '媒体', description: '播放描述或正文音频', defaultAutoNext: 'audioEnded' },
  { kind: 'promptTone', label: '提示音', color: '#0ea5e9', category: 'media', categoryLabel: '媒体', description: '播放提示音后继续', defaultAutoNext: 'audioEnded' },
  { kind: 'answerChoice', label: '答题', color: '#16a34a', category: 'interaction', categoryLabel: '交互', description: '进入作答并等待时间结束', defaultAutoNext: 'timeEnded' },
  { kind: 'contextInfo', label: '上下文提示', color: '#7c3aed', category: 'control', categoryLabel: '控制', description: '展示上下文信息后继续', defaultAutoNext: 'tapNext' }
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

function composeNodeSubtitle(payload: EditableFlowNodePayload): string {
  const parts: string[] = [payload.autoNextLabel]
  if (payload.groupId) parts.push(`题组 ${payload.groupId}`)
  if (payload.questionCount > 0) parts.push(`小题 ${payload.questionCount}`)
  return parts.join(' · ')
}

function buildPropertyFieldsByStepKind(stepKind: string): FlowPropertyField[] {
  const kind = String(stepKind || '').trim()
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
  const meta = readMeta(String(node.data?.stepKind || node.kind || ''))
  const data: EditableFlowNodePayload = {
    ...node.data,
    index,
    stepKind: String(node.data?.stepKind || node.kind || meta.kind),
    autoNext: String(node.data?.autoNext || ''),
    autoNextLabel: resolveAutoNextLabel(String(node.data?.autoNext || '')),
    category: meta.category,
    categoryLabel: meta.categoryLabel,
    groupId: String(node.data?.groupId || ''),
    questionCount: Number(node.data?.questionCount || 0),
    stepId: String(node.data?.stepId || node.id || buildNodeId(meta.kind))
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

function createStencilNode(kind: string, index: number): FlowVisualNode<EditableFlowNodePayload> {
  const meta = readMeta(kind)
  const payload: EditableFlowNodePayload = {
    index,
    stepId: buildNodeId(meta.kind),
    stepKind: meta.kind,
    autoNext: meta.defaultAutoNext,
    autoNextLabel: resolveAutoNextLabel(meta.defaultAutoNext),
    category: meta.category,
    categoryLabel: meta.categoryLabel,
    groupId: '',
    questionCount: 0
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

export function useEditableFlowGraph(questionRef: Ref<ListeningChoiceQuestion | null | undefined>) {
  const nodes = ref<FlowVisualNode<EditableFlowNodePayload>[]>([])
  const selectedNodeId = ref('')
  const recentlyMovedNodeId = ref('')
  const dirty = ref(false)
  const lastQuestionSignature = ref('')
  const historyPast = ref<FlowVisualNode<EditableFlowNodePayload>[][]>([])
  const historyFuture = ref<FlowVisualNode<EditableFlowNodePayload>[][]>([])
  const HISTORY_LIMIT = 40
  let movedTimer: ReturnType<typeof setTimeout> | null = null

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
      return
    }
    const hit = list.some((item) => item.id === selectedNodeId.value)
    if (!hit) selectedNodeId.value = list[0].id
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
    dirty.value = false
    ensureSelectedNode()
  }

  function reloadFromQuestion() {
    const question = questionRef.value
    lastQuestionSignature.value = buildStepSignature(question)
    loadFromQuestion(question)
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

  function appendNode(kind: string) {
    pushHistorySnapshot()
    const next = [...nodes.value, createStencilNode(kind, nodes.value.length)]
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = next[next.length - 1]?.id || ''
    markRecentlyMoved(selectedNodeId.value)
    dirty.value = true
  }

  function insertNodeNearTarget(kind: string, targetNodeId: string, position: FlowNodeDropPosition = 'after') {
    const targetId = String(targetNodeId || '')
    const targetIndex = nodes.value.findIndex((item) => item.id === targetId)
    if (targetIndex < 0) {
      appendNode(kind)
      return
    }
    pushHistorySnapshot()
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
    const next = [...nodes.value]
    const node = createStencilNode(kind, insertIndex)
    next.splice(insertIndex, 0, node)
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = node.id
    markRecentlyMoved(node.id)
    dirty.value = true
  }

  function patchSelectedNode(patch: FlowVisualNodePatch) {
    const nodeId = selectedNodeId.value
    if (!nodeId) return
    pushHistorySnapshot()
    nodes.value = relayoutNodes(nodes.value.map((item) => {
      if (item.id !== nodeId) return item
      const stepKind = patch.stepKind !== undefined ? String(patch.stepKind || '').trim() : item.data.stepKind
      const autoNext = patch.autoNext !== undefined ? String(patch.autoNext || '').trim() : item.data.autoNext
      const groupId = patch.groupId !== undefined ? String(patch.groupId || '').trim() : item.data.groupId
      return {
        ...item,
        data: {
          ...item.data,
          stepKind: stepKind || item.data.stepKind,
          autoNext,
          groupId
        }
      }
    }))
    dirty.value = true
  }

  function removeSelectedNode() {
    const nodeId = selectedNodeId.value
    if (!nodeId) return
    pushHistorySnapshot()
    nodes.value = relayoutNodes(nodes.value.filter((item) => item.id !== nodeId))
    dirty.value = true
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
        autoNext: current.data.autoNext,
        groupId: current.data.groupId
      }
    })
    nodes.value = relayoutNodes(next)
    selectedNodeId.value = next[currentIndex + 1]?.id || ''
    markRecentlyMoved(selectedNodeId.value)
    dirty.value = true
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
    dirty.value = true
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
    dirty.value = true
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
    dirty.value = true
  }

  function redo() {
    const next = historyFuture.value.pop()
    if (!next) return
    historyPast.value.push(cloneNodes(nodes.value))
    if (historyPast.value.length > HISTORY_LIMIT) historyPast.value.shift()
    nodes.value = relayoutNodes(cloneNodes(next))
    ensureSelectedNode()
    markRecentlyMoved(selectedNodeId.value)
    dirty.value = true
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

  const compileResult = computed(() => compileFlowVisualGraphToLinearSteps(graph.value))
  const compiledStepPreview = computed(() => compileResult.value.steps.slice(0, 6))
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

  return {
    stencilItems: STENCIL_ITEMS,
    graph,
    selectedNodeId,
    selectedNode,
    compileResult,
    compiledStepPreview,
    linearConstraintChecks,
    propertyFieldsForSelectedNode,
    canUndo,
    canRedo,
    recentlyMovedNodeId,
    dirty,
    selectNode,
    appendNode,
    insertNodeNearTarget,
    patchSelectedNode,
    removeSelectedNode,
    duplicateSelectedNode,
    selectPrevNode: () => selectAdjacentNode(-1),
    selectNextNode: () => selectAdjacentNode(1),
    moveSelectedNodeUp: () => moveSelectedNode(-1),
    moveSelectedNodeDown: () => moveSelectedNode(1),
    reorderNodes,
    undo,
    redo,
    reloadFromQuestion
  }
}
