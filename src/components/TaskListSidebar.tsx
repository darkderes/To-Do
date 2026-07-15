import { useEffect, useRef, useState } from 'react'
import type {
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { MY_DAY_ID } from '../types'
import type { TaskList } from '../types'

const REVEAL_WIDTH = 88
const SWIPE_LOCK_THRESHOLD = 8

interface SwipeDrag {
  id: string
  startX: number
  startY: number
  baseOffset: number
  direction: 'horizontal' | 'vertical' | null
}

interface RowRect {
  id: string
  top: number
  height: number
}

interface ReorderDrag {
  id: string
  draggedIndex: number
  rects: RowRect[]
  startY: number
  deltaY: number
  targetIndex: number
}

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
  onReorderTo: (id: string, targetIndex: number) => void
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
  onReorderTo,
  onToggleTheme,
}: TaskListSidebarProps) {
  const [newListName, setNewListName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const [liveOffset, setLiveOffset] = useState<{
    id: string
    offset: number
  } | null>(null)
  const [reorderDrag, setReorderDrag] = useState<ReorderDrag | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const dragRef = useRef<SwipeDrag | null>(null)

  useEffect(() => {
    if (!isOpen) return
    navRef.current
      ?.querySelector<HTMLButtonElement>('.task-list-nav .task-list-button')
      ?.focus()
  }, [isOpen])

  function handleRowPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    id: string,
  ) {
    if (lists.length <= 1) return
    if (!window.matchMedia('(max-width: 640px)').matches) return
    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      baseOffset: openSwipeId === id ? -REVEAL_WIDTH : 0,
      direction: null,
    }
  }

  function handleRowPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (drag.direction === null) {
      const passedThreshold =
        Math.abs(deltaX) > SWIPE_LOCK_THRESHOLD ||
        Math.abs(deltaY) > SWIPE_LOCK_THRESHOLD
      if (!passedThreshold) return
      drag.direction =
        Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
      if (drag.direction === 'horizontal') {
        event.currentTarget.setPointerCapture?.(event.pointerId)
        if (openSwipeId && openSwipeId !== drag.id) setOpenSwipeId(null)
      } else {
        dragRef.current = null
        return
      }
    }

    if (drag.direction !== 'horizontal') return
    event.preventDefault()
    const nextOffset = Math.min(
      0,
      Math.max(-REVEAL_WIDTH, drag.baseOffset + deltaX),
    )
    setLiveOffset({ id: drag.id, offset: nextOffset })
  }

  function handleRowPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || drag.direction !== 'horizontal') return
    const finalOffset =
      liveOffset?.id === drag.id ? liveOffset.offset : drag.baseOffset
    setLiveOffset(null)
    setOpenSwipeId(finalOffset <= -REVEAL_WIDTH / 2 ? drag.id : null)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleSelectClick(id: string) {
    if (openSwipeId) {
      setOpenSwipeId(null)
      return
    }
    onSelect(id)
  }

  function handleSwipeDelete(id: string) {
    setOpenSwipeId(null)
    onDelete(id)
  }

  function handleHandlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) {
    event.stopPropagation()
    if (lists.length <= 1) return
    if (!window.matchMedia('(max-width: 640px)').matches) return
    setOpenSwipeId(null)
    const rowEls = navRef.current?.querySelectorAll<HTMLLIElement>(
      '.task-list-nav > li',
    )
    if (!rowEls) return
    const rects: RowRect[] = Array.from(rowEls).map((el, i) => {
      const rect = el.getBoundingClientRect()
      return { id: lists[i].id, top: rect.top, height: rect.height }
    })
    const draggedIndex = lists.findIndex((list) => list.id === id)
    if (draggedIndex === -1) return
    setReorderDrag({
      id,
      draggedIndex,
      rects,
      startY: event.clientY,
      deltaY: 0,
      targetIndex: draggedIndex,
    })
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handleHandlePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (!reorderDrag) return
    event.preventDefault()
    const deltaY = event.clientY - reorderDrag.startY
    const draggedRect = reorderDrag.rects[reorderDrag.draggedIndex]
    const draggedCenter = draggedRect.top + draggedRect.height / 2 + deltaY
    let targetIndex = reorderDrag.rects.findIndex(
      (rect) => draggedCenter < rect.top + rect.height,
    )
    if (targetIndex === -1) targetIndex = reorderDrag.rects.length - 1
    setReorderDrag({ ...reorderDrag, deltaY, targetIndex })
  }

  function handleHandlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!reorderDrag) return
    if (reorderDrag.targetIndex !== reorderDrag.draggedIndex) {
      onReorderTo(reorderDrag.id, reorderDrag.targetIndex)
    }
    setReorderDrag(null)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
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
            📅 Mi día
          </button>
        </li>
      </ul>
      <ul className="task-list-nav">
        {lists.map((list, index) => {
          const isDraggingThis = liveOffset?.id === list.id
          const rowOffset = isDraggingThis
            ? liveOffset.offset
            : openSwipeId === list.id
              ? -REVEAL_WIDTH
              : 0

          let liTransform: string | undefined
          let liTransition: string | undefined
          if (reorderDrag) {
            const rowHeight =
              reorderDrag.rects[reorderDrag.draggedIndex]?.height ?? 0
            if (index === reorderDrag.draggedIndex) {
              liTransform = `translateY(${reorderDrag.deltaY}px)`
              liTransition = 'none'
            } else if (
              reorderDrag.targetIndex <= index &&
              index < reorderDrag.draggedIndex
            ) {
              liTransform = `translateY(${rowHeight}px)`
              liTransition = 'transform 0.15s ease'
            } else if (
              reorderDrag.draggedIndex < index &&
              index <= reorderDrag.targetIndex
            ) {
              liTransform = `translateY(-${rowHeight}px)`
              liTransition = 'transform 0.15s ease'
            }
          }

          return (
            <li
              key={list.id}
              className={list.id === selectedListId ? 'active' : ''}
              style={{
                transform: liTransform,
                transition: liTransition,
                position: reorderDrag?.id === list.id ? 'relative' : undefined,
                zIndex: reorderDrag?.id === list.id ? 30 : undefined,
              }}
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
                  transform: `translateX(${rowOffset}px)`,
                  transition: isDraggingThis ? 'none' : undefined,
                }}
                onPointerDown={(event) => handleRowPointerDown(event, list.id)}
                onPointerMove={handleRowPointerMove}
                onPointerUp={handleRowPointerUp}
                onPointerCancel={handleRowPointerUp}
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
                    <button
                      type="button"
                      className="task-list-button"
                      onClick={() => handleSelectClick(list.id)}
                    >
                      {list.name}
                    </button>
                    <button
                      type="button"
                      className="task-list-action task-list-move-up"
                      aria-label={`Mover "${list.name}" arriba`}
                      disabled={index === 0}
                      onClick={() => onMoveUp(list.id)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="task-list-action task-list-move-down"
                      aria-label={`Mover "${list.name}" abajo`}
                      disabled={index === lists.length - 1}
                      onClick={() => onMoveDown(list.id)}
                    >
                      ▼
                    </button>
                    {lists.length > 1 && (
                      <button
                        type="button"
                        className="task-list-drag-handle"
                        aria-hidden="true"
                        tabIndex={-1}
                        onPointerDown={(event) =>
                          handleHandlePointerDown(event, list.id)
                        }
                        onPointerMove={handleHandlePointerMove}
                        onPointerUp={handleHandlePointerUp}
                        onPointerCancel={handleHandlePointerUp}
                      >
                        ⠿
                      </button>
                    )}
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
              </div>
            </li>
          )
        })}
      </ul>
      <form className="add-list" onSubmit={handleAddSubmit}>
        <div className="input-with-icon">
          <span className="input-icon" aria-hidden="true">
            +
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
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
      </div>
    </nav>
  )
}
