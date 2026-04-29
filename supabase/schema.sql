-- ============================================================
--  ROBO-PORTAL v2  |  Supabase Schema
--  Custom username/password auth — NO Supabase Auth dependency
--
--  Setup steps:
--  1. Create a new Supabase project (or reset existing one)
--  2. Run this entire script in: Dashboard → SQL Editor → New Query
--  3. Copy your project URL + anon key into .env
--  4. Log in with: username = instructor | password = instructor123
--     (change the password immediately via Admin Panel)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists pgcrypto;   -- used to hash the seed password

-- ── Enums ────────────────────────────────────────────────────
create type task_status   as enum ('backlog','ready','in_progress','review','done');
create type task_priority as enum ('low','medium','high','critical');
create type badge_type    as enum (
  'speed_demon','clutch_save','master_builder','bug_hunter',
  'code_ninja','power_surge','team_player','daily_winner'
);

-- ── Profiles (custom auth — no auth.users link) ───────────────
create table profiles (
  id            uuid        primary key default gen_random_uuid(),
  username      text        unique not null,
  password_hash text        not null,        -- SHA-256 hex (computed client-side)
  full_name     text        not null default '',
  email         text,                        -- optional display field
  avatar_url    text,
  role          text        not null default 'student'
                            check (role in ('instructor','team_lead','student')),
  total_points  integer     not null default 0,
  season_points integer     not null default 0,
  daily_streak  integer     not null default 0,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

-- ── Teams ─────────────────────────────────────────────────────
create table teams (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  color       text        not null default '#00687a',
  icon        text        not null default 'groups',
  lead_id     uuid        references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── Team membership ───────────────────────────────────────────
create table team_members (
  user_id   uuid        not null references profiles(id) on delete cascade,
  team_id   uuid        not null references teams(id)   on delete cascade,
  is_lead   boolean     not null default false,
  joined_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

-- ── Tasks ─────────────────────────────────────────────────────
create table tasks (
  id                uuid          primary key default gen_random_uuid(),
  title             text          not null,
  description       text,
  status            task_status   not null default 'backlog',
  priority          task_priority not null default 'medium',
  points_value      integer       not null default 50,
  team_id           uuid          references teams(id)    on delete set null,
  assigned_to       uuid          references profiles(id) on delete set null,
  created_by        uuid          not null references profiles(id),
  claimed_at        timestamptz,
  completed_at      timestamptz,
  estimated_minutes integer,
  tags              text[]        not null default '{}',
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function touch_updated_at();

-- ── Time logs ─────────────────────────────────────────────────
create table time_logs (
  id            uuid        primary key default gen_random_uuid(),
  task_id       uuid        not null references tasks(id)    on delete cascade,
  user_id       uuid        not null references profiles(id) on delete cascade,
  started_at    timestamptz not null default now(),
  stopped_at    timestamptz,
  duration_secs integer
);

-- ── Badges ────────────────────────────────────────────────────
create table badges (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  badge_type  badge_type  not null,
  earned_at   timestamptz not null default now(),
  unique (user_id, badge_type)
);

-- ── Blockers ──────────────────────────────────────────────────
create table blockers (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        references tasks(id) on delete set null,
  reported_by uuid        not null references profiles(id),
  description text        not null,
  resolved_at timestamptz,
  resolved_by uuid        references profiles(id),
  reported_at timestamptz not null default now()
);

-- ============================================================
--  Row Level Security
--  We use permissive policies so the anon key can read/write.
--  App-level auth (username + password) controls access in the UI.
-- ============================================================

alter table profiles     enable row level security;
alter table teams        enable row level security;
alter table team_members enable row level security;
alter table tasks        enable row level security;
alter table time_logs    enable row level security;
alter table badges       enable row level security;
alter table blockers     enable row level security;

-- Allow all operations from anon key (app enforces its own auth)
create policy "public_all" on profiles     for all using (true) with check (true);
create policy "public_all" on teams        for all using (true) with check (true);
create policy "public_all" on team_members for all using (true) with check (true);
create policy "public_all" on tasks        for all using (true) with check (true);
create policy "public_all" on time_logs    for all using (true) with check (true);
create policy "public_all" on badges       for all using (true) with check (true);
create policy "public_all" on blockers     for all using (true) with check (true);

-- ============================================================
--  Seed data
-- ============================================================

-- Default instructor account
-- Username: instructor | Password: instructor123
-- The SHA-256 hash is computed via pgcrypto to avoid hardcoding.
insert into profiles (username, password_hash, full_name, role) values (
  'instructor',
  encode(digest('instructor123', 'sha256'), 'hex'),
  'Instructor',
  'instructor'
);

-- Default teams
insert into teams (name, description, color, icon) values
  ('Manufacturing',    'Fabrication, machining, and structural assembly', '#3b82f6', 'precision_manufacturing'),
  ('Coding & Software','Autonomy, control systems, and firmware',         '#10b981', 'code'),
  ('Electrical Systems','Wiring, power distribution, and sensors',        '#f59e0b', 'bolt'),
  ('Mechanical Design','CAD, design reviews, and prototyping',            '#8b5cf6', 'draw');
