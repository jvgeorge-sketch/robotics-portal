import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ReportBlockerModal from './ReportBlockerModal'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/team-hub', label: 'Team Hub', icon: 'groups' },
  { path: '/open-pool', label: 'Open Pool', icon: 'list_alt' },
  { path: '/workspace', label: 'Workspace', icon: 'timer' },
  { path: '/leaderboard', label: 'Leaderboard', icon: 'military_tech' },
  { path: '/teams', label: 'Teams', icon: 'precision_manufacturing' },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { currentUser } = useAuth()
  const isInstructor = currentUser?.role === 'instructor'
  const [showBlockerModal, setShowBlockerModal] = useState(false)

  return (
    <>
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-[#57dffe] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-display leading-tight">TECH COMMAND</h2>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">V.2.0.0-Active</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
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

        {/* Instructor-only admin panel link */}
        {isInstructor && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instructor</p>
            </div>
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-display font-medium text-sm ${
                  isActive
                    ? 'bg-[#481b00]/10 text-[#eb6905] border-r-4 border-[#eb6905] font-semibold'
                    : 'text-[#eb6905] hover:bg-[#481b00]/10'
                }`
              }
            >
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
              <span>Admin Panel</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-4 mt-auto space-y-4">
        <button
          onClick={() => setShowBlockerModal(true)}
          className="w-full py-2.5 bg-[#481b00] text-[#eb6905] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
        >
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

      {showBlockerModal && (
        <ReportBlockerModal onClose={() => setShowBlockerModal(false)} />
      )}
    </>
  )
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 border-r border-slate-200 fixed left-0 top-0 bg-white flex-col py-6 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="relative w-64 h-full bg-white flex flex-col py-6 shadow-2xl">
            <SidebarContent onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  )
}
