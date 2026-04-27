import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Team } from '../lib/database.types'

interface TaskDetail {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  points_value: number
  estimated_minutes: number | null
  tags: string[]
  team_id: string | null
  assigned_to: string | null
  created_at: string
  assignee_name?: string
  team_name?: string
}

interface Profile { id: string; full_name: string }

interface Props {
  taskId: string
  onClose: () => void
  onUpdated: () => void
}

const STATUSES  = ['backlog','ready','in_progress','review','done'] as const
const PRIORITIES = ['low','medium','high','critical'] as const

const STATUS_COLOR: Record<string, string> = {
  backlog:     'bg-slate-100 text-slate-600',
  ready:       'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  review:      'bg-purple-100 text-purple-700',
  done:        'bg-emerald-100 text-emerald-700',
}
const PRIORITY_COLOR: Record<string, string> = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-[#57dffe]/20 text-[#006172]',
  high:     'bg-[#ffdbca] text-[#341100]',
  critical: 'bg-[#ffdad6] text-[#93000a]',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TaskDetailModal({ taskId, onClose, onUpdated }: Props) {
  const [task, setTask]       = useState<TaskDetail | null>(null)
  const [teams, setTeams]     = useState<Team[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // editable fields
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [status, setStatus]       = useState('')
  const [priority, setPriority]   = useState('')
  const [points, setPoints]       = useState(50)
  const [estMins, setEstMins]     = useState<number | ''>('')
  const [teamId, setTeamId]       = useState<string>('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [tagInput, setTagInput]   = useState('')
  const [tags, setTags]           = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: teamsData }, { data: profilesData }] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, assigned_to(full_name), team_id(name)')
          .eq('id', taskId)
          .single(),
        supabase.from('teams').select('*'),
        supabase.from('profiles').select('id, full_name').order('full_name'),
      ])

      if (t) {
        const raw = t as any
        const detail: TaskDetail = {
          id: raw.id, title: raw.title, description: raw.description,
          status: raw.status, priority: raw.priority, points_value: raw.points_value,
          estimated_minutes: raw.estimated_minutes, tags: raw.tags || [],
          team_id: raw.team_id?.id || null, assigned_to: raw.assigned_to?.id || null,
          created_at: raw.created_at,
          assignee_name: raw.assigned_to?.full_name,
          team_name: raw.team_id?.name,
        }
        setTask(detail)
        setTitle(detail.title)
        setDesc(detail.description || '')
        setStatus(detail.status)
        setPriority(detail.priority)
        setPoints(detail.points_value)
        setEstMins(detail.estimated_minutes ?? '')
        setTeamId(detail.team_id || '')
        setAssignedTo(detail.assigned_to || '')
        setTags(detail.tags)
      }
      setTeams(teamsData || [])
      setProfiles(profilesData || [])
    }
    load()
  }, [taskId])

  async function save() {
    if (!task) return
    setSaving(true)
    const { error } = await supabase.from('tasks').update({
      title: title.trim(),
      description: desc.trim() || null,
      status,
      priority,
      points_value: points,
      estimated_minutes: estMins === '' ? null : Number(estMins),
      team_id: teamId || null,
      assigned_to: assignedTo || null,
      tags,
      ...(status === 'done' && task.status !== 'done' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', task.id)
    setSaving(false)
    if (!error) { setEditing(false); onUpdated(); }
  }

  async function deleteTask() {
    if (!task) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setDeleting(false)
    onUpdated()
    onClose()
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim().replace(/,/g, '')
      if (t && !tags.includes(t)) setTags(p => [...p, t])
      setTagInput('')
    }
  }

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl p-8">
          <span className="material-symbols-outlined text-[#00687a] text-4xl animate-spin">refresh</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#091426] text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#57dffe]">task_alt</span>
            <span className="font-display font-bold text-lg truncate max-w-md">{task.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
              >
                <span className="material-symbols-outlined text-base">edit</span> Edit
              </button>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-2">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {editing ? (
            <>
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20 resize-none" />
              </div>

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button key={s} type="button" onClick={() => setStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all ${status === s ? 'bg-[#091426] text-white border-[#091426]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITIES.map(p => (
                      <button key={p} type="button" onClick={() => setPriority(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all ${priority === p ? 'bg-[#091426] text-white border-[#091426]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team + Assignee */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Team</label>
                  <select value={teamId} onChange={e => setTeamId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#00687a]">
                    <option value="">Open Pool</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assignee</label>
                  <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#00687a]">
                    <option value="">Unassigned</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Points + Est */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Points</label>
                  <input type="number" min={1} value={points} onChange={e => setPoints(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Est. Minutes</label>
                  <input type="number" min={1} value={estMins} placeholder="—"
                    onChange={e => setEstMins(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a]" />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-[#e5eeff] text-[#006172] text-xs font-bold px-2 py-1 rounded-lg">
                      {tag}
                      <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                      </button>
                    </span>
                  ))}
                </div>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                  placeholder="Type a tag and press Enter"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a]" />
              </div>
            </>
          ) : (
            <>
              {/* View mode */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${STATUS_COLOR[task.status] || 'bg-slate-100 text-slate-600'}`}>
                  {task.status.replace('_',' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${PRIORITY_COLOR[task.priority] || 'bg-slate-100 text-slate-600'}`}>
                  {task.priority} priority
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#e5eeff] text-[#006172]">
                  {task.points_value} pts
                </span>
                {task.estimated_minutes && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                    ~{task.estimated_minutes}m
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                  {task.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Team</p>
                  <p className="font-semibold text-slate-800">{task.team_name || 'Open Pool'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assignee</p>
                  <p className="font-semibold text-slate-800">{task.assignee_name || 'Unassigned'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Created</p>
                  <p className="font-semibold text-slate-800">{fmtDate(task.created_at)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.length > 0
                      ? task.tags.map(t => <span key={t} className="bg-[#e5eeff] text-[#006172] text-[10px] font-bold px-2 py-0.5 rounded">{t}</span>)
                      : <span className="text-slate-400 text-xs">None</span>
                    }
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Delete zone */}
          {!editing && (
            <div className="border-t border-slate-100 pt-4">
              {confirmDelete ? (
                <div className="bg-[#ffdad6] rounded-xl p-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#93000a]">Delete this task permanently?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">
                      Cancel
                    </button>
                    <button onClick={deleteTask} disabled={deleting}
                      className="px-3 py-1.5 bg-[#ba1a1a] text-white rounded-lg text-sm font-bold hover:bg-[#93000a] disabled:opacity-50">
                      {deleting ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="text-xs font-bold text-slate-400 hover:text-[#ba1a1a] transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  Delete task
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {editing && (
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 bg-[#00687a] text-white rounded-xl text-sm font-bold hover:bg-[#005566] disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><span className="material-symbols-outlined animate-spin text-lg">refresh</span>Saving…</> : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
