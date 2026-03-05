import type { SpeakingStepsQuestion, SpeakingStepsStep } from '/types'

type FooterMode = 'play-audio' | 'countdown' | 'record' | 'none'

function normalizeId(v: unknown, fallback: string): string {
  const id = String(v || '').trim()
  return id || fallback
}

function cloneExpandedStep(step: SpeakingStepsStep, nextId: string): SpeakingStepsStep {
  return {
    ...(step as any),
    id: nextId
  } as SpeakingStepsStep
}

export function expandSpeakingSteps(
  steps: SpeakingStepsStep[] = [],
  subQuestions: Array<{ id?: string }> = []
): SpeakingStepsStep[] {
  const out: SpeakingStepsStep[] = []
  const list = Array.isArray(steps) ? steps : []
  const questions = Array.isArray(subQuestions) ? subQuestions : []

  list.forEach((step, stepIndex) => {
    if (step?.type !== 'loop-sub-questions') {
      out.push(step)
      return
    }

    const loopId = normalizeId((step as any)?.id, `loop_${stepIndex + 1}`)
    const templateSteps = Array.isArray(step.stepsPerQuestion) ? step.stepsPerQuestion : []
    if (questions.length === 0 || templateSteps.length === 0) return

    questions.forEach((_, questionIndex) => {
      templateSteps.forEach((subStep, templateIndex) => {
        const rawSubId = normalizeId((subStep as any)?.id, `loop_step_${templateIndex + 1}`)
        const expandedId = `${rawSubId}__${loopId}_q${questionIndex + 1}`
        out.push(cloneExpandedStep(subStep, expandedId))
      })
    })
  })

  return out
}

export function expandSpeakingQuestionSteps(question: SpeakingStepsQuestion): SpeakingStepsStep[] {
  const q = question || ({} as SpeakingStepsQuestion)
  return expandSpeakingSteps(q.steps || [], q.subQuestions || [])
}

export function resolveSpeakingStepFooterMode(
  step?: { type?: string } | null
): FooterMode {
  const type = String(step?.type || '').trim()
  if (type === 'play-audio') return 'play-audio'
  if (type === 'countdown') return 'countdown'
  if (type === 'record') return 'record'
  return 'none'
}
