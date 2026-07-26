import { useEffect, useRef } from 'react'
import { X } from '@phosphor-icons/react'

export interface ToastItem {
  id: string
  message: string
  focusOnMount: boolean
}

interface UndoToastStackProps {
  items: ToastItem[]
  onUndo: (id: string) => void
  onDismiss: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
}

export function UndoToastStack({
  items,
  onUndo,
  onDismiss,
  onPause,
  onResume,
}: UndoToastStackProps) {
  const latest = items[items.length - 1]
  const latestId = latest?.id
  const latestFocusOnMount = latest?.focusOnMount ?? false
  const latestButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (latestId && latestFocusOnMount) latestButtonRef.current?.focus()
  }, [latestId, latestFocusOnMount])

  if (items.length === 0) return null

  return (
    <div className="toast-stack" aria-label="Acciones recientes">
      {items.map((item) => (
        <div
          key={item.id}
          className="toast"
          role="status"
          onMouseEnter={() => onPause(item.id)}
          onMouseLeave={() => onResume(item.id)}
          onFocus={() => onPause(item.id)}
          onBlur={() => onResume(item.id)}
        >
          <span>{item.message}</span>
          <button
            type="button"
            ref={item.id === latestId ? latestButtonRef : undefined}
            onClick={() => onUndo(item.id)}
          >
            Deshacer
          </button>
          <button
            type="button"
            className="toast-close"
            aria-label="Descartar aviso"
            onClick={() => onDismiss(item.id)}
          >
            <X aria-hidden="true" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
