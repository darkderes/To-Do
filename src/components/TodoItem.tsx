import { useState } from 'react'
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Calendar,
  DotsSixVertical,
  PencilSimple,
  Sliders,
  Star,
  X,
} from '@phosphor-icons/react'
import { PRIORITY_LABELS, type Priority, type Todo } from '../types'

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
  onRename: (id: string, text: string) => void
  onToggleMyDay: (id: string) => void
  onDelete: (id: string) => void
  onUpdateMeta: (
    id: string,
    dueDate: string | undefined,
    priority: Priority | undefined,
  ) => void
  onReorderKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  onRowPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onLabelClick: (event: MouseEvent) => void
  onSwipeDelete: () => void
  onStartEditingDetails: () => void
}

function addDaysToIso(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
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
  onRename,
  onToggleMyDay,
  onDelete,
  onUpdateMeta,
  onReorderKeyDown,
  onRowPointerDown,
  onRowPointerMove,
  onRowPointerUp,
  onLabelClick,
  onSwipeDelete,
  onStartEditingDetails,
}: TodoItemProps) {
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [isEditingText, setIsEditingText] = useState(false)
  const [textDraft, setTextDraft] = useState(todo.text)
  const [dueDateDraft, setDueDateDraft] = useState(todo.dueDate ?? '')
  const [priorityDraft, setPriorityDraft] = useState<Priority | ''>(
    todo.priority ?? '',
  )
  const showEditForm = isEditingMeta && !isSwipeOpen
  const showTextInput = isEditingText && !isSwipeOpen

  function startEditingMeta() {
    setDueDateDraft(todo.dueDate ?? '')
    setPriorityDraft(todo.priority ?? '')
    setIsEditingMeta(true)
    onStartEditingDetails()
  }

  function startEditingText() {
    setTextDraft(todo.text)
    setIsEditingText(true)
    onStartEditingDetails()
  }

  function commitTextEdit() {
    const trimmed = textDraft.trim()
    if (trimmed && trimmed !== todo.text) onRename(todo.id, trimmed)
    setIsEditingText(false)
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
            {showTextInput ? (
              <input
                type="text"
                className="todo-rename-input"
                value={textDraft}
                autoFocus
                aria-label={`Editar texto de "${todo.text}"`}
                onChange={(event) => setTextDraft(event.target.value)}
                onBlur={commitTextEdit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitTextEdit()
                  if (event.key === 'Escape') setIsEditingText(false)
                }}
              />
            ) : (
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
            )}
          </div>
          <div className="todo-item-actions">
            <button
              type="button"
              className="edit-text"
              aria-label={`Editar "${todo.text}"`}
              onClick={startEditingText}
            >
              <PencilSimple aria-hidden="true" size={16} />
            </button>
            <button
              type="button"
              className="delete"
              aria-label={`Eliminar "${todo.text}"`}
              onClick={() => onDelete(todo.id)}
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
        {showEditForm ? (
          <form
            className="todo-item-meta-form"
            onSubmit={commitMeta}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsEditingMeta(false)
            }}
          >
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
            <button
              type="button"
              className="meta-cancel"
              onClick={() => setIsEditingMeta(false)}
            >
              Cancelar
            </button>
          </form>
        ) : (
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
            <button
              type="button"
              className="edit-meta"
              aria-label={`Editar detalles de "${todo.text}"`}
              onClick={startEditingMeta}
            >
              <Sliders aria-hidden="true" size={14} />
              Detalles
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
