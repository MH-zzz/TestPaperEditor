import { z } from 'zod'
import type { Question } from '/types'

const nonEmptyTextSchema = z.string().trim().min(1)

const questionTypeSchema = z.enum([
  'listening_choice',
  'speaking_hear_answer',
  'listening_fill',
  'listening_match',
  'listening_order',
  'speaking_steps'
])

const questionMetadataSchema = z.object({}).passthrough()

const questionSnapshotSchema = z.object({
  id: nonEmptyTextSchema,
  type: questionTypeSchema,
  metadata: questionMetadataSchema.optional()
}).passthrough()

const flowExportCapabilitiesSchema = z.object({
  branchNodeMvp: z.boolean().optional(),
  loopNodeMvp: z.boolean().optional()
}).passthrough()

const flowModuleRefSchema = z.object({
  id: nonEmptyTextSchema
}).passthrough()

const flowProfileRefSchema = z.object({
  id: nonEmptyTextSchema
}).passthrough()

const publishLogRefSchema = z.object({
  id: nonEmptyTextSchema
}).passthrough()

const flowExportPackageV2Schema = z.object({
  schemaVersion: z.literal(2),
  exportedAt: nonEmptyTextSchema.optional(),
  exportCapabilities: flowExportCapabilitiesSchema.optional(),
  listeningChoiceModules: z.array(flowModuleRefSchema).optional(),
  flowProfiles: z.array(flowProfileRefSchema).optional(),
  publishLogs: z.array(publishLogRefSchema).optional()
}).passthrough()

export type ParsedFlowExportPackageV2 = z.infer<typeof flowExportPackageV2Schema>
const questionSnapshotListSchema = z.array(questionSnapshotSchema)
const positiveIntSchema = z.number().int().min(1)

const flowModuleStorageItemSchema = z.object({
  id: nonEmptyTextSchema,
  version: positiveIntSchema
}).passthrough()

const flowModulesStorageSchema = z.object({
  listeningChoice: z.array(flowModuleStorageItemSchema).optional()
}).passthrough()

const flowProfileStorageItemSchema = z.object({
  id: nonEmptyTextSchema,
  questionType: questionTypeSchema,
  module: z.object({
    id: nonEmptyTextSchema,
    version: positiveIntSchema
  }).passthrough()
}).passthrough()

const flowProfilesStorageSchema = z.object({
  profiles: z.array(flowProfileStorageItemSchema).optional()
}).passthrough()

const contentTemplateLikeSchema = z.object({
  version: z.number().optional(),
  content: z.object({}).passthrough().optional()
}).passthrough()

const contentTemplatesStorageSchema = z.object({
  listeningChoice: contentTemplateLikeSchema.optional(),
  speakingHearAnswer: contentTemplateLikeSchema.optional()
}).passthrough()

function formatSchemaIssuePath(path: Array<string | number>): string {
  if (!Array.isArray(path) || path.length <= 0) return '(root)'
  return path
    .map((part) => (typeof part === 'number' ? `[${part}]` : String(part)))
    .join('.')
    .replace('.[', '[')
}

function formatFirstSchemaIssue(error: z.ZodError, fallback: string): string {
  const issue = error.issues?.[0]
  if (!issue) return fallback
  const path = formatSchemaIssuePath(issue.path)
  const msg = String(issue.message || fallback)
  return `${path}: ${msg}`
}

export function parseQuestionSnapshot(payload: unknown): Question | null {
  const parsed = questionSnapshotSchema.safeParse(payload)
  if (!parsed.success) return null
  return parsed.data as Question
}

export function parseQuestionSnapshotList(payload: unknown): Question[] {
  if (!Array.isArray(payload)) return []
  const out: Question[] = []
  for (const item of payload) {
    const parsed = parseQuestionSnapshot(item)
    if (parsed) out.push(parsed)
  }
  return out
}

export function parseQuestionSnapshotListStrict(payload: unknown): { ok: true; questions: Question[] } | { ok: false; error: string } {
  const parsed = questionSnapshotListSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: formatFirstSchemaIssue(parsed.error, 'questions payload schema invalid')
    }
  }
  return {
    ok: true,
    questions: parsed.data as Question[]
  }
}

export function parseFlowExportPackageV2(payload: unknown): ParsedFlowExportPackageV2 | null {
  const parsed = flowExportPackageV2Schema.safeParse(payload)
  if (!parsed.success) return null
  return parsed.data
}

export function parseFlowExportPackageV2Strict(payload: unknown): { ok: true; pack: ParsedFlowExportPackageV2 } | { ok: false; error: string } {
  const parsed = flowExportPackageV2Schema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: formatFirstSchemaIssue(parsed.error, 'flow export payload schema invalid')
    }
  }
  return {
    ok: true,
    pack: parsed.data
  }
}

export type ParsedFlowModulesStoragePayload = {
  listeningChoice: Array<Record<string, unknown>>
}

export function parseFlowModulesStoragePayloadStrict(payload: unknown): { ok: true; payload: ParsedFlowModulesStoragePayload } | { ok: false; error: string } {
  const parsed = flowModulesStorageSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: formatFirstSchemaIssue(parsed.error, 'flow modules storage payload schema invalid')
    }
  }
  return {
    ok: true,
    payload: {
      listeningChoice: (parsed.data.listeningChoice || []) as Array<Record<string, unknown>>
    }
  }
}

export type ParsedFlowProfilesStoragePayload = {
  profiles: Array<Record<string, unknown>>
}

export function parseFlowProfilesStoragePayloadStrict(payload: unknown): { ok: true; payload: ParsedFlowProfilesStoragePayload } | { ok: false; error: string } {
  const parsed = flowProfilesStorageSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: formatFirstSchemaIssue(parsed.error, 'flow profiles storage payload schema invalid')
    }
  }
  return {
    ok: true,
    payload: {
      profiles: (parsed.data.profiles || []) as Array<Record<string, unknown>>
    }
  }
}

export type ParsedContentTemplatesStoragePayload = {
  listeningChoice?: Record<string, unknown>
  speakingHearAnswer?: Record<string, unknown>
}

export function parseContentTemplatesStoragePayloadStrict(payload: unknown): { ok: true; payload: ParsedContentTemplatesStoragePayload } | { ok: false; error: string } {
  const parsed = contentTemplatesStorageSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: formatFirstSchemaIssue(parsed.error, 'content templates storage payload schema invalid')
    }
  }
  return {
    ok: true,
    payload: {
      listeningChoice: parsed.data.listeningChoice as Record<string, unknown> | undefined,
      speakingHearAnswer: parsed.data.speakingHearAnswer as Record<string, unknown> | undefined
    }
  }
}
