import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { TaskList } from '../types'

interface TaskListSidebarProps {
  lists: TaskList[]
  selectedListId: string
  isOpen: boolean
  theme: 'light' | 'dark'
  onSelect: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onToggleTheme: () => void
}

export function TaskListSidebar({
  lists,
  selectedListId,
  isOpen,
  theme,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleTheme,
}: TaskListSidebarProps) {
  const [newListName, setNewListName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOpen) return
    navRef.current?.querySelector<HTMLButtonElement>('.task-list-button')?.focus()
  }, [isOpen])

  function handleAddSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = newListName.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setNewListName('')
  }

  function startEditing(list: TaskList) {
    setEditingId(list.id)
    setEditingName(list.name)
  }

  function commitEditing(id: string) {
    const trimmed = editingName.trim()
    if (trimmed) onRename(id, trimmed)
    setEditingId(null)
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>, id: string) {
    if (event.key === 'Enter') commitEditing(id)
    if (event.key === 'Escape') setEditingId(null)
  }

  return (
    <nav
      id="task-list-sidebar"
      ref={navRef}
      className={`task-list-sidebar${isOpen ? ' open' : ''}`}
      aria-label="Listas de tareas"
    >
      <ul className="task-list-nav">
        {lists.map((list, index) => (
          <li key={list.id} className={list.id === selectedListId ? 'active' : ''}>
            {editingId === list.id ? (
              <input
                type="text"
                className="task-list-rename-input"
                value={editingName}
                autoFocus
                aria-label={`Renombrar lista ${list.name}`}
                onChange={(event) => setEditingName(event.target.value)}
                onBlur={() => commitEditing(list.id)}
                onKeyDown={(event) => handleEditKeyDown(event, list.id)}
              />
            ) : (
              <>
                <button
                  type="button"
                  className="task-list-button"
                  onClick={() => onSelect(list.id)}
                >
                  {list.name}
                </button>
                <button
                  type="button"
                  className="task-list-action"
                  aria-label={`Mover "${list.name}" arriba`}
                  disabled={index === 0}
                  onClick={() => onMoveUp(list.id)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="task-list-action"
                  aria-label={`Mover "${list.name}" abajo`}
                  disabled={index === lists.length - 1}
                  onClick={() => onMoveDown(list.id)}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className="task-list-action"
                  aria-label={`Renombrar "${list.name}"`}
                  onClick={() => startEditing(list)}
                >
                  ✎
                </button>
                {lists.length > 1 && (
                  <button
                    type="button"
                    className="task-list-action task-list-delete"
                    aria-label={`Eliminar lista "${list.name}"`}
                    onClick={() => onDelete(list.id)}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="add-list" onSubmit={handleAddSubmit}>
        <input
          type="text"
          value={newListName}
          onChange={(event) => setNewListName(event.target.value)}
          placeholder="Nueva lista"
          aria-label="Nombre de la nueva lista"
        />
        <button type="submit">Añadir lista</button>
      </form>
      <div className="sidebar-settings">
        <h2 className="sidebar-settings-heading">Configuración</h2>
        <button
          type="button"
          className="sidebar-settings-item"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          <span aria-hidden="true">Modo {theme === 'dark' ? 'oscuro' : 'claro'}</span>
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
      </div>
    </nav>
  )
}
