import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-[#091426] flex items-center justify-center p-6">
      {/* Abstract circuit background */}
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
          <h2 className="font-display text-xl font-semibold text-white mb-2">Sign in to continue</h2>
          <p className="text-[#8590a6] text-sm mb-8">
            Sign in with any Google account to access the portal.
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-[#091426] font-bold py-3.5 px-5 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all shadow-lg"
          >
            {/* Google icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 pt-6 border-t border-[#1e293b] space-y-2.5">
            {[
              { icon: 'lock', text: 'Any Google account works' },
              { icon: 'shield', text: 'Access controlled by your PM' },
              { icon: 'visibility_off', text: 'No passwords stored' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2.5 text-[#8590a6] text-xs">
                <span className="material-symbols-outlined text-[#57dffe]" style={{ fontSize: 16 }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[#8590a6] text-xs mt-6">
          Problems signing in? Ask your Project Manager.
        </p>
      </div>
    </div>
  )
}
