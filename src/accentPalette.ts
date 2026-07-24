export interface AccentOption {
  id: string
  label: string
  light: string
  dark: string
}

// Cada par light/dark está verificado ≥4.5:1 (WCAG AA) contra blanco y contra
// el fondo oscuro, ya sea como texto/borde o como fondo de botón con
// --on-accent (que usa var(--bg) del tema contrario como color de texto).
export const ACCENT_PALETTE: AccentOption[] = [
  { id: 'purple', label: 'Morado', light: '#9328db', dark: '#c084fc' },
  { id: 'blue', label: 'Azul', light: '#2563eb', dark: '#60a5fa' },
  { id: 'indigo', label: 'Índigo', light: '#4f46e5', dark: '#818cf8' },
  { id: 'teal', label: 'Verde azulado', light: '#0f766e', dark: '#2dd4bf' },
  { id: 'green', label: 'Verde', light: '#15803d', dark: '#4ade80' },
  { id: 'orange', label: 'Naranja', light: '#c2410c', dark: '#fb923c' },
  { id: 'rose', label: 'Rosa', light: '#e11d48', dark: '#fb7185' },
  { id: 'pink', label: 'Fucsia', light: '#db2777', dark: '#f472b6' },
  { id: 'cyan', label: 'Cian', light: '#0e7490', dark: '#22d3ee' },
  { id: 'yellow', label: 'Amarillo', light: '#a16207', dark: '#facc15' },
  { id: 'lime', label: 'Lima', light: '#4d7c0f', dark: '#a3e635' },
  { id: 'red', label: 'Rojo', light: '#b91c1c', dark: '#f87171' },
  { id: 'slate', label: 'Gris', light: '#475569', dark: '#94a3b8' },
  { id: 'stone', label: 'Marrón', light: '#57534e', dark: '#a8a29e' },
]

export const DEFAULT_ACCENT_ID = 'purple'
