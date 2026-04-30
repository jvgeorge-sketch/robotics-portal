import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
}

export default function RequestAccessModal({ onClose }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Full name is required'); return }
    if (!email.trim()) { setError('Email is required'); return }

    setSaving(true)
    setError('')

    const { error: dbErr } = await supabase.from('access_requests').insert({
      full_name: fullName.trim(),
      email: email.trim(),
      message: message.trim() || null,
      status: 'pending',
    })

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    setSuccess(true)
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
            <span className="material-symbols-outlined text-[#FBBF24]">how_to_reg</span>
            <h2 className="font-display text-lg font-bold">Request Access</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-emerald-500 block mb-3">check_circle</span>
            <p className="font-display font-bold text-slate-900 text-lg">Request sent!</p>
            <p className="text-slate-500 text-sm mt-1">
              Your request has been received. An instructor will review it and create your account — check back soon.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-xl text-sm font-bold transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setError('') }}
                placeholder="e.g. Alex Johnson"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Email <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Message
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us your role on the team — e.g. Mechanical, Software, Electrical…"
                rows={4}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
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
                disabled={saving}
                className="flex-1 py-2.5 bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving
                  ? <><span className="material-symbols-outlined text-lg animate-spin">refresh</span>Submitting…</>
                  : <><span className="material-symbols-outlined text-lg">how_to_reg</span>Send Request</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
