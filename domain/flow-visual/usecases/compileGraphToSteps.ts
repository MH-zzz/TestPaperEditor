import type {
  FlowVisualCompileIssue,
  FlowVisualCompileResult,
  FlowVisualGraph
} from '/types'

export type VisualLinearStep = {
  id: string
  kind: string
  autoNext?: string
  groupId?: string
}

type NodePayload = {
  stepKind?: unknown
  autoNext?: unknown
  groupId?: unknown
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
  graph: FlowVisualGraph
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
  const visited = new Set<string>()
  let current = entry.id
  while (current && !visited.has(current)) {
    visited.add(current)
    const node = idToNode.get(current)
    if (!node) break
    const payload = readNodePayload(node)
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

  return {
    ok: true,
    steps,
    errors: [],
    warnings: validation.warnings
  }
}
