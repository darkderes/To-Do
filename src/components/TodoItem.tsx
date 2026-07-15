import { useState } from 'react'
import type {
  CSSProperties,
  FormEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { PRIORITY_LABELS, type Priority, type Todo } from '../types'

interface TodoItemProps {
  todo: Todo
  rowOffset: number
  rowTransitionNone: boolean
  liStyle: CSSProperties
  isSwipeOpen: boolean
  isInMyDay: boolean
  onToggle: (id: string) => void
  onToggleMyDay: (id: string) => void
  onDelete: (id: string) => void
  onUpdateMeta: (
    id: string,
    dueDate: string | undefined,
    priority: Priority | undefined,
  ) => void
  onRowPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onLabelClick: (event: MouseEvent) => void
  onSwipeDelete: () => void
  onHandlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onHandlePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onHandlePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onStartEditingDetails: () => void
}

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.split('-')
  return `${day}/${month}/${year}`
}

export function TodoItem({
  todo,
  rowOffset,
  rowTransitionNone,
  liStyle,
  isSwipeOpen,
  isInMyDay,
  onToggle,
  onToggleMyDay,
  onDelete,
  onUpdateMeta,
  onRowPointerDown,
  onRowPointerMove,
  onRowPointerUp,
  onLabelClick,
  onSwipeDelete,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onStartEditingDetails,
}: TodoItemProps) {
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState(todo.dueDate ?? '')
  const [priorityDraft, setPriorityDraft] = useState<Priority | ''>(
    todo.priority ?? '',
  )
  const showEditForm = isEditingMeta && !isSwipeOpen

  function startEditingMeta() {
    setDueDateDraft(todo.dueDate ?? '')
    setPriorityDraft(todo.priority ?? '')
    setIsEditingMeta(true)
    onStartEditingDetails()
  }

  function commitMeta(event: FormEvent) {
    event.preventDefault()
    onUpdateMeta(todo.id, dueDateDraft || undefined, priorityDraft || undefined)
    setIsEditingMeta(false)
  }

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
              aria-hidden="true"
              tabIndex={-1}
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            >
              ⠿
            </button>
            <label onClick={onLabelClick}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
              />
              <span className={todo.completed ? 'completed' : ''}>
                {todo.text}
              </span>
            </label>
          </div>
          <div className="todo-item-actions">
            <button
              type="button"
              className="delete"
              aria-label={`Eliminar "${todo.text}"`}
              onClick={() => onDelete(todo.id)}
            >
              ×
            </button>
          </div>
        </div>
        {showEditForm ? (
          <form className="todo-item-meta-form" onSubmit={commitMeta}>
            <input
              type="date"
              value={dueDateDraft}
              aria-label={`Fecha límite de "${todo.text}"`}
              onChange={(event) => setDueDateDraft(event.target.value)}
            />
            <select
              value={priorityDraft}
              aria-label={`Prioridad de "${todo.text}"`}
              onChange={(event) =>
                setPriorityDraft(event.target.value as Priority | '')
              }
            >
              <option value="">Sin prioridad</option>
              {(['low', 'medium', 'high'] as const).map((option) => (
                <option key={option} value={option}>
                  {PRIORITY_LABELS[option]}
                </option>
              ))}
            </select>
            <button type="submit">Guardar</button>
          </form>
        ) : (
          <div className="todo-item-meta">
            {todo.dueDate && (
              <span className="due-badge">
                📅 {formatDueDate(todo.dueDate)}
              </span>
            )}
            {todo.priority && (
              <span className={`priority-badge priority-${todo.priority}`}>
                {PRIORITY_LABELS[todo.priority]}
              </span>
            )}
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
              📅
            </button>
            <button
              type="button"
              className="edit-meta"
              aria-label={`Editar detalles de "${todo.text}"`}
              onClick={startEditingMeta}
            >
              ✎ Detalles
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
