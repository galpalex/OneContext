import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { describeError, isSupabaseConfigured, supabase } from '../lib/supabase'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  user: User | null
  signInPending: boolean
  signOutPending: boolean
  authError: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearAuthError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'signed-out',
  )
  const [signInPending, setSignInPending] = useState(false)
  const [signOutPending, setSignOutPending] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Restore any persisted session, then keep it in sync with Supabase.
  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setAuthError(describeError(error))
        setSession(data.session)
        setStatus(data.session ? 'signed-in' : 'signed-out')
      })
      .catch((error: unknown) => {
        if (!active) return
        setAuthError(describeError(error))
        setStatus('signed-out')
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setStatus(nextSession ? 'signed-in' : 'signed-out')
      if (nextSession) {
        setSignInPending(false)
        setAuthError(null)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)

    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured, so Google sign-in cannot start.')
      return
    }

    setSignInPending(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Must be present in the Supabase Auth redirect allow list.
        redirectTo: `${window.location.origin}/customers`,
        queryParams: { prompt: 'select_account' },
      },
    })

    // On success the browser leaves this page, so pending stays true.
    if (error) {
      setAuthError(describeError(error))
      setSignInPending(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setSignOutPending(true)
    setAuthError(null)

    const { error } = await supabase.auth.signOut()

    if (error) setAuthError(describeError(error))
    setSignOutPending(false)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      signInPending,
      signOutPending,
      authError,
      signInWithGoogle,
      signOut,
      clearAuthError,
    }),
    [status, session, signInPending, signOutPending, authError, signInWithGoogle, signOut, clearAuthError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
