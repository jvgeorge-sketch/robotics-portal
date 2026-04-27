import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface StudentRow {
  id: string
  full_name: string
  season_points: number
  total_points: number
  team_name: string
}

interface TeamRow {
  id: string
  name: string
  icon: string
  color: string
  total_pts: number
  member_count: number
}

const RANK_BG = ['bg-yellow-400', 'bg-slate-300', 'bg-amber-600']

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Leaderboard() {
  const [tab, setTab] = useState<'daily' | 'season'>('season')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch profiles with their team membership
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, season_points, total_points, team_members(teams(name))')
        .order('season_points', { ascending: false })
        .limit(50)

      // Fetch teams with member points
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, icon, color, team_members(profiles(season_points))')

      setStudents((profilesData || []).map(p => {
        const tm = (p.team_members as any)?.[0]
        const teamName = tm?.teams?.name || 'No Team'
        return {
          id: p.id,
          full_name: p.full_name || 'Member',
          season_points: p.season_points,
          total_points: p.total_points,
          team_name: teamName,
        }
      }))

      setTeams((teamsData || []).map(t => {
        const members = (t.team_members as any[]) || []
        const total_pts = members.reduce((sum: number, m: any) => {
          return sum + ((m.profiles as any)?.season_points || 0)
        }, 0)
        return {
          id: t.id,
          name: t.name,
          icon: t.icon,
          color: t.color,
          total_pts,
          member_count: members.length,
        }
      }).sort((a, b) => b.total_pts - a.total_pts))

      setLoading(false)
    }
    load()
  }, [])

  const topStudent = students[0]
  const totalPoints = students.reduce((s, p) => s + p.season_points, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="material-symbols-outlined text-[#00687a] text-4xl animate-spin">refresh</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1280px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-[#0b1c30]">System Rankings</h1>
          <p className="text-[#45474c] text-lg mt-1">Real-time performance metrics and competitive standing.</p>
        </div>
        <div className="inline-flex p-1 bg-[#e5eeff] rounded-lg">
          <button
            onClick={() => setTab('daily')}
            className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${tab === 'daily' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#45474c] hover:text-[#0b1c30]'}`}
          >
            Daily Standings
          </button>
          <button
            onClick={() => setTab('season')}
            className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${tab === 'season' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#45474c] hover:text-[#0b1c30]'}`}
          >
            Season Standings
          </button>
        </div>
      </div>

      {/* Top Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 bg-[#091426] text-white rounded-xl overflow-hidden relative border border-[#1e293b] p-6 flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-filled text-5xl opacity-20">workspace_premium</span>
          </div>
          {topStudent ? (
            <>
              <div>
                <span className="bg-[#57dffe]/20 text-[#acedff] text-[10px] px-3 py-1 rounded-full border border-[#acedff]/30 inline-block mb-4 font-bold uppercase tracking-wider">
                  TOP PERFORMER
                </span>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-full bg-[#1e293b] border-2 border-[#4cd7f6] flex items-center justify-center">
                    <span className="text-white font-display font-bold text-lg">{initials(topStudent.full_name)}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{topStudent.full_name}</h3>
                    <p className="text-[#4cd7f6] font-display text-sm">{topStudent.team_name} // {topStudent.season_points.toLocaleString()} PTS</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm opacity-80">
                  <span>Season Points</span>
                  <span className="text-[#4cd7f6]">{topStudent.season_points.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between text-sm opacity-80">
                  <span>All-Time Points</span>
                  <span className="text-[#4cd7f6]">{topStudent.total_points.toLocaleString()} pts</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
              <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
              <p className="text-sm">No members yet</p>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="md:col-span-8 bg-white border border-[#c5c6cd] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="font-display text-xl font-semibold text-[#0b1c30] mb-5 border-b border-[#d3e4fe] pb-4">Season Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            <div className="bg-[#eff4ff] rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-[#45474c] uppercase tracking-wider mb-1">Total Members</p>
              <p className="font-display text-3xl font-bold text-[#0b1c30]">{students.length}</p>
            </div>
            <div className="bg-[#eff4ff] rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-[#45474c] uppercase tracking-wider mb-1">Active Teams</p>
              <p className="font-display text-3xl font-bold text-[#0b1c30]">{teams.length}</p>
            </div>
            <div className="bg-[#eff4ff] rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-[#45474c] uppercase tracking-wider mb-1">Total Points</p>
              <p className="font-display text-3xl font-bold text-[#0b1c30]">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-[#eff4ff] rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-[#45474c] uppercase tracking-wider mb-1">Top Score</p>
              <p className="font-display text-3xl font-bold text-[#0b1c30]">
                {topStudent ? topStudent.season_points.toLocaleString() : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Students */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687a] text-xl">person</span>
              <h3 className="font-display text-xl font-semibold text-[#0b1c30]">Top Members</h3>
            </div>
            <span className="text-[10px] font-bold text-[#45474c] uppercase">By Season Points</span>
          </div>
          <div className="bg-white border border-[#c5c6cd] rounded-xl overflow-hidden shadow-sm">
            {students.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No members yet. Sign in to appear here!
              </div>
            ) : (
              <>
                <table className="w-full border-collapse">
                  <thead className="bg-[#eff4ff]">
                    <tr>
                      {['Rank', 'Name', 'Team', 'Points'].map(h => (
                        <th key={h} className={`py-3 px-5 text-[10px] font-bold text-[#45474c] uppercase tracking-wider ${h === 'Points' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d3e4fe]">
                    {students.map((s, i) => (
                      <tr key={s.id} className={`hover:bg-[#eff4ff] transition-colors ${i === 0 ? 'bg-[#eff4ff]/50' : ''}`}>
                        <td className="py-3 px-5">
                          {i < 3 ? (
                            <span className={`w-7 h-7 rounded-full ${RANK_BG[i]} text-white flex items-center justify-center font-bold font-display text-xs`}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                          ) : (
                            <span className="font-display text-[#45474c] text-sm px-2">{String(i + 1).padStart(2, '0')}</span>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#1e293b] flex items-center justify-center text-white text-[10px] font-bold font-display">
                              {initials(s.full_name)}
                            </div>
                            <span className="font-semibold text-[#0b1c30]">{s.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-[#e5eeff] text-[#006172] border-[#57dffe]/30">
                            {s.team_name}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right font-display font-medium text-[#0b1c30]">
                          {s.season_points.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length >= 50 && (
                  <div className="p-4 bg-white border-t border-[#d3e4fe] text-center">
                    <button className="text-sm font-semibold text-[#00687a] hover:underline">Load More</button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Top Teams */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#481b00] text-xl">hub</span>
              <h3 className="font-display text-xl font-semibold text-[#0b1c30]">Team Rankings</h3>
            </div>
            <span className="text-[10px] font-bold text-[#45474c] uppercase">By Combined Points</span>
          </div>
          <div className="bg-white border border-[#c5c6cd] rounded-xl overflow-hidden shadow-sm">
            {teams.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No teams found.</div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-[#eff4ff]">
                  <tr>
                    {['Rank', 'Team', 'Members', 'Points'].map(h => (
                      <th key={h} className={`py-3 px-5 text-[10px] font-bold text-[#45474c] uppercase tracking-wider ${h === 'Points' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d3e4fe]">
                  {teams.map((t, i) => (
                    <tr key={t.id} className={`hover:bg-[#eff4ff] transition-colors ${i === 0 ? 'bg-[#eff4ff]/50' : ''}`}>
                      <td className="py-3 px-5">
                        {i < 3 ? (
                          <span className={`w-7 h-7 rounded-full ${RANK_BG[i]} text-white flex items-center justify-center font-bold font-display text-xs`}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        ) : (
                          <span className="font-display text-[#45474c] text-sm px-2">{String(i + 1).padStart(2, '0')}</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: t.color + '30' }}>
                            <span className="material-symbols-outlined text-sm" style={{ fontSize: 16, color: t.color }}>{t.icon}</span>
                          </div>
                          <span className="font-bold text-[#0b1c30] text-sm">{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-[#45474c] text-sm">{t.member_count}</td>
                      <td className="py-3 px-5 text-right font-display font-medium text-[#0b1c30]">
                        {t.total_pts.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: students.length.toString() },
          { label: 'Active Teams', value: teams.length.toString() },
          { label: 'Total Season Pts', value: totalPoints.toLocaleString() },
          { label: 'Top Score', value: topStudent ? topStudent.season_points.toLocaleString() : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#c5c6cd] p-4 rounded-lg text-center shadow-sm">
            <p className="text-[10px] font-bold text-[#45474c] uppercase tracking-wider">{s.label}</p>
            <p className="font-display text-2xl font-bold text-[#0b1c30] mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
