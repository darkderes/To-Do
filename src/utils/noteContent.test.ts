import { describe, expect, it } from 'vitest'
import {
  getYouTubeId,
  isImageUrl,
  noteSnippet,
  parseEditorSegments,
  parseNoteContent,
} from './noteContent'

describe('getYouTubeId', () => {
  it('extracts the id from the common YouTube URL shapes', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(getYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
    expect(getYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
    expect(
      getYouTubeId('https://www.youtube.com/watch?list=abc&v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-YouTube URLs', () => {
    expect(getYouTubeId('https://vimeo.com/12345')).toBeNull()
    expect(getYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })
})

describe('isImageUrl', () => {
  it('detects image extensions in the URL path', () => {
    expect(isImageUrl('https://example.com/photo.png')).toBe(true)
    expect(isImageUrl('https://example.com/photo.jpg?size=large')).toBe(true)
    expect(isImageUrl('https://example.com/page')).toBe(false)
    expect(isImageUrl('not-a-url')).toBe(false)
  })
})

describe('parseNoteContent', () => {
  it('turns a standalone YouTube URL into a youtube block', () => {
    const blocks = parseNoteContent(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      {},
    )
    expect(blocks).toEqual([{ kind: 'youtube', videoId: 'dQw4w9WgXcQ' }])
  })

  it('turns a standalone image URL into an image block', () => {
    const blocks = parseNoteContent('https://example.com/cat.webp', {})
    expect(blocks).toEqual([
      { kind: 'image', src: 'https://example.com/cat.webp' },
    ])
  })

  it('turns other standalone URLs into link cards', () => {
    const blocks = parseNoteContent('https://example.com/articulo', {})
    expect(blocks).toEqual([
      { kind: 'link-card', url: 'https://example.com/articulo' },
    ])
  })

  it('resolves image tokens against the stored images map', () => {
    const blocks = parseNoteContent('Antes\n[imagen:abc123]\nDespués', {
      abc123: 'data:image/png;base64,xyz',
    })
    expect(blocks).toEqual([
      { kind: 'paragraph', parts: [{ kind: 'text', text: 'Antes' }] },
      { kind: 'image', src: 'data:image/png;base64,xyz' },
      { kind: 'paragraph', parts: [{ kind: 'text', text: 'Después' }] },
    ])
  })

  it('marks tokens without a stored image as missing', () => {
    expect(parseNoteContent('[imagen:nope]', {})).toEqual([
      { kind: 'image', src: '', missing: true },
    ])
  })

  it('links URLs inside a paragraph and keeps surrounding text', () => {
    const blocks = parseNoteContent('Mira https://example.com/a, y sigue', {})
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        parts: [
          { kind: 'text', text: 'Mira ' },
          { kind: 'link', url: 'https://example.com/a' },
          { kind: 'text', text: ', y sigue' },
        ],
      },
    ])
  })

  it('skips blank lines', () => {
    expect(parseNoteContent('\n\n  \n', {})).toEqual([])
  })
})

describe('parseEditorSegments', () => {
  it('splits text around an embed line', () => {
    const segments = parseEditorSegments(
      'texto\nhttps://youtu.be/dQw4w9WgXcQ\nmás texto',
      {},
    )
    expect(segments).toEqual([
      { kind: 'text', startLine: 0, lineCount: 1, text: 'texto' },
      {
        kind: 'embed',
        line: 1,
        raw: 'https://youtu.be/dQw4w9WgXcQ',
        block: { kind: 'youtube', videoId: 'dQw4w9WgXcQ' },
      },
      { kind: 'text', startLine: 2, lineCount: 1, text: 'más texto' },
    ])
  })

  it('adds virtual empty text segments around leading and trailing embeds', () => {
    const segments = parseEditorSegments('https://example.com/a.png', {})
    expect(segments).toEqual([
      { kind: 'text', startLine: 0, lineCount: 0, text: '' },
      {
        kind: 'embed',
        line: 0,
        raw: 'https://example.com/a.png',
        block: { kind: 'image', src: 'https://example.com/a.png' },
      },
      { kind: 'text', startLine: 1, lineCount: 0, text: '' },
    ])
  })

  it('keeps the excluded line as plain text while it is being edited', () => {
    const segments = parseEditorSegments('https://example.com/a.png', {}, 0)
    expect(segments).toEqual([
      {
        kind: 'text',
        startLine: 0,
        lineCount: 1,
        text: 'https://example.com/a.png',
      },
    ])
  })

  it('round-trips: rebuilding lines from segments restores the content', () => {
    const content = 'hola\n[imagen:abc]\nhttps://youtu.be/dQw4w9WgXcQ\nfin'
    const segments = parseEditorSegments(content, { abc: 'data:x' })
    const rebuilt: string[] = []
    for (const segment of segments) {
      if (segment.kind === 'embed') rebuilt.push(segment.raw)
      else if (segment.lineCount > 0) rebuilt.push(segment.text)
    }
    expect(rebuilt.join('\n')).toBe(content)
  })
})

describe('noteSnippet', () => {
  it('strips image tokens and collapses whitespace', () => {
    expect(noteSnippet('Hola\n[imagen:abc]\nmundo')).toBe('Hola mundo')
  })

  it('truncates long content with an ellipsis', () => {
    const long = 'palabra '.repeat(40)
    const snippet = noteSnippet(long)
    expect(snippet.length).toBeLessThanOrEqual(141)
    expect(snippet.endsWith('…')).toBe(true)
  })
})
