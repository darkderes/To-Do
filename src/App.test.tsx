import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

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

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('1 tarea pendiente')).toBeInTheDocument()
  })

  it('toggles a todo as completed', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByText('Buy milk')).toHaveClass('completed')
    expect(screen.getByText('0 tareas pendientes')).toBeInTheDocument()
  })

  it('deletes a todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.click(screen.getByRole('button', { name: /eliminar/i }))

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(screen.getByText(/aún no hay tareas/i)).toBeInTheDocument()
  })

  it('toggles between light and dark theme and persists the choice', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(document.documentElement.dataset.theme).toBe('light')

    const toggle = screen.getByRole('button', { name: /cambiar a modo oscuro/i })
    await user.click(toggle)

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('theme')).toBe('dark')
    expect(screen.getByRole('button', { name: /cambiar a modo claro/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cambiar a modo claro/i }))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('theme')).toBe('light')
  })

  it('restores a previously stored theme preference', () => {
    window.localStorage.setItem('theme', 'dark')
    render(<App />)

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: /cambiar a modo claro/i })).toBeInTheDocument()
  })

  it('shows a default list for new users', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Mis tareas' })).toBeInTheDocument()
  })

  it('creates a new list and only shows tasks added while it is selected', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')

    await user.type(screen.getByLabelText(/nombre de la nueva lista/i), 'Work{Enter}')
    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Ship feature{Enter}')

    expect(screen.getByText('Ship feature')).toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mis tareas' }))

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Ship feature')).not.toBeInTheDocument()
  })

  it('renames a list', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /renombrar "mis tareas"/i }))
    const input = screen.getByLabelText(/renombrar lista mis tareas/i)
    await user.clear(input)
    await user.type(input, 'Personal{Enter}')

    expect(screen.getByRole('button', { name: 'Personal' })).toBeInTheDocument()
  })

  it('deletes a list and its tasks after confirming, falling back to another list', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/nombre de la nueva lista/i), 'Work{Enter}')
    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Ship feature{Enter}')

    await user.click(screen.getByRole('button', { name: /eliminar lista "work"/i }))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Work'))
    expect(screen.queryByRole('button', { name: 'Work' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mis tareas' })).toBeInTheDocument()
  })

  it('keeps a list and its tasks when the deletion is not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/nombre de la nueva lista/i), 'Work{Enter}')
    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Ship feature{Enter}')

    await user.click(screen.getByRole('button', { name: /eliminar lista "work"/i }))

    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()
  })

  it('undoes a todo deletion within the undo window', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.click(screen.getByRole('button', { name: /eliminar/i }))

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /deshacer/i }))

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('moves focus to the undo button after deleting a todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.click(screen.getByRole('button', { name: /eliminar/i }))

    expect(screen.getByRole('button', { name: /deshacer/i })).toHaveFocus()
  })

  it('keeps an independent undo entry per deleted todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Walk dog{Enter}')

    await user.click(screen.getByRole('button', { name: /eliminar "buy milk"/i }))
    await user.click(screen.getByRole('button', { name: /eliminar "walk dog"/i }))

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
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }))

    const toast = screen.getByRole('status')
    fireEvent.mouseEnter(toast)
    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(screen.getByRole('button', { name: /deshacer/i })).toBeInTheDocument()

    fireEvent.mouseLeave(toast)
    act(() => {
      vi.advanceTimersByTime(5100)
    })

    expect(screen.queryByRole('button', { name: /deshacer/i })).not.toBeInTheDocument()
  })

  it('resets the filter to "todas" when switching lists', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.click(screen.getByRole('button', { name: 'completadas' }))
    expect(screen.getByText(/no hay tareas completadas todavía/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/nombre de la nueva lista/i), 'Work{Enter}')

    expect(screen.getByRole('button', { name: 'todas' })).toHaveClass('active')

    await user.click(screen.getByRole('button', { name: 'Mis tareas' }))

    expect(screen.getByRole('button', { name: 'todas' })).toHaveClass('active')
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('marks all todos in the current list as complete', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Walk dog{Enter}')

    await user.click(screen.getByRole('button', { name: 'Marcar todas' }))

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByText('0 tareas pendientes')).toBeInTheDocument()
  })

  it('clears completed todos in the current list with per-task undo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Walk dog{Enter}')
    await user.click(screen.getAllByRole('checkbox')[0])

    await user.click(screen.getByRole('button', { name: 'Borrar completadas' }))

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(screen.getByText('Walk dog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /deshacer/i }))

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('disables batch action buttons when they would have no effect', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')

    expect(screen.getByRole('button', { name: 'Borrar completadas' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Marcar todas' }))

    expect(screen.getByRole('button', { name: 'Marcar todas' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Borrar completadas' })).not.toBeDisabled()
  })

  it('reorders todos with the move up/down buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Walk dog{Enter}')

    let items = document.querySelectorAll('.todo-item')
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(items[1]).toHaveTextContent('Walk dog')

    await user.click(screen.getByRole('button', { name: /mover "walk dog" arriba/i }))

    items = document.querySelectorAll('.todo-item')
    expect(items[0]).toHaveTextContent('Walk dog')
    expect(items[1]).toHaveTextContent('Buy milk')

    expect(screen.getByRole('button', { name: /mover "walk dog" arriba/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /mover "buy milk" abajo/i })).toBeDisabled()
  })

  it('reorders lists with the move up/down buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/nombre de la nueva lista/i), 'Work{Enter}')

    let listButtons = screen.getAllByRole('button', { name: /^(mis tareas|work)$/i })
    expect(listButtons[0]).toHaveTextContent('Mis tareas')
    expect(listButtons[1]).toHaveTextContent('Work')

    await user.click(screen.getByRole('button', { name: /mover "work" arriba/i }))

    listButtons = screen.getAllByRole('button', { name: /^(mis tareas|work)$/i })
    expect(listButtons[0]).toHaveTextContent('Work')
    expect(listButtons[1]).toHaveTextContent('Mis tareas')
  })

  it('adds a todo with a due date and priority and shows them as badges', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk')
    await user.type(screen.getByLabelText(/fecha límite/i), '2026-07-20')
    await user.selectOptions(screen.getByLabelText(/^prioridad/i), 'high')
    await user.click(screen.getByRole('button', { name: 'Añadir' }))

    expect(screen.getByText(/20\/07\/2026/)).toBeInTheDocument()
    expect(document.querySelector('.priority-badge')).toHaveTextContent('Alta')
  })

  it('edits the due date and priority of an existing todo', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')

    await user.click(screen.getByRole('button', { name: /editar detalles de "buy milk"/i }))
    await user.type(screen.getByLabelText(/fecha límite de "buy milk"/i), '2026-08-01')
    await user.selectOptions(screen.getByLabelText(/prioridad de "buy milk"/i), 'low')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText(/01\/08\/2026/)).toBeInTheDocument()
    expect(document.querySelector('.priority-badge')).toHaveTextContent('Baja')
  })

  it('shows a targeted message when a filter hides existing tasks', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/texto de la nueva tarea/i), 'Buy milk{Enter}')
    await user.click(screen.getByRole('button', { name: 'completadas' }))

    expect(screen.getByText(/no hay tareas completadas todavía/i)).toBeInTheDocument()
  })
})
