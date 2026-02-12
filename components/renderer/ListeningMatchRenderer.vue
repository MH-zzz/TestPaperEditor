<template>
  <view class="listening-match">
    <scroll-view scroll-y class="listening-match__scroll">
      <view class="listening-match__inner">
        <!-- 头部（题干 + 音频） -->
        <view class="listening-match__header">
          <AudioPlayer
            v-if="data.audio?.url && data.audio?.position === 'above'"
            :src="data.audio.url"
            :auto-play="mode === 'exam'"
            class="header-audio"
          />
          <view class="listening-match__stem">
            <RichTextRenderer :content="data.stem" placeholder="请输入题干" />
          </view>
          <AudioPlayer
            v-if="data.audio?.url && data.audio?.position === 'below'"
            :src="data.audio.url"
            :auto-play="mode === 'exam'"
            class="header-audio"
          />
        </view>

        <!-- 连线区域：双列独立布局 -->
        <view class="match-container" id="match-container">
          <!-- 左侧列 -->
          <view class="match-column left-column">
            <view
              v-for="item in data.leftItems"
              :key="item.id"
              class="match-item"
              :class="{ active: activeLeft === item.id, connected: isLeftConnected(item.id) }"
              :id="`left-${item.id}`"
              @click="onLeftClick(item.id)"
            >
              <view class="match-content">
                <RichTextRenderer :content="item.content" />
              </view>
              <view class="match-dot left"></view>
            </view>
          </view>

          <!-- 中间连线区 -->
          <view class="match-spacer">
            <svg class="lines-layer" width="100%" height="100%">
              <path
                v-for="line in renderLines"
                :key="line.id"
                :d="line.d"
                fill="none"
                stroke="#2196f3"
                stroke-width="2"
                class="match-line"
              />
            </svg>
          </view>

          <!-- 右侧列 -->
          <view class="match-column right-column">
            <view
              v-for="item in data.rightItems"
              :key="item.id"
              class="match-item"
              :class="{ active: activeRight === item.id, connected: isRightConnected(item.id) }"
              :id="`right-${item.id}`"
              @click="onRightClick(item.id)"
            >
              <view class="match-dot right"></view>
              <view class="match-content">
                <RichTextRenderer :content="item.content" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, getCurrentInstance } from 'vue'
import type { ListeningMatchQuestion, RenderMode } from '/types'
import RichTextRenderer from './RichTextRenderer.vue'
import AudioPlayer from './AudioPlayer.vue'

const props = withDefaults(defineProps<{
  data: ListeningMatchQuestion
  mode?: RenderMode
  answers?: Record<string, string | string[]> // 支持一对多：值为字符串数组
  showAnswer?: boolean
}>(), {
  mode: 'preview',
  answers: () => ({}),
  showAnswer: false
})

const emit = defineEmits<{
  (e: 'select', leftId: string, rightId: string): void
}>()

const instance = getCurrentInstance()
const activeLeft = ref<string | null>(null)
const activeRight = ref<string | null>(null)
const itemPositions = ref<Record<string, { x: number, y: number }>>({})
const spacerRect = ref<{ left: number, top: number, width: number, height: number }>({ left: 0, top: 0, width: 0, height: 0 })

// 连线数据
const currentPairs = computed(() => {
  if (props.showAnswer) {
    return props.data.answers
  }
  const pairs: { left: string, right: string }[] = []
  Object.entries(props.answers).forEach(([left, right]) => {
    if (Array.isArray(right)) {
      right.forEach(r => pairs.push({ left, right: r }))
    } else if (right) {
      pairs.push({ left, right: String(right) })
    }
  })
  return pairs
})

// 计算渲染线段 (贝塞尔曲线，相对于 spacer)
const renderLines = computed(() => {
  const lines: any[] = []
  const sw = spacerRect.value.width || 100
  currentPairs.value.forEach(pair => {
    const startY = itemPositions.value[`left-${pair.left}`]?.y
    const endY = itemPositions.value[`right-${pair.right}`]?.y
    if (startY !== undefined && endY !== undefined) {
      const offset = sw * 0.3
      const d = `M 0 ${startY} C ${offset} ${startY}, ${sw - offset} ${endY}, ${sw} ${endY}`
      lines.push({
        id: `${pair.left}-${pair.right}`,
        d
      })
    }
  })
  return lines
})

function isLeftConnected(id: string) {
  return currentPairs.value.some(p => p.left === id)
}

function isRightConnected(id: string) {
  return currentPairs.value.some(p => p.right === id)
}

function onLeftClick(id: string) {
  if (props.mode === 'review') return
  if (activeLeft.value === id) {
    activeLeft.value = null
    return
  }

  if (activeRight.value) {
    emit('select', id, activeRight.value)
    activeLeft.value = null
    activeRight.value = null
    return
  }

  activeLeft.value = id
  activeRight.value = null
}

function onRightClick(rightId: string) {
  if (props.mode === 'review') return
  if (activeRight.value === rightId) {
    activeRight.value = null
    return
  }

  if (activeLeft.value) {
    emit('select', activeLeft.value, rightId)
    activeLeft.value = null
    activeRight.value = null
    return
  }

  activeRight.value = rightId
  activeLeft.value = null
}

function updatePositions() {
  const query = uni.createSelectorQuery().in(instance)

  // 获取 spacer 区域的位置和尺寸
  query.select('.match-spacer').boundingClientRect(res => {
    if (res) {
      spacerRect.value = {
        left: res.left || 0,
        top: res.top || 0,
        width: res.width || 100,
        height: res.height || 200
      }
    }
  }).exec()

  setTimeout(() => {
    props.data.leftItems.forEach(item => getDotPos(`left-${item.id}`))
    props.data.rightItems.forEach(item => getDotPos(`right-${item.id}`))
  }, 100)
}

function getDotPos(itemId: string) {
  const query = uni.createSelectorQuery().in(instance)
  query.select(`#${itemId} .match-dot`).boundingClientRect(rect => {
    if (rect) {
      // 只需要 Y 坐标（相对于 spacer 顶部）
      itemPositions.value[itemId] = {
        x: 0, // 不再需要 x
        y: (rect.top || 0) - spacerRect.value.top + (rect.height || 0) / 2
      }
    }
  }).exec()
}

watch(() => props.data, () => {
  nextTick(() => setTimeout(updatePositions, 200))
}, { deep: true })

onMounted(() => {
  setTimeout(updatePositions, 500)
})
</script>

<style lang="scss" scoped>
.listening-match {
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
    margin-bottom: $spacing-lg;
    
    .header-audio {
      width: 100%;
    }
  }

  &__stem {
    font-size: $font-size-lg;
    font-weight: 500;
    line-height: 1.6;
    color: $text-primary;
  }
}

.match-container {
  display: flex;
  align-items: stretch; // 确保 spacer 高度与最高列一致
  min-height: 200px;
}

.match-column {
  width: 38%;
  display: flex;
  flex-direction: column;
  justify-content: center; // 垂直居中，少的那边会自动居中
  gap: 16px;
}

.match-spacer {
  width: 24%;
  position: relative;
  min-height: 100%;
  align-self: stretch;

  .lines-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
}

.match-item {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 8px 12px;
  min-height: 48px;
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  box-sizing: border-box;

  &:hover {
    background-color: #e0e0e0;
  }

  &.connected {
    border-color: $success-color;
    background-color: $success-light;
  }

  &.active {
    border-color: $primary-color;
    background-color: #e3f2fd;
  }
}

.match-content {
  font-size: 14px;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;

  :deep(.rich-text-renderer) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  :deep(.rich-text-image) {
    max-width: 100%;
    width: auto;
    height: auto;
    max-height: 80px;
    margin: 0;
    object-fit: contain;
  }
}

.match-dot {
  width: 10px;
  height: 10px;
  background-color: #999;
  border-radius: 50%;
  flex-shrink: 0;

  &.left {
    margin-left: 8px;
  }

  &.right {
    margin-right: 8px;
  }

  .active & {
    background-color: $primary-color;
  }

  .connected & {
    background-color: $success-color;
  }
}

.match-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 0.5s ease-out forwards;
}

@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
