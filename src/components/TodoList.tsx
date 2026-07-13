import type { Filter, Todo } from '../types'
import { TodoItem } from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  filter: Filter
  hasAnyTodos: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

const EMPTY_MESSAGES: Record<Filter, string> = {
  all: 'Aún no hay tareas — añade una arriba.',
  active: 'No hay tareas activas — ¡todo al día!',
  completed: 'No hay tareas completadas todavía.',
}

export function TodoList({ todos, filter, hasAnyTodos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    const message = hasAnyTodos ? EMPTY_MESSAGES[filter] : EMPTY_MESSAGES.all
    return <p className="empty-state">{message}</p>
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
