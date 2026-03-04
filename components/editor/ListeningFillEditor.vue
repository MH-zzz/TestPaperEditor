<template>
  <view class="listening-fill-editor">
    <!-- 主题干设置 -->
    <view class="editor-section">
      <view class="section-title">主题干</view>
      <view class="section-content">
        <view class="form-item">
          <text class="form-item__label">说明文字</text>
          <RichTextEditor
            :model-value="modelValue.stem"
            @update:model-value="updateStem"
            placeholder="例如：请听录音，补全短文。"
          />
        </view>

        <!-- 音频设置 -->
        <view class="form-item" style="margin-top: 20px; padding-top: 20px; border-top: 1px dashed #eee;">
          <text class="form-item__label">听力音频</text>
          <view class="audio-upload">
            <view v-if="modelValue.audio.url" class="audio-preview">
              <text class="audio-url">{{ modelValue.audio.url }}</text>
              <picker :range="LOCAL_AUDIO_OPTIONS" @change="onSelectLocalAudio">
                <button class="btn btn-outline btn-sm">更换内置音频</button>
              </picker>
            </view>
            <view v-else class="upload-actions">
              <picker :range="LOCAL_AUDIO_OPTIONS" @change="onSelectLocalAudio">
                <button class="btn btn-outline upload-btn">选择内置音频</button>
              </picker>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 交互模式设置 -->
    <view class="editor-section">
      <view class="section-title">交互模式</view>
      <view class="section-content">
        <view class="mode-selector">
          <view
            class="mode-option"
            :class="{ active: currentMode === 'text' }"
            @click="updateMode('text')"
          >
            <view class="mode-icon">⌨️</view>
            <view class="mode-info">
              <text class="mode-name">直接输入</text>
              <text class="mode-desc">学生在空格处直接打字输入答案</text>
            </view>
          </view>
          <view
            class="mode-option"
            :class="{ active: currentMode === 'select' }"
            @click="updateMode('select')"
          >
            <view class="mode-icon">🎯</view>
            <view class="mode-info">
              <text class="mode-name">选词填空</text>
              <text class="mode-desc">从词库中选择正确答案填入</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 填空内容编辑 -->
    <view class="editor-section">
      <view class="section-title">填空内容</view>
      <view class="section-content">
        <view class="form-item">
          <text class="form-item__label">题目正文（使用 {{1}}, {{2}} 作为空格占位符）</text>
          <textarea
            class="template-input"
            :value="modelValue.template"
            @input="updateTemplate"
            placeholder="例如：I have a {{1}}. It is very {{2}}."
            :maxlength="-1"
          />
        </view>

        <!-- 填空项列表 -->
        <view class="blanks-list">
          <view
            v-for="(blank, index) in modelValue.blanks"
            :key="blank.id"
            class="blank-item-editor"
          >
            <view class="blank-label">{{ index + 1 }}</view>
            <view class="blank-inputs">
              <input
                class="answer-input"
                :value="blank.answer[0]"
                @input="(e) => updateBlankAnswer(index, e.detail.value)"
                placeholder="正确答案"
              />
              <input
                class="hint-input"
                :value="blank.hint"
                @input="(e) => updateBlankHint(index, e.detail.value)"
                placeholder="输入提示 (可选)"
              />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 选词模式：词库设置 -->
    <view v-if="currentMode === 'select'" class="editor-section">
      <view class="section-title">
        词库设置
        <button class="btn btn-text btn-sm" @click="autoGenerateWordBank">自动生成</button>
      </view>
      <view class="section-content">
        <view class="form-item">
          <text class="form-item__label">词库（包含正确答案和干扰项，用空格或逗号分隔）</text>
          <textarea
            class="wordbank-input"
            :value="wordBankText"
            @input="updateWordBank"
            placeholder="例如：doctor teacher nurse dancer cakes cookies bread animals plants flowers"
            auto-height
          />
        </view>

        <!-- 词库预览 -->
        <view class="wordbank-preview" v-if="modelValue.wordBank?.length">
          <text class="preview-label">预览 ({{ modelValue.wordBank.length }} 个词)</text>
          <view class="preview-words">
            <view
              v-for="word in modelValue.wordBank"
              :key="word"
              class="preview-word"
              :class="{ 'is-answer': isAnswerWord(word) }"
            >
              {{ word }}
              <text v-if="isAnswerWord(word)" class="answer-badge">答案</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ListeningFillQuestion, RichTextContent, FillInputMode } from '/types'
import RichTextEditor from './RichTextEditor.vue'
import { LOCAL_AUDIO_OPTIONS, getLocalAudioUrl } from '/utils/audioOptions'

const props = defineProps<{
  modelValue: ListeningFillQuestion
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ListeningFillQuestion): void
}>()

// 当前交互模式
const currentMode = computed(() => props.modelValue.inputMode || 'text')

// 词库文本（用于编辑）
const wordBankText = computed(() => {
  return (props.modelValue.wordBank || []).join(', ')
})

// 所有正确答案
const allAnswers = computed(() => {
  return props.modelValue.blanks.flatMap(b => b.answer).map(a => a.toLowerCase())
})

function updateStem(content: RichTextContent) {
  emit('update:modelValue', { ...props.modelValue, stem: content })
}

function onSelectLocalAudio(e: any) {
  const index = e.detail.value
  const filename = LOCAL_AUDIO_OPTIONS[index]
  const url = getLocalAudioUrl(filename)
  emit('update:modelValue', {
    ...props.modelValue,
    audio: { ...props.modelValue.audio, url }
  })
}

function updateMode(mode: FillInputMode) {
  const newQ = { ...props.modelValue, inputMode: mode }

  // 切换到选词模式时，如果没有词库，自动生成
  if (mode === 'select' && (!newQ.wordBank || newQ.wordBank.length === 0)) {
    newQ.wordBank = props.modelValue.blanks
      .map(b => b.answer[0])
      .filter(Boolean)
  }

  emit('update:modelValue', newQ)
}

function updateTemplate(e: any) {
  const template = e.detail.value
  const blankMatches = template.match(/\{\{(\d+)\}\}/g) || []
  const blankCount = blankMatches.length

  let newBlanks = [...props.modelValue.blanks]

  // 调整填空项数量
  if (blankCount > newBlanks.length) {
    for (let i = newBlanks.length; i < blankCount; i++) {
      newBlanks.push({
        id: `blank_${i + 1}`,
        answer: [''],
        hint: ''
      })
    }
  } else if (blankCount < newBlanks.length) {
    newBlanks = newBlanks.slice(0, blankCount)
  }

  emit('update:modelValue', {
    ...props.modelValue,
    template,
    blanks: newBlanks
  })
}

function updateBlankAnswer(index: number, val: string) {
  const newBlanks = [...props.modelValue.blanks]
  newBlanks[index] = { ...newBlanks[index], answer: [val] }
  emit('update:modelValue', { ...props.modelValue, blanks: newBlanks })
}

function updateBlankHint(index: number, val: string) {
  const newBlanks = [...props.modelValue.blanks]
  newBlanks[index] = { ...newBlanks[index], hint: val }
  emit('update:modelValue', { ...props.modelValue, blanks: newBlanks })
}

function updateWordBank(e: any) {
  const text = e.detail.value
  // 支持空格、逗号、换行分隔
  const words = text.split(/[,，\s\n]+/).map((w: string) => w.trim()).filter(Boolean)
  emit('update:modelValue', {
    ...props.modelValue,
    wordBank: words
  })
}

function autoGenerateWordBank() {
  // 收集所有正确答案
  const answers = props.modelValue.blanks
    .map(b => b.answer[0])
    .filter(Boolean)

  // 添加一些常见的干扰项（示例）
  const distractors = ['student', 'friend', 'house', 'beautiful', 'happy']

  // 合并并去重
  const wordBank = [...new Set([...answers, ...distractors])]

  emit('update:modelValue', {
    ...props.modelValue,
    wordBank
  })

  uni.showToast({ title: '已生成词库', icon: 'success' })
}

function isAnswerWord(word: string): boolean {
  return allAnswers.value.includes(word.toLowerCase())
}
</script>

<style lang="scss" scoped>
.listening-fill-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.editor-section {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
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

.form-item {
  margin-bottom: 20px;
  &:last-child { margin-bottom: 0; }
  &__label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: $text-secondary;
  }
}

.audio-upload {
  display: flex;
  gap: 12px;
  align-items: center;
  .audio-preview {
    flex: 1;
    display: flex;
    background: #f5f5f5;
    padding: 4px 12px;
    border-radius: 4px;
    align-items: center;
    .audio-url { flex: 1; font-size: 12px; color: #666; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  }

  .upload-actions {
    display: flex;
    gap: 12px;
  }
}

// 交互模式选择器
.mode-selector {
  display: flex;
  gap: 16px;
}

.mode-option {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #bbb;
  }

  &.active {
    border-color: $primary-color;
    background-color: rgba($primary-color, 0.05);
  }

  .mode-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .mode-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mode-name {
    font-weight: 600;
    font-size: 15px;
    color: $text-primary;
  }

  .mode-desc {
    font-size: 12px;
    color: $text-secondary;
  }
}

.template-input {
  width: 100%;
  min-height: 120px;
  height: auto;
  border: 1px solid $border-color;
  border-radius: 4px;
  padding: 12px;
  font-size: 15px;
  line-height: 1.8;
  background-color: #fff;
  box-sizing: border-box;

  &:focus {
    border-color: $primary-color;
    outline: none;
  }
}

.blanks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.blank-item-editor {
  display: flex;
  gap: 12px;
  align-items: center;
  background-color: #fff;
  border: 1px solid #eee;
  padding: 12px;
  border-radius: 6px;

  .blank-label {
    width: 24px;
    height: 24px;
    background-color: $primary-color;
    color: #fff;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
  }

  .blank-inputs {
    flex: 1;
    display: flex;
    gap: 12px;

    input {
      flex: 1;
      height: 32px;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
      &:focus { border-bottom-color: $primary-color; }
    }

    .hint-input {
      color: #999;
      font-style: italic;
    }
  }
}

// 词库设置
.wordbank-input {
  width: 100%;
  min-height: 80px;
  border: 1px solid $border-color;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  background-color: #f9f9f9;
}

.wordbank-preview {
  margin-top: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 6px;

  .preview-label {
    display: block;
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 10px;
  }

  .preview-words {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .preview-word {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 14px;
    font-size: 13px;

    &.is-answer {
      border-color: $success-color;
      background-color: rgba($success-color, 0.1);
    }

    .answer-badge {
      font-size: 10px;
      color: $success-color;
      font-weight: 500;
    }
  }
}
</style>
