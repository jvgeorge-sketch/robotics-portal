import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Props {
  onClose: () => void
  initialTab?: 'profile' | 'settings'
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', project_manager: 'Project Manager',
  team_lead: 'Team Lead', student: 'Student', viewer: 'Viewer',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function ProfileModal({ onClose, initialTab = 'profile' }: Props) {
  const { profile, user, signOut } = useAuth()
  const [tab, setTab] = useState<'profile' | 'settings'>(initialTab)

  const [name, setName]     = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  async function saveName() {
    if (!user || !name.trim()) return
    setSaving(true)
    setError('')
    const { error: e } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Member'
  const avatarUrl   = profile?.avatar_url || user?.user_metadata?.avatar_url || null

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
                <p className="text-[#57dffe] text-sm">{ROLE_LABELS[profile?.role || 'student']}</p>
                <p className="text-white/50 text-xs mt-0.5">{user?.email}</p>
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
        <div className="p-6 space-y-5">
          {tab === 'profile' ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Season Pts',  value: (profile?.season_points  ?? 0).toLocaleString(), color: 'text-[#00687a]'  },
                  { label: 'Total Pts',   value: (profile?.total_points   ?? 0).toLocaleString(), color: 'text-[#091426]'  },
                  { label: 'Day Streak',  value: `${profile?.daily_streak ?? 0}d`,                color: 'text-[#ba1a1a]'  },
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
                  <button onClick={saveName} disabled={saving || name === profile?.full_name}
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

              {/* Read-only fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600">
                    {user?.email}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 capitalize">
                    {ROLE_LABELS[profile?.role || 'student']}
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
                  <p className="text-sm font-semibold text-slate-800">{user?.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Signed in via Google OAuth</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Member Since</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—'
                    }
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">App Version</p>
                  <p className="text-sm font-semibold text-slate-800">Robo-Portal v1.0</p>
                  <p className="text-xs text-slate-400 mt-0.5">React + Vite + Supabase</p>
                </div>
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
