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
  const [completedDraft, setCompletedDraft] = useState(todo.completed)
  const [showCustomDate, setShowCustomDate] = useState(
    !!todo.dueDate &&
      todo.dueDate !== today &&
      todo.dueDate !== addDaysToIso(today, 1),
  )
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const tomorrow = addDaysToIso(today, 1)

  const isDirty =
    textDraft !== todo.text ||
    descriptionDraft !== (todo.description ?? '') ||
    dueDateDraft !== (todo.dueDate ?? '') ||
    priorityDraft !== (todo.priority ?? '') ||
    completedDraft !== todo.completed

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    titleInputRef.current?.focus()
  }, [])

  function closeDialog() {
    const dialog = dialogRef.current
    if (dialog?.open && typeof dialog.close === 'function') dialog.close()
    onClose()
  }

  function requestClose() {
    if (
      isDirty &&
      !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')
    ) {
      return
    }
    closeDialog()
  }

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
    if (completedDraft !== todo.completed) onToggle(todo.id)
    closeDialog()
  }

  function handleDelete() {
    onDelete(todo.id)
    closeDialog()
  }

  return (
    <dialog
      ref={dialogRef}
      className="todo-modal-dialog"
      aria-label="Detalles de la tarea"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        requestClose()
      }}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div className="todo-modal">
        <h2 className="sr-only">Detalles de la tarea</h2>
        <div className="todo-modal-header">
          <span className="todo-modal-eyebrow">
            {listName} · {formatHeaderDate(today)}
          </span>
          <button
            type="button"
            className="todo-modal-close"
            aria-label="Cerrar"
            onClick={requestClose}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="todo-modal-title-row">
          <input
            type="checkbox"
            checked={completedDraft}
            aria-label={
              completedDraft
                ? 'Marcar como pendiente'
                : 'Marcar como completada'
            }
            onChange={() => setCompletedDraft((value) => !value)}
          />
          <input
            ref={titleInputRef}
            type="text"
            className={`todo-modal-title-input${completedDraft ? ' completed' : ''}`}
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
              onClick={closeDialog}
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
    </dialog>
  )
}
