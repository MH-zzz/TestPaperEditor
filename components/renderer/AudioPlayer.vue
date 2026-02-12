<template>
  <view class="audio-player" v-if="src">
    <view class="audio-player__controls">
      <view
        class="audio-player__btn"
        :class="{ 'is-playing': isPlaying }"
        @click="togglePlay"
      >
        <text class="audio-player__icon">{{ isPlaying ? '⏸' : '▶' }}</text>
      </view>

      <view class="audio-player__progress">
        <view class="audio-player__progress-bar">
          <view
            class="audio-player__progress-fill"
            :style="{ width: progressPercent + '%' }"
          />
        </view>
        <view class="audio-player__time">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  src: string
  autoPlay?: boolean
}>(), {
  autoPlay: false
})

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'ended'): void
  (e: 'timeupdate', time: number): void
}>()

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

let audioContext: UniApp.InnerAudioContext | null = null

const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 初始化音频
function initAudio() {
  if (!props.src) return

  // 销毁旧的
  if (audioContext) {
    audioContext.destroy()
  }

  audioContext = uni.createInnerAudioContext()
  audioContext.src = props.src

  audioContext.onCanplay(() => {
    duration.value = audioContext?.duration || 0
  })

  audioContext.onTimeUpdate(() => {
    currentTime.value = audioContext?.currentTime || 0
    emit('timeupdate', currentTime.value)
  })

  audioContext.onPlay(() => {
    isPlaying.value = true
    emit('play')
  })

  audioContext.onPause(() => {
    isPlaying.value = false
    emit('pause')
  })

  audioContext.onEnded(() => {
    isPlaying.value = false
    currentTime.value = 0
    emit('ended')
  })

  audioContext.onError((err) => {
    console.error('Audio error:', err)
    isPlaying.value = false
  })

  // 自动播放
  if (props.autoPlay) {
    setTimeout(() => {
      audioContext?.play()
    }, 100)
  }
}

// 播放/暂停
function togglePlay() {
  if (!audioContext) return

  if (isPlaying.value) {
    audioContext.pause()
  } else {
    audioContext.play()
  }
}

// 监听 src 变化
watch(() => props.src, () => {
  initAudio()
})

onMounted(() => {
  initAudio()
})

onUnmounted(() => {
  if (audioContext) {
    audioContext.destroy()
    audioContext = null
  }
})
</script>

<style lang="scss" scoped>
.audio-player {
  display: flex;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background-color: #f5f5f5;
  border-radius: $border-radius-md;

  &__controls {
    display: flex;
    align-items: center;
    width: 100%;
    gap: $spacing-md;
  }

  &__btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: $primary-color;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;

    &.is-playing {
      background-color: $warning-color;
    }
  }

  &__icon {
    color: white;
    font-size: 16px;
  }

  &__progress {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__progress-bar {
    height: 6px;
    background-color: #ddd;
    border-radius: 3px;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background-color: $primary-color;
    transition: width 0.1s linear;
  }

  &__time {
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  &__placeholder {
    font-size: $font-size-sm;
  }
}
</style>
