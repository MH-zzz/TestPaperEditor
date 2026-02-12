<template>
  <view class="question-library">
    <view class="library-header">
      <view class="header-main">
        <text class="title">题库查询</text>
        <text class="subtitle">检索已保存的题目，支持多维度过滤</text>
      </view>
      <view class="search-bar">
        <input 
          class="search-input" 
          v-model="searchQuery" 
          placeholder="搜索题干关键词..." 
        />
      </view>
    </view>

    <!-- 过滤器 -->
    <view class="filters">
      <view class="filter-group">
        <text class="filter-label">题型:</text>
        <view class="filter-options">
          <text 
            class="filter-opt" 
            :class="{ active: filterType === 'all' }"
            @click="filterType = 'all'"
          >全部</text>
          <text 
            class="filter-opt" 
            :class="{ active: filterType === 'listening_choice' }"
            @click="filterType = 'listening_choice'"
          >听力选择</text>
        </view>
      </view>
    </view>

    <view class="library-content">
      <view v-if="filteredQuestions.length === 0" class="empty-state">
        <text>未找到符合条件的题目</text>
      </view>
      
      <view v-else class="question-grid">
        <view 
          v-for="item in filteredQuestions" 
          :key="item.id" 
          class="question-card"
          @click="loadQuestion(item)"
        >
          <view class="card-header">
            <text class="q-type">{{ getTypeName(item.type) }}</text>
            <text class="q-date">{{ formatDate(item.metadata?.updatedAt) }}</text>
          </view>
          
          <view class="card-body">
            <text class="q-stem">{{ getQuestionSummary(item) }}</text>
          </view>
          
          <view class="card-footer">
            <view class="q-tags">
              <text v-for="tagId in (item.metadata?.tags || [])" :key="tagId" class="q-tag">
                {{ getTagName(tagId) }}
              </text>
            </view>
            <view class="card-actions">
              <button class="btn btn-text btn-sm" @click.stop="loadQuestion(item)">编辑</button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Question } from '/types'
import { tagStore } from '/stores/tag'
import { questionTemplates, type TemplateKey } from '/templates'
import { questionDraft } from '/stores/questionDraft'
import { loadRecentQuestions } from '/infra/repository/questionRepository'

const emit = defineEmits<{
  (e: 'open-editor'): void
}>()

const questions = ref<Question[]>([])
const searchQuery = ref('')
const filterType = ref('all')

function loadData() {
  questions.value = loadRecentQuestions<Question>()
}

onMounted(() => {
  loadData()
})

const filteredQuestions = computed(() => {
  return questions.value.filter(q => {
    // 类型过滤
    if (filterType.value !== 'all' && q.type !== filterType.value) return false
    
    // 搜索过滤
    if (searchQuery.value) {
      const stemText = getQuestionSummary(q).toLowerCase()
      if (!stemText.includes(searchQuery.value.toLowerCase())) return false
    }
    
    return true
  })
})

function getPlainText(richtext: any): string {
  if (!richtext || !richtext.content) return ''
  return richtext.content.map((n: any) => (n?.type === 'text' ? n.text : '')).join('')
}

function getQuestionSummary(q: any): string {
  if (!q) return ''
  if (q.type === 'listening_choice') {
    return (
      getPlainText(q.content?.intro?.text) ||
      getPlainText(q.content?.groups?.[0]?.prompt) ||
      '听力选择题'
    )
  }
  return getPlainText(q.stem)
}

function getTypeName(type: string) {
  return questionTemplates[type as TemplateKey]?.name || type
}

function getTagName(id: string) {
  return tagStore.getPath(id) || id
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return dateStr.split(' ')[0] // 简单处理
}

function loadQuestion(question: Question) {
  questionDraft.loadQuestion(question)
  uni.showToast({ title: '已加载到编辑器', icon: 'success' })
  emit('open-editor')
}
</script>

<style lang="scss" scoped>
.question-library {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  padding: 30px;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-main {
  .title {
    font-size: 24px;
    font-weight: bold;
    color: #2d3748;
    display: block;
  }
  .subtitle {
    font-size: 14px;
    color: #718096;
    margin-top: 8px;
    display: block;
  }
}

.search-bar {
  width: 300px;
}

.search-input {
  width: 100%;
  height: 40px;
  background-color: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 14px;
}

.filters {
  background-color: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  border: 1px solid #edf2f7;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .filter-label {
    font-size: 14px;
    font-weight: 600;
    color: #4a5568;
  }
  
  .filter-options {
    display: flex;
    gap: 12px;
  }
  
  .filter-opt {
    font-size: 13px;
    color: #718096;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;
    
    &.active {
      color: $primary-color;
      background-color: $primary-light;
      font-weight: 500;
    }
  }
}

.library-content {
  flex: 1;
  overflow-y: auto;
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.question-card {
  background-color: #fff;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #edf2f7;
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 180px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px rgba(0,0,0,0.05);
    border-color: $primary-color;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  
  .q-type {
    font-size: 12px;
    font-weight: 600;
    color: $primary-color;
    background-color: $primary-light;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .q-date {
    font-size: 11px;
    color: #a0aec0;
  }
}

.card-body {
  flex: 1;
  overflow: hidden;
  margin-bottom: 12px;
  
  .q-stem {
    font-size: 14px;
    color: #2d3748;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  
  .q-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-width: 70%;
  }
  
  .q-tag {
    font-size: 10px;
    color: #718096;
    background-color: #f7fafc;
    padding: 1px 4px;
    border-radius: 3px;
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  padding-top: 100px;
  color: #a0aec0;
}
</style>
