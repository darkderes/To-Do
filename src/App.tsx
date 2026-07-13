import { useEffect, useMemo, useState } from 'react'
import { AddTodo } from './components/AddTodo'
import { TodoList } from './components/TodoList'
import { TaskListSidebar } from './components/TaskListSidebar'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import type { Filter, TaskList, Todo } from './types'
import './App.css'

const DEFAULT_LIST_ID = 'default'
const DEFAULT_LISTS: TaskList[] = [{ id: DEFAULT_LIST_ID, name: 'Mis tareas' }]
const UNDO_TIMEOUT_MS = 5000

interface PendingDelete {
  todo: Todo
  index: number
}

function App() {
  const [lists, setLists] = useLocalStorage<TaskList[]>('taskLists', DEFAULT_LISTS)
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', [])
  const [selectedListId, setSelectedListId] = useLocalStorage<string>(
    'selectedListId',
    DEFAULT_LIST_ID,
  )
  const [filter, setFilter] = useLocalStorage<Filter>('filter', 'all')
  const [lastDeleted, setLastDeleted] = useState<PendingDelete | null>(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (!lastDeleted) return
    const timeoutId = window.setTimeout(() => setLastDeleted(null), UNDO_TIMEOUT_MS)
    return () => window.clearTimeout(timeoutId)
  }, [lastDeleted])

  function addList(name: string) {
    const newList: TaskList = { id: crypto.randomUUID(), name }
    setLists([...lists, newList])
    setSelectedListId(newList.id)
  }

  function renameList(id: string, name: string) {
    setLists(lists.map((list) => (list.id === id ? { ...list, name } : list)))
  }

  function deleteList(id: string) {
    if (lists.length <= 1) return
    const list = lists.find((candidate) => candidate.id === id)
    const listTodoCount = todos.filter((todo) => todo.listId === id).length
    if (listTodoCount > 0) {
      const noun = listTodoCount === 1 ? 'tarea' : 'tareas'
      const confirmed = window.confirm(
        `"${list?.name}" tiene ${listTodoCount} ${noun}. ¿Eliminar la lista y sus tareas?`,
      )
      if (!confirmed) return
    }
    const remaining = lists.filter((candidate) => candidate.id !== id)
    setLists(remaining)
    setTodos(todos.filter((todo) => todo.listId !== id))
    if (selectedListId === id) {
      setSelectedListId(remaining[0].id)
    }
  }

  function addTodo(text: string) {
    setTodos([
      ...todos,
      { id: crypto.randomUUID(), text, completed: false, listId: selectedListId },
    ])
  }

  function toggleTodo(id: string) {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  function deleteTodo(id: string) {
    const index = todos.findIndex((todo) => todo.id === id)
    if (index === -1) return
    setLastDeleted({ todo: todos[index], index })
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  function undoDelete() {
    if (!lastDeleted) return
    const restored = [...todos]
    restored.splice(lastDeleted.index, 0, lastDeleted.todo)
    setTodos(restored)
    setLastDeleted(null)
  }

  const listTodos = useMemo(
    () => todos.filter((todo) => (todo.listId ?? DEFAULT_LIST_ID) === selectedListId),
    [todos, selectedListId],
  )

  const visibleTodos = useMemo(() => {
    if (filter === 'active') return listTodos.filter((todo) => !todo.completed)
    if (filter === 'completed') return listTodos.filter((todo) => todo.completed)
    return listTodos
  }, [listTodos, filter])

  const activeCount = listTodos.filter((todo) => !todo.completed).length

  const filterLabels: Record<Filter, string> = {
    all: 'todas',
    active: 'activas',
    completed: 'completadas',
  }

  return (
    <div className="app">
      <TaskListSidebar
        lists={lists}
        selectedListId={selectedListId}
        onSelect={setSelectedListId}
        onAdd={addList}
        onRename={renameList}
        onDelete={deleteList}
      />
      <main className="app-content">
        <div className="app-header">
          <h1>Tareas</h1>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
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
          filter={filter}
          hasAnyTodos={listTodos.length > 0}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />
        <p className="count">
          {activeCount} {activeCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
        </p>
      </main>
      {lastDeleted && (
        <div className="toast" role="status">
          <span>Tarea eliminada</span>
          <button type="button" onClick={undoDelete}>
            Deshacer
          </button>
        </div>
      )}
    </div>
  )
}

export default App
