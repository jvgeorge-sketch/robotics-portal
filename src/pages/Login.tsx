import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import RequestAccessModal from '../components/RequestAccessModal'

const C = {
  paper:      '#ffffff',
  ink:        '#1F2937',
  inkSoft:    '#4B5563',
  inkFaint:   '#9CA3AF',
  ruleStrong: '#D1D5DB',
  blue:       '#1D4ED8',
  blueDeep:   '#1E3A8A',
  blueDarker: '#172554',
  gold:       '#FBBF24',
  goldDeep:   '#F59E0B',
}

function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return mobile
}

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const m = useMobile()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRequestAccess, setShowRequestAccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Please enter your username and password.')
      return
    }
    setError('')
    setLoading(true)
    const err = await signIn(username, password)
    setLoading(false)
    if (err) {
      setError(err)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.paper,
      fontFamily: "'Inter', system-ui, sans-serif",
      color: C.ink,
      WebkitFontSmoothing: 'antialiased',
      display: 'grid',
      gridTemplateColumns: m ? '1fr' : '1.05fr 1fr',
    }}>

      {/* ===== LEFT: Brand ===== */}
      <aside style={{
        position: 'relative',
        padding: m ? '32px 24px' : '56px 64px',
        display: 'flex', flexDirection: 'column',
        background: `linear-gradient(180deg, ${C.blue} 0%, ${C.blueDarker} 100%)`,
        color: '#ffffff',
        overflow: 'hidden',
        minHeight: m ? 'auto' : '100vh',
      }}>
        {/* Decorative double border */}
        <div style={{
          position: 'absolute', inset: m ? 12 : 24,
          border: `1px solid ${C.gold}`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: m ? 18 : 30,
          border: '1px solid #2563EB',
          pointerEvents: 'none',
        }} />

        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          color: '#E0E7FF',
          fontSize: m ? 10 : 11.5,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          <span>Eagle Army · Robotics</span>
        </div>

        {/* Crest + school info */}
        <div style={{
          flex: m ? 'none' : 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          padding: m ? '20px 0 16px' : '24px 0',
        }}>
          <img
            src="/eagle-logo.png"
            alt="Carl Sandburg High School Eagles"
            style={{
              width: m ? 120 : 200, height: m ? 120 : 200,
              objectFit: 'contain',
              marginBottom: m ? 20 : 36,
            }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />

          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 500,
            fontSize: m ? 26 : 42,
            lineHeight: 1.1,
            letterSpacing: '0.005em',
            color: '#ffffff',
            whiteSpace: m ? 'normal' : 'nowrap',
            maxWidth: m ? '22ch' : 'none',
          }}>Carl Sandburg High School</div>

          <div style={{
            marginTop: m ? 10 : 18,
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: m ? 14 : 18,
            color: C.gold, letterSpacing: '0.02em',
          }}>Orland Park, Illinois</div>

          <div style={{
            marginTop: m ? 14 : 22,
            display: 'flex', alignItems: 'center', gap: m ? 8 : 14, justifyContent: 'center',
            color: '#E0E7FF',
            fontSize: m ? 10 : 12.5,
            letterSpacing: m ? '0.2em' : '0.42em',
            textTransform: 'uppercase',
          }}>
            <span style={{ width: m ? 20 : 36, height: 1, background: C.gold, display: 'inline-block' }}/>
            FIRST Robotics Competition
            <span style={{ width: m ? 20 : 36, height: 1, background: C.gold, display: 'inline-block' }}/>
          </div>

          {!m && (
            <p style={{
              marginTop: 26,
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontSize: 19,
              color: '#E0E7FF', letterSpacing: '0.01em',
              maxWidth: '36ch', lineHeight: 1.4,
            }}>"Nothing happens unless first we dream." — Carl Sandburg</p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: m ? 'center' : 'space-between',
          gap: m ? 20 : 24,
          flexWrap: 'wrap',
          color: '#E0E7FF',
          fontSize: m ? 10 : 11.5,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          marginTop: m ? 12 : 0,
        }}>
          {[
            { label: 'Team', val: 'FRC 3488' },
            { label: 'Follow', val: 'X: @EagleArmy3488' },
            { label: 'Season', val: 'MMXXVI' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', flexDirection: 'column', gap: 3,
              whiteSpace: 'nowrap', textAlign: 'center',
            }}>
              <span style={{ color: C.gold, fontSize: m ? 9 : 10.5, letterSpacing: '0.2em' }}>{item.label}</span>
              <span style={{
                color: '#ffffff',
                fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                textTransform: 'none', letterSpacing: '0.01em', fontSize: m ? 13 : 15,
              }}>{item.val}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ===== RIGHT: Form ===== */}
      <main style={{
        position: 'relative',
        padding: m ? '32px 24px' : '56px 64px',
        display: 'flex', flexDirection: 'column',
        background: '#ffffff',
        minHeight: m ? 'auto' : '100vh',
      }}>
        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <img
            src="/eagle-army-logo.png"
            alt="Eagle Army"
            style={{ height: m ? 56 : 80, width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Form body */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          maxWidth: 460, margin: '0 auto', width: '100%',
          padding: m ? '24px 0' : '32px 0',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            color: C.blue,
            fontSize: 11.5, letterSpacing: '0.32em', textTransform: 'uppercase',
            marginBottom: 18,
          }}>
            <span style={{ width: 28, height: 1, background: C.blue, display: 'inline-block' }}/>
            Team Access
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 500,
            fontSize: m ? 38 : 54,
            lineHeight: 1.04,
            letterSpacing: '-0.01em', color: C.ink,
          }}>
            Welcome <em style={{ fontStyle: 'italic', color: C.blue }}>back</em>,<br/>Eagle.
          </h1>

          <p style={{
            marginTop: 12, color: C.inkSoft,
            fontSize: m ? 14 : 15, lineHeight: 1.6, maxWidth: '42ch',
          }}>
            Sign in to manage tasks, track build progress, coordinate your team, and stay on top of the season timeline.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: m ? 24 : 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="u" style={{
                fontSize: 11.5, color: C.inkSoft,
                letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500,
              }}>Username</label>
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                background: '#ffffff',
                border: `1px solid ${C.ruleStrong}`,
                borderRadius: 2, height: 52, padding: '0 16px',
                transition: 'border-color .2s ease, box-shadow .2s ease',
              }}>
                <input
                  id="u"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="firstname.lastname"
                  autoComplete="username"
                  autoCapitalize="none"
                  style={{
                    flex: 1, height: '100%',
                    border: 0, outline: 0, background: 'transparent',
                    font: "400 15.5px/1 'Inter', sans-serif",
                    color: C.ink, letterSpacing: '0.005em',
                  }}
                  onFocus={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = C.blue
                    p.style.boxShadow = `0 0 0 3px #BFDBFE`
                  }}
                  onBlur={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = C.ruleStrong
                    p.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="p" style={{
                fontSize: 11.5, color: C.inkSoft,
                letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500,
              }}>Password</label>
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                background: '#ffffff',
                border: `1px solid ${C.ruleStrong}`,
                borderRadius: 2, height: 52, padding: '0 16px',
                transition: 'border-color .2s ease, box-shadow .2s ease',
              }}>
                <input
                  id="p"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="enter your password"
                  autoComplete="current-password"
                  style={{
                    flex: 1, height: '100%',
                    border: 0, outline: 0, background: 'transparent',
                    font: "400 15.5px/1 'Inter', sans-serif",
                    color: C.ink, letterSpacing: '0.005em',
                  }}
                  onFocus={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = C.blue
                    p.style.boxShadow = `0 0 0 3px #BFDBFE`
                  }}
                  onBlur={e => {
                    const p = e.target.parentElement!
                    p.style.borderColor = C.ruleStrong
                    p.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    background: 'transparent', border: 0,
                    color: C.inkSoft, cursor: 'pointer',
                    font: "500 12px 'Inter', sans-serif",
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    padding: '4px 6px', marginRight: -4,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Remember me + forgot password */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              marginTop: -2, fontSize: 13.5, whiteSpace: 'nowrap',
            }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                color: C.ink, userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{
                    appearance: 'none', WebkitAppearance: 'none',
                    width: 18, height: 18, border: `1px solid ${C.ruleStrong}`,
                    background: rememberMe ? C.blue : '#fff',
                    borderColor: rememberMe ? C.blue : C.ruleStrong,
                    cursor: 'pointer', borderRadius: 2,
                    display: 'inline-block', position: 'relative',
                    transition: 'background .15s, border-color .15s',
                    flexShrink: 0,
                  }}
                />
                <span>Remember me</span>
              </label>
              <a href="#" style={{
                color: C.blueDeep, textDecoration: 'none',
                fontStyle: 'italic',
                fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
                borderBottom: `1px solid ${C.blueDeep}`, paddingBottom: 1,
              }}>Forgot password</a>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#b91c1c',
                fontSize: 13.5, padding: '10px 14px', borderRadius: 2,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6, height: 54, width: '100%',
                background: loading ? C.blueDeep : C.blue,
                color: '#ffffff',
                border: 0, borderRadius: 2,
                font: "500 13.5px 'Inter', sans-serif",
                letterSpacing: '0.22em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                transition: 'background .15s ease',
                opacity: loading ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              {!loading && (
                <span style={{ position: 'relative', width: 18, height: 1, background: C.gold, display: 'inline-block' }}>
                  <span style={{
                    position: 'absolute', right: -1, top: -3,
                    width: 7, height: 7,
                    borderTop: `1px solid ${C.gold}`, borderRight: `1px solid ${C.gold}`,
                    transform: 'rotate(45deg)',
                    display: 'block',
                  }} />
                </span>
              )}
            </button>
          </form>

          <p style={{
            marginTop: 28, textAlign: 'center',
            color: C.inkSoft,
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontSize: 16, letterSpacing: '0.01em',
          }}>
            New to the team this season?{' '}
            <button
              type="button"
              onClick={() => setShowRequestAccess(true)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: C.ink,
                borderBottom: `1px solid ${C.blue}`, paddingBottom: 1,
                fontFamily: "'Inter', sans-serif", fontSize: 13.5,
                letterSpacing: '0.04em', marginLeft: 6,
              }}
            >Request access</button>
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: m ? 'center' : 'space-between',
          flexWrap: 'wrap', gap: m ? 8 : 24,
          color: C.inkFaint, fontSize: 11.5, letterSpacing: '0.04em',
        }}>
          <div>© 2026 CSHS Robotics</div>
          {!m && (
            <div>
              <a href="#" style={{ color: C.inkSoft, textDecoration: 'none' }}>Privacy</a>
              <span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: C.inkFaint, margin: '0 10px', verticalAlign: 'middle' }}/>
              <a href="#" style={{ color: C.inkSoft, textDecoration: 'none' }}>Terms</a>
              <span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: C.inkFaint, margin: '0 10px', verticalAlign: 'middle' }}/>
              <a href="#" style={{ color: C.inkSoft, textDecoration: 'none' }}>Code of Conduct</a>
            </div>
          )}
        </div>
      </main>

      {showRequestAccess && (
        <RequestAccessModal onClose={() => setShowRequestAccess(false)} />
      )}
    </div>
  )
}
