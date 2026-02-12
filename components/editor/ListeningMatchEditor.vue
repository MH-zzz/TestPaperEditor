<template>
  <view class="listening-match-editor">
    <!-- 主题干设置 -->
    <view class="editor-section">
      <view class="section-title">主题干</view>
      <view class="section-content">
        <!-- 题干编辑 -->
        <view class="form-item">
          <text class="form-item__label">题干内容</text>
          <RichTextEditor
            :model-value="modelValue.stem"
            @update:model-value="updateStem"
            placeholder="请输入题干内容"
          />
        </view>

        <!-- 音频设置 -->
        <view class="form-item" style="margin-top: 20px; padding-top: 20px; border-top: 1px dashed #eee;">
          <text class="form-item__label">听力音频</text>
          <view class="audio-upload">
            <view v-if="modelValue.audio.url" class="audio-preview">
              <text class="audio-url">{{ modelValue.audio.url }}</text>
              <button class="btn btn-outline btn-sm" @click="uploadAudio">更换</button>
            </view>
            <button v-else class="btn btn-outline upload-btn" @click="uploadAudio">上传音频</button>
          </view>

          <!-- 音频位置 -->
          <view v-if="modelValue.audio.url" class="radio-group small" style="margin-top: 8px;">
            <view
              class="radio-item small"
              :class="{ active: modelValue.audio.position === 'above' }"
              @click="updateAudioPosition('above')"
            >
              <text>题干上方</text>
            </view>
            <view
              class="radio-item small"
              :class="{ active: modelValue.audio.position === 'below' }"
              @click="updateAudioPosition('below')"
            >
              <text>题干下方</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 连线项设置 -->
    <view class="editor-section">
      <view class="section-title">连线项目</view>
      <view class="section-content items-container">
        <!-- 左侧列表 -->
        <view class="items-column">
          <view class="column-header">左侧项目</view>
          <view class="items-list">
            <view
              v-for="(item, index) in modelValue.leftItems"
              :key="item.id"
              class="match-item-editor"
            >
              <view class="item-label">{{ index + 1 }}</view>
              <view class="item-content-wrapper">
                <RichTextEditor
                  :model-value="item.content"
                  @update:model-value="(val) => updateItemContent('left', index, val)"
                  placeholder="输入文字或插入图片"
                  min-height="32px"
                  dense
                />
              </view>
              <button
                class="btn-icon delete-btn"
                @click="removeItem('left', index)"
                v-if="modelValue.leftItems.length > 1"
              >×</button>
            </view>
            <button class="btn btn-text add-btn" @click="addItem('left')">+ 添加左侧项</button>
          </view>
        </view>

        <!-- 右侧列表 -->
        <view class="items-column">
          <view class="column-header">右侧项目</view>
          <view class="items-list">
            <view
              v-for="(item, index) in modelValue.rightItems"
              :key="item.id"
              class="match-item-editor"
            >
              <view class="item-label">{{ String.fromCharCode(65 + index) }}</view>
              <view class="item-content-wrapper">
                <RichTextEditor
                  :model-value="item.content"
                  @update:model-value="(val) => updateItemContent('right', index, val)"
                  placeholder="输入文字或插入图片"
                  min-height="32px"
                  dense
                />
              </view>
              <button
                class="btn-icon delete-btn"
                @click="removeItem('right', index)"
                v-if="modelValue.rightItems.length > 1"
              >×</button>
            </view>
            <button class="btn btn-text add-btn" @click="addItem('right')">+ 添加右侧项</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 答案设置 -->
    <view class="editor-section">
      <view class="section-title">
        <text>正确答案</text>
        <view class="mode-toggle">
          <view
            class="mode-btn"
            :class="{ active: matchMode === 'one-to-many' }"
            @click="setMatchMode('one-to-many')"
          >一对多</view>
          <view
            class="mode-btn"
            :class="{ active: matchMode === 'one-to-one' }"
            @click="setMatchMode('one-to-one')"
          >一对一</view>
        </view>
      </view>
      <view class="section-content answer-settings">
        <view class="answer-hint">点击右侧项建立连接，当前模式：{{ modeLabel }}</view>
        <view
          v-for="(leftItem, index) in modelValue.leftItems"
          :key="leftItem.id"
          class="answer-row"
        >
          <!-- 左侧项预览 -->
          <view class="item-preview left-preview">
            <image
              v-if="hasImage(leftItem.content)"
              :src="getFirstImage(leftItem.content)"
              mode="aspectFit"
              class="preview-thumb"
            />
            <text v-else class="preview-text">{{ getPlainText(leftItem.content) || '(空)' }}</text>
          </view>
          <text class="arrow">→</text>
          <!-- 右侧选项 -->
          <view class="right-options">
            <view
              v-for="rightItem in modelValue.rightItems"
              :key="rightItem.id"
              class="checkbox-item"
              :class="{ checked: isAnswerSelected(leftItem.id, rightItem.id) }"
              @click="toggleAnswer(leftItem.id, rightItem.id)"
            >
              <view class="checkbox-box">
                <text v-if="isAnswerSelected(leftItem.id, rightItem.id)">✓</text>
              </view>
              <image
                v-if="hasImage(rightItem.content)"
                :src="getFirstImage(rightItem.content)"
                mode="aspectFit"
                class="option-thumb"
              />
              <text v-else class="checkbox-label">{{ getPlainText(rightItem.content) || '(空)' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ListeningMatchQuestion, RichTextContent, MatchItem, MatchMode, MatchPair } from '/types'
import { generateId, createEmptyRichText } from '/templates'
import RichTextEditor from './RichTextEditor.vue'

const props = defineProps<{
  modelValue: ListeningMatchQuestion
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ListeningMatchQuestion): void
}>()

const matchMode = computed<MatchMode>(() => props.modelValue.matchMode || 'one-to-many')
const modeLabel = computed(() => (matchMode.value === 'one-to-one' ? '一对一' : '一对多'))

// ================= 音频 & 题干 =================

function updateAudioPosition(position: 'above' | 'below') {
  emit('update:modelValue', {
    ...props.modelValue,
    audio: { ...props.modelValue.audio, position }
  })
}

function uploadAudio() {
  const url = 'https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3'
  emit('update:modelValue', {
    ...props.modelValue,
    audio: { ...props.modelValue.audio, url }
  })
  uni.showToast({ title: '已关联示例音频', icon: 'success' })
}

function updateStem(content: RichTextContent) {
  emit('update:modelValue', {
    ...props.modelValue,
    stem: content
  })
}

// ================= 连线项目 =================

function updateItemContent(side: 'left' | 'right', index: number, content: RichTextContent) {
  const newQ = { ...props.modelValue }
  const list = side === 'left' ? [...newQ.leftItems] : [...newQ.rightItems]
  list[index] = { ...list[index], content }

  if (side === 'left') newQ.leftItems = list
  else newQ.rightItems = list

  emit('update:modelValue', newQ)
}

function addItem(side: 'left' | 'right') {
  const newQ = { ...props.modelValue }
  const newItem: MatchItem = {
    id: generateId(),
    content: createEmptyRichText()
  }

  if (side === 'left') {
    newQ.leftItems = [...newQ.leftItems, newItem]
  } else {
    newQ.rightItems = [...newQ.rightItems, newItem]
  }

  emit('update:modelValue', newQ)
}

function removeItem(side: 'left' | 'right', index: number) {
  const newQ = { ...props.modelValue }
  if (side === 'left') {
    const id = newQ.leftItems[index].id
    newQ.leftItems = newQ.leftItems.filter((_, i) => i !== index)
    newQ.answers = newQ.answers.filter(a => a.left !== id)
  } else {
    const id = newQ.rightItems[index].id
    newQ.rightItems = newQ.rightItems.filter((_, i) => i !== index)
    newQ.answers = newQ.answers.filter(a => a.right !== id)
  }

  emit('update:modelValue', newQ)
}

// ================= 答案设置（支持一对多） =================
function normalizeAnswersOneToOne(answers: MatchPair[]): MatchPair[] {
  const seenLeft = new Set<string>()
  const seenRight = new Set<string>()
  const result: MatchPair[] = []
  for (let i = answers.length - 1; i >= 0; i--) {
    const pair = answers[i]
    if (seenLeft.has(pair.left) || seenRight.has(pair.right)) continue
    seenLeft.add(pair.left)
    seenRight.add(pair.right)
    result.push(pair)
  }
  return result.reverse()
}

function setMatchMode(mode: MatchMode) {
  if (mode === matchMode.value) return

  let newAnswers = props.modelValue.answers
  let toastText = mode === 'one-to-one' ? '已切换为一对一模式' : '已切换为一对多模式'

  if (mode === 'one-to-one') {
    const cleaned = normalizeAnswersOneToOne(newAnswers)
    if (cleaned.length !== newAnswers.length) {
      newAnswers = cleaned
      toastText = '已切换为一对一，已清理冲突答案'
    }
  }

  emit('update:modelValue', {
    ...props.modelValue,
    matchMode: mode,
    answers: newAnswers
  })
  uni.showToast({ title: toastText, icon: 'none' })
}

function getPlainText(content?: RichTextContent): string {
  if (!content?.content) return ''
  return content.content
    .filter(node => node.type === 'text')
    .map(node => (node as any).text || '')
    .join('')
    .trim()
}

function getFirstImage(content?: RichTextContent): string | null {
  if (!content?.content) return null
  const imgNode = content.content.find(node => node.type === 'image')
  return imgNode ? (imgNode as any).url : null
}

function hasImage(content?: RichTextContent): boolean {
  return getFirstImage(content) !== null
}

function isAnswerSelected(leftId: string, rightId: string): boolean {
  return props.modelValue.answers.some(a => a.left === leftId && a.right === rightId)
}

function toggleAnswer(leftId: string, rightId: string) {
  let newAnswers = [...props.modelValue.answers]
  const existingIndex = newAnswers.findIndex(a => a.left === leftId && a.right === rightId)

  if (matchMode.value === 'one-to-one') {
    if (existingIndex > -1) {
      newAnswers.splice(existingIndex, 1)
    } else {
      const filtered = newAnswers.filter(a => a.left !== leftId && a.right !== rightId)
      const removed = newAnswers.length - filtered.length
      filtered.push({ left: leftId, right: rightId })
      newAnswers = filtered
      if (removed > 0) {
        uni.showToast({ title: '一对一模式：已替换为最新选择', icon: 'none' })
      }
    }
  } else {
    if (existingIndex > -1) {
      newAnswers.splice(existingIndex, 1)
    } else {
      newAnswers.push({ left: leftId, right: rightId })
    }
  }

  emit('update:modelValue', {
    ...props.modelValue,
    answers: newAnswers
  })
}
</script>

<style lang="scss" scoped>
.listening-match-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.editor-section {
  background-color: $bg-white;
  border-radius: $border-radius-md;
  overflow: hidden;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background-color: #fafafa;
  font-weight: 500;
  border-bottom: 1px solid $border-color;
}

.section-content {
  padding: $spacing-md;
}

.mode-toggle {
  display: flex;
  gap: 6px;
  background-color: #f0f0f0;
  padding: 2px;
  border-radius: 6px;

  .mode-btn {
    padding: 2px 10px;
    font-size: 12px;
    border-radius: 4px;
    color: $text-secondary;
    background-color: transparent;
    cursor: pointer;

    &.active {
      background-color: #fff;
      color: $primary-color;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
  }
}

// 通用表单
.form-item {
  margin-bottom: 16px;
  &:last-child { margin-bottom: 0; }

  &__label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: $text-secondary;
  }
}

// 音频
.audio-upload {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .audio-preview {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    background-color: #f5f5f5;
    padding: 4px 8px;
    border-radius: $border-radius-sm;

    .audio-url {
      flex: 1;
      font-size: 12px;
      color: #666;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}

.radio-group.small {
  display: flex;
  gap: 8px;
  .radio-item {
    padding: 4px 12px;
    font-size: 12px;
    border: 1px solid $border-color;
    border-radius: 4px;
    cursor: pointer;
    &.active {
      border-color: $primary-color;
      background-color: $primary-light;
      color: $primary-color;
    }
  }
}

// 连线项
.items-container {
  display: flex;
  gap: 24px;
}

.items-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.column-header {
  font-size: 14px;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: 12px;
  text-align: center;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-item-editor {
  display: flex;
  align-items: flex-start;
  gap: 0;

  .item-label {
    width: 32px;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
    border: 1px solid $border-color;
    border-right: none;
    border-radius: 4px 0 0 4px;
    font-size: 14px;
    color: #666;
    flex-shrink: 0;
  }

  .item-content-wrapper {
    flex: 1;
    border: 1px solid $border-color;
    border-radius: 0 4px 4px 0;
    overflow: hidden;

    :deep(.rich-text-editor) {
      border: none;
      border-radius: 0;
    }
  }

  .delete-btn {
    width: 24px;
    height: 24px;
    line-height: 22px;
    text-align: center;
    border-radius: 50%;
    background-color: #fff;
    border: 1px solid $border-color;
    color: #999;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    margin-top: 6px;
    margin-left: 8px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:after { border: none; }
    &:hover { border-color: #ff6600; color: #ff6600; }
  }
}

.add-btn {
  align-self: center;
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  color: $primary-color;
  font-size: 14px;
  padding: 4px 8px;
  border: none;
  &:after { border: none; }
  &:hover { background-color: rgba($primary-color, 0.1); border-radius: 4px; }
}

// 答案设置
.answer-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-hint {
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 4px;
}

.answer-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background-color: #f9f9f9;
  border-radius: 6px;

  .item-preview {
    flex-shrink: 0;
    min-width: 60px;
    max-width: 120px;
    padding: 6px 10px;
    background-color: #fff;
    border: 1px solid $border-color;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

    .preview-thumb {
      width: 40px;
      height: 40px;
    }

    .preview-text {
      font-size: 13px;
      color: $text-primary;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .arrow {
    color: #999;
    flex-shrink: 0;
    font-size: 16px;
  }

  .right-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex: 1;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background-color: #fff;
    border: 1px solid $border-color;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: $primary-color;
    }

    &.checked {
      border-color: $primary-color;
      background-color: $primary-light;

      .checkbox-box {
        background-color: $primary-color;
        border-color: $primary-color;
        color: #fff;
      }
    }

    .checkbox-box {
      width: 16px;
      height: 16px;
      border: 1px solid $border-color;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .option-thumb {
      width: 32px;
      height: 32px;
    }

    .checkbox-label {
      font-size: 13px;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
