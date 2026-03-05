type ListeningFillTemplatePart =
  | { type: 'text'; value: string }
  | { type: 'blank'; id: string; index: string }

type ListeningFillBlankLike = {
  id?: string
  answer?: string[]
  acceptVariants?: boolean
}

type ListeningFillQuestionLike = {
  id?: string
  template?: string
  blanks?: ListeningFillBlankLike[]
  wordBank?: string[]
}

type RuntimeProtocolStep = {
  id: string
  kind: string
  autoNext: string
}

function normalizeText(v: unknown): string {
  return String(v || '')
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function seededShuffleByText(words: string[], seedText: string): string[] {
  const arr = [...(Array.isArray(words) ? words : [])]
  let seed = hashSeed(normalizeText(seedText)) || 1

  const nextRand = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

export function parseListeningFillTemplate(template: string): ListeningFillTemplatePart[] {
  const parts: ListeningFillTemplatePart[] = []
  const source = normalizeText(template)
  const regex = /\{\{(\d+)\}\}/g

  let lastIndex = 0
  let match: RegExpExecArray | null = null
  while ((match = regex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: source.substring(lastIndex, match.index)
      })
    }

    parts.push({
      type: 'blank',
      id: `blank_${match[1]}`,
      index: String(match[1])
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < source.length) {
    parts.push({
      type: 'text',
      value: source.substring(lastIndex)
    })
  }

  return parts
}

function toUniqueList(values: unknown[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  values.forEach((item) => {
    const v = normalizeText(item)
    if (!v || seen.has(v)) return
    seen.add(v)
    out.push(v)
  })
  return out
}

export function resolveListeningFillWordBank(question: ListeningFillQuestionLike): string[] {
  const q = question || {}
  const seed = `${normalizeText(q.id)}|${normalizeText(q.template)}`
  const provided = Array.isArray(q.wordBank) ? toUniqueList(q.wordBank) : []
  if (provided.length > 0) {
    return seededShuffleByText(provided, `${seed}|wordBank`)
  }

  const fromAnswers = toUniqueList(
    (q.blanks || []).map((blank) => (Array.isArray(blank?.answer) ? blank.answer[0] : ''))
  )
  return seededShuffleByText(fromAnswers, `${seed}|auto`)
}

export function isListeningFillAnswerCorrect(
  blank: ListeningFillBlankLike | null | undefined,
  userAnswer: string
): boolean {
  const answerList = Array.isArray(blank?.answer) ? blank?.answer : []
  if (answerList.length === 0) return false

  const userRaw = normalizeText(userAnswer)
  if (!blank?.acceptVariants) {
    return answerList.some((item) => normalizeText(item) === userRaw)
  }

  const userNormalized = userRaw.trim().toLowerCase()
  return answerList.some((item) => normalizeText(item).trim().toLowerCase() === userNormalized)
}

export function buildListeningFillRuntimeSteps(): RuntimeProtocolStep[] {
  return [{
    id: 'listening_fill_main',
    kind: 'fill-main',
    autoNext: 'tapNext'
  }]
}
