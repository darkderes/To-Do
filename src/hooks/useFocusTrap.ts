import { useEffect } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

interface UseFocusTrapOptions {
  containerRef: RefObject<HTMLElement | null>
  enabled: boolean
}

export function useFocusTrap({ containerRef, enabled }: UseFocusTrapOptions) {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    const containerElement = container

    const initialElements = getFocusable(containerElement)
    if (
      initialElements.length > 0 &&
      !containerElement.contains(document.activeElement)
    ) {
      initialElements[0].focus()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const focusable = getFocusable(containerElement)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const isInside =
        active instanceof Node && containerElement.contains(active)

      if (event.shiftKey) {
        if (!isInside || active === first) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (!isInside || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, enabled])
}
