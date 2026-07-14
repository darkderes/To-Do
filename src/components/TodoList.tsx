import type { Filter, Priority, Todo } from '../types'
import { TodoItem } from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  filter: Filter
  hasAnyTodos: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onUpdateMeta: (id: string, dueDate: string | undefined, priority: Priority | undefined) => void
}

const EMPTY_MESSAGES: Record<Filter, string> = {
  all: 'Aún no hay tareas — añade una arriba.',
  active: 'No hay tareas activas — ¡todo al día!',
  completed: 'No hay tareas completadas todavía.',
}

export function TodoList({
  todos,
  filter,
  hasAnyTodos,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdateMeta,
}: TodoListProps) {
  if (todos.length === 0) {
    const message = hasAnyTodos ? EMPTY_MESSAGES[filter] : EMPTY_MESSAGES.all
    return <p className="empty-state">{message}</p>
  }

  return (
    <ul className="todo-list">
      {todos.map((todo, index) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          canMoveUp={index > 0}
          canMoveDown={index < todos.length - 1}
          onToggle={onToggle}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onUpdateMeta={onUpdateMeta}
        />
      ))}
    </ul>
  )
}
