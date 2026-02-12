<template>
  <view class="step-preview">
    <!-- 题型介绍步骤 -->
    <template v-if="step.type === 'introduction'">
      <view class="preview-introduction">
        <view class="preview-introduction__title">{{ step.title }}</view>
        <view class="preview-introduction__desc">{{ step.description }}</view>
        <view v-if="step.gifImage" class="preview-introduction__gif">
          <image :src="step.gifImage" mode="aspectFit" />
        </view>
      </view>
    </template>

    <!-- 显示内容步骤 -->
    <template v-else-if="step.type === 'display-content'">
      <view class="preview-content">
        <view v-if="step.label" class="preview-content__label">{{ step.label }}</view>
        <view class="preview-content__body">
          <RichTextRenderer :content="step.content" />
        </view>
        <view v-if="step.image" class="preview-content__image">
          <image :src="step.image" mode="aspectFit" />
        </view>
      </view>
    </template>

    <!-- 播放音频步骤 -->
    <template v-else-if="step.type === 'play-audio'">
      <view class="preview-audio">
        <view class="preview-audio__icon">🔊</view>
        <view v-if="step.label" class="preview-audio__label">{{ step.label }}</view>
        <view v-if="step.showPlayCount && step.playCount > 1" class="preview-audio__count">
          共 {{ step.playCount }} 遍播放
        </view>
      </view>
    </template>

    <!-- 倒计时步骤 -->
    <template v-else-if="step.type === 'countdown'">
      <view class="preview-countdown">
        <view class="preview-countdown__icon">⏱</view>
        <view class="preview-countdown__label">{{ step.label }}</view>
        <view class="preview-countdown__duration">{{ step.duration }} 秒</view>
      </view>
    </template>

    <!-- 录音步骤 -->
    <template v-else-if="step.type === 'record'">
      <view class="preview-record">
        <view class="preview-record__icon">🎤</view>
        <view class="preview-record__label">录音作答</view>
        <view class="preview-record__duration">{{ step.duration }} 秒</view>
      </view>
    </template>

    <!-- 填空步骤 -->
    <template v-else-if="step.type === 'fill-blank'">
      <view class="preview-fill">
        <view class="preview-fill__list">
          <view v-for="(blank, index) in step.blanks" :key="blank.id" class="preview-fill__item">
            <text class="fill-number">{{ index + 1 }}.</text>
            <input class="fill-input" placeholder="请输入答案" />
          </view>
        </view>
        <view class="preview-fill__timer">
          剩余时间：{{ formatDuration(step.duration) }}
        </view>
      </view>
    </template>

    <!-- 小题循环步骤（不应该直接预览，只在展开后显示） -->
    <template v-else-if="step.type === 'loop-sub-questions'">
      <view class="preview-loop">
        <view class="preview-loop__icon">🔄</view>
        <view class="preview-loop__text">小题循环</view>
        <view class="preview-loop__desc">
          此步骤包含 {{ step.stepsPerQuestion.length }} 个子步骤，
          对每个小题重复执行
        </view>
      </view>
    </template>

    <!-- 未知步骤类型 -->
    <template v-else>
      <view class="preview-unknown">
        <text>未知步骤类型: {{ step.type }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import type { SpeakingStepsStep } from '/types'
import RichTextRenderer from '../../renderer/RichTextRenderer.vue'

const props = defineProps<{
  step: SpeakingStepsStep
  mode: 'preview' | 'exam'
}>()

// 格式化时长
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.step-preview {
  min-height: 200px;
}

// 题型介绍
.preview-introduction {
  text-align: center;
  padding: $spacing-lg;

  &__title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: $spacing-md;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
  }

  &__gif {
    margin-top: $spacing-md;

    image {
      width: 100%;
      max-height: 150px;
    }
  }
}

// 显示内容
.preview-content {
  &__label {
    font-size: $font-size-xs;
    color: $text-hint;
    margin-bottom: $spacing-xs;
  }

  &__body {
    font-size: $font-size-sm;
    line-height: 1.8;
  }

  &__image {
    margin-top: $spacing-md;

    image {
      width: 100%;
      border-radius: $border-radius-sm;
    }
  }
}

// 播放音频
.preview-audio {
  text-align: center;
  padding: $spacing-lg;

  &__icon {
    font-size: 48px;
    margin-bottom: $spacing-sm;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
    margin-bottom: $spacing-xs;
  }

  &__count {
    font-size: $font-size-xs;
    color: $text-hint;
  }
}

// 倒计时
.preview-countdown {
  text-align: center;
  padding: $spacing-lg;

  &__icon {
    font-size: 48px;
    margin-bottom: $spacing-sm;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
    margin-bottom: $spacing-xs;
  }

  &__duration {
    font-size: $font-size-sm;
    color: $text-hint;
  }
}

// 录音
.preview-record {
  text-align: center;
  padding: $spacing-lg;

  &__icon {
    font-size: 48px;
    margin-bottom: $spacing-sm;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
    margin-bottom: $spacing-xs;
  }

  &__duration {
    font-size: $font-size-sm;
    color: $text-hint;
  }
}

// 填空
.preview-fill {
  padding: $spacing-md;

  &__list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__timer {
    text-align: center;
    font-size: $font-size-sm;
    color: $text-secondary;
  }
}

.fill-number {
  font-size: $font-size-sm;
  color: $text-secondary;
  width: 24px;
}

.fill-input {
  flex: 1;
  padding: $spacing-sm;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
}

// 小题循环
.preview-loop {
  text-align: center;
  padding: $spacing-lg;

  &__icon {
    font-size: 48px;
    margin-bottom: $spacing-sm;
  }

  &__text {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: $spacing-sm;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-secondary;
  }
}

// 未知类型
.preview-unknown {
  text-align: center;
  padding: $spacing-lg;
  color: $text-hint;
}
</style>
