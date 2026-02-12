<template>
  <view class="preview-page">
    <view class="preview-container" v-if="questionData">
      <QuestionRenderer
        :data="questionData"
        mode="preview"
        :answers="userAnswers"
        @select="handleSelect"
      />
    </view>
    <view v-else class="empty-state">
      <text>没有可预览的题目</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Question, MatchMode } from '/types'
import QuestionRenderer from '/components/renderer/QuestionRenderer.vue'
import { questionTemplates, migrateListeningChoiceFlowSplitIntro, generateId } from '/templates'
import { resolveListeningChoiceQuestion } from '../../engine/flow/listening-choice/binding.ts'

const questionData = ref<Question | null>(null)
const userAnswers = ref<Record<string, string | string[]>>({})

// 处理选择
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

function handleSelect(subQuestionId: string, optionKey: string) {
  if (questionData.value?.type === 'listening_match') {
    const mode: MatchMode = questionData.value.matchMode || 'one-to-many'
    userAnswers.value = applyMatchSelection(userAnswers.value, subQuestionId, optionKey, mode)
    return
  }

  if (questionData.value?.type === 'listening_choice') {
    let mode: 'single' | 'multiple' = 'single'
    try {
      const groups = (questionData.value as any).content?.groups || []
      for (const g of groups) {
        for (const sq of (g.subQuestions || [])) {
          if (sq.id === subQuestionId) {
            mode = sq.answerMode || 'single'
            break
          }
        }
      }
    } catch {}
    const current = userAnswers.value[subQuestionId]
    if (mode === 'multiple') {
      const list = Array.isArray(current) ? [...current] : current ? [current] : []
      const index = list.indexOf(optionKey)
      if (index > -1) list.splice(index, 1)
      else list.push(optionKey)
      userAnswers.value = { ...userAnswers.value, [subQuestionId]: list }
    } else {
      userAnswers.value = { ...userAnswers.value, [subQuestionId]: [optionKey] }
    }
    return
  }

  userAnswers.value = {
    ...userAnswers.value,
    [subQuestionId]: optionKey
  }
}

function resolveListeningChoiceFlowSource(data: any) {
  if (!data || data.type !== 'listening_choice') return data
  return resolveListeningChoiceQuestion(data as any, { generateId }) as any
}

onMounted(() => {
  try {
    const stored = uni.getStorageSync('currentQuestion')
    if (stored) {
      let data = JSON.parse(stored)
      if (data?.type === 'listening_choice' && (!data.content || !data.flow)) {
        data = questionTemplates.listening_choice.create()
        uni.setStorageSync('currentQuestion', JSON.stringify(data))
      }
      if (data?.type === 'listening_choice' && data.content && data.flow) {
        const migrated = migrateListeningChoiceFlowSplitIntro(data)
        if (migrated !== data) {
          data = migrated
          uni.setStorageSync('currentQuestion', JSON.stringify(data))
        }
      }
      if (data?.type === 'listening_choice' && data.content && data.flow) {
        const resolved = resolveListeningChoiceFlowSource(data)
        if (resolved !== data) {
          data = resolved
          uni.setStorageSync('currentQuestion', JSON.stringify(data))
        }
      }
      questionData.value = data
    }
  } catch (e) {
    console.error('加载预览数据失败：', e)
  }
})
</script>

<style lang="scss" scoped>
.preview-page {
  height: 100vh;
  min-height: 100vh;
  background-color: $bg-color;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-container {
  flex: 1;
  min-height: 0;
  background-color: $bg-white;
  display: flex;
  flex-direction: column;

  :deep(.question-renderer) {
    flex: 1;
    min-height: 0;
  }
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: $text-hint;
}
</style>
