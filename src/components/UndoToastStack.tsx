import { useEffect, useRef } from 'react'
import type { UndoEntry } from '../hooks/useUndoQueue'

interface UndoToastStackProps<T> {
  entries: UndoEntry<T>[]
  onUndo: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
}

export function UndoToastStack<T>({
  entries,
  onUndo,
  onPause,
  onResume,
}: UndoToastStackProps<T>) {
  const latestId = entries[entries.length - 1]?.id
  const latestButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (latestId) latestButtonRef.current?.focus()
  }, [latestId])

  if (entries.length === 0) return null

  return (
    <div className="toast-stack" aria-label="Tareas eliminadas recientemente">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="toast"
          role="status"
          onMouseEnter={() => onPause(entry.id)}
          onMouseLeave={() => onResume(entry.id)}
          onFocus={() => onPause(entry.id)}
          onBlur={() => onResume(entry.id)}
        >
          <span>Tarea eliminada</span>
          <button
            type="button"
            ref={entry.id === latestId ? latestButtonRef : undefined}
            onClick={() => onUndo(entry.id)}
          >
            Deshacer
          </button>
        </div>
      ))}
    </div>
  )
}
