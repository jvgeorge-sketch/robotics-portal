import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hashPassword } from '../lib/auth'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const { currentUser, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password === 'Monday99') {
      setError('Please choose a different password from the default.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const hash = await hashPassword(password)
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ password_hash: hash, must_change_password: false })
      .eq('id', currentUser!.id)

    if (dbErr) {
      setLoading(false)
      setError(dbErr.message)
      return
    }

    await refreshProfile()
    navigate('/', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'oklch(0.975 0.013 85)',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: 24,
    }}>
      {/* Subtle gradient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 30% 20%, oklch(0.92 0.04 260 / 0.25), transparent 60%)',
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* Header mark */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 32,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: '#1E3A8A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#FBBF24', fontSize: 26 }}>lock_reset</span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}>
          {/* Blue header */}
          <div style={{
            background: '#1E3A8A',
            padding: '24px 32px',
            color: '#ffffff',
          }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500, fontSize: 28, lineHeight: 1.1, margin: 0,
            }}>Set your password</h1>
            <p style={{
              marginTop: 8, fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5,
            }}>
              Welcome, <strong style={{ color: '#FBBF24' }}>{currentUser?.full_name || currentUser?.username}</strong>. You're using a temporary password — please set a new one before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* New password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontSize: 11, color: '#6B7280',
                letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600,
              }}>New Password</label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1px solid #D1D5DB', borderRadius: 10,
                height: 48, padding: '0 14px',
                background: '#F9FAFB',
                transition: 'border-color .2s, box-shadow .2s',
              }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoFocus
                  style={{
                    flex: 1, border: 0, outline: 0, background: 'transparent',
                    fontSize: 15, color: '#1F2937',
                  }}
                  onFocus={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = '#1D4ED8'
                    p.style.boxShadow = '0 0 0 3px rgba(29,78,216,0.12)'
                    p.style.background = '#fff'
                  }}
                  onBlur={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = '#D1D5DB'
                    p.style.boxShadow = 'none'
                    p.style.background = '#F9FAFB'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    background: 'none', border: 0, cursor: 'pointer',
                    color: '#9CA3AF', fontSize: 12, fontWeight: 600,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '4px 2px',
                  }}
                >{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            {/* Confirm password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontSize: 11, color: '#6B7280',
                letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600,
              }}>Confirm Password</label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1px solid #D1D5DB', borderRadius: 10,
                height: 48, padding: '0 14px',
                background: '#F9FAFB',
                transition: 'border-color .2s, box-shadow .2s',
              }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  style={{
                    flex: 1, border: 0, outline: 0, background: 'transparent',
                    fontSize: 15, color: '#1F2937',
                  }}
                  onFocus={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = '#1D4ED8'
                    p.style.boxShadow = '0 0 0 3px rgba(29,78,216,0.12)'
                    p.style.background = '#fff'
                  }}
                  onBlur={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = '#D1D5DB'
                    p.style.boxShadow = 'none'
                    p.style.background = '#F9FAFB'
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(186,26,26,0.07)',
                border: '1px solid rgba(186,26,26,0.2)',
                color: '#b91c1c',
                fontSize: 13.5, padding: '10px 14px', borderRadius: 8,
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                height: 50, width: '100%',
                background: loading ? '#1E3A8A' : '#1D4ED8',
                color: '#ffffff', border: 0, borderRadius: 10,
                fontSize: 13.5, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {loading
                ? <><span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>refresh</span>Saving…</>
                : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>Set Password & Continue</>
              }
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 12, color: '#9CA3AF',
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
        }}>
          Eagle Army · FRC 3488 · Carl Sandburg High School
        </p>
      </div>
    </div>
  )
}
