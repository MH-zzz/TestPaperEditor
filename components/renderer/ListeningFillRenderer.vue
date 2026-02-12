<template>
  <view class="listening-fill">
    <scroll-view scroll-y class="listening-fill__scroll">
      <view class="listening-fill__inner">
        <!-- 头部（音频 + 引导语） -->
        <view class="listening-fill__header">
          <AudioPlayer
            v-if="data.audio?.url"
            :src="data.audio.url"
            :auto-play="mode === 'exam'"
          />
          <view class="listening-fill__stem">
            <RichTextRenderer :content="data.stem" />
          </view>
        </view>

        <!-- 填空正文区 -->
        <view class="fill-content">
          <template v-for="(part, index) in parsedTemplate" :key="index">
            <text v-if="part.type === 'text'" class="text-part">{{ part.value }}</text>

            <!-- 直接输入模式 -->
            <view v-else-if="inputMode === 'text'" class="blank-part">
              <input
                class="blank-input"
                :value="answers[part.id]"
                @input="(e) => onInput(part.id, e.detail.value)"
                :placeholder="getPlaceholder(part.id)"
                :class="getBlankClass(part.id)"
                :disabled="mode === 'review'"
                :style="{ width: getInputWidth(part.id) }"
              />
              <text class="blank-index">{{ part.index }}</text>
            </view>

            <!-- 选词填空模式 -->
            <view v-else class="blank-part select-mode" @click="onBlankClick(part.id)">
              <view
                class="blank-display"
                :class="[getBlankClass(part.id), { 'has-value': answers[part.id], 'is-active': activeBlank === part.id }]"
              >
                <text v-if="answers[part.id]" class="selected-word">{{ answers[part.id] }}</text>
                <text v-else class="blank-placeholder">{{ part.index }}</text>
              </view>
            </view>
          </template>
        </view>

        <!-- 选词模式：词库区域 -->
        <view v-if="inputMode === 'select' && mode !== 'review'" class="word-bank">
          <view class="word-bank__title">词库</view>
          <view class="word-bank__list">
            <view
              v-for="word in shuffledWordBank"
              :key="word"
              class="word-item"
              :class="{ used: usedWords.has(word), selected: selectedWord === word }"
              @click="onWordClick(word)"
            >
              {{ word }}
            </view>
          </view>
        </view>

        <!-- 显示答案时的答案区域 -->
        <view v-if="showAnswer" class="answer-section">
          <view class="answer-section__title">参考答案</view>
          <view class="answer-list">
            <view v-for="blank in data.blanks" :key="blank.id" class="answer-item">
              <text class="answer-index">{{ blank.id.replace('blank_', '') }}.</text>
              <text class="answer-text">{{ blank.answer.join(' / ') }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ListeningFillQuestion, RenderMode } from '/types'
import RichTextRenderer from './RichTextRenderer.vue'
import AudioPlayer from './AudioPlayer.vue'

const props = withDefaults(defineProps<{
  data: ListeningFillQuestion
  mode?: RenderMode
  answers?: Record<string, string>
  showAnswer?: boolean
}>(), {
  mode: 'preview',
  answers: () => ({}),
  showAnswer: false
})

const emit = defineEmits<{
  (e: 'select', blankId: string, value: string): void
}>()

// 当前激活的空格（选词模式用）
const activeBlank = ref<string | null>(null)
const selectedWord = ref<string | null>(null)

// 确定交互模式
const inputMode = computed(() => props.data.inputMode || 'text')

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffle(words: string[], seedText: string): string[] {
  const arr = [...words]
  let seed = hashSeed(seedText) || 1

  // Deterministic xorshift to keep word order stable for the same question seed.
  const nextRand = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

// 打乱词库顺序
const shuffledWordBank = computed(() => {
  const seed = `${String(props.data?.id || '')}|${String(props.data?.template || '')}`
  if (!props.data.wordBank?.length) {
    // 如果没有设置词库，自动从答案生成
    const words = props.data.blanks.map(b => b.answer[0]).filter(Boolean) as string[]
    return seededShuffle(words, `${seed}|auto`)
  }
  return seededShuffle(props.data.wordBank as string[], `${seed}|wordBank`)
})

// 已使用的词
const usedWords = computed(() => {
  return new Set(Object.values(props.answers).filter(Boolean))
})

// 解析模板字符串，拆分为文本和填空项
const parsedTemplate = computed(() => {
  const parts: any[] = []
  const template = props.data.template
  const regex = /\{\{(\d+)\}\}/g

  let lastIndex = 0
  let match

  while ((match = regex.exec(template)) !== null) {
    // 文本部分
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: template.substring(lastIndex, match.index)
      })
    }

    // 填空部分
    parts.push({
      type: 'blank',
      id: `blank_${match[1]}`,
      index: match[1]
    })

    lastIndex = regex.lastIndex
  }

  // 剩余文本
  if (lastIndex < template.length) {
    parts.push({
      type: 'text',
      value: template.substring(lastIndex)
    })
  }

  return parts
})

// 直接输入模式的回调
function onInput(blankId: string, value: string) {
  emit('select', blankId, value)
}

// 选词模式：点击空格
function onBlankClick(blankId: string) {
  if (props.mode === 'review') return

  // 如果已经有值，清除它
  if (props.answers[blankId]) {
    emit('select', blankId, '')
    return
  }

  // 设置为激活状态
  activeBlank.value = blankId

  // 如果已经选中了一个词，填入
  if (selectedWord.value) {
    emit('select', blankId, selectedWord.value)
    selectedWord.value = null
    activeBlank.value = null
  }
}

// 选词模式：点击词库中的词
function onWordClick(word: string) {
  if (props.mode === 'review') return

  // 如果词已被使用，不能再选
  if (usedWords.value.has(word)) return

  // 如果已经激活了一个空格，直接填入
  if (activeBlank.value) {
    emit('select', activeBlank.value, word)
    activeBlank.value = null
    selectedWord.value = null
  } else {
    // 否则标记选中状态
    selectedWord.value = selectedWord.value === word ? null : word
  }
}

function getPlaceholder(blankId: string) {
  const blank = props.data.blanks.find(b => b.id === blankId)
  return blank?.hint || ''
}

// 根据输入内容计算输入框宽度
function getInputWidth(blankId: string): string {
  const value = props.answers[blankId] || ''
  const hint = getPlaceholder(blankId)
  // 取输入内容和提示文字中较长的一个，最小 6 个字符宽度
  const len = Math.max(value.length, hint.length, 6)
  // 使用 ch 单位，1ch ≈ 一个字符宽度，额外加 2 个字符的边距
  return `${len + 2}ch`
}

function getBlankClass(blankId: string) {
  if (!props.showAnswer) return ''

  const userAnswer = props.answers[blankId] || ''
  const blank = props.data.blanks.find(b => b.id === blankId)
  if (!blank) return ''

  const isCorrect = blank.answer.some(a => a.toLowerCase().trim() === userAnswer.toLowerCase().trim())

  return isCorrect ? 'is-correct' : 'is-wrong'
}
</script>

<style lang="scss" scoped>
.listening-fill {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  &__scroll {
    flex: 1;
    min-height: 0;
    height: 0;
  }

  &__inner {
    min-height: 100%;
    padding: $spacing-md;
    box-sizing: border-box;
  }

  &__header {
    margin-bottom: 24px;
  }

  &__stem {
    font-size: 16px;
    font-weight: 500;
    margin-top: 12px;
  }
}

.fill-content {
  line-height: 2.4;
  font-size: 16px;
  color: #333;
}

.text-part {
  white-space: pre-wrap;
}

.blank-part {
  display: inline-block;
  position: relative;
  margin: 0 4px;
  vertical-align: middle;
}

// 直接输入模式
.blank-input {
  min-width: 60px;
  max-width: 200px;
  height: 32px;
  border-bottom: 2px solid #ddd;
  text-align: left;
  font-weight: 600;
  color: $primary-color;
  transition: width 0.15s ease;

  &:focus {
    border-bottom-color: $primary-color;
    background-color: rgba($primary-color, 0.05);
  }

  &.is-correct {
    border-bottom-color: $success-color;
    color: $success-color;
  }

  &.is-wrong {
    border-bottom-color: $error-color;
    color: $error-color;
  }
}

.blank-index {
  position: absolute;
  top: -12px;
  left: 0;
  font-size: 10px;
  color: #999;
  font-weight: bold;
}

// 选词填空模式
.blank-part.select-mode {
  cursor: pointer;
}

.blank-display {
  min-width: 80px;
  height: 32px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  background-color: #fafafa;
  transition: all 0.2s;

  &.is-active {
    border-color: $primary-color;
    background-color: rgba($primary-color, 0.05);
  }

  &.has-value {
    border-style: solid;
    border-color: $primary-color;
    background-color: #fff;
  }

  &.is-correct {
    border-color: $success-color;
    background-color: rgba($success-color, 0.1);
  }

  &.is-wrong {
    border-color: $error-color;
    background-color: rgba($error-color, 0.1);
  }
}

.selected-word {
  font-weight: 600;
  color: $primary-color;

  .is-correct & {
    color: $success-color;
  }

  .is-wrong & {
    color: $error-color;
  }
}

.blank-placeholder {
  color: #bbb;
  font-size: 12px;
}

// 词库区域
.word-bank {
  margin-top: 24px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;

  &__title {
    font-size: 14px;
    color: $text-secondary;
    margin-bottom: 12px;
    font-weight: 500;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
}

.word-item {
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(.used) {
    border-color: $primary-color;
    color: $primary-color;
  }

  &.selected {
    background-color: $primary-color;
    border-color: $primary-color;
    color: #fff;
  }

  &.used {
    background-color: #f0f0f0;
    color: #bbb;
    cursor: not-allowed;
    text-decoration: line-through;
  }
}

// 答案区域
.answer-section {
  margin-top: 24px;
  padding: 16px;
  background-color: rgba($success-color, 0.1);
  border-radius: 8px;
  border: 1px solid rgba($success-color, 0.3);

  &__title {
    font-size: 14px;
    color: $success-color;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.answer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.answer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;

  .answer-index {
    color: $text-secondary;
    font-weight: 500;
  }

  .answer-text {
    color: $success-color;
    font-weight: 600;
  }
}
</style>
