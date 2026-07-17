import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretDown, CaretUp, List, Moon, Sun } from '@phosphor-icons/react'
import { AddTodo } from './components/AddTodo'
import { LoginScreen } from './components/LoginScreen'
import { ModeSwitch } from './components/ModeSwitch'
import { ResetPasswordScreen } from './components/ResetPasswordScreen'
import { NotesArea } from './components/NotesArea'
import { SyncPanel } from './components/SyncPanel'
import { TodoList } from './components/TodoList'
import { TaskListSidebar } from './components/TaskListSidebar'
import { UndoToastStack } from './components/UndoToastStack'
import { useCloudSync } from './hooks/useCloudSync'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { useToday } from './hooks/useToday'
import { useUndoQueue } from './hooks/useUndoQueue'
import { DEFAULT_NOTEBOOKS, MY_DAY_ID } from './types'
import type {
  AppMode,
  Note,
  Notebook,
  Priority,
  SyncedState,
  TaskList,
  Todo,
} from './types'
import './App.css'

const DEFAULT_LIST_ID = 'default'
const DEFAULT_LISTS: TaskList[] = [{ id: DEFAULT_LIST_ID, name: 'Mis tareas' }]

type PendingUndo =
  | { kind: 'delete'; todo: Todo; index: number }
  | { kind: 'complete'; todoId: string }

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
  const [notebooks, setNotebooks] = useLocalStorage<Notebook[]>(
    'notebooks',
    DEFAULT_NOTEBOOKS,
  )
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', [])
  const [mode, setMode] = useLocalStorage<AppMode>('appMode', 'tasks')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const undoQueue = useUndoQueue<PendingUndo>()
  const { theme, toggleTheme } = useTheme()
  const today = useToday()
  const isMyDay = selectedListId === MY_DAY_ID

  const syncedState = useMemo<SyncedState>(
    () => ({ taskLists: lists, todos, notebooks, notes }),
    [lists, todos, notebooks, notes],
  )

  function applyRemoteState(remote: SyncedState) {
    setLists(remote.taskLists)
    setTodos(remote.todos)
    setNotebooks(remote.notebooks)
    setNotes(remote.notes)
  }

  const sync = useCloudSync({
    state: syncedState,
    applyRemote: applyRemoteState,
  })
  const syncPanel = <SyncPanel sync={sync} />

  function closeSidebar() {
    setIsSidebarOpen(false)
    sidebarToggleRef.current?.focus()
  }

  function switchMode(nextMode: AppMode) {
    if (nextMode === mode) return
    setMode(nextMode)
    setIsSidebarOpen(false)
  }

  useEffect(() => {
    if (!isSidebarOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeSidebar()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  useEffect(() => {
    const fallbackId = lists.some((list) => list.id === DEFAULT_LIST_ID)
      ? DEFAULT_LIST_ID
      : lists[0]?.id
    if (!fallbackId) return
    const hasOrphans = todos.some(
      (todo) => !todo.listId || !lists.some((list) => list.id === todo.listId),
    )
    if (!hasOrphans) return
    setTodos((current) =>
      current.map((todo) =>
        todo.listId && lists.some((list) => list.id === todo.listId)
          ? todo
          : { ...todo, listId: fallbackId },
      ),
    )
  }, [todos, lists, setTodos])

  function selectList(id: string) {
    setSelectedListId(id)
    if (id !== MY_DAY_ID) setLastRealListId(id)
    closeSidebar()
  }

  function addList(name: string) {
    const newList: TaskList = { id: crypto.randomUUID(), name }
    setLists((current) => [...current, newList])
    selectList(newList.id)
  }

  function renameList(id: string, name: string) {
    setLists((current) =>
      current.map((list) => (list.id === id ? { ...list, name } : list)),
    )
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
    setTodos((current) => current.filter((todo) => todo.listId !== id))
    if (lastRealListId === id) setLastRealListId(remaining[0].id)
    if (selectedListId === id) {
      selectList(remaining[0].id)
    }
  }

  function addTodo(text: string) {
    setTodos((current) => [
      ...current,
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
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id
          ? { ...todo, myDay: todo.myDay === today ? undefined : today }
          : todo,
      ),
    )
  }

  function renameTodo(id: string, text: string) {
    setTodos((current) =>
      current.map((todo) => (todo.id === id ? { ...todo, text } : todo)),
    )
  }

  function toggleTodo(id: string) {
    const target = todos.find((todo) => todo.id === id)
    if (!target) return
    if (!target.completed) undoQueue.push({ kind: 'complete', todoId: id })
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  function updateTodoMeta(
    id: string,
    dueDate: string | undefined,
    priority: Priority | undefined,
  ) {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, dueDate, priority } : todo,
      ),
    )
  }

  function deleteTodo(id: string) {
    const index = todos.findIndex((todo) => todo.id === id)
    if (index === -1) return
    undoQueue.push({ kind: 'delete', todo: todos[index], index })
    setTodos((current) => current.filter((todo) => todo.id !== id))
  }

  function undoAction(entryId: string) {
    const entry = undoQueue.entries.find(
      (candidate) => candidate.id === entryId,
    )
    if (!entry) return
    if (entry.item.kind === 'delete') {
      const { todo, index } = entry.item
      const listExists = lists.some((list) => list.id === todo.listId)
      const restoredTodo = listExists
        ? todo
        : { ...todo, listId: isMyDay ? lastRealListId : selectedListId }
      setTodos((current) => {
        const restored = [...current]
        restored.splice(index, 0, restoredTodo)
        return restored
      })
    } else {
      const { todoId } = entry.item
      setTodos((current) =>
        current.map((todo) =>
          todo.id === todoId ? { ...todo, completed: false } : todo,
        ),
      )
    }
    undoQueue.dismiss(entryId)
  }

  function reorderList(id: string, targetIndex: number) {
    setLists((current) => {
      const currentIndex = current.findIndex((list) => list.id === id)
      if (currentIndex === -1 || currentIndex === targetIndex) return current
      const updated = [...current]
      const [moved] = updated.splice(currentIndex, 1)
      updated.splice(targetIndex, 0, moved)
      return updated
    })
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

  function reorderWithinSubset(
    subset: Todo[],
    id: string,
    targetIndex: number,
  ) {
    const currentIndex = subset.findIndex((todo) => todo.id === id)
    if (currentIndex === -1 || currentIndex === targetIndex) return
    const targetTodo = subset[targetIndex]
    setTodos((current) => {
      const dragged = current.find((todo) => todo.id === id)
      if (!dragged) return current
      const withoutDragged = current.filter((todo) => todo.id !== id)
      const targetFullIndex = withoutDragged.findIndex(
        (todo) => todo.id === targetTodo.id,
      )
      if (targetFullIndex === -1) return current
      const insertIndex =
        currentIndex < targetIndex ? targetFullIndex + 1 : targetFullIndex
      const updated = [...withoutDragged]
      updated.splice(insertIndex, 0, dragged)
      return updated
    })
  }

  const selectedList = lists.find((list) => list.id === selectedListId)
  const selectedListName = isMyDay ? 'Mi día' : (selectedList?.name ?? '')

  const activeEmptyMessage =
    listTodos.length === 0
      ? isMyDay
        ? 'Nada marcado para hoy — usa la estrella en cualquier tarea.'
        : 'Aún no hay tareas — añade una abajo.'
      : 'No hay tareas activas — ¡todo al día!'

  if (sync.enabled && !sync.authReady) {
    return (
      <div className="login-screen">
        <p className="login-loading">Cargando…</p>
      </div>
    )
  }

  if (sync.enabled && sync.recoveryMode) {
    return <ResetPasswordScreen sync={sync} />
  }

  if (sync.enabled && !sync.email) {
    return <LoginScreen sync={sync} />
  }

  return (
    <div className="app">
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      {mode === 'notes' ? (
        <NotesArea
          notebooks={notebooks}
          notes={notes}
          setNotebooks={setNotebooks}
          setNotes={setNotes}
          syncPanel={syncPanel}
          isSidebarOpen={isSidebarOpen}
          theme={theme}
          sidebarToggleRef={sidebarToggleRef}
          modeSwitch={<ModeSwitch mode={mode} onChange={switchMode} />}
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
          onCloseSidebar={closeSidebar}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <>
          <TaskListSidebar
            lists={lists}
            selectedListId={selectedListId}
            isOpen={isSidebarOpen}
            theme={theme}
            onSelect={selectList}
            onAdd={addList}
            onRename={renameList}
            onDelete={deleteList}
            onReorderTo={reorderList}
            onToggleTheme={toggleTheme}
            syncPanel={syncPanel}
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
                <List aria-hidden="true" size={20} />
              </button>
              <h1>{selectedListName}</h1>
              <ModeSwitch mode={mode} onChange={switchMode} />
            </div>
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
              {theme === 'dark' ? (
                <Sun aria-hidden="true" size={18} />
              ) : (
                <Moon aria-hidden="true" size={18} />
              )}
            </button>
            <TodoList
              todos={activeTodos}
              emptyMessage={activeEmptyMessage}
              onToggle={toggleTodo}
              onRename={renameTodo}
              onDelete={deleteTodo}
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
                  {showCompleted ? (
                    <CaretUp aria-hidden="true" size={16} />
                  ) : (
                    <CaretDown aria-hidden="true" size={16} />
                  )}
                </button>
                {showCompleted && (
                  <TodoList
                    todos={completedTodos}
                    emptyMessage="No hay tareas completadas."
                    onToggle={toggleTodo}
                    onRename={renameTodo}
                    onDelete={deleteTodo}
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
            items={undoQueue.entries.map((entry) => ({
              id: entry.id,
              message:
                entry.item.kind === 'delete'
                  ? 'Tarea eliminada'
                  : 'Tarea completada',
              focusOnMount: entry.item.kind === 'delete',
            }))}
            onUndo={undoAction}
            onPause={undoQueue.pause}
            onResume={undoQueue.resume}
          />
        </>
      )}
    </div>
  )
}

export default App
