import { supabase } from './supabase'

export type BadgeKey =
  | 'speed_demon'
  | 'clutch_save'
  | 'master_builder'
  | 'bug_hunter'
  | 'code_ninja'
  | 'power_surge'
  | 'team_player'

export const BADGE_META: Record<BadgeKey, { label: string; icon: string; description: string }> = {
  speed_demon:    { label: 'Speed Demon',    icon: 'bolt',          description: 'Finished a task under estimated time' },
  clutch_save:    { label: 'Clutch Save',    icon: 'emergency',     description: 'Resolved an active blocker' },
  master_builder: { label: 'Master Builder', icon: 'construction',  description: 'Completed 10 or more tasks' },
  bug_hunter:     { label: 'Bug Hunter',     icon: 'bug_report',    description: 'Completed a critical or bug task' },
  code_ninja:     { label: 'Code Ninja',     icon: 'code',          description: 'Completed 5+ coding tasks' },
  power_surge:    { label: 'Power Surge',    icon: 'electric_bolt', description: '3 or more tasks completed today' },
  team_player:    { label: 'Team Player',    icon: 'groups',        description: 'Completed a team-assigned task' },
}

async function awardIfNew(userId: string, badge: BadgeKey) {
  // unique(user_id, badge_type) constraint — ignore conflict if already earned
  await supabase.from('badges').upsert(
    { user_id: userId, badge_type: badge, earned_at: new Date().toISOString() },
    { onConflict: 'user_id,badge_type', ignoreDuplicates: true }
  )
}

export interface TaskCompletionCtx {
  taskId: string
  userId: string
  priority: string
  tags: string[]
  teamId: string | null
  estimatedMinutes: number | null
}

const CODE_TAGS = ['code', 'coding', 'programming', 'software', 'dev', 'frontend', 'backend']

export async function checkAndAwardBadges(ctx: TaskCompletionCtx) {
  const { taskId, userId, priority, tags, teamId, estimatedMinutes } = ctx

  // bug_hunter — critical priority or has bug-related tag
  if (priority === 'critical' || tags.some(t => t.toLowerCase().includes('bug'))) {
    await awardIfNew(userId, 'bug_hunter')
  }

  // team_player — task belongs to a team
  if (teamId) {
    await awardIfNew(userId, 'team_player')
  }

  // speed_demon — actual logged time less than estimated
  if (estimatedMinutes) {
    const { data: logs } = await supabase
      .from('time_logs')
      .select('duration_secs')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .not('duration_secs', 'is', null)
    if (logs && logs.length > 0) {
      const totalSecs = logs.reduce((sum, l) => sum + (l.duration_secs || 0), 0)
      if (totalSecs > 0 && totalSecs < estimatedMinutes * 60) {
        await awardIfNew(userId, 'speed_demon')
      }
    }
  }

  // master_builder — 10+ tasks done
  const { count: doneCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('status', 'done')
  if ((doneCount || 0) >= 10) {
    await awardIfNew(userId, 'master_builder')
  }

  // code_ninja — 5+ coding-tagged tasks done
  if (tags.some(t => CODE_TAGS.includes(t.toLowerCase()))) {
    const { data: allDone } = await supabase
      .from('tasks')
      .select('tags')
      .eq('assigned_to', userId)
      .eq('status', 'done')
    const codingDone = (allDone || []).filter(t =>
      (t.tags || []).some((tag: string) => CODE_TAGS.includes(tag.toLowerCase()))
    ).length
    if (codingDone >= 5) {
      await awardIfNew(userId, 'code_ninja')
    }
  }

  // power_surge — 3+ tasks completed today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: todayCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('status', 'done')
    .gte('completed_at', todayStart.toISOString())
  if ((todayCount || 0) >= 3) {
    await awardIfNew(userId, 'power_surge')
  }
}

export async function awardClutchSave(userId: string) {
  await awardIfNew(userId, 'clutch_save')
}

/** Increment or reset daily_streak based on whether the user completed a task yesterday. */
export async function updateDailyStreak(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_streak')
    .eq('id', userId)
    .single()
  if (!profile) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Count tasks completed today (the current task may already be counted)
  const { count: todayCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('status', 'done')
    .gte('completed_at', today.toISOString())
    .lt('completed_at', todayEnd.toISOString())

  // If more than 1 today, streak was already updated for today
  if ((todayCount || 0) > 1) return

  // Check if user completed a task yesterday
  const { count: yestCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('status', 'done')
    .gte('completed_at', yesterday.toISOString())
    .lt('completed_at', today.toISOString())

  const newStreak = (yestCount || 0) > 0
    ? (profile.daily_streak || 0) + 1
    : 1

  await supabase.from('profiles').update({ daily_streak: newStreak }).eq('id', userId)
}
