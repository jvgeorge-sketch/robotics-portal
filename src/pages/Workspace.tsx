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
  speed_demon:    { icon: 'speed',              bg: 'bg-[#FBBF24]/20', color: 'text-[#1D4ED8]',  label: 'Speed Demon'    },
  clutch_save:    { icon: 'handshake',          bg: 'bg-[#FDE68A]',    color: 'text-[#78350F]',  label: 'Clutch Save'    },
  master_builder: { icon: 'construction',       bg: 'bg-[#DBEAFE]',    color: 'text-[#1F2937]',  label: 'Master Builder' },
  bug_hunter:     { icon: 'psychology',         bg: 'bg-[#ffdad6]',    color: 'text-[#93000a]',  label: 'Bug Hunter'     },
  code_ninja:     { icon: 'terminal',           bg: 'bg-[#EFF6FF]',    color: 'text-[#1D4ED8]',  label: 'Code Ninja'     },
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
  if (p === 'high')     return 'text-[#F59E0B] bg-[#FDE68A]'
  if (p === 'medium')   return 'text-[#1D4ED8] bg-[#FBBF24]/20'
  return 'text-slate-500 bg-slate-100'
}

export default function Workspace() {
  const { currentUser: user } = useAuth()
  const profile = user

  const [myTasks, setMyTasks]           = useState<MyTask[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [earnedBadges, setEarnedBadges] = useState<MyBadge[]>([])
  const [loading, setLoading]           = useState(true)

  // Timer
  const [running, setRunning]   = useState(false)
  const [elapsed, setElapsed]   = useState(0)
  const intervalRef = useRef<number | null>(null)

  // Time logging
  const timeLogIdRef = useRef<string | null>(null)
  const elapsedRef   = useRef<number>(0)

  // Keep elapsedRef in sync
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])

  // Blocker modal
  const [showBlocker, setShowBlocker]       = useState(false)
  const [blockerDesc, setBlockerDesc]       = useState('')
  const [savingBlocker, setSavingBlocker]   = useState(false)
  const [blockerError, setBlockerError]     = useState('')
  const [blockerSuccess, setBlockerSuccess] = useState(false)

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

  // Time logging: start/stop log entries
  const activeTaskIdRef = useRef<string | null>(activeTaskId)
  useEffect(() => { activeTaskIdRef.current = activeTaskId }, [activeTaskId])

  useEffect(() => {
    if (!user) return

    async function handleRunningChange() {
      if (running) {
        // Starting a new session — insert time log
        if (elapsedRef.current === 0 && activeTaskIdRef.current) {
          const { data } = await supabase
            .from('time_logs')
            .insert({
              task_id: activeTaskIdRef.current,
              user_id: user!.id,
              started_at: new Date().toISOString(),
            })
            .select('id')
            .single()
          if (data) {
            timeLogIdRef.current = data.id
          }
        }
      } else {
        // Pausing — update time log with stopped_at and duration
        if (timeLogIdRef.current && elapsedRef.current > 0) {
          await supabase
            .from('time_logs')
            .update({
              stopped_at: new Date().toISOString(),
              duration_secs: elapsedRef.current,
            })
            .eq('id', timeLogIdRef.current)
          timeLogIdRef.current = null
        }
      }
    }

    handleRunningChange()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // Reset timer and log id when active task changes
  useEffect(() => {
    setRunning(false)
    setElapsed(0)
    timeLogIdRef.current = null
  }, [activeTaskId])

  const activeTask = myTasks.find(t => t.id === activeTaskId) || null

  async function stopAndLogTime() {
    if (running && timeLogIdRef.current && elapsedRef.current > 0) {
      await supabase
        .from('time_logs')
        .update({
          stopped_at: new Date().toISOString(),
          duration_secs: elapsedRef.current,
        })
        .eq('id', timeLogIdRef.current)
      timeLogIdRef.current = null
    }
    setRunning(false)
  }

  async function submitForReview() {
    if (!activeTask) return
    setMovingTask(true)
    // Stop and log time first if running
    await stopAndLogTime()
    await supabase.from('tasks').update({ status: 'review' }).eq('id', activeTask.id)
    setElapsed(0)
    await load()
    setMovingTask(false)
  }

  async function submitBlocker() {
    if (!activeTask || !user || !blockerDesc.trim()) return
    setSavingBlocker(true)
    setBlockerError('')
    const { error } = await supabase.from('blockers').insert({
      task_id: activeTask.id,
      reported_by: user.id,
      description: blockerDesc.trim(),
    })
    setSavingBlocker(false)
    if (error) {
      setBlockerError('Failed to save blocker. Please try again.')
    } else {
      setBlockerSuccess(true)
      setBlockerDesc('')
      setTimeout(() => {
        setBlockerSuccess(false)
        setShowBlocker(false)
      }, 1500)
    }
  }

  const earnedSet = new Set(earnedBadges.map(b => b.badge_type))
  const sessionH  = Math.floor(elapsed / 3600)
  const sessionM  = Math.floor((elapsed % 3600) / 60)

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#1D4ED8]">Personal Workspace</span>
          <h1 className="font-display text-4xl font-bold text-[#1E3A8A] mt-1">
            {profile?.full_name ? `${profile.full_name.split(' ')[0]}'s Workspace` : 'My Workspace'}
          </h1>
        </div>
        <div className="flex items-center bg-white p-2 rounded-xl shadow-sm border border-[#D1D5DB]">
          <div className="px-4 text-center border-r border-[#D1D5DB]">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">SESSION</span>
            <span className="font-display text-xl font-bold text-[#1E3A8A]">
              {String(sessionH).padStart(2,'0')}:{String(sessionM).padStart(2,'0')}
            </span>
          </div>
          <div className="px-4 text-center">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">MY TASKS</span>
            <span className="font-display text-xl font-bold text-[#1D4ED8]">{myTasks.length}</span>
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
                    onClick={() => setActiveTaskId(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                      t.id === activeTaskId
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#1D4ED8]'
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
            <section className="bg-white rounded-xl border border-[#D1D5DB] p-6 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1D4ED8]" />
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
                  <h2 className="font-display text-2xl font-bold text-[#1E3A8A]">{activeTask.title}</h2>
                  {activeTask.description && (
                    <p className="text-[#4B5563] mt-2 text-sm">{activeTask.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[#1D4ED8] flex-shrink-0">
                  <span className="material-symbols-filled text-xl">bolt</span>
                  <span className="font-display text-lg font-medium">{activeTask.points_value} pts</span>
                </div>
              </div>

              {/* Timer */}
              <div className="bg-[#EFF6FF] rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-[#D1D5DB] mb-5">
                <div className="text-center mb-5">
                  <span className="timer-display text-7xl text-[#1E3A8A] block leading-none">{formatTime(elapsed)}</span>
                  <span className="block text-[#4B5563] text-[10px] uppercase font-bold tracking-wider mt-2">Active Session Time</span>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => setRunning(r => !r)}
                    className="h-14 px-10 bg-[#1D4ED8] text-white rounded-xl font-bold flex items-center gap-3 hover:brightness-110 active:scale-95 transition-all shadow-lg"
                  >
                    <span className="material-symbols-filled text-3xl">{running ? 'pause' : 'play_arrow'}</span>
                    {running ? 'PAUSE' : elapsed > 0 ? 'RESUME' : 'START TIMER'}
                  </button>
                  <button
                    onClick={() => { setElapsed(0); setRunning(false) }}
                    className="h-14 px-8 border-2 border-[#6B7280] text-[#1E3A8A] rounded-xl font-bold flex items-center gap-3 hover:bg-[#EFF6FF] active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">restart_alt</span>
                    RESET
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowBlocker(true)}
                  className="flex items-center justify-center gap-2 py-3.5 bg-[#78350F]/10 text-[#F59E0B] font-bold rounded-lg border border-[#78350F]/20 hover:bg-[#78350F]/20 transition-colors"
                >
                  <span className="material-symbols-outlined">block</span>
                  Report Blocker
                </button>
                <button
                  onClick={submitForReview}
                  disabled={movingTask}
                  className="flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
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
            <div className="bg-white p-6 rounded-xl border border-[#D1D5DB] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#1D4ED8]/10 flex items-center justify-center text-[#1D4ED8]">
                  <span className="material-symbols-outlined">workspace_premium</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">Season Points</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#1E3A8A]">
                  {(profile?.season_points ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#D1D5DB] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#78350F]/10 flex items-center justify-center text-[#F59E0B]">
                  <span className="material-symbols-outlined">leaderboard</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">Total Points</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#1E3A8A]">
                  {(profile?.total_points ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#D1D5DB] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#ba1a1a]/10 flex items-center justify-center text-[#ba1a1a]">
                  <span className="material-symbols-filled">local_fire_department</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">Day Streak</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#1E3A8A]">
                  {profile?.daily_streak ?? 0} Days
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right: badges + queue */}
        <div className="lg:col-span-4 space-y-6">
          {/* Badges */}
          <section className="bg-white rounded-xl border border-[#D1D5DB] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#D1D5DB] flex justify-between items-center">
              <h3 className="font-display text-xl font-semibold text-[#1E3A8A]">My Badges</h3>
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
                    className={`flex flex-col items-center text-center p-3 rounded-lg transition-colors ${earned ? 'hover:bg-[#EFF6FF]' : 'opacity-40 grayscale'}`}
                  >
                    <div className={`w-14 h-14 rounded-full ${meta.bg} flex items-center justify-center mb-2 shadow-inner`}>
                      <span className={`material-symbols-filled text-2xl ${meta.color}`}>{meta.icon}</span>
                    </div>
                    <span className="font-bold text-xs font-display text-[#1E3A8A]">{meta.label}</span>
                    <span className="text-[10px] text-[#4B5563]">{earned ? 'Earned' : 'Locked'}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Task queue */}
          <section className="bg-white rounded-xl border border-[#D1D5DB] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#D1D5DB]">
              <h3 className="font-display text-xl font-semibold text-[#1E3A8A]">My Queue</h3>
            </div>
            {myTasks.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">No tasks assigned yet.</p>
            ) : (
              <div className="divide-y divide-[#D1D5DB]">
                {myTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTaskId(t.id)}
                    className={`w-full p-4 hover:bg-[#EFF6FF] transition-colors flex gap-3 text-left ${t.id === activeTaskId ? 'bg-[#EFF6FF]' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                      t.status === 'in_progress' ? 'bg-amber-100' : 'bg-[#EFF6FF]'
                    }`}>
                      <span className={`material-symbols-outlined text-xl ${
                        t.status === 'in_progress' ? 'text-amber-600' : 'text-[#4B5563]'
                      }`}>{t.status === 'in_progress' ? 'play_circle' : 'radio_button_unchecked'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm text-[#1E3A8A] leading-tight truncate">{t.title}</h4>
                        <span className="font-display text-xs font-bold text-[#1D4ED8] flex-shrink-0">{t.points_value}pt</span>
                      </div>
                      <p className="text-xs text-[#4B5563] mt-0.5 capitalize">{t.status.replace('_',' ')} · {t.priority} priority</p>
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
            <h2 className="font-display text-xl font-bold text-[#1E3A8A] mb-1">Report a Blocker</h2>
            <p className="text-sm text-slate-500 mb-4">
              Task: <span className="font-semibold text-slate-700">{activeTask?.title}</span>
            </p>
            {blockerSuccess ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-5xl text-emerald-500 block mb-2">check_circle</span>
                <p className="font-bold text-slate-900">Blocker reported!</p>
              </div>
            ) : (
              <>
                <textarea
                  value={blockerDesc}
                  onChange={e => { setBlockerDesc(e.target.value); setBlockerError('') }}
                  placeholder="Describe what's blocking you..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none mb-2"
                />
                {blockerError && (
                  <p className="text-sm text-[#ba1a1a] mb-3">{blockerError}</p>
                )}
                <div className="flex gap-3 mt-2">
                  <button onClick={() => { setShowBlocker(false); setBlockerError('') }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
