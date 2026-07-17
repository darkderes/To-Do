export type InlinePart =
  { kind: 'text'; text: string } | { kind: 'link'; url: string }

export type NoteBlock =
  | { kind: 'paragraph'; parts: InlinePart[] }
  | { kind: 'image'; src: string; missing?: boolean }
  | { kind: 'youtube'; videoId: string }
  | { kind: 'link-card'; url: string }

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g
const IMAGE_TOKEN_SPLIT = /\[imagen:([A-Za-z0-9-]+)\]/

export function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:[^\s#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match ? match[1] : null
}

export function isImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase()
    return /\.(png|jpe?g|gif|webp|avif|svg)$/.test(path)
  } catch {
    return false
  }
}

function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)\]]+$/, '')
}

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimTrailingPunctuation(match[0])
    if (!url) continue
    if (match.index > last) {
      parts.push({ kind: 'text', text: text.slice(last, match.index) })
    }
    parts.push({ kind: 'link', url })
    last = match.index + url.length
  }
  if (last < text.length) {
    parts.push({ kind: 'text', text: text.slice(last) })
  }
  return parts
}

function embedBlockForUrl(url: string): NoteBlock {
  const videoId = getYouTubeId(url)
  if (videoId) return { kind: 'youtube', videoId }
  if (isImageUrl(url)) return { kind: 'image', src: url }
  return { kind: 'link-card', url }
}

export function parseNoteContent(
  content: string,
  images: Record<string, string>,
): NoteBlock[] {
  const blocks: NoteBlock[] = []
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    // split() with a capturing group alternates text segments and token ids
    const segments = line.split(IMAGE_TOKEN_SPLIT)
    segments.forEach((segment, index) => {
      if (index % 2 === 1) {
        const src = images[segment]
        blocks.push(
          src
            ? { kind: 'image', src }
            : { kind: 'image', src: '', missing: true },
        )
        return
      }
      const text = segment.trim()
      if (!text) return
      if (/^https?:\/\/\S+$/.test(text)) {
        blocks.push(embedBlockForUrl(trimTrailingPunctuation(text)))
        return
      }
      blocks.push({ kind: 'paragraph', parts: parseInline(text) })
    })
  }
  return blocks
}

export type EditorSegment =
  | { kind: 'text'; startLine: number; lineCount: number; text: string }
  | { kind: 'embed'; line: number; raw: string; block: NoteBlock }

export const IMAGE_TOKEN_LINE = /^\[imagen:([A-Za-z0-9-]+)\]$/

export function getEmbedBlock(
  line: string,
  images: Record<string, string>,
): NoteBlock | null {
  const trimmed = line.trim()
  const tokenMatch = trimmed.match(IMAGE_TOKEN_LINE)
  if (tokenMatch) {
    const src = images[tokenMatch[1]]
    return src
      ? { kind: 'image', src }
      : { kind: 'image', src: '', missing: true }
  }
  if (/^https?:\/\/\S+$/.test(trimmed)) {
    return embedBlockForUrl(trimTrailingPunctuation(trimmed))
  }
  return null
}

// Divide el contenido en segmentos editables (textareas) y embeds de una
// línea. `excludedLine` es la línea donde está el cursor: no se convierte
// mientras se escribe en ella. Los segmentos de texto pueden ser "virtuales"
// (lineCount 0) para poder escribir antes/después/entre embeds; al
// reconstruir, insertan líneas nuevas en startLine.
export function parseEditorSegments(
  content: string,
  images: Record<string, string>,
  excludedLine: number | null = null,
): EditorSegment[] {
  const lines = content.split('\n')
  const segments: EditorSegment[] = []
  let bufferStart = 0
  let buffer: string[] = []
  lines.forEach((line, index) => {
    const block = index === excludedLine ? null : getEmbedBlock(line, images)
    if (block) {
      segments.push({
        kind: 'text',
        startLine: bufferStart,
        lineCount: buffer.length,
        text: buffer.join('\n'),
      })
      segments.push({ kind: 'embed', line: index, raw: line, block })
      buffer = []
      bufferStart = index + 1
    } else {
      buffer.push(line)
    }
  })
  segments.push({
    kind: 'text',
    startLine: bufferStart,
    lineCount: buffer.length,
    text: buffer.join('\n'),
  })
  return segments
}

export function noteSnippet(content: string): string {
  const cleaned = content
    .replace(new RegExp(IMAGE_TOKEN_SPLIT, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > 140 ? `${cleaned.slice(0, 140).trimEnd()}…` : cleaned
}

const MAX_DIMENSION = 1280
// Por debajo de este tamaño se guarda el archivo tal cual (conserva
// transparencia PNG y animación GIF); por encima se reescala a JPEG.
const KEEP_ORIGINAL_BYTES = 300 * 1024
// localStorage ronda los 5 MB por origen: una sola imagen no debe comérselo.
const MAX_STORED_CHARS = 2 * 1024 * 1024

export const IMAGE_TOO_LARGE_MESSAGE =
  'La imagen es demasiado grande para guardarla. Prueba con una más pequeña.'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo procesar la imagen.'))
    image.src = src
  })
}

export async function processImageFile(file: File): Promise<string> {
  const original = await readAsDataUrl(file)
  if (file.size <= KEEP_ORIGINAL_BYTES) return original
  const image = await loadImage(original)
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(image.width, image.height, 1),
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (!context) return original
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const resized = canvas.toDataURL('image/jpeg', 0.85)
  if (resized.length > MAX_STORED_CHARS) {
    throw new Error(IMAGE_TOO_LARGE_MESSAGE)
  }
  return resized
}
