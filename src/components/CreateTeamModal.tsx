import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const PRESET_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6',
  '#ef4444','#ec4899','#14b8a6','#f97316',
  '#00687a','#6366f1',
]

const PRESET_ICONS = [
  'precision_manufacturing','code','bolt','draw','groups',
  'science','settings','terminal','engineering','memory',
  'rocket_launch','build','hub','biotech','sensors',
]

export default function CreateTeamModal({ onClose, onCreated }: Props) {
  const [name, setName]         = useState('')
  const [desc, setDesc]         = useState('')
  const [color, setColor]       = useState('#00687a')
  const [icon, setIcon]         = useState('groups')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Team name is required'); return }
    setSaving(true)
    setError('')
    const { error: dbErr } = await supabase.from('teams').insert({
      name: name.trim(),
      description: desc.trim() || null,
      color,
      icon,
    })
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#091426] text-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#57dffe]">group_add</span>
            <h2 className="font-display text-lg font-bold">Create New Team</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center border-4 border-white shadow-md" style={{ backgroundColor: color + '20' }}>
              <span className="material-symbols-outlined text-3xl" style={{ color }}>{icon}</span>
            </div>
            <div>
              <p className="font-display font-bold text-slate-900 text-lg">{name || 'Team Name'}</p>
              <p className="text-sm text-slate-500">{desc || 'No description yet'}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Team Name <span className="text-[#ba1a1a]">*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mechanical Design"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this team work on?"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00687a] focus:ring-2 focus:ring-[#00687a]/20" />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Team Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all border-2 ${color === c ? 'scale-110 border-slate-900' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-slate-200 p-0.5 bg-transparent" title="Custom color" />
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Team Icon</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border-2 ${icon === ic ? 'border-[#00687a] bg-[#e5eeff]' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
                  <span className={`material-symbols-outlined text-xl ${icon === ic ? 'text-[#00687a]' : 'text-slate-500'}`}>{ic}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] text-sm font-medium px-4 py-2.5 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#00687a] hover:bg-[#005566] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><span className="material-symbols-outlined animate-spin text-lg">refresh</span>Creating…</> : <><span className="material-symbols-outlined text-lg">group_add</span>Create Team</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
