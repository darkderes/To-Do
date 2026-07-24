import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import {
  DotsSixVertical,
  PencilSimple,
  Plus,
  Sun,
  X,
} from '@phosphor-icons/react'
import { useRowDrag } from '../hooks/useRowDrag'
import { MY_DAY_ID } from '../types'
import type { TaskList } from '../types'

interface TaskListSidebarProps {
  lists: TaskList[]
  selectedListId: string
  isOpen: boolean
  onSelect: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onReorderTo: (id: string, targetIndex: number) => void
  userMenu?: ReactNode
}

export function TaskListSidebar({
  lists,
  selectedListId,
  isOpen,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onReorderTo,
  userMenu,
}: TaskListSidebarProps) {
  const [newListName, setNewListName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const navRef = useRef<HTMLElement>(null)
  const drag = useRowDrag({
    ids: lists.map((list) => list.id),
    containerRef: navRef,
    rowSelector: '.task-list-nav > li',
    onReorderTo,
    isDragEnabled: lists.length > 1,
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
    if (target < 0 || target >= lists.length) return
    onReorderTo(id, target)
  }

  return (
    <nav
      id="task-list-sidebar"
      ref={navRef}
      className={`task-list-sidebar${isOpen ? ' open' : ''}`}
      aria-label="Listas de tareas"
    >
      <ul className="my-day-nav">
        <li className={selectedListId === MY_DAY_ID ? 'active' : ''}>
          <button
            type="button"
            className="task-list-button"
            onClick={() => onSelect(MY_DAY_ID)}
          >
            <Sun aria-hidden="true" size={16} /> Mi día
          </button>
        </li>
      </ul>
      <ul className="task-list-nav">
        {lists.map((list, index) => (
          <li
            key={list.id}
            className={list.id === selectedListId ? 'active' : ''}
            style={drag.getItemStyle(index, list.id)}
          >
            {lists.length > 1 && (
              <div className="task-list-item-reveal">
                <button
                  type="button"
                  className="task-list-swipe-delete"
                  aria-label={`Quitar lista "${list.name}"`}
                  onClick={() => handleSwipeDelete(list.id)}
                >
                  Eliminar
                </button>
              </div>
            )}
            <div
              className="task-list-item-row"
              style={{
                transform: `translateX(${drag.getRowOffset(list.id)}px)`,
                transition: drag.isSwipeDragging(list.id) ? 'none' : undefined,
                touchAction: drag.isReorderActive(list.id) ? 'none' : undefined,
              }}
              onPointerDown={(event) =>
                drag.handleRowPointerDown(event, list.id)
              }
              onPointerMove={drag.handleRowPointerMove}
              onPointerUp={drag.handleRowPointerUp}
              onPointerCancel={drag.handleRowPointerUp}
            >
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
                  {lists.length > 1 && (
                    <button
                      type="button"
                      className="task-list-drag-handle"
                      aria-label={`Reordenar lista "${list.name}" (flechas arriba/abajo)`}
                      onKeyDown={(event) =>
                        handleReorderKeyDown(event, index, list.id)
                      }
                    >
                      <DotsSixVertical aria-hidden="true" size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="task-list-button"
                    onClick={() => handleSelectClick(list.id)}
                  >
                    {list.name}
                  </button>
                  <button
                    type="button"
                    className="task-list-action"
                    aria-label={`Renombrar "${list.name}"`}
                    onClick={() => startEditing(list)}
                  >
                    <PencilSimple aria-hidden="true" size={16} />
                  </button>
                  {lists.length > 1 && (
                    <button
                      type="button"
                      className="task-list-action task-list-delete"
                      aria-label={`Eliminar lista "${list.name}"`}
                      onClick={() => onDelete(list.id)}
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
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="Nueva lista"
              aria-label="Nombre de la nueva lista"
            />
          </div>
          <button type="submit">Añadir lista</button>
        </form>
        {userMenu}
      </div>
    </nav>
  )
}
