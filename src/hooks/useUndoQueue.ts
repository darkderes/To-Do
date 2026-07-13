import { useCallback, useEffect, useRef, useState } from 'react'

export interface UndoEntry<T> {
  id: string
  item: T
}

const UNDO_TIMEOUT_MS = 5000

export function useUndoQueue<T>() {
  const [entries, setEntries] = useState<UndoEntry<T>[]>([])
  const timers = useRef(new Map<string, number>())

  const clearTimer = useCallback((id: string) => {
    const timeoutId = timers.current.get(id)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      timers.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id)
      setEntries((current) => current.filter((entry) => entry.id !== id))
    },
    [clearTimer],
  )

  const schedule = useCallback(
    (id: string) => {
      clearTimer(id)
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), UNDO_TIMEOUT_MS),
      )
    },
    [clearTimer, dismiss],
  )

  const push = useCallback(
    (item: T) => {
      const id = crypto.randomUUID()
      setEntries((current) => [...current, { id, item }])
      schedule(id)
      return id
    },
    [schedule],
  )

  const pause = useCallback((id: string) => clearTimer(id), [clearTimer])
  const resume = useCallback((id: string) => schedule(id), [schedule])

  useEffect(() => {
    const timersMap = timers.current
    return () => {
      for (const timeoutId of timersMap.values()) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  return { entries, push, dismiss, pause, resume }
}
