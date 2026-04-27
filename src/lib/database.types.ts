// Auto-generated types for the Supabase schema.
// Re-run `supabase gen types typescript` after schema changes.

export type UserRole = 'admin' | 'project_manager' | 'team_lead' | 'student' | 'viewer'
export type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at'>
        Update: Partial<Omit<Team, 'id' | 'created_at'>>
      }
      team_members: {
        Row: TeamMember
        Insert: Omit<TeamMember, 'joined_at'>
        Update: Partial<Omit<TeamMember, 'user_id' | 'team_id'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at'>>
      }
      time_logs: {
        Row: TimeLog
        Insert: Omit<TimeLog, 'id'>
        Update: Partial<Omit<TimeLog, 'id' | 'task_id' | 'user_id'>>
      }
      badges: {
        Row: Badge
        Insert: Omit<Badge, 'id' | 'earned_at'>
        Update: never
      }
      blockers: {
        Row: Blocker
        Insert: Omit<Blocker, 'id' | 'reported_at'>
        Update: Partial<Omit<Blocker, 'id' | 'reported_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      task_status: TaskStatus
      task_priority: TaskPriority
    }
  }
}

export interface Profile {
  id: string               // matches auth.users.id
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  total_points: number
  season_points: number
  daily_streak: number
  created_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  color: string            // hex e.g. '#3b82f6'
  icon: string             // material symbol name
  lead_id: string | null   // profile.id
  created_at: string
}

export interface TeamMember {
  user_id: string
  team_id: string
  is_lead: boolean
  joined_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  points_value: number
  team_id: string | null   // null = open pool task
  assigned_to: string | null
  created_by: string
  claimed_at: string | null
  completed_at: string | null
  estimated_minutes: number | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface TimeLog {
  id: string
  task_id: string
  user_id: string
  started_at: string
  stopped_at: string | null
  duration_secs: number | null  // populated on stop
}

export type BadgeType =
  | 'speed_demon'
  | 'clutch_save'
  | 'master_builder'
  | 'bug_hunter'
  | 'code_ninja'
  | 'power_surge'
  | 'team_player'
  | 'daily_winner'

export interface Badge {
  id: string
  user_id: string
  badge_type: BadgeType
  earned_at: string
}

export interface Blocker {
  id: string
  task_id: string | null
  reported_by: string
  description: string
  resolved_at: string | null
  resolved_by: string | null
  reported_at: string
}
