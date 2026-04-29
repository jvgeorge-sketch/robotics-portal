import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-[#091426] flex items-center justify-center p-6">
      {/* Circuit background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-5" viewBox="0 0 1200 800" fill="none">
          <path d="M0 400H200L250 300H500L550 500H750L800 400H1200" stroke="#57dffe" strokeWidth="2" />
          <path d="M0 200H150L200 100H400L450 200H600" stroke="#57dffe" strokeWidth="1.5" />
          <path d="M600 600H800L850 700H1050L1100 600H1200" stroke="#57dffe" strokeWidth="1.5" />
          {[250, 550, 800].map(cx => (
            <circle key={cx} cx={cx} cy={cx < 400 ? 300 : cx < 700 ? 500 : 400} r="6" fill="#57dffe" />
          ))}
          {[200, 450, 850, 1100].map(cx => (
            <circle key={cx} cx={cx} cy={cx < 300 ? 100 : cx < 500 ? 200 : cx < 900 ? 700 : 600} r="4" fill="#57dffe" />
          ))}
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e293b] rounded-2xl mb-5 border border-[#57dffe]/20">
            <span className="material-symbols-filled text-[#57dffe] text-4xl">precision_manufacturing</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">TECH COMMAND</h1>
          <p className="text-[#8590a6] mt-1 text-sm">Robotics Project Portal · Season 2024</p>
        </div>

        {/* Card */}
        <div className="bg-[#0f1f35] border border-[#1e293b] rounded-2xl p-8 shadow-2xl">
          <h2 className="font-display text-xl font-semibold text-white mb-1">Sign in to continue</h2>
          <p className="text-[#8590a6] text-sm mb-7">
            Use the credentials assigned by your instructor.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-[#8590a6] uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#57dffe]" style={{ fontSize: 18 }}>
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your.username"
                  autoComplete="username"
                  autoCapitalize="none"
                  className="w-full bg-[#1e293b] border border-[#2d3f55] text-white rounded-xl py-3 pl-10 pr-4 text-sm placeholder:text-[#4a5568] focus:outline-none focus:border-[#57dffe] focus:ring-1 focus:ring-[#57dffe]/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#8590a6] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#57dffe]" style={{ fontSize: 18 }}>
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[#1e293b] border border-[#2d3f55] text-white rounded-xl py-3 pl-10 pr-10 text-sm placeholder:text-[#4a5568] focus:outline-none focus:border-[#57dffe] focus:ring-1 focus:ring-[#57dffe]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#8590a6] transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-[#ba1a1a]/10 border border-[#ba1a1a]/30 text-[#ff8a80] text-sm px-4 py-3 rounded-xl">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#57dffe] text-[#091426] font-bold py-3.5 px-5 rounded-xl hover:bg-[#7ee8ff] active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#1e293b] space-y-2.5">
            {[
              { icon: 'shield', text: 'Accounts created by your instructor' },
              { icon: 'group', text: 'Team assignments managed by instructor' },
              { icon: 'visibility_off', text: 'Passwords are hashed — never stored in plain text' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2.5 text-[#8590a6] text-xs">
                <span className="material-symbols-outlined text-[#57dffe]" style={{ fontSize: 16 }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[#8590a6] text-xs mt-6">
          Problems signing in? Ask your instructor.
        </p>
      </div>
    </div>
  )
}
