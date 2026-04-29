import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { hashPassword } from '../lib/auth'

interface Props {
  onClose: () => void
  initialTab?: 'profile' | 'settings'
}

const ROLE_LABELS: Record<string, string> = {
  instructor: 'Instructor',
  team_lead: 'Team Lead',
  student: 'Student',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function ProfileModal({ onClose, initialTab = 'profile' }: Props) {
  const { currentUser, signOut, refreshProfile } = useAuth()
  const [tab, setTab] = useState<'profile' | 'settings'>(initialTab)

  const [name, setName]     = useState(currentUser?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  // Email editing
  const [email, setEmail]       = useState(currentUser?.email || '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [savedEmail, setSavedEmail]   = useState(false)
  const [emailError, setEmailError]   = useState('')

  // Change password
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [savingPw, setSavingPw]     = useState(false)
  const [savedPw, setSavedPw]       = useState(false)
  const [pwError, setPwError]       = useState('')

  async function saveName() {
    if (!currentUser || !name.trim()) return
    setSaving(true)
    setError('')
    const { error: e } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', currentUser.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function saveEmail() {
    if (!currentUser) return
    setSavingEmail(true)
    setEmailError('')
    const { error: e } = await supabase
      .from('profiles')
      .update({ email: email.trim() || null })
      .eq('id', currentUser.id)
    setSavingEmail(false)
    if (e) { setEmailError(e.message); return }
    await refreshProfile()
    setSavedEmail(true)
    setTimeout(() => setSavedEmail(false), 2500)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    setPwError('')

    // Verify current password
    const currentHash = await hashPassword(currentPw)
    if (currentHash !== currentUser.password_hash) {
      setPwError('Current password is incorrect.')
      return
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.')
      return
    }

    setSavingPw(true)
    const newHash = await hashPassword(newPw)
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ password_hash: newHash })
      .eq('id', currentUser.id)
    setSavingPw(false)
    if (dbErr) { setPwError(dbErr.message); return }
    setSavedPw(true)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setTimeout(() => setSavedPw(false), 2500)
  }

  const displayName = currentUser?.full_name || 'Member'
  const avatarUrl   = currentUser?.avatar_url || null
  const username    = currentUser?.username || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#091426] px-6 pt-6 pb-0 text-white">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-full border-4 border-[#57dffe]/40 object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1e293b] border-4 border-[#57dffe]/40 flex items-center justify-center">
                  <span className="font-display font-bold text-xl text-white">{getInitials(displayName)}</span>
                </div>
              )}
              <div>
                <h2 className="font-display text-xl font-bold">{displayName}</h2>
                <p className="text-[#57dffe] text-sm">{ROLE_LABELS[currentUser?.role || 'student']}</p>
                <p className="text-white/50 text-xs mt-0.5 font-mono">@{username}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(['profile','settings'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm font-bold capitalize transition-colors border-b-2 ${tab === t ? 'border-[#57dffe] text-[#57dffe]' : 'border-transparent text-white/50 hover:text-white/80'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {tab === 'profile' ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Season Pts',  value: (currentUser?.season_points  ?? 0).toLocaleString(), color: 'text-[#00687a]' },
                  { label: 'Total Pts',   value: (currentUser?.total_points   ?? 0).toLocaleString(), color: 'text-[#091426]' },
                  { label: 'Day Streak',  value: `${currentUser?.daily_streak ?? 0}d`,               color: 'text-[#ba1a1a]' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{s.label}</p>
                    <p className={`font-display text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Edit display name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Display Name</label>
                <div className="flex gap-2">
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20" />
                  <button onClick={saveName} disabled={saving || name === currentUser?.full_name}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 ${saved ? 'bg-emerald-500 text-white' : 'bg-[#00687a] text-white hover:bg-[#005566] disabled:opacity-40'}`}>
                    {saved
                      ? <><span className="material-symbols-outlined text-lg">check</span>Saved</>
                      : saving
                      ? <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                      : 'Save'
                    }
                  </button>
                </div>
                {error && <p className="text-xs text-[#ba1a1a] mt-1">{error}</p>}
              </div>

              {/* Editable email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20"
                  />
                  <button
                    onClick={saveEmail}
                    disabled={savingEmail || email === (currentUser?.email || '')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 ${savedEmail ? 'bg-emerald-500 text-white' : 'bg-[#00687a] text-white hover:bg-[#005566] disabled:opacity-40'}`}
                  >
                    {savedEmail
                      ? <><span className="material-symbols-outlined text-lg">check</span>Saved</>
                      : savingEmail
                      ? <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                      : 'Save'
                    }
                  </button>
                </div>
                {emailError && <p className="text-xs text-[#ba1a1a] mt-1">{emailError}</p>}
              </div>

              {/* Read-only fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-mono">
                    @{username}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 capitalize">
                    {ROLE_LABELS[currentUser?.role || 'student']}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Settings */}
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono">@{username}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Username &amp; password authentication</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Member Since</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {currentUser?.created_at
                      ? new Date(currentUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—'
                    }
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">App Version</p>
                  <p className="text-sm font-semibold text-slate-800">Robo-Portal v2.0</p>
                  <p className="text-xs text-slate-400 mt-0.5">React + Vite + Supabase</p>
                </div>
              </div>

              {/* Change Password */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">lock</span>
                    Change Password
                  </p>
                </div>
                <form onSubmit={changePassword} className="p-4 space-y-3">
                  {savedPw && (
                    <div className="bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Password updated successfully!
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={currentPw}
                        onChange={e => { setCurrentPw(e.target.value); setPwError('') }}
                        placeholder="Enter current password"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {showPw ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => { setNewPw(e.target.value); setPwError('') }}
                      placeholder="Min. 6 characters"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => { setConfirmPw(e.target.value); setPwError('') }}
                      placeholder="Re-enter new password"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20"
                    />
                  </div>
                  {pwError && (
                    <div className="bg-[#ffdad6] text-[#93000a] text-xs font-medium px-3 py-2 rounded-lg">{pwError}</div>
                  )}
                  <button
                    type="submit"
                    disabled={savingPw || !currentPw || !newPw || !confirmPw}
                    className="w-full py-2.5 bg-[#00687a] text-white rounded-xl text-sm font-bold hover:bg-[#005566] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {savingPw
                      ? <><span className="material-symbols-outlined animate-spin text-lg">refresh</span>Updating…</>
                      : <><span className="material-symbols-outlined text-lg">lock_reset</span>Update Password</>
                    }
                  </button>
                </form>
              </div>

              {/* Sign out */}
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => { signOut(); onClose() }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#ffdad6] text-[#93000a] rounded-xl text-sm font-bold hover:bg-[#ffb4ab] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
