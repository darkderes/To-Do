import { useRef, useState } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { Priority, Todo } from '../types'
import { TodoItem } from './TodoItem'

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

interface TodoListProps {
  todos: Todo[]
  emptyMessage: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onReorderTo: (id: string, targetIndex: number) => void
  onUpdateMeta: (
    id: string,
    dueDate: string | undefined,
    priority: Priority | undefined,
  ) => void
  onToggleMyDay: (id: string) => void
  today: string
}

export function TodoList({
  todos,
  emptyMessage,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onReorderTo,
  onUpdateMeta,
  onToggleMyDay,
  today,
}: TodoListProps) {
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const [liveOffset, setLiveOffset] = useState<{
    id: string
    offset: number
  } | null>(null)
  const [reorderDrag, setReorderDrag] = useState<ReorderDrag | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const dragRef = useRef<SwipeDrag | null>(null)

  function handleRowPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    id: string,
  ) {
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

  function handleLabelClick(event: ReactMouseEvent) {
    if (!openSwipeId) return
    event.preventDefault()
    setOpenSwipeId(null)
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
    if (!window.matchMedia('(max-width: 640px)').matches) return
    setOpenSwipeId(null)
    const rowEls =
      listRef.current?.querySelectorAll<HTMLLIElement>('.todo-list > li')
    if (!rowEls) return
    const rects: RowRect[] = Array.from(rowEls).map((el, i) => {
      const rect = el.getBoundingClientRect()
      return { id: todos[i].id, top: rect.top, height: rect.height }
    })
    const draggedIndex = todos.findIndex((todo) => todo.id === id)
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

  if (todos.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <ul className="todo-list" ref={listRef}>
      {todos.map((todo, index) => {
        const isDraggingSwipe = liveOffset?.id === todo.id
        const rowOffset = isDraggingSwipe
          ? liveOffset.offset
          : openSwipeId === todo.id
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
          <TodoItem
            key={todo.id}
            todo={todo}
            canMoveUp={index > 0}
            canMoveDown={index < todos.length - 1}
            rowOffset={rowOffset}
            rowTransitionNone={isDraggingSwipe}
            liStyle={{
              transform: liTransform,
              transition: liTransition,
              position: reorderDrag?.id === todo.id ? 'relative' : undefined,
              zIndex: reorderDrag?.id === todo.id ? 30 : undefined,
            }}
            isSwipeOpen={openSwipeId === todo.id}
            isInMyDay={todo.myDay === today}
            onToggle={onToggle}
            onToggleMyDay={onToggleMyDay}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onUpdateMeta={onUpdateMeta}
            onRowPointerDown={(event) => handleRowPointerDown(event, todo.id)}
            onRowPointerMove={handleRowPointerMove}
            onRowPointerUp={handleRowPointerUp}
            onLabelClick={handleLabelClick}
            onSwipeDelete={() => handleSwipeDelete(todo.id)}
            onHandlePointerDown={(event) =>
              handleHandlePointerDown(event, todo.id)
            }
            onHandlePointerMove={handleHandlePointerMove}
            onHandlePointerUp={handleHandlePointerUp}
            onStartEditingDetails={() => setOpenSwipeId(null)}
          />
        )
      })}
    </ul>
  )
}
