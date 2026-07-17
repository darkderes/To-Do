import { CheckSquare, Notebook } from '@phosphor-icons/react'
import type { AppMode } from '../types'

interface ModeSwitchProps {
  mode: AppMode
  onChange: (mode: AppMode) => void
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div
      className="mode-switch"
      role="group"
      aria-label="Sección de la aplicación"
    >
      <button
        type="button"
        className={mode === 'tasks' ? 'active' : ''}
        aria-pressed={mode === 'tasks'}
        title="Tareas"
        onClick={() => onChange('tasks')}
      >
        <CheckSquare aria-hidden="true" size={16} />
        <span className="mode-switch-label">Tareas</span>
      </button>
      <button
        type="button"
        className={mode === 'notes' ? 'active' : ''}
        aria-pressed={mode === 'notes'}
        title="Notas"
        onClick={() => onChange('notes')}
      >
        <Notebook aria-hidden="true" size={16} />
        <span className="mode-switch-label">Notas</span>
      </button>
    </div>
  )
}
