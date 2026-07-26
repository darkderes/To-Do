import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { List, MagnifyingGlass, Plus, Trash } from '@phosphor-icons/react'
import { NotebookSidebar } from './NotebookSidebar'
import { NoteEditor } from './NoteEditor'
import { UndoToastStack } from './UndoToastStack'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useUndoQueue } from '../hooks/useUndoQueue'
import { noteSnippet } from '../utils/noteContent'
import { DEFAULT_NOTEBOOK_ID } from '../types'
import type { Note, Notebook } from '../types'

type NotesUndo =
  | { kind: 'note'; note: Note; index: number }
  | { kind: 'notebook'; notebook: Notebook; index: number; notes: Note[] }
  | {
      kind: 'content'
      noteId: string
      content: string
      images: Record<string, string>
    }

interface NotesAreaProps {
  notebooks: Notebook[]
  notes: Note[]
  setNotebooks: Dispatch<SetStateAction<Notebook[]>>
  setNotes: Dispatch<SetStateAction<Note[]>>
  isSidebarOpen: boolean
  sidebarToggleRef: RefObject<HTMLButtonElement | null>
  userMenuTop: ReactNode
  modeSwitch: ReactNode
  onToggleSidebar: () => void
  onCloseSidebar: () => void
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
  sidebarToggleRef,
  userMenuTop,
  modeSwitch,
  onToggleSidebar,
  onCloseSidebar,
}: NotesAreaProps) {
  const [selectedNotebookId, setSelectedNotebookId] = useLocalStorage<string>(
    'selectedNotebookId',
    DEFAULT_NOTEBOOK_ID,
  )
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const undoQueue = useUndoQueue<NotesUndo>()

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

  function openNote(note: Note) {
    if (note.notebookId !== selectedNotebookId) {
      setSelectedNotebookId(note.notebookId)
    }
    setActiveNoteId(note.id)
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
    const index = notebooks.findIndex((candidate) => candidate.id === id)
    if (index === -1) return
    undoQueue.push({
      kind: 'notebook',
      notebook: notebooks[index],
      index,
      notes: notes.filter((note) => note.notebookId === id),
    })
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
    const index = notes.findIndex((note) => note.id === id)
    if (index === -1) return
    undoQueue.push({ kind: 'note', note: notes[index], index })
    setNotes((current) => current.filter((note) => note.id !== id))
    if (activeNoteId === id) setActiveNoteId(null)
  }

  function snapshotNoteContent(
    noteId: string,
    content: string,
    images: Record<string, string>,
  ) {
    undoQueue.push({ kind: 'content', noteId, content, images })
  }

  function undoAction(entryId: string) {
    const entry = undoQueue.entries.find(
      (candidate) => candidate.id === entryId,
    )
    if (!entry) return
    if (entry.item.kind === 'note') {
      const { note, index } = entry.item
      const notebookExists = notebooks.some(
        (notebook) => notebook.id === note.notebookId,
      )
      const restoredNote = notebookExists
        ? note
        : { ...note, notebookId: selectedNotebookId }
      setNotes((current) => {
        const restored = [...current]
        restored.splice(Math.min(index, restored.length), 0, restoredNote)
        return restored
      })
    } else if (entry.item.kind === 'notebook') {
      const { notebook, index, notes: notebookNotes } = entry.item
      setNotebooks((current) => {
        const restored = [...current]
        restored.splice(Math.min(index, restored.length), 0, notebook)
        return restored
      })
      setNotes((current) => [...current, ...notebookNotes])
    } else {
      const { noteId, content, images } = entry.item
      setNotes((current) =>
        current.map((note) =>
          note.id === noteId
            ? { ...note, content, images, updatedAt: Date.now() }
            : note,
        ),
      )
    }
    undoQueue.dismiss(entryId)
  }

  function reorderNotebook(id: string, targetIndex: number) {
    setNotebooks((current) => {
      const currentIndex = current.findIndex((notebook) => notebook.id === id)
      if (currentIndex === -1 || currentIndex === targetIndex) return current
      const updated = [...current]
      const [moved] = updated.splice(currentIndex, 1)
      updated.splice(targetIndex, 0, moved)
      return updated
    })
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
  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return notebookNotes
    return notes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [notes, notebookNotes, searchQuery])
  const activeNote = notes.find((note) => note.id === activeNoteId)

  return (
    <>
      <NotebookSidebar
        notebooks={notebooks}
        selectedNotebookId={selectedNotebookId}
        isOpen={isSidebarOpen}
        onSelect={selectNotebook}
        onAdd={addNotebook}
        onRename={renameNotebook}
        onDelete={deleteNotebook}
        onReorderTo={reorderNotebook}
        userMenuTop={userMenuTop}
        modeSwitch={modeSwitch}
      />
      <main id="main-content" className="app-content">
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
        </div>
        {activeNote ? (
          <NoteEditor
            note={activeNote}
            onBack={() => setActiveNoteId(null)}
            onChange={updateNote}
            onDelete={deleteNote}
            onContentSnapshot={snapshotNoteContent}
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
            {notes.length > 0 && (
              <div className="notes-search input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <MagnifyingGlass size={16} />
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  placeholder="Buscar en todos los notebooks"
                  aria-label="Buscar notas en todos los notebooks"
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            )}
            {notebookNotes.length === 0 && !searchQuery.trim() ? (
              <p className="empty-state">
                Aún no hay notas — crea la primera con «Nueva nota».
              </p>
            ) : visibleNotes.length === 0 ? (
              <p className="empty-state">
                Sin resultados para «{searchQuery.trim()}» en ningún notebook.
              </p>
            ) : (
              <ul className="note-cards">
                {visibleNotes.map((note) => {
                  const title = note.title.trim() || 'Sin título'
                  const snippet = noteSnippet(note.content)
                  const sourceNotebook =
                    note.notebookId !== selectedNotebookId
                      ? notebooks.find(
                          (notebook) => notebook.id === note.notebookId,
                        )
                      : undefined
                  return (
                    <li key={note.id} className="note-card">
                      <button
                        type="button"
                        className="note-card-open"
                        onClick={() => openNote(note)}
                      >
                        <span className="note-card-title">{title}</span>
                        <span className="note-card-snippet">
                          {snippet || 'Sin contenido'}
                        </span>
                        <span className="note-card-date">
                          {formatDate(note.updatedAt)}
                          {sourceNotebook ? ` · ${sourceNotebook.name}` : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="note-card-delete"
                        aria-label={`Eliminar nota "${title}"`}
                        onClick={() => deleteNote(note.id)}
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
      <UndoToastStack
        items={undoQueue.entries.map((entry) => ({
          id: entry.id,
          message:
            entry.item.kind === 'note'
              ? 'Nota eliminada'
              : entry.item.kind === 'notebook'
                ? 'Notebook eliminado'
                : 'Elemento quitado',
          focusOnMount: entry.item.kind !== 'content',
        }))}
        onUndo={undoAction}
        onDismiss={undoQueue.dismiss}
        onPause={undoQueue.pause}
        onResume={undoQueue.resume}
      />
    </>
  )
}
