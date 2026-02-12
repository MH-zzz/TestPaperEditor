<template>
  <view class="speaking-editor">
    <!-- 题目说明 -->
    <view class="editor-section">
      <view class="section-title">题目说明</view>
      <view class="section-content">
        <RichTextEditor
          :model-value="modelValue.stem"
          @update:model-value="updateStem"
          placeholder="请输入题目整体说明"
        />
      </view>
    </view>

    <!-- 步骤列表 -->
    <view class="editor-section">
      <view class="section-title">
        步骤流程
        <button class="btn btn-text btn-sm" @click="addStep">+ 添加步骤</button>
      </view>
      <view class="section-content steps-list">
        <view
          v-for="(step, index) in modelValue.steps"
          :key="step.id"
          class="step-card"
        >
          <!-- 步骤头部 -->
          <view class="step-header">
            <view class="step-number">{{ index + 1 }}</view>
            <input
              class="step-title-input"
              :value="step.title"
              @input="(e) => updateStep(index, 'title', e.detail.value)"
              placeholder="步骤名称"
            />
            <view class="step-actions">
              <button
                class="btn-icon"
                @click="moveStep(index, -1)"
                :disabled="index === 0"
              >↑</button>
              <button
                class="btn-icon"
                @click="moveStep(index, 1)"
                :disabled="index === modelValue.steps.length - 1"
              >↓</button>
              <button
                class="btn-icon delete"
                @click="removeStep(index)"
                v-if="modelValue.steps.length > 1"
              >×</button>
            </view>
          </view>

          <!-- 行为类型选择 -->
          <view class="step-row">
            <text class="row-label">行为类型</text>
            <view class="behavior-options">
              <view
                v-for="opt in behaviorOptions"
                :key="opt.value"
                class="behavior-option"
                :class="{ active: step.behavior === opt.value }"
                @click="updateStep(index, 'behavior', opt.value)"
              >
                <text class="behavior-icon">{{ opt.icon }}</text>
                <text class="behavior-name">{{ opt.label }}</text>
              </view>
            </view>
          </view>

          <!-- 音频设置（auto_play 行为） -->
          <view v-if="step.behavior === 'auto_play'" class="step-row">
            <text class="row-label">音频文件</text>
            <view class="audio-input">
              <input
                class="url-input"
                :value="step.audioUrl"
                @input="(e) => updateStep(index, 'audioUrl', e.detail.value)"
                placeholder="音频 URL"
              />
              <button class="btn btn-outline btn-sm" @click="selectAudio(index)">选择</button>
            </view>
          </view>

          <!-- 时长设置（countdown/record 行为） -->
          <view v-if="step.behavior === 'countdown' || step.behavior === 'record'" class="step-row">
            <text class="row-label">{{ step.behavior === 'record' ? '录音时长' : '倒计时' }}</text>
            <view class="duration-input">
              <input
                type="number"
                class="number-input"
                :value="step.duration"
                @input="(e) => updateStep(index, 'duration', parseInt(e.detail.value) || 0)"
              />
              <text class="unit">秒</text>
            </view>
          </view>

          <!-- 显示内容 -->
          <view class="step-row">
            <text class="row-label">显示内容</text>
            <view class="content-toggles">
              <view
                class="toggle-item"
                :class="{ active: !!step.instruction }"
                @click="toggleContent(index, 'instruction')"
              >
                说明文字
              </view>
              <view
                class="toggle-item"
                :class="{ active: !!step.passage }"
                @click="toggleContent(index, 'passage')"
              >
                文章段落
              </view>
              <view
                class="toggle-item"
                :class="{ active: !!step.imageUrl }"
                @click="toggleContent(index, 'imageUrl')"
              >
                图片
              </view>
            </view>
          </view>

          <!-- 说明文字编辑 -->
          <view v-if="step.instruction" class="step-row content-editor">
            <text class="row-label">说明文字</text>
            <RichTextEditor
              :model-value="step.instruction"
              @update:model-value="(val) => updateStep(index, 'instruction', val)"
              placeholder="输入说明文字"
              dense
            />
          </view>

          <!-- 文章段落编辑 -->
          <view v-if="step.passage" class="step-row content-editor">
            <text class="row-label">文章段落</text>
            <RichTextEditor
              :model-value="step.passage"
              @update:model-value="(val) => updateStep(index, 'passage', val)"
              placeholder="输入文章或段落内容"
            />
          </view>

          <!-- 图片设置 -->
          <view v-if="step.imageUrl !== undefined" class="step-row">
            <text class="row-label">图片</text>
            <view class="audio-input">
              <input
                class="url-input"
                :value="step.imageUrl"
                @input="(e) => updateStep(index, 'imageUrl', e.detail.value)"
                placeholder="图片 URL"
              />
              <button class="btn btn-outline btn-sm" @click="selectImage(index)">选择</button>
            </view>
          </view>

          <!-- 提示音设置 -->
          <view class="step-row">
            <text class="row-label">提示音</text>
            <view class="checkbox-group">
              <view
                class="checkbox-item"
                :class="{ checked: step.beepOnStart }"
                @click="updateStep(index, 'beepOnStart', !step.beepOnStart)"
              >
                <view class="checkbox-box">
                  <text v-if="step.beepOnStart">✓</text>
                </view>
                <text>开始时播放提示音</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 添加步骤按钮 -->
        <view class="add-step-btn" @click="addStep">
          <text class="add-icon">+</text>
          <text>添加步骤</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { SpeakingQuestion, SpeakingStep, SpeakingStepBehavior, RichTextContent } from '/types'
import { generateId, createEmptyRichText } from '/templates'
import RichTextEditor from './RichTextEditor.vue'

const props = defineProps<{
  modelValue: SpeakingQuestion
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SpeakingQuestion): void
}>()

// 行为类型选项
const behaviorOptions = [
  { value: 'manual', label: '手动', icon: '👆' },
  { value: 'auto_play', label: '播放音频', icon: '🔊' },
  { value: 'countdown', label: '倒计时', icon: '⏱️' },
  { value: 'record', label: '录音', icon: '🎙️' },
  { value: 'input', label: '文字输入', icon: '✏️' }
]

function updateStem(content: RichTextContent) {
  emit('update:modelValue', {
    ...props.modelValue,
    stem: content
  })
}

function updateStep(index: number, field: string, value: any) {
  const newSteps = [...props.modelValue.steps]
  newSteps[index] = { ...newSteps[index], [field]: value }
  emit('update:modelValue', {
    ...props.modelValue,
    steps: newSteps
  })
}

function addStep() {
  const newStep: SpeakingStep = {
    id: generateId(),
    title: `步骤 ${props.modelValue.steps.length + 1}`,
    behavior: 'manual'
  }
  emit('update:modelValue', {
    ...props.modelValue,
    steps: [...props.modelValue.steps, newStep]
  })
}

function removeStep(index: number) {
  const newSteps = props.modelValue.steps.filter((_, i) => i !== index)
  emit('update:modelValue', {
    ...props.modelValue,
    steps: newSteps
  })
}

function moveStep(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= props.modelValue.steps.length) return

  const newSteps = [...props.modelValue.steps]
  const temp = newSteps[index]
  newSteps[index] = newSteps[newIndex]
  newSteps[newIndex] = temp

  emit('update:modelValue', {
    ...props.modelValue,
    steps: newSteps
  })
}

function toggleContent(index: number, field: 'instruction' | 'passage' | 'imageUrl') {
  const step = props.modelValue.steps[index]
  let newValue: any

  if (field === 'imageUrl') {
    newValue = step.imageUrl !== undefined ? undefined : ''
  } else {
    newValue = step[field] ? undefined : createEmptyRichText()
  }

  updateStep(index, field, newValue)
}

function selectAudio(index: number) {
  // Demo: 使用示例音频
  const url = 'https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3'
  updateStep(index, 'audioUrl', url)
  uni.showToast({ title: '已选择示例音频', icon: 'success' })
}

function selectImage(index: number) {
  // Demo: 使用示例图片
  const images = [
    '/static/picsum/stem-01.jpg',
    '/static/picsum/stem-02.jpg',
    '/static/picsum/stem-03.jpg',
    '/static/picsum/opt-01.jpg',
    '/static/picsum/tall-01.jpg',
    '/static/caomei.jpeg',
    '/static/banana.jpeg',
    '/static/xigua.jpeg'
  ]
  const url = images[index % images.length]
  updateStep(index, 'imageUrl', url)
  uni.showToast({ title: '已选择示例图片', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.speaking-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.editor-section {
  background-color: #fff;
  border-radius: 8px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #fafafa;
  font-weight: 600;
  border-bottom: 1px solid $border-color;
}

.section-content {
  padding: 16px;
}

// 步骤列表
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-card {
  border: 1px solid $border-color;
  border-radius: 8px;
  overflow: hidden;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid $border-color;

  .step-number {
    width: 28px;
    height: 28px;
    background-color: $primary-color;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    flex-shrink: 0;
  }

  .step-title-input {
    flex: 1;
    height: 32px;
    border: none;
    background: transparent;
    font-size: 15px;
    font-weight: 500;

    &:focus {
      outline: none;
    }
  }

  .step-actions {
    display: flex;
    gap: 4px;

    .btn-icon {
      width: 28px;
      height: 28px;
      border: 1px solid $border-color;
      background-color: #fff;
      border-radius: 4px;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      &.delete {
        color: $error-color;
        &:hover {
          border-color: $error-color;
        }
      }

      &:after {
        border: none;
      }
    }
  }
}

.step-row {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .row-label {
    display: block;
    font-size: 13px;
    color: $text-secondary;
    margin-bottom: 8px;
  }
}

// 行为类型选择
.behavior-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.behavior-option {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid $border-color;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  .behavior-icon {
    font-size: 14px;
  }

  &:hover {
    border-color: $primary-color;
  }

  &.active {
    border-color: $primary-color;
    background-color: rgba($primary-color, 0.1);
    color: $primary-color;
  }
}

// 音频/图片输入
.audio-input {
  display: flex;
  gap: 8px;

  .url-input {
    flex: 1;
    height: 32px;
    border: 1px solid $border-color;
    border-radius: 4px;
    padding: 0 10px;
    font-size: 13px;
  }
}

// 时长输入
.duration-input {
  display: flex;
  align-items: center;
  gap: 8px;

  .number-input {
    width: 80px;
    height: 32px;
    border: 1px solid $border-color;
    border-radius: 4px;
    padding: 0 10px;
    font-size: 14px;
    text-align: center;
  }

  .unit {
    color: $text-secondary;
    font-size: 14px;
  }
}

// 内容开关
.content-toggles {
  display: flex;
  gap: 8px;
}

.toggle-item {
  padding: 6px 12px;
  border: 1px dashed $border-color;
  border-radius: 4px;
  font-size: 13px;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $primary-color;
    color: $primary-color;
  }

  &.active {
    border-style: solid;
    border-color: $primary-color;
    background-color: rgba($primary-color, 0.1);
    color: $primary-color;
  }
}

// 内容编辑区
.content-editor {
  background-color: #fafafa;
}

// 复选框
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;

  .checkbox-box {
    width: 18px;
    height: 18px;
    border: 1px solid $border-color;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all 0.2s;
  }

  &.checked .checkbox-box {
    background-color: $primary-color;
    border-color: $primary-color;
    color: #fff;
  }
}

// 添加步骤按钮
.add-step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border: 2px dashed $border-color;
  border-radius: 8px;
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  .add-icon {
    font-size: 20px;
  }

  &:hover {
    border-color: $primary-color;
    color: $primary-color;
  }
}
</style>
