import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  CloudCheck,
  CloudSlash,
  CloudArrowUp,
  SignOut,
} from '@phosphor-icons/react'
import type { CloudSync } from '../hooks/useCloudSync'

interface SyncPanelProps {
  sync: CloudSync
}

export function SyncPanel({ sync }: SyncPanelProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  if (!sync.enabled) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) return
    if (mode === 'signin') void sync.signIn(trimmedEmail, password)
    else void sync.signUp(trimmedEmail, password)
  }

  if (sync.email) {
    return (
      <div className="sync-panel">
        <p className="sync-status">
          {sync.status === 'error' ? (
            <CloudSlash aria-hidden="true" size={16} />
          ) : sync.status === 'syncing' ? (
            <CloudArrowUp aria-hidden="true" size={16} />
          ) : (
            <CloudCheck aria-hidden="true" size={16} />
          )}
          <span className="sync-status-text">
            {sync.status === 'error'
              ? 'Error de sincronización'
              : sync.status === 'syncing'
                ? 'Sincronizando…'
                : 'Sincronizado'}
          </span>
        </p>
        <p className="sync-email" title={sync.email}>
          {sync.email}
        </p>
        <button
          type="button"
          className="sidebar-settings-item"
          onClick={() => void sync.signOut()}
        >
          <span>Cerrar sesión</span>
          <SignOut aria-hidden="true" size={16} />
        </button>
      </div>
    )
  }

  return (
    <form className="sync-panel" onSubmit={handleSubmit}>
      <p className="sync-status">
        <CloudSlash aria-hidden="true" size={16} />
        <span className="sync-status-text">Sin sincronizar</span>
      </p>
      <input
        type="email"
        value={email}
        placeholder="Email"
        aria-label="Email para sincronizar"
        autoComplete="email"
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        type="password"
        value={password}
        placeholder="Contraseña"
        aria-label="Contraseña para sincronizar"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        onChange={(event) => setPassword(event.target.value)}
      />
      {sync.authError && <p className="sync-error">{sync.authError}</p>}
      <button type="submit" className="sync-submit">
        {mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
      </button>
      <button
        type="button"
        className="sync-switch-mode"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin'
          ? '¿No tienes cuenta? Crear una'
          : '¿Ya tienes cuenta? Entrar'}
      </button>
    </form>
  )
}
