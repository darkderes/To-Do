import { useEffect, useState } from 'react'
import { ACCENT_PALETTE, DEFAULT_ACCENT_ID } from '../accentPalette'

const STORAGE_KEY = 'accentColor'

function getStoredAccentId(): string {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return ACCENT_PALETTE.some((option) => option.id === stored)
    ? (stored as string)
    : DEFAULT_ACCENT_ID
}

export function useAccentColor() {
  const [accentId, setAccentId] = useState(getStoredAccentId)

  useEffect(() => {
    const option =
      ACCENT_PALETTE.find((candidate) => candidate.id === accentId) ??
      ACCENT_PALETTE[0]
    document.documentElement.style.setProperty('--accent-light', option.light)
    document.documentElement.style.setProperty('--accent-dark', option.dark)
    try {
      window.localStorage.setItem(STORAGE_KEY, accentId)
    } catch {
      // Storage lleno o bloqueado: el color aplica igual, solo no persiste.
    }
  }, [accentId])

  return { accentId, setAccentId }
}
