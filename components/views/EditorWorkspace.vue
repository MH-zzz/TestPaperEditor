<template>
  <view class="editor-workspace">
    <!-- 顶部工作区状态栏 -->
    <view class="workspace-nav">
      <view class="q-type-badge" @click="typeSelectorVisible = true">
        <text class="type-icon">📝</text>
        <text class="type-name">{{ getTypeName(questionData?.type) }}</text>
        <text class="type-caret">▼</text>
      </view>
      <view class="workspace-actions">
        <text class="auto-save-tip">数据实时保存在本地</text>
        <view class="workspace-actions__buttons">
          <button class="btn btn-outline btn-sm" @click="toggleRuntimeDebug">调试</button>
          <button class="btn btn-outline btn-sm" @click="resetQuestion">重置</button>
          <button class="btn btn-primary btn-sm" @click="saveQuestion">保存题目</button>
        </view>
      </view>
    </view>

    <view v-if="listeningChoice" class="flow-context-bar">
      <text class="flow-context-bar__title">流程上下文</text>
      <view class="flow-context-bar__fields">
        <view class="flow-context-bar__field">
          <text class="flow-context-bar__label">地区</text>
          <input
            class="flow-context-bar__input"
            :value="getFlowContextValue('region')"
            placeholder="例如：广东"
            @input="(e) => updateFlowContext('region', e.detail.value)"
          />
        </view>

        <view class="flow-context-bar__field">
          <text class="flow-context-bar__label">场景</text>
          <input
            class="flow-context-bar__input"
            :value="getFlowContextValue('scene')"
            placeholder="例如：中考"
            @input="(e) => updateFlowContext('scene', e.detail.value)"
          />
        </view>

        <view class="flow-context-bar__field">
          <text class="flow-context-bar__label">年级</text>
          <input
            class="flow-context-bar__input"
            :value="getFlowContextValue('grade')"
            placeholder="例如：九年级"
            @input="(e) => updateFlowContext('grade', e.detail.value)"
          />
        </view>

        <button class="btn btn-outline btn-xs" @click="clearFlowContext">清空</button>
      </view>
      <view class="flow-context-bar__runtime">
        <text class="flow-context-bar__runtime-item">来源：{{ runtimeMeta.sourceKind || '-' }}</text>
        <text class="flow-context-bar__runtime-item">规则：{{ runtimeMeta.profileId || '默认规则' }}</text>
        <text class="flow-context-bar__runtime-item">模块：{{ runtimeMeta.moduleDisplayRef || '-' }}</text>
        <text class="flow-context-bar__runtime-item">版本：{{ runtimeMeta.moduleVersionText || '-' }}</text>
      </view>
    </view>

    <!-- 下部：编辑 + 预览 -->
    <view class="workspace-body">
      <!-- 左侧：编辑表单 -->
      <view class="editor-area">
        <scroll-view scroll-y class="editor-scroll">
          <view class="editor-container">
            <view class="editor-card">
              <QuestionEditor
                v-if="questionData"
                v-model="questionData"
                :preview-step-index="currentStepIndex"
                @step-expand="onEditorStepExpand"
              />
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 中间：引导流程（听力选择题） -->
      <view v-if="listeningChoice" class="flow-area">
        <ListeningChoiceFlowPanel
          :model-value="listeningChoice"
          :active-step-index="currentStepIndex"
          readonly
          @update:model-value="updateListeningChoice"
          @step-expand="onFlowStepExpand"
        />
      </view>

      <!-- 右侧：预览 -->
      <view class="preview-area">
        <PhonePreviewPanel
          title="实时预览"
          :data="runtimeQuestion"
          :answers="previewAnswers"
          :show-answer="showAnswer"
          :step-index="currentStepIndex"
          :total-steps="previewTotalSteps"
          :runtime-meta="runtimeMeta"
          @prev="previewPrevStep"
          @next="previewNextStep"
          @toggle-answer="showAnswer = !showAnswer"
          @select="onPreviewSelect"
          @step-change="onPreviewStepChange"
        />
      </view>
    </view>
  </view>

  <RuntimeDebugDrawer :session-id="editorDebugSessionId" title="编辑预览调试抽屉" />

  <!-- 题型选择弹窗 -->
  <view v-if="typeSelectorVisible" class="modal-mask" @click="typeSelectorVisible = false">
    <view class="modal-content" @click.stop>
      <view class="modal-header">
        <text>创建题型</text>
        <text class="modal-close" @click="typeSelectorVisible = false">×</text>
      </view>
      <view class="modal-body">
        <!-- Tabs -->
        <view class="type-tabs">
          <view
            v-for="tab in interactionTabs"
            :key="tab"
            class="type-tab"
            :class="{ active: interactionActiveTab === tab }"
            @click="interactionActiveTab = tab"
          >
            {{ tab }}
          </view>
        </view>

        <!-- Controls -->
        <view class="type-controls">
          <view class="type-search">
            <text class="type-search__icon">⌕</text>
            <input
              class="type-search__input"
              :value="interactionQuery"
              placeholder="搜索题型，例如：填空 / 连线 / 朗读"
              @input="(e) => interactionQuery = String(e.detail.value || '')"
            />
            <text v-if="interactionQuery" class="type-search__clear" @click="interactionQuery = ''">×</text>
          </view>

          <view
            class="type-toggle"
            :class="{ active: interactionOnlySupported }"
            @click="interactionOnlySupported = !interactionOnlySupported"
          >
            只看已支持
          </view>
        </view>

        <!-- Results -->
        <view v-if="interactionSections.length" class="type-sections">
          <view v-for="sec in interactionSections" :key="sec.id" class="type-section">
            <view v-if="interactionActiveTab === '全部'" class="type-section__title">
              {{ sec.title }}
              <text class="type-section__meta">{{ sec.items.length }}</text>
            </view>

            <view class="type-grid">
              <view
                v-for="item in sec.items"
                :key="item.id"
                class="type-card"
                :class="{
                  active: selectedInteractionId === item.id,
                  disabled: !item.enabled
                }"
                @click="selectInteractionLeaf(item)"
              >
                <view class="type-card__top">
                  <text class="type-card__icon">{{ item.icon }}</text>
                  <text class="type-card__pill">{{ item.root }}</text>
                </view>
                <text class="type-card__name">{{ item.title }}</text>
                <text class="type-card__desc">{{ item.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="type-empty">
          <text class="type-empty__title">没有匹配的题型</text>
          <text class="type-empty__desc">试试清空搜索或关闭“只看已支持”</text>
        </view>
      </view>
      <view class="modal-footer">
        <button class="btn btn-outline btn-sm" @click="typeSelectorVisible = false">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { ListeningChoiceQuestion, MatchMode, Question } from '/types'
import { questionTemplates, type TemplateKey, generateId } from '/templates'
import { globalSettings } from '/stores/settings'
import { questionDraft } from '/stores/questionDraft'
import { flowModules } from '/stores/flowModules'
import { runtimeDebug } from '/stores/runtimeDebug'
import { saveQuestionDraft } from '/domain/question/usecases/saveQuestionDraft'
import { runQuestionFlow, reduceQuestionFlowRuntimeState, type QuestionFlowRuntimeMeta } from '/app/usecases/runQuestionFlow'
import QuestionEditor from '/components/editor/QuestionEditor.vue'
import ListeningChoiceFlowPanel from '/components/editor/ListeningChoiceFlowPanel.vue'
import PhonePreviewPanel from '/components/layout/PhonePreviewPanel.vue'
import RuntimeDebugDrawer from '/components/layout/RuntimeDebugDrawer.vue'
import {
  normalizeListeningChoiceQuestionForSave,
  resolveListeningChoiceQuestion
} from '../../engine/flow/listening-choice/binding.ts'

type InteractionNode = { title: string; children?: InteractionNode[] }

type InteractionLeaf = {
  id: string
  root: string
  title: string
  path: string[]
  enabled: boolean
  templateKey?: TemplateKey
  icon: string
  description: string
}

import interactionTypeRoots from '../../交互类型.json'

const props = defineProps<{
  type?: string
}>()

const emit = defineEmits<{
  (e: 'update:type', type: string): void
}>()

// 状态
const questionData = computed<Question | null>({
  get: () => questionDraft.state.currentQuestion as Question | null,
  set: (next) => {
    if (!next) return
    questionDraft.updateDraft(next, { persistDraft: true })
  }
})
const previewAnswers = ref<Record<string, string | string[]>>({})
const showAnswer = ref(false)
const originalData = computed<Question | null>(() => questionDraft.state.originalQuestion as Question | null)
const currentStepIndex = ref(0)
const typeSelectorVisible = ref(false)
const editorDebugSessionId = 'editor-preview-runtime'

const defaultRuntimeMeta: QuestionFlowRuntimeMeta = {
  sourceKind: '',
  profileId: '',
  moduleId: '',
  moduleVersion: 0,
  moduleDisplayRef: '-',
  moduleNote: '',
  moduleVersionText: '-'
}

function resolveListeningChoiceModuleDisplay(ref: { id: string; version: number }) {
  const hit = flowModules.getListeningChoiceByRef({
    id: ref.id,
    version: ref.version
  })
  if (!hit) return null
  const name = String(hit.name || hit.id || '').trim() || hit.id
  return {
    displayRef: `${name} @ v${hit.version}`,
    note: String(hit.note || '').trim()
  }
}

const runtimeResult = computed(() => {
  const q = questionData.value
  if (!q) return null
  return runQuestionFlow(q, {
    generateId,
    initialStepIndex: currentStepIndex.value,
    resolveModuleDisplay: resolveListeningChoiceModuleDisplay
  })
})

const runtimeQuestion = computed<Question | null>(() => {
  return (runtimeResult.value?.resolvedQuestion || questionData.value) as Question | null
})

const runtimeMeta = computed<QuestionFlowRuntimeMeta>(() => {
  return runtimeResult.value?.meta || defaultRuntimeMeta
})

const runtimeSignature = computed(() => {
  const q = runtimeQuestion.value
  const meta = runtimeMeta.value
  if (!q) return ''
  return [
    q.id,
    q.type,
    meta.sourceKind,
    meta.profileId,
    meta.moduleId,
    meta.moduleVersionText
  ].join('|')
})

const previewTotalSteps = computed(() => {
  return Number(runtimeResult.value?.totalSteps || 0)
})

function clampPreviewStepIndex() {
  const total = previewTotalSteps.value
  if (total <= 0) {
    currentStepIndex.value = 0
    return
  }
  currentStepIndex.value = Math.max(0, Math.min(currentStepIndex.value, total - 1))
}

function getPreviewStepKind(index: number): string {
  const question = runtimeQuestion.value as any
  if (!question) return '-'
  if (question.type === 'listening_choice') return String(question.flow?.steps?.[index]?.kind || '-')
  if (question.type === 'speaking_steps') return String(question.steps?.[index]?.type || '-')
  return '-'
}

function dispatchPreviewRuntime(event: { type: string; stepIndex?: number }, traceType = 'step') {
  const q = runtimeQuestion.value
  if (!q) return

  const before = currentStepIndex.value
  const nextState = reduceQuestionFlowRuntimeState(
    q,
    { stepIndex: before },
    event as any
  )
  const next = Number(nextState?.stepIndex || 0)
  if (next === before) return

  currentStepIndex.value = next
  runtimeDebug.record(editorDebugSessionId, {
    type: traceType,
    message: `步骤变化：${before + 1}(${getPreviewStepKind(before)}) -> ${next + 1}(${getPreviewStepKind(next)})`,
    payload: { eventType: event.type, from: before, to: next }
  })
}

function previewPrevStep() {
  dispatchPreviewRuntime({ type: 'prev' }, 'manual')
}

function previewNextStep() {
  dispatchPreviewRuntime({ type: 'next' }, 'manual')
}

const listeningChoice = computed<ListeningChoiceQuestion | null>(() => {
  if (!questionData.value) return null
  if (questionData.value.type !== 'listening_choice') return null
  return questionData.value as ListeningChoiceQuestion
})

const selectedInteractionId = ref<string>('')

function resolveTemplate(path: string[]): { templateKey?: TemplateKey; enabled: boolean; reason: string } {
  const root = path[0] || ''
  const leaf = path[path.length - 1] || ''

  if (root === '听力') {
    if (['单项选择', '多项选择', '情景选择'].includes(leaf)) {
      return { templateKey: 'listening_choice', enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
    }
    if (['连线', '图文匹配'].includes(leaf)) return { templateKey: 'listening_match', enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
    if (leaf === '填空') return { templateKey: 'listening_fill', enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
    if (leaf === '排序') return { templateKey: 'listening_order', enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
    return { enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
  }

  if (root === '听说') {
    // "听后选择"在当前项目中统一走 listening_choice（题型模板 + 题型流程）链路。
    if (leaf === '听后选择') return { templateKey: 'listening_choice', enabled: true, reason: '' }
    if (leaf === '短文朗读') return { templateKey: 'speaking_steps', enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
    if (leaf === '听后回答') return { templateKey: 'speaking_steps', enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
    if (leaf === '听后转述') return { templateKey: 'speaking_steps', enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
    return { enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }
  }

  if (root === '笔试') return { enabled: false, reason: '暂未开放（当前仅支持：听后选择）' }

  return { enabled: false, reason: '暂不支持' }
}

function normalizeForSearch(s: string) {
  return String(s || '')
    .trim()
    .toLowerCase()
}

const interactionLeaves = computed<InteractionLeaf[]>(() => {
  const roots = interactionTypeRoots as InteractionNode[]
  const out: InteractionLeaf[] = []

  const walk = (node: InteractionNode, level: number, parentPath: string[]) => {
    const title = String(node?.title || '').trim()
    if (!title) return
    const path = [...parentPath, title]
    const id = path.join('/')
    const children = Array.isArray(node.children) ? node.children : []

    if (children.length > 0) {
      children.forEach(child => walk(child, level + 1, path))
      return
    }

    const resolved = resolveTemplate(path)
    const template = resolved.templateKey ? (questionTemplates as any)[resolved.templateKey] : null

    const icon = template?.icon || '•'
    const description = resolved.enabled ? (template?.name ? `将创建：${template.name}` : '将创建') : (resolved.reason || '暂不可用')
    const root = path[0] || ''

    out.push({
      id,
      root,
      title,
      path,
      enabled: resolved.enabled,
      templateKey: resolved.templateKey,
      icon,
      description
    })
  }

  roots.forEach(r => walk(r, 0, []))
  return out
})

const interactionTabs = computed<string[]>(() => {
  const roots = interactionTypeRoots as InteractionNode[]
  const titles = roots.map(r => String(r?.title || '').trim()).filter(Boolean)
  return ['全部', ...titles]
})

const interactionActiveTab = ref<string>('全部')
const interactionQuery = ref<string>('')
const interactionOnlySupported = ref<boolean>(false)

const interactionSections = computed(() => {
  const q = normalizeForSearch(interactionQuery.value)
  const tab = interactionActiveTab.value
  const onlySupported = interactionOnlySupported.value

  const leaves = interactionLeaves.value.filter(item => {
    if (tab !== '全部' && item.root !== tab) return false
    if (onlySupported && !item.enabled) return false
    if (!q) return true
    const hay = normalizeForSearch([item.root, item.title, item.description].join(' '))
    return hay.includes(q)
  })

  if (tab !== '全部') {
    if (leaves.length === 0) return []
    return [{ id: tab, title: tab, items: leaves }]
  }

  const byRoot: Record<string, InteractionLeaf[]> = {}
  leaves.forEach(item => {
    const k = item.root || '其他'
    if (!byRoot[k]) byRoot[k] = []
    byRoot[k].push(item)
  })

  const roots = interactionTabs.value.slice(1) // remove 全部
  return roots
    .filter(r => (byRoot[r] || []).length > 0)
    .map(r => ({ id: r, title: r, items: byRoot[r] }))
})

function getTypeName(type?: string) {
  if (!type) return '编辑器'
  return questionTemplates[type as TemplateKey]?.name || type
}

function selectType(nextType: string) {
  typeSelectorVisible.value = false
  emit('update:type', nextType)
}

function selectInteractionLeaf(item: InteractionLeaf) {
  if (!item) return
  selectedInteractionId.value = item.id

  if (!item.enabled || !item.templateKey) {
    uni.showToast({ title: item.description || '暂不可用', icon: 'none' })
    return
  }

  selectType(item.templateKey)
}

function resolveListeningChoiceFlowSource(data: any) {
  if (!data || data.type !== 'listening_choice') return data
  return resolveListeningChoiceQuestion(data as ListeningChoiceQuestion, { generateId }) as any
}

function normalizeFlowContextText(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function getFlowContextValue(key: 'region' | 'scene' | 'grade'): string {
  const q: any = questionData.value as any
  if (!q?.metadata || typeof q.metadata !== 'object') return ''
  const metadata: any = q.metadata
  const flowContext = metadata.flowContext && typeof metadata.flowContext === 'object' ? metadata.flowContext : {}
  return String(flowContext[key] || metadata[key] || '')
}

function updateFlowContext(key: 'region' | 'scene' | 'grade', rawValue: string) {
  const current: any = questionData.value as any
  if (!current || current.type !== 'listening_choice') return

  const nextValue = normalizeFlowContextText(rawValue)
  const metadata: any = current.metadata && typeof current.metadata === 'object' ? { ...current.metadata } : {}
  const flowContext: any = metadata.flowContext && typeof metadata.flowContext === 'object' ? { ...metadata.flowContext } : {}

  if (nextValue) {
    flowContext[key] = nextValue
    metadata[key] = nextValue
  } else {
    delete flowContext[key]
    delete metadata[key]
  }

  if (Object.keys(flowContext).length > 0) metadata.flowContext = flowContext
  else delete metadata.flowContext

  const nextQuestion = {
    ...current,
    metadata
  }
  questionData.value = resolveListeningChoiceFlowSource(nextQuestion)
  clampPreviewStepIndex()
}

function clearFlowContext() {
  updateFlowContext('region', '')
  updateFlowContext('scene', '')
  updateFlowContext('grade', '')
}

function formatValidationIssues(list: Array<{ path?: string; message: string }>) {
  return list
    .map((item) => {
      const path = String(item.path || '').trim()
      return path ? `${path}: ${item.message}` : item.message
    })
    .join('\n')
}

// 保存题目
function saveQuestion() {
  if (!questionData.value) return

  const result = saveQuestionDraft(questionData.value, {
    defaultTags: globalSettings.state.defaultTags,
    normalizeQuestion: (question) => {
      if (question.type !== 'listening_choice') return question
      return normalizeListeningChoiceQuestionForSave(question as ListeningChoiceQuestion, { generateId }) as any
    }
  })

  if (!result.ok) {
    uni.showModal({
      title: '题目校验失败',
      content: formatValidationIssues(result.errors),
      showCancel: false
    })
    return
  }

  if (result.question) {
    questionDraft.updateDraft(result.question, { persistDraft: true })
    questionDraft.saveToRecent(50)
  }

  if (result.warnings.length > 0) {
    uni.showModal({
      title: '题目校验提醒',
      content: formatValidationIssues(result.warnings),
      showCancel: false
    })
  }

  uni.showToast({ title: '保存成功', icon: 'success' })
}

// 重置
function resetQuestion() {
  if (!originalData.value) return
  questionDraft.resetToOriginal()
}

function toggleRuntimeDebug() {
  runtimeDebug.toggleDrawer(editorDebugSessionId)
}

function updateListeningChoice(next: ListeningChoiceQuestion) {
  questionData.value = next as any
}

// 编辑区步骤展开 → 更新预览区
function onEditorStepExpand(index: number) {
  dispatchPreviewRuntime({ type: 'goToStep', stepIndex: index }, 'manual')
}

// 流程区步骤点击 → 更新预览区
function onFlowStepExpand(index: number) {
  dispatchPreviewRuntime({ type: 'goToStep', stepIndex: index }, 'manual')
}

// 预览区步骤变化 → 更新编辑区
function onPreviewStepChange(index: number) {
  dispatchPreviewRuntime({ type: 'goToStep', stepIndex: index }, 'step')
}

// 预览选择
function applyMatchSelection(
  current: Record<string, string | string[]>,
  leftId: string,
  rightId: string,
  mode: MatchMode
) {
  const next = { ...current }
  const currentValue = next[leftId]

  if (mode === 'one-to-one') {
    if (!Array.isArray(currentValue) && currentValue === rightId) {
      delete next[leftId]
      return next
    }

    Object.entries(next).forEach(([left, value]) => {
      if (left === leftId) return
      if (Array.isArray(value)) {
        const filtered = value.filter(v => v !== rightId)
        if (filtered.length === 0) delete next[left]
        else next[left] = filtered
      } else if (value === rightId) {
        delete next[left]
      }
    })

    next[leftId] = rightId
    return next
  }

  let list: string[] = []
  if (Array.isArray(currentValue)) list = [...currentValue]
  else if (currentValue) list = [currentValue]

  const index = list.indexOf(rightId)
  if (index > -1) list.splice(index, 1)
  else list.push(rightId)

  if (list.length === 0) delete next[leftId]
  else next[leftId] = list

  return next
}

function onPreviewSelect(subId: string, key: string) {
  if (questionData.value?.type === 'listening_match') {
    const mode: MatchMode = questionData.value.matchMode || 'one-to-many'
    previewAnswers.value = applyMatchSelection(previewAnswers.value, subId, key, mode)
    return
  }

  if (questionData.value?.type === 'listening_choice') {
    let mode: 'single' | 'multiple' = 'single'
    try {
      const groups = (questionData.value as any).content?.groups || []
      for (const g of groups) {
        for (const sq of (g.subQuestions || [])) {
          if (sq.id === subId) {
            mode = sq.answerMode || 'single'
            break
          }
        }
      }
    } catch {}
    const current = previewAnswers.value[subId]
    if (mode === 'multiple') {
      const list = Array.isArray(current) ? [...current] : current ? [current] : []
      const index = list.indexOf(key)
      if (index > -1) list.splice(index, 1)
      else list.push(key)
      previewAnswers.value = { ...previewAnswers.value, [subId]: list }
    } else {
      previewAnswers.value = { ...previewAnswers.value, [subId]: [key] }
    }
    return
  }

  previewAnswers.value = { ...previewAnswers.value, [subId]: key }
}

// 初始化
onMounted(() => {
  questionDraft.loadFromStorage()
  runtimeDebug.setActiveSession(editorDebugSessionId)
  runtimeDebug.ensureSession(editorDebugSessionId, {
    mode: 'preview',
    questionType: questionData.value?.type || ''
  })
})

watch(previewTotalSteps, () => {
  clampPreviewStepIndex()
}, { immediate: true })

watch(runtimeResult, (result) => {
  if (!result) return

  runtimeDebug.applyRuntimeMeta(editorDebugSessionId, result.meta, result.ctx)
  runtimeDebug.ensureSession(editorDebugSessionId, {
    mode: 'preview',
    questionId: result.resolvedQuestion.id,
    questionType: result.resolvedQuestion.type
  })
  clampPreviewStepIndex()
}, { immediate: true })

watch(runtimeSignature, (nextSignature, prevSignature) => {
  if (!nextSignature) return
  if (nextSignature === prevSignature) return

  const q = runtimeQuestion.value
  if (!q) return

  currentStepIndex.value = 0
  runtimeDebug.resetSession(editorDebugSessionId, {
    meta: {
      mode: 'preview',
      questionId: q.id,
      questionType: q.type,
      ...runtimeMeta.value
    }
  })
  runtimeDebug.record(editorDebugSessionId, {
    type: 'route',
    message: `命中：${runtimeMeta.value.profileId || '默认规则'} -> ${runtimeMeta.value.moduleDisplayRef || '-'} (${runtimeMeta.value.sourceKind || '-'})`
  })
  runtimeDebug.record(editorDebugSessionId, {
    type: 'step',
    message: `进入步骤 1 (${getPreviewStepKind(0)})`
  })
}, { immediate: true })

watch(() => globalSettings.state.defaultTags, (tags) => {
  if (questionData.value && (!questionData.value.metadata?.tags?.length)) {
    if (!questionData.value.metadata) questionData.value.metadata = {}
    questionData.value.metadata.tags = [...tags]
  }
}, { deep: true })

watch(typeSelectorVisible, (open) => {
  if (!open) return
  // Reset search on open so the user always sees the full catalog first.
  interactionQuery.value = ''

  // Default to the current question's root tab for quicker access.
  const current = questionData.value?.type
  const preferred =
    interactionLeaves.value.find(r => r.enabled && r.templateKey === current) ||
    interactionLeaves.value.find(r => r.templateKey === current)

  if (selectedInteractionId.value) {
    const selected = interactionLeaves.value.find(r => r.id === selectedInteractionId.value)
    if (selected?.root && interactionTabs.value.includes(selected.root)) {
      interactionActiveTab.value = selected.root
      return
    }
  }

  if (preferred?.root && interactionTabs.value.includes(preferred.root)) interactionActiveTab.value = preferred.root
  else interactionActiveTab.value = '全部'

  if (selectedInteractionId.value) return
  if (preferred) selectedInteractionId.value = preferred.id
})
</script>

<style lang="scss" scoped>
.editor-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background:
    radial-gradient(1200px 520px at 12% -10%, rgba(33, 150, 243, 0.10), rgba(255, 255, 255, 0) 60%),
    radial-gradient(900px 420px at 92% 0%, rgba(255, 152, 0, 0.06), rgba(255, 255, 255, 0) 55%),
    linear-gradient(180deg, #f7f9fc, #eef2f7);
}

.workspace-nav {
  height: 48px;
  background-color: #fff;
  border-bottom: 1px solid $border-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.04);
  
  .q-type-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid #edf2f7;
    background: #f8fafc;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s;
    
    .type-icon { font-size: 18px; }
    .type-name { font-size: 15px; font-weight: 600; color: #2d3748; }
    .type-caret { font-size: 12px; color: $text-secondary; margin-left: 2px; }
  }

  .q-type-badge:hover {
    border-color: rgba(33, 150, 243, 0.35);
    background: $primary-light;
  }
  
  .auto-save-tip {
    font-size: 12px;
    color: #a0aec0;
  }
}

.workspace-actions {
  display: flex;
  align-items: center;
  gap: 10px;

  .workspace-actions__buttons {
    display: flex;
    align-items: center;
    gap: 8px;

    :deep(.btn) {
      font-size: 13px;
      padding: 2px 10px;
      min-height: 30px;
      line-height: 26px;
    }
  }
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  width: 520px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
}

.modal-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: $text-secondary;
}

.modal-body {
  padding: 12px 12px 10px;
  max-height: 70vh;
  overflow: auto;
}

.modal-footer {
  padding: 12px 14px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0 10px;
}

.type-tab {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(248, 250, 252, 0.9);
  color: rgba(15, 23, 42, 0.75);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}

.type-tab.active {
  background: $primary-light;
  border-color: rgba(33, 150, 243, 0.35);
  color: rgba(15, 23, 42, 0.92);
}

.type-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
}

.type-search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(248, 250, 252, 0.95);
}

.type-search__icon {
  color: rgba(15, 23, 42, 0.45);
  font-size: 12px;
}

.type-search__input {
  flex: 1;
  min-width: 0;
  height: 20px;
  font-size: 13px;
  color: $text-primary;
}

.type-search__clear {
  width: 20px;
  height: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(15, 23, 42, 0.55);
}

.type-toggle {
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(248, 250, 252, 0.95);
  color: rgba(15, 23, 42, 0.75);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.type-toggle.active {
  background: rgba(16, 185, 129, 0.10);
  border-color: rgba(16, 185, 129, 0.25);
  color: rgba(5, 150, 105, 0.95);
}

.type-sections {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.type-section__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 2px 0;
  font-size: 12px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.70);
  letter-spacing: 0.2px;
}

.type-section__meta {
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.35);
}

.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.type-card {
  width: calc(50% - 5px);
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 16px rgba(15, 23, 42, 0.06);
  padding: 10px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
}

.type-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);
}

.type-card.disabled {
  opacity: 0.55;
}

.type-card.active {
  border-color: rgba(33, 150, 243, 0.35);
  box-shadow:
    0 12px 20px rgba(15, 23, 42, 0.08),
    0 0 0 3px rgba(33, 150, 243, 0.12);
}

.type-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.type-card__icon {
  width: 30px;
  height: 30px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
}

.type-card__pill {
  font-size: 11px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(248, 250, 252, 0.9);
}

.type-card__name {
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.90);
}

.type-card__desc {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.58);
}

.type-empty {
  padding: 26px 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  text-align: center;
}

.type-empty__title {
  font-weight: 900;
  color: rgba(15, 23, 42, 0.80);
}

.type-empty__desc {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

@media (max-width: 420px) {
  .type-card {
    width: 100%;
  }
}

// 主体区
.workspace-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.flow-context-bar {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.9);
}

.flow-context-bar__title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.72);
  flex-shrink: 0;
}

.flow-context-bar__fields {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.flow-context-bar__field {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.flow-context-bar__label {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.62);
  flex-shrink: 0;
}

.flow-context-bar__input {
  width: 120px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(248, 250, 252, 0.95);
  padding: 0 10px;
  font-size: 12px;
}

.flow-context-bar__runtime {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.flow-context-bar__runtime-item {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.58);
}

// 左侧编辑
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  
  .editor-scroll {
    flex: 1;
    height: 0;
  }
  
  .editor-container {
    padding: 18px 18px 24px;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  
  .editor-card {
    background-color: rgba(255, 255, 255, 0.92);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 18px 30px rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(6px);
  }
}

// 中间流程面板
.flow-area {
  width: 340px;
  background-color: #fff;
  border-left: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

// 右侧预览
.preview-area {
  width: 420px;
  background-color: #fff;
  border-left: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

</style>
