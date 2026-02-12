export type PersistenceScheduler = {
  schedule: () => void
  flush: () => void
}

export function createPersistenceScheduler(persist: () => void, waitMs = 300): PersistenceScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    persist()
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      persist()
    }, Math.max(0, Math.floor(Number(waitMs) || 0)))
  }

  return {
    schedule,
    flush
  }
}
