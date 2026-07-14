import { useEffect, useMemo, useRef, useState } from 'react'
import { AddTodo } from './components/AddTodo'
import { TodoList } from './components/TodoList'
import { TaskListSidebar } from './components/TaskListSidebar'
import { UndoToastStack } from './components/UndoToastStack'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { useUndoQueue } from './hooks/useUndoQueue'
import type { Filter, Priority, TaskList, Todo } from './types'
import './App.css'

const DEFAULT_LIST_ID = 'default'
const DEFAULT_LISTS: TaskList[] = [{ id: DEFAULT_LIST_ID, name: 'Mis tareas' }]

interface PendingDelete {
  todo: Todo
  index: number
}

function App() {
  const [lists, setLists] = useLocalStorage<TaskList[]>(
    'taskLists',
    DEFAULT_LISTS,
  )
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', [])
  const [selectedListId, setSelectedListId] = useLocalStorage<string>(
    'selectedListId',
    DEFAULT_LIST_ID,
  )
  const [filter, setFilter] = useLocalStorage<Filter>('filter', 'all')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const undoQueue = useUndoQueue<PendingDelete>()
  const { theme, toggleTheme } = useTheme()

  function closeSidebar() {
    setIsSidebarOpen(false)
    sidebarToggleRef.current?.focus()
  }

  useEffect(() => {
    if (!isSidebarOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeSidebar()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  function selectList(id: string) {
    setSelectedListId(id)
    setFilter('all')
    closeSidebar()
  }

  function addList(name: string) {
    const newList: TaskList = { id: crypto.randomUUID(), name }
    setLists([...lists, newList])
    selectList(newList.id)
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
      selectList(remaining[0].id)
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

  function updateTodoMeta(
    id: string,
    dueDate: string | undefined,
    priority: Priority | undefined,
  ) {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, dueDate, priority } : todo,
      ),
    )
  }

  function deleteTodo(id: string) {
    const index = todos.findIndex((todo) => todo.id === id)
    if (index === -1) return
    undoQueue.push({ todo: todos[index], index })
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  function undoDelete(entryId: string) {
    const entry = undoQueue.entries.find(
      (candidate) => candidate.id === entryId,
    )
    if (!entry) return
    const restored = [...todos]
    restored.splice(entry.item.index, 0, entry.item.todo)
    setTodos(restored)
    undoQueue.dismiss(entryId)
  }

  function markAllComplete() {
    setTodos(
      todos.map((todo) =>
        todo.listId === selectedListId ? { ...todo, completed: true } : todo,
      ),
    )
  }

  function clearCompleted() {
    let remaining = todos
    todos
      .filter((todo) => todo.listId === selectedListId && todo.completed)
      .forEach((todo) => {
        const index = remaining.findIndex(
          (candidate) => candidate.id === todo.id,
        )
        undoQueue.push({ todo, index })
        remaining = remaining.filter((candidate) => candidate.id !== todo.id)
      })
    setTodos(remaining)
  }

  function moveList(id: string, direction: 'up' | 'down') {
    const currentIndex = lists.findIndex((list) => list.id === id)
    if (currentIndex === -1) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= lists.length) return
    const updated = [...lists]
    ;[updated[currentIndex], updated[targetIndex]] = [
      updated[targetIndex],
      updated[currentIndex],
    ]
    setLists(updated)
  }

  function reorderList(id: string, targetIndex: number) {
    const currentIndex = lists.findIndex((list) => list.id === id)
    if (currentIndex === -1 || currentIndex === targetIndex) return
    const updated = [...lists]
    const [moved] = updated.splice(currentIndex, 1)
    updated.splice(targetIndex, 0, moved)
    setLists(updated)
  }

  const listTodos = useMemo(
    () =>
      todos.filter(
        (todo) => (todo.listId ?? DEFAULT_LIST_ID) === selectedListId,
      ),
    [todos, selectedListId],
  )

  const visibleTodos = useMemo(() => {
    if (filter === 'active') return listTodos.filter((todo) => !todo.completed)
    if (filter === 'completed')
      return listTodos.filter((todo) => todo.completed)
    return listTodos
  }, [listTodos, filter])

  const activeCount = listTodos.filter((todo) => !todo.completed).length
  const completedCount = listTodos.length - activeCount

  function moveTodo(id: string, direction: 'up' | 'down') {
    const currentIndex = visibleTodos.findIndex((todo) => todo.id === id)
    if (currentIndex === -1) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= visibleTodos.length) return
    const a = visibleTodos[currentIndex]
    const b = visibleTodos[targetIndex]
    const aIndex = todos.findIndex((todo) => todo.id === a.id)
    const bIndex = todos.findIndex((todo) => todo.id === b.id)
    const updated = [...todos]
    ;[updated[aIndex], updated[bIndex]] = [updated[bIndex], updated[aIndex]]
    setTodos(updated)
  }

  const filterLabels: Record<Filter, string> = {
    all: 'todas',
    active: 'activas',
    completed: 'completadas',
  }

  const selectedList = lists.find((list) => list.id === selectedListId)

  return (
    <div className="app">
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <TaskListSidebar
        lists={lists}
        selectedListId={selectedListId}
        isOpen={isSidebarOpen}
        theme={theme}
        onSelect={selectList}
        onAdd={addList}
        onRename={renameList}
        onDelete={deleteList}
        onMoveUp={(id) => moveList(id, 'up')}
        onMoveDown={(id) => moveList(id, 'down')}
        onReorderTo={reorderList}
        onToggleTheme={toggleTheme}
      />
      <main className="app-content">
        <div className="app-header">
          <button
            type="button"
            className="sidebar-toggle"
            ref={sidebarToggleRef}
            aria-expanded={isSidebarOpen}
            aria-controls="task-list-sidebar"
            aria-label={`Listas de tareas, lista actual: ${selectedList?.name ?? ''}`}
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <h1>
            <span className="title-app">Tareas</span>
            <span className="title-list">{selectedList?.name}</span>
          </h1>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? 'Cambiar a modo claro'
                : 'Cambiar a modo oscuro'
            }
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
        {listTodos.length > 0 && (
          <div className="batch-actions">
            <button
              type="button"
              onClick={markAllComplete}
              disabled={activeCount === 0}
            >
              Marcar todas
            </button>
            <button
              type="button"
              onClick={clearCompleted}
              disabled={completedCount === 0}
            >
              Borrar completadas
            </button>
          </div>
        )}
        <TodoList
          todos={visibleTodos}
          filter={filter}
          hasAnyTodos={listTodos.length > 0}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onMoveUp={(id) => moveTodo(id, 'up')}
          onMoveDown={(id) => moveTodo(id, 'down')}
          onUpdateMeta={updateTodoMeta}
        />
        <p className="count">
          {activeCount}{' '}
          {activeCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
        </p>
      </main>
      <UndoToastStack
        entries={undoQueue.entries}
        onUndo={undoDelete}
        onPause={undoQueue.pause}
        onResume={undoQueue.resume}
      />
    </div>
  )
}

export default App
