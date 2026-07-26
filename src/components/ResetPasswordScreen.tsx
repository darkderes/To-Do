import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockKey } from '@phosphor-icons/react'
import type { CloudSync } from '../hooks/useCloudSync'

interface ResetPasswordScreenProps {
  sync: CloudSync
}

export function ResetPasswordScreen({ sync }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    await sync.updatePassword(password)
    setSubmitting(false)
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo" aria-hidden="true">
          <LockKey size={40} />
        </div>
        <h1>Nueva contraseña</h1>
        <p className="login-subtitle">
          Elige una contraseña nueva para tu cuenta.
        </p>
        <div className="login-field">
          <label htmlFor="reset-password">Nueva contraseña</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            autoComplete="new-password"
            autoFocus
            required
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {sync.authError && (
          <p className="login-error" role="alert">
            {sync.authError}
          </p>
        )}
        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? 'Un momento…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
