import { useState } from 'react'
import type { FormEvent } from 'react'
import { PRIORITY_LABELS, type Priority, type Todo } from '../types'

interface TodoItemProps {
  todo: Todo
  canMoveUp: boolean
  canMoveDown: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onUpdateMeta: (id: string, dueDate: string | undefined, priority: Priority | undefined) => void
}

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.split('-')
  return `${day}/${month}/${year}`
}

export function TodoItem({
  todo,
  canMoveUp,
  canMoveDown,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdateMeta,
}: TodoItemProps) {
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState(todo.dueDate ?? '')
  const [priorityDraft, setPriorityDraft] = useState<Priority | ''>(todo.priority ?? '')

  function startEditingMeta() {
    setDueDateDraft(todo.dueDate ?? '')
    setPriorityDraft(todo.priority ?? '')
    setIsEditingMeta(true)
  }

  function commitMeta(event: FormEvent) {
    event.preventDefault()
    onUpdateMeta(todo.id, dueDateDraft || undefined, priorityDraft || undefined)
    setIsEditingMeta(false)
  }

  return (
    <li className="todo-item">
      <div className="todo-item-main">
        <label>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo.id)}
          />
          <span className={todo.completed ? 'completed' : ''}>{todo.text}</span>
        </label>
        <div className="todo-item-actions">
          <button
            type="button"
            className="reorder"
            aria-label={`Mover "${todo.text}" arriba`}
            disabled={!canMoveUp}
            onClick={() => onMoveUp(todo.id)}
          >
            ▲
          </button>
          <button
            type="button"
            className="reorder"
            aria-label={`Mover "${todo.text}" abajo`}
            disabled={!canMoveDown}
            onClick={() => onMoveDown(todo.id)}
          >
            ▼
          </button>
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
      {isEditingMeta ? (
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
            onChange={(event) => setPriorityDraft(event.target.value as Priority | '')}
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
          {todo.dueDate && <span className="due-badge">📅 {formatDueDate(todo.dueDate)}</span>}
          {todo.priority && (
            <span className={`priority-badge priority-${todo.priority}`}>
              {PRIORITY_LABELS[todo.priority]}
            </span>
          )}
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
    </li>
  )
}
