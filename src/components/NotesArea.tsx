import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { List, Moon, Plus, Sun, Trash } from '@phosphor-icons/react'
import { NotebookSidebar } from './NotebookSidebar'
import { NoteEditor } from './NoteEditor'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { noteSnippet } from '../utils/noteContent'
import { DEFAULT_NOTEBOOK_ID } from '../types'
import type { Note, Notebook } from '../types'

interface NotesAreaProps {
  notebooks: Notebook[]
  notes: Note[]
  setNotebooks: Dispatch<SetStateAction<Notebook[]>>
  setNotes: Dispatch<SetStateAction<Note[]>>
  isSidebarOpen: boolean
  theme: 'light' | 'dark'
  sidebarToggleRef: RefObject<HTMLButtonElement | null>
  modeSwitch: ReactNode
  syncPanel: ReactNode
  onToggleSidebar: () => void
  onCloseSidebar: () => void
  onToggleTheme: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
  })
}

export function NotesArea({
  notebooks,
  notes,
  setNotebooks,
  setNotes,
  isSidebarOpen,
  theme,
  sidebarToggleRef,
  modeSwitch,
  syncPanel,
  onToggleSidebar,
  onCloseSidebar,
  onToggleTheme,
}: NotesAreaProps) {
  const [selectedNotebookId, setSelectedNotebookId] = useLocalStorage<string>(
    'selectedNotebookId',
    DEFAULT_NOTEBOOK_ID,
  )
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  useEffect(() => {
    const fallbackId = notebooks[0]?.id
    if (!fallbackId) return
    if (!notebooks.some((notebook) => notebook.id === selectedNotebookId)) {
      setSelectedNotebookId(fallbackId)
    }
    const hasOrphans = notes.some(
      (note) => !notebooks.some((notebook) => notebook.id === note.notebookId),
    )
    if (!hasOrphans) return
    setNotes((current) =>
      current.map((note) =>
        notebooks.some((notebook) => notebook.id === note.notebookId)
          ? note
          : { ...note, notebookId: fallbackId },
      ),
    )
  }, [notes, notebooks, selectedNotebookId, setNotes, setSelectedNotebookId])

  function selectNotebook(id: string) {
    setSelectedNotebookId(id)
    setActiveNoteId(null)
    onCloseSidebar()
  }

  function addNotebook(name: string) {
    const newNotebook: Notebook = { id: crypto.randomUUID(), name }
    setNotebooks((current) => [...current, newNotebook])
    selectNotebook(newNotebook.id)
  }

  function renameNotebook(id: string, name: string) {
    setNotebooks((current) =>
      current.map((notebook) =>
        notebook.id === id ? { ...notebook, name } : notebook,
      ),
    )
  }

  function deleteNotebook(id: string) {
    if (notebooks.length <= 1) return
    const notebook = notebooks.find((candidate) => candidate.id === id)
    const noteCount = notes.filter((note) => note.notebookId === id).length
    if (noteCount > 0) {
      const noun = noteCount === 1 ? 'nota' : 'notas'
      const confirmed = window.confirm(
        `"${notebook?.name}" tiene ${noteCount} ${noun}. ¿Eliminar el notebook y sus notas?`,
      )
      if (!confirmed) return
    }
    const remaining = notebooks.filter((candidate) => candidate.id !== id)
    setNotebooks(remaining)
    setNotes((current) => current.filter((note) => note.notebookId !== id))
    if (selectedNotebookId === id) selectNotebook(remaining[0].id)
  }

  function addNote() {
    const now = Date.now()
    const newNote: Note = {
      id: crypto.randomUUID(),
      notebookId: selectedNotebookId,
      title: '',
      content: '',
      images: {},
      createdAt: now,
      updatedAt: now,
    }
    setNotes((current) => [...current, newNote])
    setActiveNoteId(newNote.id)
  }

  function updateNote(id: string, patch: Partial<Note>) {
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note,
      ),
    )
  }

  function deleteNote(id: string) {
    setNotes((current) => current.filter((note) => note.id !== id))
    if (activeNoteId === id) setActiveNoteId(null)
  }

  function confirmDeleteNote(note: Note) {
    const title = note.title.trim() || 'Sin título'
    if (window.confirm(`¿Eliminar la nota "${title}"?`)) deleteNote(note.id)
  }

  const selectedNotebook = notebooks.find(
    (notebook) => notebook.id === selectedNotebookId,
  )
  const notebookNotes = useMemo(
    () =>
      notes
        .filter((note) => note.notebookId === selectedNotebookId)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [notes, selectedNotebookId],
  )
  const activeNote = notes.find((note) => note.id === activeNoteId)

  return (
    <>
      <NotebookSidebar
        notebooks={notebooks}
        selectedNotebookId={selectedNotebookId}
        isOpen={isSidebarOpen}
        theme={theme}
        onSelect={selectNotebook}
        onAdd={addNotebook}
        onRename={renameNotebook}
        onDelete={deleteNotebook}
        onToggleTheme={onToggleTheme}
        syncPanel={syncPanel}
      />
      <main className="app-content">
        <div className="app-header">
          <button
            type="button"
            className="sidebar-toggle"
            ref={sidebarToggleRef}
            aria-expanded={isSidebarOpen}
            aria-controls="task-list-sidebar"
            aria-label={`Notebooks, notebook actual: ${selectedNotebook?.name ?? ''}`}
            onClick={onToggleSidebar}
          >
            <List aria-hidden="true" size={20} />
          </button>
          <h1>{selectedNotebook?.name ?? ''}</h1>
          {modeSwitch}
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={
            theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
          }
        >
          {theme === 'dark' ? (
            <Sun aria-hidden="true" size={18} />
          ) : (
            <Moon aria-hidden="true" size={18} />
          )}
        </button>
        {activeNote ? (
          <NoteEditor
            note={activeNote}
            onBack={() => setActiveNoteId(null)}
            onChange={updateNote}
            onDelete={deleteNote}
          />
        ) : (
          <section className="notes-list" aria-label="Notas del notebook">
            <div className="notes-list-header">
              <p className="notes-count">
                {notebookNotes.length}{' '}
                {notebookNotes.length === 1 ? 'nota' : 'notas'}
              </p>
              <button
                type="button"
                className="new-note-button"
                onClick={addNote}
              >
                <Plus aria-hidden="true" size={16} weight="bold" /> Nueva nota
              </button>
            </div>
            {notebookNotes.length === 0 ? (
              <p className="empty-state">
                Aún no hay notas — crea la primera con «Nueva nota».
              </p>
            ) : (
              <ul className="note-cards">
                {notebookNotes.map((note) => {
                  const title = note.title.trim() || 'Sin título'
                  const snippet = noteSnippet(note.content)
                  return (
                    <li key={note.id} className="note-card">
                      <button
                        type="button"
                        className="note-card-open"
                        onClick={() => setActiveNoteId(note.id)}
                      >
                        <span className="note-card-title">{title}</span>
                        <span className="note-card-snippet">
                          {snippet || 'Sin contenido'}
                        </span>
                        <span className="note-card-date">
                          {formatDate(note.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="note-card-delete"
                        aria-label={`Eliminar nota "${title}"`}
                        onClick={() => confirmDeleteNote(note)}
                      >
                        <Trash aria-hidden="true" size={16} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </>
  )
}
