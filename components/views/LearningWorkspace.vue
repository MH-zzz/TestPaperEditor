<template>
  <view class="learning-workspace">
    <view class="learning-header">
      <view class="learning-header__main">
        <text class="learning-title">学习</text>
        <text class="learning-subtitle">使用本地题库做只读演练，按地区/场景/年级验证流程行为</text>
      </view>

      <view class="learning-header__actions">
        <button class="btn btn-outline btn-sm" @click="reloadQuestionPool">刷新本地题库</button>
        <button class="btn btn-outline btn-sm" @click="toggleRuntimeDebug">调试</button>
        <button class="btn btn-primary btn-sm" :disabled="!selectedQuestion" @click="startSimulation">开始演练</button>
      </view>
    </view>

    <view class="learning-body">
      <view class="learning-left">
        <view class="panel">
          <view class="panel__header">
            <view>
              <text class="panel__title">题库选题</text>
              <text class="panel__desc">当前仅支持：听后选择</text>
            </view>
            <text class="panel__meta">{{ filteredQuestionPool.length }} 题</text>
          </view>
          <view class="panel__body">
            <view class="question-search">
              <input
                class="question-search__input"
                :value="questionQuery"
                placeholder="搜索题干/ID"
                @input="(e) => questionQuery = String(e.detail.value || '')"
              />
            </view>

            <scroll-view scroll-y class="question-list">
              <view
                v-for="q in filteredQuestionPool"
                :key="q.id"
                class="question-item"
                :class="{ active: q.id === selectedQuestionId }"
                @click="selectQuestion(q.id)"
              >
                <view class="question-item__head">
                  <text class="question-item__type">听后选择</text>
                  <text class="question-item__id">{{ q.id }}</text>
                </view>
                <text class="question-item__summary">{{ getQuestionSummary(q) }}</text>
              </view>

              <view v-if="filteredQuestionPool.length === 0" class="empty-tip">未找到可演练题目</view>
            </scroll-view>
          </view>
        </view>

        <view class="panel">
          <view class="panel__header">
            <view>
              <text class="panel__title">上下文模拟</text>
              <text class="panel__desc">用于命中流程路由规则</text>
            </view>
            <button class="btn btn-outline btn-xs" :disabled="!selectedQuestion" @click="loadContextFromSelectedQuestion">从题目读取</button>
          </view>

          <view class="panel__body">
            <view class="ctx-grid">
              <view class="ctx-field">
                <text class="ctx-field__label">地区</text>
                <input class="ctx-field__input" :value="simRegion" placeholder="例如：广东" @input="(e) => simRegion = String(e.detail.value || '')" />
              </view>
              <view class="ctx-field">
                <text class="ctx-field__label">场景</text>
                <input class="ctx-field__input" :value="simScene" placeholder="例如：中考" @input="(e) => simScene = String(e.detail.value || '')" />
              </view>
              <view class="ctx-field">
                <text class="ctx-field__label">年级</text>
                <input class="ctx-field__input" :value="simGrade" placeholder="例如：九年级" @input="(e) => simGrade = String(e.detail.value || '')" />
              </view>
            </view>

            <view class="ctx-actions">
              <button class="btn btn-outline btn-xs" @click="clearContext">清空上下文</button>
            </view>
          </view>
        </view>

        <view class="panel">
          <view class="panel__header">
            <view>
              <text class="panel__title">命中结果</text>
              <text class="panel__desc">开始演练后展示</text>
            </view>
          </view>

          <view class="panel__body panel__body--compact">
            <view class="hit-line"><text class="hit-key">规则</text><text class="hit-value">{{ runtimeMeta.profileId || '默认规则' }}</text></view>
            <view class="hit-line"><text class="hit-key">模块</text><text class="hit-value">{{ runtimeMeta.moduleDisplayRef || '-' }}</text></view>
            <view class="hit-line"><text class="hit-key">模块备注</text><text class="hit-value">{{ runtimeMeta.moduleNote || '-' }}</text></view>
            <view class="hit-line"><text class="hit-key">版本</text><text class="hit-value">{{ runtimeMeta.moduleVersionText }}</text></view>
            <view class="hit-line"><text class="hit-key">来源</text><text class="hit-value">{{ runtimeMeta.sourceKind || '-' }}</text></view>
            <view class="hit-line"><text class="hit-key">当前步骤</text><text class="hit-value">{{ activeStepLabel }}</text></view>
          </view>
        </view>
      </view>

      <view class="learning-middle">
        <view class="panel panel--trace">
          <view class="panel__header">
            <view>
              <text class="panel__title">步骤轨迹</text>
              <text class="panel__desc">展示演练中的关键事件</text>
            </view>
          </view>

          <scroll-view scroll-y class="trace-list">
            <view v-for="item in traceEvents" :key="item.id" class="trace-item">
              <view class="trace-item__head">
                <text class="trace-item__time">{{ item.time }}</text>
                <text class="trace-item__type">{{ item.type }}</text>
              </view>
              <text class="trace-item__text">{{ item.message }}</text>
            </view>

            <view v-if="traceEvents.length === 0" class="empty-tip">开始演练后会记录轨迹</view>
          </scroll-view>
        </view>
      </view>

      <view class="learning-right">
        <PhonePreviewPanel
          title="学习演练（手机）"
          :data="resolvedQuestion"
          :answers="previewAnswers"
          :show-answer="showAnswer"
          :step-index="currentStepIndex"
          :total-steps="previewTotalSteps"
          :runtime-meta="runtimeMeta"
          :render-mode="'exam'"
          :show-answer-toggle="true"
          @prev="previewPrevStep"
          @next="previewNextStep"
          @toggle-answer="showAnswer = !showAnswer"
          @select="onPreviewSelect"
          @step-change="onPreviewStepChange"
        >
          <template #footer>
            <view class="preview-footer">当前为真实执行模式（exam），流程按引擎自动推进。</view>
          </template>
        </PhonePreviewPanel>
      </view>
    </view>

    <RuntimeDebugDrawer :session-id="learningDebugSessionId" title="学习演练调试抽屉" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ListeningChoiceQuestion } from '/types'
import PhonePreviewPanel from '/components/layout/PhonePreviewPanel.vue'
import RuntimeDebugDrawer from '/components/layout/RuntimeDebugDrawer.vue'
import { generateId } from '/templates'
import { flowModules } from '/stores/flowModules'
import { runtimeDebug } from '/stores/runtimeDebug'
import { questionDraft } from '/stores/questionDraft'
import { runQuestionFlow, reduceQuestionFlowRuntimeState } from '/app/usecases/runQuestionFlow'

type LocalQuestion = {
  id: string
  type: string
  content?: any
  flow?: any
  metadata?: any
}

type TraceItem = {
  id: string
  time: string
  type: string
  message: string
}

const questionPool = ref<LocalQuestion[]>([])
const questionQuery = ref('')
const selectedQuestionId = ref('')

const simRegion = ref('')
const simScene = ref('')
const simGrade = ref('')
const learningDebugSessionId = 'learning-simulation-runtime'

const resolvedQuestion = ref<ListeningChoiceQuestion | null>(null)
const previewAnswers = ref<Record<string, string | string[]>>({})
const showAnswer = ref(false)
const currentStepIndex = ref(0)
const traceEvents = ref<TraceItem[]>([])

const runtimeMeta = ref({
  sourceKind: '',
  profileId: '',
  moduleId: '',
  moduleDisplayRef: '',
  moduleNote: '',
  moduleVersionText: '-'
})

const selectedQuestion = computed(() => {
  return questionPool.value.find((q) => q.id === selectedQuestionId.value) || null
})

const filteredQuestionPool = computed(() => {
  const q = normalizeText(questionQuery.value)
  return (questionPool.value || []).filter((item) => {
    if (item.type !== 'listening_choice') return false
    if (!q) return true
    const hay = normalizeText([item.id, getQuestionSummary(item)].join(' '))
    return hay.includes(q)
  })
})

const previewTotalSteps = computed(() => {
  return Number(resolvedQuestion.value?.flow?.steps?.length || 0)
})

const activeStepLabel = computed(() => {
  const steps = resolvedQuestion.value?.flow?.steps || []
  const idx = currentStepIndex.value
  const step: any = steps[idx]
  if (!step) return '-'
  return `${idx + 1}/${steps.length} · ${String(step.kind || '-')}`
})

function normalizeText(v: any) {
  return String(v || '').trim().toLowerCase()
}

function getPlainText(richtext: any): string {
  if (!richtext || !Array.isArray(richtext.content)) return ''
  return richtext.content.map((n: any) => (n?.type === 'text' ? n.text : '')).join('')
}

function getQuestionSummary(q: any): string {
  if (!q || q.type !== 'listening_choice') return ''
  return (
    getPlainText(q.content?.intro?.text) ||
    getPlainText(q.content?.groups?.[0]?.prompt) ||
    '听后选择'
  )
}

function syncTraceEventsFromStore() {
  const list = runtimeDebug.getSession(learningDebugSessionId)?.events || []
  traceEvents.value = list.map((item) => ({
    id: item.id,
    time: item.time,
    type: item.type,
    message: item.message
  }))
}

function appendTrace(type: string, message: string, payload?: any) {
  runtimeDebug.record(learningDebugSessionId, {
    type,
    message,
    payload
  })
  syncTraceEventsFromStore()
}

function extractFlowContext(question: any) {
  const metadata = question?.metadata && typeof question.metadata === 'object' ? question.metadata : {}
  const flowContext = metadata?.flowContext && typeof metadata.flowContext === 'object' ? metadata.flowContext : {}
  return {
    region: String(flowContext.region || metadata.region || ''),
    scene: String(flowContext.scene || metadata.scene || ''),
    grade: String(flowContext.grade || metadata.grade || '')
  }
}

function loadContextFromSelectedQuestion() {
  if (!selectedQuestion.value) return
  const ctx = extractFlowContext(selectedQuestion.value)
  simRegion.value = ctx.region
  simScene.value = ctx.scene
  simGrade.value = ctx.grade
}

function clearContext() {
  simRegion.value = ''
  simScene.value = ''
  simGrade.value = ''
}

function selectQuestion(questionId: string) {
  selectedQuestionId.value = String(questionId || '')
}

function resolveStepKindByIndex(index: number): string {
  const step: any = resolvedQuestion.value?.flow?.steps?.[index]
  return String(step?.kind || '-')
}

function resolveModuleDisplay(ref: { id: string; version: number }): { displayRef: string; note: string } | null {
  const id = String(ref.id || '').trim()
  const version = Math.max(1, Number(ref.version || 1))
  if (!id) return null
  const hit = flowModules.getListeningChoiceByRef({ id, version } as any)
  const name = String(hit?.name || id).trim() || id
  const note = String(hit?.note || '').trim()
  return {
    displayRef: `${name} @ v${version}`,
    note
  }
}

function reloadQuestionPool() {
  try {
    const stored = uni.getStorageSync('recentQuestions')
    const parsed = stored ? JSON.parse(stored) : []
    const list = Array.isArray(parsed) ? parsed.filter((item) => item && item.type === 'listening_choice') : []
    questionPool.value = list
    if (!questionPool.value.find((item) => item.id === selectedQuestionId.value)) {
      selectedQuestionId.value = questionPool.value[0]?.id || ''
    }
  } catch (e) {
    console.error('Failed to load learning question pool', e)
    questionPool.value = []
    selectedQuestionId.value = ''
  }
}

function startSimulation() {
  const source = selectedQuestion.value
  if (!source) {
    uni.showToast({ title: '请先选择题目', icon: 'none' })
    return
  }

  const ctx = {
    region: String(simRegion.value || '').trim() || undefined,
    scene: String(simScene.value || '').trim() || undefined,
    grade: String(simGrade.value || '').trim() || undefined
  }

  const cloned = JSON.parse(JSON.stringify(source))
  const run = runQuestionFlow(cloned as any, {
    generateId,
    ctx,
    resolveModuleDisplay
  })

  resolvedQuestion.value = run.resolvedQuestion as ListeningChoiceQuestion
  previewAnswers.value = {}
  showAnswer.value = false
  currentStepIndex.value = Number(run.runtimeState.stepIndex || 0)

  runtimeMeta.value = {
    sourceKind: run.meta.sourceKind,
    profileId: run.meta.profileId,
    moduleId: run.meta.moduleId,
    moduleDisplayRef: run.meta.moduleDisplayRef,
    moduleNote: run.meta.moduleNote,
    moduleVersionText: run.meta.moduleVersionText
  }

  runtimeDebug.resetSession(learningDebugSessionId, {
    meta: {
      mode: 'exam',
      questionId: run.resolvedQuestion.id,
      questionType: run.resolvedQuestion.type,
      ...run.meta,
      ctx: run.ctx
    }
  })
  syncTraceEventsFromStore()
  appendTrace('start', `开始演练：${source.id}`)
  appendTrace('route', `命中：${runtimeMeta.value.profileId || '默认规则'} -> ${runtimeMeta.value.moduleDisplayRef || '-'} (${runtimeMeta.value.sourceKind || '-'})`)
  appendTrace('step', `进入步骤 1 (${resolveStepKindByIndex(currentStepIndex.value)})`)
}

function dispatchRuntime(event: { type: string; stepIndex?: number }, traceType = 'step') {
  const question = resolvedQuestion.value
  if (!question) return

  const before = currentStepIndex.value
  const nextState = reduceQuestionFlowRuntimeState(
    question as any,
    { stepIndex: before },
    event as any
  )
  const next = Number(nextState?.stepIndex || 0)
  if (next === before) return

  appendTrace(
    traceType,
    `步骤变化：${before + 1}(${resolveStepKindByIndex(before)}) -> ${next + 1}(${resolveStepKindByIndex(next)})`,
    { eventType: event.type, from: before, to: next }
  )
  currentStepIndex.value = next
}

function previewPrevStep() {
  dispatchRuntime({ type: 'prev' }, 'manual')
}

function previewNextStep() {
  dispatchRuntime({ type: 'next' }, 'manual')
}

function onPreviewStepChange(index: number) {
  dispatchRuntime({ type: 'goToStep', stepIndex: index }, 'step')
}

function resolveAnswerMode(subQuestionId: string): 'single' | 'multiple' {
  const groups = resolvedQuestion.value?.content?.groups || []
  for (const g of groups) {
    for (const sq of (g.subQuestions || [])) {
      if (sq.id === subQuestionId) {
        return sq.answerMode === 'multiple' ? 'multiple' : 'single'
      }
    }
  }
  return 'single'
}

function onPreviewSelect(subQuestionId: string, optionKey: string) {
  if (!resolvedQuestion.value) return

  const mode = resolveAnswerMode(subQuestionId)
  const current = previewAnswers.value[subQuestionId]

  if (mode === 'multiple') {
    const list = Array.isArray(current) ? [...current] : []
    const index = list.indexOf(optionKey)
    if (index >= 0) list.splice(index, 1)
    else list.push(optionKey)
    previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: list }
  } else {
    previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: optionKey }
  }

  appendTrace('select', `作答：${subQuestionId} -> ${optionKey}`)
}

function toggleRuntimeDebug() {
  runtimeDebug.toggleDrawer(learningDebugSessionId)
}

watch(selectedQuestionId, () => {
  resolvedQuestion.value = null
  previewAnswers.value = {}
  showAnswer.value = false
  currentStepIndex.value = 0
  runtimeMeta.value = {
    sourceKind: '',
    profileId: '',
    moduleId: '',
    moduleDisplayRef: '',
    moduleNote: '',
    moduleVersionText: '-'
  }
  runtimeDebug.resetSession(learningDebugSessionId, {
    meta: {
      mode: 'exam',
      questionType: 'listening_choice'
    }
  })
  syncTraceEventsFromStore()
  loadContextFromSelectedQuestion()
})

onMounted(() => {
  runtimeDebug.setActiveSession(learningDebugSessionId)
  runtimeDebug.ensureSession(learningDebugSessionId, {
    mode: 'exam',
    questionType: 'listening_choice'
  })
  reloadQuestionPool()
  loadContextFromSelectedQuestion()
  syncTraceEventsFromStore()
})

watch(() => questionDraft.state.lastLibrarySavedAt, () => {
  reloadQuestionPool()
})
</script>

<style lang="scss" scoped>
.learning-workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1200px 520px at 12% -10%, rgba(33, 150, 243, 0.10), rgba(255, 255, 255, 0) 60%),
    radial-gradient(900px 420px at 92% 0%, rgba(255, 152, 0, 0.06), rgba(255, 255, 255, 0) 55%),
    linear-gradient(180deg, #f7f9fc, #eef2f7);
}

.learning-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.learning-header__main {
  min-width: 0;
}

.learning-title {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.learning-subtitle {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.learning-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.learning-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  padding: 12px 12px 14px;
  box-sizing: border-box;
}

.learning-left {
  width: 460px;
  max-width: 40%;
  min-width: 340px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.learning-middle {
  width: 340px;
  max-width: 30%;
  min-width: 300px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.learning-right {
  flex: 1;
  min-width: 320px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.90);
  overflow: hidden;
}

.panel--trace {
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.panel__header {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(248, 250, 252, 0.86);
}

.panel__title {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.panel__desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.panel__meta {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.56);
}

.panel__body {
  padding: 12px;
}

.panel__body--compact {
  padding-top: 10px;
  padding-bottom: 10px;
}

.question-search {
  margin-bottom: 10px;
}

.question-search__input {
  width: 100%;
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 13px;
  background: rgba(248, 250, 252, 0.9);
}

.question-list {
  height: 196px;
}

.question-item {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 9px;
  margin-bottom: 8px;
}

.question-item.active {
  border-color: rgba(33, 150, 243, 0.42);
  background: rgba(227, 242, 253, 0.58);
}

.question-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.question-item__type {
  font-size: 11px;
  color: #0b63c6;
  font-weight: 700;
}

.question-item__id {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.54);
}

.question-item__summary {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.7);
  line-height: 1.5;
}

.ctx-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.ctx-field__label {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.64);
  margin-bottom: 6px;
}

.ctx-field__input {
  width: 100%;
  height: 34px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 0 10px;
  font-size: 13px;
  background: rgba(248, 250, 252, 0.9);
}

.ctx-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.hit-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  margin-bottom: 6px;
}

.hit-key {
  color: rgba(15, 23, 42, 0.55);
}

.hit-value {
  color: rgba(15, 23, 42, 0.82);
  font-weight: 700;
  text-align: right;
}

.trace-list {
  flex: 1;
  min-height: 0;
  padding: 10px;
}

.trace-item {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  padding: 7px 8px;
  margin-bottom: 8px;
}

.trace-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.trace-item__time {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.52);
}

.trace-item__type {
  font-size: 11px;
  color: #0b63c6;
  font-weight: 700;
}

.trace-item__text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.72);
  line-height: 1.45;
}

.empty-tip {
  padding: 10px 0;
  text-align: center;
  color: rgba(15, 23, 42, 0.48);
  font-size: 12px;
}

.preview-footer {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.56);
  text-align: center;
}

@media (max-width: 1200px) {
  .learning-body {
    flex-direction: column;
  }

  .learning-left {
    width: 100%;
    max-width: none;
    min-width: 0;
  }

  .learning-middle {
    width: 100%;
    max-width: none;
    min-width: 0;
    min-height: 260px;
  }

  .learning-right {
    min-height: 420px;
  }
}
</style>
