<template>
  <view v-if="visible" class="runtime-debug-drawer">
    <view class="runtime-debug-drawer__mask" @click="closeDrawer" />

    <view class="runtime-debug-drawer__panel">
      <view class="runtime-debug-drawer__header">
        <view class="runtime-debug-drawer__title-wrap">
          <text class="runtime-debug-drawer__title">{{ title }}</text>
          <text class="runtime-debug-drawer__subtitle">Session: {{ resolvedSessionId }}</text>
        </view>

        <view class="runtime-debug-drawer__actions">
          <button class="btn btn-outline btn-xs" @click="exportDiagnostics">导出诊断包</button>
          <button class="btn btn-outline btn-xs" @click="clearTrace">清空轨迹</button>
          <button class="btn btn-outline btn-xs" @click="closeDrawer">关闭</button>
        </view>
      </view>

      <scroll-view scroll-y class="runtime-debug-drawer__body">
        <view class="runtime-debug-drawer__section">
          <text class="runtime-debug-drawer__section-title">运行信息</text>
          <view v-if="metaRows.length > 0" class="runtime-debug-drawer__meta-grid">
            <view v-for="item in metaRows" :key="item.key" class="runtime-debug-drawer__meta-item">
              <text class="runtime-debug-drawer__meta-key">{{ item.key }}</text>
              <text class="runtime-debug-drawer__meta-value">{{ item.value }}</text>
            </view>
          </view>
          <view v-else class="runtime-debug-drawer__empty">暂无运行信息</view>
        </view>

        <view class="runtime-debug-drawer__section">
          <text class="runtime-debug-drawer__section-title">轨迹事件</text>
          <view v-if="events.length > 0" class="runtime-debug-drawer__events">
            <view v-for="item in events" :key="item.id" class="runtime-debug-drawer__event">
              <view class="runtime-debug-drawer__event-head">
                <text class="runtime-debug-drawer__event-time">{{ item.time }}</text>
                <text class="runtime-debug-drawer__event-type">{{ item.type }}</text>
              </view>
              <text class="runtime-debug-drawer__event-text">{{ item.message }}</text>
            </view>
          </view>
          <view v-else class="runtime-debug-drawer__empty">暂无轨迹事件</view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { runtimeDebug } from '/stores/runtimeDebug'

const props = withDefaults(defineProps<{
  sessionId?: string
  title?: string
}>(), {
  sessionId: '',
  title: '运行时诊断'
})

const resolvedSessionId = computed(() => {
  return String(props.sessionId || runtimeDebug.state.activeSessionId || '')
})

const session = computed(() => {
  if (!resolvedSessionId.value) return null
  return runtimeDebug.getSession(resolvedSessionId.value)
})

const visible = computed(() => {
  return runtimeDebug.state.drawerOpen && !!session.value
})

const metaRows = computed(() => {
  const meta = session.value?.meta || {}
  return Object.entries(meta)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => {
      const rendered = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return {
        key,
        value: rendered
      }
    })
})

const events = computed(() => session.value?.events || [])

function closeDrawer() {
  runtimeDebug.closeDrawer()
}

function clearTrace() {
  if (!resolvedSessionId.value) return
  runtimeDebug.resetSession(resolvedSessionId.value, { keepMeta: true })
}

function exportDiagnostics() {
  if (!resolvedSessionId.value) return

  const json = runtimeDebug.exportDiagnosticsJson(resolvedSessionId.value)
  if (!json) return

  const uniApi = (globalThis as any).uni
  if (uniApi?.setClipboardData) {
    uniApi.setClipboardData({
      data: json,
      success: () => {
        if (uniApi?.showToast) {
          uniApi.showToast({ title: '诊断包已复制', icon: 'none' })
        }
      }
    })
    return
  }

  console.info('[runtime-debug] diagnostics package')
  console.info(json)
}
</script>

<style lang="scss" scoped>
.runtime-debug-drawer {
  position: fixed;
  inset: 0;
  z-index: 320;
}

.runtime-debug-drawer__mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
}

.runtime-debug-drawer__panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 420px;
  max-width: min(420px, 100vw);
  height: 100%;
  background: #fff;
  border-left: 1px solid rgba(15, 23, 42, 0.14);
  display: flex;
  flex-direction: column;
}

.runtime-debug-drawer__header {
  flex-shrink: 0;
  padding: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.runtime-debug-drawer__title-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.runtime-debug-drawer__title {
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.9);
}

.runtime-debug-drawer__subtitle {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.runtime-debug-drawer__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.runtime-debug-drawer__body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  box-sizing: border-box;
}

.runtime-debug-drawer__section {
  margin-bottom: 14px;
}

.runtime-debug-drawer__section-title {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.75);
}

.runtime-debug-drawer__meta-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.runtime-debug-drawer__meta-item {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  padding: 8px;
  background: rgba(248, 250, 252, 0.9);
}

.runtime-debug-drawer__meta-key {
  display: block;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.55);
}

.runtime-debug-drawer__meta-value {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.82);
  word-break: break-all;
}

.runtime-debug-drawer__events {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.runtime-debug-drawer__event {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  padding: 8px;
  background: #fff;
}

.runtime-debug-drawer__event-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.runtime-debug-drawer__event-time {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.45);
}

.runtime-debug-drawer__event-type {
  font-size: 11px;
  color: rgba(2, 132, 199, 0.9);
  font-weight: 700;
}

.runtime-debug-drawer__event-text {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.82);
  line-height: 1.45;
}

.runtime-debug-drawer__empty {
  padding: 10px;
  border: 1px dashed rgba(15, 23, 42, 0.2);
  border-radius: 10px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.5);
  text-align: center;
}
</style>
