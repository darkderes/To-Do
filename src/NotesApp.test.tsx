import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('Notes', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('switches between tasks and notes with the mode switch, persisting the mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByLabelText(/texto de la nueva tarea/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Notas' }))

    expect(screen.getByRole('heading', { name: 'Mi notebook' })).toBeVisible()
    expect(
      screen.queryByLabelText(/texto de la nueva tarea/i),
    ).not.toBeInTheDocument()
    expect(window.localStorage.getItem('appMode')).toBe('"notes"')

    await user.click(screen.getByRole('button', { name: 'Tareas' }))

    expect(
      screen.getByLabelText(/texto de la nueva tarea/i),
    ).toBeInTheDocument()
  })

  it('creates a note and shows it in the notebook list', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Notas' }))
    expect(screen.getByText(/aún no hay notas/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /nueva nota/i }))
    await user.type(
      screen.getByLabelText(/título de la nota/i),
      'Ideas de viaje',
    )
    await user.type(
      screen.getByLabelText(/contenido de la nota/i),
      'Visitar Kioto en otoño',
    )
    await user.click(
      screen.getByRole('button', { name: /volver a las notas/i }),
    )

    expect(screen.getByText('Ideas de viaje')).toBeInTheDocument()
    expect(screen.getByText('Visitar Kioto en otoño')).toBeInTheDocument()
    expect(screen.getByText('1 nota')).toBeInTheDocument()
  })

  it('opens an existing note and renders its YouTube embed automatically', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    window.localStorage.setItem(
      'notes',
      JSON.stringify([
        {
          id: 'n1',
          notebookId: 'notebook-default',
          title: 'Video favorito',
          content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          images: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    )
    render(<App />)

    await user.click(screen.getByText('Video favorito'))

    const iframe = screen.getByTitle('Video de YouTube')
    expect(iframe).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('renders link cards and image URLs automatically below the text', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    window.localStorage.setItem(
      'notes',
      JSON.stringify([
        {
          id: 'n1',
          notebookId: 'notebook-default',
          title: 'Enlaces',
          content: 'https://example.com/articulo\nhttps://example.com/foto.png',
          images: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    )
    render(<App />)

    await user.click(screen.getByText('Enlaces'))

    const card = screen.getByRole('link', { name: /example\.com/i })
    expect(card).toHaveAttribute('href', 'https://example.com/articulo')
    expect(document.querySelector('.note-image')).toHaveAttribute(
      'src',
      'https://example.com/foto.png',
    )
  })

  it('deletes a note without a native dialog and restores it via the undo toast', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    window.localStorage.setItem(
      'notes',
      JSON.stringify([
        {
          id: 'n1',
          notebookId: 'notebook-default',
          title: 'Borrable',
          content: '',
          images: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    )
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /eliminar nota "borrable"/i }),
    )

    expect(screen.queryByText('Borrable')).not.toBeInTheDocument()
    expect(screen.getByText('Nota eliminada')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /deshacer/i }))

    expect(screen.getByText('Borrable')).toBeInTheDocument()
  })

  it('filters notes with the search input', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    window.localStorage.setItem(
      'notes',
      JSON.stringify([
        {
          id: 'n1',
          notebookId: 'notebook-default',
          title: 'Receta de pan',
          content: 'harina y agua',
          images: {},
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 'n2',
          notebookId: 'notebook-default',
          title: 'Viaje',
          content: 'Kioto en otoño',
          images: {},
          createdAt: 2,
          updatedAt: 2,
        },
      ]),
    )
    render(<App />)

    await user.type(screen.getByLabelText(/buscar notas/i), 'kioto')

    expect(screen.getByText('Viaje')).toBeInTheDocument()
    expect(screen.queryByText('Receta de pan')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/buscar notas/i))
    await user.type(screen.getByLabelText(/buscar notas/i), 'zzz')

    expect(screen.getByText(/sin resultados para «zzz»/i)).toBeInTheDocument()
  })

  it('finds notes from other notebooks and opens them switching notebook', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    window.localStorage.setItem(
      'notebooks',
      JSON.stringify([
        { id: 'notebook-default', name: 'Mi notebook' },
        { id: 'nb2', name: 'Personal' },
      ]),
    )
    window.localStorage.setItem(
      'notes',
      JSON.stringify([
        {
          id: 'n1',
          notebookId: 'nb2',
          title: 'Viaje',
          content: 'Kioto en otoño',
          images: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    )
    render(<App />)

    await user.type(screen.getByLabelText(/buscar notas/i), 'kioto')

    const card = screen.getByText('Viaje')
    expect(card).toBeInTheDocument()
    expect(screen.getByText(/· Personal/)).toBeInTheDocument()

    await user.click(card)

    expect(screen.getByLabelText(/título de la nota/i)).toHaveValue('Viaje')
    expect(screen.getByRole('heading', { name: 'Personal' })).toBeVisible()
  })

  it('restores a removed embed via the undo toast', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    window.localStorage.setItem(
      'notes',
      JSON.stringify([
        {
          id: 'n1',
          notebookId: 'notebook-default',
          title: 'Con video',
          content: 'hola\nhttps://youtu.be/dQw4w9WgXcQ',
          images: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    )
    render(<App />)

    await user.click(screen.getByText('Con video'))
    await user.click(
      screen.getByRole('button', { name: /quitar vista previa/i }),
    )

    expect(screen.queryByTitle('Video de YouTube')).not.toBeInTheDocument()
    expect(screen.getByText('Elemento quitado')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /deshacer/i }))

    expect(screen.getByTitle('Video de YouTube')).toBeInTheDocument()
  })

  it('creates a second notebook and keeps notes scoped per notebook', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    render(<App />)

    await user.click(screen.getByRole('button', { name: /nueva nota/i }))
    await user.type(
      screen.getByLabelText(/título de la nota/i),
      'Nota personal',
    )
    await user.click(
      screen.getByRole('button', { name: /volver a las notas/i }),
    )

    await user.type(
      screen.getByLabelText(/nombre del nuevo notebook/i),
      'Trabajo{Enter}',
    )

    expect(screen.getByRole('heading', { name: 'Trabajo' })).toBeVisible()
    expect(screen.queryByText('Nota personal')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mi notebook' }))
    expect(screen.getByText('Nota personal')).toBeInTheDocument()
  })

  it('deletes a notebook with its notes via an undo toast, falling back to another notebook', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    render(<App />)

    await user.type(
      screen.getByLabelText(/nombre del nuevo notebook/i),
      'Trabajo{Enter}',
    )
    await user.click(screen.getByRole('button', { name: /nueva nota/i }))
    await user.type(screen.getByLabelText(/título de la nota/i), 'Informe')
    await user.click(
      screen.getByRole('button', { name: /volver a las notas/i }),
    )

    await user.click(
      screen.getByRole('button', { name: /eliminar notebook "trabajo"/i }),
    )

    expect(screen.getByText('Notebook eliminado')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Trabajo' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mi notebook' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /deshacer/i }))

    await user.click(screen.getByRole('button', { name: 'Trabajo' }))
    expect(screen.getByText('Informe')).toBeInTheDocument()
  })

  it('converts a URL line into an inline embed when pressing Enter', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    render(<App />)

    await user.click(screen.getByRole('button', { name: /nueva nota/i }))
    await user.type(
      screen.getByLabelText(/contenido de la nota/i),
      'https://youtu.be/dQw4w9WgXcQ',
    )

    expect(screen.queryByTitle('Video de YouTube')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/contenido de la nota/i), '{Enter}')

    expect(screen.getByTitle('Video de YouTube')).toBeInTheDocument()
  })

  it('removes an inline embed with its remove button, deleting the line', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('appMode', JSON.stringify('notes'))
    window.localStorage.setItem(
      'notes',
      JSON.stringify([
        {
          id: 'n1',
          notebookId: 'notebook-default',
          title: 'Con video',
          content: 'hola\nhttps://youtu.be/dQw4w9WgXcQ\nchau',
          images: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    )
    render(<App />)

    await user.click(screen.getByText('Con video'))
    expect(screen.getByTitle('Video de YouTube')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /quitar vista previa/i }),
    )

    expect(screen.queryByTitle('Video de YouTube')).not.toBeInTheDocument()
    const stored = JSON.parse(window.localStorage.getItem('notes') ?? '[]') as {
      content: string
    }[]
    expect(stored[0].content).toBe('hola\nchau')
  })
})
