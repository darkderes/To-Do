import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { DotsSixVertical, PencilSimple, Plus, X } from '@phosphor-icons/react'
import { useRowDrag } from '../hooks/useRowDrag'
import type { Notebook } from '../types'

interface NotebookSidebarProps {
  notebooks: Notebook[]
  selectedNotebookId: string
  isOpen: boolean
  onSelect: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onReorderTo: (id: string, targetIndex: number) => void
  userMenuTop?: ReactNode
  modeSwitch?: ReactNode
}

export function NotebookSidebar({
  notebooks,
  selectedNotebookId,
  isOpen,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onReorderTo,
  userMenuTop,
  modeSwitch,
}: NotebookSidebarProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const navRef = useRef<HTMLElement>(null)
  const drag = useRowDrag({
    ids: notebooks.map((notebook) => notebook.id),
    containerRef: navRef,
    rowSelector: '.task-list-nav > li',
    onReorderTo,
    isDragEnabled: notebooks.length > 1,
  })

  useEffect(() => {
    if (!isOpen) return
    navRef.current
      ?.querySelector<HTMLButtonElement>('.task-list-nav .task-list-button')
      ?.focus()
  }, [isOpen])

  function handleSelectClick(id: string) {
    if (drag.openSwipeId) {
      drag.setOpenSwipeId(null)
      return
    }
    onSelect(id)
  }

  function handleSwipeDelete(id: string) {
    drag.setOpenSwipeId(null)
    onDelete(id)
  }

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

  function handleReorderKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    id: string,
  ) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const target = index + (event.key === 'ArrowUp' ? -1 : 1)
    if (target < 0 || target >= notebooks.length) return
    onReorderTo(id, target)
  }

  return (
    <nav
      id="task-list-sidebar"
      ref={navRef}
      className={`task-list-sidebar${isOpen ? ' open' : ''}`}
      aria-label="Notebooks"
    >
      {userMenuTop && <div className="sidebar-top-profile">{userMenuTop}</div>}
      <ul className="task-list-nav">
        {notebooks.map((notebook, index) => (
          <li
            key={notebook.id}
            className={notebook.id === selectedNotebookId ? 'active' : ''}
            style={drag.getItemStyle(index, notebook.id)}
          >
            {notebooks.length > 1 && (
              <div className="task-list-item-reveal">
                <button
                  type="button"
                  className="task-list-swipe-delete"
                  aria-label={`Quitar notebook "${notebook.name}"`}
                  onClick={() => handleSwipeDelete(notebook.id)}
                >
                  Eliminar
                </button>
              </div>
            )}
            <div
              className="task-list-item-row"
              style={{
                transform: `translateX(${drag.getRowOffset(notebook.id)}px)`,
                transition: drag.isSwipeDragging(notebook.id)
                  ? 'none'
                  : undefined,
                touchAction: drag.isReorderActive(notebook.id)
                  ? 'none'
                  : undefined,
              }}
              onPointerDown={(event) =>
                drag.handleRowPointerDown(event, notebook.id)
              }
              onPointerMove={drag.handleRowPointerMove}
              onPointerUp={drag.handleRowPointerUp}
              onPointerCancel={drag.handleRowPointerUp}
            >
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
                  {notebooks.length > 1 && (
                    <button
                      type="button"
                      className="task-list-drag-handle"
                      aria-label={`Reordenar notebook "${notebook.name}" (flechas arriba/abajo)`}
                      title="Arrastra o usa flechas arriba/abajo"
                      onKeyDown={(event) =>
                        handleReorderKeyDown(event, index, notebook.id)
                      }
                    >
                      <DotsSixVertical aria-hidden="true" size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="task-list-button"
                    onClick={() => handleSelectClick(notebook.id)}
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
      <div className="sidebar-bottom">
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
        {modeSwitch && (
          <div className="sidebar-mode-switch">{modeSwitch}</div>
        )}
      </div>
    </nav>
  )
}
