import { useState } from 'react'
import type { FormEvent } from 'react'
import { PRIORITY_LABELS, type Priority } from '../types'

interface AddTodoProps {
  onAdd: (text: string, dueDate?: string, priority?: Priority) => void
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed, dueDate || undefined, priority || undefined)
    setText('')
    setDueDate('')
    setPriority('')
  }

  return (
    <form className="add-todo" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="¿Qué hay que hacer?"
        aria-label="Texto de la nueva tarea"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        aria-label="Fecha límite (opcional)"
      />
      <select
        value={priority}
        onChange={(event) => setPriority(event.target.value as Priority | '')}
        aria-label="Prioridad (opcional)"
      >
        <option value="">Sin prioridad</option>
        {(['low', 'medium', 'high'] as const).map((option) => (
          <option key={option} value={option}>
            {PRIORITY_LABELS[option]}
          </option>
        ))}
      </select>
      <button type="submit">Añadir</button>
    </form>
  )
}
