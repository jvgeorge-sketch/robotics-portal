import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import CreateTaskModal from '../components/CreateTaskModal'
import TaskDetailModal from '../components/TaskDetailModal'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  points_value: number
  estimated_minutes: number | null
  tags: string[]
  assignee_id: string | null
  assignee_name: string
  assignee_initials: string
}

interface Profile { id: string; full_name: string }

type ColumnId = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done'

const COLUMNS: { id: ColumnId; label: string; color: string }[] = [
  { id: 'backlog',      label: 'Backlog',      color: '#94a3b8' },
  { id: 'ready',       label: 'Ready',        color: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress',  color: '#f59e0b' },
  { id: 'review',      label: 'Review',       color: '#8b5cf6' },
  { id: 'done',        label: 'Done',         color: '#10b981' },
]

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-[#ba1a1a]',
  high:     'text-[#eb6905]',
  medium:   'text-slate-500',
  low:      'text-slate-400',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function fmtMins(mins: number | null): string {
  if (!mins) return '—'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`
}

// ── Status Menu ───────────────────────────────────────────────────────────────
function StatusMenu({
  taskId,
  current,
  onMove,
  onClose,
}: {
  taskId: string
  current: string
  onMove: (taskId: string, status: ColumnId) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-44"
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">Move to</p>
      {COLUMNS.map(col => (
        <button
          key={col.id}
          disabled={col.id === current}
          onClick={() => { onMove(taskId, col.id); onClose() }}
          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors
            ${col.id === current
              ? 'bg-slate-50 text-slate-400 cursor-default'
              : 'hover:bg-[#e5eeff] text-slate-700'
            }`}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
          {col.label}
          {col.id === current && <span className="ml-auto text-[10px] font-bold text-slate-400">NOW</span>}
        </button>
      ))}
    </div>
  )
}

// ── Assign Menu ───────────────────────────────────────────────────────────────
function AssignMenu({
  taskId, profiles, onAssign, onClose,
}: {
  taskId: string
  profiles: Profile[]
  onAssign: (taskId: string, profileId: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} className="absolute left-0 top-7 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-52">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">Assign to</p>
      <button
        onClick={() => { onAssign(taskId, null); onClose() }}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#e5eeff] text-slate-500"
      >
        <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 14 }}>person_off</span>
        </div>
        Unassigned
      </button>
      {profiles.map(p => (
        <button
          key={p.id}
          onClick={() => { onAssign(taskId, p.id); onClose() }}
          className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#e5eeff] text-slate-700"
        >
          <div className="w-6 h-6 rounded-full bg-[#1e293b] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
            {p.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <span className="truncate">{p.full_name}</span>
        </button>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TeamHub() {
  const [taskMap, setTaskMap] = useState<Record<ColumnId, Task[]>>({
    backlog: [], ready: [], in_progress: [], review: [], done: [],
  })
  const [loading, setLoading] = useState(true)
  const [activeBlockers, setActiveBlockers] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState<ColumnId>('backlog')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [assignMenuId, setAssignMenuId] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])

  const load = useCallback(async () => {
    const [{ data, error }, { count }, { data: profileData }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, priority, points_value, estimated_minutes, tags, assigned_to(id, full_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('blockers')
        .select('id', { count: 'exact', head: true })
        .is('resolved_at', null),
      supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name'),
    ])
    setProfiles(profileData || [])

    if (error) { setLoading(false); return }

    const rows = (data || []) as any[]
    const map: Record<ColumnId, Task[]> = {
      backlog: [], ready: [], in_progress: [], review: [], done: [],
    }
    for (const row of rows) {
      const col = row.status as ColumnId
      if (!map[col]) continue
      const assignee = row.assigned_to as any
      const name = assignee?.full_name || 'Unassigned'
      map[col].push({
        id: row.id, title: row.title, status: row.status, priority: row.priority,
        points_value: row.points_value, estimated_minutes: row.estimated_minutes,
        tags: row.tags || [], assignee_id: assignee?.id || null,
        assignee_name: name, assignee_initials: initials(name),
      })
    }
    setTaskMap(map)
    setActiveBlockers(count || 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function moveTask(taskId: string, newStatus: ColumnId) {
    setMoving(taskId)

    // Optimistic update — move card immediately in UI
    setTaskMap(prev => {
      const next = { ...prev }
      let moved: Task | undefined
      for (const col of Object.keys(next) as ColumnId[]) {
        const idx = next[col].findIndex(t => t.id === taskId)
        if (idx !== -1) { [moved] = next[col].splice(idx, 1); break }
      }
      if (moved) {
        moved.status = newStatus
        next[newStatus] = [moved, ...next[newStatus]]
      }
      return next
    })

    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'done') updates.completed_at = new Date().toISOString()

    await supabase.from('tasks').update(updates).eq('id', taskId)
    setMoving(null)
  }

  async function assignTask(taskId: string, profileId: string | null) {
    // Optimistic update
    setTaskMap(prev => {
      const next = { ...prev }
      for (const col of Object.keys(next) as ColumnId[]) {
        const task = next[col].find(t => t.id === taskId)
        if (task) {
          const profile = profiles.find(p => p.id === profileId)
          const name = profile?.full_name || 'Unassigned'
          task.assignee_id = profileId
          task.assignee_name = name
          task.assignee_initials = initials(name)
          break
        }
      }
      return { ...next }
    })
    await supabase.from('tasks').update({ assigned_to: profileId }).eq('id', taskId)
  }

  const totalActive = taskMap.backlog.length + taskMap.ready.length +
    taskMap.in_progress.length + taskMap.review.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="material-symbols-outlined text-[#00687a] text-4xl animate-spin">refresh</span>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">ACTIVE TASKS</p>
            <h3 className="font-display text-2xl font-semibold text-[#091426]">{totalActive} open</h3>
          </div>
          <span className="material-symbols-outlined text-[#00687a] text-4xl">task_alt</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">ACTIVE BLOCKERS</p>
            <h3 className={`font-display text-2xl font-semibold ${activeBlockers > 0 ? 'text-[#ba1a1a]' : 'text-slate-900'}`}>
              {String(activeBlockers).padStart(2, '0')} Items
            </h3>
          </div>
          <span className={`material-symbols-outlined text-4xl ${activeBlockers > 0 ? 'text-[#ba1a1a]' : 'text-slate-400'}`}>block</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">DONE THIS SPRINT</p>
            <h3 className="font-display text-2xl font-semibold text-[#091426]">{taskMap.done.length} tasks</h3>
          </div>
          <span className="material-symbols-outlined text-[#10b981] text-4xl">check_circle</span>
        </div>
        <div
          className="bg-[#00687a] p-5 rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
          onClick={() => { setDefaultStatus('backlog'); setShowModal(true) }}
        >
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="material-symbols-outlined text-2xl">add_circle</span>
            <span>Create New Task</span>
          </div>
        </div>
      </div>

      {showModal && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setLoading(true); load() }}
          defaultStatus={defaultStatus}
        />
      )}

      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onUpdated={() => { load(); setDetailTaskId(null) }}
        />
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
          {COLUMNS.map((col) => {
            const tasks = taskMap[col.id]
            return (
              <div key={col.id} className="kanban-col flex flex-col gap-3">
                {/* Column header */}
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <h4 className="font-display text-sm font-bold text-slate-500 uppercase tracking-widest">
                    {col.label} <span className="font-normal opacity-50">({tasks.length})</span>
                  </h4>
                </div>

                <div className="space-y-3">
                  {tasks.length === 0 && (
                    <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                      No tasks
                    </div>
                  )}

                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setDetailTaskId(task.id)}
                      className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer
                        ${task.status === 'done' ? 'opacity-60' : 'hover:border-[#00687a] hover:shadow-md'}
                        ${task.priority === 'critical' ? 'border-l-4 border-l-[#ba1a1a]' : ''}
                        ${task.priority === 'high' ? 'border-t-4 border-t-[#00687a]' : ''}
                        ${moving === task.id ? 'opacity-50 scale-[0.98]' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        {task.tags.length > 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-slate-100 text-slate-600">
                            {task.tags[0]}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-[#e5eeff] text-[#006172] capitalize">
                            {task.priority}
                          </span>
                        )}

                        {/* Menu button */}
                        <div className="relative">
                          {task.status === 'done' ? (
                            <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); setOpenMenuId(prev => prev === task.id ? null : task.id) }}
                              className="text-slate-300 hover:text-[#00687a] transition-colors rounded p-0.5 hover:bg-[#e5eeff]"
                            >
                              <span className="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                          )}
                          {openMenuId === task.id && (
                            <StatusMenu
                              taskId={task.id}
                              current={task.status}
                              onMove={moveTask}
                              onClose={() => setOpenMenuId(null)}
                            />
                          )}
                        </div>
                      </div>

                      <h5 className={`text-sm font-semibold text-[#091426] mb-3 leading-snug ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </h5>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2 relative">
                          <button
                            onClick={e => { e.stopPropagation(); setAssignMenuId(prev => prev === task.id ? null : task.id) }}
                            title={task.assignee_id ? task.assignee_name : 'Click to assign'}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all hover:ring-2 hover:ring-[#00687a] ${
                              task.assignee_id
                                ? 'bg-[#1e293b] text-white'
                                : 'bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#00687a]'
                            }`}
                          >
                            {task.assignee_id
                              ? task.assignee_initials
                              : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>person_add</span>
                            }
                          </button>
                          {assignMenuId === task.id && (
                            <AssignMenu
                              taskId={task.id}
                              profiles={profiles}
                              onAssign={assignTask}
                              onClose={() => setAssignMenuId(null)}
                            />
                          )}
                          <span className={`font-display font-medium capitalize ${PRIORITY_COLOR[task.priority] || 'text-slate-400'}`}>
                            {task.assignee_id ? task.assignee_name.split(' ')[0] : 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>star</span>
                            {task.points_value}pt
                          </span>
                          {task.estimated_minutes && (
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                              {fmtMins(task.estimated_minutes)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add task button per column */}
                  <button
                    onClick={() => { setDefaultStatus(col.id as ColumnId); setShowModal(true) }}
                    className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-[#00687a] hover:text-[#00687a] transition-colors text-sm font-semibold"
                  >
                    + Add Task
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
