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
import type { ListeningChoiceQuestion, MatchMode, Question, SpeakingHearAnswerQuestion } from '/types'
import { applyListeningMatchSelection } from '/engine/flow/listening-match/runtime.ts'
import QuestionRenderer from '/components/renderer/QuestionRenderer.vue'
import { questionTemplates, generateId } from '/templates'
import { resolveListeningChoiceQuestion } from '../../engine/flow/listening-choice/binding.ts'
import { loadCurrentQuestionSnapshot, saveCurrentQuestionSnapshot } from '/infra/repository/questionRepository'

const questionData = ref<Question | null>(null)
const userAnswers = ref<Record<string, string | string[]>>({})

function handleSelect(subQuestionId: string, optionKey: string) {
  if (questionData.value?.type === 'listening_match') {
    const mode: MatchMode = questionData.value.matchMode || 'one-to-many'
    userAnswers.value = applyListeningMatchSelection(userAnswers.value, subQuestionId, optionKey, mode)
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

function resolveListeningChoiceFlowSource(data: Question) {
  if (!data) return data
  if (data.type !== 'listening_choice' && data.type !== 'speaking_hear_answer') return data
  return resolveListeningChoiceQuestion(data as ListeningChoiceQuestion | SpeakingHearAnswerQuestion, { generateId }) as Question
}

onMounted(() => {
  try {
    const snapshot = loadCurrentQuestionSnapshot<Question>()
    if (!snapshot) return

    let data = snapshot
    if ((data?.type === 'listening_choice' || data?.type === 'speaking_hear_answer') && (!data.content || !data.flow)) {
      data = data.type === 'speaking_hear_answer'
        ? questionTemplates.speaking_hear_answer.create()
        : questionTemplates.listening_choice.create()
      saveCurrentQuestionSnapshot(data)
    }
    if ((data?.type === 'listening_choice' || data?.type === 'speaking_hear_answer') && data.content && data.flow) {
      const resolved = resolveListeningChoiceFlowSource(data)
      if (resolved !== data) {
        data = resolved
        saveCurrentQuestionSnapshot(data)
      }
    }
    questionData.value = data
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
