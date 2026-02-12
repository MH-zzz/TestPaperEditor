<template>
  <view class="flow-property">
    <text class="flow-property__title">属性面板</text>
    <text class="flow-property__desc">基于步骤 schema 渲染字段，修改后实时回写图节点（Delete 删除，Ctrl/Cmd+Z 撤销，Ctrl/Cmd+D 复制，↑↓ 切节点）</text>

    <template v-if="node">
      <view class="flow-property__block">
        <text class="flow-property__label">节点</text>
        <text class="flow-property__value">{{ node.label }}</text>
      </view>

      <view
        v-for="field in fields"
        :key="field.key"
        class="flow-property__block"
      >
        <text class="flow-property__label">{{ field.label }}</text>

        <template v-if="field.type === 'select'">
          <view class="flow-property__chips">
            <text
              v-for="option in field.options || []"
              :key="`${field.key}:${option.value}`"
              class="flow-property__chip"
              :class="{ active: readFieldValue(field.key) === option.value }"
              @click="patchField(field.key, option.value)"
            >
              {{ option.label }}（{{ option.value }}）
            </text>
          </view>
          <input
            class="flow-property__input"
            :value="readFieldValue(field.key)"
            :placeholder="field.placeholder || ''"
            @input="(e) => patchField(field.key, e.detail.value)"
          />
        </template>

        <input
          v-else
          class="flow-property__input"
          :value="readFieldValue(field.key)"
          :placeholder="field.placeholder || ''"
          @input="(e) => patchField(field.key, e.detail.value)"
        />
        <text v-if="field.hint" class="flow-property__hint">{{ field.hint }}</text>
      </view>

      <view class="flow-property__actions">
        <button class="btn btn-outline btn-xs" @click="emit('move-up')">上移</button>
        <button class="btn btn-outline btn-xs" @click="emit('move-down')">下移</button>
        <button class="btn btn-outline btn-xs" @click="emit('duplicate')">复制节点</button>
        <button class="btn btn-outline btn-xs" @click="emit('reset')">重置图</button>
        <button class="btn btn-outline btn-xs danger" @click="emit('remove')">删除节点</button>
      </view>
    </template>

    <text v-else class="flow-property__empty">当前无可编辑节点</text>
  </view>
</template>

<script setup lang="ts">
import type { FlowVisualNode } from '/types'
import type {
  EditableFlowNodePayload,
  FlowPropertyField,
  FlowPropertyFieldKey,
  FlowVisualNodePatch
} from '/components/views/flow-modules/useEditableFlowGraph'

const emit = defineEmits<{
  (e: 'patch', patch: FlowVisualNodePatch): void
  (e: 'remove'): void
  (e: 'duplicate'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
  (e: 'reset'): void
}>()

const props = defineProps<{
  node: FlowVisualNode<EditableFlowNodePayload> | null
  fields: FlowPropertyField[]
}>()

function readFieldValue(key: FlowPropertyFieldKey): string {
  const node = props.node
  if (!node) return ''
  if (key === 'stepKind') return String(node.data.stepKind || '')
  if (key === 'autoNext') return String(node.data.autoNext || '')
  return String(node.data.groupId || '')
}

function patchField(key: FlowPropertyFieldKey, value: string) {
  if (key === 'stepKind') {
    emit('patch', { stepKind: value })
    return
  }
  if (key === 'autoNext') {
    emit('patch', { autoNext: value })
    return
  }
  emit('patch', { groupId: value })
}
</script>

<style lang="scss" scoped>
.flow-property {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-property__title {
  font-size: 13px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.88);
}

.flow-property__desc {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.flow-property__block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flow-property__label {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.62);
}

.flow-property__value {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.84);
  font-weight: 700;
  line-height: 1.35;
}

.flow-property__input {
  width: 100%;
  min-height: 30px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.82);
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.96);
}

.flow-property__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.flow-property__chip {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.64);
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 999px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.9);
}

.flow-property__chip.active {
  color: rgba(30, 64, 175, 0.92);
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(219, 234, 254, 0.68);
}

.flow-property__hint {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
  line-height: 1.35;
}

.flow-property__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.flow-property__empty {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.56);
}
</style>
