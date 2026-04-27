import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Supabase redirects here after Google OAuth.
// It appends a `code` param that we exchange for a session.
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(() => {
      navigate('/', { replace: true })
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#00687a] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-display font-semibold text-[#091426]">Authenticating…</p>
      </div>
    </div>
  )
}
