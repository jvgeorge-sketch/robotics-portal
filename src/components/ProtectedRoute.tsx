import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Shows a spinner while the session is being read from Supabase,
// redirects to /login if unauthenticated, otherwise renders children.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#00687a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-display font-semibold text-[#091426] text-sm">Loading portal…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
