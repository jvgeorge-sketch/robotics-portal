import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { isMissingConfig } from './lib/supabase'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import SetupRequired from './pages/SetupRequired'
import Dashboard from './pages/Dashboard'
import TeamHub from './pages/TeamHub'
import OpenPool from './pages/OpenPool'
import Workspace from './pages/Workspace'
import Leaderboard from './pages/Leaderboard'
import Teams from './pages/Teams'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  if (isMissingConfig) return <SetupRequired />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/team-hub" element={<TeamHub />} />
              <Route path="/open-pool" element={<OpenPool />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
