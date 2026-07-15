import { useRef, useState } from 'react'
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'

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

interface UseRowDragOptions {
  ids: string[]
  containerRef: RefObject<HTMLElement | null>
  rowSelector: string
  onReorderTo: (id: string, targetIndex: number) => void
  isDragEnabled?: boolean
}

export function useRowDrag({
  ids,
  containerRef,
  rowSelector,
  onReorderTo,
  isDragEnabled = true,
}: UseRowDragOptions) {
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const [liveOffset, setLiveOffset] = useState<{
    id: string
    offset: number
  } | null>(null)
  const [reorderDrag, setReorderDrag] = useState<ReorderDrag | null>(null)
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
      containerRef.current?.querySelectorAll<HTMLLIElement>(rowSelector)
    if (!rowEls) return
    const rects: RowRect[] = Array.from(rowEls).map((el, i) => {
      const rect = el.getBoundingClientRect()
      return { id: ids[i], top: rect.top, height: rect.height }
    })
    const draggedIndex = ids.indexOf(id)
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
    if (!isDragEnabled) return
    if (
      event.target instanceof Element &&
      event.target.closest('input, select, textarea')
    ) {
      return
    }
    if (event.pointerType === 'mouse') {
      if (event.button !== 0) return
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

  function getRowOffset(id: string) {
    if (liveOffset?.id === id) return liveOffset.offset
    return openSwipeId === id ? -REVEAL_WIDTH : 0
  }

  function isSwipeDragging(id: string) {
    return liveOffset?.id === id
  }

  function isReorderActive(id: string) {
    return reorderDrag?.id === id
  }

  function getItemStyle(index: number, id: string): CSSProperties {
    let transform: string | undefined
    let transition: string | undefined
    if (reorderDrag) {
      const rowHeight = reorderDrag.rects[reorderDrag.draggedIndex]?.height ?? 0
      if (index === reorderDrag.draggedIndex) {
        transform = `translateY(${reorderDrag.deltaY}px)`
        transition = 'none'
      } else if (
        reorderDrag.targetIndex <= index &&
        index < reorderDrag.draggedIndex
      ) {
        transform = `translateY(${rowHeight}px)`
        transition = 'transform 0.15s ease'
      } else if (
        reorderDrag.draggedIndex < index &&
        index <= reorderDrag.targetIndex
      ) {
        transform = `translateY(-${rowHeight}px)`
        transition = 'transform 0.15s ease'
      }
    }
    return {
      transform,
      transition,
      position: reorderDrag?.id === id ? 'relative' : undefined,
      zIndex: reorderDrag?.id === id ? 30 : undefined,
    }
  }

  return {
    openSwipeId,
    setOpenSwipeId,
    getRowOffset,
    isSwipeDragging,
    isReorderActive,
    getItemStyle,
    handleRowPointerDown,
    handleRowPointerMove,
    handleRowPointerUp,
  }
}
