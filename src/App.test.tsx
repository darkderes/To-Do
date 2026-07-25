import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { getTodayString } from './types'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('adds a new todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('1 tarea pendiente')).toBeInTheDocument()
  })

  it('toggles a todo as completed', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByText('0 tareas pendientes')).toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /completadas \(1\)/i }))
    expect(screen.getByText('Buy milk')).toHaveClass('completed')
  })

  it('deletes a todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByText('Buy milk'))
    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }))

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(screen.getByText(/aún no hay tareas/i)).toBeInTheDocument()
  })

  function getUserMenuTrigger() {
    return screen.getByRole('button', {
      name: /perfil y configuración/i,
    })
  }

  it('toggles between light and dark theme and persists the choice', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(getUserMenuTrigger())
    await user.click(
      screen.getByRole('button', { name: /activar modo oscuro/i }),
    )

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('theme')).toBe('dark')

    await user.click(
      screen.getByRole('button', { name: /activar modo claro/i }),
    )

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('theme')).toBe('light')
  })

  it('restores a previously stored theme preference', async () => {
    window.localStorage.setItem('theme', 'dark')
    const user = userEvent.setup()
    render(<App />)

    expect(document.documentElement.dataset.theme).toBe('dark')
    await user.click(getUserMenuTrigger())
    expect(
      screen.getByRole('button', { name: /activar modo claro/i }),
    ).toBeInTheDocument()
  })

  it('toggles the theme from the user menu inside the sidebar drawer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /listas de tareas, lista actual/i }),
    )
    await user.click(getUserMenuTrigger())
    await user.click(
      screen.getByRole('button', { name: /activar modo oscuro/i }),
    )

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('theme')).toBe('dark')
    expect(
      screen.getByRole('button', { name: /activar modo claro/i }),
    ).toBeInTheDocument()
  })

  it('changes and persists the accent color', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(getUserMenuTrigger())
    await user.click(screen.getByRole('button', { name: /^azul$/i }))

    expect(window.localStorage.getItem('accentColor')).toBe('blue')
    expect(
      document.documentElement.style.getPropertyValue('--accent-light'),
    ).toBe('#2563eb')
    expect(screen.getByRole('button', { name: /^azul$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows a default list for new users', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: 'Mis tareas' }),
    ).toBeInTheDocument()
  })

  it('creates a new list and only shows tasks added while it is selected', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )
    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Ship feature{Enter}',
    )

    expect(screen.getByText('Ship feature')).toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mis tareas' }))

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Ship feature')).not.toBeInTheDocument()
  })

  it('renames a list', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /renombrar "mis tareas"/i }),
    )
    const input = screen.getByLabelText(/renombrar lista mis tareas/i)
    await user.clear(input)
    await user.type(input, 'Personal{Enter}')

    expect(screen.getByRole('button', { name: 'Personal' })).toBeInTheDocument()
  })

  it('deletes a list and its tasks after confirming, falling back to another list', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Ship feature{Enter}',
    )

    await user.click(
      screen.getByRole('button', { name: /eliminar lista "work"/i }),
    )

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Work'))
    expect(
      screen.queryByRole('button', { name: 'Work' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Mis tareas' }),
    ).toBeInTheDocument()
  })

  it('keeps a list and its tasks when the deletion is not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Ship feature{Enter}',
    )

    await user.click(
      screen.getByRole('button', { name: /eliminar lista "work"/i }),
    )

    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()
  })

  it('edits a todo title from the details modal', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByText('Buy milk'))

    const input = screen.getByLabelText(/título de la tarea/i)
    await user.clear(input)
    await user.type(input, 'Buy oat milk')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Buy oat milk')).toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
  })

  it('cancels a todo edit with Escape, keeping the original text', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByText('Buy milk'))

    const input = screen.getByLabelText(/título de la tarea/i)
    await user.clear(input)
    await user.type(input, 'Something else')
    await user.keyboard('{Escape}')

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Something else')).not.toBeInTheDocument()
  })

  it('shows an undo toast when completing a task, without stealing focus', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByText('Tarea completada')).toBeInTheDocument()
    const undoButton = screen.getByRole('button', { name: /deshacer/i })
    expect(undoButton).not.toHaveFocus()

    await user.click(undoButton)

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('1 tarea pendiente')).toBeInTheDocument()
  })

  it('marks overdue tasks and tasks due today on their badge', () => {
    const today = getTodayString()
    window.localStorage.setItem(
      'todos',
      JSON.stringify([
        {
          id: '1',
          text: 'Old task',
          completed: false,
          listId: 'default',
          dueDate: '2000-01-01',
        },
        {
          id: '2',
          text: 'Today task',
          completed: false,
          listId: 'default',
          dueDate: today,
        },
      ]),
    )
    render(<App />)

    expect(screen.getByText(/vencida · 01\/01\/2000/i)).toBeInTheDocument()
    expect(screen.getByText('Hoy')).toBeInTheDocument()
  })

  it('closes the details modal with the cancel button without saving', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByText('Buy milk'))
    await user.click(screen.getByRole('button', { name: /alta prioridad/i }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.queryByRole('button', { name: 'Guardar' }),
    ).not.toBeInTheDocument()
    expect(document.querySelector('.priority-badge')).not.toBeInTheDocument()
  })

  it('undoes a todo deletion within the undo window', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByText('Buy milk'))
    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }))

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /deshacer/i }))

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('moves focus to the undo button after deleting a todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByText('Buy milk'))
    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }))

    expect(screen.getByRole('button', { name: /deshacer/i })).toHaveFocus()
  })

  it('keeps an independent undo entry per deleted todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Walk dog{Enter}',
    )

    await user.click(screen.getByText('Buy milk'))
    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }))
    await user.click(screen.getByText('Walk dog'))
    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }))

    expect(screen.getAllByRole('button', { name: /deshacer/i })).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: /deshacer/i })[0])

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /deshacer/i })).toHaveLength(1)
  })

  it('pauses the auto-dismiss timer while the toast is hovered, and resumes on mouse leave', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.change(screen.getByLabelText(/texto de la nueva tarea/i), {
      target: { value: 'Buy milk' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))
    fireEvent.click(screen.getByText('Buy milk'))
    fireEvent.click(screen.getByRole('button', { name: /eliminar tarea/i }))

    const toast = screen.getByRole('status')
    fireEvent.mouseEnter(toast)
    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(
      screen.getByRole('button', { name: /deshacer/i }),
    ).toBeInTheDocument()

    fireEvent.mouseLeave(toast)
    act(() => {
      vi.advanceTimersByTime(5100)
    })

    expect(
      screen.queryByRole('button', { name: /deshacer/i }),
    ).not.toBeInTheDocument()
  })

  it('opens and closes the mobile sidebar drawer, moving focus in and out', async () => {
    const user = userEvent.setup()
    render(<App />)

    const toggle = screen.getByRole('button', {
      name: /listas de tareas, lista actual/i,
    })
    await user.click(toggle)

    expect(screen.getByRole('navigation')).toHaveClass('open')
    expect(screen.getByRole('button', { name: 'Mis tareas' })).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.getByRole('navigation')).not.toHaveClass('open')
    expect(toggle).toHaveFocus()
  })

  it('closes the sidebar drawer via the backdrop and when a list is selected', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    const toggle = screen.getByRole('button', {
      name: /listas de tareas, lista actual/i,
    })
    await user.click(toggle)
    expect(screen.getByRole('navigation')).toHaveClass('open')

    await user.click(screen.getByRole('button', { name: 'Mis tareas' }))
    expect(screen.getByRole('navigation')).not.toHaveClass('open')

    await user.click(toggle)
    expect(document.querySelector('.sidebar-backdrop')).toBeInTheDocument()
    await user.click(document.querySelector('.sidebar-backdrop')!)
    expect(screen.getByRole('navigation')).not.toHaveClass('open')
  })

  it('hides completed tasks in a collapsible section, closed by default', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByRole('checkbox'))

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /completadas \(1\)/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Buy milk')).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
  })

  it('does not show bulk mark-all/unmark-all or clear-completed actions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    expect(
      screen.queryByRole('button', { name: /marcar todas/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /desmarcar todas/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /borrar completadas/i }),
    ).not.toBeInTheDocument()
  })

  it('reorders todos by dragging the row with the mouse on desktop', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Walk dog{Enter}',
    )

    let items = document.querySelectorAll('.todo-item')
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(items[1]).toHaveTextContent('Walk dog')

    const row = document.querySelectorAll('.todo-item-row')[0]
    fireEvent.pointerDown(row, {
      clientX: 20,
      clientY: 10,
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerMove(row, {
      clientX: 20,
      clientY: 90,
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerUp(row, {
      clientX: 20,
      clientY: 90,
      pointerId: 1,
      pointerType: 'mouse',
    })

    items = document.querySelectorAll('.todo-item')
    expect(items[0]).toHaveTextContent('Walk dog')
    expect(items[1]).toHaveTextContent('Buy milk')
  })

  it('ignores right-button mouse drags for reordering', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Walk dog{Enter}',
    )

    const row = document.querySelectorAll('.todo-item-row')[0]
    fireEvent.pointerDown(row, {
      clientX: 20,
      clientY: 10,
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
    })
    fireEvent.pointerMove(row, {
      clientX: 20,
      clientY: 90,
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerUp(row, {
      clientX: 20,
      clientY: 90,
      pointerId: 1,
      pointerType: 'mouse',
    })

    const items = document.querySelectorAll('.todo-item')
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(items[1]).toHaveTextContent('Walk dog')
  })

  it('syncs todos written by another tab via the storage event', () => {
    render(<App />)

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'todos',
          newValue: JSON.stringify([
            {
              id: 'other-tab-1',
              text: 'From other tab',
              completed: false,
              listId: 'default',
            },
          ]),
        }),
      )
    })

    expect(screen.getByText('From other tab')).toBeInTheDocument()
  })

  it('reorders todos with arrow keys on the drag handle', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Walk dog{Enter}',
    )

    fireEvent.keyDown(
      screen.getByRole('button', { name: /reordenar "buy milk"/i }),
      { key: 'ArrowDown' },
    )

    let items = document.querySelectorAll('.todo-item')
    expect(items[0]).toHaveTextContent('Walk dog')
    expect(items[1]).toHaveTextContent('Buy milk')

    fireEvent.keyDown(
      screen.getByRole('button', { name: /reordenar "buy milk"/i }),
      { key: 'ArrowUp' },
    )

    items = document.querySelectorAll('.todo-item')
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(items[1]).toHaveTextContent('Walk dog')
  })

  it('reorders lists with arrow keys on the drag handle', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    fireEvent.keyDown(
      screen.getByRole('button', { name: /reordenar lista "work"/i }),
      { key: 'ArrowUp' },
    )

    const listButtons = screen.getAllByRole('button', {
      name: /^(mis tareas|work)$/i,
    })
    expect(listButtons[0]).toHaveTextContent('Work')
    expect(listButtons[1]).toHaveTextContent('Mis tareas')
  })

  it('migrates stored todos without a listId to the default list', () => {
    window.localStorage.setItem(
      'todos',
      JSON.stringify([
        { id: 'legacy-1', text: 'Legacy task', completed: false },
      ]),
    )
    render(<App />)

    expect(screen.getByText('Legacy task')).toBeInTheDocument()

    const stored = JSON.parse(window.localStorage.getItem('todos') ?? '[]') as {
      listId?: string
    }[]
    expect(stored[0].listId).toBe('default')
  })

  it('restores an undone todo into the current list when its list was deleted', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Ship feature{Enter}',
    )
    await user.click(screen.getByText('Ship feature'))
    await user.click(screen.getByRole('button', { name: /eliminar tarea/i }))
    await user.click(
      screen.getByRole('button', { name: /eliminar lista "work"/i }),
    )

    expect(
      screen.getByRole('button', { name: 'Mis tareas' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /deshacer/i }))

    expect(screen.getByText('Ship feature')).toBeInTheDocument()
  })

  it('does not show move up/down buttons on todo items', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    expect(
      screen.queryByRole('button', { name: /mover "buy milk" arriba/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /mover "buy milk" abajo/i }),
    ).not.toBeInTheDocument()
  })

  it('reorders lists by dragging the row with the mouse on desktop', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    let listButtons = screen.getAllByRole('button', {
      name: /^(mis tareas|work)$/i,
    })
    expect(listButtons[0]).toHaveTextContent('Mis tareas')
    expect(listButtons[1]).toHaveTextContent('Work')

    const row = document.querySelectorAll('.task-list-item-row')[1]
    fireEvent.pointerDown(row, {
      clientX: 20,
      clientY: 90,
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerMove(row, {
      clientX: 20,
      clientY: 10,
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerUp(row, {
      clientX: 20,
      clientY: 10,
      pointerId: 1,
      pointerType: 'mouse',
    })

    listButtons = screen.getAllByRole('button', {
      name: /^(mis tareas|work)$/i,
    })
    expect(listButtons[0]).toHaveTextContent('Work')
    expect(listButtons[1]).toHaveTextContent('Mis tareas')
  })

  it('does not show move up/down buttons on lists', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    expect(
      screen.queryByRole('button', { name: /mover "work" arriba/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /mover "work" abajo/i }),
    ).not.toBeInTheDocument()
  })

  it('reveals a real delete button when swiping a mobile list row left, and removes it on tap', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(max-width: 640px)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    const row = document.querySelectorAll('.task-list-item-row')[0]
    fireEvent.pointerDown(row, { clientX: 300, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 240, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 200, clientY: 50, pointerId: 1 })
    fireEvent.pointerUp(row, { clientX: 200, clientY: 50, pointerId: 1 })

    const revealButton = screen.getByRole('button', {
      name: /quitar lista "mis tareas"/i,
    })
    expect(revealButton).toBeInTheDocument()

    await user.click(revealButton)

    expect(
      screen.queryByRole('button', { name: 'Mis tareas' }),
    ).not.toBeInTheDocument()
  })

  it('does not reveal the delete button on a mostly-vertical drag (lets the list scroll)', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(max-width: 640px)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    const row = document.querySelectorAll('.task-list-item-row')[0]
    fireEvent.pointerDown(row, { clientX: 300, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 295, clientY: 90, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 290, clientY: 130, pointerId: 1 })
    fireEvent.pointerUp(row, { clientX: 290, clientY: 130, pointerId: 1 })

    expect(row).not.toHaveStyle({ transform: 'translateX(-88px)' })
  })

  it('reorders lists by long-pressing and dragging the row on touch, without touching the swipe row', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(max-width: 640px)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    const row = document.querySelectorAll('.task-list-item-row')[1]
    fireEvent.pointerDown(row, { clientX: 20, clientY: 90, pointerId: 1 })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320))
    })
    fireEvent.pointerMove(row, { clientX: 20, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(row, { clientX: 20, clientY: 10, pointerId: 1 })

    const listButtons = screen.getAllByRole('button', {
      name: /^(mis tareas|work)$/i,
    })
    expect(listButtons[0]).toHaveTextContent('Work')
    expect(listButtons[1]).toHaveTextContent('Mis tareas')
  })

  it('exposes the list drag handle as a labelled button for keyboard users', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Work{Enter}',
    )

    const handle = screen.getByRole('button', {
      name: /reordenar lista "work"/i,
    })
    expect(handle).toHaveClass('task-list-drag-handle')
  })

  function mockMobileMatchMedia() {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(max-width: 640px)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)
  }

  it('reveals a real delete button when swiping a mobile todo row left, and removes it on tap', async () => {
    mockMobileMatchMedia()
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    const row = document.querySelectorAll('.todo-item-row')[0]
    fireEvent.pointerDown(row, { clientX: 300, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 240, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(row, { clientX: 200, clientY: 50, pointerId: 1 })
    fireEvent.pointerUp(row, { clientX: 200, clientY: 50, pointerId: 1 })

    const revealButton = screen.getByRole('button', {
      name: /quitar "buy milk"/i,
    })
    expect(revealButton).toBeInTheDocument()

    await user.click(revealButton)

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
  })

  it('reorders todos by long-pressing and dragging the row on touch', async () => {
    mockMobileMatchMedia()
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Walk dog{Enter}',
    )

    const row = document.querySelectorAll('.todo-item-row')[0]
    fireEvent.pointerDown(row, { clientX: 20, clientY: 10, pointerId: 1 })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320))
    })
    fireEvent.pointerMove(row, { clientX: 20, clientY: 80, pointerId: 1 })
    fireEvent.pointerUp(row, { clientX: 20, clientY: 80, pointerId: 1 })

    const items = document.querySelectorAll('.todo-item-main label span')
    expect(items[0]).toHaveTextContent('Walk dog')
    expect(items[1]).toHaveTextContent('Buy milk')
  })

  it('exposes the todo drag handle as a labelled button for keyboard users', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    const handle = screen.getByRole('button', {
      name: /reordenar "buy milk"/i,
    })
    expect(handle).toHaveClass('todo-drag-handle')
  })

  it('adds a todo with just its text, with no due date or priority fields on the form', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.queryByLabelText(/fecha límite \(opcional\)/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/prioridad \(opcional\)/i),
    ).not.toBeInTheDocument()

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(document.querySelector('.due-badge')).not.toBeInTheDocument()
    expect(document.querySelector('.priority-badge')).not.toBeInTheDocument()

    await user.click(screen.getByText('Buy milk'))
    expect(screen.getByText('Descripción')).toBeInTheDocument()
  })

  it('shows the add-task input in a fixed bar at the bottom with the "Agregar tarea" placeholder', () => {
    render(<App />)

    const input = screen.getByLabelText(/texto de la nueva tarea/i)
    expect(input).toHaveAttribute('placeholder', 'Agregar tarea')
    expect(input.closest('.add-todo-bar')).toBeInTheDocument()
  })

  it('edits the due date and priority of an existing todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    await user.click(screen.getByText('Buy milk'))
    await user.click(screen.getByRole('button', { name: 'Personalizado' }))
    await user.type(
      screen.getByLabelText(/fecha personalizada/i),
      '2026-08-01',
    )
    await user.click(screen.getByRole('button', { name: /baja prioridad/i }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText(/01\/08\/2026/)).toBeInTheDocument()
    expect(document.querySelector('.priority-badge')).toHaveTextContent('Baja')
  })

  it('shows a targeted message when every task is completed', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )
    await user.click(screen.getByRole('checkbox'))

    expect(
      screen.getByText(/no hay tareas activas.*todo al día/i),
    ).toBeInTheDocument()
  })

  it('shows only tasks flagged for today in "Mi día", toggled via the sun icon', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Buy milk{Enter}',
    )

    await user.click(screen.getByRole('button', { name: 'Mi día' }))
    expect(screen.getByText(/nada marcado para hoy/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mis tareas' }))
    await user.click(
      screen.getByRole('button', { name: /añadir "buy milk" a mi día/i }),
    )

    await user.click(screen.getByRole('button', { name: 'Mi día' }))
    expect(screen.getByText('Buy milk')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /quitar "buy milk" de mi día/i }),
    )
    expect(screen.getByText(/nada marcado para hoy/i)).toBeInTheDocument()
  })

  it('adds tasks created while viewing "Mi día" to the last real list used, flagged for today', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre de la nueva lista/i),
      'Trabajo{Enter}',
    )

    await user.click(screen.getByRole('button', { name: 'Mi día' }))
    await user.type(
      screen.getByLabelText(/texto de la nueva tarea/i),
      'Send report{Enter}',
    )

    expect(screen.getByText('Send report')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Trabajo' }))
    expect(screen.getByText('Send report')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mis tareas' }))
    expect(screen.queryByText('Send report')).not.toBeInTheDocument()
  })
})
