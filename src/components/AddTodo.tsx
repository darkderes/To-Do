import { useState } from 'react'
import type { FormEvent } from 'react'

interface AddTodoProps {
  onAdd: (text: string) => void
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setText('')
  }

  return (
    <div className="add-todo-bar">
      <form className="add-todo" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Agregar tarea"
          aria-label="Texto de la nueva tarea"
        />
        <button type="submit">Añadir</button>
      </form>
    </div>
  )
}
