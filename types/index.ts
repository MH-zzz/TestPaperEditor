export * from './question'
export * from './flow-engine'
export * from './flow-visual'

// 编辑器模式
export type EditorMode = 'edit' | 'preview'

// 渲染模式
export type RenderMode = 'preview' | 'exam' | 'review'

// 用户答案
export interface UserAnswer {
  questionId: string
  subQuestionId?: string
  answer: string | string[]
  timestamp: number
}

// 答题状态
export interface AnswerState {
  answers: Record<string, UserAnswer>
  currentIndex: number
  startTime: number
}
