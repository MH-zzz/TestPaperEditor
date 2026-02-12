<template>
  <view class="speaking-steps-editor">
    <!-- 左侧面板：题型选择和基础设置 -->
    <view class="left-panel">
      <!-- 题型选择 -->
      <view class="panel-section">
        <view class="panel-section__title">题型选择</view>
        <view class="part-type-list">
          <view
            v-for="pt in availablePartTypes"
            :key="pt"
            class="part-type-item"
            :class="{ 'part-type-item--active': modelValue.partType === pt }"
            @click="changePartType(pt)"
          >
            <text class="part-type-item__name">{{ partTypeNames[pt] }}</text>
          </view>
        </view>
      </view>

      <!-- 基础设置 -->
      <view class="panel-section">
        <view class="panel-section__title">基础设置</view>
        <view class="form-group">
          <text class="form-label">题目标题</text>
          <input
            class="form-input"
            :value="modelValue.title"
            @input="updateTitle"
            placeholder="请输入题目标题"
          />
        </view>
        <view class="form-group">
          <text class="form-label">标题补充 (title_description)</text>
          <input
            class="form-input"
            :value="modelValue.title_description || ''"
            @input="updateTitleDescription"
            placeholder="例如：(共9分, 每小题1.5分)"
          />
        </view>
        <view class="form-group">
          <text class="form-label">评测模式</text>
          <picker
            :value="assessmentModeIndex"
            :range="assessmentModes"
            range-key="label"
            @change="updateAssessmentMode"
          >
            <view class="form-picker">
              {{ currentAssessmentModeLabel }}
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 小题管理（仅部分题型显示） -->
      <view v-if="hasSubQuestions" class="panel-section">
        <view class="panel-section__title">
          小题管理
          <button class="btn-add-small" @click="addSubQuestion">+ 添加</button>
        </view>
        <view class="sub-questions-list">
          <view
            v-for="(sq, index) in (modelValue.subQuestions || [])"
            :key="sq.id"
            class="sub-question-item"
          >
            <view class="sub-question-item__header">
              <text class="sub-question-item__number">小题 {{ index + 1 }}</text>
              <view class="sub-question-item__ops">
                <button class="btn-edit-small" @click="editSubQuestion(index)">编辑</button>
                <button class="btn-del-small" @click="removeSubQuestion(index)">删除</button>
              </view>
            </view>
            <view class="sub-question-item__preview">
              {{ getSubQuestionPreview(sq) }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 中间面板：流程步骤编辑 -->
    <view class="center-panel">
      <view class="panel-header">
        <text class="panel-header__title">流程步骤</text>
        <button class="btn btn-primary btn-sm" @click="showAddStepMenu = true">+ 添加步骤</button>
      </view>

      <view class="steps-list">
        <template v-for="(step, index) in modelValue.steps" :key="step.id">
          <!-- 步骤卡片 -->
          <StepCard
            :step="step"
            :index="index"
            :expanded="expandedStepId === step.id"
            :is-first="index === 0"
            :is-last="index === modelValue.steps.length - 1"
            :total-steps="modelValue.steps.length"
            @toggle="toggleStep(step.id)"
            @update="(updated) => updateStep(index, updated)"
            @delete="deleteStep(index)"
            @move-up="moveStep(index, -1)"
            @move-down="moveStep(index, 1)"
          />

          <!-- 步骤连接线 -->
          <view v-if="index < modelValue.steps.length - 1" class="step-connector">
            <view class="step-connector__line"></view>
            <view class="step-connector__arrow">▼</view>
          </view>
        </template>
      </view>

      <!-- 添加步骤菜单 -->
      <view v-if="showAddStepMenu" class="add-step-menu-overlay" @click="showAddStepMenu = false">
        <view class="add-step-menu" @click.stop>
          <view class="add-step-menu__title">添加步骤</view>
          <view
            v-for="stepType in stepTypes"
            :key="stepType.type"
            class="add-step-menu__item"
            @click="addStep(stepType.type)"
          >
            <text class="add-step-menu__icon">{{ stepType.icon }}</text>
            <text class="add-step-menu__name">{{ stepType.name }}</text>
          </view>
        </view>
      </view>
    </view>

  </view>

  <!-- 小题编辑弹窗 -->
  <view v-if="subEditorVisible" class="subq-editor-overlay" @click="closeSubEditor">
    <view class="subq-editor" @click.stop>
      <view class="subq-editor__header">
        <text class="subq-editor__title">编辑小题 {{ editingSubIndex + 1 }}</text>
        <text class="subq-editor__close" @click="closeSubEditor">×</text>
      </view>

      <scroll-view scroll-y class="subq-editor__body">
        <view v-if="editingSubQuestion" class="subq-editor__form">
          <view class="form-group">
            <text class="form-label">描述</text>
            <RichTextEditor
              :model-value="editingSubQuestion.content"
              @update:model-value="(val) => updateSubQuestion({ content: val })"
              placeholder="请输入小题描述"
            />
          </view>

          <view class="form-group">
            <text class="form-label">contentAudio.url</text>
            <input
              class="form-input"
              :value="getSubContentAudio(editingSubQuestion)?.url || ''"
              placeholder="https://... 或 /static/..."
              @input="(e) => updateSubContentAudioField('url', String(e.detail.value || ''))"
            />
          </view>
          <view class="form-group form-group--grid">
            <view>
              <text class="form-label">contentAudio.name</text>
              <input
                class="form-input"
                :value="getSubContentAudio(editingSubQuestion)?.name || ''"
                placeholder="文件名"
                @input="(e) => updateSubContentAudioField('name', String(e.detail.value || ''))"
              />
            </view>
            <view>
              <text class="form-label">contentAudio.duration (秒)</text>
              <input
                class="form-input"
                type="number"
                :value="getSubContentAudio(editingSubQuestion)?.duration || ''"
                placeholder="可选"
                @input="(e) => updateSubContentAudioField('duration', Number(e.detail.value || 0) || undefined)"
              />
            </view>
          </view>

          <view class="form-group">
            <view class="form-label-row">
              <text class="form-label">选项</text>
              <button class="btn btn-outline btn-sm" @click="addOption">+ 添加选项</button>
            </view>

            <view v-if="(editingSubQuestion.options || []).length === 0" class="empty-tip">暂无选项</view>

            <view v-else class="subq-options">
              <view
                v-for="(opt, oi) in (editingSubQuestion.options || [])"
                :key="opt.key + '_' + oi"
                class="subq-option"
              >
                <input
                  class="subq-option__key"
                  :value="opt.key"
                  @input="(e) => updateOptionKey(oi, String(e.detail.value || ''))"
                />
                <RichTextEditor
                  class="subq-option__content"
                  :model-value="opt.content"
                  @update:model-value="(val) => updateOptionContent(oi, val)"
                  placeholder="选项内容"
                  dense
                  min-height="32px"
                />
                <button
                  class="subq-option__remove"
                  :disabled="(editingSubQuestion.options || []).length <= 2"
                  @click="removeOption(oi)"
                >×</button>
              </view>
            </view>
          </view>

          <view class="form-group" v-if="(editingSubQuestion.options || []).length > 0">
            <text class="form-label">参考答案 (referenceAnswer)</text>
            <view class="answer-selector">
              <view
                v-for="opt in (editingSubQuestion.options || [])"
                :key="opt.key"
                class="answer-item"
                :class="{ active: editingSubQuestion.referenceAnswer === opt.key }"
                @click="updateSubQuestion({ referenceAnswer: opt.key })"
              >
                {{ opt.key }}
              </view>
              <view
                class="answer-item answer-item--clear"
                :class="{ active: !editingSubQuestion.referenceAnswer }"
                @click="updateSubQuestion({ referenceAnswer: '' })"
              >
                清空
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="subq-editor__footer">
        <button class="btn btn-outline btn-sm" @click="closeSubEditor">完成</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  SpeakingStepsQuestion,
  SpeakingStepsStep,
  SpeakingPartType,
  SpeakingSubQuestion,
  AssessmentMode,
  AudioFile,
  QuestionOption,
  RichTextContent
} from '/types'
import {
  createSpeakingStepsTemplate,
  speakingPartTypeNames,
  generateId,
  createEmptyRichText
} from '/templates'
import StepCard from './speaking/StepCard.vue'
import RichTextEditor from './RichTextEditor.vue'

const props = withDefaults(defineProps<{
  modelValue: SpeakingStepsQuestion
  previewStepIndex?: number
}>(), {
  previewStepIndex: 0
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: SpeakingStepsQuestion): void
  (e: 'stepExpand', index: number): void
}>()

// 可用的题型
const availablePartTypes: SpeakingPartType[] = [1, 2, 3, 4]
const partTypeNames = speakingPartTypeNames

// 评测模式选项
const assessmentModes = [
  { value: 'E', label: 'E - 文章朗读' },
  { value: 'B', label: 'B - 情景问答' },
  { value: 'C', label: 'C - 转述评测' },
  { value: 'G', label: 'G - 单词音标' },
  { value: 'H', label: 'H - 口头选择' }
]

const assessmentModeIndex = computed(() => {
  return assessmentModes.findIndex(m => m.value === props.modelValue.assessment.mode)
})

const currentAssessmentModeLabel = computed(() => {
  const mode = assessmentModes.find(m => m.value === props.modelValue.assessment.mode)
  return mode?.label || '选择评测模式'
})

// 步骤类型选项
const stepTypes = [
  { type: 'introduction', name: '题型介绍', icon: '📢' },
  { type: 'display-content', name: '显示内容', icon: '📖' },
  { type: 'play-audio', name: '播放音频', icon: '🔊' },
  { type: 'countdown', name: '倒计时', icon: '⏱️' },
  { type: 'record', name: '录音', icon: '🎤' }
]

// 状态
const showAddStepMenu = ref(false)
const expandedStepId = ref<string | null>(null)

// 小题编辑弹窗
const subEditorVisible = ref(false)
const editingSubIndex = ref(-1)

const editingSubQuestion = computed<SpeakingSubQuestion | null>(() => {
  const list = props.modelValue.subQuestions || []
  const idx = editingSubIndex.value
  if (idx < 0 || idx >= list.length) return null
  return list[idx] || null
})

// 是否有小题
const hasSubQuestions = computed(() => {
  return props.modelValue.partType === 2 || props.modelValue.partType === 3
})

// 切换题型
function changePartType(partType: SpeakingPartType) {
  if (partType === props.modelValue.partType) return

  // 使用新模板替换
  const newQuestion = createSpeakingStepsTemplate(partType)
  newQuestion.id = props.modelValue.id  // 保持 ID
  emit('update:modelValue', newQuestion)
}

// 更新标题
function updateTitle(e: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    title: e.detail.value
  })
}

function updateTitleDescription(e: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    title_description: e.detail.value
  })
}

// 更新评测模式
function updateAssessmentMode(e: any) {
  const mode = assessmentModes[e.detail.value].value as AssessmentMode
  emit('update:modelValue', {
    ...props.modelValue,
    assessment: { ...props.modelValue.assessment, mode }
  })
}

// 切换步骤展开/折叠
function toggleStep(stepId: string) {
  if (expandedStepId.value === stepId) {
    expandedStepId.value = null
  } else {
    expandedStepId.value = stepId
    // 通知预览区跳转到该步骤
    const index = props.modelValue.steps.findIndex(s => s.id === stepId)
    if (index !== -1) {
      emit('stepExpand', index)
    }
  }
}

// 监听预览区步骤变化，展开对应步骤
watch(() => props.previewStepIndex, (newIndex) => {
  if (newIndex !== undefined && newIndex >= 0 && newIndex < props.modelValue.steps.length) {
    const step = props.modelValue.steps[newIndex]
    if (step && expandedStepId.value !== step.id) {
      expandedStepId.value = step.id
    }
  }
})

// 更新步骤
function updateStep(index: number, updated: SpeakingStepsStep) {
  const newSteps = [...props.modelValue.steps]
  newSteps[index] = updated
  emit('update:modelValue', { ...props.modelValue, steps: newSteps })
}

// 删除步骤
function deleteStep(index: number) {
  if (props.modelValue.steps.length <= 1) return

  const newSteps = props.modelValue.steps.filter((_, i) => i !== index)
  emit('update:modelValue', { ...props.modelValue, steps: newSteps })
}

// 移动步骤
function moveStep(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= props.modelValue.steps.length) return

  const newSteps = [...props.modelValue.steps]
  const [removed] = newSteps.splice(index, 1)
  newSteps.splice(newIndex, 0, removed)
  emit('update:modelValue', { ...props.modelValue, steps: newSteps })
}

// 添加步骤
function addStep(type: string) {
  let newStep: SpeakingStepsStep

  switch (type) {
    case 'introduction':
      newStep = {
        type: 'introduction',
        id: generateId(),
        title: '新步骤',
        description: '请输入步骤说明'
      }
      break
    case 'display-content':
      newStep = {
        type: 'display-content',
        id: generateId(),
        content: createEmptyRichText(),
        label: '内容'
      }
      break
    case 'play-audio':
      newStep = {
        type: 'play-audio',
        id: generateId(),
        audio: null,
        playCount: 1,
        showProgress: true
      }
      break
    case 'countdown':
      newStep = {
        type: 'countdown',
        id: generateId(),
        duration: 30,
        label: '请准备',
        showProgress: true
      }
      break
    case 'record':
      newStep = {
        type: 'record',
        id: generateId(),
        duration: 60,
        playBeepBefore: true,
        showTimer: true,
        showStopButton: true,
        assessmentMode: props.modelValue.assessment.mode
      }
      break
    default:
      return
  }

  emit('update:modelValue', {
    ...props.modelValue,
    steps: [...props.modelValue.steps, newStep]
  })
  showAddStepMenu.value = false
}

// 小题管理
function addSubQuestion() {
  const newSq: SpeakingSubQuestion = {
    id: generateId(),
    content: createEmptyRichText(),
    contentAudio: { url: '', name: '' },
    options: props.modelValue.partType === 2 ? [
      { key: 'A', content: createEmptyRichText() },
      { key: 'B', content: createEmptyRichText() },
      { key: 'C', content: createEmptyRichText() }
    ] : undefined,
    referenceAnswer: props.modelValue.partType === 2 ? '' : undefined
  }

  const index = (props.modelValue.subQuestions || []).length
  emit('update:modelValue', {
    ...props.modelValue,
    subQuestions: [...(props.modelValue.subQuestions || []), newSq]
  })

  // Open editor for the newly created sub question.
  editSubQuestion(index)
}

function editSubQuestion(index: number) {
  if (index < 0) return
  editingSubIndex.value = index
  subEditorVisible.value = true

  // Ensure oral-choice questions always have options.
  const sq = (props.modelValue.subQuestions || [])[index]
  if (!sq) return
  if (props.modelValue.partType === 2) {
    const opts = Array.isArray(sq.options) && sq.options.length > 0 ? sq.options : [
      { key: 'A', content: createEmptyRichText() },
      { key: 'B', content: createEmptyRichText() },
      { key: 'C', content: createEmptyRichText() }
    ]
    if (!Array.isArray(sq.options) || sq.options.length === 0) {
      patchSubQuestion(index, { options: opts })
    }
  }
}

function closeSubEditor() {
  subEditorVisible.value = false
  editingSubIndex.value = -1
}

function removeSubQuestion(index: number) {
  const list = props.modelValue.subQuestions || []
  if (index < 0 || index >= list.length) return
  const next = list.filter((_, i) => i !== index)
  emit('update:modelValue', { ...props.modelValue, subQuestions: next })

  if (subEditorVisible.value) {
    if (editingSubIndex.value === index) closeSubEditor()
    else if (editingSubIndex.value > index) editingSubIndex.value -= 1
  }
}

function patchSubQuestion(index: number, patch: Partial<SpeakingSubQuestion>) {
  const list = [...(props.modelValue.subQuestions || [])]
  const curr = list[index]
  if (!curr) return
  list[index] = { ...curr, ...patch }
  emit('update:modelValue', { ...props.modelValue, subQuestions: list })
}

function updateSubQuestion(patch: Partial<SpeakingSubQuestion>) {
  const idx = editingSubIndex.value
  if (idx < 0) return
  patchSubQuestion(idx, patch)
}

function coerceAudioFile(v: any): AudioFile | undefined {
  if (!v || typeof v !== 'object') return undefined
  const url = typeof v.url === 'string' ? v.url : ''
  const name = typeof v.name === 'string' ? v.name : ''
  const duration = typeof v.duration === 'number' ? v.duration : undefined
  return { url, name, duration }
}

function getSubContentAudio(sq: SpeakingSubQuestion): AudioFile | undefined {
  return coerceAudioFile(sq.contentAudio) || coerceAudioFile(sq.audio) || coerceAudioFile((sq as any).descriptionAudio)
}

function updateSubContentAudioField(field: 'url' | 'name' | 'duration', value: string | number | undefined) {
  const sq = editingSubQuestion.value
  if (!sq) return
  const prev = getSubContentAudio(sq) || { url: '', name: '', duration: undefined }
  const next: AudioFile = { ...prev, [field]: value } as any
  updateSubQuestion({ contentAudio: next })
}

function updateOptionKey(optIndex: number, nextKey: string) {
  const sq = editingSubQuestion.value
  if (!sq) return
  const opts = [...(sq.options || [])]
  if (!opts[optIndex]) return
  opts[optIndex] = { ...opts[optIndex], key: nextKey }
  updateSubQuestion({ options: opts })
}

function updateOptionContent(optIndex: number, nextContent: RichTextContent) {
  const sq = editingSubQuestion.value
  if (!sq) return
  const opts = [...(sq.options || [])]
  if (!opts[optIndex]) return
  opts[optIndex] = { ...opts[optIndex], content: nextContent }
  updateSubQuestion({ options: opts })
}

function addOption() {
  const sq = editingSubQuestion.value
  if (!sq) return
  const opts = [...(sq.options || [])]
  opts.push({ key: String(opts.length + 1), content: createEmptyRichText() } as QuestionOption)
  updateSubQuestion({ options: opts })
}

function removeOption(optIndex: number) {
  const sq = editingSubQuestion.value
  if (!sq) return
  const opts = [...(sq.options || [])]
  if (opts.length <= 2) return
  opts.splice(optIndex, 1)
  updateSubQuestion({ options: opts })
}

function getSubQuestionPreview(sq: SpeakingSubQuestion): string {
  const content = sq.content.content
  if (content.length === 0) return '(空)'
  const firstNode = content[0]
  if (firstNode.type === 'text') {
    return firstNode.text.slice(0, 20) + (firstNode.text.length > 20 ? '...' : '')
  }
  return '[图片]'
}
</script>

<style lang="scss" scoped>
.speaking-steps-editor {
  display: flex;
  gap: $spacing-md;
  height: 100%;
  min-height: 600px;
}

// ==================== 左侧面板 ====================
.left-panel {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  overflow-y: auto;
}

.panel-section {
  background: $bg-white;
  border-radius: $border-radius-md;
  padding: $spacing-md;

  &__title {
    font-weight: 500;
    margin-bottom: $spacing-sm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.part-type-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.part-type-item {
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    background: #f5f5f5;
  }

  &--active {
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
    color: $primary-color;
  }

  &__name {
    font-size: $font-size-sm;
  }
}

.form-group {
  margin-bottom: $spacing-sm;
}

.form-label {
  display: block;
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $spacing-xs;
}

.form-input {
  width: 100%;
  height: 36px;
  padding: 0 $spacing-sm;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  line-height: 34px;
  box-sizing: border-box;
}

.form-picker {
  height: 36px;
  padding: 0 $spacing-sm;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  line-height: 34px;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-arrow {
  color: $text-hint;
  font-size: 10px;
}

.btn-add-small,
.btn-edit-small {
  padding: 2px 8px;
  font-size: $font-size-xs;
  color: $primary-color;
  background: none;
  border: none;
}

.btn-del-small {
  padding: 2px 8px;
  font-size: $font-size-xs;
  color: #d32f2f;
  background: none;
  border: none;
}

.sub-questions-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.sub-question-item {
  padding: $spacing-sm;
  background: #fafafa;
  border-radius: $border-radius-sm;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-xs;
  }

  &__ops {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }

  &__number {
    font-size: $font-size-sm;
    font-weight: 500;
  }

  &__preview {
    font-size: $font-size-xs;
    color: $text-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// ==================== 中间面板 ====================
.center-panel {
  flex: 1;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  background: $bg-white;
  border-radius: $border-radius-md;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  border-bottom: 1px solid $border-color;
  background: #fafafa;

  &__title {
    font-weight: 500;
  }
}

.steps-list {
  flex: 1;
  padding: $spacing-md;
  overflow-y: auto;
}

.step-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xs 0;

  &__line {
    width: 2px;
    height: 16px;
    background: $border-color;
  }

  &__arrow {
    color: $border-color;
    font-size: 10px;
    line-height: 1;
  }
}

// ==================== 添加步骤菜单 ====================
.add-step-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.add-step-menu {
  background: $bg-white;
  border-radius: $border-radius-md;
  padding: $spacing-md;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &__title {
    font-weight: 500;
    margin-bottom: $spacing-sm;
    padding-bottom: $spacing-sm;
    border-bottom: 1px solid $border-color;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm;
    border-radius: $border-radius-sm;
    cursor: pointer;

    &:hover {
      background: #f5f5f5;
    }
  }

  &__icon {
    font-size: 18px;
  }

  &__name {
    font-size: $font-size-sm;
  }
}

// ==================== 通用按钮 ====================
.btn {
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  cursor: pointer;
  border: none;
  transition: all 0.2s;

  &-primary {
    background: $primary-color;
    color: white;

    &:hover {
      opacity: 0.9;
    }
  }

  &-outline {
    background: $bg-white;
    border: 1px solid $border-color;
    color: $text-primary;

    &:hover {
      border-color: $primary-color;
      color: $primary-color;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &-sm {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
  }
}

// ==================== 小题编辑弹窗 ====================
.subq-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.subq-editor {
  width: 720px;
  max-width: calc(100vw - 28px);
  max-height: calc(100vh - 40px);
  background: $bg-white;
  border-radius: 14px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid $border-color;
    background: #fafafa;
  }

  &__title {
    font-weight: 700;
  }

  &__close {
    font-size: 20px;
    line-height: 1;
    padding: 2px 8px;
    color: $text-hint;
    cursor: pointer;
  }

  &__body {
    flex: 1;
    min-height: 0;
    height: 0;
    padding: 12px 14px;
    box-sizing: border-box;
  }

  &__footer {
    flex-shrink: 0;
    padding: 10px 14px;
    border-top: 1px solid $border-color;
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
    background: rgba(255, 255, 255, 0.96);
  }
}

.form-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-xs;
}

.form-group--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-sm;
}

.subq-options {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.empty-tip {
  padding: 6px 0;
  font-size: $font-size-xs;
  color: $text-hint;
}

.subq-option {
  display: flex;
  align-items: flex-start;
  gap: $spacing-xs;

  &__key {
    width: 46px;
    height: 32px;
    border: 1px solid $border-color;
    border-radius: $border-radius-sm;
    padding: 0 8px;
    box-sizing: border-box;
  }

  &__content {
    flex: 1;
  }

  &__remove {
    width: 32px;
    height: 32px;
    border: 1px solid $border-color;
    border-radius: $border-radius-sm;
    background: $bg-white;
    color: $text-hint;
  }
}

.answer-selector {
  display: flex;
  gap: $spacing-xs;
  flex-wrap: wrap;
}

.answer-item {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid $border-color;
  background: $bg-white;
  font-size: $font-size-xs;
  cursor: pointer;
  user-select: none;

  &.active {
    border-color: $primary-color;
    color: $primary-color;
    background: rgba($primary-color, 0.08);
  }

  &--clear {
    color: $text-secondary;
  }
}
</style>
