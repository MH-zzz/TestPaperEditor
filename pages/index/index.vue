<template>
  <view class="app-layout">
    <!-- 左侧导航 -->
    <SideNavigation 
      v-model:module="currentModule"
    />

    <!-- 右侧内容区 -->
    <view class="app-content">
      <!-- 模块：编辑器 -->
      <EditorWorkspace 
        v-if="currentModule === 'editor'" 
        v-model:type="currentType"
      />

      <LearningWorkspace v-else-if="currentModule === 'learning'" />
      
      <!-- 模块：标签管理 -->
      <TagsManager v-else-if="currentModule === 'tags'" />
      
      <!-- 模块：题库查询 -->
      <QuestionLibrary v-else-if="currentModule === 'library'" @open-editor="onSwitchToEditor" />

      <!-- 模块：题型模板 -->
      <ContentTemplatesManager v-else-if="currentModule === 'templates'" />

      <!-- 模块：流程 -->
      <FlowModulesManager v-else-if="currentModule === 'flows'" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import SideNavigation from '/components/layout/SideNavigation.vue'
import EditorWorkspace from '/components/views/EditorWorkspace.vue'
import LearningWorkspace from '/components/views/LearningWorkspace.vue'
import TagsManager from '/components/views/TagsManager.vue'
import QuestionLibrary from '/components/views/QuestionLibrary.vue'
import FlowModulesManager from '/components/views/FlowModulesManager.vue'
import ContentTemplatesManager from '/components/views/ContentTemplatesManager.vue'
import { questionTemplates, type TemplateKey } from '/templates'
import { questionDraft } from '/stores/questionDraft'
import { appShell } from '/stores/appShell'

const currentModule = computed({
  get: () => appShell.state.currentModule,
  set: (mod: string) => appShell.switchModule(mod)
})
const currentType = ref('listening_choice')
const suppressTypeCreate = ref(false)
const canCreateByType = ref(false)

// 监听从题库加载题目的事件
const onSwitchToEditor = () => {
  currentModule.value = 'editor'
  syncTypeFromCurrentDraft()
}

function syncTypeFromCurrentDraft() {
  const nextType = String(questionDraft.state.currentQuestion?.type || '').trim()
  if (!nextType || !(questionTemplates as any)[nextType]) return
  suppressTypeCreate.value = true
  currentType.value = nextType
  suppressTypeCreate.value = false
}

// 监听题型切换 -> 创建新题目
watch(currentType, (newType) => {
  if (suppressTypeCreate.value || !canCreateByType.value) return
  if (currentModule.value !== 'editor') return

  const template = questionTemplates[newType as TemplateKey]
  if (!template) return

  questionDraft.createByType(newType as TemplateKey)
  uni.showToast({ title: `已创建新${template.name}`, icon: 'none' })
})

onMounted(() => {
  questionDraft.loadFromStorage()
  syncTypeFromCurrentDraft()
  canCreateByType.value = true
})
</script>

<style lang="scss">
page {
  height: 100%;
  overflow: hidden;
}

.app-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-content {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: $text-hint;
  font-size: 16px;
  background-color: #f5f7fa;
}
</style>
