import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { Moon, PencilSimple, Plus, Sun, X } from '@phosphor-icons/react'
import type { Notebook } from '../types'

interface NotebookSidebarProps {
  notebooks: Notebook[]
  selectedNotebookId: string
  isOpen: boolean
  theme: 'light' | 'dark'
  onSelect: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleTheme: () => void
  syncPanel?: ReactNode
}

export function NotebookSidebar({
  notebooks,
  selectedNotebookId,
  isOpen,
  theme,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onToggleTheme,
  syncPanel,
}: NotebookSidebarProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOpen) return
    navRef.current
      ?.querySelector<HTMLButtonElement>('.task-list-nav .task-list-button')
      ?.focus()
  }, [isOpen])

  function handleAddSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setNewName('')
  }

  function startEditing(notebook: Notebook) {
    setEditingId(notebook.id)
    setEditingName(notebook.name)
  }

  function commitEditing(id: string) {
    const trimmed = editingName.trim()
    if (trimmed) onRename(id, trimmed)
    setEditingId(null)
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    id: string,
  ) {
    if (event.key === 'Enter') commitEditing(id)
    if (event.key === 'Escape') setEditingId(null)
  }

  return (
    <nav
      id="task-list-sidebar"
      ref={navRef}
      className={`task-list-sidebar${isOpen ? ' open' : ''}`}
      aria-label="Notebooks"
    >
      <ul className="task-list-nav">
        {notebooks.map((notebook) => (
          <li
            key={notebook.id}
            className={notebook.id === selectedNotebookId ? 'active' : ''}
          >
            <div className="task-list-item-row">
              {editingId === notebook.id ? (
                <input
                  type="text"
                  className="task-list-rename-input"
                  value={editingName}
                  autoFocus
                  aria-label={`Renombrar notebook ${notebook.name}`}
                  onChange={(event) => setEditingName(event.target.value)}
                  onBlur={() => commitEditing(notebook.id)}
                  onKeyDown={(event) => handleEditKeyDown(event, notebook.id)}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="task-list-button"
                    onClick={() => onSelect(notebook.id)}
                  >
                    {notebook.name}
                  </button>
                  <button
                    type="button"
                    className="task-list-action"
                    aria-label={`Renombrar "${notebook.name}"`}
                    onClick={() => startEditing(notebook)}
                  >
                    <PencilSimple aria-hidden="true" size={16} />
                  </button>
                  {notebooks.length > 1 && (
                    <button
                      type="button"
                      className="task-list-action task-list-delete"
                      aria-label={`Eliminar notebook "${notebook.name}"`}
                      onClick={() => onDelete(notebook.id)}
                    >
                      <X aria-hidden="true" size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <form className="add-list" onSubmit={handleAddSubmit}>
        <div className="input-with-icon">
          <span className="input-icon" aria-hidden="true">
            <Plus size={16} weight="bold" />
          </span>
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nuevo notebook"
            aria-label="Nombre del nuevo notebook"
          />
        </div>
        <button type="submit">Añadir notebook</button>
      </form>
      <div className="sidebar-settings">
        <h2 className="sidebar-settings-heading">Configuración</h2>
        <button
          type="button"
          className="sidebar-settings-item"
          onClick={onToggleTheme}
          aria-label={
            theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'
          }
        >
          <span aria-hidden="true">
            Modo {theme === 'dark' ? 'oscuro' : 'claro'}
          </span>
          <span aria-hidden="true">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </span>
        </button>
        {syncPanel}
      </div>
    </nav>
  )
}
