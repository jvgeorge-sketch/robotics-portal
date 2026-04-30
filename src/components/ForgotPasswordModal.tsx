import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const handle = username.trim().toLowerCase()
    if (!handle) return

    setStatus('loading')
    setErrorMsg('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', handle)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      setStatus('error')
      setErrorMsg('No active account found with that username.')
      return
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ reset_requested: true })
      .eq('id', data.id)

    if (updateErr) {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
      return
    }

    setStatus('success')
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#ffffff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', width: '100%', maxWidth: 400, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: '#1E3A8A', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="material-symbols-outlined" style={{ color: '#FBBF24', fontSize: 22 }}>lock_reset</span>
            <h2 style={{ margin: 0, color: '#ffffff', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500 }}>
              Reset Password
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 0, cursor: 'pointer', color: '#93C5FD', display: 'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#10B981', display: 'block', marginBottom: 12 }}>check_circle</span>
              <p style={{ fontWeight: 700, color: '#1F2937', marginBottom: 8, fontSize: 15 }}>Request submitted</p>
              <p style={{ color: '#4B5563', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 20px' }}>
                Your admin has been notified. Once they reset your account you'll be able to log in with the default password and set a new one.
              </p>
              <button
                onClick={onClose}
                style={{ width: '100%', height: 44, background: '#1D4ED8', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: '#4B5563', fontSize: 13.5, lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
                Enter your username and your admin will be notified to reset your password.
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="firstname.lastname"
                    autoCapitalize="none"
                    autoFocus
                    style={{
                      height: 46, border: '1px solid #D1D5DB', borderRadius: 8,
                      padding: '0 14px', fontSize: 14.5, color: '#1F2937',
                      outline: 'none', background: '#F9FAFB',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#1D4ED8'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.background = '#F9FAFB' }}
                  />
                </div>

                {status === 'error' && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#b91c1c', fontSize: 13, padding: '10px 14px', borderRadius: 8 }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ flex: 1, height: 44, border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    style={{
                      flex: 1, height: 44, border: 0, borderRadius: 8,
                      background: status === 'loading' ? '#1E3A8A' : '#1D4ED8',
                      color: '#fff', fontWeight: 600, fontSize: 13, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      opacity: status === 'loading' ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {status === 'loading'
                      ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</span>Sending…</>
                      : 'Send Request'
                    }
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
