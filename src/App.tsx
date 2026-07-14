import { useEffect, useMemo, useRef, useState } from 'react'
import { AddTodo } from './components/AddTodo'
import { TodoList } from './components/TodoList'
import { TaskListSidebar } from './components/TaskListSidebar'
import { UndoToastStack } from './components/UndoToastStack'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { useUndoQueue } from './hooks/useUndoQueue'
import { MY_DAY_ID, getTodayString } from './types'
import type { Priority, TaskList, Todo } from './types'
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
  const [lastRealListId, setLastRealListId] = useLocalStorage<string>(
    'lastRealListId',
    DEFAULT_LIST_ID,
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const undoQueue = useUndoQueue<PendingDelete>()
  const { theme, toggleTheme } = useTheme()
  const today = getTodayString()
  const isMyDay = selectedListId === MY_DAY_ID

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
    if (id !== MY_DAY_ID) setLastRealListId(id)
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
    if (lastRealListId === id) setLastRealListId(remaining[0].id)
    if (selectedListId === id) {
      selectList(remaining[0].id)
    }
  }

  function addTodo(text: string) {
    setTodos([
      ...todos,
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
        listId: isMyDay ? lastRealListId : selectedListId,
        ...(isMyDay ? { myDay: today } : {}),
      },
    ])
  }

  function toggleMyDay(id: string) {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? { ...todo, myDay: todo.myDay === today ? undefined : today }
          : todo,
      ),
    )
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
      todos.filter((todo) =>
        isMyDay
          ? todo.myDay === today
          : (todo.listId ?? DEFAULT_LIST_ID) === selectedListId,
      ),
    [todos, selectedListId, isMyDay, today],
  )

  const activeTodos = useMemo(
    () => listTodos.filter((todo) => !todo.completed),
    [listTodos],
  )
  const completedTodos = useMemo(
    () => listTodos.filter((todo) => todo.completed),
    [listTodos],
  )

  const activeCount = activeTodos.length

  function moveWithinSubset(
    subset: Todo[],
    id: string,
    direction: 'up' | 'down',
  ) {
    const currentIndex = subset.findIndex((todo) => todo.id === id)
    if (currentIndex === -1) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= subset.length) return
    const a = subset[currentIndex]
    const b = subset[targetIndex]
    const aIndex = todos.findIndex((todo) => todo.id === a.id)
    const bIndex = todos.findIndex((todo) => todo.id === b.id)
    const updated = [...todos]
    ;[updated[aIndex], updated[bIndex]] = [updated[bIndex], updated[aIndex]]
    setTodos(updated)
  }

  function reorderWithinSubset(subset: Todo[], id: string, targetIndex: number) {
    const currentIndex = subset.findIndex((todo) => todo.id === id)
    if (currentIndex === -1 || currentIndex === targetIndex) return
    const targetTodo = subset[targetIndex]
    const dragged = todos.find((todo) => todo.id === id)
    if (!dragged) return
    const withoutDragged = todos.filter((todo) => todo.id !== id)
    const targetFullIndex = withoutDragged.findIndex(
      (todo) => todo.id === targetTodo.id,
    )
    const insertIndex =
      currentIndex < targetIndex ? targetFullIndex + 1 : targetFullIndex
    const updated = [...withoutDragged]
    updated.splice(insertIndex, 0, dragged)
    setTodos(updated)
  }

  const selectedList = lists.find((list) => list.id === selectedListId)
  const selectedListName = isMyDay ? 'Mi día' : (selectedList?.name ?? '')

  const activeEmptyMessage =
    listTodos.length === 0
      ? isMyDay
        ? 'Nada marcado para hoy — usa ☀️ en cualquier tarea.'
        : 'Aún no hay tareas — añade una abajo.'
      : 'No hay tareas activas — ¡todo al día!'

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
            aria-label={`Listas de tareas, lista actual: ${selectedListName}`}
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <h1>
            <span className="title-app">Tareas</span>
            <span className="title-list">{selectedListName}</span>
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
        <TodoList
          todos={activeTodos}
          emptyMessage={activeEmptyMessage}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onMoveUp={(id) => moveWithinSubset(activeTodos, id, 'up')}
          onMoveDown={(id) => moveWithinSubset(activeTodos, id, 'down')}
          onReorderTo={(id, targetIndex) =>
            reorderWithinSubset(activeTodos, id, targetIndex)
          }
          onUpdateMeta={updateTodoMeta}
          onToggleMyDay={toggleMyDay}
          today={today}
        />
        {completedTodos.length > 0 && (
          <div className="completed-section">
            <button
              type="button"
              className="completed-toggle"
              aria-expanded={showCompleted}
              onClick={() => setShowCompleted((open) => !open)}
            >
              <span>Completadas ({completedTodos.length})</span>
              <span aria-hidden="true">{showCompleted ? '▲' : '▼'}</span>
            </button>
            {showCompleted && (
              <TodoList
                todos={completedTodos}
                emptyMessage="No hay tareas completadas."
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onMoveUp={(id) => moveWithinSubset(completedTodos, id, 'up')}
                onMoveDown={(id) =>
                  moveWithinSubset(completedTodos, id, 'down')
                }
                onReorderTo={(id, targetIndex) =>
                  reorderWithinSubset(completedTodos, id, targetIndex)
                }
                onUpdateMeta={updateTodoMeta}
                onToggleMyDay={toggleMyDay}
                today={today}
              />
            )}
          </div>
        )}
        <p className="count">
          {activeCount}{' '}
          {activeCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
        </p>
        <AddTodo onAdd={addTodo} />
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
