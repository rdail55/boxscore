import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bgg_username: string | null
}

type Auth = {
  ready: boolean
  session: Session | null
  profile: Profile | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const reloadProfile = useCallback(async () => {
    if (!userId) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
  }, [userId])

  useEffect(() => {
    reloadProfile()
  }, [reloadProfile])

  const value: Auth = {
    ready,
    session,
    profile,
    signIn: async () => {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/` } })
    },
    signOut: async () => {
      await supabase.auth.signOut()
    },
    reloadProfile,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth needs AuthProvider')
  return auth
}
