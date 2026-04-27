const steps = [
  {
    n: 1,
    title: 'Create a Supabase project',
    body: 'Go to supabase.com → New Project. Pick a name and region close to your school.',
    code: null,
  },
  {
    n: 2,
    title: 'Run the database schema',
    body: 'In your Supabase dashboard open SQL Editor → New Query, paste the file below, and click Run.',
    code: 'supabase/schema.sql',
  },
  {
    n: 3,
    title: 'Enable Google OAuth',
    body: 'Dashboard → Authentication → Providers → Google. Add your Google Cloud OAuth Client ID & Secret. Set the redirect URI to:',
    code: 'https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback',
  },
  {
    n: 4,
    title: 'Add your env vars',
    body: 'Open .env.local (in the project root) and fill in both values from Dashboard → Project Settings → API.',
    code: 'VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ...',
  },
  {
    n: 5,
    title: 'Save — Vite will reload automatically',
    body: 'No restart needed. Once the file is saved the app will come up on this tab.',
    code: null,
  },
]

export default function SetupRequired() {
  return (
    <div className="min-h-screen bg-[#091426] flex items-center justify-center p-6">
      {/* faint circuit background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <svg className="w-full h-full" viewBox="0 0 1200 800" fill="none">
          <path d="M0 400H200L250 300H500L550 500H750L800 400H1200" stroke="#57dffe" strokeWidth="2" />
          <path d="M0 200H150L200 100H400L450 200H600" stroke="#57dffe" strokeWidth="1.5" />
          <path d="M600 600H800L850 700H1050L1100 600H1200" stroke="#57dffe" strokeWidth="1.5" />
          {[250, 550, 800].map(cx => (
            <circle key={cx} cx={cx} cy={cx < 400 ? 300 : cx < 700 ? 500 : 400} r="6" fill="#57dffe" />
          ))}
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1e293b] rounded-2xl mb-4 border border-[#57dffe]/20">
            <span className="material-symbols-outlined text-[#57dffe] text-3xl">settings</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Setup Required</h1>
          <p className="text-[#8590a6] text-sm mt-1">
            Connect Supabase to activate authentication and the database.
          </p>
        </div>

        {/* Missing vars callout */}
        <div className="bg-[#ba1a1a]/10 border border-[#ba1a1a]/30 rounded-xl px-5 py-4 flex items-start gap-3 mb-6">
          <span className="material-symbols-outlined text-[#ba1a1a] mt-0.5" style={{ fontSize: 20 }}>error</span>
          <div>
            <p className="text-sm font-bold text-white">Missing environment variables</p>
            <p className="text-xs text-[#8590a6] mt-0.5">
              <code className="text-[#57dffe]">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-[#57dffe]">VITE_SUPABASE_ANON_KEY</code> are not set in{' '}
              <code className="text-[#57dffe]">.env.local</code>.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-[#0f1f35] border border-[#1e293b] rounded-2xl overflow-hidden">
          {steps.map((step, i) => (
            <div
              key={step.n}
              className={`px-6 py-5 ${i < steps.length - 1 ? 'border-b border-[#1e293b]' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#00687a] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[11px] font-bold font-display">{step.n}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{step.title}</p>
                  <p className="text-xs text-[#8590a6] mt-1 leading-relaxed">{step.body}</p>
                  {step.code && (
                    <pre className="mt-2.5 bg-[#091426] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[11px] text-[#57dffe] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {step.code}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[#8590a6] text-xs mt-5">
          Need help? Check{' '}
          <code className="text-[#57dffe]">.env.example</code>{' '}
          in the project root for the full template.
        </p>
      </div>
    </div>
  )
}
