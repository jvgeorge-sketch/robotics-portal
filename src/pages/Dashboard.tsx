import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { awardClutchSave } from '../lib/badges'

interface TeamStat {
  id: string; name: string; icon: string; color: string; bg: string
  pct: number; active: number; blocked: number
}
interface BlockerRow { id: string; description: string; reported_at: string; reporter: string }
interface TopProfile { id: string; full_name: string; season_points: number; pts_label: string }
interface FeedItem { id: string; title: string; sub: string; time: string; icon: string; iconBg: string; iconColor: string }

const COLOR_BG: Record<string, string> = {
  '#3b82f6': '#eff6ff', '#10b981': '#ecfdf5',
  '#f59e0b': '#fffbeb', '#8b5cf6': '#f5f3ff',
}

function timeSince(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `${m} MIN AGO`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}H AGO`
  return 'YESTERDAY'
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Dashboard() {
  const { currentUser } = useAuth()
  const [teamStats, setTeamStats] = useState<TeamStat[]>([])
  const [blockers, setBlockers] = useState<BlockerRow[]>([])
  const [topProfiles, setTopProfiles] = useState<TopProfile[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [totalTasks, setTotalTasks] = useState(0)
  const [doneTasks, setDoneTasks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: teams }, { data: tasks }, { data: rawBlockers }, { data: profiles }, { data: recentDone }] =
        await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('tasks').select('id, status, team_id'),
          supabase.from('blockers').select('id, description, reported_at, reported_by(full_name)')
            .is('resolved_at', null).order('reported_at', { ascending: false }).limit(5),
          supabase.from('profiles').select('id, full_name, season_points')
            .order('season_points', { ascending: false }).limit(3),
          supabase.from('tasks').select('id, title, completed_at, assigned_to(full_name)')
            .eq('status', 'done').not('completed_at', 'is', null)
            .order('completed_at', { ascending: false }).limit(4),
        ])

      const t = tasks || []
      setTotalTasks(t.length)
      setDoneTasks(t.filter(x => x.status === 'done').length)

      setTeamStats((teams || []).map(team => {
        const tt = t.filter(x => x.team_id === team.id)
        const done = tt.filter(x => x.status === 'done').length
        return {
          id: team.id, name: team.name, icon: team.icon, color: team.color,
          bg: COLOR_BG[team.color] || '#f8fafc',
          pct: tt.length ? Math.round((done / tt.length) * 100) : 0,
          active: tt.filter(x => x.status !== 'done').length,
          blocked: 0,
        }
      }))

      setBlockers((rawBlockers || []).map(b => ({
        id: b.id,
        description: b.description,
        reported_at: b.reported_at,
        reporter: (b.reported_by as any)?.full_name || 'Unknown',
      })))

      setTopProfiles((profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Member',
        season_points: p.season_points,
        pts_label: `${p.season_points} season pts`,
      })))

      setFeed((recentDone || []).map(task => ({
        id: task.id,
        title: task.title,
        sub: `${(task.assigned_to as any)?.full_name || 'A member'} completed this task`,
        time: timeSince(task.completed_at!),
        icon: 'verified',
        iconBg: 'bg-[#FBBF24]',
        iconColor: 'text-[#1E40AF]',
      })))

      setLoading(false)
    }
    load()
  }, [])

  async function resolveBlocker(blockerId: string) {
    if (!currentUser) return
    setResolvingId(blockerId)
    await supabase
      .from('blockers')
      .update({ resolved_at: new Date().toISOString(), resolved_by: currentUser.id })
      .eq('id', blockerId)
    setBlockers(prev => prev.filter(b => b.id !== blockerId))
    await awardClutchSave(currentUser.id)
    setResolvingId(null)
  }

  const seasonPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const topProfile = topProfiles[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="material-symbols-outlined text-[#1D4ED8] text-4xl animate-spin">refresh</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      {/* Daily Winner Banner */}
      <div className="mb-8 bg-gradient-to-r from-[#1E3A8A] to-[#1D4ED8] text-white p-5 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/10 p-3 rounded-full border border-white/20">
            <span className="material-symbols-filled text-[#FBBF24] text-3xl">workspace_premium</span>
          </div>
          <div>
            <p className="text-[#FBBF24] text-[10px] uppercase tracking-widest font-bold mb-1">Top Performer</p>
            {topProfile
              ? <h2 className="font-display text-xl font-bold">{topProfile.full_name} — {topProfile.season_points} pts</h2>
              : <h2 className="font-display text-xl font-bold">No points logged yet — get building!</h2>
            }
          </div>
        </div>
        <div className="relative z-10 flex gap-6 pr-4">
          <div className="text-center">
            <p className="text-[10px] uppercase opacity-60 font-bold">Tasks Done</p>
            <p className="font-display text-lg font-bold text-[#FBBF24]">{doneTasks}</p>
          </div>
          <div className="w-px bg-white/20 h-10" />
          <div className="text-center">
            <p className="text-[10px] uppercase opacity-60 font-bold">Total Tasks</p>
            <p className="font-display text-lg font-bold">{totalTasks}</p>
          </div>
        </div>
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" fill="none" viewBox="0 0 800 80">
            <path d="M0 40H150L170 20H300L320 60H450L470 40H800" stroke="white" strokeWidth="2" />
            <circle cx="170" cy="20" fill="white" r="4" />
            <circle cx="320" cy="60" fill="white" r="4" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Season progress */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-display text-xl font-semibold text-slate-900">Season Progress</h3>
                <p className="text-sm text-slate-500">2024 Championships Journey</p>
              </div>
              <span className="bg-[#EFF6FF] text-[#1D4ED8] text-xs font-bold px-2 py-1 rounded">PHASE 2</span>
            </div>
            <div className="relative flex items-center justify-center mb-6">
              <div className="w-40 h-40 rounded-full border-[12px] border-slate-100 flex items-center justify-center">
                <div className="text-center">
                  <span className="block font-display text-4xl text-slate-900 leading-none font-bold">{seasonPct}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Complete</span>
                </div>
              </div>
              <div
                className="absolute w-40 h-40 rounded-full border-[12px] border-transparent -rotate-45 pointer-events-none"
                style={{ borderTopColor: '#1D4ED8', borderRightColor: seasonPct > 50 ? '#1D4ED8' : 'transparent' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Tasks Done</p>
                <p className="font-display text-xl font-semibold text-slate-900">{doneTasks}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Tasks</p>
                <p className="font-display text-xl font-semibold text-slate-900">{totalTasks}</p>
              </div>
            </div>
          </div>

          {/* Daily leaderboard */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-display text-lg font-semibold text-slate-900">Top Members</h3>
              <span className="text-xs text-slate-400 uppercase font-bold">By Season Points</span>
            </div>
            {topProfiles.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">No points yet — complete tasks to earn points!</div>
            ) : (
              <div>
                {topProfiles.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-4 px-6 py-4 ${i === 0 ? 'bg-[#EFF6FF]/30' : ''} ${i < topProfiles.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <span className={`font-display font-black w-4 ${i === 0 ? 'text-[#1D4ED8]' : 'text-slate-400'}`}>{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center">
                      <span className="text-white text-xs font-bold font-display">{initials(p.full_name)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{p.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{p.pts_label}</p>
                    </div>
                    <span className={`font-display font-bold ${i === 0 ? 'text-[#1D4ED8]' : 'text-slate-700'}`}>+{p.season_points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right area */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Team cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamStats.length === 0 ? (
              <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                No teams found. Check that the schema was applied in Supabase.
              </div>
            ) : teamStats.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm" style={{ borderTopWidth: 4, borderTopColor: t.color }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: t.bg }}>
                    <span className="material-symbols-outlined text-xl" style={{ color: t.color }}>{t.icon}</span>
                  </div>
                  <span className="text-xs font-display font-bold" style={{ color: t.color }}>{t.pct}% COMPLETE</span>
                </div>
                <h4 className="font-display text-lg font-semibold mb-3">{t.name}</h4>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500">ACTIVE: {t.active}</span>
                  <span className={t.blocked > 0 ? 'text-[#ba1a1a]' : 'text-slate-400'}>BLOCKED: {t.blocked}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Sub-System Health */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-display text-xl font-semibold text-slate-900 mb-6">Sub-System Health</h3>
            {teamStats.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No team data yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {teamStats.map((t) => (
                  <div key={t.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.name}</span>
                      <span className="font-display text-sm font-medium" style={{ color: t.color }}>{t.pct}%</span>
                    </div>
                    <div className="h-3 bg-[#EFF6FF] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {t.active} active tasks
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blockers */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-[#ffdad6]/20 border-b border-[#ffdad6]/30 flex items-center gap-3">
              <span className="material-symbols-filled text-[#ba1a1a] text-xl">warning</span>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Active Blockers ({blockers.length})
              </h3>
            </div>
            {blockers.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-emerald-400 text-3xl block mb-2">check_circle</span>
                <p className="text-slate-500 text-sm font-medium">No active blockers — all clear!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {blockers.map((b) => (
                  <div key={b.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-[#ba1a1a]/10 text-[#ba1a1a] p-2 rounded">
                        <span className="material-symbols-outlined text-lg">block</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{b.description}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                          Reported by {b.reporter} · {timeSince(b.reported_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => resolveBlocker(b.id)}
                      disabled={resolvingId === b.id}
                      className="text-[10px] font-black px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {resolvingId === b.id
                        ? <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                        : <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>
                      }
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="mt-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-display text-xl font-semibold text-slate-900">Live Feed</h3>
            <span className="flex h-2 w-2 rounded-full bg-[#ba1a1a] animate-pulse" />
          </div>
          {feed.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No completed tasks yet. Complete tasks to see activity here.</div>
          ) : (
            <div className="p-6 space-y-6">
              {feed.map((f, i) => (
                <div key={f.id} className="flex gap-4 relative">
                  {i < feed.length - 1 && (
                    <div className="absolute left-[11px] top-7 bottom-[-24px] w-0.5 bg-[#EFF6FF]" />
                  )}
                  <div className={`w-6 h-6 rounded-full ${f.iconBg} flex items-center justify-center flex-shrink-0 z-10`}>
                    <span className={`material-symbols-outlined text-sm ${f.iconColor}`} style={{ fontSize: 14 }}>{f.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{f.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{f.sub}</p>
                    <span className="text-[10px] text-slate-400 block mt-1 uppercase font-display tracking-tight">{f.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4">
            <button className="w-full py-2 text-xs font-bold text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-lg transition-colors border border-dashed border-[#D1D5DB]">
              VIEW ALL ACTIVITY
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
