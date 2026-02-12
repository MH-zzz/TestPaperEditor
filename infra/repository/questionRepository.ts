import type { Question } from '/types'

const CURRENT_QUESTION_KEY = 'currentQuestion'
const RECENT_QUESTIONS_KEY = 'recentQuestions'

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadCurrentQuestionSnapshot<TQuestion extends Question = Question>(): TQuestion | null {
  try {
    const stored = uni.getStorageSync(CURRENT_QUESTION_KEY)
    if (!stored) return null
    const parsed = safeJsonParse(stored)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as TQuestion
  } catch {
    return null
  }
}

export function saveCurrentQuestionSnapshot(question: Question): void {
  try {
    uni.setStorageSync(CURRENT_QUESTION_KEY, JSON.stringify(question))
  } catch {}
}

export function loadRecentQuestions<TQuestion extends Question = Question>(): TQuestion[] {
  try {
    const stored = uni.getStorageSync(RECENT_QUESTIONS_KEY)
    if (!stored) return []
    const parsed = safeJsonParse(stored)
    return Array.isArray(parsed) ? (parsed as TQuestion[]) : []
  } catch {
    return []
  }
}

export function saveRecentQuestions(questions: Question[]): void {
  try {
    uni.setStorageSync(RECENT_QUESTIONS_KEY, JSON.stringify(questions || []))
  } catch {}
}
