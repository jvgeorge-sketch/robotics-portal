import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import CreateTeamModal from '../components/CreateTeamModal'

interface Team {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  lead_id: string | null
}

interface Member {
  user_id: string
  full_name: string
  email: string
  role: string
  season_points: number
  total_points: number
  is_lead: boolean
  active_tasks: number
}

interface TaskSummary {
  id: string
  title: string
  status: string
  priority: string
}

const STATUS_GROUPS = [
  { key: 'todo',        label: 'To Do',      statuses: ['backlog', 'ready'],      color: 'text-slate-500',   bg: 'bg-slate-100',   badge: 'bg-slate-100 text-slate-500'  },
  { key: 'inprogress',  label: 'In Progress', statuses: ['in_progress', 'review'], color: 'text-[#1D4ED8]',   bg: 'bg-[#EFF6FF]',   badge: 'bg-[#DBEAFE] text-[#1D4ED8]'  },
  { key: 'done',        label: 'Completed',   statuses: ['done'],                  color: 'text-emerald-600', bg: 'bg-emerald-50',  badge: 'bg-emerald-50 text-emerald-600'},
]

const PRIORITY_CLS: Record<string, string> = {
  critical: 'bg-[#ffdad6] text-[#93000a]',
  high:     'bg-[#FDE68A] text-[#78350F]',
  medium:   'bg-[#FBBF24]/20 text-[#1E40AF]',
  low:      'bg-slate-100 text-slate-600',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Teams() {
  const [teams, setTeams]         = useState<Team[]>([])
  const [activeTeamId, setActive] = useState<string | null>(null)
  const [members, setMembers]     = useState<Member[]>([])
  const [tasks, setTasks]         = useState<TaskSummary[]>([])
  const [loading, setLoading]     = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)

  const loadTeams = useCallback(() => {
    supabase.from('teams').select('*').then(({ data }) => {
      const list = data || []
      setTeams(list)
      if (list.length > 0) setActive(prev => prev ?? list[0].id)
      setLoading(false)
    })
  }, [])

  // Load all teams once
  useEffect(() => { loadTeams() }, [loadTeams])

  // Load members + tasks when selected team changes
  const loadDetail = useCallback(async (teamId: string) => {
    setDetailLoading(true)

    const [{ data: memberRows }, { data: taskRows }] = await Promise.all([
      supabase
        .from('team_members')
        .select('user_id, is_lead, profiles(full_name, email, role, season_points, total_points)')
        .eq('team_id', teamId),
      supabase
        .from('tasks')
        .select('id, title, status, priority')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false }),
    ])

    // Count active tasks per member
    const tasksByAssignee: Record<string, number> = {}
    // We don't have assigned_to here — fetch separately
    const { data: assignedRows } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('team_id', teamId)
      .neq('status', 'done')
      .not('assigned_to', 'is', null)

    for (const row of (assignedRows || []) as any[]) {
      if (row.assigned_to) {
        tasksByAssignee[row.assigned_to] = (tasksByAssignee[row.assigned_to] || 0) + 1
      }
    }

    setMembers(((memberRows || []) as any[]).map(m => ({
      user_id: m.user_id,
      full_name: m.profiles?.full_name || 'Member',
      email: m.profiles?.email || '',
      role: m.profiles?.role || 'student',
      season_points: m.profiles?.season_points || 0,
      total_points: m.profiles?.total_points || 0,
      is_lead: m.is_lead,
      active_tasks: tasksByAssignee[m.user_id] || 0,
    })))

    setTasks((taskRows || []) as TaskSummary[])
    setDetailLoading(false)
  }, [])

  useEffect(() => {
    if (activeTeamId) loadDetail(activeTeamId)
  }, [activeTeamId, loadDetail])

  const activeTeam = teams.find(t => t.id === activeTeamId)
  const teamLead   = members.find(m => m.is_lead)

  const taskGroups = STATUS_GROUPS.map(g => ({
    ...g,
    tasks: tasks.filter(t => g.statuses.includes(t.status)),
  }))

  const totalDone   = tasks.filter(t => t.status === 'done').length
  const totalTasks  = tasks.length
  const pct         = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="material-symbols-outlined text-[#1D4ED8] text-4xl animate-spin">refresh</span>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <span className="material-symbols-outlined text-slate-300 text-6xl">group_off</span>
        <p className="text-slate-500 font-medium">No teams found. Run the schema SQL in Supabase to create the default teams.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#1F2937]">Team Management</h1>
          <p className="text-[#4B5563]">Browse specialized units and their progress.</p>
        </div>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="bg-[#1E3A8A] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1E3A8A] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-xl">group_add</span>
          Create New Team
        </button>
      </div>

      {showCreateTeam && (
        <CreateTeamModal
          onClose={() => setShowCreateTeam(false)}
          onCreated={() => { loadTeams(); setShowCreateTeam(false) }}
        />
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] mb-4 px-2">TEAMS</h3>
            <div className="space-y-2">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setActive(team.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    activeTeamId === team.id
                      ? 'bg-[#DBEAFE] border-[#FBBF24]/30 font-bold'
                      : 'border-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ color: activeTeamId === team.id ? team.color : '#94a3b8' }}
                    >{team.icon}</span>
                    <span className="text-sm font-medium text-slate-800">{team.name}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTeamId === team.id ? 'text-white' : 'bg-slate-200 text-slate-600'
                  }`} style={activeTeamId === team.id ? { backgroundColor: team.color } : {}}>
                    {members.length > 0 && activeTeamId === team.id
                      ? String(members.length).padStart(2,'0')
                      : '—'
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>

          {activeTeam && (
            <div className="bg-[#1E3A8A] text-white rounded-xl p-5 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">COMPLETION</h4>
                <div className="font-display text-3xl font-bold">{pct}%</div>
                <p className="text-xs text-[#6B7280] mt-1">{totalDone}/{totalTasks} tasks done</p>
                <div className="mt-3 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#1D4ED8]" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 opacity-10 rotate-12" style={{ fontSize: 80 }}>trending_up</span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="col-span-12 lg:col-span-9 space-y-5">
          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="material-symbols-outlined text-[#1D4ED8] text-4xl animate-spin">refresh</span>
            </div>
          ) : activeTeam ? (
            <>
              {/* Team Summary */}
              <div className="bg-white border border-slate-200 rounded-xl p-8 relative shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl" style={{ backgroundColor: activeTeam.color }} />
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-xl bg-[#1E3A8A] border-4 border-[#DBEAFE] flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl" style={{ color: activeTeam.color }}>{activeTeam.icon}</span>
                      </div>
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-bold text-[#1F2937]">{activeTeam.name}</h2>
                      {activeTeam.description && (
                        <p className="text-[#4B5563] text-sm mt-1">{activeTeam.description}</p>
                      )}
                      {teamLead && (
                        <p className="text-[#4B5563] flex items-center gap-2 mt-2">
                          <span className="font-bold" style={{ color: activeTeam.color }}>Lead:</span>
                          {teamLead.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex gap-8 border-l border-slate-100 pl-8">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">MEMBERS</div>
                      <div className="font-display text-2xl font-bold text-slate-900">{members.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">TASKS</div>
                      <div className="font-display text-2xl font-bold" style={{ color: activeTeam.color }}>{totalTasks}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">DONE</div>
                      <div className="font-display text-2xl font-bold text-emerald-600">{totalDone}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Groups */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {taskGroups.map(g => (
                  <div key={g.key} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${g.color}`}>{g.label}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${g.badge}`}>{g.tasks.length}</span>
                    </div>
                    {g.tasks.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">None</p>
                    ) : (
                      <div className="space-y-2">
                        {g.tasks.slice(0, 5).map(t => (
                          <div key={t.id} className={`p-2.5 rounded-lg border text-sm ${g.bg} border-transparent`}>
                            <div className={`font-semibold mb-1.5 text-[#1E3A8A] ${g.key === 'done' ? 'line-through opacity-60' : ''}`}>
                              {t.title}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${PRIORITY_CLS[t.priority] || 'bg-slate-100 text-slate-600'}`}>
                              {t.priority}
                            </span>
                          </div>
                        ))}
                        {g.tasks.length > 5 && (
                          <p className="text-xs text-slate-400 text-center pt-1">+{g.tasks.length - 5} more</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Member Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold">Member Directory</h3>
                  <span className="text-xs text-slate-400 font-bold">{members.length} members</span>
                </div>
                {members.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No members in this team yet. Members join teams when they sign in and get assigned.
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-6 py-3">Member</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Active Tasks</th>
                        <th className="px-6 py-3 text-right">Season Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map(m => (
                        <tr key={m.user_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-xs font-bold font-display">
                                {initials(m.full_name)}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-[#1E3A8A] flex items-center gap-2">
                                  {m.full_name}
                                  {m.is_lead && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase text-white" style={{ backgroundColor: activeTeam.color }}>
                                      LEAD
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600 capitalize">{m.role.replace('_', ' ')}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${m.active_tasks > 0 ? 'bg-[#1D4ED8]' : 'bg-slate-300'}`} />
                              <span className="text-xs font-display">{m.active_tasks} active</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-display font-bold text-slate-900 text-sm">
                            {m.season_points.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
