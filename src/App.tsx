import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretDown, CaretUp, List } from '@phosphor-icons/react'
import { AddTodo } from './components/AddTodo'
import { LoginScreen } from './components/LoginScreen'
import { ModeSwitch } from './components/ModeSwitch'
import { ResetPasswordScreen } from './components/ResetPasswordScreen'
import { NotesArea } from './components/NotesArea'
import { UserMenu } from './components/UserMenu'
import { TodoList } from './components/TodoList'
import { TodoDetailModal } from './components/TodoDetailModal'
import type { TodoDetailUpdates } from './components/TodoDetailModal'
import { TaskListSidebar } from './components/TaskListSidebar'
import { UndoToastStack } from './components/UndoToastStack'
import { useAccentColor } from './hooks/useAccentColor'
import { useCloudSync } from './hooks/useCloudSync'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { useToday } from './hooks/useToday'
import { useUndoQueue } from './hooks/useUndoQueue'
import { DEFAULT_NOTEBOOKS, DEFAULT_PROFILE, MY_DAY_ID } from './types'
import type {
  AppMode,
  Note,
  Notebook,
  Profile,
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
  | { kind: 'deleteList'; list: TaskList; index: number; todos: Todo[] }

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
  const [profile, setProfile] = useLocalStorage<Profile>(
    'profile',
    DEFAULT_PROFILE,
  )
  const [mode, setMode] = useLocalStorage<AppMode>('appMode', 'tasks')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [detailsTodoId, setDetailsTodoId] = useState<string | null>(null)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const undoQueue = useUndoQueue<PendingUndo>()
  const { theme, toggleTheme } = useTheme()
  const { accentId, setAccentId } = useAccentColor()
  const today = useToday()
  const isMyDay = selectedListId === MY_DAY_ID

  const syncedState = useMemo<SyncedState>(
    () => ({ taskLists: lists, todos, notebooks, notes, profile }),
    [lists, todos, notebooks, notes, profile],
  )

  function applyRemoteState(remote: SyncedState) {
    setLists(remote.taskLists)
    setTodos(remote.todos)
    setNotebooks(remote.notebooks)
    setNotes(remote.notes)
    setProfile(remote.profile ?? DEFAULT_PROFILE)
  }

  const sync = useCloudSync({
    state: syncedState,
    applyRemote: applyRemoteState,
  })

  function updateAvatar(dataUrl: string) {
    setProfile({ avatar: dataUrl, avatarUpdatedAt: Date.now() })
  }

  const userMenuHeader = (
    <UserMenu
      sync={sync}
      profile={profile}
      onAvatarChange={updateAvatar}
      theme={theme}
      onToggleTheme={toggleTheme}
      accentId={accentId}
      onAccentChange={setAccentId}
      placement="header"
    />
  )
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
    const index = lists.findIndex((candidate) => candidate.id === id)
    if (index === -1) return
    undoQueue.push({
      kind: 'deleteList',
      list: lists[index],
      index,
      todos: todos.filter((todo) => todo.listId === id),
    })
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

  function updateTodoDetails(id: string, updates: TodoDetailUpdates) {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              text: updates.text,
              description: updates.description,
              dueDate: updates.dueDate,
              priority: updates.priority,
            }
          : todo,
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
    } else if (entry.item.kind === 'deleteList') {
      const { list, index, todos: listTodos } = entry.item
      setLists((current) => {
        const restored = [...current]
        restored.splice(Math.min(index, restored.length), 0, list)
        return restored
      })
      setTodos((current) => [...current, ...listTodos])
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
          ? todo.myDay === today ||
            (!todo.completed && !!todo.dueDate && todo.dueDate < today)
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
  const detailsTodo = todos.find((todo) => todo.id === detailsTodoId) ?? null

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
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
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
          userMenuTop={userMenuHeader}
          modeSwitch={<ModeSwitch mode={mode} onChange={switchMode} />}
          isSidebarOpen={isSidebarOpen}
          sidebarToggleRef={sidebarToggleRef}
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
          onCloseSidebar={closeSidebar}
        />
      ) : (
        <>
          <TaskListSidebar
            lists={lists}
            selectedListId={selectedListId}
            isOpen={isSidebarOpen}
            onSelect={selectList}
            onAdd={addList}
            onRename={renameList}
            onDelete={deleteList}
            onReorderTo={reorderList}
            userMenuTop={userMenuHeader}
            modeSwitch={<ModeSwitch mode={mode} onChange={switchMode} />}
          />
          <main id="main-content" className="app-content">
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
            </div>
            <TodoList
              todos={activeTodos}
              emptyMessage={activeEmptyMessage}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onReorderTo={(id, targetIndex) =>
                reorderWithinSubset(activeTodos, id, targetIndex)
              }
              onToggleMyDay={toggleMyDay}
              onOpenDetails={setDetailsTodoId}
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
                    onDelete={deleteTodo}
                    onReorderTo={(id, targetIndex) =>
                      reorderWithinSubset(completedTodos, id, targetIndex)
                    }
                    onToggleMyDay={toggleMyDay}
                    onOpenDetails={setDetailsTodoId}
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
          {detailsTodo && (
            <TodoDetailModal
              key={detailsTodo.id}
              todo={detailsTodo}
              listName={selectedListName}
              today={today}
              onClose={() => setDetailsTodoId(null)}
              onSave={updateTodoDetails}
              onDelete={deleteTodo}
              onToggle={toggleTodo}
            />
          )}
          <UndoToastStack
            items={undoQueue.entries.map((entry) => ({
              id: entry.id,
              message:
                entry.item.kind === 'delete'
                  ? 'Tarea eliminada'
                  : entry.item.kind === 'deleteList'
                    ? 'Lista eliminada'
                    : 'Tarea completada',
              focusOnMount: entry.item.kind !== 'complete',
            }))}
            onUndo={undoAction}
            onDismiss={undoQueue.dismiss}
            onPause={undoQueue.pause}
            onResume={undoQueue.resume}
          />
        </>
      )}
    </div>
  )
}

export default App
