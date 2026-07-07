import { useMemo, useState } from 'react'
import { AddTodo } from './components/AddTodo'
import { TodoList } from './components/TodoList'
import { TaskListSidebar } from './components/TaskListSidebar'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import type { TaskList, Todo } from './types'
import './App.css'

type Filter = 'all' | 'active' | 'completed'

const DEFAULT_LIST_ID = 'default'
const DEFAULT_LISTS: TaskList[] = [{ id: DEFAULT_LIST_ID, name: 'Mis tareas' }]

function App() {
  const [lists, setLists] = useLocalStorage<TaskList[]>('taskLists', DEFAULT_LISTS)
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', [])
  const [selectedListId, setSelectedListId] = useLocalStorage<string>(
    'selectedListId',
    DEFAULT_LIST_ID,
  )
  const [filter, setFilter] = useState<Filter>('all')
  const { theme, toggleTheme } = useTheme()

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
    const remaining = lists.filter((list) => list.id !== id)
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
    setTodos(todos.filter((todo) => todo.id !== id))
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
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />
        <p className="count">
          {activeCount} {activeCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
        </p>
      </main>
    </div>
  )
}

export default App
