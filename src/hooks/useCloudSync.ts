import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { mergeState } from '../utils/mergeState'
import type { SyncedState } from '../types'

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error'

interface CloudSyncArgs {
  state: SyncedState
  applyRemote: (state: SyncedState) => void
}

const PUSH_DEBOUNCE_MS = 1500

// El jsonb remoto llega sin garantías de forma (versión vieja de la app,
// fila editada a mano, bug en otro dispositivo). Normaliza colecciones a
// arrays y filtra elementos sin id para que un estado corrupto no rompa la
// app en todos los dispositivos sincronizados.
function sanitizeRemoteState(remote: unknown): SyncedState {
  const record = (
    remote && typeof remote === 'object' ? remote : {}
  ) as Partial<SyncedState>
  function asArray<T extends { id: string }>(value: T[] | undefined): T[] {
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is T =>
        item !== null && typeof item === 'object' && typeof item.id === 'string',
    )
  }
  return {
    taskLists: asArray(record.taskLists),
    todos: asArray(record.todos),
    notebooks: asArray(record.notebooks),
    notes: asArray(record.notes),
    profile:
      record.profile && typeof record.profile === 'object'
        ? record.profile
        : { avatar: null, avatarUpdatedAt: 0 },
  }
}

export function useCloudSync({ state, applyRemote }: CloudSyncArgs) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(supabase === null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [opStatus, setStatus] = useState<'syncing' | 'synced' | 'error'>(
    'syncing',
  )
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const stateRef = useRef(state)
  const skipPushRef = useRef(false)
  const initializedRef = useRef(false)
  const lastPushedRef = useRef<string | null>(null)
  const userId = session?.user.id

  const status: SyncStatus = !supabase
    ? 'off'
    : !userId
      ? 'signed-out'
      : opStatus

  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession)
        if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      },
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  async function pushNow(nextState: SyncedState, id: string) {
    if (!supabase) return
    setStatus('syncing')
    lastPushedRef.current = JSON.stringify(nextState)
    const { error } = await supabase.from('app_state').upsert({
      user_id: id,
      data: nextState,
      updated_at: new Date().toISOString(),
    })
    setStatus(error ? 'error' : 'synced')
  }

  // Al iniciar sesión: bajar estado remoto, fusionar con lo local y subir.
  useEffect(() => {
    if (!supabase || !userId) {
      initializedRef.current = false
      return
    }
    let cancelled = false
    void (async () => {
      setStatus('syncing')
      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setStatus('error')
        return
      }
      const merged = data?.data
        ? mergeState(sanitizeRemoteState(data.data), stateRef.current)
        : stateRef.current
      skipPushRef.current = true
      applyRemote(merged)
      initializedRef.current = true
      await pushNow(merged, userId)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Cambios locales: subir con debounce.
  useEffect(() => {
    if (!supabase || !userId || !initializedRef.current) return
    if (skipPushRef.current) {
      skipPushRef.current = false
      return
    }
    const timer = setTimeout(() => {
      void pushNow(stateRef.current, userId)
    }, PUSH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state, userId])

  // Cambios remotos en tiempo real (otro dispositivo).
  useEffect(() => {
    if (!supabase || !userId) return
    const channel = supabase
      .channel(`app_state_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_state',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const raw = (payload.new as { data?: unknown } | null)?.data
          if (!raw) return
          const remote = sanitizeRemoteState(raw)
          const remoteJson = JSON.stringify(remote)
          if (remoteJson === JSON.stringify(stateRef.current)) return
          if (remoteJson === lastPushedRef.current) return
          skipPushRef.current = true
          applyRemote(remote)
          setStatus('synced')
        },
      )
      .subscribe()
    return () => {
      if (supabase) void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function signIn(email: string, password: string) {
    if (!supabase) return
    setAuthError(null)
    setAuthNotice(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) setAuthError(translateAuthError(error.message))
  }

  async function signUp(email: string, password: string) {
    if (!supabase) return
    setAuthError(null)
    setAuthNotice(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setAuthError(translateAuthError(error.message))
    } else if (!data.session) {
      setAuthNotice(
        'Cuenta creada. Revisa tu correo y confirma el email antes de entrar.',
      )
    }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    if (!supabase) return
    setAuthError(null)
    setAuthNotice(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
    })
    if (error) setAuthError(translateAuthError(error.message))
    else
      setAuthNotice(
        'Te enviamos un correo con un enlace para restablecer la contraseña.',
      )
  }

  async function updatePassword(password: string) {
    if (!supabase) return
    setAuthError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setAuthError(translateAuthError(error.message))
    else setRecoveryMode(false)
  }

  function retry() {
    if (userId) void pushNow(stateRef.current, userId)
  }

  return {
    enabled: supabase !== null,
    status,
    authReady,
    recoveryMode,
    email: session?.user.email ?? null,
    authError,
    authNotice,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    retry,
  }
}

export type CloudSync = ReturnType<typeof useCloudSync>

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message))
    return 'Email o contraseña incorrectos.'
  if (/password should be at least/i.test(message))
    return 'La contraseña debe tener al menos 6 caracteres.'
  if (/user already registered/i.test(message))
    return 'Ese email ya tiene cuenta — usa «Entrar».'
  if (/email not confirmed/i.test(message))
    return 'Confirma tu email desde el correo que te llegó.'
  return message
}
