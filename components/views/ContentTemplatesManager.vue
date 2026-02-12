<template>
  <view class="tpl-center">
    <view class="tpl-center__header">
      <view class="header-left">
        <template v-if="page === 'home'">
          <text class="title">题型模板</text>
          <text class="subtitle">题型内容模板（新建题默认值）</text>
        </template>

        <template v-else>
          <view class="back" @click="goHome">
            <text class="back__icon">←</text>
            <text class="back__text">返回</text>
          </view>
          <view class="header-titles">
            <text class="title">听后选择</text>
            <text class="subtitle">修改后仅影响“新建题”的默认内容</text>
          </view>
        </template>
      </view>

      <view class="header-right">
        <template v-if="page === 'listening_choice'">
          <button class="btn btn-outline btn-sm" @click="resetTemplate">恢复默认</button>
          <button class="btn btn-primary btn-sm" @click="saveTemplate">保存模板</button>
        </template>
      </view>
    </view>

    <!-- Home -->
    <scroll-view v-if="page === 'home'" scroll-y class="tpl-center__body">
      <view class="tpl-grid">
        <view class="tpl-card" @tap="openListeningChoice">
          <view class="tpl-card__top">
            <text class="tpl-card__icon">🎧</text>
            <view class="tpl-card__badges">
              <text class="badge">题型模板</text>
              <text class="badge badge--muted">听后选择</text>
            </view>
          </view>
          <text class="tpl-card__title">听后选择</text>
          <text class="tpl-card__desc">说明文案、默认题组与默认小题结构</text>
          <view class="tpl-card__meta">
            <text class="meta-item">影响：新建题</text>
            <text class="meta-dot">·</text>
            <text class="meta-item">流程：到「题型流程」维护</text>
          </view>
        </view>

        <view class="tpl-card tpl-card--disabled" @tap="toastWip('笔试选择')">
          <view class="tpl-card__top">
            <text class="tpl-card__icon">📝</text>
            <view class="tpl-card__badges">
              <text class="badge badge--muted">开发中</text>
            </view>
          </view>
          <text class="tpl-card__title">笔试选择</text>
          <text class="tpl-card__desc">无听力材料的选择题内容模板</text>
        </view>
      </view>

      <view class="home-footnote">
        <text class="home-footnote__title">说明</text>
        <text class="home-footnote__text">这里管理“题型默认内容”。流程步骤请到左侧「题型流程」统一维护。</text>
      </view>
    </scroll-view>

    <!-- Detail -->
    <view v-else class="tpl-center__detail">
      <view class="detail-body">
        <view class="col col--editor">
          <scroll-view scroll-y class="col-scroll">
            <view class="editor-shell">
              <ListeningChoiceEditor
                v-if="draftQuestion"
                v-model="draftQuestion"
                :preview-step-index="currentStepIndex"
                template-mode
              />
            </view>
          </scroll-view>
        </view>

        <view class="col col--preview">
          <PhonePreviewPanel
            title="预览"
            :data="draftQuestion"
            :answers="previewAnswers"
            :show-answer="showAnswer"
            :step-index="currentStepIndex"
            :total-steps="previewTotalSteps"
            @prev="previewPrevStep"
            @next="previewNextStep"
            @toggle-answer="showAnswer = !showAnswer"
            @select="onPreviewSelect"
            @step-change="onPreviewStepChange"
          >
            <template #footer>
              <view class="preview-footnote">
                <text class="preview-footnote__text">注意：这里只是模板预览；流程步骤由「题型流程」模块决定。</text>
              </view>
            </template>
          </PhonePreviewPanel>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ListeningChoiceQuestion, SubQuestion } from '/types'
import ListeningChoiceEditor from '/components/editor/ListeningChoiceEditor.vue'
import PhonePreviewPanel from '/components/layout/PhonePreviewPanel.vue'
import { contentTemplates } from '/stores/contentTemplates'
import { standardFlows } from '/stores/standardFlows'
import { generateId } from '/templates'
import { LISTENING_CHOICE_STANDARD_FLOW_ID, materializeListeningChoiceStandardSteps } from '../../flows/listeningChoiceFlowModules'

type Page = 'home' | 'listening_choice'

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

const page = ref<Page>('home')

const draftQuestion = ref<ListeningChoiceQuestion | null>(null)

const previewAnswers = ref<Record<string, string | string[]>>({})
const showAnswer = ref(false)
const currentStepIndex = ref(0)

const previewTotalSteps = computed(() => Number(draftQuestion.value?.flow?.steps?.length || 0))

watch(previewTotalSteps, (n) => {
  if (!Number.isFinite(n) || n <= 0) {
    currentStepIndex.value = 0
    return
  }
  if (currentStepIndex.value > n - 1) currentStepIndex.value = n - 1
})

function buildListeningChoiceDraft(): ListeningChoiceQuestion {
  const tpl = clone(contentTemplates.state.listeningChoice)
  const q: ListeningChoiceQuestion = {
    id: 'template:listening_choice',
    type: 'listening_choice',
    optionStyle: tpl.optionStyle || 'ABCD',
    content: tpl.content,
    flow: {
      version: 1,
      mode: 'semi-auto',
      source: { kind: 'standard', id: LISTENING_CHOICE_STANDARD_FLOW_ID, overrides: {} },
      steps: []
    }
  }

  q.flow.steps = materializeListeningChoiceStandardSteps(q, {
    generateId,
    overrides: {},
    module: standardFlows.state.listeningChoice
  }) as any

  return q
}

function goHome() {
  page.value = 'home'
}

function openListeningChoice() {
  draftQuestion.value = buildListeningChoiceDraft()
  previewAnswers.value = {}
  showAnswer.value = false
  currentStepIndex.value = 0
  page.value = 'listening_choice'
}

function toastWip(name: string) {
  uni.showToast({ title: `${name}：开发中`, icon: 'none' })
}

function saveTemplate() {
  const q = draftQuestion.value
  if (!q) return
  const title = String(q.content?.intro?.title || '').trim()
  if (!title) {
    uni.showToast({ title: '请填写题目标题', icon: 'none' })
    return
  }

  contentTemplates.setListeningChoice({
    version: 1,
    optionStyle: q.optionStyle || 'ABCD',
    content: {
      ...q.content,
      intro: {
        ...q.content.intro,
        title
      }
    }
  })
  uni.showToast({ title: '已保存题型模板', icon: 'success' })
}

function resetTemplate() {
  uni.showModal({
    title: '恢复默认模板',
    content: '将恢复系统默认的题型内容模板（仅影响新建题）。是否继续？',
    confirmText: '恢复',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      contentTemplates.resetListeningChoice()
      draftQuestion.value = buildListeningChoiceDraft()
      uni.showToast({ title: '已恢复默认', icon: 'success' })
    }
  })
}

function jumpToStep(index: number) {
  currentStepIndex.value = Math.max(0, Math.min(previewTotalSteps.value - 1, index))
}

function previewPrevStep() {
  jumpToStep(currentStepIndex.value - 1)
}

function previewNextStep() {
  jumpToStep(currentStepIndex.value + 1)
}

function onPreviewStepChange(step: number) {
  jumpToStep(step)
}

function findSubQuestionById(q: ListeningChoiceQuestion, id: string): SubQuestion | null {
  for (const g of q.content.groups || []) {
    for (const sq of g.subQuestions || []) {
      if (sq.id === id) return sq
    }
  }
  return null
}

function onPreviewSelect(subQuestionId: string, optionKey: string) {
  const q = draftQuestion.value
  if (!q) return
  const sq = findSubQuestionById(q, subQuestionId)
  if (!sq) return

  const mode = sq.answerMode === 'multiple' ? 'multiple' : 'single'
  const current = previewAnswers.value[subQuestionId]

  if (mode === 'multiple') {
    const list = Array.isArray(current) ? [...current] : []
    const idx = list.indexOf(optionKey)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(optionKey)
    previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: list }
    return
  }

  previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: optionKey }
}
</script>

<style lang="scss" scoped>
.tpl-center {
  height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1200px 520px at 12% -10%, rgba(33, 150, 243, 0.10), rgba(255, 255, 255, 0) 60%),
    radial-gradient(900px 420px at 92% 0%, rgba(16, 185, 129, 0.06), rgba(255, 255, 255, 0) 55%),
    linear-gradient(180deg, #f7f9fc, #eef2f7);
}

.tpl-center__header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  min-width: 0;
}

.header-titles {
  min-width: 0;
}

.title {
  font-size: 18px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.subtitle {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.85);
}

.back__icon {
  color: rgba(15, 23, 42, 0.70);
  font-size: 14px;
}

.back__text {
  color: rgba(15, 23, 42, 0.82);
  font-size: 13px;
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tpl-center__body {
  flex: 1;
  min-height: 0;
  height: 0;
  padding: 18px;
  box-sizing: border-box;
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.tpl-card {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 16px;
  padding: 14px 14px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  transition: transform 0.14s, box-shadow 0.14s, border-color 0.14s;
}

.tpl-card:active {
  transform: translateY(1px);
}

.tpl-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.tpl-card__icon {
  font-size: 22px;
}

.tpl-card__badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.78);
  background: rgba(15, 23, 42, 0.06);
}

.badge--muted {
  color: rgba(15, 23, 42, 0.55);
  background: rgba(15, 23, 42, 0.05);
}

.tpl-card__title {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.tpl-card__desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.60);
  line-height: 1.55;
}

.tpl-card__meta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(15, 23, 42, 0.55);
  font-size: 12px;
}

.meta-dot {
  color: rgba(15, 23, 42, 0.28);
}

.tpl-card--disabled {
  opacity: 0.62;
}

.home-footnote {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(15, 23, 42, 0.18);
  background: rgba(255, 255, 255, 0.72);
}

.home-footnote__title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.80);
}

.home-footnote__text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.60);
  line-height: 1.6;
}

.tpl-center__detail {
  flex: 1;
  min-height: 0;
  height: 0;
}

.detail-body {
  height: 100%;
  display: flex;
  gap: 12px;
  padding: 12px 12px 14px;
  box-sizing: border-box;
}

.col {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.col--editor {
  flex: 2 1 0;
}

.col--preview {
  flex: 1 1 0;
  max-width: 440px;
  min-width: 320px;
}

.col-scroll {
  flex: 1;
  min-height: 0;
}

.editor-shell {
  padding: 8px 4px 8px 8px;
  border-radius: 12px;
}

.preview-footnote {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed rgba(15, 23, 42, 0.14);
  background: rgba(255, 255, 255, 0.70);
}

.preview-footnote__text {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.60);
}

@media (max-width: 1100px) {
  .detail-body {
    flex-direction: column;
  }

  .col--editor {
    width: 100%;
    flex: 1 1 auto;
  }

  .col--preview {
    max-width: none;
    min-width: 0;
    flex: 1 1 auto;
  }

}
</style>
