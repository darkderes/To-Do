import { ArrowSquareOut, ImageBroken } from '@phosphor-icons/react'
import type { NoteBlock } from '../utils/noteContent'

function renderBlock(block: NoteBlock, key: number) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p key={key}>
          {block.parts.map((part, index) =>
            part.kind === 'link' ? (
              <a
                key={index}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {part.url}
              </a>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </p>
      )
    case 'image':
      if (block.missing) {
        return (
          <p key={key} className="note-image-missing">
            <ImageBroken aria-hidden="true" size={18} /> Imagen no disponible
          </p>
        )
      }
      return (
        <img
          key={key}
          className="note-image"
          src={block.src}
          alt=""
          loading="lazy"
        />
      )
    case 'youtube':
      return (
        <div key={key} className="note-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.videoId}`}
            title="Video de YouTube"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    case 'link-card': {
      // URL_PATTERN acepta cadenas que el constructor URL rechaza (p. ej.
      // "https://%"): sin el try/catch una nota con ese texto rompe el render.
      let domain: string
      try {
        domain = new URL(block.url).hostname.replace(/^www\./, '')
      } catch {
        domain = block.url
      }
      return (
        <a
          key={key}
          className="note-link-card"
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="note-link-domain">
            <ArrowSquareOut aria-hidden="true" size={16} /> {domain}
          </span>
          <span className="note-link-url">{block.url}</span>
        </a>
      )
    }
  }
}

export function NoteBlockView({ block }: { block: NoteBlock }) {
  return renderBlock(block, 0)
}
