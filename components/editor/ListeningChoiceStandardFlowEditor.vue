<template>
  <view class="lc-standard-flow">
    <view class="section">
      <view class="section__title">说明页</view>

      <view class="form-item">
        <text class="form-item__label">显示标题</text>
        <view class="toggle" :class="{ active: introShowTitle }" @click="toggleIntroShowTitle">
          {{ introShowTitle ? '是' : '否' }}
        </view>
      </view>

      <view class="form-item">
        <text class="form-item__label">说明页倒计时显示标题</text>
        <view class="toggle" :class="{ active: introCountdownShowTitle }" @click="toggleIntroCountdownShowTitle">
          {{ introCountdownShowTitle ? '是' : '否' }}
        </view>
      </view>

      <view class="hint">
        说明页倒计时是否出现，由题目「准备倒计时(秒)」决定。
      </view>
    </view>

      <view class="section">
      <view class="section__header">
        <text class="section__title">每段流程</text>
        <FlowStepQuickAdd
          class-name="quick-actions"
          :items="quickAddItems"
          @add="addStep"
        />
      </view>

      <view v-if="perGroupSteps.length === 0" class="empty-tip">暂无步骤</view>

      <view
        v-for="(step, sIndex) in perGroupSteps"
        :key="`${step.kind}_${sIndex}`"
        class="step-card"
        :class="{ 'step-card--expanded': expandedIndex === sIndex }"
      >
          <view class="step-card__header" @click="toggleExpand(sIndex)">
            <view class="step-card__header-left">
              <text class="step-card__chev">{{ expandedIndex === sIndex ? '▾' : '▸' }}</text>
            <text class="step-card__title">{{ sIndex + 1 }}. {{ stepKindLabel(step) }}</text>
            <text v-if="stepSummary(step)" class="step-card__summary">{{ stepSummary(step) }}</text>
          </view>

          <view class="step-card__ops">
            <button class="btn btn-text btn-xs" :disabled="sIndex === 0" @click.stop="moveStep(sIndex, -1)">上移</button>
            <button class="btn btn-text btn-xs" :disabled="sIndex === perGroupSteps.length - 1" @click.stop="moveStep(sIndex, 1)">下移</button>
            <button class="btn btn-text btn-xs danger" @click.stop="removeStep(sIndex)">删除</button>
          </view>
        </view>

        <view v-show="expandedIndex === sIndex" class="step-card__body">
          <view class="form-item">
            <text class="form-item__label">显示标题</text>
            <view class="toggle" :class="{ active: getBool(step, 'showTitle', true) }" @click="toggleStepBoolWithDefault(sIndex, 'showTitle', true)">
              {{ getBool(step, 'showTitle', true) ? '是' : '否' }}
            </view>
          </view>

          <view v-if="step.kind === 'playAudio'" class="form-item">
            <text class="form-item__label">音频来源</text>
            <view class="mode-toggle">
              <view class="mode-btn" :class="{ active: getAudioSource(step) === 'description' }" @click="updateStep(sIndex, { audioSource: 'description' })">描述音频</view>
              <view class="mode-btn" :class="{ active: getAudioSource(step) === 'content' }" @click="updateStep(sIndex, { audioSource: 'content' })">正文音频</view>
            </view>
          </view>

          <view v-if="step.kind === 'countdown'" class="form-item">
            <view class="grid">
              <view>
                <text class="form-item__label">秒数</text>
                <input
                  class="text-input"
                  type="number"
                  :value="countdownSeconds(step)"
                  @input="(e) => updateStep(sIndex, { seconds: toInt(e.detail.value) })"
                />
              </view>
              <view>
                <text class="form-item__label">标签</text>
                <input
                  class="text-input"
                  :value="countdownLabel(step)"
                  @input="(e) => updateStep(sIndex, { label: e.detail.value })"
                />
              </view>
            </view>

            <view class="form-item">
              <text class="form-item__label">提示</text>
              <text class="form-tip-inline">倒计时结束不再内置提示音；需要提示音请插入「提示音」步骤。</text>
            </view>
          </view>

          <view v-if="step.kind === 'promptTone'" class="form-item">
            <text class="form-item__label">提示音 URL</text>
            <input
              class="text-input"
              :value="promptToneUrl(step)"
              @input="(e) => updateStep(sIndex, { url: e.detail.value })"
            />
          </view>

          <view v-if="step.kind === 'answerChoice'" class="form-item">
            <view class="grid">
              <view>
                <text class="form-item__label">显示题目标题</text>
                <view class="toggle" :class="{ active: getBool(step, 'showQuestionTitle', true) }" @click="toggleStepBoolWithDefault(sIndex, 'showQuestionTitle', true)">
                  {{ getBool(step, 'showQuestionTitle', true) ? '是' : '否' }}
                </view>
              </view>
              <view>
                <text class="form-item__label">显示标题补充</text>
                <view class="toggle" :class="{ active: getBool(step, 'showQuestionTitleDescription', true) }" @click="toggleStepBoolWithDefault(sIndex, 'showQuestionTitleDescription', true)">
                  {{ getBool(step, 'showQuestionTitleDescription', true) ? '是' : '否' }}
                </view>
              </view>
            </view>

            <view class="form-item">
              <text class="form-item__label">显示题组描述</text>
              <view class="toggle" :class="{ active: getBool(step, 'showGroupPrompt', true) }" @click="toggleStepBoolWithDefault(sIndex, 'showGroupPrompt', true)">
                {{ getBool(step, 'showGroupPrompt', true) ? '是' : '否' }}
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="hint hint--bottom">
        修改后，所有绑定到标准流程的听后选择题会在下次加载时自动跟随最新标准。
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import FlowStepQuickAdd from './FlowStepQuickAdd.vue'
import type { ListeningChoiceStandardFlowModuleV1, ListeningChoiceStandardPerGroupStepDef } from '../../flows/listeningChoiceFlowModules'

const props = defineProps<{
  modelValue: ListeningChoiceStandardFlowModuleV1
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ListeningChoiceStandardFlowModuleV1): void
}>()

const expandedIndex = ref<number | null>(0)

const perGroupSteps = computed<ListeningChoiceStandardPerGroupStepDef[]>(() => {
  return props.modelValue?.perGroupSteps || []
})

const introShowTitle = computed(() => props.modelValue?.introShowTitle !== false)
const introCountdownShowTitle = computed(() => props.modelValue?.introCountdownShowTitle !== false)
const quickAddItems = [
  { key: 'playAudioDescription', label: '描述音频' },
  { key: 'playAudioContent', label: '正文音频' },
  { key: 'countdown', label: '倒计时' },
  { key: 'promptTone', label: '提示音' },
  { key: 'answerChoice', label: '开始答题' }
]

function update(next: ListeningChoiceStandardFlowModuleV1) {
  emit('update:modelValue', next)
}

function kindLabel(kind: string) {
  const map: Record<string, string> = {
    playAudio: '播放正文音频',
    countdown: '倒计时',
    promptTone: '提示音',
    answerChoice: '开始答题'
  }
  return map[kind] || kind
}

function getAudioSource(step: ListeningChoiceStandardPerGroupStepDef): 'description' | 'content' {
  if (step.kind !== 'playAudio') return 'content'
  return step?.audioSource === 'description' ? 'description' : 'content'
}

function stepKindLabel(step: ListeningChoiceStandardPerGroupStepDef): string {
  if (step?.kind === 'playAudio') return getAudioSource(step) === 'description' ? '播放描述音频' : '播放正文音频'
  return kindLabel(String(step?.kind || ''))
}

function stepSummary(step: ListeningChoiceStandardPerGroupStepDef): string {
  if (!step) return ''
  if (step.kind === 'countdown') return `${kindLabel('countdown')} ${Number(step.seconds || 0)}s`
  if (step.kind === 'promptTone') return '提示音'
  if (step.kind === 'answerChoice') return kindLabel('answerChoice')
  return ''
}

function countdownSeconds(step: ListeningChoiceStandardPerGroupStepDef): number {
  if (step.kind !== 'countdown') return 0
  return Math.max(0, toInt(step.seconds))
}

function countdownLabel(step: ListeningChoiceStandardPerGroupStepDef): string {
  if (step.kind !== 'countdown') return ''
  return String(step.label || '')
}

function promptToneUrl(step: ListeningChoiceStandardPerGroupStepDef): string {
  if (step.kind !== 'promptTone') return '/static/audio/small_time.mp3'
  const next = String(step.url || '').trim()
  return next || '/static/audio/small_time.mp3'
}

function toggleExpand(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function toggleIntroShowTitle() {
  update({ ...props.modelValue, introShowTitle: !introShowTitle.value })
}

function toggleIntroCountdownShowTitle() {
  update({ ...props.modelValue, introCountdownShowTitle: !introCountdownShowTitle.value })
}

function removeStep(index: number) {
  const next = perGroupSteps.value.filter((_, i) => i !== index)
  update({ ...props.modelValue, perGroupSteps: next })
}

function moveStep(index: number, delta: number) {
  const list = [...perGroupSteps.value]
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
  update({ ...props.modelValue, perGroupSteps: list })
}

function updateStep(index: number, patch: Record<string, unknown>) {
  const list = [...perGroupSteps.value]
  const current = list[index]
  if (!current) return
  list[index] = { ...current, ...patch } as ListeningChoiceStandardPerGroupStepDef
  update({ ...props.modelValue, perGroupSteps: list })
}

function getStepField(step: ListeningChoiceStandardPerGroupStepDef | undefined, key: string): unknown {
  if (!step) return undefined
  const record = step as unknown as Record<string, unknown>
  return record[key]
}

function getBool(step: ListeningChoiceStandardPerGroupStepDef | undefined, key: string, defaultValue: boolean) {
  const v = getStepField(step, key)
  if (typeof v === 'boolean') return v
  return defaultValue
}

function toggleStepBoolWithDefault(index: number, key: string, defaultValue: boolean) {
  const step = perGroupSteps.value[index]
  const current = getBool(step, key, defaultValue)
  updateStep(index, { [key]: !current })
}

function createPlayAudioStep(audioSource: 'description' | 'content'): ListeningChoiceStandardPerGroupStepDef {
  return { kind: 'playAudio', showTitle: true, audioSource, showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true }
}

function createCountdownStep(): ListeningChoiceStandardPerGroupStepDef {
  return { kind: 'countdown', showTitle: true, seconds: 3, label: '准备' }
}

function createPromptToneStep(): ListeningChoiceStandardPerGroupStepDef {
  return { kind: 'promptTone', showTitle: true, url: '/static/audio/small_time.mp3' }
}

function createAnswerChoiceStep(): ListeningChoiceStandardPerGroupStepDef {
  return { kind: 'answerChoice', showTitle: true, showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true }
}

function addStep(kind: string) {
  const list = [...perGroupSteps.value]
  if (kind === 'playAudioDescription') {
    list.push(createPlayAudioStep('description'))
  } else if (kind === 'playAudioContent' || kind === 'playAudio') {
    list.push(createPlayAudioStep('content'))
  } else if (kind === 'countdown') {
    list.push(createCountdownStep())
  } else if (kind === 'promptTone') {
    list.push(createPromptToneStep())
  } else if (kind === 'answerChoice') {
    list.push(createAnswerChoiceStep())
  }
  update({ ...props.modelValue, perGroupSteps: list })
  expandedIndex.value = list.length - 1
}

function toInt(v: unknown): number {
  const n = parseInt(String(v || '0'), 10)
  return Number.isFinite(n) ? n : 0
}
</script>

<style lang="scss" scoped>
.lc-standard-flow {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  overflow: hidden;
}

.section__header {
  padding: 12px 12px 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #fff, rgba(255, 255, 255, 0.92));
}

.section__title {
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  color: $text-primary;
}

.section__header .section__title {
  padding: 0;
}

.quick-actions {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.empty-tip {
  padding: 12px;
  color: $text-hint;
  font-size: 12px;
}

.hint {
  padding: 0 12px 12px;
  color: rgba(15, 23, 42, 0.55);
  font-size: 12px;
  line-height: 1.45;
}

.hint--bottom {
  padding-top: 8px;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  gap: 10px;
}

.form-item__label {
  color: rgba(15, 23, 42, 0.85);
  font-size: 13px;
  font-weight: 600;
}

.form-tip-inline {
  color: rgba(15, 23, 42, 0.58);
  font-size: 12px;
  line-height: 1.45;
}

.grid {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.text-input {
  width: 100%;
  height: 34px;
  border-radius: 10px;
  padding: 0 10px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: #fff;
  box-sizing: border-box;
}

.toggle {
  min-width: 54px;
  text-align: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.90);
  color: rgba(15, 23, 42, 0.7);
  font-size: 12px;
  font-weight: 700;
  user-select: none;
}

.toggle.active {
  border-color: rgba(33, 150, 243, 0.30);
  background: rgba(33, 150, 243, 0.10);
  color: rgba(33, 150, 243, 1);
}

.mode-toggle {
  min-width: 170px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-btn {
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: rgba(15, 23, 42, 0.68);
  font-size: 12px;
  font-weight: 700;
}

.mode-btn.active {
  border-color: rgba(33, 150, 243, 0.30);
  background: rgba(33, 150, 243, 0.10);
  color: rgba(33, 150, 243, 1);
}

.step-card {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.step-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(248, 250, 252, 0.85);
}

.step-card__header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.step-card__chev {
  width: 14px;
  flex-shrink: 0;
  color: rgba(15, 23, 42, 0.55);
}

.step-card__title {
  font-size: 13px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-card__summary {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-card__ops {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-card__body {
  padding: 6px 0 0;
  background: #fff;
}
</style>
