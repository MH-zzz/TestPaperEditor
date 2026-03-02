<template>
  <ListeningChoiceEditor
    :model-value="bridgedValue"
    :preview-step-index="previewStepIndex"
    :template-mode="templateMode"
    :focus-path="focusPath"
    question-mode="hearAnswer"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  AudioConfig,
  ListeningChoiceQuestion,
  RichTextContent,
  SpeakingHearAnswerQuestion
} from '/types'
import ListeningChoiceEditor from './ListeningChoiceEditor.vue'
import { createEmptyRichText } from '/templates'

type QuestionWithMeta = SpeakingHearAnswerQuestion & {
  metadata?: Record<string, unknown>
}

const props = withDefaults(defineProps<{
  modelValue: SpeakingHearAnswerQuestion
  previewStepIndex?: number
  templateMode?: boolean
  focusPath?: string
}>(), {
  templateMode: false,
  focusPath: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: SpeakingHearAnswerQuestion): void
}>()

function normalizeStem(stem: unknown): RichTextContent {
  if (stem && typeof stem === 'object' && (stem as RichTextContent).type === 'richtext') {
    return stem as RichTextContent
  }
  return createEmptyRichText()
}

function normalizeAudio(audio: unknown): AudioConfig | undefined {
  if (!audio || typeof audio !== 'object') return undefined
  const src = audio as AudioConfig
  const url = String(src.url || '').trim()
  if (!url) return undefined
  return {
    url,
    position: src.position === 'below' ? 'below' : 'above'
  }
}

function toListeningChoiceBridge(question: SpeakingHearAnswerQuestion): ListeningChoiceQuestion {
  return {
    ...(question as unknown as QuestionWithMeta),
    type: 'listening_choice',
    optionStyle: 'ABCD',
    content: {
      ...question.content,
      groups: (question.content?.groups || []).map((group) => ({
        ...group,
        subQuestions: (group.subQuestions || []).map((sq) => ({
          id: String(sq.id || ''),
          order: Number(sq.order || 0),
          stem: normalizeStem(sq.stem),
          audio: normalizeAudio(sq.audio),
          options: [],
          answerMode: 'single',
          answer: []
        }))
      }))
    }
  } as ListeningChoiceQuestion
}

function toSpeakingHearAnswer(question: ListeningChoiceQuestion | SpeakingHearAnswerQuestion): SpeakingHearAnswerQuestion {
  const source = question as ListeningChoiceQuestion
  const metadata = (source as unknown as QuestionWithMeta).metadata || {}
  return {
    ...(source as unknown as QuestionWithMeta),
    type: 'speaking_hear_answer',
    metadata: {
      ...metadata,
      questionVariant: 'hear_answer'
    },
    content: {
      ...source.content,
      groups: (source.content?.groups || []).map((group) => ({
        ...group,
        subQuestions: (group.subQuestions || []).map((sq) => ({
          id: String(sq.id || ''),
          order: Number((sq as { order?: number }).order || 0),
          stem: normalizeStem((sq as { stem?: RichTextContent }).stem),
          audio: normalizeAudio((sq as { audio?: AudioConfig }).audio)
        }))
      }))
    }
  } as SpeakingHearAnswerQuestion
}

const bridgedValue = computed<ListeningChoiceQuestion>(() => {
  return toListeningChoiceBridge(props.modelValue)
})

function handleUpdate(next: ListeningChoiceQuestion) {
  emit('update:modelValue', toSpeakingHearAnswer(next))
}
</script>
