import { useMemo, useState } from 'react'
import { AddTodo } from './components/AddTodo'
import { TodoList } from './components/TodoList'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { Todo } from './types'
import './App.css'

type Filter = 'all' | 'active' | 'completed'

function App() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', [])
  const [filter, setFilter] = useState<Filter>('all')

  function addTodo(text: string) {
    setTodos([...todos, { id: crypto.randomUUID(), text, completed: false }])
  }

  function toggleTodo(id: string) {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  function deleteTodo(id: string) {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const visibleTodos = useMemo(() => {
    if (filter === 'active') return todos.filter((todo) => !todo.completed)
    if (filter === 'completed') return todos.filter((todo) => todo.completed)
    return todos
  }, [todos, filter])

  const activeCount = todos.filter((todo) => !todo.completed).length

  const filterLabels: Record<Filter, string> = {
    all: 'todas',
    active: 'activas',
    completed: 'completadas',
  }

  return (
    <main className="app">
      <h1>Tareas</h1>
      <AddTodo onAdd={addTodo} />
      <div className="filters">
        {(['all', 'active', 'completed'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={filter === option ? 'active' : ''}
            onClick={() => setFilter(option)}
          >
            {filterLabels[option]}
          </button>
        ))}
      </div>
      <TodoList
        todos={visibleTodos}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />
      <p className="count">
        {activeCount} {activeCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
      </p>
    </main>
  )
}

export default App
