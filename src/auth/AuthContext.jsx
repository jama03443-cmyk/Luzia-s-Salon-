import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './useAuth'
import { isSupabaseConfigured, supabase } from '../supabaseClient'

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => ({
    isLoading: isSupabaseConfigured,
    session: null,
    isAdmin: false,
  }))

  const resolveSession = useCallback(async (session) => {
    if (!session || !supabase) {
      setAuthState({ isLoading: false, session: null, isAdmin: false })
      return
    }

    let isAdmin = false
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
      isAdmin = !error && profile?.role === 'admin'
    } catch {
      // Keep the authenticated session available even when profile lookup fails.
    }

    setAuthState({
      isLoading: false,
      session,
      isAdmin,
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!isSupabaseConfigured || !supabase) {
      return undefined
    }

    const loadInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (isMounted) await resolveSession(data.session)
      } catch {
        if (isMounted) await resolveSession(null)
      }
    }

    void loadInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (isMounted) void resolveSession(session)
      }, 0)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [resolveSession])

  const value = useMemo(
    () => ({ ...authState, refreshAuth: resolveSession }),
    [authState, resolveSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
