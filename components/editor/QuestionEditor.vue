<template>
  <view class="question-editor">
    <!-- 口语题编辑器（需要传递额外的props） -->
    <SpeakingStepsEditor
      v-if="modelValue.type === 'speaking_steps'"
      :model-value="modelValue"
      :preview-step-index="previewStepIndex"
      @update:model-value="handleUpdate"
      @step-expand="handleStepExpand"
    />

    <!-- 其他题型编辑器 -->
    <component
      v-else-if="editorComponent"
      :is="editorComponent"
      :model-value="modelValue"
      :preview-step-index="previewStepIndex"
      @update:model-value="handleUpdate"
      @step-expand="handleStepExpand"
    />

    <!-- 未支持的题型 -->
    <view v-else class="question-editor__unsupported">
      <text>暂不支持编辑的题型：{{ modelValue.type }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '/types'
import ListeningChoiceEditor from './ListeningChoiceEditor.vue'
import ListeningMatchEditor from './ListeningMatchEditor.vue'
import ListeningFillEditor from './ListeningFillEditor.vue'
import SpeakingStepsEditor from './SpeakingStepsEditor.vue'

const props = withDefaults(defineProps<{
  modelValue: Question
  previewStepIndex?: number
}>(), {
  previewStepIndex: 0
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Question): void
  (e: 'stepExpand', index: number): void
}>()

const editorComponent = computed(() => {
  const map: Record<string, any> = {
    listening_choice: ListeningChoiceEditor,
    listening_match: ListeningMatchEditor,
    listening_fill: ListeningFillEditor,
    speaking_steps: SpeakingStepsEditor
  }
  return map[props.modelValue.type]
})

function handleUpdate(value: Question) {
  emit('update:modelValue', value)
}

function handleStepExpand(index: number) {
  emit('stepExpand', index)
}
</script>

<style lang="scss" scoped>
.question-editor {
  &__unsupported {
    padding: $spacing-lg;
    text-align: center;
    color: $text-hint;
    background-color: #f5f5f5;
    border-radius: $border-radius-md;
  }
}
</style>
