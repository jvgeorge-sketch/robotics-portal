import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { hashPassword, getStoredSession, storeSession, clearSession } from '../lib/auth'
import type { Profile } from '../lib/database.types'

interface AuthContextValue {
  currentUser: Profile | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<string | null>
  signOut: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data ?? null
  }, [])

  // On mount: restore session from localStorage
  useEffect(() => {
    const session = getStoredSession()
    if (!session) {
      setLoading(false)
      return
    }
    fetchProfile(session.userId).then(profile => {
      if (profile && profile.is_active) {
        setCurrentUser(profile)
      } else {
        clearSession()
      }
      setLoading(false)
    }).catch(() => {
      clearSession()
      setLoading(false)
    })
  }, [fetchProfile])

  const signIn = useCallback(async (username: string, password: string): Promise<string | null> => {
    const hash = await hashPassword(password)

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (error || !profile) {
      return 'Invalid username or password.'
    }
    if (!profile.is_active) {
      return 'This account has been deactivated. Contact your instructor.'
    }
    if (profile.password_hash !== hash) {
      return 'Invalid username or password.'
    }

    storeSession({ userId: profile.id, username: profile.username })
    setCurrentUser(profile)
    return null
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setCurrentUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const session = getStoredSession()
    if (!session) return
    const profile = await fetchProfile(session.userId)
    if (profile) setCurrentUser(profile)
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{ currentUser, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
