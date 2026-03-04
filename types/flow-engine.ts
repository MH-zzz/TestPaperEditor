import type { QuestionType } from './question'

export type FlowModuleStatus = 'draft' | 'published' | 'archived'

export interface FlowModuleRef {
  id: string
  version: number
}

// ==================== 通用流程协议（跨题型） ====================

export type FlowAutoNextSignal = 'tapNext' | 'audioEnded' | 'countdownEnded' | 'timeEnded'

export interface FlowStepProtocol {
  id: string
  kind: string
  title?: string
  showTitle?: boolean
  autoNext?: FlowAutoNextSignal | string
  onEnterEffects?: FlowEffectProtocol[]
  onEndEffects?: FlowEffectProtocol[]
}

export interface FlowEffectProtocol {
  kind: string
  [key: string]: unknown
}

export interface FlowModuleProtocol {
  kind: string
  id: string
  version: number
  name: string
  note?: string
  status?: FlowModuleStatus
}

export interface QuestionInstanceFlowBindingV1 {
  profileId?: string
  module?: FlowModuleRef
  // Whitelisted per-step override patches, keyed by stable step key.
  overrides?: Record<string, Record<string, unknown>>
}

export interface FlowProfileV1 {
  id: string
  questionType: QuestionType
  region?: string
  scene?: string
  grade?: string
  module: FlowModuleRef
  priority?: number
  enabled?: boolean
  note?: string
  createdAt?: string
  updatedAt?: string
}

export type ListeningChoiceAudioSource = 'description' | 'content'

export type ListeningChoiceFlowModulePerGroupStepV1 =
  | {
      kind: 'playAudio'
      showTitle?: boolean
      audioSource: ListeningChoiceAudioSource
      // For content-audio replay loop: countdown seconds between plays.
      repeatGapSeconds?: number
      showQuestionTitle?: boolean
      showQuestionTitleDescription?: boolean
      showGroupPrompt?: boolean
    }
  | {
      kind: 'countdown'
      showTitle?: boolean
      showQuestionTitle?: boolean
      // Runtime seconds are sourced from group.prepareSeconds in template data.
      // This field acts as fallback only.
      seconds?: number
      label?: string
    }
  | {
      kind: 'promptTone'
      showTitle?: boolean
      url?: string
    }
  | {
      // Hear-answer V2: recording guide step between content playback and recording.
      kind: 'recordGuide'
      showTitle?: boolean
      showQuestionTitle?: boolean
      showQuestionTitleDescription?: boolean
      showGroupPrompt?: boolean
      // Text source for guide body.
      textSource?: 'question' | 'group'
      // Audio source for guide playback.
      audioSource?: 'question' | 'group' | 'fixed'
      // Used when audioSource = fixed.
      url?: string
      // Controls whether this step replaces page body or keeps previous screen.
      screenStrategy?: 'replaceBody' | 'reusePrevious'
    }
  | {
      kind: 'answerChoice'
      showTitle?: boolean
      showQuestionTitle?: boolean
      showQuestionTitleDescription?: boolean
      showGroupPrompt?: boolean
    }

export interface ListeningChoiceFlowModuleV1 {
  kind: 'listening_choice'
  id: string
  version: number
  name: string
  note?: string
  status?: FlowModuleStatus
  introShowTitle?: boolean
  introShowTitleDescription?: boolean
  introShowDescription?: boolean
  introCountdownEnabled?: boolean
  introCountdownShowTitle?: boolean
  introCountdownSeconds?: number
  introCountdownLabel?: string
  perGroupSteps: ListeningChoiceFlowModulePerGroupStepV1[]
  createdAt?: string
  updatedAt?: string
}

export interface FlowCompileRequest {
  questionType: QuestionType
  moduleRef: FlowModuleRef
  profileId?: string
  overrides?: Record<string, Record<string, unknown>>
}
