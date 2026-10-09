-- Pomodoro UX: ejecutar completo en Supabase > SQL Editor.
-- Cada usuario solo puede leer y modificar sus propios datos (RLS).

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null default 25 check (duration_minutes between 1 and 180),
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.tasks enable row level security;
alter table public.pomodoro_sessions enable row level security;

drop policy if exists "Users manage their own tasks" on public.tasks;
create policy "Users manage their own tasks"
on public.tasks for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own sessions" on public.pomodoro_sessions;
create policy "Users manage their own sessions"
on public.pomodoro_sessions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists tasks_user_created_idx
on public.tasks (user_id, created_at desc);

create index if not exists sessions_user_started_idx
on public.pomodoro_sessions (user_id, started_at desc);

-- No coloques nunca la clave service_role en el frontend.
