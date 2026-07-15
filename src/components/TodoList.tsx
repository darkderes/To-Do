import { useRef } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react'
import type { Priority, Todo } from '../types'
import { useRowDrag } from '../hooks/useRowDrag'
import { TodoItem } from './TodoItem'

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
  const listRef = useRef<HTMLUListElement>(null)
  const drag = useRowDrag({
    ids: todos.map((todo) => todo.id),
    containerRef: listRef,
    rowSelector: '.todo-list > li',
    onReorderTo,
  })

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
    if (!drag.openSwipeId) return
    event.preventDefault()
    drag.setOpenSwipeId(null)
  }

  function handleSwipeDelete(id: string) {
    drag.setOpenSwipeId(null)
    onDelete(id)
  }

  if (todos.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <ul className="todo-list" ref={listRef}>
      {todos.map((todo, index) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          rowOffset={drag.getRowOffset(todo.id)}
          rowTransitionNone={drag.isSwipeDragging(todo.id)}
          isReorderActive={drag.isReorderActive(todo.id)}
          liStyle={drag.getItemStyle(index, todo.id)}
          isSwipeOpen={drag.openSwipeId === todo.id}
          isInMyDay={todo.myDay === today}
          onToggle={onToggle}
          onToggleMyDay={onToggleMyDay}
          onDelete={onDelete}
          onUpdateMeta={onUpdateMeta}
          onReorderKeyDown={(event) =>
            handleReorderKeyDown(event, index, todo.id)
          }
          onRowPointerDown={(event) =>
            drag.handleRowPointerDown(event, todo.id)
          }
          onRowPointerMove={drag.handleRowPointerMove}
          onRowPointerUp={drag.handleRowPointerUp}
          onLabelClick={handleLabelClick}
          onSwipeDelete={() => handleSwipeDelete(todo.id)}
          onStartEditingDetails={() => drag.setOpenSwipeId(null)}
        />
      ))}
    </ul>
  )
}
