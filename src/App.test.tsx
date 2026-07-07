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
})
