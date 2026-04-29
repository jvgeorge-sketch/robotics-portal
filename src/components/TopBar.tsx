import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import ProfileModal from './ProfileModal'
import TaskDetailModal from './TaskDetailModal'
import { supabase } from '../lib/supabase'

interface Notification {
  id: string
  description: string
  task_title: string | null
  reported_at: string
}

interface SearchResult {
  id: string
  title: string
  status: string
  team_name: string | null
}

const STATUS_COLOR: Record<string, string> = {
  backlog:     'bg-slate-100 text-slate-600',
  ready:       'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  review:      'bg-purple-100 text-purple-700',
  done:        'bg-emerald-100 text-emerald-700',
}

function getInitials(name: string | null | undefined) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

interface TopBarProps {
  onMenuClick?: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { currentUser, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileTab, setProfileTab] = useState<'profile' | 'settings'>('profile')
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchDetailId, setSearchDetailId] = useState<string | null>(null)
  const searchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    async function loadNotifs() {
      const { data } = await supabase
        .from('blockers')
        .select('id, description, reported_at, task_id(title)')
        .is('resolved_at', null)
        .order('reported_at', { ascending: false })
        .limit(10)
      setNotifications((data || []).map((b: any) => ({
        id: b.id,
        description: b.description,
        task_title: b.task_id?.title || null,
        reported_at: b.reported_at,
      })))
    }
    loadNotifs()
    const interval = setInterval(loadNotifs, 30_000)
    return () => clearInterval(interval)
  }, [])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setSearchQuery(q)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!q.trim()) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    setSearchOpen(true)
    setSearchLoading(true)
    searchTimerRef.current = window.setTimeout(async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, team_id(name)')
        .ilike('title', `%${q.trim()}%`)
        .limit(8)
      setSearchResults(
        ((data || []) as any[]).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          team_name: t.team_id?.name || null,
        }))
      )
      setSearchLoading(false)
    }, 250)
  }

  const displayName = currentUser?.full_name ?? 'Team Member'
  const avatarUrl = currentUser?.avatar_url ?? null
  const points = currentUser?.total_points ?? 0
  const role = currentUser?.role ?? 'student'
  const username = currentUser?.username ?? ''

  return (
    <>
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-6 z-40">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        <span className="text-xl font-black tracking-tight text-slate-900 font-display">ROBO-PORTAL</span>
        <div className="hidden lg:block h-5 w-px bg-slate-200 mx-2" />

        {/* Search bar */}
        <div className="relative hidden lg:block" ref={searchRef}>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="bg-slate-100 border-none rounded-full py-1.5 pl-9 pr-4 text-sm w-64 focus:ring-2 focus:ring-[#00687a] outline-none"
            placeholder="Search tasks..."
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if (searchQuery.trim()) setSearchOpen(true) }}
          />
          {searchLoading && (
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm animate-spin">refresh</span>
          )}

          {/* Search dropdown */}
          {searchOpen && (
            <div className="absolute left-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {searchLoading ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  <span className="material-symbols-outlined text-2xl animate-spin block mb-1">refresh</span>
                  Searching…
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  <span className="material-symbols-outlined text-2xl block mb-1 text-slate-300">search_off</span>
                  No tasks found
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSearchDetailId(r.id)
                        setSearchOpen(false)
                        setSearchQuery('')
                      }}
                      className="w-full px-4 py-3 hover:bg-slate-50 text-left flex items-center gap-3 transition-colors"
                    >
                      <span className="material-symbols-outlined text-slate-400 text-xl flex-shrink-0">task_alt</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${STATUS_COLOR[r.status] || 'bg-slate-100 text-slate-600'}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                          {r.team_name && (
                            <span className="text-[10px] text-slate-400">{r.team_name}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Points badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#e5eeff] px-3 py-1.5 rounded-full">
          <span className="material-symbols-filled text-[#00687a]" style={{ fontSize: 16 }}>emoji_events</span>
          <span className="font-display font-bold text-[#091426] text-sm">{points.toLocaleString()} pts</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">Open Blockers</p>
                <span className="text-[10px] font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                  {notifications.length} open
                </span>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <span className="material-symbols-outlined text-3xl block mb-2 text-slate-300">check_circle</span>
                  No open blockers
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map(n => (
                    <div key={n.id} className="px-4 py-3 hover:bg-slate-50">
                      {n.task_title && (
                        <p className="text-[10px] font-bold text-[#00687a] uppercase tracking-wider mb-0.5">{n.task_title}</p>
                      )}
                      <p className="text-sm text-slate-700 leading-snug">{n.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
                <p className="text-xs text-slate-500 font-mono truncate">@{username}</p>
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

    {searchDetailId && (
      <TaskDetailModal
        taskId={searchDetailId}
        onClose={() => setSearchDetailId(null)}
        onUpdated={() => setSearchDetailId(null)}
      />
    )}
  </>
  )
}
