// Database types — custom auth (no Supabase Auth dependency)

export type UserRole = 'instructor' | 'team_lead' | 'student'
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
      access_requests: {
        Row: AccessRequest
        Insert: Omit<AccessRequest, 'id' | 'created_at'>
        Update: Partial<Omit<AccessRequest, 'id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      task_status: TaskStatus
      task_priority: TaskPriority
    }
  }
}

export interface Profile {
  id: string               // our own UUID (not tied to auth.users)
  username: string         // unique login handle
  password_hash: string    // SHA-256 hex — never render in UI
  full_name: string
  email: string | null     // optional contact email
  avatar_url: string | null
  role: UserRole
  total_points: number
  season_points: number
  daily_streak: number
  is_active: boolean
  must_change_password: boolean
  created_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  lead_id: string | null
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
  team_id: string | null
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
  duration_secs: number | null
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

export interface AccessRequest {
  id: string
  full_name: string
  email: string
  message: string | null
  status: 'pending' | 'approved' | 'denied'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}
