import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hashPassword } from '../lib/auth'
import { useAuth } from '../context/AuthContext'
import type { Profile, Team, AccessRequest } from '../lib/database.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow extends Profile {
  teamId: string | null
  teamName: string | null
  isLead: boolean
}

interface CreateUserForm {
  username: string
  fullName: string
  role: 'student' | 'team_lead' | 'instructor'
  password: string
  confirmPassword: string
  teamId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  instructor: 'Instructor',
  team_lead: 'Team Lead',
  student: 'Student',
}

const ROLE_COLORS: Record<string, string> = {
  instructor: 'bg-[#78350F] text-[#F59E0B]',
  team_lead: 'bg-[#DBEAFE] text-[#1E40AF]',
  student: 'bg-slate-100 text-slate-600',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function generateUsername(fullName: string, existingUsernames: string[]): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return ''
  const first = parts[0].replace(/[^a-z0-9]/g, '')
  const last = parts[parts.length - 1].replace(/[^a-z0-9]/g, '')
  if (!first || !last) return ''
  const base = `${first}.${last}`
  if (!existingUsernames.includes(base)) return base
  let n = 2
  while (existingUsernames.includes(`${base}${n}`)) n++
  return `${base}${n}`
}

function CreateUserModal({
  teams,
  existingUsernames,
  onClose,
  onCreated,
  prefill,
}: {
  teams: Team[]
  existingUsernames: string[]
  onClose: () => void
  onCreated: () => void
  prefill?: { fullName: string; requestId?: string }
}) {
  const initialFullName = prefill?.fullName ?? ''
  const [form, setForm] = useState<CreateUserForm>({
    username: generateUsername(initialFullName, existingUsernames),
    fullName: initialFullName,
    role: 'student',
    password: 'Monday99', confirmPassword: 'Monday99', teamId: '',
  })
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(key: keyof CreateUserForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleFullNameChange(value: string) {
    setForm(f => {
      const next = { ...f, fullName: value }
      if (!usernameEdited) {
        next.username = generateUsername(value, existingUsernames)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const username = form.username.toLowerCase().trim()
    if (!/^[a-z][a-z0-9]*\.[a-z][a-z0-9]*(\d*)$/.test(username)) {
      setError('Username must be in firstname.lastname format (e.g. john.smith).')
      return
    }
    if (!form.fullName.trim()) {
      setError('Display name is required.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const passwordHash = await hashPassword(form.password)

    const { data: newUser, error: dbErr } = await supabase
      .from('profiles')
      .insert({
        username,
        password_hash: passwordHash,
        full_name: form.fullName.trim(),
        role: form.role,
        email: null,
        avatar_url: null,
        total_points: 0,
        season_points: 0,
        daily_streak: 0,
        is_active: true,
        must_change_password: true,
      })
      .select()
      .single()

    if (dbErr || !newUser) {
      setSaving(false)
      setError(dbErr?.message?.includes('unique') ? 'That username is already taken.' : (dbErr?.message || 'Failed to create user.'))
      return
    }

    if (form.teamId) {
      await supabase.from('team_members').insert({
        user_id: newUser.id,
        team_id: form.teamId,
        is_lead: form.role === 'team_lead',
      })
    }

    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E3A8A] text-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FBBF24]">person_add</span>
            <h2 className="font-display text-lg font-bold">Create New User</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Display name — first so username auto-fills */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              value={form.fullName}
              onChange={e => handleFullNameChange(e.target.value)}
              placeholder="e.g. Jordan Smith"
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          {/* Username — auto-generated, editable */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Username <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              value={form.username}
              onChange={e => { setUsernameEdited(true); update('username', e.target.value) }}
              placeholder="firstname.lastname"
              autoCapitalize="none"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Auto-filled from name · edit if needed · duplicates get a number suffix</p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
            <div className="flex gap-2">
              {(['student', 'team_lead', 'instructor'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => update('role', r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    form.role === r
                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Password <span className="text-[#ba1a1a]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Confirm Password <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              placeholder="Re-enter password"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          {/* Team assignment */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign to Team</label>
            <select
              value={form.teamId}
              onChange={e => update('teamId', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
            >
              <option value="">— No team yet —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] text-sm font-medium px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving
                ? <><span className="material-symbols-outlined text-lg animate-spin">refresh</span>Creating…</>
                : <><span className="material-symbols-outlined text-lg">person_add</span>Create User</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({
  target,
  onClose,
  onDone,
}: {
  target: UserRow
  onClose: () => void
  onDone: () => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }

    setSaving(true)
    const hash = await hashPassword(newPassword)
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ password_hash: hash })
      .eq('id', target.id)
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E3A8A] text-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FBBF24]">lock_reset</span>
            <div>
              <h2 className="font-display text-base font-bold">Reset Password</h2>
              <p className="text-[#6B7280] text-xs">@{target.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>
          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] text-sm font-medium px-4 py-2.5 rounded-xl">{error}</div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving
                ? <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                : 'Reset Password'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { currentUser } = useAuth()

  // Only instructors may access this page
  if (currentUser && currentUser.role !== 'instructor') {
    return <Navigate to="/" replace />
  }

  const [users, setUsers] = useState<UserRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [saving, setSaving] = useState<string | null>(null) // userId being saved
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showSeasonReset, setShowSeasonReset] = useState(false)
  const [resettingSeason, setResettingSeason] = useState(false)
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [approveTarget, setApproveTarget] = useState<AccessRequest | null>(null)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [resettingDefaultId, setResettingDefaultId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: allTeams }, { data: members }, { data: requests }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('team_members').select('user_id, team_id, is_lead'),
      supabase.from('access_requests').select('*').order('created_at', { ascending: false }),
    ])

    const teamMap: Record<string, string> = {}
    const leadMap: Record<string, boolean> = {}
    for (const m of (members || []) as any[]) {
      teamMap[m.user_id] = m.team_id
      leadMap[m.user_id] = m.is_lead
    }

    const teamNameMap: Record<string, string> = {}
    for (const t of (allTeams || [])) teamNameMap[t.id] = t.name

    setUsers(((profiles || []) as Profile[]).map(p => ({
      ...p,
      teamId: teamMap[p.id] || null,
      teamName: teamMap[p.id] ? teamNameMap[teamMap[p.id]] || null : null,
      isLead: leadMap[p.id] || false,
    })))
    setTeams(allTeams || [])
    setAccessRequests((requests || []) as AccessRequest[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function assignTeam(userId: string, teamId: string) {
    setSaving(userId)
    // Remove existing memberships
    await supabase.from('team_members').delete().eq('user_id', userId)
    if (teamId) {
      const user = users.find(u => u.id === userId)
      await supabase.from('team_members').insert({
        user_id: userId,
        team_id: teamId,
        is_lead: user?.role === 'team_lead',
      })
    }
    await load()
    setSaving(null)
  }

  async function toggleActive(user: UserRow) {
    setSaving(user.id)
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    await load()
    setSaving(null)
  }

  async function toggleLead(userId: string, teamId: string, currentlyLead: boolean) {
    setSaving(userId)
    if (!currentlyLead) {
      // Set this user as lead, remove lead from others on the team
      await Promise.all([
        supabase.from('team_members').update({ is_lead: true }).eq('user_id', userId).eq('team_id', teamId),
        supabase.from('team_members').update({ is_lead: false }).eq('team_id', teamId).neq('user_id', userId),
        supabase.from('teams').update({ lead_id: userId }).eq('id', teamId),
      ])
    } else {
      // Remove lead status
      await Promise.all([
        supabase.from('team_members').update({ is_lead: false }).eq('user_id', userId).eq('team_id', teamId),
        supabase.from('teams').update({ lead_id: null }).eq('id', teamId),
      ])
    }
    await load()
    setSaving(null)
  }

  async function deleteUser(userId: string) {
    setDeleting(userId)
    setDeleteError(null)
    try {
      // Delete dependent records first
      await supabase.from('time_logs').delete().eq('user_id', userId)
      await supabase.from('badges').delete().eq('user_id', userId)
      await supabase.from('blockers').delete().eq('reported_by', userId)
      await supabase.from('team_members').delete().eq('user_id', userId)
      // Nullify tasks assigned to this user
      await supabase.from('tasks').update({ assigned_to: null }).eq('assigned_to', userId)

      // Attempt profile delete
      const { error: delErr } = await supabase.from('profiles').delete().eq('id', userId)
      if (delErr) {
        // Likely FK constraint from tasks.created_by
        setDeleteError('User has created tasks — deactivate instead of deleting.')
        // Revert: re-load to reset state
        await load()
        setDeleting(null)
        setDeleteConfirmId(null)
        return
      }

      await load()
    } catch {
      setDeleteError('Unexpected error deleting user.')
    }
    setDeleting(null)
    setDeleteConfirmId(null)
  }

  function exportCSV() {
    const header = ['Name', 'Username', 'Role', 'Team', 'Email', 'Season Points', 'Total Points', 'Active']
    const rows = users.map(u => [
      u.full_name,
      u.username,
      ROLE_LABELS[u.role] || u.role,
      u.teamName || '',
      u.email || '',
      String(u.season_points),
      String(u.total_points),
      u.is_active ? 'Yes' : 'No',
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `robo-portal-roster-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function resetToDefault(userId: string) {
    setResettingDefaultId(userId)
    const hash = await hashPassword('Monday99')
    await supabase.from('profiles').update({
      password_hash: hash,
      must_change_password: true,
      reset_requested: false,
    }).eq('id', userId)
    await load()
    setResettingDefaultId(null)
  }

  async function denyRequest(id: string) {
    setDenyingId(id)
    await supabase.from('access_requests').update({ status: 'denied', reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.id ?? null }).eq('id', id)
    await load()
    setDenyingId(null)
  }

  async function resetSeason() {
    setResettingSeason(true)
    await supabase.from('profiles').update({ season_points: 0 }).neq('id', '')
    await load()
    setResettingSeason(false)
    setShowSeasonReset(false)
  }

  const students  = users.filter(u => u.role !== 'instructor')
  const instructors = users.filter(u => u.role === 'instructor')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="material-symbols-outlined text-[#1D4ED8] text-4xl animate-spin">refresh</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#78350F] text-[#F59E0B] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Instructor Console
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-[#1F2937]">Admin Panel</h1>
          <p className="text-[#4B5563] mt-1">
            Create accounts, assign teams, and manage portal access.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">download</span>
            Export CSV
          </button>
          <button
            onClick={() => setShowSeasonReset(true)}
            className="bg-white border border-[#ba1a1a]/30 text-[#ba1a1a] px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#ffdad6]/30 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">restart_alt</span>
            Reset Season
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[#1D4ED8] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1E3A8A] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            Add User
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: users.length, icon: 'group', color: '#1D4ED8' },
          { label: 'Students', value: users.filter(u => u.role === 'student').length, icon: 'school', color: '#6366f1' },
          { label: 'Team Leads', value: users.filter(u => u.role === 'team_lead').length, icon: 'manage_accounts', color: '#f59e0b' },
          { label: 'Active Teams', value: teams.length, icon: 'hub', color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-xl" style={{ color: stat.color }}>{stat.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
            </div>
            <p className="font-display text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {deleteError && (
        <div className="mb-4 bg-[#ffdad6] text-[#93000a] text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-auto text-[#93000a]/60 hover:text-[#93000a]">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Password Reset Requests */}
      {users.filter(u => u.reset_requested).length > 0 && (
        <div className="bg-white border border-[#BFDBFE]/60 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1D4ED8]">lock_reset</span>
              <h3 className="font-display text-lg font-semibold text-slate-900">Password Reset Requests</h3>
            </div>
            <span className="bg-[#1D4ED8] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              {users.filter(u => u.reset_requested).length} pending
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {users.filter(u => u.reset_requested).map(u => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold font-display">{initials(u.full_name)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1F2937]">{u.full_name}</p>
                    <p className="text-xs text-[#4B5563] font-mono">@{u.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => resetToDefault(u.id)}
                  disabled={resettingDefaultId === u.id}
                  className="px-4 py-1.5 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {resettingDefaultId === u.id
                    ? <><span className="material-symbols-outlined text-sm animate-spin">refresh</span>Resetting…</>
                    : <><span className="material-symbols-outlined text-sm">lock_reset</span>Reset to Default</>
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Requests */}
      {accessRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-white border border-[#FBBF24]/40 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#F59E0B]">how_to_reg</span>
              <h3 className="font-display text-lg font-semibold text-slate-900">Access Requests</h3>
            </div>
            <span className="bg-[#FBBF24] text-[#78350F] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              {accessRequests.filter(r => r.status === 'pending').length} pending
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {accessRequests.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#1F2937]">{req.full_name}</p>
                  <p className="text-xs text-[#4B5563] mt-0.5">{req.email}</p>
                  {req.message && (
                    <p className="text-xs text-slate-400 mt-1.5 italic">"{req.message}"</p>
                  )}
                  <p className="text-[10px] text-slate-300 mt-1.5">{new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => denyRequest(req.id)}
                    disabled={denyingId === req.id}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-[#ffdad6] hover:text-[#93000a] hover:border-[#ba1a1a]/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => setApproveTarget(req)}
                    className="px-3 py-1.5 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student / Team Lead roster */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-slate-900">Student Roster</h3>
          <span className="text-xs text-slate-400 font-bold uppercase">{students.length} members</span>
        </div>

        {students.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-slate-300 text-5xl block mb-3">group_off</span>
            <p className="text-slate-500 font-medium">No students yet.</p>
            <p className="text-slate-400 text-sm mt-1">Click "Add User" to create the first student account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Team Assignment</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(u => (
                  <>
                    <tr key={u.id} className={`transition-colors ${u.is_active ? 'hover:bg-slate-50' : 'bg-slate-50/60 opacity-60'}`}>
                      {/* Member */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold font-display">{initials(u.full_name)}</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#1E3A8A]">{u.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>

                      {/* Team assignment */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.teamId || ''}
                            disabled={saving === u.id}
                            onChange={e => assignTeam(u.id, e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:border-[#1D4ED8] disabled:opacity-50"
                          >
                            <option value="">— No team —</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          {/* Lead toggle — only when user has a team */}
                          {u.teamId && (
                            <button
                              onClick={() => toggleLead(u.id, u.teamId!, u.isLead)}
                              disabled={saving === u.id}
                              title={u.isLead ? 'Remove team lead' : 'Set as team lead'}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all disabled:opacity-50 ${
                                u.isLead
                                  ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#1E40AF]/30 hover:bg-[#ffdad6] hover:text-[#93000a] hover:border-[#93000a]/30'
                                  : 'bg-white text-slate-400 border-slate-200 hover:bg-[#DBEAFE] hover:text-[#1E40AF] hover:border-[#1E40AF]/30'
                              }`}
                            >
                              {u.isLead ? '★ Lead' : '☆ Lead'}
                            </button>
                          )}
                          {saving === u.id && (
                            <span className="material-symbols-outlined text-[#1D4ED8] text-sm animate-spin align-middle">refresh</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setResetTarget(u)}
                            title="Reset password"
                            className="p-1.5 text-slate-400 hover:text-[#1D4ED8] hover:bg-[#DBEAFE] rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">lock_reset</span>
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={saving === u.id}
                            title={u.is_active ? 'Deactivate account' : 'Reactivate account'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                              u.is_active
                                ? 'text-slate-400 hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30'
                                : 'text-emerald-500 hover:bg-emerald-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-lg">
                              {u.is_active ? 'person_off' : 'person_check'}
                            </span>
                          </button>
                          <button
                            onClick={() => { setDeleteConfirmId(u.id); setDeleteError(null) }}
                            title="Delete user"
                            className="p-1.5 text-slate-400 hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Delete confirmation row */}
                    {deleteConfirmId === u.id && (
                      <tr key={`delete-${u.id}`}>
                        <td colSpan={5} className="px-6 py-3 bg-[#fff8f6]">
                          <div className="bg-[#ffdad6] rounded-xl p-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-[#93000a]">
                              Delete <span className="font-mono">@{u.username}</span> permanently?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-3 py-1.5 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => deleteUser(u.id)}
                                disabled={deleting === u.id}
                                className="px-3 py-1.5 bg-[#ba1a1a] text-white rounded-lg text-sm font-bold hover:bg-[#93000a] disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {deleting === u.id
                                  ? <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                                  : <span className="material-symbols-outlined text-base">delete</span>
                                }
                                {deleting === u.id ? 'Deleting…' : 'Yes, Delete'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructor accounts */}
      {instructors.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-slate-900">Instructor Accounts</h3>
            <span className="text-xs text-slate-400 font-bold uppercase">{instructors.length} instructors</span>
          </div>
          <div className="divide-y divide-slate-100">
            {instructors.map(u => (
              <>
                <div key={u.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#78350F] flex items-center justify-center">
                      <span className="text-[#F59E0B] text-xs font-bold font-display">{initials(u.full_name)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#1E3A8A]">{u.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider bg-[#78350F] text-[#F59E0B]">
                      Instructor
                    </span>
                    <button
                      onClick={() => setResetTarget(u)}
                      title="Reset password"
                      className="p-1.5 text-slate-400 hover:text-[#1D4ED8] hover:bg-[#DBEAFE] rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">lock_reset</span>
                    </button>
                    <button
                      onClick={() => { setDeleteConfirmId(u.id); setDeleteError(null) }}
                      title="Delete instructor"
                      className="p-1.5 text-slate-400 hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
                {deleteConfirmId === u.id && (
                  <div key={`delete-inst-${u.id}`} className="px-6 py-3 bg-[#fff8f6]">
                    <div className="bg-[#ffdad6] rounded-xl p-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#93000a]">
                        Delete <span className="font-mono">@{u.username}</span> permanently?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={deleting === u.id}
                          className="px-3 py-1.5 bg-[#ba1a1a] text-white rounded-lg text-sm font-bold hover:bg-[#93000a] disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {deleting === u.id
                            ? <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                            : <span className="material-symbols-outlined text-base">delete</span>
                          }
                          {deleting === u.id ? 'Deleting…' : 'Yes, Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Season Reset Confirmation */}
      {showSeasonReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSeasonReset(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#ba1a1a] text-xl">restart_alt</span>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900">Reset Season Points?</h2>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              This will set <strong>season_points to 0</strong> for all users.
              Total points and badges are unaffected.
            </p>
            <p className="text-xs font-bold text-[#ba1a1a] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSeasonReset(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={resetSeason}
                disabled={resettingSeason}
                className="flex-1 py-2.5 bg-[#ba1a1a] text-white rounded-xl text-sm font-bold hover:bg-[#93000a] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resettingSeason
                  ? <><span className="material-symbols-outlined animate-spin text-base">refresh</span>Resetting…</>
                  : 'Yes, Reset Season'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          teams={teams}
          existingUsernames={users.map(u => u.username)}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={load}
        />
      )}
      {approveTarget && (
        <CreateUserModal
          teams={teams}
          existingUsernames={users.map(u => u.username)}
          prefill={{ fullName: approveTarget.full_name, requestId: approveTarget.id }}
          onClose={() => setApproveTarget(null)}
          onCreated={async () => {
            await supabase.from('access_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.id ?? null }).eq('id', approveTarget.id)
            setApproveTarget(null)
            await load()
          }}
        />
      )}
    </div>
  )
}
