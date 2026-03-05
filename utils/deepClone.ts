import { isProxy, toRaw } from 'vue'

function normalizeForClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value == null) return value
  const valueType = typeof value
  if (valueType !== 'object') return value

  const source = isProxy(value) ? toRaw(value) : value
  const sourceObj = source as unknown as object

  if (seen.has(sourceObj)) {
    return seen.get(sourceObj) as T
  }

  if (source instanceof Date) {
    return new Date(source.getTime()) as T
  }

  if (Array.isArray(source)) {
    const out: unknown[] = []
    seen.set(sourceObj, out)
    source.forEach((item, index) => {
      out[index] = normalizeForClone(item, seen)
    })
    return out as T
  }

  if (source instanceof Map) {
    const out = new Map()
    seen.set(sourceObj, out)
    source.forEach((v, k) => {
      out.set(normalizeForClone(k, seen), normalizeForClone(v, seen))
    })
    return out as T
  }

  if (source instanceof Set) {
    const out = new Set()
    seen.set(sourceObj, out)
    source.forEach((item) => {
      out.add(normalizeForClone(item, seen))
    })
    return out as T
  }

  const out = {} as Record<string, unknown>
  seen.set(sourceObj, out)
  Object.keys(source as Record<string, unknown>).forEach((key) => {
    out[key] = normalizeForClone((source as Record<string, unknown>)[key], seen)
  })
  return out as T
}

export function deepClone<T>(value: T): T {
  const structuredCloneFn = (globalThis as { structuredClone?: (<V>(input: V) => V) }).structuredClone
  if (typeof structuredCloneFn === 'function') {
    try {
      return structuredCloneFn(value)
    } catch {
      return structuredCloneFn(normalizeForClone(value))
    }
  }
  return JSON.parse(JSON.stringify(normalizeForClone(value))) as T
}
