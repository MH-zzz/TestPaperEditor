<template>
  <view class="phone-preview">
    <view class="preview-header">
      <text class="preview-header__title">{{ title }}</text>

      <view v-if="effectiveNavTotalSteps > 0" class="preview-stepper">
        <button class="btn btn-outline btn-xs" :disabled="effectiveNavStepIndex <= 0" @click="emit('prev')">上一步</button>
        <text class="preview-stepper__text">{{ resolvedDisplayStepIndex }} / {{ resolvedDisplayTotalSteps }}</text>
        <button class="btn btn-outline btn-xs" :disabled="effectiveNavStepIndex >= effectiveNavTotalSteps - 1" @click="emit('next')">下一步</button>
      </view>

      <view v-if="showAnswerToggle" class="toggle-answer" @click="emit('toggle-answer')">
        {{ showAnswer ? '隐藏答案' : '显示答案' }}
      </view>
    </view>

    <view v-if="showRuntimeMeta && hasRuntimeMeta" class="preview-runtime">
      <text class="preview-runtime__item">来源：{{ runtimeMeta?.sourceKind || '-' }}</text>
      <text class="preview-runtime__item">规则：{{ runtimeMeta?.profileId || '默认规则' }}</text>
      <text class="preview-runtime__item">模块：{{ runtimeMeta?.moduleDisplayRef || '-' }}</text>
      <text class="preview-runtime__item">版本：{{ runtimeMeta?.moduleVersionText || '-' }}</text>
    </view>

    <view v-if="isPartialPreview" class="preview-partial">
      <view class="preview-partial__head">
        <text class="preview-partial__badge">局部预览模式</text>
        <button class="btn btn-outline btn-xs" @click="emit('clear-preview-scope')">退出局部预览</button>
      </view>
      <text v-if="previewScopeLabelText" class="preview-partial__line">起播点：{{ previewScopeLabelText }}</text>
      <text v-if="previewScopeHintText" class="preview-partial__line">{{ previewScopeHintText }}</text>
    </view>

    <view class="preview-container">
      <view class="phone-frame">
        <view class="phone-content" :class="{ 'phone-content--speaking': isSpeakingSteps }">
          <QuestionRenderer
            v-if="data"
            :data="data"
            :mode="renderMode"
            :answers="answers"
            :show-answer="showAnswer"
            :step-index="stepIndex"
            :show-step-nav="false"
            @select="onSelect"
            @step-change="onStepChange"
          />
        </view>
      </view>
    </view>

    <slot name="footer" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Question, RenderMode } from '/types'
import QuestionRenderer from '/components/renderer/QuestionRenderer.vue'

type RuntimeMetaInfo = {
  sourceKind?: string
  profileId?: string
  moduleDisplayRef?: string
  moduleVersionText?: string
}

const props = withDefaults(defineProps<{
  title?: string
  data: Question | null
  answers?: Record<string, any>
  showAnswer?: boolean
  stepIndex?: number
  totalSteps?: number
  navStepIndex?: number
  navTotalSteps?: number
  displayStepIndex?: number
  displayTotalSteps?: number
  showAnswerToggle?: boolean
  renderMode?: RenderMode
  runtimeMeta?: RuntimeMetaInfo | null
  showRuntimeMeta?: boolean
  previewScope?: 'full' | 'partial'
  previewScopeLabel?: string
  previewScopeHint?: string
}>(), {
  title: '预览',
  answers: () => ({}),
  showAnswer: false,
  stepIndex: 0,
  totalSteps: 0,
  navStepIndex: undefined,
  navTotalSteps: undefined,
  displayStepIndex: undefined,
  displayTotalSteps: undefined,
  showAnswerToggle: true,
  renderMode: 'preview',
  runtimeMeta: null,
  showRuntimeMeta: true,
  previewScope: 'full',
  previewScopeLabel: '',
  previewScopeHint: ''
})

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'toggle-answer'): void
  (e: 'select', subQuestionId: string, value: any): void
  (e: 'step-change', step: number): void
  (e: 'clear-preview-scope'): void
}>()

const isSpeakingSteps = computed(() => props.data?.type === 'speaking_steps')
const effectiveNavStepIndex = computed(() => {
  const explicit = Number(props.navStepIndex)
  if (Number.isFinite(explicit) && explicit >= 0) return Math.floor(explicit)
  return Math.max(0, props.stepIndex)
})
const effectiveNavTotalSteps = computed(() => {
  const explicit = Number(props.navTotalSteps)
  if (Number.isFinite(explicit) && explicit >= 0) return Math.floor(explicit)
  return Math.max(0, props.totalSteps)
})
const resolvedDisplayStepIndex = computed(() => {
  const explicit = Number(props.displayStepIndex)
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit)
  return effectiveNavStepIndex.value + 1
})
const resolvedDisplayTotalSteps = computed(() => {
  const explicit = Number(props.displayTotalSteps)
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit)
  return effectiveNavTotalSteps.value
})
const hasRuntimeMeta = computed(() => {
  const meta = props.runtimeMeta || {}
  return Boolean(meta.sourceKind || meta.profileId || meta.moduleDisplayRef || meta.moduleVersionText)
})
const isPartialPreview = computed(() => {
  if (props.previewScope === 'partial') return true
  return false
})
const previewScopeLabelText = computed(() => String(props.previewScopeLabel || '').trim())
const previewScopeHintText = computed(() => String(props.previewScopeHint || '').trim())

function onSelect(subQuestionId: string, value: any) {
  emit('select', subQuestionId, value)
}

function onStepChange(step: number) {
  emit('step-change', step)
}
</script>

<style lang="scss" scoped>
.phone-preview {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.preview-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.90);
}

.preview-header__title {
  flex-shrink: 0;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.90);
}

.preview-stepper {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.preview-stepper__text {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.60);
  min-width: 72px;
  text-align: center;
}

.toggle-answer {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(33, 150, 243, 0.9);
  font-weight: 700;
}

.preview-runtime {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.9);
  display: grid;
  gap: 4px;
}

.preview-runtime__item {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.72);
}

.preview-partial {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: 12px;
  background: rgba(239, 246, 255, 0.88);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-partial__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.preview-partial__badge {
  font-size: 12px;
  font-weight: 800;
  color: rgba(29, 78, 216, 0.95);
}

.preview-partial__line {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.72);
}

.preview-container {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  background-color: #f8f9fa;
  display: flex;
  justify-content: center;
  padding-top: 20px;
  overflow-y: auto;
  border-radius: 14px;
}

.phone-frame {
  width: 375px;
  height: 667px;
  background: #fff;
  border: 12px solid #1a1a1a;
  border-radius: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-top: 24px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.phone-frame::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 6px;
  background: #1a1a1a;
  border-radius: 3px;
}

.phone-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  &--speaking {
    overflow: hidden;
  }

  :deep(.question-renderer) {
    flex: 1;
    min-height: 0;
  }
}

@media (max-width: 1100px) {
  .preview-container {
    min-height: 420px;
  }
}
</style>
