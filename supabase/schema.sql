-- QuizFlow database schema
-- Run this once in Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).

create extension if not exists pgcrypto;

-- ============================================================
-- 1. profiles (extends auth.users) + workspaces
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'workspace ראשי',
  created_at timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);

-- ============================================================
-- 2. quizzes + flow (nodes / edges / theme)
-- ============================================================

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  allow_back boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quizzes_workspace_id_idx on public.quizzes(workspace_id);
create index if not exists quizzes_slug_idx on public.quizzes(slug);

create table if not exists public.quiz_nodes (
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  id text not null,
  type text not null,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  data jsonb not null default '{}'::jsonb,
  primary key (quiz_id, id)
);

create table if not exists public.quiz_edges (
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  id text not null,
  source text not null,
  source_handle text,
  target text not null,
  primary key (quiz_id, id)
);

create table if not exists public.quiz_themes (
  quiz_id uuid primary key references public.quizzes(id) on delete cascade,
  logo_url text,
  primary_color text not null default '#10b981',
  background_color text not null default '#f8fafc',
  text_color text not null default '#0f172a',
  background_image_url text,
  overlay text not null default 'none' check (overlay in ('none', 'light', 'dark')),
  font_family text not null default 'assistant' check (font_family in ('assistant', 'heebo')),
  button_style text not null default 'pill' check (button_style in ('rounded', 'square', 'pill')),
  card_position text not null default 'center' check (card_position in ('center', 'right', 'left')),
  show_progress_bar boolean not null default true,
  show_question_number boolean not null default true,
  custom_css text
);

-- ============================================================
-- 3. leads + submissions
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete set null,
  name text,
  phone text,
  email text,
  score integer not null default 0,
  category text not null default 'cold' check (category in ('hot', 'warm', 'cold')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'meeting_scheduled', 'closed', 'not_relevant')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  assigned_to text,
  created_at timestamptz not null default now()
);

create index if not exists leads_workspace_id_idx on public.leads(workspace_id);
create index if not exists leads_quiz_id_idx on public.leads(quiz_id);

create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  text text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  score integer not null default 0,
  category text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists quiz_submissions_quiz_id_idx on public.quiz_submissions(quiz_id);

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.quiz_submissions(id) on delete cascade,
  node_id text not null,
  question_title text,
  answer_label text,
  score integer not null default 0
);

-- ============================================================
-- 4. integrations + analytics
-- ============================================================

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('webhook', 'meta_pixel', 'tiktok_pixel')),
  name text not null,
  enabled boolean not null default true,
  url text,
  secret text,
  pixel_id text,
  last_triggered_at timestamptz,
  last_status text check (last_status in ('success', 'error')),
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists integrations_workspace_id_idx on public.integrations(workspace_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'start', 'complete')),
  utm_source text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_quiz_id_idx on public.analytics_events(quiz_id);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at);

-- ============================================================
-- 5. housekeeping triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quizzes_set_updated_at on public.quizzes;
create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

-- Auto-provision a profile + a default workspace the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.workspaces (owner_id, name)
  values (new.id, 'workspace ראשי');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 6. Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_nodes enable row level security;
alter table public.quiz_edges enable row level security;
alter table public.quiz_themes enable row level security;
alter table public.leads enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.lead_notes enable row level security;
alter table public.quiz_submissions enable row level security;
alter table public.submission_answers enable row level security;
alter table public.integrations enable row level security;
alter table public.analytics_events enable row level security;

-- profiles: a user can only see/edit their own profile row.
drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles
  for update using (id = auth.uid());

-- workspaces: owner-only.
drop policy if exists "workspaces_owner_all" on public.workspaces;
create policy "workspaces_owner_all" on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- quizzes: workspace owner has full access; anyone (anon incl.) can read an ACTIVE quiz
-- (needed so the public /q/[slug] runtime page can load it without logging in).
drop policy if exists "quizzes_owner_all" on public.quizzes;
create policy "quizzes_owner_all" on public.quizzes
  for all using (
    exists (select 1 from public.workspaces w where w.id = quizzes.workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.workspaces w where w.id = quizzes.workspace_id and w.owner_id = auth.uid())
  );
drop policy if exists "quizzes_public_read_active" on public.quizzes;
create policy "quizzes_public_read_active" on public.quizzes
  for select using (status = 'active');

-- quiz_nodes / quiz_edges / quiz_themes: same pattern, scoped through the parent quiz.
drop policy if exists "quiz_nodes_owner_all" on public.quiz_nodes;
create policy "quiz_nodes_owner_all" on public.quiz_nodes
  for all using (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = quiz_nodes.quiz_id and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = quiz_nodes.quiz_id and w.owner_id = auth.uid()
    )
  );
drop policy if exists "quiz_nodes_public_read_active" on public.quiz_nodes;
create policy "quiz_nodes_public_read_active" on public.quiz_nodes
  for select using (
    exists (select 1 from public.quizzes q where q.id = quiz_nodes.quiz_id and q.status = 'active')
  );

drop policy if exists "quiz_edges_owner_all" on public.quiz_edges;
create policy "quiz_edges_owner_all" on public.quiz_edges
  for all using (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = quiz_edges.quiz_id and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = quiz_edges.quiz_id and w.owner_id = auth.uid()
    )
  );
drop policy if exists "quiz_edges_public_read_active" on public.quiz_edges;
create policy "quiz_edges_public_read_active" on public.quiz_edges
  for select using (
    exists (select 1 from public.quizzes q where q.id = quiz_edges.quiz_id and q.status = 'active')
  );

drop policy if exists "quiz_themes_owner_all" on public.quiz_themes;
create policy "quiz_themes_owner_all" on public.quiz_themes
  for all using (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = quiz_themes.quiz_id and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = quiz_themes.quiz_id and w.owner_id = auth.uid()
    )
  );
drop policy if exists "quiz_themes_public_read_active" on public.quiz_themes;
create policy "quiz_themes_public_read_active" on public.quiz_themes
  for select using (
    exists (select 1 from public.quizzes q where q.id = quiz_themes.quiz_id and q.status = 'active')
  );

-- leads / lead_status_history / lead_notes: workspace owner only for read/update/delete.
-- INSERT is also open to the public, because a lead is created by an anonymous visitor
-- filling out a public quiz — but only when quiz_id points at a real, active quiz.
drop policy if exists "leads_owner_all" on public.leads;
create policy "leads_owner_all" on public.leads
  for all using (
    exists (select 1 from public.workspaces w where w.id = leads.workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.workspaces w where w.id = leads.workspace_id and w.owner_id = auth.uid())
  );
drop policy if exists "leads_public_insert" on public.leads;
create policy "leads_public_insert" on public.leads
  for insert with check (
    quiz_id is not null
    and exists (select 1 from public.quizzes q where q.id = leads.quiz_id and q.status = 'active')
  );

drop policy if exists "lead_status_history_owner_all" on public.lead_status_history;
create policy "lead_status_history_owner_all" on public.lead_status_history
  for all using (
    exists (
      select 1 from public.leads l
      join public.workspaces w on w.id = l.workspace_id
      where l.id = lead_status_history.lead_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "lead_notes_owner_all" on public.lead_notes;
create policy "lead_notes_owner_all" on public.lead_notes
  for all using (
    exists (
      select 1 from public.leads l
      join public.workspaces w on w.id = l.workspace_id
      where l.id = lead_notes.lead_id and w.owner_id = auth.uid()
    )
  );

-- quiz_submissions / submission_answers: owner reads; public (anon) can insert against an active quiz.
drop policy if exists "quiz_submissions_owner_select" on public.quiz_submissions;
create policy "quiz_submissions_owner_select" on public.quiz_submissions
  for select using (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = quiz_submissions.quiz_id and w.owner_id = auth.uid()
    )
  );
drop policy if exists "quiz_submissions_public_insert" on public.quiz_submissions;
create policy "quiz_submissions_public_insert" on public.quiz_submissions
  for insert with check (
    exists (select 1 from public.quizzes q where q.id = quiz_submissions.quiz_id and q.status = 'active')
  );

drop policy if exists "submission_answers_owner_select" on public.submission_answers;
create policy "submission_answers_owner_select" on public.submission_answers
  for select using (
    exists (
      select 1 from public.quiz_submissions s
      join public.quizzes q on q.id = s.quiz_id
      join public.workspaces w on w.id = q.workspace_id
      where s.id = submission_answers.submission_id and w.owner_id = auth.uid()
    )
  );
drop policy if exists "submission_answers_public_insert" on public.submission_answers;
create policy "submission_answers_public_insert" on public.submission_answers
  for insert with check (
    exists (
      select 1 from public.quiz_submissions s
      join public.quizzes q on q.id = s.quiz_id
      where s.id = submission_answers.submission_id and q.status = 'active'
    )
  );

-- integrations: workspace owner only, never exposed publicly.
drop policy if exists "integrations_owner_all" on public.integrations;
create policy "integrations_owner_all" on public.integrations
  for all using (
    exists (select 1 from public.workspaces w where w.id = integrations.workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.workspaces w where w.id = integrations.workspace_id and w.owner_id = auth.uid())
  );

-- analytics_events: owner reads; public (anon) can insert (page views / starts / completions)
-- against an active quiz — this is how the public runtime reports funnel events.
drop policy if exists "analytics_events_owner_select" on public.analytics_events;
create policy "analytics_events_owner_select" on public.analytics_events
  for select using (
    exists (
      select 1 from public.quizzes q
      join public.workspaces w on w.id = q.workspace_id
      where q.id = analytics_events.quiz_id and w.owner_id = auth.uid()
    )
  );
drop policy if exists "analytics_events_public_insert" on public.analytics_events;
create policy "analytics_events_public_insert" on public.analytics_events
  for insert with check (
    exists (select 1 from public.quizzes q where q.id = analytics_events.quiz_id and q.status = 'active')
  );
