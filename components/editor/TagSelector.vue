<template>
  <view class="tag-selector" :class="[`mode-${mode}`]">
    <!-- 普通模式：顶部 Tab 切换 -->
    <template v-if="mode === 'normal'">
      <view class="tag-tabs">
        <view
          v-for="(label, key) in categories"
          :key="key"
          class="tag-tab"
          :class="{ active: currentCategory === key }"
          @click="currentCategory = key"
        >
          {{ label }}
        </view>
      </view>

      <view class="tag-content">
        <view class="tag-list">
          <view
            v-for="tag in currentTags"
            :key="tag.id"
            class="tag-item"
            :class="{ active: modelValue.includes(tag.id) }"
            @click="toggleTag(tag.id)"
          >
            {{ tag.name }}
            <text v-if="!isDefault(tag.id)" class="tag-delete" @click.stop="deleteTag(tag.id)">×</text>
          </view>
          <view class="tag-add" @click="showAddInput = true" v-if="!showAddInput">+ 新建</view>
          <view class="tag-input-wrapper" v-else>
            <input
              class="tag-input"
              v-model="newTagName"
              placeholder="输入名称"
              focus
              @confirm="confirmAdd"
              @blur="cancelAdd"
            />
          </view>
        </view>
      </view>
    </template>

    <!-- 侧边栏模式：垂直堆叠所有分类 -->
    <template v-else>
      <view class="sidebar-tag-list">
        <view 
          v-for="(label, key) in categories" 
          :key="key" 
          class="sidebar-group"
        >
          <view class="sidebar-label">{{ label }}</view>
          <view class="tag-list small">
            <view
              v-for="tag in tagStore.getByCategory(key)"
              :key="tag.id"
              class="tag-item"
              :class="{ active: modelValue.includes(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { tagStore } from '/stores/tag'
import { TAG_CATEGORIES, type TagCategory, DEFAULT_TAGS } from '/types/tag'

const props = withDefaults(defineProps<{
  modelValue: string[] // 选中的标签ID列表
  mode?: 'normal' | 'sidebar'
}>(), {
  mode: 'normal'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const categories = TAG_CATEGORIES
const currentCategory = ref<TagCategory>('grade')
const showAddInput = ref(false)
const newTagName = ref('')

const currentTags = computed(() => {
  return tagStore.getByCategory(currentCategory.value)
})

function isDefault(id: string) {
  return DEFAULT_TAGS.some(t => t.id === id)
}

function toggleTag(id: string) {
  const newSelection = [...props.modelValue]
  const index = newSelection.indexOf(id)
  
  if (index > -1) {
    newSelection.splice(index, 1)
  } else {
    // 某些类型（如难度、年级）可能希望单选？暂时默认多选
    newSelection.push(id)
  }
  
  emit('update:modelValue', newSelection)
}

function confirmAdd() {
  if (newTagName.value.trim()) {
    tagStore.addTag(newTagName.value.trim(), currentCategory.value)
    newTagName.value = ''
  }
  showAddInput.value = false
}

function cancelAdd() {
  showAddInput.value = false
  newTagName.value = ''
}

function deleteTag(id: string) {
  uni.showModal({
    title: '删除标签',
    content: '确定要删除这个标签吗？',
    success: (res) => {
      if (res.confirm) {
        tagStore.removeTag(id)
        // 如果已选中，也移除
        if (props.modelValue.includes(id)) {
          emit('update:modelValue', props.modelValue.filter(tid => tid !== id))
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.tag-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border-top: 1px solid $border-color;

  &.mode-sidebar {
    background-color: transparent;
    border-top: none;
    
    .tag-tabs {
      background-color: transparent;
      border-bottom: 1px solid #eee;
    }
    
    .tag-tab {
      padding: 8px 10px;
      font-size: 12px;
    }
    
    .tag-content {
      padding: 8px;
    }
    
    .tag-item {
      padding: 2px 8px;
      font-size: 11px;
    }
  }
}

.tag-tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid $border-color;
  background-color: #fafafa;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.tag-tab {
  padding: 10px 16px;
  font-size: 13px;
  color: $text-secondary;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  
  &.active {
    color: $primary-color;
    border-bottom-color: $primary-color;
    background-color: #fff;
  }
}

.tag-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  background-color: #f5f5f5;
  border-radius: 14px;
  font-size: 12px;
  color: $text-primary;
  cursor: pointer;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  
  &:hover {
    background-color: #e0e0e0;
  }
  
  &.active {
    background-color: $primary-light;
    color: $primary-color;
    border-color: $primary-color;
  }
}

.tag-delete {
  font-size: 14px;
  color: #999;
  line-height: 1;
  padding: 0 2px;
  
  &:hover {
    color: $error-color;
  }
}

.tag-add {
  padding: 4px 12px;
  border: 1px dashed $border-color;
  border-radius: 14px;
  font-size: 12px;
  color: $text-hint;
  cursor: pointer;
  
  &:hover {
    border-color: $primary-color;
    color: $primary-color;
  }
}

.tag-input-wrapper {
  width: 80px;
}

.tag-input {
  width: 100%;
  height: 24px;
  font-size: 12px;
  border: 1px solid $primary-color;
  border-radius: 4px;
  padding: 0 4px;
}

// 侧边栏模式样式
.sidebar-tag-list {
  padding: 8px 12px;
  
  .sidebar-group {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .sidebar-label {
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 8px;
    font-weight: 500;
  }
  
  .tag-list.small {
    gap: 6px;
    
    .tag-item {
      padding: 2px 8px;
      font-size: 11px;
      background-color: #fff;
      border: 1px solid $border-color;
      border-radius: 4px; // 更小的圆角
      
      &:hover {
        background-color: #f5f5f5;
        border-color: #ccc;
      }
      
      &.active {
        background-color: $primary-light;
        color: $primary-color;
        border-color: $primary-color;
      }
    }
  }
}
</style>