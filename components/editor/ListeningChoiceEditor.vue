<template>
  <view class="lc-editor" :class="{ 'lc-editor--template': templateMode }">
    <!-- Content: Intro -->
    <view class="editor-section">
      <view class="form-item">
        <text class="form-item__label">题目标题（必填）</text>
        <input
          class="text-input"
          :value="modelValue.content.intro.title || ''"
          placeholder="例如：听后选择"
          @input="(e) => updateIntroTitle(e.detail.value)"
        />
      </view>

      <view class="form-item">
        <text class="form-item__label">题目标题补充（可选）</text>
        <input
          class="text-input"
          :value="modelValue.content.intro.title_description || ''"
          placeholder="例如：(共9分,每小题1.5分)"
          @input="(e) => updateIntroTitleDescription(e.detail.value)"
        />
      </view>

      <view class="form-item">
        <text class="form-item__label">说明文字</text>
        <RichTextEditor
          :model-value="modelValue.content.intro.text"
          @update:model-value="updateIntroText"
          placeholder="请输入说明文字"
        />
      </view>

      <view class="form-item">
        <text class="form-item__label">说明音频 URL (可选)</text>
        <view class="row">
          <input
            class="text-input"
            :value="modelValue.content.intro.audio?.url || ''"
            placeholder="https://..."
            @input="(e) => updateIntroAudioUrl(e.detail.value)"
          />
          <button class="btn btn-outline btn-sm" @click="setIntroDemoAudio">示例</button>
        </view>
      </view>
    </view>

    <!-- Content: Groups -->
    <view class="editor-section">
      <view class="section-title">
        <text>{{ templateMode ? '题组' : '内容: 题组 (Groups)' }}</text>
        <view class="section-actions">
          <button class="btn btn-outline btn-xs" @click="collapseAllGroups">全部收起</button>
          <button class="btn btn-outline btn-xs" @click="expandAllGroups">全部展开</button>
          <button class="btn btn-text" @click="addGroup">+ 添加题组</button>
        </view>
      </view>

      <view v-if="modelValue.content.groups.length === 0" class="empty-tip">暂无题组，请先添加</view>

      <view v-for="(g, gIndex) in modelValue.content.groups" :key="g.id" class="card">
        <view class="card__header">
          <view class="card__header-left" @click="toggleGroup(g.id)">
            <text class="card__chev">{{ isGroupExpanded(g.id) ? '▾' : '▸' }}</text>
            <text class="card__title">题组 {{ gIndex + 1 }}</text>
            <text v-if="g.title" class="card__subtitle">{{ g.title }}</text>
          </view>
          <button class="btn btn-text danger" @click.stop="removeGroup(gIndex)">删除题组</button>
        </view>

        <view v-show="isGroupExpanded(g.id)" class="card__body">
        <view class="form-item">
          <text class="form-item__label">题组标题</text>
          <input
            class="text-input"
            :value="g.title || ''"
            placeholder="例如：第一题组对话"
            @input="(e) => updateGroupTitle(gIndex, e.detail.value)"
          />
        </view>

        <view class="form-item">
          <text class="form-item__label">题组描述文案</text>
          <RichTextEditor
            :model-value="g.prompt || createEmptyRichText()"
            @update:model-value="(val) => updateGroupPrompt(gIndex, val)"
            placeholder="例如：请听一段对话，完成第1至第2小题。"
          />
        </view>

        <view class="form-item">
          <text class="form-item__label">题组描述音频 URL (可选)</text>
          <view class="row">
            <input
              class="text-input"
              :value="g.descriptionAudio?.url || ''"
              placeholder="https://..."
              @input="(e) => updateGroupDescriptionAudioUrl(gIndex, e.detail.value)"
            />
            <button class="btn btn-outline btn-sm" @click="setGroupDescriptionDemoAudio(gIndex)">示例</button>
          </view>
        </view>

        <view class="form-item">
          <text class="form-item__label">题组描述音频播放次数</text>
          <input
            class="text-input"
            type="number"
            :value="Number(g.descriptionAudio?.playCount ?? 1)"
            placeholder="例如：1"
            @input="(e) => updateGroupDescriptionAudioPlayCount(gIndex, e.detail.value)"
          />
        </view>

        <view class="form-item">
          <text class="form-item__label">题组正文音频 URL (可选)</text>
          <view class="row">
            <input
              class="text-input"
              :value="g.audio?.url || ''"
              placeholder="https://..."
              @input="(e) => updateGroupAudioUrl(gIndex, e.detail.value)"
            />
            <button class="btn btn-outline btn-sm" @click="setGroupDemoAudio(gIndex)">示例</button>
          </view>
        </view>

        <view class="form-item">
          <text class="form-item__label">题组正文音频播放次数</text>
          <input
            class="text-input"
            type="number"
            :value="Number(g.audio?.playCount ?? 2)"
            placeholder="例如：2"
            @input="(e) => updateGroupAudioPlayCount(gIndex, e.detail.value)"
          />
        </view>

        <view class="form-item">
          <text class="form-item__label">题组准备时间（秒）</text>
          <input
            class="text-input"
            type="number"
            :value="Number(g.prepareSeconds ?? 3)"
            placeholder="例如：3"
            @input="(e) => updateGroupPrepareSeconds(gIndex, e.detail.value)"
          />
        </view>

        <view class="form-item">
          <text class="form-item__label">题组答题时间（秒，0=不限时）</text>
          <input
            class="text-input"
            type="number"
            :value="Number(g.answerSeconds ?? 0)"
            placeholder="例如：120"
            @input="(e) => updateGroupAnswerSeconds(gIndex, e.detail.value)"
          />
        </view>

        <view class="form-item">
          <view class="form-item__label-row">
            <text class="form-item__label">小题</text>
            <view class="form-item__label-actions">
              <button class="btn btn-outline btn-xs" @click="collapseGroupSubQuestions(gIndex)">全部收起</button>
              <button class="btn btn-outline btn-xs" @click="expandGroupSubQuestions(gIndex)">全部展开</button>
              <button class="btn btn-text" @click="addSubQuestion(gIndex)">+ 添加小题</button>
            </view>
          </view>

          <view v-if="(g.subQuestions || []).length === 0" class="empty-tip">暂无小题</view>

          <view v-for="(sq, sqIndex) in g.subQuestions" :key="sq.id" class="sub-card">
            <view class="sub-card__header" @click="toggleSubQuestion(sq.id)">
              <view class="sub-card__header-left">
                <text class="sub-card__chev">{{ isSubQuestionExpanded(sq.id) ? '▾' : '▸' }}</text>
                <text class="sub-card__title">第 {{ sq.order }} 题</text>
              </view>
              <button class="btn btn-text danger" @click.stop="removeSubQuestion(gIndex, sqIndex)">删除</button>
            </view>

            <view v-show="isSubQuestionExpanded(sq.id)" class="sub-card__body">
              <view class="form-item">
                <text class="form-item__label">题干</text>
                <RichTextEditor
                  :model-value="sq.stem"
                  @update:model-value="(val) => updateSubStem(gIndex, sqIndex, val)"
                  placeholder="请输入题干"
                />
              </view>

              <view class="form-item">
                <text class="form-item__label">选项</text>
                <view class="options">
                  <view v-for="(opt, optIndex) in sq.options" :key="optIndex" class="opt-row">
                    <input
                      class="opt-key"
                      :value="opt.key"
                      @input="(e) => updateOptionKey(gIndex, sqIndex, optIndex, e.detail.value)"
                    />
                    <RichTextEditor
                      class="opt-content"
                      :model-value="opt.content"
                      @update:model-value="(val) => updateOptionContent(gIndex, sqIndex, optIndex, val)"
                      placeholder="选项内容"
                      dense
                      min-height="32px"
                    />
                    <button
                      class="btn-icon"
                      v-if="sq.options.length > 2"
                      @click="removeOption(gIndex, sqIndex, optIndex)"
                    >×</button>
                  </view>
                  <button class="btn btn-outline btn-sm" v-if="sq.options.length < 10" @click="addOption(gIndex, sqIndex)">+ 添加选项</button>
                </view>
              </view>

              <view class="form-item">
                <view class="form-item__label-row">
                  <text class="form-item__label">正确答案</text>
                  <view class="mode-toggle">
                    <view
                      class="mode-btn"
                      :class="{ active: getSubMode(sq) === 'single' }"
                      @click="setSubMode(gIndex, sqIndex, 'single')"
                    >单选</view>
                    <view
                      class="mode-btn"
                      :class="{ active: getSubMode(sq) === 'multiple' }"
                      @click="setSubMode(gIndex, sqIndex, 'multiple')"
                    >多选</view>
                  </view>
                </view>
                <view class="answer-selector">
                  <view
                    v-for="opt in sq.options"
                    :key="opt.key"
                    class="answer-item"
                    :class="{ active: sq.answer.includes(opt.key) }"
                    @click="toggleAnswer(gIndex, sqIndex, opt.key)"
                  >
                    {{ opt.key }}
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ListeningChoiceQuestion, RichTextContent, SubQuestion } from '/types'
import { generateId, createEmptyRichText, createRichText } from '/templates'
import {
  resolveListeningChoiceQuestion
} from '../../engine/flow/listening-choice/binding.ts'
import RichTextEditor from './RichTextEditor.vue'

const props = withDefaults(defineProps<{
  modelValue: ListeningChoiceQuestion
  previewStepIndex?: number
  templateMode?: boolean
}>(), {
  templateMode: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ListeningChoiceQuestion): void
}>()

// null means "default: expanded (no user toggles yet)"
// [] means "all collapsed"
const expandedGroupIds = ref<string[] | null>(null)
const expandedSubQuestionIds = ref<string[] | null>(null)

function update(next: ListeningChoiceQuestion) {
  emit('update:modelValue', next)
}

function allSubQuestionIds() {
  const ids: string[] = []
  ;(props.modelValue.content.groups || []).forEach((g) => {
    ;(g.subQuestions || []).forEach((sq) => {
      if (sq?.id) ids.push(String(sq.id))
    })
  })
  return ids
}

function isSubQuestionExpanded(id: string) {
  if (expandedSubQuestionIds.value === null) return true
  return expandedSubQuestionIds.value.includes(id)
}

function toggleSubQuestion(id: string) {
  const list = expandedSubQuestionIds.value
  if (list === null) {
    expandedSubQuestionIds.value = allSubQuestionIds().filter(x => x !== id)
    return
  }
  if (list.includes(id)) expandedSubQuestionIds.value = list.filter(x => x !== id)
  else expandedSubQuestionIds.value = [...list, id]
}

function collapseGroupSubQuestions(gIndex: number) {
  const ids = ((props.modelValue.content.groups[gIndex]?.subQuestions || []).map(sq => String(sq.id)))
  if (expandedSubQuestionIds.value === null) {
    expandedSubQuestionIds.value = allSubQuestionIds().filter(id => !ids.includes(id))
    return
  }
  expandedSubQuestionIds.value = expandedSubQuestionIds.value.filter(id => !ids.includes(id))
}

function expandGroupSubQuestions(gIndex: number) {
  const ids = ((props.modelValue.content.groups[gIndex]?.subQuestions || []).map(sq => String(sq.id)))
  if (expandedSubQuestionIds.value === null) return
  expandedSubQuestionIds.value = Array.from(new Set([...expandedSubQuestionIds.value, ...ids]))
}

watch(() => props.modelValue.content.groups, () => {
  if (expandedSubQuestionIds.value === null) return
  const existing = new Set(allSubQuestionIds())
  expandedSubQuestionIds.value = expandedSubQuestionIds.value.filter(id => existing.has(id))
}, { deep: true })

function isGroupExpanded(id: string) {
  // default expanded if we haven't toggled anything yet
  if (expandedGroupIds.value === null) return true
  return expandedGroupIds.value.includes(id)
}

function toggleGroup(id: string) {
  const list = expandedGroupIds.value
  // first toggle converts "implicit all expanded" into explicit list
  if (list === null) {
    expandedGroupIds.value = props.modelValue.content.groups.map(g => g.id).filter(x => x !== id)
    return
  }
  if (list.includes(id)) expandedGroupIds.value = list.filter(x => x !== id)
  else expandedGroupIds.value = [...list, id]
}

function collapseAllGroups() {
  expandedGroupIds.value = []
}

function expandAllGroups() {
  expandedGroupIds.value = props.modelValue.content.groups.map(g => g.id)
}

function normalizeOrders(groups: ListeningChoiceQuestion['content']['groups']) {
  let counter = 1
  return groups.map((g) => ({
    ...g,
    subQuestions: (g.subQuestions || []).map((q) => ({ ...q, order: counter++ }))
  }))
}

function getSubMode(sq: any): 'single' | 'multiple' {
  return sq?.answerMode === 'multiple' ? 'multiple' : 'single'
}

function setSubMode(gIndex: number, sqIndex: number, mode: 'single' | 'multiple') {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const list = [...(g.subQuestions || [])]
  const q = list[sqIndex]
  const nextAnswer = mode === 'single' ? (q.answer || []).slice(0, 1) : [...(q.answer || [])]
  list[sqIndex] = { ...q, answerMode: mode, answer: nextAnswer.length ? nextAnswer : ['A'] }
  groups[gIndex] = { ...g, subQuestions: list }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateIntroText(text: RichTextContent) {
  update({
    ...props.modelValue,
    content: {
      ...props.modelValue.content,
      intro: { ...props.modelValue.content.intro, text }
    }
  })
}

function updateIntroTitle(title: string) {
  update({
    ...props.modelValue,
    content: {
      ...props.modelValue.content,
      intro: { ...props.modelValue.content.intro, title }
    }
  })
}

function updateIntroTitleDescription(title_description: string) {
  update({
    ...props.modelValue,
    content: {
      ...props.modelValue.content,
      intro: { ...props.modelValue.content.intro, title_description }
    }
  })
}

function updateIntroAudioUrl(url: string) {
  const audio = { ...(props.modelValue.content.intro.audio || { url: '', playCount: 1 }), url }
  update({ ...props.modelValue, content: { ...props.modelValue.content, intro: { ...props.modelValue.content.intro, audio } } })
}

function regenerateFlowStepsFromSource(question: ListeningChoiceQuestion): ListeningChoiceQuestion {
  return resolveListeningChoiceQuestion(question, { generateId })
}

function setIntroDemoAudio() {
  updateIntroAudioUrl('https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3')
  uni.showToast({ title: '已关联示例音频', icon: 'success' })
}

function addGroup() {
  const id = generateId()
  const groups = [
    ...props.modelValue.content.groups,
    {
      id,
      title: `第 ${props.modelValue.content.groups.length + 1} 题组`,
      prompt: createRichText('请听一段对话，完成若干小题。'),
      prepareSeconds: 3,
      answerSeconds: 0,
      descriptionAudio: { url: '', playCount: 1, note: '题组描述音频（可为空）' },
      audio: { url: '', playCount: 2 },
      subQuestions: []
    }
  ]
  if (expandedGroupIds.value !== null) {
    expandedGroupIds.value = Array.from(new Set([...expandedGroupIds.value, id]))
  }

  const next = regenerateFlowStepsFromSource({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
  update(next)
}

function removeGroup(index: number) {
  const removedSubQuestionIds = (props.modelValue.content.groups[index]?.subQuestions || []).map((sq) => String(sq.id))
  const removedId = props.modelValue.content.groups[index]?.id
  const groups = props.modelValue.content.groups.filter((_, i) => i !== index)
  if (removedId && expandedGroupIds.value !== null) {
    expandedGroupIds.value = expandedGroupIds.value.filter(x => x !== removedId)
  }
  if (expandedSubQuestionIds.value !== null && removedSubQuestionIds.length) {
    expandedSubQuestionIds.value = expandedSubQuestionIds.value.filter(id => !removedSubQuestionIds.includes(id))
  }

  const next = regenerateFlowStepsFromSource({
    ...props.modelValue,
    content: { ...props.modelValue.content, groups: normalizeOrders(groups) }
  })
  update(next)
}

function updateGroupTitle(gIndex: number, title: string) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  groups[gIndex] = { ...g, title }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateGroupPrompt(gIndex: number, prompt: RichTextContent) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  groups[gIndex] = { ...g, prompt }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateGroupPrepareSeconds(gIndex: number, rawValue: any) {
  const seconds = Math.max(0, toInt(rawValue))
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  groups[gIndex] = { ...g, prepareSeconds: seconds }
  const next = regenerateFlowStepsFromSource({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
  update(next)
}

function updateGroupAnswerSeconds(gIndex: number, rawValue: any) {
  const seconds = Math.max(0, toInt(rawValue))
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  groups[gIndex] = { ...g, answerSeconds: seconds }
  const next = regenerateFlowStepsFromSource({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
  update(next)
}

function updateGroupAudioUrl(gIndex: number, url: string) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const audio = { ...(g.audio || { url: '', playCount: 2 }), url }
  groups[gIndex] = { ...g, audio }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateGroupDescriptionAudioUrl(gIndex: number, url: string) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const descriptionAudio = { ...(g.descriptionAudio || { url: '', playCount: 1 }), url }
  groups[gIndex] = { ...g, descriptionAudio }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateGroupAudioPlayCount(gIndex: number, rawValue: any) {
  const playCount = Math.max(1, toInt(rawValue))
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const audio = { ...(g.audio || { url: '', playCount: 2 }), playCount }
  groups[gIndex] = { ...g, audio }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateGroupDescriptionAudioPlayCount(gIndex: number, rawValue: any) {
  const playCount = Math.max(1, toInt(rawValue))
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const descriptionAudio = { ...(g.descriptionAudio || { url: '', playCount: 1 }), playCount }
  groups[gIndex] = { ...g, descriptionAudio }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function setGroupDemoAudio(gIndex: number) {
  updateGroupAudioUrl(gIndex, 'https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3')
  uni.showToast({ title: '已关联示例音频', icon: 'success' })
}

function setGroupDescriptionDemoAudio(gIndex: number) {
  updateGroupDescriptionAudioUrl(gIndex, 'https://3eketang.oss-cn-beijing.aliyuncs.com/prog/xueke/audio/right.mp3')
  uni.showToast({ title: '已关联示例音频', icon: 'success' })
}

function addSubQuestion(gIndex: number) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const newQ: SubQuestion = {
    id: generateId(),
    order: 0,
    stem: createEmptyRichText(),
    options: [
      { key: 'A', content: createEmptyRichText() },
      { key: 'B', content: createEmptyRichText() },
      { key: 'C', content: createEmptyRichText() }
    ],
    answerMode: 'single',
    answer: ['A']
  }
  const nextG = { ...g, subQuestions: [...(g.subQuestions || []), newQ] }
  groups[gIndex] = nextG
  if (expandedSubQuestionIds.value !== null) {
    expandedSubQuestionIds.value = Array.from(new Set([...expandedSubQuestionIds.value, newQ.id]))
  }
  const next = regenerateFlowStepsFromSource({ ...props.modelValue, content: { ...props.modelValue.content, groups: normalizeOrders(groups) } })
  update(next)
}

function removeSubQuestion(gIndex: number, sqIndex: number) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const removedId = g.subQuestions?.[sqIndex]?.id
  const subQuestions = (g.subQuestions || []).filter((_, i) => i !== sqIndex)
  groups[gIndex] = { ...g, subQuestions }
  if (removedId && expandedSubQuestionIds.value !== null) {
    expandedSubQuestionIds.value = expandedSubQuestionIds.value.filter(id => id !== String(removedId))
  }
  const next = regenerateFlowStepsFromSource({ ...props.modelValue, content: { ...props.modelValue.content, groups: normalizeOrders(groups) } })
  update(next)
}

function updateSubStem(gIndex: number, sqIndex: number, stem: RichTextContent) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const list = [...(g.subQuestions || [])]
  list[sqIndex] = { ...list[sqIndex], stem }
  groups[gIndex] = { ...g, subQuestions: list }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateOptionKey(gIndex: number, sqIndex: number, optIndex: number, newKey: string) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const list = [...(g.subQuestions || [])]
  const q = list[sqIndex]
  const options = [...q.options]
  const oldKey = options[optIndex].key
  options[optIndex] = { ...options[optIndex], key: newKey }
  let answer = q.answer
  if (answer.includes(oldKey)) answer = answer.map(k => (k === oldKey ? newKey : k))
  list[sqIndex] = { ...q, options, answer }
  groups[gIndex] = { ...g, subQuestions: list }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function updateOptionContent(gIndex: number, sqIndex: number, optIndex: number, content: RichTextContent) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const list = [...(g.subQuestions || [])]
  const q = list[sqIndex]
  const options = [...q.options]
  options[optIndex] = { ...options[optIndex], content }
  list[sqIndex] = { ...q, options }
  groups[gIndex] = { ...g, subQuestions: list }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function addOption(gIndex: number, sqIndex: number) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const list = [...(g.subQuestions || [])]
  const q = list[sqIndex]
  const options = [...q.options]
  const nextKey = String.fromCharCode(65 + options.length)
  options.push({ key: nextKey, content: createEmptyRichText() })
  list[sqIndex] = { ...q, options }
  groups[gIndex] = { ...g, subQuestions: list }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function removeOption(gIndex: number, sqIndex: number, optIndex: number) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const list = [...(g.subQuestions || [])]
  const q = list[sqIndex]
  const deletedKey = q.options[optIndex].key
  const options = q.options.filter((_, i) => i !== optIndex)
  let answer = q.answer
  if (answer.includes(deletedKey)) {
    answer = answer.filter(k => k !== deletedKey)
    if (answer.length === 0 && options.length > 0) answer = [options[0].key]
  }
  list[sqIndex] = { ...q, options, answer }
  groups[gIndex] = { ...g, subQuestions: list }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function toggleAnswer(gIndex: number, sqIndex: number, key: string) {
  const groups = [...props.modelValue.content.groups]
  const g = groups[gIndex]
  const list = [...(g.subQuestions || [])]
  const q = list[sqIndex]
  const current = q.answer
  let next: string[] = []
  if (getSubMode(q) === 'multiple') {
    const exists = current.includes(key)
    next = exists ? current.filter(k => k !== key) : [...current, key]
  } else {
    next = [key]
  }
  list[sqIndex] = { ...q, answer: next }
  groups[gIndex] = { ...g, subQuestions: list }
  update({ ...props.modelValue, content: { ...props.modelValue.content, groups } })
}

function toInt(v: any): number {
  const n = parseInt(String(v || '0'), 10)
  return Number.isFinite(n) ? n : 0
}
</script>

<style lang="scss" scoped>
.lc-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lc-editor--template {
  gap: 12px;
}

.lc-editor--template .editor-section {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0;
}

.lc-editor--template .section-title {
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.editor-section {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.9));
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 14px 14px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  letter-spacing: 0.2px;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.form-item {
  margin-bottom: 12px;
}

.form-item--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
}

.form-item__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.form-item__label-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.form-item__label {
  display: block;
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: 6px;
}

.text-input {
  width: 100%;
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 14px;
  background: rgba(248, 250, 252, 0.9);
}

.text-input:focus {
  outline: none;
  border-color: rgba(33, 150, 243, 0.45);
  background: #fff;
}

.row {
  display: flex;
  gap: $spacing-sm;
  align-items: center;
}

.row .text-input {
  flex: 1;
  width: auto;
  min-width: 0;
}

.row .btn {
  flex-shrink: 0;
  min-width: 56px;
  white-space: nowrap;
}

.mode-toggle {
  display: flex;
  gap: 0;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(241, 245, 249, 0.9);
}

.mode-btn {
  padding: 6px 10px;
  border: 0;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.65);
  min-width: 56px;
  text-align: center;
}

.mode-btn.active {
  color: $text-primary;
  background: #fff;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.10);
}

.empty-tip {
  padding: $spacing-md;
  color: $text-hint;
  font-size: $font-size-sm;
}

.card {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  padding: 12px 12px;
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.85);
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
}

.card__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
}

.card__chev {
  width: 18px;
  color: rgba(15, 23, 42, 0.55);
  font-size: 14px;
}

.card__title {
  font-weight: 600;
}

.card__subtitle {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 420px;
}

.card__body {
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding-top: 12px;
}

.sub-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 12px 12px;
  margin-top: 12px;
  background: rgba(248, 250, 252, 0.8);
}

.sub-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
  cursor: pointer;
}

.sub-card__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sub-card__chev {
  width: 14px;
  flex-shrink: 0;
  color: rgba(15, 23, 42, 0.55);
  font-size: 13px;
}

.sub-card__title {
  font-weight: 600;
}

.sub-card__body {
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding-top: 10px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.opt-row {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-start;
}

.opt-key {
  width: 44px;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-align: center;
  background: #fff;
}

.opt-content {
  flex: 1;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-secondary;
}

.answer-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.answer-item {
  width: 44px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  transition: transform 0.12s, border-color 0.12s, background 0.12s;
}

.answer-item:active {
  transform: translateY(1px);
}

.answer-item.active {
  border-color: rgba(33, 150, 243, 0.55);
  background: rgba(227, 242, 253, 0.95);
  color: #0b63c6;
  font-weight: 600;
}

.step-card {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  padding: 12px 12px;
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.9);
}

.step-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
}

.step-card__title {
  font-weight: 600;
}

.step-card__ops {
  display: flex;
  gap: 6px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  font-size: 12px;
  color: $text-secondary;
  background: #fff;
}

.pill.active {
  border-color: $primary-color;
  background: $primary-light;
  color: $primary-color;
}

.toggle {
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-secondary;
  background: #fff;
}

.toggle.active {
  border-color: $primary-color;
  color: $primary-color;
  background: $primary-light;
}

.danger {
  color: $error-color;
}
</style>
