import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
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
})
