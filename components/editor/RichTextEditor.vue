<template>
  <view class="rich-text-editor" :class="{ 'is-dense': dense }">
    <!-- 工具栏 -->
    <view class="rich-text-editor__toolbar">
      <view
        class="toolbar-btn"
        :class="{ active: isMarkActive('bold') }"
        @mousedown.prevent="toggleMark('bold')"
      >
        <text class="toolbar-icon">B</text>
      </view>
      <view
        class="toolbar-btn"
        :class="{ active: isMarkActive('italic') }"
        @mousedown.prevent="toggleMark('italic')"
      >
        <text class="toolbar-icon italic">I</text>
      </view>
      <view
        class="toolbar-btn"
        :class="{ active: isMarkActive('underline') }"
        @mousedown.prevent="toggleMark('underline')"
      >
        <text class="toolbar-icon underline">U</text>
      </view>
      <view class="toolbar-divider" />
      <view class="toolbar-btn color-btn" @click="showColorPicker = !showColorPicker">
        <text class="toolbar-icon" :style="{ color: getCurrentColor() }">A</text>
        <view class="color-indicator" :style="{ backgroundColor: getCurrentColor() }" />
      </view>
      <view class="toolbar-divider" />
      <view class="toolbar-btn" @mousedown.prevent="insertImage">
        <text class="toolbar-icon">🖼</text>
      </view>
    </view>

    <!-- 颜色选择器 -->
    <view v-if="showColorPicker" class="color-picker">
      <view
        v-for="color in colors"
        :key="color"
        class="color-item"
        :style="{ backgroundColor: color }"
        @mousedown.prevent="setColor(color)"
      />
    </view>

    <!-- 编辑区域 -->
    <!-- #ifdef H5 -->
    <view class="rich-text-editor__content">
      <div
        ref="editorRef"
        class="editor-content"
        :class="{ 'p-dense': dense }"
        contenteditable="true"
        @input="onInput"
        @mouseup="updateSelectionState"
        @keyup="updateSelectionState"
        @blur="onBlur"
        :style="{ minHeight: minHeight }"
      />
    </view>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <view class="rich-text-editor__content">
      <textarea
        class="editor-textarea"
        :class="{ 'p-dense': dense }"
        :value="plainText"
        @input="onTextareaInput"
        :placeholder="placeholder"
        :auto-height="true"
        :style="{ minHeight: minHeight }"
      />
      <view class="editor-tip">
        提示：在 App 中使用简化编辑，完整富文本编辑请使用 H5 版本
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { RichTextContent, TextMark, RichTextNode, RichTextTextNode, RichTextImageNode } from '/types'

const props = withDefaults(defineProps<{
  modelValue: RichTextContent | null | undefined
  placeholder?: string
  minHeight?: string
  dense?: boolean
}>(), {
  placeholder: '请输入内容',
  minHeight: '120px',
  dense: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: RichTextContent): void
}>()

// 预设颜色
const colors = [
  '#000000', '#333333', '#666666', '#999999',
  '#ff0000', '#ff6600', '#ffcc00', '#33cc33',
  '#0066ff', '#6633ff', '#cc33cc', '#ff3399'
]

const editorRef = ref<HTMLDivElement | null>(null)
const showColorPicker = ref(false)
const currentMarks = ref<string[]>([]) // 当前光标处的样式状态

// 将 RichTextContent 转换为 HTML
const htmlContent = computed(() => {
  if (!props.modelValue?.content?.length) return ''

  return props.modelValue.content.map(node => {
    // 图片节点
    if (node.type === 'image') {
      return `<img src="${node.url}" alt="${node.alt || ''}" class="editor-image" data-type="image" />`
    }

    // 文本节点
    let html = node.text
    // 转义 HTML 特殊字符，防止 XSS 和渲染错误
    html = html.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")

    const marks = node.marks || []

    let style = ''
    let classes: string[] = []

    marks.forEach(mark => {
      if (mark === 'bold') classes.push('bold')
      if (mark === 'italic') classes.push('italic')
      if (mark === 'underline') classes.push('underline')
      if (mark.startsWith('color:')) {
        style += `color: ${mark.split(':')[1]};`
      }
    })

    if (classes.length || style) {
      html = `<span class="${classes.join(' ')}" style="${style}">${html}</span>`
    }

    // 将换行符转换为 <br>
    html = html.replace(/\n/g, '<br>')

    return html
  }).join('')
})

// 初始化内容
onMounted(() => {
  if (editorRef.value && htmlContent.value) {
    editorRef.value.innerHTML = htmlContent.value
  }
})

// 监听外部 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  // 只有当新生成的 HTML 与当前编辑器内容不一致时才更新
  // 这样可以避免光标跳动
  if (editorRef.value) {
    // 简单比较：如果差异太大则重置。
    // 在实际输入中，onInput 会先触发，我们不希望这里的 watch 覆盖用户的输入流
    // 除非是外部（非当前编辑器）改变了数据。
    // 这里做一个简单的判断：如果当前元素没有焦点，或者内容确实变了（且不是刚刚输入导致的）
    const currentHTML = editorRef.value.innerHTML
    if (newVal && htmlContent.value !== currentHTML) {
       // 只有在非焦点状态或确实内容不匹配时才强制更新
       // 为了简化，这里我们只在内容长度差异大或者完全不包含时更新，或者如果不处于编辑状态
       if (document.activeElement !== editorRef.value) {
          editorRef.value.innerHTML = htmlContent.value
       }
    }
  }
})

// 将 RichTextContent 转换为纯文本
const plainText = computed(() => {
  if (!props.modelValue?.content?.length) return ''
  return props.modelValue.content.map(node => node.text).join('')
})

// ==================== DOM 解析逻辑 ====================

// 递归解析 DOM 节点为 RichTextNode
function parseDomToContent(nodes: NodeList): RichTextNode[] {
  let result: RichTextNode[] = []

  // 辅助函数：解析单个节点
  function traverse(node: Node, parentMarks: TextMark[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text) {
         // 合并相邻的相同样式的文本节点
         const last = result[result.length - 1]
         if (last && last.type === 'text' && areMarksEqual(last.marks || [], parentMarks)) {
           last.text += text
         } else {
           result.push({ type: 'text', text, marks: [...parentMarks] })
         }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const newMarks = [...parentMarks]

      // 处理图片标签
      if (el.tagName === 'IMG') {
        const img = el as HTMLImageElement
        result.push({
          type: 'image',
          url: img.src,
          alt: img.alt || ''
        })
        return
      }

      // 处理换行标签
      if (el.tagName === 'BR') {
        result.push({ type: 'text', text: '\n', marks: [] })
        return
      }

      // 处理块级元素 (div, p)，在开始前插入换行（如果不是开头）
      if ((el.tagName === 'DIV' || el.tagName === 'P') && result.length > 0) {
        const lastNode = result[result.length - 1]
        if (lastNode.type === 'text' && !lastNode.text.endsWith('\n')) {
           result.push({ type: 'text', text: '\n', marks: [] })
        }
      }

      // 解析样式
      // Class based
      if (el.classList.contains('bold')) toggleMarkInArray(newMarks, 'bold')
      if (el.classList.contains('italic')) toggleMarkInArray(newMarks, 'italic')
      if (el.classList.contains('underline')) toggleMarkInArray(newMarks, 'underline')

      // Tag based (execCommand 可能会生成这些标签)
      if (el.tagName === 'B' || el.tagName === 'STRONG') toggleMarkInArray(newMarks, 'bold')
      if (el.tagName === 'I' || el.tagName === 'EM') toggleMarkInArray(newMarks, 'italic')
      if (el.tagName === 'U') toggleMarkInArray(newMarks, 'underline')

      // Style based
      if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight) >= 700) toggleMarkInArray(newMarks, 'bold')
      if (el.style.fontStyle === 'italic') toggleMarkInArray(newMarks, 'italic')
      if (el.style.textDecoration.includes('underline')) toggleMarkInArray(newMarks, 'underline')

      if (el.style.color) {
        // 移除旧的颜色
        const colorIdx = newMarks.findIndex(m => m.startsWith('color:'))
        if (colorIdx > -1) newMarks.splice(colorIdx, 1)
        newMarks.push(`color:${el.style.color}` as TextMark)
      }

      // Font tag (execCommand foreColor 可能生成 <font color="...">)
      if (el.tagName === 'FONT') {
        const color = el.getAttribute('color')
        if (color) {
           const colorIdx = newMarks.findIndex(m => m.startsWith('color:'))
           if (colorIdx > -1) newMarks.splice(colorIdx, 1)
           newMarks.push(`color:${color}` as TextMark)
        }
      }

      node.childNodes.forEach(child => traverse(child, newMarks))
    }
  }
  
  // 辅助函数：确保数组中只有唯一的 mark
  function toggleMarkInArray(arr: TextMark[], mark: TextMark) {
    if (!arr.includes(mark)) {
      arr.push(mark)
    }
  }

  // 辅助函数：比较两个 marks 数组是否相等
  function areMarksEqual(a: TextMark[], b: TextMark[]) {
    if (a.length !== b.length) return false
    const setA = new Set(a)
    return b.every(m => setA.has(m))
  }

  nodes.forEach(node => traverse(node, []))
  return result
}

// 处理输入（H5）
function onInput(event: Event) {
  if (!editorRef.value) return
  
  const contentNodes = parseDomToContent(editorRef.value.childNodes)
  
  const newContent: RichTextContent = {
    type: 'richtext',
    content: contentNodes
  }

  emit('update:modelValue', newContent)
  updateSelectionState()
}

// 失焦时整理 HTML (可选)
function onBlur() {
   // 可以在这里强制格式化一下 HTML，保持整洁，但要注意体验
}

// ==================== 选区与样式状态 ====================

// 更新当前光标处的样式状态（用于高亮工具栏按钮）
function updateSelectionState() {
  // #ifdef H5
  currentMarks.value = []
  
  // 使用 document.queryCommandState 判断当前选区状态
  if (document.queryCommandState('bold')) currentMarks.value.push('bold')
  if (document.queryCommandState('italic')) currentMarks.value.push('italic')
  if (document.queryCommandState('underline')) currentMarks.value.push('underline')
  
  // 获取颜色稍微麻烦点，简化处理：如果不一致就不显示
  // #endif
}

function isMarkActive(mark: string): boolean {
  return currentMarks.value.includes(mark)
}

function getCurrentColor(): string {
  // 简化：无法准确获取当前光标颜色，返回默认或上次选的
  return '#000000'
}

// ==================== 工具栏操作 ====================

// 切换标记
function toggleMark(mark: string) {
  // #ifdef H5
  if (document.activeElement !== editorRef.value) {
    editorRef.value?.focus()
  }
  
  document.execCommand(mark, false)
  
  // 更新按钮状态
  updateSelectionState()
  
  // 只有当选区不为空（即 DOM 可能发生了变化）时才触发 input 更新
  // 这样可以避免光标闭合时切换样式导致“待输入样式”状态丢失
  const selection = window.getSelection()
  if (selection && !selection.isCollapsed) {
    onInput({} as Event)
  }
  // #endif
}

// 设置颜色
function setColor(color: string) {
  showColorPicker.value = false
  // #ifdef H5
  if (document.activeElement !== editorRef.value) {
    editorRef.value?.focus()
  }

  document.execCommand('foreColor', false, color)

  const selection = window.getSelection()
  if (selection && !selection.isCollapsed) {
    onInput({} as Event)
  }
  // #endif
}

// Demo 图片列表（循环使用）
const demoImages = [
  '/static/picsum/opt-01.jpg',
  '/static/picsum/opt-02.jpg',
  '/static/picsum/opt-03.jpg',
  '/static/picsum/stem-01.jpg',
  '/static/picsum/stem-02.jpg',
  '/static/caomei.jpeg',
  '/static/banana.jpeg',
  '/static/xigua.jpeg',
  '/static/placehodler.png'
]
let imageIndex = 0

// 插入图片（Demo 循环使用 static 图片）
function insertImage() {
  const url = demoImages[imageIndex % demoImages.length]
  imageIndex++

  // #ifdef H5
  if (editorRef.value) {
    editorRef.value.focus()
    document.execCommand('insertImage', false, url)
    onInput({} as Event)
  }
  // #endif

  // #ifndef H5
  const currentContent = props.modelValue?.content || []
  const newContent: RichTextContent = {
    type: 'richtext',
    content: [
      ...currentContent,
      { type: 'image', url, alt: '' }
    ]
  }
  emit('update:modelValue', newContent)
  // #endif

  uni.showToast({ title: '已插入图片', icon: 'success' })
}

// 非 H5 输入处理保持不变
function onTextareaInput(event: any) {
  const text = event.detail.value || ''
  const newContent: RichTextContent = {
    type: 'richtext',
    content: text ? [{ type: 'text', text }] : []
  }
  emit('update:modelValue', newContent)
}
</script>

<style lang="scss" scoped>
.rich-text-editor {
  border: 1px solid $border-color;
  border-radius: $border-radius-md;
  overflow: hidden;
  background-color: #fff;

  &__toolbar {
    display: flex;
    align-items: center;
    padding: $spacing-xs $spacing-sm;
    background-color: #f5f7fa;
    border-bottom: 1px solid $border-color;
    gap: $spacing-xs;

    .is-dense & {
      padding: 2px $spacing-sm;
    }
  }

  &__content {
    min-height: 100px;
    
    .is-dense & {
      min-height: 0;
    }
  }
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $border-radius-sm;
  cursor: pointer;
  color: $text-secondary;
  transition: all 0.2s;

  .is-dense & {
    width: 24px;
    height: 24px;
  }

  &:hover {
    background-color: #e6e8eb;
  }

  &.active {
    background-color: #e3f2fd; // $primary-light
    color: #2196f3; // $primary-color
  }
}

.toolbar-icon {
  font-size: 16px;
  font-weight: 600;
  font-family: serif;

  .is-dense & {
    font-size: 13px;
  }

  &.italic {
    font-style: italic;
  }

  &.underline {
    text-decoration: underline;
  }
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: #dcdfe6;
  margin: 0 $spacing-xs;

  .is-dense & {
    height: 12px;
    margin: 0 2px;
  }
}

.color-btn {
  position: relative;

  .color-indicator {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 3px;
    border-radius: 1px;

    .is-dense & {
      bottom: 2px;
      width: 10px;
      height: 2px;
    }
  }
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background-color: #fff;
  border-bottom: 1px solid $border-color;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.05);

  .is-dense & {
    padding: 8px;
    gap: 4px;
  }
}

.color-item {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(0,0,0,0.1);
  transition: transform 0.1s;

  .is-dense & {
    width: 20px;
    height: 20px;
  }

  &:hover {
    transform: scale(1.15);
    z-index: 1;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
}

.editor-content {
  padding: $spacing-md;
  outline: none;
  font-size: 16px;
  line-height: 1.6;
  color: $text-primary;

  &.p-dense {
    padding: 6px $spacing-md;
    font-size: 14px;
  }

  // 这里的样式是为了匹配 execCommand 生成的结构
  // 以及我们自己生成的 HTML 结构
  :deep(b), :deep(strong), :deep(.bold) {
    font-weight: bold;
  }

  :deep(i), :deep(em), :deep(.italic) {
    font-style: italic;
  }

  :deep(u), :deep(.underline) {
    text-decoration: underline;
  }

  :deep(img), :deep(.editor-image) {
    max-width: 100%;
    height: auto;
    max-height: 200px;
    border-radius: 4px;
    vertical-align: middle;
    margin: 4px 0;
  }
}

.editor-textarea {
  width: 100%;
  padding: $spacing-md;
  border: none;
  outline: none;
  font-size: 16px;
  line-height: 1.6;
  resize: none;
}

.editor-tip {
  padding: 8px 16px;
  font-size: 12px;
  color: $text-hint;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
}
</style>
