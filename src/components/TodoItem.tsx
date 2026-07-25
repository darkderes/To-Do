import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { Calendar, DotsSixVertical, Star } from '@phosphor-icons/react'
import { addDaysToIso, PRIORITY_LABELS, type Todo } from '../types'

interface TodoItemProps {
  todo: Todo
  today: string
  rowOffset: number
  rowTransitionNone: boolean
  isReorderActive: boolean
  liStyle: CSSProperties
  isSwipeOpen: boolean
  isInMyDay: boolean
  onToggle: (id: string) => void
  onToggleMyDay: (id: string) => void
  onReorderKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  onRowPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onLabelClick: (event: MouseEvent) => void
  onSwipeDelete: () => void
  onOpenDetails: () => void
}

function formatDueDate(dueDate: string, today: string) {
  const [year, month, day] = dueDate.split('-')
  const formatted = `${day}/${month}/${year}`
  if (dueDate < today) return `Vencida · ${formatted}`
  if (dueDate === today) return 'Hoy'
  if (dueDate === addDaysToIso(today, 1)) return 'Mañana'
  return formatted
}

export function TodoItem({
  todo,
  today,
  rowOffset,
  rowTransitionNone,
  isReorderActive,
  liStyle,
  isSwipeOpen,
  isInMyDay,
  onToggle,
  onToggleMyDay,
  onReorderKeyDown,
  onRowPointerDown,
  onRowPointerMove,
  onRowPointerUp,
  onLabelClick,
  onSwipeDelete,
  onOpenDetails,
}: TodoItemProps) {
  return (
    <li className="todo-item" style={liStyle}>
      <div className="todo-item-reveal">
        <button
          type="button"
          className="todo-item-swipe-delete"
          aria-label={`Quitar "${todo.text}"`}
          onClick={onSwipeDelete}
        >
          Eliminar
        </button>
      </div>
      <div
        className="todo-item-row"
        style={{
          transform: `translateX(${rowOffset}px)`,
          transition: rowTransitionNone ? 'none' : undefined,
          touchAction: isReorderActive ? 'none' : undefined,
        }}
        onPointerDown={onRowPointerDown}
        onPointerMove={onRowPointerMove}
        onPointerUp={onRowPointerUp}
        onPointerCancel={onRowPointerUp}
      >
        <div className="todo-item-main">
          <div className="todo-item-content">
            <button
              type="button"
              className="todo-drag-handle"
              aria-label={`Reordenar "${todo.text}" (flechas arriba/abajo)`}
              onKeyDown={onReorderKeyDown}
            >
              <DotsSixVertical aria-hidden="true" size={18} />
            </button>
            <label onClick={onLabelClick}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
              />
              <span
                className={todo.completed ? 'completed' : ''}
                onClick={(event) => {
                  event.preventDefault()
                  if (isSwipeOpen) return
                  onOpenDetails()
                }}
              >
                {todo.text}
              </span>
            </label>
          </div>
          <div className="todo-item-actions">
            <button
              type="button"
              className={`my-day-toggle${isInMyDay ? ' active' : ''}`}
              aria-label={
                isInMyDay
                  ? `Quitar "${todo.text}" de Mi día`
                  : `Añadir "${todo.text}" a Mi día`
              }
              aria-pressed={isInMyDay}
              onClick={() => onToggleMyDay(todo.id)}
            >
              <Star
                aria-hidden="true"
                size={16}
                weight={isInMyDay ? 'fill' : 'regular'}
              />
            </button>
          </div>
        </div>
        {(todo.dueDate || todo.priority) && (
          <div className="todo-item-meta">
            {todo.dueDate && (
              <span
                className={`due-badge${
                  todo.dueDate < today
                    ? ' overdue'
                    : todo.dueDate === today
                      ? ' due-today'
                      : ''
                }`}
              >
                <Calendar aria-hidden="true" size={14} />
                {formatDueDate(todo.dueDate, today)}
              </span>
            )}
            {todo.priority && (
              <span className={`priority-badge priority-${todo.priority}`}>
                {PRIORITY_LABELS[todo.priority]}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
