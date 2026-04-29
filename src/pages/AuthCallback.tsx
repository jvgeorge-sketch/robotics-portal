import { Navigate } from 'react-router-dom'

// OAuth callback no longer used — redirect to home
export default function AuthCallback() {
  return <Navigate to="/" replace />
}
