import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckSquare } from '@phosphor-icons/react'
import type { CloudSync } from '../hooks/useCloudSync'

interface LoginScreenProps {
  sync: CloudSync
}

export function LoginScreen({ sync }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password || submitting) return
    setSubmitting(true)
    if (mode === 'signin') await sync.signIn(trimmedEmail, password)
    else await sync.signUp(trimmedEmail, password)
    setSubmitting(false)
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo" aria-hidden="true">
          <CheckSquare size={40} weight="fill" />
        </div>
        <h1>To-Do</h1>
        <p className="login-subtitle">
          {mode === 'signin'
            ? 'Inicia sesión para ver tus tareas y notas en todos tus dispositivos.'
            : 'Crea tu cuenta para sincronizar tareas y notas.'}
        </p>
        <input
          type="email"
          value={email}
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          required
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          type="password"
          value={password}
          placeholder="Contraseña"
          aria-label="Contraseña"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
        />
        {sync.authError && (
          <p className="login-error" role="alert">
            {sync.authError}
          </p>
        )}
        {sync.authNotice && (
          <p className="login-notice" role="status">
            {sync.authNotice}
          </p>
        )}
        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting
            ? 'Un momento…'
            : mode === 'signin'
              ? 'Entrar'
              : 'Crear cuenta'}
        </button>
        <button
          type="button"
          className="login-switch-mode"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin'
            ? '¿No tienes cuenta? Crear una'
            : '¿Ya tienes cuenta? Entrar'}
        </button>
      </form>
    </div>
  )
}
