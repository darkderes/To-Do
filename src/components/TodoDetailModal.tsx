import { useEffect, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import {
  addDaysToIso,
  PRIORITY_LABELS,
  type Priority,
  type Todo,
} from '../types'

export interface TodoDetailUpdates {
  text: string
  description: string | undefined
  dueDate: string | undefined
  priority: Priority | undefined
}

interface TodoDetailModalProps {
  todo: Todo
  listName: string
  today: string
  onClose: () => void
  onSave: (id: string, updates: TodoDetailUpdates) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}

function formatHeaderDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const formatted = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function TodoDetailModal({
  todo,
  listName,
  today,
  onClose,
  onSave,
  onDelete,
  onToggle,
}: TodoDetailModalProps) {
  const [textDraft, setTextDraft] = useState(todo.text)
  const [descriptionDraft, setDescriptionDraft] = useState(
    todo.description ?? '',
  )
  const [dueDateDraft, setDueDateDraft] = useState(todo.dueDate ?? '')
  const [priorityDraft, setPriorityDraft] = useState<Priority | ''>(
    todo.priority ?? '',
  )
  const [showCustomDate, setShowCustomDate] = useState(
    !!todo.dueDate &&
      todo.dueDate !== today &&
      todo.dueDate !== addDaysToIso(today, 1),
  )
  const titleInputRef = useRef<HTMLInputElement>(null)
  const tomorrow = addDaysToIso(today, 1)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function pickDate(value: string) {
    setDueDateDraft((current) => (current === value ? '' : value))
    setShowCustomDate(false)
  }

  function pickPriority(value: Priority) {
    setPriorityDraft((current) => (current === value ? '' : value))
  }

  function handleSave() {
    const trimmed = textDraft.trim()
    if (!trimmed) {
      titleInputRef.current?.focus()
      return
    }
    onSave(todo.id, {
      text: trimmed,
      description: descriptionDraft.trim() || undefined,
      dueDate: dueDateDraft || undefined,
      priority: priorityDraft || undefined,
    })
    onClose()
  }

  function handleDelete() {
    onDelete(todo.id)
    onClose()
  }

  return (
    <div className="todo-modal-backdrop" onClick={onClose}>
      <div
        className="todo-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Detalles de la tarea"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="todo-modal-header">
          <span className="todo-modal-eyebrow">
            {listName} · {formatHeaderDate(today)}
          </span>
          <button
            type="button"
            className="todo-modal-close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="todo-modal-title-row">
          <input
            type="checkbox"
            checked={todo.completed}
            aria-label={
              todo.completed
                ? 'Marcar como pendiente'
                : 'Marcar como completada'
            }
            onChange={() => onToggle(todo.id)}
          />
          <input
            ref={titleInputRef}
            type="text"
            className={`todo-modal-title-input${todo.completed ? ' completed' : ''}`}
            value={textDraft}
            aria-label="Título de la tarea"
            onChange={(event) => setTextDraft(event.target.value)}
          />
        </div>

        <div className="todo-modal-field">
          <label htmlFor="todo-modal-description">Descripción</label>
          <textarea
            id="todo-modal-description"
            value={descriptionDraft}
            placeholder="Añade notas o detalles…"
            rows={4}
            onChange={(event) => setDescriptionDraft(event.target.value)}
          />
        </div>

        <div className="todo-modal-field">
          <span className="todo-modal-field-label">Fecha de vencimiento</span>
          <div className="todo-modal-chip-row">
            <button
              type="button"
              className={`todo-modal-chip${dueDateDraft === today ? ' active' : ''}`}
              onClick={() => pickDate(today)}
            >
              Hoy
            </button>
            <button
              type="button"
              className={`todo-modal-chip${dueDateDraft === tomorrow ? ' active' : ''}`}
              onClick={() => pickDate(tomorrow)}
            >
              Mañana
            </button>
            <button
              type="button"
              className={`todo-modal-chip${showCustomDate ? ' active' : ''}`}
              onClick={() => setShowCustomDate((open) => !open)}
            >
              Personalizado
            </button>
          </div>
          {showCustomDate && (
            <input
              type="date"
              className="todo-modal-date-input"
              value={dueDateDraft}
              aria-label="Fecha personalizada"
              onChange={(event) => setDueDateDraft(event.target.value)}
            />
          )}
        </div>

        <div className="todo-modal-field">
          <span className="todo-modal-field-label">Prioridad</span>
          <div className="todo-modal-chip-row">
            {(['low', 'medium', 'high'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`todo-modal-chip${
                  priorityDraft === option ? ` active priority-${option}` : ''
                }`}
                onClick={() => pickPriority(option)}
              >
                {PRIORITY_LABELS[option]} prioridad
              </button>
            ))}
          </div>
        </div>

        <div className="todo-modal-footer">
          <button
            type="button"
            className="todo-modal-delete"
            onClick={handleDelete}
          >
            Eliminar tarea
          </button>
          <div className="todo-modal-footer-actions">
            <button
              type="button"
              className="todo-modal-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="todo-modal-save"
              onClick={handleSave}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
