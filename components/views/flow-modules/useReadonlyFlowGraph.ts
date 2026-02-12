import type { FlowVisualEdge, FlowVisualGraph, FlowVisualNode, ListeningChoiceQuestion } from '/types'

export type ReadonlyFlowStepCategory = 'media' | 'control' | 'interaction' | 'misc'

export type ReadonlyFlowNodePayload = {
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

type ListeningChoiceFlowStep = ListeningChoiceQuestion['flow']['steps'][number]

const STEP_KIND_META: Record<string, {
  label: string
  color: string
  category: ReadonlyFlowStepCategory
  categoryLabel: string
}> = {
  intro: { label: '介绍页', color: '#2563eb', category: 'control', categoryLabel: '控制' },
  countdown: { label: '倒计时', color: '#f59e0b', category: 'control', categoryLabel: '控制' },
  playAudio: { label: '播放音频', color: '#0284c7', category: 'media', categoryLabel: '媒体' },
  promptTone: { label: '提示音', color: '#0ea5e9', category: 'media', categoryLabel: '媒体' },
  answerChoice: { label: '答题', color: '#16a34a', category: 'interaction', categoryLabel: '交互' },
  contextInfo: { label: '上下文提示', color: '#7c3aed', category: 'control', categoryLabel: '控制' }
}

const AUTO_NEXT_LABEL: Record<string, string> = {
  audioEnded: '音频结束自动推进',
  countdownEnded: '倒计时结束自动推进',
  timeEnded: '作答时间结束自动推进',
  tapNext: '手动点击下一步'
}

function resolveStepKindMeta(kind: string) {
  const key = String(kind || '')
  return STEP_KIND_META[key] || {
    label: key || '未知步骤',
    color: '#475569',
    category: 'misc',
    categoryLabel: '其他'
  }
}

function readStepGroupId(step: ListeningChoiceFlowStep): string {
  const value = (step as { groupId?: unknown }).groupId
  return typeof value === 'string' ? value : ''
}

function readStepQuestionCount(step: ListeningChoiceFlowStep): number {
  const value = (step as { questionIds?: unknown }).questionIds
  return Array.isArray(value) ? value.length : 0
}

function resolveStepSubtitle(step: ListeningChoiceFlowStep): string {
  const autoNext = String(step.autoNext || '')
  const autoNextText = AUTO_NEXT_LABEL[autoNext] || (autoNext ? `触发：${autoNext}` : '未配置自动推进')
  const groupId = readStepGroupId(step)
  const questionCount = readStepQuestionCount(step)
  const details: string[] = [autoNextText]
  if (groupId) details.push(`题组 ${groupId}`)
  if (questionCount > 0) details.push(`小题 ${questionCount}`)
  return details.join(' · ')
}

export function buildListeningChoiceReadonlyFlowGraph(
  question: ListeningChoiceQuestion | null | undefined
): FlowVisualGraph<ReadonlyFlowNodePayload> {
  const steps = question?.flow?.steps || []
  const nodeWidth = 190
  const nodeHeight = 70
  const gapY = 56
  const startX = 56
  const startY = 34
  const canvasWidth = 320
  const nodes: FlowVisualNode<ReadonlyFlowNodePayload>[] = steps.map((step, index) => {
    const meta = resolveStepKindMeta(String(step?.kind || ''))
    const stepId = String(step?.id || `step_${index + 1}`)
    const autoNext = String(step?.autoNext || '')
    const autoNextLabel = AUTO_NEXT_LABEL[autoNext] || (autoNext ? `触发：${autoNext}` : '未配置自动推进')
    return {
      id: `visual_${stepId}_${index + 1}`,
      kind: String(step?.kind || ''),
      label: `${index + 1}. ${meta.label}`,
      subtitle: resolveStepSubtitle(step),
      color: meta.color,
      position: {
        x: startX,
        y: startY + index * (nodeHeight + gapY)
      },
      size: {
        width: nodeWidth,
        height: nodeHeight
      },
      data: {
        index,
        stepId,
        stepKind: String(step?.kind || ''),
        autoNext,
        autoNextLabel,
        category: meta.category,
        categoryLabel: meta.categoryLabel,
        groupId: readStepGroupId(step),
        questionCount: readStepQuestionCount(step)
      }
    }
  })

  const edges: FlowVisualEdge[] = []
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const source = nodes[i]
    const target = nodes[i + 1]
    const sourceBottom = source.position.y + source.size.height
    const targetTop = target.position.y
    edges.push({
      id: `edge_${source.id}_${target.id}`,
      source: source.id,
      target: target.id,
      x: Math.round(source.position.x + source.size.width / 2),
      y: sourceBottom,
      height: Math.max(8, targetTop - sourceBottom)
    })
  }

  const canvasHeight = nodes.length > 0
    ? startY + nodes.length * (nodeHeight + gapY) - gapY + 46
    : 180

  return {
    nodes,
    edges,
    canvas: {
      width: canvasWidth,
      height: canvasHeight
    }
  }
}
