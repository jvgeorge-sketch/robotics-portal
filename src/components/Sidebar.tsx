import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/team-hub', label: 'Team Hub', icon: 'groups' },
  { path: '/open-pool', label: 'Open Pool', icon: 'list_alt' },
  { path: '/workspace', label: 'Workspace', icon: 'timer' },
  { path: '/leaderboard', label: 'Leaderboard', icon: 'military_tech' },
  { path: '/teams', label: 'Teams', icon: 'precision_manufacturing' },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 border-r border-slate-200 fixed left-0 top-0 bg-white flex-col py-6 z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-[#57dffe] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-display leading-tight">TECH COMMAND</h2>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">V.2.4.0-Active</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-display font-medium text-sm ${
                isActive
                  ? 'bg-slate-50 text-[#00687a] border-r-4 border-[#00687a] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 mt-auto space-y-4">
        <button className="w-full py-2.5 bg-[#481b00] text-[#eb6905] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all">
          <span className="material-symbols-outlined text-lg">report_problem</span>
          Report Blocker
        </button>
        <div className="pt-4 border-t border-slate-100 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900 transition-colors text-sm">
            <span className="material-symbols-outlined text-xl">description</span>
            <span>Docs</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900 transition-colors text-sm">
            <span className="material-symbols-outlined text-xl">help</span>
            <span>Support</span>
          </a>
        </div>
      </div>
    </aside>
  )
}
