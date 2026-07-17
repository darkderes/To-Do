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

export function useCloudSync({ state, applyRemote }: CloudSyncArgs) {
  const [session, setSession] = useState<Session | null>(null)
  const [opStatus, setStatus] = useState<'syncing' | 'synced' | 'error'>(
    'syncing',
  )
  const [authError, setAuthError] = useState<string | null>(null)
  const stateRef = useRef(state)
  const skipPushRef = useRef(false)
  const initializedRef = useRef(false)
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
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  async function pushNow(nextState: SyncedState, id: string) {
    if (!supabase) return
    setStatus('syncing')
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
      const remote = data?.data as SyncedState | undefined
      const merged = remote
        ? mergeState(remote, stateRef.current)
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
          const remote = (payload.new as { data?: SyncedState } | null)?.data
          if (!remote) return
          if (JSON.stringify(remote) === JSON.stringify(stateRef.current))
            return
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) setAuthError(translateAuthError(error.message))
  }

  async function signUp(email: string, password: string) {
    if (!supabase) return
    setAuthError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setAuthError(translateAuthError(error.message))
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return {
    enabled: supabase !== null,
    status,
    email: session?.user.email ?? null,
    authError,
    signIn,
    signUp,
    signOut,
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
