import type {
  FlowStepBranchProtocol,
  FlowStepLoopProtocol,
  FlowVisualCompileIssue,
  FlowVisualCompileResult,
  FlowVisualGraph
} from '/types'
import { normalizeFlowMacroNodePayload } from './flowMacroNodeModel.ts'

export type VisualLinearStep = {
  id: string
  kind: string
  autoNext?: string
  groupId?: string
}

export type VisualBranchMvpStep = VisualLinearStep & {
  nextStepId?: string
  branch?: FlowStepBranchProtocol
}

export type VisualLoopMvpStep = VisualLinearStep & {
  nextStepId?: string
  loop?: FlowStepLoopProtocol
}

export type FlowMacroSnippetStep = {
  kind?: unknown
  autoNext?: unknown
  groupBinding?: unknown
}

export type FlowMacroSnippetTemplate = {
  baseId?: unknown
  version?: unknown
  hash?: unknown
  steps?: unknown
}

export type ResolveFlowMacroSnippet = (ref: { baseId: string; version: number }) => FlowMacroSnippetTemplate | null | undefined

export type CompileFlowVisualLinearOptions = {
  resolveMacroSnippet?: ResolveFlowMacroSnippet
}

type VisualLinearLintResult = {
  errors: FlowVisualCompileIssue[]
  warnings: FlowVisualCompileIssue[]
}

type NodePayload = {
  stepKind?: unknown
  autoNext?: unknown
  groupId?: unknown
  nodeKind?: unknown
  snippet?: unknown
  binding?: unknown
  expandedStepCount?: unknown
  branchScoreThreshold?: unknown
  loopMaxIterations?: unknown
}

function readNodePayload(node: { data?: unknown }): NodePayload {
  if (!node || typeof node !== 'object') return {}
  const data = (node as { data?: unknown }).data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  return data as NodePayload
}

function createIssue(code: string, message: string, path: string): FlowVisualCompileIssue {
  return { code, message, path }
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function resolveNodeStepKind(node: { kind?: unknown; data?: unknown }): string {
  const payload = readNodePayload(node)
  const normalized = normalizeOptionalString(payload.stepKind)
    || normalizeOptionalString(node.kind)
  return normalized || 'unknown'
}

type MacroNodeExpansionResult = {
  steps: VisualLinearStep[]
  errors: FlowVisualCompileIssue[]
  warnings: FlowVisualCompileIssue[]
}

function normalizePositiveInt(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const normalized = Math.floor(parsed)
  if (normalized <= 0) return null
  return normalized
}

function normalizeMacroSnippetGroupBinding(value: unknown): 'inherit' | 'empty' {
  return String(value || '').trim() === 'inherit' ? 'inherit' : 'empty'
}

function isMacroNode(node: { kind?: unknown; data?: unknown }, payload: NodePayload): boolean {
  const payloadNodeKind = normalizeOptionalString(payload.nodeKind)
  if (payloadNodeKind === 'macroNode') return true
  return normalizeOptionalString(node.kind) === 'macroNode'
}

function expandMacroNodeToLinearSteps(
  node: { id: string; kind?: unknown; data?: unknown },
  payload: NodePayload,
  options: CompileFlowVisualLinearOptions
): MacroNodeExpansionResult {
  const errors: FlowVisualCompileIssue[] = []
  const warnings: FlowVisualCompileIssue[] = []
  const steps: VisualLinearStep[] = []
  const nodePath = `graph.nodes(${String(node.id || '')})`
  const macroPayload = normalizeFlowMacroNodePayload(payload)
  if (!macroPayload) {
    errors.push(createIssue(
      'macro_payload_invalid',
      `宏节点 ${node.id} 的 payload 不合法，无法展开。`,
      `${nodePath}.data`
    ))
    return { steps, errors, warnings }
  }

  const resolveMacroSnippet = options.resolveMacroSnippet
  if (typeof resolveMacroSnippet !== 'function') {
    errors.push(createIssue(
      'macro_snippet_resolver_missing',
      `宏节点 ${node.id} 缺少片段解析器，无法展开。`,
      `${nodePath}.data.snippet`
    ))
    return { steps, errors, warnings }
  }

  const snippet = resolveMacroSnippet({
    baseId: macroPayload.snippet.baseId,
    version: macroPayload.snippet.version
  })
  if (!snippet || typeof snippet !== 'object') {
    errors.push(createIssue(
      'macro_snippet_not_found',
      `宏节点 ${node.id} 引用的片段 ${macroPayload.snippet.baseId}@v${macroPayload.snippet.version} 不存在。`,
      `${nodePath}.data.snippet`
    ))
    return { steps, errors, warnings }
  }

  const snippetHash = normalizeOptionalString((snippet as { hash?: unknown }).hash)
  if (macroPayload.snippet.hash && snippetHash && macroPayload.snippet.hash !== snippetHash) {
    warnings.push(createIssue(
      'macro_snippet_hash_mismatch',
      `宏节点 ${node.id} 引用片段 hash 不一致，已按当前片段展开。`,
      `${nodePath}.data.snippet.hash`
    ))
  }

  const snippetBaseId = normalizeOptionalString((snippet as { baseId?: unknown }).baseId)
  if (snippetBaseId && snippetBaseId !== macroPayload.snippet.baseId) {
    warnings.push(createIssue(
      'macro_snippet_ref_mismatch',
      `宏节点 ${node.id} 片段 baseId 不一致（引用 ${macroPayload.snippet.baseId}，实际 ${snippetBaseId}）。`,
      `${nodePath}.data.snippet.baseId`
    ))
  }

  const snippetVersion = normalizePositiveInt((snippet as { version?: unknown }).version)
  if (snippetVersion && snippetVersion !== macroPayload.snippet.version) {
    warnings.push(createIssue(
      'macro_snippet_ref_mismatch',
      `宏节点 ${node.id} 片段 version 不一致（引用 v${macroPayload.snippet.version}，实际 v${snippetVersion}）。`,
      `${nodePath}.data.snippet.version`
    ))
  }

  const rawSteps = (snippet as { steps?: unknown }).steps
  const sourceSteps = Array.isArray(rawSteps) ? rawSteps as FlowMacroSnippetStep[] : []
  if (sourceSteps.length <= 0) {
    errors.push(createIssue(
      'macro_snippet_empty',
      `宏节点 ${node.id} 引用片段为空，无法展开。`,
      `${nodePath}.data.snippet.steps`
    ))
    return { steps, errors, warnings }
  }

  const contextGroupId = normalizeOptionalString(payload.groupId)
  for (let i = 0; i < sourceSteps.length; i += 1) {
    const raw = sourceSteps[i]
    const kind = normalizeOptionalString(raw?.kind)
    if (!kind) {
      errors.push(createIssue(
        'macro_snippet_step_kind_invalid',
        `宏节点 ${node.id} 引用片段第 ${i + 1} 步缺少步骤类型。`,
        `${nodePath}.data.snippet.steps(${i}).kind`
      ))
      continue
    }

    const snippetAutoNext = normalizeOptionalString(raw?.autoNext)
    const autoNext = macroPayload.binding.autoNextMode === 'override'
      ? macroPayload.binding.autoNext
      : snippetAutoNext

    let groupId: string | undefined
    if (macroPayload.binding.groupBindingMode === 'fixed') {
      groupId = macroPayload.binding.groupId
    } else if (macroPayload.binding.groupBindingMode === 'inherit') {
      const groupBinding = normalizeMacroSnippetGroupBinding(raw?.groupBinding)
      groupId = groupBinding === 'inherit' ? contextGroupId : undefined
    }

    steps.push({
      id: `${node.id}::macro::${i + 1}`,
      kind,
      autoNext,
      groupId
    })
  }

  if (steps.length <= 0) {
    errors.push(createIssue(
      'macro_snippet_empty',
      `宏节点 ${node.id} 展开后无可执行步骤。`,
      `${nodePath}.data.snippet.steps`
    ))
  }

  return { steps, errors, warnings }
}

function normalizeBranchScoreThreshold(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.floor(parsed))
}

function normalizeLoopMaxIterations(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const normalized = Math.floor(parsed)
  if (normalized <= 0) return null
  return normalized
}

const GROUP_BOUND_STEP_KINDS = new Set([
  'playAudio',
  'promptTone',
  'recordGuide',
  'groupPrompt',
  'answerChoice'
])

function lintLinearSteps(steps: VisualLinearStep[]): VisualLinearLintResult {
  const errors: FlowVisualCompileIssue[] = []
  const warnings: FlowVisualCompileIssue[] = []
  if (!Array.isArray(steps) || steps.length <= 0) {
    errors.push(createIssue('steps_empty', '编译后步骤为空。', 'graph.nodes'))
    return { errors, warnings }
  }

  let playAudioCount = 0
  let answerChoiceCount = 0
  let countdownCount = 0
  let firstPlayAudioIndex = -1
  let introCount = 0
  let firstIntroIndex = -1
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]
    const kind = String(step?.kind || '').trim()
    const path = `graph.nodes(${String(step?.id || '')})`
    if (!kind) {
      warnings.push(createIssue('step_kind_empty', `第 ${i + 1} 步未配置步骤类型。`, path))
      continue
    }

    if (kind === 'intro') {
      introCount += 1
      if (firstIntroIndex < 0) firstIntroIndex = i
    }

    if (kind === 'playAudio') {
      playAudioCount += 1
      if (firstPlayAudioIndex < 0) firstPlayAudioIndex = i
    }
    if (kind === 'answerChoice') answerChoiceCount += 1
    if (kind === 'countdown') countdownCount += 1

    if (GROUP_BOUND_STEP_KINDS.has(kind) && !String(step.groupId || '').trim()) {
      warnings.push(createIssue('group_id_missing', `${kind} 建议绑定题组（groupId）以提升运行稳定性。`, path))
    }

    if (kind === 'countdown') {
      const prevKind = String(steps[i - 1]?.kind || '')
      if (i > 0 && prevKind !== 'intro' && prevKind !== 'playAudio') {
        warnings.push(createIssue('countdown_context_unusual', `第 ${i + 1} 步倒计时前置通常为 intro/playAudio，当前为 ${prevKind || '空'}。`, path))
      }
    }

    if (kind === 'promptTone') {
      const prevKind = String(steps[i - 1]?.kind || '')
      if (i > 0 && prevKind !== 'recordGuide' && prevKind !== 'answerChoice') {
        warnings.push(createIssue('prompt_tone_context_unusual', `第 ${i + 1} 步提示音前置通常为 recordGuide/answerChoice，当前为 ${prevKind || '空'}。`, path))
      }
    }
  }

  if (playAudioCount <= 0) {
    errors.push(createIssue('missing_play_audio', '流程至少需要 1 个播放音频步骤。', 'graph.nodes'))
  }
  if (answerChoiceCount <= 0) {
    errors.push(createIssue('missing_answer_choice', '流程至少需要 1 个答题步骤。', 'graph.nodes'))
  }
  if (countdownCount <= 0) {
    warnings.push(createIssue('missing_countdown', '流程中未配置倒计时步骤。', 'graph.nodes'))
  }

  if (introCount > 1) {
    errors.push(createIssue('intro_duplicate', `流程中存在 ${introCount} 个介绍页步骤。`, 'graph.nodes'))
  }
  if (firstIntroIndex > 0) {
    const step = steps[firstIntroIndex]
    errors.push(createIssue(
      'intro_not_first',
      `介绍页步骤出现在第 ${firstIntroIndex + 1} 步，需位于第一步。`,
      `graph.nodes(${String(step?.id || '')})`
    ))
  }

  if (firstPlayAudioIndex > 0) {
    for (let i = 0; i < firstPlayAudioIndex; i += 1) {
      if (String(steps[i]?.kind || '') !== 'answerChoice') continue
      const step = steps[i]
      errors.push(createIssue(
        'answer_before_play_audio',
        `第 ${i + 1} 步答题步骤出现在首个播放音频步骤之前。`,
        `graph.nodes(${String(step?.id || '')})`
      ))
    }
  }

  return { errors, warnings }
}

type Degree = {
  in: number
  out: number
}

type Adjacency = {
  outMap: Map<string, string[]>
  inMap: Map<string, string[]>
  degreeMap: Map<string, Degree>
}

function buildAdjacency(graph: FlowVisualGraph): Adjacency {
  const outMap = new Map<string, string[]>()
  const inMap = new Map<string, string[]>()
  const degreeMap = new Map<string, Degree>()

  for (const node of graph.nodes || []) {
    outMap.set(node.id, [])
    inMap.set(node.id, [])
    degreeMap.set(node.id, { in: 0, out: 0 })
  }

  for (const edge of graph.edges || []) {
    const src = String(edge.source || '')
    const dst = String(edge.target || '')
    if (!degreeMap.has(src) || !degreeMap.has(dst)) continue
    outMap.get(src)?.push(dst)
    inMap.get(dst)?.push(src)
    const srcDeg = degreeMap.get(src)
    const dstDeg = degreeMap.get(dst)
    if (srcDeg) srcDeg.out += 1
    if (dstDeg) dstDeg.in += 1
  }

  return { outMap, inMap, degreeMap }
}

function validateNoCycle(graph: FlowVisualGraph, adjacency: Adjacency): boolean {
  const inDegree = new Map<string, number>()
  const queue: string[] = []
  for (const node of graph.nodes || []) {
    const deg = adjacency.degreeMap.get(node.id)
    const value = Number(deg?.in || 0)
    inDegree.set(node.id, value)
    if (value === 0) queue.push(node.id)
  }

  let visited = 0
  while (queue.length > 0) {
    const current = queue.shift() as string
    visited += 1
    for (const next of adjacency.outMap.get(current) || []) {
      const prev = inDegree.get(next) || 0
      const nextValue = prev - 1
      inDegree.set(next, nextValue)
      if (nextValue === 0) queue.push(next)
    }
  }

  return visited === (graph.nodes || []).length
}

function buildTopologicalNodeOrder(graph: FlowVisualGraph, adjacency: Adjacency): string[] {
  const inDegree = new Map<string, number>()
  const queue: string[] = []
  for (const node of graph.nodes || []) {
    const value = Number(adjacency.degreeMap.get(node.id)?.in || 0)
    inDegree.set(node.id, value)
    if (value === 0) queue.push(node.id)
  }

  const order: string[] = []
  while (queue.length > 0) {
    const current = queue.shift() as string
    order.push(current)
    for (const next of adjacency.outMap.get(current) || []) {
      const updated = (inDegree.get(next) || 0) - 1
      inDegree.set(next, updated)
      if (updated === 0) queue.push(next)
    }
  }
  return order
}

function buildReachableNodeOrder(entryId: string, adjacency: Adjacency): string[] {
  const visited = new Set<string>()
  const queue: string[] = [entryId]
  const order: string[] = []

  while (queue.length > 0) {
    const current = queue.shift() as string
    if (visited.has(current)) continue
    visited.add(current)
    order.push(current)
    for (const next of adjacency.outMap.get(current) || []) {
      if (!visited.has(next)) queue.push(next)
    }
  }

  return order
}

function validateBranchMvpGraph(graph: FlowVisualGraph): FlowVisualCompileResult {
  const errors: FlowVisualCompileIssue[] = []
  const warnings: FlowVisualCompileIssue[] = []
  const nodes = graph.nodes || []
  const edges = graph.edges || []

  if (nodes.length <= 0) {
    errors.push(createIssue('graph_empty', '流程图不能为空。', 'graph.nodes'))
    return { ok: false, steps: [], errors, warnings }
  }

  const nodeIdSet = new Set(nodes.map((n) => String(n.id || '')))
  for (const edge of edges) {
    if (!nodeIdSet.has(String(edge.source || ''))) {
      errors.push(createIssue('edge_missing_source', `连线 ${edge.id} 的 source 节点不存在。`, `graph.edges(${edge.id}).source`))
    }
    if (!nodeIdSet.has(String(edge.target || ''))) {
      errors.push(createIssue('edge_missing_target', `连线 ${edge.id} 的 target 节点不存在。`, `graph.edges(${edge.id}).target`))
    }
  }
  if (errors.length > 0) return { ok: false, steps: [], errors, warnings }

  const adjacency = buildAdjacency(graph)
  const entries = nodes.filter((node) => (adjacency.degreeMap.get(node.id)?.in || 0) === 0)
  const exits = nodes.filter((node) => (adjacency.degreeMap.get(node.id)?.out || 0) === 0)

  if (entries.length !== 1) {
    errors.push(createIssue(
      'entry_count_invalid',
      `分支流程要求且仅允许 1 个入口节点，当前为 ${entries.length} 个。`,
      'graph.nodes'
    ))
  }

  if (exits.length !== 1) {
    errors.push(createIssue(
      'exit_count_invalid',
      `分支流程要求且仅允许 1 个出口节点，当前为 ${exits.length} 个。`,
      'graph.nodes'
    ))
  }

  for (const node of nodes) {
    const degree = adjacency.degreeMap.get(node.id) || { in: 0, out: 0 }
    const kind = resolveNodeStepKind(node)

    if (nodes.length > 1 && degree.in === 0 && degree.out === 0) {
      errors.push(createIssue(
        'isolated_node',
        `节点 ${node.id} 是孤立节点，无法参与执行链路。`,
        `graph.nodes(${node.id})`
      ))
    }

    if (kind === 'branchScore') {
      if (degree.out !== 2) {
        errors.push(createIssue(
          'branch_out_degree_invalid',
          `分支节点 ${node.id} 需要且仅允许 2 条输出路径，当前为 ${degree.out}。`,
          `graph.nodes(${node.id})`
        ))
      }
      const payload = readNodePayload(node)
      if (normalizeBranchScoreThreshold(payload.branchScoreThreshold) === null) {
        errors.push(createIssue(
          'branch_threshold_invalid',
          `分支节点 ${node.id} 的分数阈值无效。`,
          `graph.nodes(${node.id}).data.branchScoreThreshold`
        ))
      }
      continue
    }

    if (degree.out > 1) {
      errors.push(createIssue(
        'branch_node_required',
        `节点 ${node.id} 存在 ${degree.out} 条输出路径，需改为 branchScore 节点。`,
        `graph.nodes(${node.id})`
      ))
    }
  }

  if (!validateNoCycle(graph, adjacency)) {
    errors.push(createIssue(
      'cycle_detected',
      '流程图存在环路，分支 MVP 不支持循环。',
      'graph.edges'
    ))
  }

  if (errors.length > 0) return { ok: false, steps: [], errors, warnings }

  const entry = entries[0]
  const visited = new Set<string>()
  const queue: string[] = [entry.id]
  while (queue.length > 0) {
    const current = queue.shift() as string
    if (visited.has(current)) continue
    visited.add(current)
    for (const next of adjacency.outMap.get(current) || []) {
      if (!visited.has(next)) queue.push(next)
    }
  }

  if (visited.size !== nodes.length) {
    errors.push(createIssue(
      'graph_disconnected',
      '流程图不是单一连通链路，存在无法从入口访问的节点。',
      'graph.nodes'
    ))
  }

  return {
    ok: errors.length <= 0,
    steps: [],
    errors,
    warnings
  }
}

function validateLoopMvpGraph(graph: FlowVisualGraph): FlowVisualCompileResult {
  const errors: FlowVisualCompileIssue[] = []
  const warnings: FlowVisualCompileIssue[] = []
  const nodes = graph.nodes || []
  const edges = graph.edges || []

  if (nodes.length <= 0) {
    errors.push(createIssue('graph_empty', '流程图不能为空。', 'graph.nodes'))
    return { ok: false, steps: [], errors, warnings }
  }

  const nodeIdSet = new Set(nodes.map((n) => String(n.id || '')))
  for (const edge of edges) {
    if (!nodeIdSet.has(String(edge.source || ''))) {
      errors.push(createIssue('edge_missing_source', `连线 ${edge.id} 的 source 节点不存在。`, `graph.edges(${edge.id}).source`))
    }
    if (!nodeIdSet.has(String(edge.target || ''))) {
      errors.push(createIssue('edge_missing_target', `连线 ${edge.id} 的 target 节点不存在。`, `graph.edges(${edge.id}).target`))
    }
  }
  if (errors.length > 0) return { ok: false, steps: [], errors, warnings }

  const adjacency = buildAdjacency(graph)
  const entries = nodes.filter((node) => (adjacency.degreeMap.get(node.id)?.in || 0) === 0)
  const exits = nodes.filter((node) => (adjacency.degreeMap.get(node.id)?.out || 0) === 0)

  if (entries.length !== 1) {
    errors.push(createIssue(
      'entry_count_invalid',
      `循环流程要求且仅允许 1 个入口节点，当前为 ${entries.length} 个。`,
      'graph.nodes'
    ))
  }

  if (exits.length <= 0) {
    errors.push(createIssue(
      'exit_count_invalid',
      '循环流程至少需要 1 个出口节点。',
      'graph.nodes'
    ))
  }

  let loopNodeCount = 0
  for (const node of nodes) {
    const degree = adjacency.degreeMap.get(node.id) || { in: 0, out: 0 }
    const kind = resolveNodeStepKind(node)

    if (nodes.length > 1 && degree.in === 0 && degree.out === 0) {
      errors.push(createIssue(
        'isolated_node',
        `节点 ${node.id} 是孤立节点，无法参与执行链路。`,
        `graph.nodes(${node.id})`
      ))
    }

    if (kind === 'loopNode') {
      loopNodeCount += 1
      if (degree.out !== 2) {
        errors.push(createIssue(
          'loop_out_degree_invalid',
          `循环节点 ${node.id} 需要且仅允许 2 条输出路径（continue/exit），当前为 ${degree.out}。`,
          `graph.nodes(${node.id})`
        ))
      }
      const payload = readNodePayload(node)
      if (normalizeLoopMaxIterations(payload.loopMaxIterations) === null) {
        errors.push(createIssue(
          'loop_max_iterations_invalid',
          `循环节点 ${node.id} 的 maxIterations 必须为正整数。`,
          `graph.nodes(${node.id}).data.loopMaxIterations`
        ))
      }
      continue
    }

    if (degree.out > 1) {
      errors.push(createIssue(
        'loop_node_required',
        `节点 ${node.id} 存在 ${degree.out} 条输出路径，需改为 loopNode 节点。`,
        `graph.nodes(${node.id})`
      ))
    }
  }

  const hasCycle = !validateNoCycle(graph, adjacency)
  if (hasCycle && loopNodeCount <= 0) {
    errors.push(createIssue(
      'cycle_without_loop',
      '流程图存在环路，但未配置 loopNode 节点。',
      'graph.edges'
    ))
  }

  if (errors.length > 0) return { ok: false, steps: [], errors, warnings }

  const entry = entries[0]
  const reachableOrder = buildReachableNodeOrder(entry.id, adjacency)
  if (reachableOrder.length !== nodes.length) {
    errors.push(createIssue(
      'graph_disconnected',
      '流程图不是单一连通链路，存在无法从入口访问的节点。',
      'graph.nodes'
    ))
  }

  return {
    ok: errors.length <= 0,
    steps: [],
    errors,
    warnings
  }
}

export function validateFlowVisualGraph(graph: FlowVisualGraph): FlowVisualCompileResult {
  const errors: FlowVisualCompileIssue[] = []
  const warnings: FlowVisualCompileIssue[] = []
  const nodes = graph.nodes || []
  const edges = graph.edges || []

  if (nodes.length <= 0) {
    errors.push(createIssue('graph_empty', '流程图不能为空。', 'graph.nodes'))
    return { ok: false, steps: [], errors, warnings }
  }

  const nodeIdSet = new Set(nodes.map((n) => String(n.id || '')))
  for (const edge of edges) {
    if (!nodeIdSet.has(String(edge.source || ''))) {
      errors.push(createIssue('edge_missing_source', `连线 ${edge.id} 的 source 节点不存在。`, `graph.edges(${edge.id}).source`))
    }
    if (!nodeIdSet.has(String(edge.target || ''))) {
      errors.push(createIssue('edge_missing_target', `连线 ${edge.id} 的 target 节点不存在。`, `graph.edges(${edge.id}).target`))
    }
  }
  if (errors.length > 0) return { ok: false, steps: [], errors, warnings }

  const adjacency = buildAdjacency(graph)
  const entries = nodes.filter((node) => (adjacency.degreeMap.get(node.id)?.in || 0) === 0)
  const exits = nodes.filter((node) => (adjacency.degreeMap.get(node.id)?.out || 0) === 0)

  if (entries.length !== 1) {
    errors.push(createIssue(
      'entry_count_invalid',
      `线性流程要求且仅允许 1 个入口节点，当前为 ${entries.length} 个。`,
      'graph.nodes'
    ))
  }

  if (exits.length !== 1) {
    errors.push(createIssue(
      'exit_count_invalid',
      `线性流程要求且仅允许 1 个出口节点，当前为 ${exits.length} 个。`,
      'graph.nodes'
    ))
  }

  for (const node of nodes) {
    const degree = adjacency.degreeMap.get(node.id) || { in: 0, out: 0 }
    if (degree.in > 1 || degree.out > 1) {
      errors.push(createIssue(
        'branch_not_supported',
        `节点 ${node.id} 存在多入或多出连线（in=${degree.in}, out=${degree.out}），当前线性模式不支持分支。`,
        `graph.nodes(${node.id})`
      ))
    }
    if (nodes.length > 1 && degree.in === 0 && degree.out === 0) {
      errors.push(createIssue(
        'isolated_node',
        `节点 ${node.id} 是孤立节点，无法参与执行链路。`,
        `graph.nodes(${node.id})`
      ))
    }
  }

  if (!validateNoCycle(graph, adjacency)) {
    errors.push(createIssue(
      'cycle_detected',
      '流程图存在环路，线性流程不支持循环。',
      'graph.edges'
    ))
  }

  if (errors.length > 0) return { ok: false, steps: [], errors, warnings }

  const entry = entries[0]
  const visited = new Set<string>()
  let current = entry.id
  while (current && !visited.has(current)) {
    visited.add(current)
    const next = adjacency.outMap.get(current)?.[0]
    if (!next) break
    current = next
  }

  if (visited.size !== nodes.length) {
    errors.push(createIssue(
      'graph_disconnected',
      '流程图不是单一连通链路，存在无法从入口访问的节点。',
      'graph.nodes'
    ))
    return { ok: false, steps: [], errors, warnings }
  }

  return {
    ok: true,
    steps: [],
    errors,
    warnings
  }
}

export function compileFlowVisualGraphToLinearSteps(
  graph: FlowVisualGraph,
  options: CompileFlowVisualLinearOptions = {}
): FlowVisualCompileResult<VisualLinearStep> {
  const validation = validateFlowVisualGraph(graph)
  if (!validation.ok) {
    return {
      ok: false,
      steps: [],
      errors: validation.errors,
      warnings: validation.warnings
    }
  }

  const adjacency = buildAdjacency(graph)
  const entry = (graph.nodes || []).find((node) => (adjacency.degreeMap.get(node.id)?.in || 0) === 0)
  if (!entry) {
    return {
      ok: false,
      steps: [],
      errors: [createIssue('entry_not_found', '未找到入口节点。', 'graph.nodes')],
      warnings: []
    }
  }

  const idToNode = new Map((graph.nodes || []).map((node) => [node.id, node]))
  const steps: VisualLinearStep[] = []
  const macroErrors: FlowVisualCompileIssue[] = []
  const macroWarnings: FlowVisualCompileIssue[] = []
  const visited = new Set<string>()
  let current = entry.id
  while (current && !visited.has(current)) {
    visited.add(current)
    const node = idToNode.get(current)
    if (!node) break
    const payload = readNodePayload(node)
    if (isMacroNode(node, payload)) {
      const expanded = expandMacroNodeToLinearSteps(node, payload, options)
      if (expanded.steps.length > 0) steps.push(...expanded.steps)
      if (expanded.errors.length > 0) macroErrors.push(...expanded.errors)
      if (expanded.warnings.length > 0) macroWarnings.push(...expanded.warnings)
      const next = adjacency.outMap.get(current)?.[0]
      if (!next) break
      current = next
      continue
    }

    const kind = String(payload.stepKind || node.kind || '').trim() || 'unknown'
    const autoNextRaw = payload.autoNext
    const autoNext = typeof autoNextRaw === 'string' && autoNextRaw.trim()
      ? autoNextRaw
      : undefined
    const groupIdRaw = payload.groupId
    const groupId = typeof groupIdRaw === 'string' && groupIdRaw.trim()
      ? groupIdRaw
      : undefined

    steps.push({
      id: current,
      kind,
      autoNext,
      groupId
    })
    const next = adjacency.outMap.get(current)?.[0]
    if (!next) break
    current = next
  }

  const lint = lintLinearSteps(steps)
  const warnings = [...validation.warnings, ...macroWarnings, ...lint.warnings]
  const errors = [...macroErrors, ...lint.errors]
  return {
    ok: errors.length <= 0,
    steps,
    errors,
    warnings
  }
}

export function compileFlowVisualGraphToBranchMvpSteps(
  graph: FlowVisualGraph
): FlowVisualCompileResult<VisualBranchMvpStep> {
  const validation = validateBranchMvpGraph(graph)
  if (!validation.ok) {
    return {
      ok: false,
      steps: [],
      errors: validation.errors,
      warnings: validation.warnings
    }
  }

  const adjacency = buildAdjacency(graph)
  const idToNode = new Map((graph.nodes || []).map((node) => [node.id, node]))
  const order = buildTopologicalNodeOrder(graph, adjacency)
  if (order.length !== (graph.nodes || []).length) {
    return {
      ok: false,
      steps: [],
      errors: [createIssue('cycle_detected', '流程图存在环路，分支 MVP 不支持循环。', 'graph.edges')],
      warnings: []
    }
  }

  const steps: VisualBranchMvpStep[] = []
  for (const id of order) {
    const node = idToNode.get(id)
    if (!node) continue
    const payload = readNodePayload(node)
    const kind = resolveNodeStepKind(node)
    const autoNext = normalizeOptionalString(payload.autoNext)
    const groupId = normalizeOptionalString(payload.groupId)
    const outgoing = adjacency.outMap.get(id) || []

    const step: VisualBranchMvpStep = {
      id,
      kind,
      autoNext,
      groupId,
      nextStepId: outgoing[0]
    }

    if (kind === 'branchScore') {
      const threshold = normalizeBranchScoreThreshold(payload.branchScoreThreshold)
      const passStepId = outgoing[0]
      const failStepId = outgoing[1]
      if (threshold !== null && passStepId && failStepId) {
        step.branch = {
          condition: {
            type: 'score_gte',
            threshold
          },
          passStepId,
          failStepId,
          defaultStepId: failStepId
        }
      }
    }

    steps.push(step)
  }

  const lint = lintLinearSteps(steps)
  const warnings = [...validation.warnings, ...lint.warnings]
  const errors = [...lint.errors]
  return {
    ok: errors.length <= 0,
    steps,
    errors,
    warnings
  }
}

export function compileFlowVisualGraphToLoopMvpSteps(
  graph: FlowVisualGraph
): FlowVisualCompileResult<VisualLoopMvpStep> {
  const validation = validateLoopMvpGraph(graph)
  if (!validation.ok) {
    return {
      ok: false,
      steps: [],
      errors: validation.errors,
      warnings: validation.warnings
    }
  }

  const adjacency = buildAdjacency(graph)
  const entry = (graph.nodes || []).find((node) => (adjacency.degreeMap.get(node.id)?.in || 0) === 0)
  if (!entry) {
    return {
      ok: false,
      steps: [],
      errors: [createIssue('entry_not_found', '未找到入口节点。', 'graph.nodes')],
      warnings: []
    }
  }

  const order = buildReachableNodeOrder(entry.id, adjacency)
  const idToNode = new Map((graph.nodes || []).map((node) => [node.id, node]))
  const steps: VisualLoopMvpStep[] = []

  for (const id of order) {
    const node = idToNode.get(id)
    if (!node) continue

    const payload = readNodePayload(node)
    const kind = resolveNodeStepKind(node)
    const autoNext = normalizeOptionalString(payload.autoNext)
    const groupId = normalizeOptionalString(payload.groupId)
    const outgoing = adjacency.outMap.get(id) || []

    const step: VisualLoopMvpStep = {
      id,
      kind,
      autoNext,
      groupId,
      nextStepId: outgoing[0]
    }

    if (kind === 'loopNode') {
      const maxIterations = normalizeLoopMaxIterations(payload.loopMaxIterations)
      const continueStepId = outgoing[0]
      const exitStepId = outgoing[1]
      if (maxIterations !== null && continueStepId && exitStepId) {
        step.loop = {
          maxIterations,
          continueStepId,
          exitStepId,
          defaultStepId: exitStepId
        }
      }
    }

    steps.push(step)
  }

  const lint = lintLinearSteps(steps)
  const warnings = [...validation.warnings, ...lint.warnings]
  const errors = [...lint.errors]
  return {
    ok: errors.length <= 0,
    steps,
    errors,
    warnings
  }
}
