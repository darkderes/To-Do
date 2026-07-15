import { useEffect, useState } from 'react'
import { getTodayString } from '../types'

export function useToday() {
  const [today, setToday] = useState(getTodayString)

  useEffect(() => {
    function refresh() {
      setToday(getTodayString())
    }
    const now = new Date()
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    )
    const timeoutId = window.setTimeout(
      refresh,
      nextMidnight.getTime() - now.getTime() + 1000,
    )
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [today])

  return today
}
