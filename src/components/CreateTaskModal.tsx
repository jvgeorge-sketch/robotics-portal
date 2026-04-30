import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Team } from '../lib/database.types'

interface Props {
  onClose: () => void
  onCreated: () => void
  defaultStatus?: string
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
const STATUSES  = ['backlog', 'ready', 'in_progress', 'review'] as const

export default function CreateTaskModal({ onClose, onCreated, defaultStatus }: Props) {
  const { currentUser } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [priority, setPriority]     = useState<typeof PRIORITIES[number]>('medium')
  const [status, setStatus]         = useState<typeof STATUSES[number]>((defaultStatus as typeof STATUSES[number]) || 'backlog')
  const [teamId, setTeamId]         = useState<string>('')
  const [points, setPoints]         = useState(50)
  const [estMins, setEstMins]       = useState<number | ''>('')
  const [tagInput, setTagInput]     = useState('')
  const [tags, setTags]             = useState<string[]>([])

  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => setTeams(data || []))
  }, [])

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim().replace(/,/g, '')
      if (t && !tags.includes(t)) setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!currentUser) { setError('Not signed in'); return }

    setSaving(true)
    setError('')

    const { error: dbErr } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      team_id: teamId || null,
      points_value: points,
      estimated_minutes: estMins === '' ? null : Number(estMins),
      tags,
      created_by: currentUser.id,
    })

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E3A8A] text-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FBBF24]">add_task</span>
            <h2 className="font-display text-lg font-bold">Create New Task</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Calibrate encoder offsets"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Optional details about this task..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${
                      priority === p
                        ? p === 'critical' ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                          : p === 'high'   ? 'bg-[#F59E0B] text-white border-[#F59E0B]'
                          : p === 'medium' ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                          : 'bg-slate-500 text-white border-slate-500'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start In</label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${
                      status === s ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}>{s.replace('_', ' ')}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Team */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign to Team</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 bg-white">
              <option value="">Open Pool (any team)</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Points + Est. Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Points Value</label>
              <input type="number" min={1} max={1000} value={points} onChange={e => setPoints(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Est. Minutes</label>
              <input type="number" min={1} placeholder="e.g. 120" value={estMins}
                onChange={e => setEstMins(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-[#EFF6FF] text-[#1E40AF] text-xs font-bold px-2 py-1 rounded-lg">
                  {tag}
                  <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))} className="hover:text-[#ba1a1a]">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                  </button>
                </span>
              ))}
            </div>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="Type a tag and press Enter"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20" />
          </div>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] text-sm font-medium px-4 py-2.5 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving
                ? <><span className="material-symbols-outlined text-lg animate-spin">refresh</span>Saving…</>
                : <><span className="material-symbols-outlined text-lg">add_task</span>Create Task</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
