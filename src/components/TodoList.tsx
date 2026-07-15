import { useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { Priority, Todo } from '../types'
import { TodoItem } from './TodoItem'

const REVEAL_WIDTH = 88
const SWIPE_LOCK_THRESHOLD = 8
const LONG_PRESS_MS = 300

interface SwipeDrag {
  id: string
  startX: number
  startY: number
  baseOffset: number
  direction: 'horizontal' | 'vertical' | 'drag' | null
  pointerId: number
  element: HTMLDivElement
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

interface MouseRowDrag {
  id: string
  startY: number
  started: boolean
}

function computeTargetIndex(
  rects: RowRect[],
  draggedIndex: number,
  deltaY: number,
) {
  const draggedRect = rects[draggedIndex]
  const draggedCenter = draggedRect.top + draggedRect.height / 2 + deltaY
  const index = rects.findIndex(
    (rect) => draggedCenter < rect.top + rect.height,
  )
  return index === -1 ? rects.length - 1 : index
}

interface TodoListProps {
  todos: Todo[]
  emptyMessage: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
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
  const mouseDragRef = useRef<MouseRowDrag | null>(null)
  const longPressTimerRef = useRef<number | null>(null)

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function beginReorderDrag(id: string, startY: number, deltaY: number) {
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
      startY,
      deltaY,
      targetIndex: computeTargetIndex(rects, draggedIndex, deltaY),
    })
  }

  function updateReorderDrag(deltaY: number) {
    if (!reorderDrag) return
    setReorderDrag({
      ...reorderDrag,
      deltaY,
      targetIndex: computeTargetIndex(
        reorderDrag.rects,
        reorderDrag.draggedIndex,
        deltaY,
      ),
    })
  }

  function finishReorderDrag() {
    if (reorderDrag && reorderDrag.targetIndex !== reorderDrag.draggedIndex) {
      onReorderTo(reorderDrag.id, reorderDrag.targetIndex)
    }
    setReorderDrag(null)
  }

  function handleRowPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    id: string,
  ) {
    if (event.pointerType === 'mouse') {
      mouseDragRef.current = { id, startY: event.clientY, started: false }
      return
    }
    if (!window.matchMedia('(max-width: 640px)').matches) return
    const startY = event.clientY
    const element = event.currentTarget
    dragRef.current = {
      id,
      startX: event.clientX,
      startY,
      baseOffset: openSwipeId === id ? -REVEAL_WIDTH : 0,
      direction: null,
      pointerId: event.pointerId,
      element,
    }
    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null
      const drag = dragRef.current
      if (!drag || drag.id !== id || drag.direction !== null) return
      drag.direction = 'drag'
      beginReorderDrag(id, startY, 0)
      element.setPointerCapture?.(drag.pointerId)
    }, LONG_PRESS_MS)
  }

  function handleRowPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const mouseDrag = mouseDragRef.current
    if (mouseDrag) {
      const deltaY = event.clientY - mouseDrag.startY
      if (!mouseDrag.started) {
        if (Math.abs(deltaY) <= SWIPE_LOCK_THRESHOLD) return
        mouseDrag.started = true
        beginReorderDrag(mouseDrag.id, mouseDrag.startY, deltaY)
        event.currentTarget.setPointerCapture?.(event.pointerId)
        return
      }
      event.preventDefault()
      updateReorderDrag(deltaY)
      return
    }

    const drag = dragRef.current
    if (!drag) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (drag.direction === 'drag') {
      event.preventDefault()
      updateReorderDrag(deltaY)
      return
    }

    if (drag.direction === null) {
      const passedThreshold =
        Math.abs(deltaX) > SWIPE_LOCK_THRESHOLD ||
        Math.abs(deltaY) > SWIPE_LOCK_THRESHOLD
      if (!passedThreshold) return
      clearLongPressTimer()
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
    const mouseDrag = mouseDragRef.current
    if (mouseDrag) {
      mouseDragRef.current = null
      if (mouseDrag.started) {
        finishReorderDrag()
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      }
      return
    }

    clearLongPressTimer()
    const drag = dragRef.current
    dragRef.current = null

    if (drag?.direction === 'drag') {
      finishReorderDrag()
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

    if (!drag || drag.direction !== 'horizontal') return
    const finalOffset =
      liveOffset?.id === drag.id ? liveOffset.offset : drag.baseOffset
    setLiveOffset(null)
    setOpenSwipeId(finalOffset <= -REVEAL_WIDTH / 2 ? drag.id : null)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleReorderKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
    id: string,
  ) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const target = index + (event.key === 'ArrowUp' ? -1 : 1)
    if (target < 0 || target >= todos.length) return
    onReorderTo(id, target)
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
            rowOffset={rowOffset}
            rowTransitionNone={isDraggingSwipe}
            isReorderActive={reorderDrag?.id === todo.id}
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
            onUpdateMeta={onUpdateMeta}
            onReorderKeyDown={(event) =>
              handleReorderKeyDown(event, index, todo.id)
            }
            onRowPointerDown={(event) => handleRowPointerDown(event, todo.id)}
            onRowPointerMove={handleRowPointerMove}
            onRowPointerUp={handleRowPointerUp}
            onLabelClick={handleLabelClick}
            onSwipeDelete={() => handleSwipeDelete(todo.id)}
            onStartEditingDetails={() => setOpenSwipeId(null)}
          />
        )
      })}
    </ul>
  )
}
