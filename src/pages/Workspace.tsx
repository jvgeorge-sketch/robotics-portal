import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface MyTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  points_value: number
  estimated_minutes: number | null
  tags: string[]
  team_name: string | null
}

interface MyBadge {
  id: string
  badge_type: string
  earned_at: string
}

const BADGE_META: Record<string, { icon: string; bg: string; color: string; label: string }> = {
  speed_demon:    { icon: 'speed',              bg: 'bg-[#57dffe]/20', color: 'text-[#00687a]',  label: 'Speed Demon'    },
  clutch_save:    { icon: 'handshake',          bg: 'bg-[#ffdbca]',    color: 'text-[#341100]',  label: 'Clutch Save'    },
  master_builder: { icon: 'construction',       bg: 'bg-[#d3e4fe]',    color: 'text-[#111c2d]',  label: 'Master Builder' },
  bug_hunter:     { icon: 'psychology',         bg: 'bg-[#ffdad6]',    color: 'text-[#93000a]',  label: 'Bug Hunter'     },
  code_ninja:     { icon: 'terminal',           bg: 'bg-[#e5eeff]',    color: 'text-[#00687a]',  label: 'Code Ninja'     },
  power_surge:    { icon: 'bolt',               bg: 'bg-[#fffbeb]',    color: 'text-[#b45309]',  label: 'Power Surge'    },
  team_player:    { icon: 'groups',             bg: 'bg-[#ecfdf5]',    color: 'text-[#065f46]',  label: 'Team Player'    },
  daily_winner:   { icon: 'workspace_premium',  bg: 'bg-[#fef3c7]',    color: 'text-[#92400e]',  label: 'Daily Winner'   },
}

const ALL_BADGES = Object.keys(BADGE_META)

function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function priorityColor(p: string) {
  if (p === 'critical') return 'text-[#ba1a1a] bg-[#ffdad6]'
  if (p === 'high')     return 'text-[#eb6905] bg-[#ffdbca]'
  if (p === 'medium')   return 'text-[#00687a] bg-[#57dffe]/20'
  return 'text-slate-500 bg-slate-100'
}

export default function Workspace() {
  const { user, profile } = useAuth()

  const [myTasks, setMyTasks]           = useState<MyTask[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [earnedBadges, setEarnedBadges] = useState<MyBadge[]>([])
  const [loading, setLoading]           = useState(true)

  // Timer
  const [running, setRunning]   = useState(false)
  const [elapsed, setElapsed]   = useState(0)
  const intervalRef = useRef<number | null>(null)

  // Blocker modal
  const [showBlocker, setShowBlocker]       = useState(false)
  const [blockerDesc, setBlockerDesc]       = useState('')
  const [savingBlocker, setSavingBlocker]   = useState(false)

  // Status actions
  const [movingTask, setMovingTask] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const [{ data: tasks }, { data: badges }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, description, status, priority, points_value, estimated_minutes, tags, team_id(name)')
        .eq('assigned_to', user.id)
        .neq('status', 'done')
        .order('created_at', { ascending: false }),
      supabase
        .from('badges')
        .select('id, badge_type, earned_at')
        .eq('user_id', user.id),
    ])

    const mapped: MyTask[] = ((tasks || []) as any[]).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      points_value: t.points_value,
      estimated_minutes: t.estimated_minutes,
      tags: t.tags || [],
      team_name: t.team_id?.name || null,
    }))

    setMyTasks(mapped)
    setEarnedBadges(badges || [])

    // Auto-select the first in_progress task, otherwise first task
    const inProgress = mapped.find(t => t.status === 'in_progress')
    setActiveTaskId(prev => prev ?? (inProgress?.id || mapped[0]?.id || null))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Timer tick
  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const activeTask = myTasks.find(t => t.id === activeTaskId) || null

  async function submitForReview() {
    if (!activeTask) return
    setMovingTask(true)
    await supabase.from('tasks').update({ status: 'review' }).eq('id', activeTask.id)
    setRunning(false)
    setElapsed(0)
    await load()
    setMovingTask(false)
  }

  async function submitBlocker() {
    if (!activeTask || !user || !blockerDesc.trim()) return
    setSavingBlocker(true)
    await supabase.from('blockers').insert({
      task_id: activeTask.id,
      reported_by: user.id,
      description: blockerDesc.trim(),
    })
    setSavingBlocker(false)
    setBlockerDesc('')
    setShowBlocker(false)
  }

  const earnedSet = new Set(earnedBadges.map(b => b.badge_type))
  const sessionH  = Math.floor(elapsed / 3600)
  const sessionM  = Math.floor((elapsed % 3600) / 60)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="material-symbols-outlined text-[#00687a] text-4xl animate-spin">refresh</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00687a]">Personal Workspace</span>
          <h1 className="font-display text-4xl font-bold text-[#091426] mt-1">
            {profile?.full_name ? `${profile.full_name.split(' ')[0]}'s Workspace` : 'My Workspace'}
          </h1>
        </div>
        <div className="flex items-center bg-white p-2 rounded-xl shadow-sm border border-[#c5c6cd]">
          <div className="px-4 text-center border-r border-[#c5c6cd]">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">SESSION</span>
            <span className="font-display text-xl font-bold text-[#091426]">
              {String(sessionH).padStart(2,'0')}:{String(sessionM).padStart(2,'0')}
            </span>
          </div>
          <div className="px-4 text-center">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">MY TASKS</span>
            <span className="font-display text-xl font-bold text-[#00687a]">{myTasks.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: active task + stats */}
        <div className="lg:col-span-8 space-y-6">

          {/* Task picker — if multiple tasks */}
          {myTasks.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Your Assigned Tasks — click to focus</p>
              <div className="flex flex-wrap gap-2">
                {myTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTaskId(t.id); setRunning(false); setElapsed(0) }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                      t.id === activeTaskId
                        ? 'bg-[#091426] text-white border-[#091426]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#00687a]'
                    }`}
                  >
                    {t.title.length > 30 ? t.title.slice(0, 30) + '…' : t.title}
                    <span className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      t.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>{t.status.replace('_',' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Task Card */}
          {activeTask ? (
            <section className="bg-white rounded-xl border border-[#c5c6cd] p-6 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00687a]" />
              <div className="flex justify-between items-start mb-5">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider capitalize ${priorityColor(activeTask.priority)}`}>
                      {activeTask.priority}
                    </span>
                    {activeTask.team_name && (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {activeTask.team_name}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      activeTask.status === 'in_progress' ? 'bg-amber-100 text-amber-700'
                      : activeTask.status === 'review' ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-500'
                    }`}>{activeTask.status.replace('_',' ')}</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#091426]">{activeTask.title}</h2>
                  {activeTask.description && (
                    <p className="text-[#45474c] mt-2 text-sm">{activeTask.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[#00687a] flex-shrink-0">
                  <span className="material-symbols-filled text-xl">bolt</span>
                  <span className="font-display text-lg font-medium">{activeTask.points_value} pts</span>
                </div>
              </div>

              {/* Timer */}
              <div className="bg-[#eff4ff] rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-[#c5c6cd] mb-5">
                <div className="text-center mb-5">
                  <span className="timer-display text-7xl text-[#091426] block leading-none">{formatTime(elapsed)}</span>
                  <span className="block text-[#45474c] text-[10px] uppercase font-bold tracking-wider mt-2">Active Session Time</span>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => setRunning(r => !r)}
                    className="h-14 px-10 bg-[#00687a] text-white rounded-xl font-bold flex items-center gap-3 hover:brightness-110 active:scale-95 transition-all shadow-lg"
                  >
                    <span className="material-symbols-filled text-3xl">{running ? 'pause' : 'play_arrow'}</span>
                    {running ? 'PAUSE' : elapsed > 0 ? 'RESUME' : 'START TIMER'}
                  </button>
                  <button
                    onClick={() => { setElapsed(0); setRunning(false) }}
                    className="h-14 px-8 border-2 border-[#75777d] text-[#091426] rounded-xl font-bold flex items-center gap-3 hover:bg-[#e5eeff] active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">restart_alt</span>
                    RESET
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowBlocker(true)}
                  className="flex items-center justify-center gap-2 py-3.5 bg-[#481b00]/10 text-[#eb6905] font-bold rounded-lg border border-[#481b00]/20 hover:bg-[#481b00]/20 transition-colors"
                >
                  <span className="material-symbols-outlined">block</span>
                  Report Blocker
                </button>
                <button
                  onClick={submitForReview}
                  disabled={movingTask}
                  className="flex items-center justify-center gap-2 py-3.5 bg-[#091426] text-white font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {movingTask
                    ? <span className="material-symbols-outlined animate-spin">refresh</span>
                    : <span className="material-symbols-outlined">check_circle</span>
                  }
                  Submit for Review
                </button>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-slate-300 text-6xl block mb-4">assignment_ind</span>
              <h2 className="font-display text-xl font-semibold text-slate-600 mb-2">No tasks assigned to you yet</h2>
              <p className="text-slate-400 text-sm">Claim a task from the Open Pool or ask your PM to assign one.</p>
            </section>
          )}

          {/* Personal Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-xl border border-[#c5c6cd] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#00687a]/10 flex items-center justify-center text-[#00687a]">
                  <span className="material-symbols-outlined">workspace_premium</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#45474c]">Season Points</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#091426]">
                  {(profile?.season_points ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#c5c6cd] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#481b00]/10 flex items-center justify-center text-[#eb6905]">
                  <span className="material-symbols-outlined">leaderboard</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#45474c]">Total Points</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#091426]">
                  {(profile?.total_points ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#c5c6cd] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#ba1a1a]/10 flex items-center justify-center text-[#ba1a1a]">
                  <span className="material-symbols-filled">local_fire_department</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#45474c]">Day Streak</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#091426]">
                  {profile?.daily_streak ?? 0} Days
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right: badges + queue */}
        <div className="lg:col-span-4 space-y-6">
          {/* Badges */}
          <section className="bg-white rounded-xl border border-[#c5c6cd] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#c5c6cd] flex justify-between items-center">
              <h3 className="font-display text-xl font-semibold text-[#091426]">My Badges</h3>
              <span className="text-xs text-slate-400 font-bold">{earnedBadges.length} / {ALL_BADGES.length}</span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {ALL_BADGES.map(bt => {
                const meta    = BADGE_META[bt]
                const earned  = earnedSet.has(bt)
                return (
                  <div
                    key={bt}
                    title={earned ? `Earned ${new Date(earnedBadges.find(b => b.badge_type === bt)!.earned_at).toLocaleDateString()}` : 'Not yet earned'}
                    className={`flex flex-col items-center text-center p-3 rounded-lg transition-colors ${earned ? 'hover:bg-[#e5eeff]' : 'opacity-40 grayscale'}`}
                  >
                    <div className={`w-14 h-14 rounded-full ${meta.bg} flex items-center justify-center mb-2 shadow-inner`}>
                      <span className={`material-symbols-filled text-2xl ${meta.color}`}>{meta.icon}</span>
                    </div>
                    <span className="font-bold text-xs font-display text-[#091426]">{meta.label}</span>
                    <span className="text-[10px] text-[#45474c]">{earned ? 'Earned' : 'Locked'}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Task queue */}
          <section className="bg-white rounded-xl border border-[#c5c6cd] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#c5c6cd]">
              <h3 className="font-display text-xl font-semibold text-[#091426]">My Queue</h3>
            </div>
            {myTasks.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">No tasks assigned yet.</p>
            ) : (
              <div className="divide-y divide-[#c5c6cd]">
                {myTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTaskId(t.id); setRunning(false); setElapsed(0) }}
                    className={`w-full p-4 hover:bg-[#eff4ff] transition-colors flex gap-3 text-left ${t.id === activeTaskId ? 'bg-[#e5eeff]' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                      t.status === 'in_progress' ? 'bg-amber-100' : 'bg-[#e5eeff]'
                    }`}>
                      <span className={`material-symbols-outlined text-xl ${
                        t.status === 'in_progress' ? 'text-amber-600' : 'text-[#45474c]'
                      }`}>{t.status === 'in_progress' ? 'play_circle' : 'radio_button_unchecked'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm text-[#091426] leading-tight truncate">{t.title}</h4>
                        <span className="font-display text-xs font-bold text-[#00687a] flex-shrink-0">{t.points_value}pt</span>
                      </div>
                      <p className="text-xs text-[#45474c] mt-0.5 capitalize">{t.status.replace('_',' ')} · {t.priority} priority</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Blocker Modal */}
      {showBlocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowBlocker(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-xl font-bold text-[#091426] mb-1">Report a Blocker</h2>
            <p className="text-sm text-slate-500 mb-4">
              Task: <span className="font-semibold text-slate-700">{activeTask?.title}</span>
            </p>
            <textarea
              value={blockerDesc}
              onChange={e => setBlockerDesc(e.target.value)}
              placeholder="Describe what's blocking you..."
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowBlocker(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={submitBlocker}
                disabled={savingBlocker || !blockerDesc.trim()}
                className="flex-1 py-2.5 bg-[#ba1a1a] text-white rounded-xl text-sm font-bold hover:bg-[#93000a] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingBlocker
                  ? <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                  : <span className="material-symbols-outlined text-lg">block</span>
                }
                Submit Blocker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
