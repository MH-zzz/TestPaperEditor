import type { MatchMode } from '/types'

type RuntimeProtocolStep = {
  id: string
  kind: string
  autoNext: string
}

function normalizeText(v: unknown): string {
  return String(v || '').trim()
}

export function buildListeningMatchPairsFromAnswers(
  answers: Record<string, string | string[]>
): Array<{ left: string; right: string }> {
  const pairs: Array<{ left: string; right: string }> = []
  const source = answers || {}
  Object.entries(source).forEach(([left, right]) => {
    const leftId = normalizeText(left)
    if (!leftId) return

    if (Array.isArray(right)) {
      right.forEach((r) => {
        const rightId = normalizeText(r)
        if (!rightId) return
        pairs.push({ left: leftId, right: rightId })
      })
      return
    }

    const rightId = normalizeText(right)
    if (!rightId) return
    pairs.push({ left: leftId, right: rightId })
  })
  return pairs
}

export function applyListeningMatchSelection(
  current: Record<string, string | string[]>,
  leftId: string,
  rightId: string,
  mode: MatchMode
) {
  const next = { ...(current || {}) }
  const left = normalizeText(leftId)
  const right = normalizeText(rightId)
  if (!left || !right) return next

  const currentValue = next[left]

  if (mode === 'one-to-one') {
    if (!Array.isArray(currentValue) && currentValue === right) {
      delete next[left]
      return next
    }

    Object.entries(next).forEach(([k, value]) => {
      if (k === left) return
      if (Array.isArray(value)) {
        const filtered = value.filter((item) => item !== right)
        if (filtered.length === 0) delete next[k]
        else next[k] = filtered
        return
      }
      if (value === right) delete next[k]
    })

    next[left] = right
    return next
  }

  let list: string[] = []
  if (Array.isArray(currentValue)) list = [...currentValue]
  else if (currentValue) list = [currentValue]

  const index = list.indexOf(right)
  if (index > -1) list.splice(index, 1)
  else list.push(right)

  if (list.length === 0) delete next[left]
  else next[left] = list

  return next
}

export function buildListeningMatchRuntimeSteps(): RuntimeProtocolStep[] {
  return [{
    id: 'listening_match_main',
    kind: 'match-main',
    autoNext: 'tapNext'
  }]
}
