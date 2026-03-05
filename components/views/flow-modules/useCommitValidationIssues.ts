import { ref, type Ref } from 'vue'
import type { ModuleCommitValidationResult } from './useModuleLifecycle'

export type CommitValidationIssueScope = 'template' | 'routing' | 'visual' | 'unknown'

export type CommitValidationIssue = {
  key: string
  code: string
  path: string
  message: string
  scope: CommitValidationIssueScope
  locationLabel: string
  targetProfileId?: string
  targetVisualNodeId?: string
}

export function useCommitValidationIssues(options: {
  readonlyFlowVisualVisible: Ref<boolean>
  selectFlowVisualNode: (nodeId: string) => void
  formatFlowProfileLabelById: (profileId: string) => string
}) {
  const {
    readonlyFlowVisualVisible,
    selectFlowVisualNode,
    formatFlowProfileLabelById
  } = options

  const commitValidationIssues = ref<CommitValidationIssue[]>([])
  const activeCommitValidationIssueKey = ref('')
  const templateFocusPath = ref('')

  function resolveCommitValidationScope(path: string): CommitValidationIssueScope {
    if (path.startsWith('content.')) return 'template'
    if (path.startsWith('flowProfiles')) return 'routing'
    if (path.startsWith('flowVisual.')) return 'visual'
    return 'unknown'
  }

  function resolveCommitValidationLocationLabel(
    path: string,
    scope: CommitValidationIssueScope,
    profileId?: string,
    visualNodeId?: string
  ): string {
    if (scope === 'template') {
      const groupMatch = path.match(/content\.groups\[(\d+)\]/)
      if (groupMatch) {
        const gIndex = Number(groupMatch[1] || 0)
        return `题目模板 > 题组 ${gIndex + 1}`
      }
      if (path.startsWith('content.intro')) return '题目模板 > 题目说明'
      return '题目模板'
    }
    if (scope === 'routing') {
      if (profileId) return `地区匹配 > ${formatFlowProfileLabelById(profileId)}`
      return '地区匹配'
    }
    if (scope === 'visual') {
      if (visualNodeId) return `可视流程 > 节点 ${visualNodeId}`
      return '可视流程'
    }
    return '未知区域'
  }

  function normalizeCommitValidationIssue(
    issue: { code?: string; path?: string; message?: string },
    index: number
  ): CommitValidationIssue {
    const code = String(issue?.code || 'unknown_issue')
    const path = String(issue?.path || '')
    const message = String(issue?.message || '流程提交前校验未通过')
    const scope = resolveCommitValidationScope(path)
    const profileMatch = path.match(/flowProfiles\[\d+\]\(([^)]+)\)/)
    const targetProfileId = profileMatch?.[1] ? String(profileMatch[1]) : undefined
    const visualNodeMatch = path.match(/flowVisual\.graph\.nodes\(([^)]+)\)/)
    const targetVisualNodeId = visualNodeMatch?.[1] ? String(visualNodeMatch[1]) : undefined
    const locationLabel = resolveCommitValidationLocationLabel(path, scope, targetProfileId, targetVisualNodeId)
    return {
      key: `${code}:${path}:${index}`,
      code,
      path,
      message,
      scope,
      locationLabel,
      targetProfileId,
      targetVisualNodeId
    }
  }

  function clearCommitValidationIssues() {
    commitValidationIssues.value = []
    activeCommitValidationIssueKey.value = ''
    templateFocusPath.value = ''
  }

  function jumpToCommitValidationIssue(issue: CommitValidationIssue) {
    activeCommitValidationIssueKey.value = issue.key
    if (issue.scope === 'template') {
      templateFocusPath.value = issue.path
      uni.showToast({ title: `已定位：${issue.locationLabel}`, icon: 'none' })
      return
    }
    if (issue.scope === 'routing') {
      templateFocusPath.value = ''
      uni.showToast({ title: `已定位：${issue.locationLabel}`, icon: 'none' })
      return
    }
    if (issue.scope === 'visual') {
      templateFocusPath.value = ''
      readonlyFlowVisualVisible.value = true
      if (issue.targetVisualNodeId) {
        selectFlowVisualNode(issue.targetVisualNodeId)
      }
      uni.showToast({ title: `已定位：${issue.locationLabel}`, icon: 'none' })
      return
    }
    uni.showToast({ title: '该问题暂不支持自动定位', icon: 'none' })
  }

  function jumpToFirstCommitValidationIssue() {
    const first = commitValidationIssues.value[0]
    if (!first) {
      uni.showToast({ title: '当前无阻断项', icon: 'none' })
      return
    }
    jumpToCommitValidationIssue(first)
  }

  function handleModuleCommitValidationFailed(result: ModuleCommitValidationResult): boolean {
    if (!Array.isArray(commitValidationIssues.value) || commitValidationIssues.value.length <= 0) {
      const normalized = (Array.isArray(result.issues) ? result.issues : [])
        .map(normalizeCommitValidationIssue)
      commitValidationIssues.value = normalized
    }
    if (commitValidationIssues.value.length > 0) {
      jumpToCommitValidationIssue(commitValidationIssues.value[0])
    }
    return true
  }

  return {
    commitValidationIssues,
    activeCommitValidationIssueKey,
    templateFocusPath,
    normalizeCommitValidationIssue,
    clearCommitValidationIssues,
    jumpToCommitValidationIssue,
    jumpToFirstCommitValidationIssue,
    handleModuleCommitValidationFailed,
    resolveCommitValidationLocationLabel
  }
}
