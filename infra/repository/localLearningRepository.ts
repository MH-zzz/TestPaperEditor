import type { Question } from '/types'
import {
  parseFlowExportPackageV2Strict,
  parseQuestionSnapshotListStrict
} from '../../domain/schemas/runtimeBoundarySchemas.ts'

const LOCAL_LEARNING_QUESTIONS_PATHS = [
  '/static/local-learning/questions.json',
  'static/local-learning/questions.json'
]

const LOCAL_LEARNING_FLOWS_PATHS = [
  '/static/local-learning/flows.json',
  'static/local-learning/flows.json'
]

const APP_PLUS_LOCAL_LEARNING_QUESTIONS_PATH = '_www/static/local-learning/questions.json'
const APP_PLUS_LOCAL_LEARNING_FLOWS_PATH = '_www/static/local-learning/flows.json'

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeJsonPayload(raw: unknown): unknown {
  if (typeof raw === 'string') return safeJsonParse(raw)
  return raw
}

async function waitForPlusReady(timeoutMs = 1500): Promise<void> {
  const plusObj = (globalThis as any)?.plus
  if (plusObj?.io) return

  await new Promise<void>((resolve, reject) => {
    const doc = (globalThis as any)?.document
    if (!doc || typeof doc.addEventListener !== 'function') {
      reject(new Error('APP-PLUS runtime unavailable'))
      return
    }

    let done = false
    const onReady = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      if (done) return
      done = true
      try {
        doc.removeEventListener('plusready', onReady)
      } catch {}
      reject(new Error('APP-PLUS plusready timeout'))
    }, timeoutMs)

    doc.addEventListener('plusready', onReady)
  })
}

async function readAppPlusLocalJson(filePath: string): Promise<unknown> {
  await waitForPlusReady()

  return new Promise((resolve, reject) => {
    const plusObj = (globalThis as any)?.plus
    const io = plusObj?.io
    if (!io || typeof io.resolveLocalFileSystemURL !== 'function') {
      reject(new Error('APP-PLUS local filesystem unavailable'))
      return
    }

    io.resolveLocalFileSystemURL(
      filePath,
      (entry: any) => {
        if (!entry || typeof entry.file !== 'function') {
          reject(new Error(`Invalid local entry: ${filePath}`))
          return
        }

        entry.file(
          (file: any) => {
            const ReaderCtor = io.FileReader
            if (typeof ReaderCtor !== 'function') {
              reject(new Error('APP-PLUS FileReader unavailable'))
              return
            }

            const reader = new ReaderCtor()
            reader.onloadend = () => {
              const text = typeof reader.result === 'string' ? reader.result : ''
              resolve(normalizeJsonPayload(text))
            }
            reader.onerror = (err: unknown) => {
              reject(err || new Error(`Read file failed: ${filePath}`))
            }
            try {
              reader.readAsText(file, 'utf-8')
            } catch (err) {
              reject(err)
            }
          },
          (err: unknown) => reject(err || new Error(`Resolve file failed: ${filePath}`))
        )
      },
      (err: unknown) => reject(err || new Error(`Open local path failed: ${filePath}`))
    )
  })
}

function requestJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      success: (res) => {
        const statusCode = Number(res.statusCode || 0)
        if (statusCode >= 200 && statusCode < 300) {
          resolve(normalizeJsonPayload(res.data))
          return
        }
        reject(new Error(`Request failed (${statusCode}) for ${url}`))
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

async function requestJsonWithFallback(paths: string[], appPlusPath: string): Promise<unknown> {
  let lastError: unknown = null

  try {
    return await readAppPlusLocalJson(appPlusPath)
  } catch (err) {
    lastError = err
  }

  for (const path of paths) {
    try {
      return await requestJson(path)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error('Failed to load local json')
}

export async function loadLocalLearningQuestions<TQuestion extends Question = Question>(): Promise<TQuestion[]> {
  const payload = await requestJsonWithFallback(
    LOCAL_LEARNING_QUESTIONS_PATHS,
    APP_PLUS_LOCAL_LEARNING_QUESTIONS_PATH
  )
  const parsed = parseQuestionSnapshotListStrict(payload)
  if (!parsed.ok) {
    throw new Error(`本地学习题目数据不合法：${parsed.error}`)
  }
  return parsed.questions as TQuestion[]
}

export async function loadLocalLearningFlows<TFlowPack extends Record<string, unknown> = Record<string, unknown>>(): Promise<TFlowPack> {
  const payload = await requestJsonWithFallback(
    LOCAL_LEARNING_FLOWS_PATHS,
    APP_PLUS_LOCAL_LEARNING_FLOWS_PATH
  )
  const parsed = parseFlowExportPackageV2Strict(payload)
  if (!parsed.ok) {
    throw new Error(`本地学习流程包数据不合法：${parsed.error}`)
  }
  return parsed.pack as unknown as TFlowPack
}
