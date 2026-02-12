<template>
  <view class="lc-flow-diagram">
    <view class="lc-flow-diagram__header">
      <text v-if="showHeaderTitle" class="lc-flow-diagram__title">{{ headerTitle }}</text>
      <view v-else class="lc-flow-diagram__title-spacer"></view>
      <view class="lc-flow-diagram__header-right">
        <slot name="header-actions" />
        <text class="lc-flow-diagram__meta">{{ nodes.length }} 步</text>
      </view>
    </view>

    <view v-if="nodes.length === 0" class="lc-flow-diagram__empty">暂无步骤</view>

    <view v-else class="lc-flow-diagram__list">
      <view
        v-for="(n, idx) in nodes"
        :key="n.id"
        class="node-wrap"
        :class="{
          'node-wrap--dragging': idx === draggingIndex,
          'node-wrap--over': idx === dragOverIndex
        }"
        @dragover.prevent="onDragOver(idx)"
        @drop.prevent="onDrop(idx)"
      >
        <view
          class="node"
          :class="{ active: idx === activeIndex }"
          @click="emit('select', idx)"
        >
          <view class="node__rail">
            <view class="node__dot" :class="`node__dot--${n.kind}`"></view>
            <view v-if="idx < nodes.length - 1" class="node__line"></view>
          </view>

          <view class="node__body">
            <view class="node__top">
              <text class="node__index">{{ idx + 1 }}</text>
              <text class="node__title">{{ n.title }}</text>
            </view>
            <text v-if="n.desc" class="node__desc">{{ n.desc }}</text>
          </view>

          <view
            v-if="sortable && canReorder(idx)"
            class="node__drag-handle"
            draggable="true"
            @click.stop
            @dragstart="onDragStart(idx, $event)"
            @dragend="onDragEnd"
          >
            <text class="node__drag-dots">⋮⋮</text>
          </view>
        </view>

        <view v-if="$slots['node-extra']" class="node__extra">
          <slot name="node-extra" :index="idx" :node="n" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  FlowAnswerChoiceStep,
  FlowCountdownStep,
  FlowFinishStep,
  FlowPlayAudioStep,
  ListeningChoiceFlowStep,
  ListeningChoiceQuestion
} from '/types'

const props = defineProps<{
  question: ListeningChoiceQuestion
  steps: ListeningChoiceFlowStep[]
  activeStepIndex?: number
  headerTitle?: string
  showHeaderTitle?: boolean
  sortable?: boolean
  reorderableIndices?: number[]
}>()

const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'reorder', fromIndex: number, toIndex: number): void
}>()

const activeIndex = computed(() => (typeof props.activeStepIndex === 'number' ? props.activeStepIndex : -1))
const headerTitle = computed(() => String(props.headerTitle || '流程图'))
const showHeaderTitle = computed(() => props.showHeaderTitle !== false)
const sortable = computed(() => props.sortable === true)
const draggingIndex = ref(-1)
const dragOverIndex = ref(-1)
const reorderableSet = computed(() => {
  const set = new Set<number>()
  ;(props.reorderableIndices || []).forEach((n) => {
    const next = Number(n)
    if (Number.isFinite(next) && next >= 0) set.add(next)
  })
  return set
})

function canReorder(index: number): boolean {
  if (!sortable.value) return false
  if (reorderableSet.value.size === 0) return true
  return reorderableSet.value.has(index)
}

function clearDragState() {
  draggingIndex.value = -1
  dragOverIndex.value = -1
}

interface DragStartEventLike {
  dataTransfer?: {
    effectAllowed?: string
    dropEffect?: string
    setData?: (format: string, data: string) => void
  } | null
}

function onDragStart(index: number, e?: DragStartEventLike) {
  if (!canReorder(index)) return
  draggingIndex.value = index
  dragOverIndex.value = index
  const dt = e?.dataTransfer
  if (dt) {
    dt.effectAllowed = 'move'
    dt.dropEffect = 'move'
    try {
      dt.setData('text/plain', String(index))
    } catch (_) {
      // no-op: some runtimes disallow writing drag data
    }
  }
}

function onDragOver(index: number) {
  if (draggingIndex.value < 0) return
  if (!canReorder(index)) return
  dragOverIndex.value = index
}

function onDrop(index: number) {
  const from = draggingIndex.value
  const to = index
  clearDragState()
  if (from < 0) return
  if (!canReorder(from) || !canReorder(to)) return
  if (from === to) return
  emit('reorder', from, to)
}

function onDragEnd() {
  clearDragState()
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    intro: '介绍页',
    countdown: '倒计时',
    playAudio: '播放正文音频',
    promptTone: '提示音',
    answerChoice: '开始答题',
    groupPrompt: '题组提示',
    finish: '完成页'
  }
  return map[kind] || kind
}

function audioSource(step: FlowPlayAudioStep): 'description' | 'content' {
  return step?.audioSource === 'description' ? 'description' : 'content'
}

function groupDisplayName(groupId: string | undefined) {
  if (!groupId) return ''
  const idx = props.question.content.groups.findIndex(g => g.id === groupId)
  if (idx < 0) return ''
  const g = props.question.content.groups[idx]
  return g?.title || `题组 ${idx + 1}`
}

function getStepGroupCandidate(step: ListeningChoiceFlowStep | undefined): string | undefined {
  if (!step) return undefined
  if (
    step.kind === 'groupPrompt' ||
    step.kind === 'playAudio' ||
    step.kind === 'promptTone' ||
    step.kind === 'answerChoice'
  ) {
    return typeof step.groupId === 'string' ? step.groupId : undefined
  }
  return undefined
}

function stepGroupId(step: ListeningChoiceFlowStep, sIndex: number): string | undefined {
  const directGroupId = getStepGroupCandidate(step)
  if (directGroupId) return directGroupId

  if (step.kind === 'countdown') {
    const steps = props.steps || []
    const prev = steps[sIndex - 1]
    const next = steps[sIndex + 1]
    return getStepGroupCandidate(prev) || getStepGroupCandidate(next)
  }

  return undefined
}

const nodes = computed(() => {
  const steps = props.steps || []
  return steps.map((step, idx) => {
    const prev = steps[idx - 1]
    const source = step.kind === 'playAudio' ? audioSource(step) : 'content'
    const base = step.kind === 'playAudio'
      ? (source === 'description' ? '播放描述音频' : '播放正文音频')
      : kindLabel(step.kind)
    let title = base

    if (step.kind === 'countdown' && prev?.kind === 'intro') {
      title = `${kindLabel('intro')} · ${base}`
    } else {
      const gid = stepGroupId(step, idx)
      const gName = groupDisplayName(gid)
      if (gName) title = `${base} · ${gName}`
    }

    let desc = ''
    if (step.kind === 'countdown') {
      const countdownStep: FlowCountdownStep = step
      const seconds = Number(countdownStep.seconds || 0)
      const label = String(countdownStep.label || '').trim()
      desc = `${label || kindLabel('countdown')} ${seconds}s`
    } else if (step.kind === 'answerChoice') {
      const answerStep: FlowAnswerChoiceStep = step
      const gid = String(answerStep.groupId || '')
      const g = props.question.content.groups.find(x => x.id === gid)
      const answerSeconds = Math.max(0, Number(g?.answerSeconds || 0))
      desc = answerSeconds > 0 ? `答题 ${answerSeconds}s` : '进入作答'
    } else if (step.kind === 'intro') {
      const cnt = Number(props.question.content?.intro?.audio?.playCount || 1)
      desc = cnt > 1 ? `说明音频 x${cnt}` : '说明音频'
    } else if (step.kind === 'playAudio') {
      const gid = String(step.groupId || '')
      const g = props.question.content.groups.find(x => x.id === gid)
      const cnt = source === 'description'
        ? Number(g?.descriptionAudio?.playCount || 1)
        : Number(g?.audio?.playCount || 1)
      const label = source === 'description' ? '描述音频' : '正文音频'
      desc = cnt > 1 ? `${label} x${cnt}` : label
    } else if (step.kind === 'promptTone') {
      desc = '提示音'
    } else if (step.kind === 'finish') {
      const finishStep: FlowFinishStep = step
      const text = String(finishStep.text || '').trim()
      desc = text ? '已配置文案' : ''
    }

    return {
      id: String(step.id || `${idx}`),
      kind: String(step.kind || ''),
      title,
      desc
    }
  })
})
</script>

<style lang="scss" scoped>
.lc-flow-diagram {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  overflow: hidden;
}

.lc-flow-diagram__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
}

.lc-flow-diagram__title {
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.lc-flow-diagram__title-spacer {
  min-width: 0;
  flex: 1;
}

.lc-flow-diagram__header-right {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.lc-flow-diagram__meta {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
  white-space: nowrap;
}

.lc-flow-diagram__empty {
  padding: 14px;
  color: $text-hint;
  font-size: 12px;
}

.lc-flow-diagram__list {
  padding: 12px 10px 14px;
}

.node {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  transition: background 0.12s, border-color 0.12s, transform 0.12s, opacity 0.12s;
}

.node-wrap + .node-wrap {
  margin-top: 2px;
}

.node-wrap--dragging .node {
  opacity: 0.55;
}

.node-wrap--over .node {
  background: rgba(219, 234, 254, 0.72);
  border-color: rgba(59, 130, 246, 0.48);
}

.node:active {
  transform: translateY(1px);
}

.node.active {
  background: rgba(227, 242, 253, 0.85);
}

.node__rail {
  width: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(148, 163, 184, 0.9);
  background: rgba(148, 163, 184, 0.14);
  box-sizing: border-box;
}

.node__dot--intro {
  border-color: rgba(37, 99, 235, 0.7);
  background: rgba(37, 99, 235, 0.12);
}

.node__dot--playAudio {
  border-color: rgba(245, 158, 11, 0.75);
  background: rgba(245, 158, 11, 0.12);
}

.node__dot--countdown {
  border-color: rgba(99, 102, 241, 0.7);
  background: rgba(99, 102, 241, 0.10);
}

.node__dot--promptTone {
  border-color: rgba(251, 191, 36, 0.78);
  background: rgba(251, 191, 36, 0.14);
}

.node__dot--answerChoice {
  border-color: rgba(16, 185, 129, 0.75);
  background: rgba(16, 185, 129, 0.12);
}

.node__dot--groupPrompt {
  border-color: rgba(244, 63, 94, 0.65);
  background: rgba(244, 63, 94, 0.10);
}

.node__dot--finish {
  border-color: rgba(20, 184, 166, 0.75);
  background: rgba(20, 184, 166, 0.10);
}

.node__line {
  flex: 1;
  width: 2px;
  margin-top: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.45), rgba(148, 163, 184, 0.10));
}

.node__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.node__top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.node__index {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.45);
  flex-shrink: 0;
}

.node__title {
  font-size: 13px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.88);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node__desc {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.node__drag-handle {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-top: 2px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(248, 250, 252, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
}

.node__drag-handle:active {
  cursor: grabbing;
}

.node__drag-dots {
  letter-spacing: 1px;
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
  line-height: 1;
}

.node__extra {
  margin: 6px 0 2px 30px;
}
</style>
