import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TaskDetailModal from '../components/TaskDetailModal'

interface PoolTask {
  id: string
  title: string
  description: string | null
  tags: string[]
  estimated_minutes: number | null
  points_value: number
  priority: string
  claimed_at: string | null
  assigned_to: string | null
}

interface ClaimEvent {
  initials: string
  name: string
  task_title: string
  claimed_at: string
}

function fmtMins(mins: number | null): string {
  if (!mins) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function OpenPool() {
  const { currentUser: user } = useAuth()
  const [tasks, setTasks] = useState<PoolTask[]>([])
  const [claimEvents, setClaimEvents] = useState<ClaimEvent[]>([])
  const [activeFilter, setActiveFilter] = useState('All Tasks')
  const [claiming, setClaiming] = useState<string | null>(null)
  const [justClaimed, setJustClaimed] = useState<string[]>([])
  const [myDoneToday, setMyDoneToday] = useState(0)
  const [myXpToday, setMyXpToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      { data: poolTasks },
      { data: recentClaims },
      { data: myTodayTasks },
    ] = await Promise.all([
      // Open pool = team_id is null, not yet done
      supabase
        .from('tasks')
        .select('id, title, description, tags, estimated_minutes, points_value, priority, claimed_at, assigned_to')
        .is('team_id', null)
        .neq('status', 'done')
        .order('created_at', { ascending: false }),

      // Recent claims for the live feed
      supabase
        .from('tasks')
        .select('title, claimed_at, assigned_to(full_name)')
        .not('claimed_at', 'is', null)
        .order('claimed_at', { ascending: false })
        .limit(5),

      // My completed tasks today
      user
        ? supabase
            .from('tasks')
            .select('points_value')
            .eq('assigned_to', user.id)
            .eq('status', 'done')
            .gte('completed_at', today.toISOString())
        : Promise.resolve({ data: [] }),
    ])

    setTasks((poolTasks || []) as PoolTask[])

    setClaimEvents((recentClaims || []).map((r: any) => ({
      initials: initials(r.assigned_to?.full_name || '?'),
      name: r.assigned_to?.full_name || 'Someone',
      task_title: r.title,
      claimed_at: r.claimed_at,
    })))

    const done = (myTodayTasks || [])
    setMyDoneToday(done.length)
    setMyXpToday(done.reduce((s: number, t: any) => s + (t.points_value || 0), 0))

    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Derive filter categories from the first tag of each task
  const categories = ['All Tasks', ...Array.from(new Set(
    tasks.flatMap(t => t.tags.slice(0, 1)).filter(Boolean)
  ))]

  const filtered = activeFilter === 'All Tasks'
    ? tasks
    : tasks.filter(t => t.tags.includes(activeFilter))

  async function claimTask(taskId: string) {
    if (!user) return
    setClaiming(taskId)

    const { error } = await supabase
      .from('tasks')
      .update({
        assigned_to: user.id,
        claimed_at: new Date().toISOString(),
        status: 'in_progress',
      })
      .eq('id', taskId)

    setClaiming(null)
    if (!error) {
      setJustClaimed(prev => [...prev, taskId])
      // Remove from pool list after a beat
      setTimeout(() => {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setJustClaimed(prev => prev.filter(id => id !== taskId))
      }, 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="material-symbols-outlined text-[#1D4ED8] text-4xl animate-spin">refresh</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onUpdated={() => { load(); setDetailTaskId(null) }}
        />
      )}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main task list */}
        <div className="flex-1 space-y-5">
          {/* Filter bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {categories.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeFilter === f ? 'bg-[#1D4ED8] text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center text-[#1D4ED8] font-display text-sm font-medium">
              <span className="material-symbols-outlined text-lg mr-1">bolt</span>
              {filtered.length} Pool Tasks Active
            </div>
          </div>

          {/* Task cards */}
          {filtered.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-slate-300 text-5xl block mb-3">inbox</span>
              <p className="text-slate-500 font-medium">No open pool tasks right now.</p>
              <p className="text-slate-400 text-sm mt-1">Create tasks in Team Hub and leave the team unassigned to add them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((task) => {
                const isClaiming = claiming === task.id
                const wasClaimed = justClaimed.includes(task.id)
                const isMyTask = task.assigned_to === user?.id

                return (
                  <div
                    key={task.id}
                    onClick={() => setDetailTaskId(task.id)}
                    className={`bg-white border-t-4 border-x border-b border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#1D4ED8] transition-all cursor-pointer ${
                      task.priority === 'critical' ? 'border-t-[#ba1a1a]'
                      : task.priority === 'high'   ? 'border-t-[#F59E0B]'
                      : 'border-t-[#1D4ED8]'
                    } ${wasClaimed ? 'opacity-75 scale-[0.99]' : ''}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2 flex-wrap">
                          {task.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="bg-[#FBBF24]/10 text-[#1D4ED8] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                          {task.tags.length === 0 && (
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider capitalize">
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.priority === 'critical' && (
                          <div className="flex items-center text-[#ba1a1a] font-display">
                            <span className="material-symbols-outlined text-sm mr-0.5" style={{ fontSize: 14 }}>warning</span>
                            <span className="text-xs font-bold">CRITICAL</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">{task.title}</h3>
                      {task.description && (
                        <p className="text-slate-500 text-sm mb-5">{task.description}</p>
                      )}
                    </div>
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-slate-500 gap-1">
                          <span className="material-symbols-outlined text-lg">schedule</span>
                          Est. {fmtMins(task.estimated_minutes)}
                        </div>
                        <div className="font-display font-bold text-slate-900">{task.points_value} XP</div>
                      </div>
                      {wasClaimed || isMyTask ? (
                        <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-sm text-center border border-emerald-200">
                          ✓ Claimed — Check your Workspace
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); claimTask(task.id) }}
                          disabled={!!isClaiming}
                          className="w-full py-2.5 bg-[#1D4ED8] text-white rounded-lg font-bold hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {isClaiming
                            ? <><span className="material-symbols-outlined text-lg animate-spin">refresh</span> Claiming…</>
                            : <><span className="material-symbols-outlined text-lg">add_task</span> Claim Task</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 space-y-5">
          {/* Pool Rules */}
          <div className="bg-[#1E3A8A] p-6 rounded-xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <span className="material-symbols-outlined" style={{ fontSize: 80 }}>timer</span>
            </div>
            <h4 className="font-display text-lg font-semibold mb-4 flex items-center gap-2 relative z-10">
              <span className="material-symbols-outlined text-[#FBBF24] text-xl">info</span>
              Pool Rules
            </h4>
            <div className="space-y-3 relative z-10">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-[10px] font-bold text-[#FDE68A] uppercase tracking-widest mb-1">Claim to Own</p>
                <p className="text-sm text-slate-300">Claiming a task moves it to your Workspace as In Progress immediately.</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-[10px] font-bold text-[#FDE68A] uppercase tracking-widest mb-1">XP on Completion</p>
                <p className="text-sm text-slate-300">Points are awarded to your profile when a PM marks the task done.</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-[10px] font-bold text-[#FDE68A] uppercase tracking-widest mb-1">Open to Everyone</p>
                <p className="text-sm text-slate-300">Any team member can claim Open Pool tasks — no team assignment required.</p>
              </div>
            </div>
          </div>

          {/* Live Claims */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-display text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Claims
            </h4>
            {claimEvents.length === 0 ? (
              <p className="text-slate-400 text-sm">No claims yet today.</p>
            ) : (
              <div className="space-y-3">
                {claimEvents.map((c, i) => (
                  <div key={i} className="flex items-start text-xs gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[10px] font-bold text-[#1E3A8A] flex-shrink-0 mt-0.5">
                      {c.initials}
                    </div>
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">{c.name}</span> claimed "{c.task_title}"
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your Stats Today */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-display text-sm font-bold text-slate-900 mb-4">Your Stats Today</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Tasks Done</p>
                <p className="font-display text-2xl font-bold text-[#1E3A8A]">{myDoneToday}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">XP Earned</p>
                <p className="font-display text-2xl font-bold text-[#1D4ED8]">{myXpToday}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Claimed Now</p>
                <p className="font-display text-2xl font-bold text-[#1E3A8A]">{justClaimed.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Pool Size</p>
                <p className="font-display text-2xl font-bold text-[#F59E0B]">{tasks.length}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
