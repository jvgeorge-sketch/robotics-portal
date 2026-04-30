import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Task {
  id: string
  title: string
}

interface Props {
  onClose: () => void
}

export default function ReportBlockerModal({ onClose }: Props) {
  const { currentUser } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadTasks() {
      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .neq('status', 'done')
        .order('title')
      setTasks(data || [])
    }
    loadTasks()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !description.trim()) return
    setSaving(true)
    setError('')
    const { error: dbErr } = await supabase.from('blockers').insert({
      task_id: selectedTaskId || null,
      reported_by: currentUser.id,
      description: description.trim(),
    })
    setSaving(false)
    if (dbErr) {
      setError(dbErr.message)
      return
    }
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E3A8A] text-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#F59E0B]">report_problem</span>
            <h2 className="font-display text-lg font-bold">Report a Blocker</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-emerald-500 block mb-3">check_circle</span>
            <p className="font-display font-bold text-slate-900 text-lg">Blocker reported!</p>
            <p className="text-slate-500 text-sm mt-1">The team has been notified.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Task selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Related Task (optional)
              </label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              >
                <option value="">— No specific task —</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Description <span className="text-[#ba1a1a]">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => { setDescription(e.target.value); setError('') }}
                placeholder="Describe what's blocking you or the team..."
                rows={4}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
              />
            </div>

            {error && (
              <div className="bg-[#ffdad6] text-[#93000a] text-sm font-medium px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !description.trim()}
                className="flex-1 py-2.5 bg-[#78350F] text-[#F59E0B] rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving
                  ? <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                  : <span className="material-symbols-outlined text-lg">report_problem</span>
                }
                {saving ? 'Submitting…' : 'Submit Blocker'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
