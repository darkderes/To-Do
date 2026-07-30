import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type {
  ChangeEvent,
  ClipboardEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  SyntheticEvent,
} from 'react'
import { ArrowLeft, ImageSquare, Trash, X } from '@phosphor-icons/react'
import { NoteBlockView } from './NoteContent'
import {
  IMAGE_TOO_LARGE_MESSAGE,
  IMAGE_TOKEN_LINE,
  parseEditorSegments,
  processImageFile,
} from '../utils/noteContent'
import type { EditorSegment } from '../utils/noteContent'
import type { Note } from '../types'

interface NoteEditorProps {
  note: Note
  onBack: () => void
  onChange: (id: string, patch: Partial<Note>) => void
  onDelete: (id: string) => void
  onContentSnapshot: (
    id: string,
    content: string,
    images: Record<string, string>,
  ) => void
}

interface CaretPosition {
  line: number
  col: number
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function caretFromOffset(
  segment: Extract<EditorSegment, { kind: 'text' }>,
  text: string,
  offset: number,
): CaretPosition {
  const before = text.slice(0, offset)
  const lastBreak = before.lastIndexOf('\n')
  return {
    line: segment.startLine + (before.split('\n').length - 1),
    col: offset - (lastBreak + 1),
  }
}

export function NoteEditor({
  note,
  onBack,
  onChange,
  onDelete,
  onContentSnapshot,
}: NoteEditorProps) {
  const images = useMemo(() => note.images ?? {}, [note.images])
  const [excludedLine, setExcludedLine] = useState<number | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const pendingCaretRef = useRef<CaretPosition | null>(null)
  const lastCaretRef = useRef<CaretPosition | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const displayTitle = note.title.trim() || 'Sin título'

  const lines = useMemo(() => note.content.split('\n'), [note.content])
  const segments = useMemo(
    () => parseEditorSegments(note.content, images, excludedLine),
    [note.content, images, excludedLine],
  )
  const textSegmentCount = segments.filter(
    (segment) => segment.kind === 'text',
  ).length

  useLayoutEffect(() => {
    const caret = pendingCaretRef.current
    if (!caret) return
    pendingCaretRef.current = null
    const areas =
      containerRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea')
    if (!areas || areas.length === 0) return

    function focusAt(areaIndex: number, offset: number) {
      const el = areas?.[areaIndex]
      if (!el) return
      el.focus()
      el.setSelectionRange(offset, offset)
    }

    let areaIndex = 0
    for (const segment of segments) {
      if (segment.kind !== 'text') continue
      const contains =
        segment.lineCount === 0
          ? caret.line === segment.startLine
          : caret.line >= segment.startLine &&
            caret.line < segment.startLine + segment.lineCount
      if (contains) {
        const segmentLines = segment.text.split('\n')
        const relativeLine = Math.min(
          caret.line - segment.startLine,
          segmentLines.length - 1,
        )
        let offset = 0
        for (let i = 0; i < relativeLine; i++) {
          offset += segmentLines[i].length + 1
        }
        offset += Math.min(caret.col, segmentLines[relativeLine]?.length ?? 0)
        focusAt(areaIndex, offset)
        return
      }
      areaIndex++
    }
    // El cursor cayó en la línea de un embed: ir al texto siguiente
    areaIndex = 0
    for (const segment of segments) {
      if (segment.kind !== 'text') continue
      if (segment.startLine > caret.line) {
        focusAt(areaIndex, 0)
        return
      }
      areaIndex++
    }
    focusAt(areas.length - 1, 0)
  }, [segments])

  function commitLines(newLines: string[], patch: Partial<Note> = {}) {
    onChange(note.id, { ...patch, content: newLines.join('\n') })
  }

  function handleTextChange(
    segment: Extract<EditorSegment, { kind: 'text' }>,
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    const newText = event.target.value
    const caret = caretFromOffset(segment, newText, event.target.selectionStart)
    const newLines = [...lines]
    newLines.splice(
      segment.startLine,
      segment.lineCount,
      ...newText.split('\n'),
    )
    pendingCaretRef.current = caret
    lastCaretRef.current = caret
    setExcludedLine(caret.line)
    commitLines(newLines)
  }

  function handleCaretMove(
    segment: Extract<EditorSegment, { kind: 'text' }>,
    event: SyntheticEvent<HTMLTextAreaElement>,
  ) {
    const caret = caretFromOffset(
      segment,
      segment.text,
      event.currentTarget.selectionStart,
    )
    lastCaretRef.current = caret
    if (caret.line === excludedLine) return
    // Solo restaurar el cursor si al mover el foco se convierte una línea
    const next = parseEditorSegments(note.content, images, caret.line)
    if (next.length !== segments.length) pendingCaretRef.current = caret
    setExcludedLine(caret.line)
  }

  function handleBlur(event: FocusEvent<HTMLTextAreaElement>) {
    if (containerRef.current?.contains(event.relatedTarget)) return
    setExcludedLine(null)
  }

  function removeEmbed(segment: Extract<EditorSegment, { kind: 'embed' }>) {
    onContentSnapshot(note.id, note.content, images)
    const newLines = lines.filter((_, index) => index !== segment.line)
    const previousLine = Math.max(0, segment.line - 1)
    pendingCaretRef.current = {
      line: previousLine,
      col: newLines[previousLine]?.length ?? 0,
    }
    setExcludedLine(null)
    const tokenMatch = segment.raw.trim().match(IMAGE_TOKEN_LINE)
    if (tokenMatch) {
      const rest = { ...images }
      delete rest[tokenMatch[1]]
      commitLines(newLines, { images: rest })
    } else {
      commitLines(newLines)
    }
  }

  function handleKeyDown(
    segmentIndex: number,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== 'Backspace') return
    const el = event.currentTarget
    if (el.selectionStart !== 0 || el.selectionEnd !== 0) return
    const previous = segments[segmentIndex - 1]
    if (!previous || previous.kind !== 'embed') return
    event.preventDefault()
    removeEmbed(previous)
  }

  function insertImageToken(dataUrl: string) {
    const imageId = crypto.randomUUID().slice(0, 8)
    const token = `[imagen:${imageId}]`
    const caretLine = lastCaretRef.current?.line ?? lines.length - 1
    const newLines = [...lines]
    newLines.splice(caretLine + 1, 0, token)
    pendingCaretRef.current = { line: caretLine + 2, col: 0 }
    setExcludedLine(null)
    commitLines(newLines, { images: { ...images, [imageId]: dataUrl } })
  }

  async function addImageFile(file: File) {
    setEditorError(null)
    setProcessingImage(true)
    try {
      insertImageToken(await processImageFile(file))
    } catch (error) {
      setEditorError(
        error instanceof Error ? error.message : IMAGE_TOO_LARGE_MESSAGE,
      )
    } finally {
      setProcessingImage(false)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(event.clipboardData.items).find((candidate) =>
      candidate.type.startsWith('image/'),
    )
    if (!item) return
    const file = item.getAsFile()
    if (!file) return
    event.preventDefault()
    void addImageFile(file)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void addImageFile(file)
  }

  function handleContainerClick(event: MouseEvent) {
    if (event.target !== containerRef.current) return
    const areas =
      containerRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea')
    const last = areas?.[areas.length - 1]
    if (!last) return
    last.focus()
    last.setSelectionRange(last.value.length, last.value.length)
  }

  function handleDelete() {
    onDelete(note.id)
  }

  let textIndex = 0

  return (
    <section className="note-editor" aria-label={`Nota ${displayTitle}`}>
      <div className="note-editor-toolbar">
        <button
          type="button"
          className="note-toolbar-button"
          aria-label="Volver a las notas"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          <span className="note-toolbar-label">Notas</span>
        </button>
        <button
          type="button"
          className="note-toolbar-button"
          aria-label="Insertar imagen"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageSquare aria-hidden="true" size={18} />
          <span className="note-toolbar-label">Insertar imagen</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          aria-label="Seleccionar imagen para la nota"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="note-toolbar-button note-toolbar-danger"
          aria-label={`Eliminar nota "${displayTitle}"`}
          onClick={handleDelete}
        >
          <Trash aria-hidden="true" size={18} />
        </button>
      </div>
      <input
        type="text"
        className="note-title-input"
        value={note.title}
        placeholder="Título de la nota"
        aria-label="Título de la nota"
        onChange={(event) => onChange(note.id, { title: event.target.value })}
      />
      <p className="note-updated">
        Editado el {formatTimestamp(note.updatedAt)}
      </p>
      <div
        ref={containerRef}
        className="note-inline-editor"
        onClick={handleContainerClick}
      >
        {segments.map((segment, segmentIndex) => {
          if (segment.kind === 'embed') {
            return (
              <div key={`embed-${segment.line}`} className="note-inline-embed">
                <NoteBlockView block={segment.block} />
                <button
                  type="button"
                  className="note-embed-remove"
                  aria-label="Quitar vista previa"
                  onClick={() => removeEmbed(segment)}
                >
                  <X aria-hidden="true" size={14} weight="bold" />
                </button>
              </div>
            )
          }
          const currentTextIndex = textIndex
          textIndex++
          return (
            <TextSegmentArea
              key={`text-${segment.startLine}-${currentTextIndex}`}
              value={segment.text}
              ariaLabel={
                textSegmentCount === 1
                  ? 'Contenido de la nota'
                  : `Contenido de la nota, sección ${currentTextIndex + 1}`
              }
              placeholder={
                note.content === ''
                  ? 'Escribe tu nota… Pega imágenes o URLs de YouTube, imágenes y páginas: se convierten en vista previa al pulsar Enter.'
                  : undefined
              }
              onChange={(event) => handleTextChange(segment, event)}
              onSelect={(event) => handleCaretMove(segment, event)}
              onFocus={(event) => handleCaretMove(segment, event)}
              onBlur={handleBlur}
              onKeyDown={(event) => handleKeyDown(segmentIndex, event)}
              onPaste={handlePaste}
            />
          )
        })}
      </div>
      {processingImage && (
        <p className="note-editor-status" role="status">
          Procesando imagen…
        </p>
      )}
      {editorError && (
        <p className="note-editor-error" role="alert">
          {editorError}
        </p>
      )}
    </section>
  )
}

interface TextSegmentAreaProps {
  value: string
  ariaLabel: string
  placeholder?: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) => void
  onFocus: (event: FocusEvent<HTMLTextAreaElement>) => void
  onBlur: (event: FocusEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void
}

function TextSegmentArea({
  value,
  ariaLabel,
  placeholder,
  ...handlers
}: TextSegmentAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      className={`note-segment${value === '' && !placeholder ? ' note-segment-empty' : ''}`}
      value={value}
      rows={1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      {...handlers}
    />
  )
}
