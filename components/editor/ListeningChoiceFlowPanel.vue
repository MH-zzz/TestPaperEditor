<template>
  <view class="lc-flow-panel">
    <view class="lc-flow-panel__header">
      <view class="header-row">
        <text class="header-title">引导流程</text>
        <view class="header-actions">
          <button v-if="!readonly" class="btn btn-outline btn-xs" @click="useDefaultFlow">使用默认流程</button>
          <text v-else class="header-hint">只读：到「流程」统一维护</text>
        </view>
      </view>

      <FlowStepQuickAdd
        v-if="!readonly"
        class-name="quick-actions"
        :items="quickAddItems"
        @add="addStep"
      />
    </view>

    <scroll-view scroll-y class="lc-flow-panel__body">
      <view class="panel-inner">
        <view v-if="steps.length === 0" class="empty-tip">暂无步骤</view>

        <view
          v-for="(step, sIndex) in steps"
          :key="step.id"
          class="step-card"
          :class="{
            'step-card--active': activeIndex === sIndex,
            'step-card--expanded': expandedStepId === step.id
          }"
        >
          <view class="step-card__header" @click="toggleExpand(step.id, sIndex)">
            <view class="step-card__header-left">
              <text class="step-card__chev">{{ expandedStepId === step.id ? '▾' : '▸' }}</text>
              <text class="step-card__title">{{ sIndex + 1 }}. {{ stepTitle(step, sIndex) }}</text>
              <text v-if="stepSummary(step, sIndex)" class="step-card__summary">{{ stepSummary(step, sIndex) }}</text>
            </view>
            <view class="step-card__ops">
              <template v-if="!readonly">
                <button class="btn btn-text btn-xs" :disabled="sIndex === 0" @click.stop="moveStep(sIndex, -1)">上移</button>
                <button class="btn btn-text btn-xs" :disabled="sIndex === steps.length - 1" @click.stop="moveStep(sIndex, 1)">下移</button>
                <button class="btn btn-text btn-xs danger" @click.stop="removeStep(sIndex)">删除</button>
              </template>
            </view>
          </view>

          <view v-show="expandedStepId === step.id" class="step-card__body">
            <view v-if="supportsShowTitle(step)" class="form-item">
              <text class="form-item__label">显示标题</text>
              <view
                class="toggle"
                :class="{ active: getStepBool(step, 'showTitle', true) }"
                @click="!readonly && toggleStepBoolWithDefault(sIndex, 'showTitle', true)"
              >
                {{ getStepBool(step, 'showTitle', true) ? '是' : '否' }}
              </view>
            </view>

            <view class="form-item" v-if="step.kind === 'groupPrompt' || step.kind === 'playAudio'">
              <text class="form-item__label">选择题组</text>
              <view class="pill-list">
                <view
                  v-for="g in modelValue.content.groups"
                  :key="g.id"
                  class="pill"
                  :class="{ active: getEditableGroupId(step) === g.id }"
                  @click="!readonly && updateStep(sIndex, { groupId: g.id })"
                >{{ g.title || g.id }}</view>
              </view>
            </view>

            <view class="form-item" v-if="step.kind === 'playAudio'">
              <text class="form-item__label">音频来源</text>
              <view class="mode-toggle">
                <view
                  class="mode-btn"
                  :class="{ active: getPlayAudioSource(step) === 'description' }"
                  @click="!readonly && setPlayAudioSource(sIndex, 'description')"
                >描述音频</view>
                <view
                  class="mode-btn"
                  :class="{ active: getPlayAudioSource(step) === 'content' }"
                  @click="!readonly && setPlayAudioSource(sIndex, 'content')"
                >正文音频</view>
              </view>
            </view>

            <view class="form-item" v-if="step.kind === 'countdown'">
              <view class="grid">
                <view>
                  <text class="form-item__label">秒数</text>
                  <input
                    class="text-input"
                    type="number"
                    :value="countdownStepSeconds(step)"
                    :disabled="readonly"
                    @input="(e) => updateStep(sIndex, { seconds: toInt(e.detail.value) })"
                  />
                </view>
                <view>
                  <text class="form-item__label">标签</text>
                  <input
                    class="text-input"
                    :value="countdownStepLabel(step)"
                    :disabled="readonly"
                    @input="(e) => updateStep(sIndex, { label: e.detail.value })"
                  />
                </view>
              </view>
              <view class="form-item">
                <text class="form-item__label">提示</text>
                <text class="form-tip-inline">倒计时结束不再内置提示音；需要提示音请插入「提示音」步骤。</text>
              </view>
            </view>

            <view class="form-item" v-if="step.kind === 'promptTone'">
              <text class="form-item__label">提示音 URL</text>
              <input
                class="text-input"
                :value="promptToneStepUrl(step)"
                :disabled="readonly"
                @input="(e) => updateStep(sIndex, { url: e.detail.value })"
              />
            </view>

            <view class="form-item" v-if="step.kind === 'answerChoice'">
              <view class="grid">
                <view>
                  <text class="form-item__label">显示题目标题</text>
                  <view class="toggle" :class="{ active: getStepBool(step, 'showQuestionTitle', true) }" @click="!readonly && toggleStepBoolWithDefault(sIndex, 'showQuestionTitle', true)">
                    {{ getStepBool(step, 'showQuestionTitle', true) ? '是' : '否' }}
                  </view>
                </view>
                <view>
                  <text class="form-item__label">显示标题补充</text>
                  <view class="toggle" :class="{ active: getStepBool(step, 'showQuestionTitleDescription', true) }" @click="!readonly && toggleStepBoolWithDefault(sIndex, 'showQuestionTitleDescription', true)">
                    {{ getStepBool(step, 'showQuestionTitleDescription', true) ? '是' : '否' }}
                  </view>
                </view>
              </view>

              <view class="form-item">
                <text class="form-item__label">显示题组描述</text>
                <view class="toggle" :class="{ active: getStepBool(step, 'showGroupPrompt', true) }" @click="!readonly && toggleStepBoolWithDefault(sIndex, 'showGroupPrompt', true)">
                  {{ getStepBool(step, 'showGroupPrompt', true) ? '是' : '否' }}
                </view>
              </view>

              <view class="form-item">
                <text class="form-item__label">题目来源</text>
                <view class="mode-toggle">
                <view
                  class="mode-btn"
                  :class="{ active: !hasQuestionIds(step) }"
                  @click="!readonly && setAnswerSourceGroup(sIndex)"
                  >按题组</view>
                  <view
                    class="mode-btn"
                    :class="{ active: hasQuestionIds(step) }"
                    @click="!readonly && setAnswerSourceQuestions(sIndex)"
                  >按小题</view>
                </view>
              </view>

              <view class="form-item" v-if="!hasQuestionIds(step)">
                <text class="form-item__label">选择题组</text>
                <view class="pill-list">
                  <view
                    v-for="g in modelValue.content.groups"
                    :key="g.id"
                    class="pill"
                    :class="{ active: getEditableGroupId(step) === g.id }"
                    @click="!readonly && updateStep(sIndex, { groupId: g.id })"
                  >{{ g.title || g.id }}</view>
                </view>
              </view>

              <view class="form-item" v-else>
                <text class="form-item__label">选择小题</text>
                <view class="pill-list">
                  <view
                    v-for="q in allQuestions"
                    :key="q.id"
                    class="pill pill--wide"
                    :class="{ active: answerStepQuestionIds(step).includes(q.id) }"
                    @click="!readonly && toggleQuestionId(sIndex, q.id)"
                  >{{ q.order }}. {{ plain(q.stem) || q.id }}</view>
                </view>
              </view>
            </view>

            <view class="form-item" v-if="step.kind === 'finish'">
              <text class="form-item__label">完成页文字</text>
              <input
                class="text-input"
                :value="finishStepText(step)"
                :disabled="readonly"
                @input="(e) => updateStep(sIndex, { text: e.detail.value })"
              />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  FlowAnswerChoiceStep,
  FlowCountdownStep,
  FlowFinishStep,
  FlowIntroStep,
  FlowPlayAudioStep,
  FlowPromptToneStep,
  ListeningChoiceFlowStep,
  ListeningChoiceQuestion,
  RichTextContent,
  SubQuestion
} from '/types'
import { generateId } from '/templates'
import FlowStepQuickAdd from './FlowStepQuickAdd.vue'
import { LISTENING_CHOICE_STANDARD_FLOW_ID, materializeListeningChoiceStandardSteps } from '../../flows/listeningChoiceFlowModules'
import { standardFlows } from '/stores/standardFlows'

const props = defineProps<{
  modelValue: ListeningChoiceQuestion
  activeStepIndex?: number
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ListeningChoiceQuestion): void
  (e: 'stepExpand', index: number): void
}>()

const steps = computed<ListeningChoiceFlowStep[]>(() => props.modelValue.flow?.steps || [])
const activeIndex = computed(() => (typeof props.activeStepIndex === 'number' ? props.activeStepIndex : -1))
const isReadonly = computed(() => !!props.readonly)

const allQuestions = computed<SubQuestion[]>(() => {
  const out: SubQuestion[] = []
  props.modelValue.content.groups.forEach((g) => {
    ;(g.subQuestions || []).forEach((q) => out.push(q))
  })
  return out
})

const expandedStepId = ref<string | null>(null)
const quickAddItems = [
  { key: 'playAudioDescription', label: '描述音频' },
  { key: 'playAudioContent', label: '正文音频' },
  { key: 'countdown', label: '倒计时' },
  { key: 'promptTone', label: '提示音' },
  { key: 'answerChoice', label: '开始答题' }
]

watch(() => props.activeStepIndex, (idx) => {
  if (typeof idx !== 'number') return
  const step = steps.value[idx]
  if (!step) return
  if (expandedStepId.value !== step.id) expandedStepId.value = step.id
})

type StepKind = ListeningChoiceFlowStep['kind']
type StepOfKind<TKind extends StepKind> = Extract<ListeningChoiceFlowStep, { kind: TKind }>
type BooleanStepField = 'showTitle' | 'showQuestionTitle' | 'showQuestionTitleDescription' | 'showGroupPrompt'

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function isStepKind<TKind extends StepKind>(
  step: ListeningChoiceFlowStep | null | undefined,
  kind: TKind
): step is StepOfKind<TKind> {
  return step?.kind === kind
}

function update(next: ListeningChoiceQuestion) {
  emit('update:modelValue', next)
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    intro: '介绍页',
    groupPrompt: '题组提示',
    countdown: '倒计时',
    playAudio: '播放正文音频',
    promptTone: '提示音',
    answerChoice: '开始答题',
    finish: '完成页'
  }
  return map[kind] || kind
}

function getPlayAudioSource(step: ListeningChoiceFlowStep | null | undefined): 'description' | 'content' {
  return isStepKind(step, 'playAudio') && step.audioSource === 'description' ? 'description' : 'content'
}

function playAudioLabel(step: ListeningChoiceFlowStep | null | undefined): string {
  return getPlayAudioSource(step) === 'description' ? '播放描述音频' : '播放正文音频'
}

function getEditableGroupId(step: ListeningChoiceFlowStep | null | undefined): string | undefined {
  if (!step) return undefined
  if (isStepKind(step, 'groupPrompt') || isStepKind(step, 'playAudio')) return step.groupId
  if (isStepKind(step, 'answerChoice') || isStepKind(step, 'promptTone')) return step.groupId
  return undefined
}

function groupDisplayName(groupId: string | undefined) {
  if (!groupId) return ''
  const idx = props.modelValue.content.groups.findIndex(x => x.id === groupId)
  if (idx < 0) return ''
  const g = props.modelValue.content.groups[idx]
  return g?.title || `第${idx + 1}题组`
}

function stepGroupId(step: ListeningChoiceFlowStep, sIndex: number): string | undefined {
  const ownGroupId = getEditableGroupId(step)
  if (ownGroupId) return String(ownGroupId)

  if (step.kind === 'countdown') {
    const prev = steps.value[sIndex - 1]
    const next = steps.value[sIndex + 1]
    const from = (s: ListeningChoiceFlowStep | undefined) => getEditableGroupId(s)
    return from(prev) || from(next)
  }

  return undefined
}

function stepTitle(step: ListeningChoiceFlowStep, sIndex: number): string {
  if (step.kind === 'intro') return kindLabel('intro')
  if (step.kind === 'countdown' && steps.value[sIndex - 1]?.kind === 'intro') {
    return `${kindLabel('intro')} · ${kindLabel('countdown')}`
  }

  const gid = stepGroupId(step, sIndex)
  const groupName = groupDisplayName(gid)
  const base = step.kind === 'playAudio' ? playAudioLabel(step) : kindLabel(step.kind)
  if (groupName) return `${base} · ${groupName}`

  return base
}

function stepSummary(step: ListeningChoiceFlowStep, sIndex: number): string {
  if (step.kind === 'intro') return '播放音频'
  if (step.kind === 'groupPrompt') return ''
  if (step.kind === 'playAudio') return ''
  if (step.kind === 'promptTone') return '提示音'
  if (step.kind === 'countdown') {
    const seconds = Number(step.seconds || 0)
    const label = kindLabel('countdown')
    return seconds > 0 ? `${label} ${seconds}s` : label
  }
  if (step.kind === 'answerChoice') {
    return kindLabel('answerChoice')
  }
  if (step.kind === 'finish') return step.text ? '已配置文案' : ''
  return ''
}

function toggleExpand(stepId: string, index: number) {
  expandedStepId.value = expandedStepId.value === stepId ? null : stepId
  emit('stepExpand', index)
}

function removeStep(index: number) {
  if (isReadonly.value) return
  const nextSteps = steps.value.filter((_, i) => i !== index)
  update({ ...props.modelValue, flow: { ...props.modelValue.flow, steps: nextSteps } })
}

function moveStep(index: number, delta: number) {
  if (isReadonly.value) return
  const list = [...steps.value]
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
  update({ ...props.modelValue, flow: { ...props.modelValue.flow, steps: list } })
}

function updateStep(index: number, patch: Record<string, unknown>) {
  if (isReadonly.value) return
  const list = [...steps.value]
  list[index] = { ...list[index], ...patch } as ListeningChoiceFlowStep
  update({ ...props.modelValue, flow: { ...props.modelValue.flow, steps: list } })
}

function readStepField(step: ListeningChoiceFlowStep | undefined, key: string): unknown {
  if (!step || !isObjectRecord(step)) return undefined
  return step[key]
}

function toggleStepBool(index: number, key: BooleanStepField) {
  if (isReadonly.value) return
  const step = steps.value[index]
  const current = readStepField(step, key)
  updateStep(index, { [key]: !(current === true) })
}

function getStepBool(step: ListeningChoiceFlowStep | undefined, key: BooleanStepField, defaultValue: boolean) {
  const v = readStepField(step, key)
  if (typeof v === 'boolean') return v
  return defaultValue
}

function toggleStepBoolWithDefault(index: number, key: BooleanStepField, defaultValue: boolean) {
  if (isReadonly.value) return
  const step = steps.value[index]
  const current = getStepBool(step, key, defaultValue)
  updateStep(index, { [key]: !current })
}

function supportsShowTitle(step: ListeningChoiceFlowStep | undefined) {
  if (!step) return false
  return (
    step.kind === 'intro' ||
    step.kind === 'countdown' ||
    step.kind === 'groupPrompt' ||
    step.kind === 'playAudio' ||
    step.kind === 'answerChoice'
  )
}

function answerStepQuestionIds(step: ListeningChoiceFlowStep | undefined): string[] {
  if (!isStepKind(step, 'answerChoice')) return []
  return Array.isArray(step.questionIds) ? step.questionIds : []
}

function hasQuestionIds(step: ListeningChoiceFlowStep | undefined) {
  return answerStepQuestionIds(step).length > 0
}

function setAnswerSourceGroup(stepIndex: number) {
  if (isReadonly.value) return
  updateStep(stepIndex, { questionIds: undefined })
}

function setAnswerSourceQuestions(stepIndex: number) {
  if (isReadonly.value) return
  const step = steps.value[stepIndex]
  if (!isStepKind(step, 'answerChoice')) return
  if (Array.isArray(step.questionIds)) return
  updateStep(stepIndex, { questionIds: [] })
}

function setPlayAudioSource(stepIndex: number, source: 'description' | 'content') {
  if (isReadonly.value) return
  updateStep(stepIndex, { audioSource: source })
}

function toggleQuestionId(stepIndex: number, id: string) {
  if (isReadonly.value) return
  const step = steps.value[stepIndex]
  if (!isStepKind(step, 'answerChoice')) return
  const list: string[] = Array.isArray(step.questionIds) ? [...step.questionIds] : []
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
  updateStep(stepIndex, { questionIds: list })
}

function createStep<TStep extends ListeningChoiceFlowStep>(step: Omit<TStep, 'id'>): TStep {
  return { id: generateId(), ...step } as TStep
}

function addStep(kind: string) {
  if (isReadonly.value) return
  const list = [...steps.value]
  const firstGroupId = props.modelValue.content.groups[0]?.id || ''

  if (kind === 'intro') {
    list.push(createStep<FlowIntroStep>({ kind: 'intro', showTitle: true, autoNext: 'audioEnded' }))
  } else if (kind === 'countdown') {
    list.push(createStep<FlowCountdownStep>({ kind: 'countdown', showTitle: true, seconds: 3, label: '准备', autoNext: 'countdownEnded' }))
  } else if (kind === 'playAudioDescription') {
    list.push(createStep<FlowPlayAudioStep>({
      kind: 'playAudio',
      showTitle: true,
      groupId: firstGroupId,
      audioSource: 'description',
      showQuestionTitle: true,
      showQuestionTitleDescription: true,
      showGroupPrompt: true,
      autoNext: 'audioEnded'
    }))
  } else if (kind === 'playAudioContent' || kind === 'playAudio') {
    list.push(createStep<FlowPlayAudioStep>({
      kind: 'playAudio',
      showTitle: true,
      groupId: firstGroupId,
      audioSource: 'content',
      showQuestionTitle: true,
      showQuestionTitleDescription: true,
      showGroupPrompt: true,
      autoNext: 'audioEnded'
    }))
  } else if (kind === 'promptTone') {
    list.push(createStep<FlowPromptToneStep>({
      kind: 'promptTone',
      showTitle: true,
      groupId: firstGroupId,
      url: '/static/audio/small_time.mp3',
      autoNext: 'audioEnded'
    }))
  } else if (kind === 'answerChoice') {
    list.push(createStep<FlowAnswerChoiceStep>({
      kind: 'answerChoice',
      showTitle: true,
      groupId: firstGroupId,
      showQuestionTitle: true,
      showQuestionTitleDescription: true,
      showGroupPrompt: true,
      autoNext: 'tapNext'
    }))
  }

  update({ ...props.modelValue, flow: { ...props.modelValue.flow, steps: list } })
}

function useDefaultFlow() {
  if (isReadonly.value) return
  uni.showModal({
    title: '使用默认流程',
    content: '这会覆盖当前流程步骤，是否继续？',
    confirmText: '覆盖',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      const nextSteps = materializeListeningChoiceStandardSteps(props.modelValue, {
        generateId,
        overrides: {},
        module: standardFlows.state.listeningChoice
      }) as ListeningChoiceFlowStep[]
      update({
        ...props.modelValue,
        flow: {
          version: 1,
          mode: 'semi-auto',
          source: { kind: 'standard', id: LISTENING_CHOICE_STANDARD_FLOW_ID, overrides: {} },
          steps: nextSteps
        }
      })
      expandedStepId.value = nextSteps[0]?.id || null
      emit('stepExpand', 0)
      uni.showToast({ title: '已生成默认流程', icon: 'success' })
    }
  })
}

function plain(rt: RichTextContent | undefined): string {
  if (!rt || !Array.isArray(rt.content)) return ''
  return rt.content.map((n) => (n.type === 'text' ? n.text : '')).join('')
}

function countdownStepSeconds(step: ListeningChoiceFlowStep | undefined): number {
  return isStepKind(step, 'countdown') ? Number(step.seconds || 0) : 0
}

function countdownStepLabel(step: ListeningChoiceFlowStep | undefined): string {
  return isStepKind(step, 'countdown') ? String(step.label || '') : ''
}

function promptToneStepUrl(step: ListeningChoiceFlowStep | undefined): string {
  return isStepKind(step, 'promptTone')
    ? String(step.url || '/static/audio/small_time.mp3')
    : '/static/audio/small_time.mp3'
}

function finishStepText(step: ListeningChoiceFlowStep | undefined): string {
  return isStepKind(step, 'finish') ? String(step.text || '') : ''
}

function toInt(v: unknown): number {
  const n = parseInt(String(v || '0'), 10)
  return Number.isFinite(n) ? n : 0
}
</script>

<style lang="scss" scoped>
.lc-flow-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.lc-flow-panel__header {
  padding: 12px 12px 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #fff, rgba(255, 255, 255, 0.92));
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-hint {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.header-title {
  font-size: 14px;
  font-weight: 700;
  color: $text-primary;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.lc-flow-panel__body {
  flex: 1;
  min-height: 0;
  height: 0;
}

.panel-inner {
  padding: 12px;
}

.empty-tip {
  padding: $spacing-md;
  color: $text-hint;
  font-size: $font-size-sm;
}

.form-tip-inline {
  display: block;
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
  line-height: 1.45;
}

.step-card {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.90);
  overflow: hidden;
  margin-bottom: 10px;
}

.step-card--active {
  border-color: rgba(33, 150, 243, 0.35);
  box-shadow: 0 10px 18px rgba(33, 150, 243, 0.10);
}

.step-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 10px;
  background: rgba(248, 250, 252, 0.85);
}

.step-card__header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.step-card__chev {
  width: 14px;
  flex-shrink: 0;
  color: rgba(15, 23, 42, 0.55);
}

.step-card__title {
  font-weight: 700;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.85);
  white-space: nowrap;
}

.step-card__summary {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-card__ops {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.step-card__body {
  padding: 10px 10px 2px;
}

.form-item {
  margin-bottom: 10px;
}

.form-item__label {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.65);
  margin-bottom: 6px;
}

.text-input {
  width: 100%;
  height: 34px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0 10px;
  font-size: 13px;
  background: rgba(248, 250, 252, 0.9);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: #fff;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.75);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pill--wide {
  width: 100%;
  border-radius: 12px;
}

.pill.active {
  border-color: rgba(33, 150, 243, 0.35);
  background: rgba(33, 150, 243, 0.08);
  color: $primary-color;
}

.mode-toggle {
  display: flex;
  gap: 0;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(241, 245, 249, 0.9);
}

.mode-btn {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.65);
  flex: 1;
  text-align: center;
}

.mode-btn.active {
  color: $text-primary;
  background: #fff;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.10);
}

.toggle {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(248, 250, 252, 0.9);
  font-size: 12px;
  color: rgba(15, 23, 42, 0.65);
}

.toggle.active {
  border-color: rgba(33, 150, 243, 0.35);
  background: rgba(33, 150, 243, 0.08);
  color: $primary-color;
}

:deep(.btn.btn-xs) {
  padding: 2px 8px;
  min-height: 28px;
  line-height: 24px;
  font-size: 12px;
}

:deep(.btn.btn-text) {
  background: transparent;
}

:deep(.btn.danger) {
  color: #e53e3e;
}
</style>
