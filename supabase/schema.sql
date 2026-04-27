-- ============================================================
--  ROBO-PORTAL  |  Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
create type user_role    as enum ('admin','project_manager','team_lead','student','viewer');
create type task_status  as enum ('backlog','ready','in_progress','review','done');
create type task_priority as enum ('low','medium','high','critical');
create type badge_type   as enum (
  'speed_demon','clutch_save','master_builder','bug_hunter',
  'code_ninja','power_surge','team_player','daily_winner'
);

-- ── Profiles ─────────────────────────────────────────────────
-- One row per auth user. Created automatically by the trigger below.
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  full_name      text not null default '',
  avatar_url     text,
  role           user_role not null default 'student',
  total_points   integer not null default 0,
  season_points  integer not null default 0,
  daily_streak   integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Auto-create a profile when a user signs up via Google
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Teams ─────────────────────────────────────────────────────
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text not null default '#00687a',   -- hex
  icon        text not null default 'groups',     -- material symbol
  lead_id     uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── Team membership ───────────────────────────────────────────
create table team_members (
  user_id   uuid not null references profiles(id) on delete cascade,
  team_id   uuid not null references teams(id)    on delete cascade,
  is_lead   boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

-- ── Tasks ─────────────────────────────────────────────────────
-- team_id = null  →  Open Pool task (any student can claim)
create table tasks (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  status            task_status  not null default 'backlog',
  priority          task_priority not null default 'medium',
  points_value      integer not null default 50,
  team_id           uuid references teams(id) on delete set null,
  assigned_to       uuid references profiles(id) on delete set null,
  created_by        uuid not null references profiles(id),
  claimed_at        timestamptz,
  completed_at      timestamptz,
  estimated_minutes integer,
  tags              text[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Keep updated_at current
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function touch_updated_at();

-- ── Time logs ─────────────────────────────────────────────────
create table time_logs (
  id             uuid primary key default gen_random_uuid(),
  task_id        uuid not null references tasks(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  started_at     timestamptz not null default now(),
  stopped_at     timestamptz,
  duration_secs  integer  -- computed on stop
);

-- ── Badges ────────────────────────────────────────────────────
create table badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  badge_type  badge_type not null,
  earned_at   timestamptz not null default now(),
  unique (user_id, badge_type)   -- one of each badge per user
);

-- ── Blockers ──────────────────────────────────────────────────
create table blockers (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid references tasks(id) on delete set null,
  reported_by  uuid not null references profiles(id),
  description  text not null,
  resolved_at  timestamptz,
  resolved_by  uuid references profiles(id),
  reported_at  timestamptz not null default now()
);

-- ============================================================
--  Row Level Security
-- ============================================================

alter table profiles     enable row level security;
alter table teams        enable row level security;
alter table team_members enable row level security;
alter table tasks        enable row level security;
alter table time_logs    enable row level security;
alter table badges       enable row level security;
alter table blockers     enable row level security;

-- profiles: users can read all, edit only their own
create policy "profiles: read all"
  on profiles for select using (true);

create policy "profiles: update own"
  on profiles for update using (auth.uid() = id);

-- teams: everyone can read
create policy "teams: read all"
  on teams for select using (true);

-- team_members: everyone can read
create policy "team_members: read all"
  on team_members for select using (true);

-- tasks: everyone can read; create/update requires auth
create policy "tasks: read all"
  on tasks for select using (true);

create policy "tasks: insert authenticated"
  on tasks for insert with check (auth.uid() = created_by);

create policy "tasks: update authenticated"
  on tasks for update using (auth.uid() is not null);

-- time_logs: users see only their own
create policy "time_logs: own rows"
  on time_logs for all using (auth.uid() = user_id);

-- badges: everyone can read; only insert (server-side logic will handle this)
create policy "badges: read all"
  on badges for select using (true);

create policy "badges: insert own"
  on badges for insert with check (auth.uid() = user_id);

-- blockers: everyone can read and insert
create policy "blockers: read all"
  on blockers for select using (true);

create policy "blockers: insert authenticated"
  on blockers for insert with check (auth.uid() = reported_by);

-- ============================================================
--  Seed data  (4 default teams + a few open-pool tasks)
-- ============================================================

insert into teams (name, description, color, icon) values
  ('Manufacturing', 'Fabrication, machining, and structural assembly', '#3b82f6', 'precision_manufacturing'),
  ('Coding & Software', 'Autonomy, control systems, and firmware', '#10b981', 'code'),
  ('Electrical Systems', 'Wiring, power distribution, and sensors', '#f59e0b', 'bolt'),
  ('Mechanical Design', 'CAD, design reviews, and prototyping', '#8b5cf6', 'draw');
