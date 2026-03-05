<template>
  <view class="listening-order">
    <scroll-view scroll-y class="listening-order__scroll">
      <view class="listening-order__inner">
        <view class="listening-order__header">
          <AudioPlayer
            v-if="data.audio?.url"
            :src="data.audio.url"
            :auto-play="mode === 'exam'"
          />
          <view class="listening-order__stem">
            <RichTextRenderer :content="data.stem" />
          </view>
        </view>

        <view class="listening-order__list">
          <view
            v-for="(item, index) in orderedItems"
            :key="item.id"
            class="order-item"
          >
            <text class="order-item__index">{{ index + 1 }}</text>
            <view class="order-item__content">
              <RichTextRenderer :content="item.content" />
            </view>
            <view v-if="mode !== 'review'" class="order-item__actions">
              <button
                class="order-item__btn"
                :disabled="index <= 0"
                @click="moveBy(index, -1)"
              >↑</button>
              <button
                class="order-item__btn"
                :disabled="index >= orderedItems.length - 1"
                @click="moveBy(index, 1)"
              >↓</button>
            </view>
          </view>
        </view>

        <view v-if="showAnswer" class="listening-order__answer">
          <text class="listening-order__answer-title">参考顺序</text>
          <text class="listening-order__answer-text">{{ answerText }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ListeningOrderQuestion, RenderMode } from '/types'
import AudioPlayer from './AudioPlayer.vue'
import RichTextRenderer from './RichTextRenderer.vue'

const ORDER_ANSWER_KEY = '__listening_order__'

const props = withDefaults(defineProps<{
  data: ListeningOrderQuestion
  mode?: RenderMode
  answers?: Record<string, string | string[]>
  showAnswer?: boolean
}>(), {
  mode: 'preview',
  answers: () => ({}),
  showAnswer: false
})

const emit = defineEmits<{
  (e: 'select', key: string, value: string[]): void
}>()

const itemMap = computed(() => {
  const map = new Map<string, ListeningOrderQuestion['items'][number]>()
  for (const item of (props.data.items || [])) {
    map.set(String(item.id), item)
  }
  return map
})

const orderedIds = computed<string[]>(() => {
  const fallback = (props.data.items || []).map((item) => String(item.id))
  const raw = props.answers?.[ORDER_ANSWER_KEY]
  if (!Array.isArray(raw)) return fallback

  const known = new Set(fallback)
  const normalized = raw
    .map((id) => String(id || ''))
    .filter((id) => known.has(id))

  if (normalized.length !== fallback.length) return fallback
  return normalized
})

const orderedItems = computed(() => {
  return orderedIds.value
    .map((id) => itemMap.value.get(id))
    .filter(Boolean) as ListeningOrderQuestion['items']
})

const answerText = computed(() => {
  return (props.data.answer || [])
    .map((id, index) => {
      const text = getPlainText(itemMap.value.get(String(id))?.content)
      return `${index + 1}. ${text || String(id)}`
    })
    .join('  ')
})

function getPlainText(richtext: unknown): string {
  if (!richtext || typeof richtext !== 'object') return ''
  const content = (richtext as { content?: Array<{ type?: string; text?: string }> }).content
  if (!Array.isArray(content)) return ''
  return content
    .map((node) => (node?.type === 'text' ? String(node.text || '') : ''))
    .join('')
    .trim()
}

function moveBy(index: number, offset: number) {
  if (props.mode === 'review') return
  const target = index + offset
  if (target < 0 || target >= orderedIds.value.length) return

  const next = [...orderedIds.value]
  const [moved] = next.splice(index, 1)
  if (!moved) return
  next.splice(target, 0, moved)
  emit('select', ORDER_ANSWER_KEY, next)
}
</script>

<style lang="scss" scoped>
.listening-order {
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
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  &__stem {
    font-size: $font-size-lg;
    color: $text-primary;
    font-weight: 500;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__answer {
    margin-top: $spacing-md;
    padding: $spacing-sm;
    border-radius: $border-radius-md;
    background: rgba(15, 23, 42, 0.04);
  }

  &__answer-title {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: $text-secondary;
    margin-bottom: 6px;
  }

  &__answer-text {
    display: block;
    font-size: 13px;
    color: $text-primary;
    line-height: 1.5;
  }
}

.order-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm;
  border-radius: $border-radius-md;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);

  &__index {
    width: 24px;
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 700;
    color: rgba(15, 23, 42, 0.72);
    text-align: center;
  }

  &__content {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: $text-primary;
  }

  &__actions {
    flex-shrink: 0;
    display: flex;
    gap: 6px;
  }

  &__btn {
    width: 52px;
    height: 30px;
    line-height: 28px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid rgba(15, 23, 42, 0.16);
    background: #fff;
    color: rgba(15, 23, 42, 0.82);
    font-size: 13px;
    font-weight: 700;
  }
}
</style>
