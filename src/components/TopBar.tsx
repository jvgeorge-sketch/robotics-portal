import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import ProfileModal from './ProfileModal'

function getInitials(name: string | null | undefined) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function TopBar() {
  const { profile, user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileTab, setProfileTab] = useState<'profile' | 'settings'>('profile')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Team Member'
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null
  const points = profile?.total_points ?? 0
  const role = profile?.role ?? 'student'

  return (
    <>
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-6 z-40">
      <div className="flex items-center gap-4">
        <span className="text-xl font-black tracking-tight text-slate-900 font-display">ROBO-PORTAL</span>
        <div className="hidden lg:block h-5 w-px bg-slate-200 mx-2" />
        <div className="relative hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="bg-slate-100 border-none rounded-full py-1.5 pl-9 pr-4 text-sm w-64 focus:ring-2 focus:ring-[#00687a] outline-none"
            placeholder="Search tasks..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Points badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#e5eeff] px-3 py-1.5 rounded-full">
          <span className="material-symbols-filled text-[#00687a]" style={{ fontSize: 16 }}>emoji_events</span>
          <span className="font-display font-bold text-[#091426] text-sm">{points.toLocaleString()} pts</span>
        </div>

        {/* Notifications */}
        <button className="relative text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-100">
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border-2 border-[#00687a] object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#1e293b] border-2 border-[#00687a] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold font-display">{getInitials(displayName)}</span>
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{displayName}</p>
              <p className="text-[10px] text-[#00687a] font-bold uppercase tracking-tight">{role.replace('_', ' ')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-lg hidden md:block">expand_more</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button onClick={() => { setProfileTab('profile'); setProfileOpen(true); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-xl">person</span> Profile
              </button>
              <button onClick={() => { setProfileTab('settings'); setProfileOpen(true); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-xl">settings</span> Settings
              </button>
              <div className="border-t border-slate-100 mt-1">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">logout</span> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {profileOpen && (
      <ProfileModal
        onClose={() => setProfileOpen(false)}
        initialTab={profileTab}
      />
    )}
  </>
  )
}
