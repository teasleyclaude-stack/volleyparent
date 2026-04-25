create table public.fanview_sessions (
  id text primary key,
  meta jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  feed jsonb not null default '[]'::jsonb,
  summary jsonb,
  is_live boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.fanview_sessions enable row level security;

-- Anyone (anon + authenticated) can read non-expired sessions.
create policy "Public can read fanview sessions"
on public.fanview_sessions for select
using (expires_at > now());

-- Anyone can create a fanview session (the app user broadcasting).
-- Session id is an unguessable UUID generated client-side.
create policy "Anyone can create fanview sessions"
on public.fanview_sessions for insert
with check (true);

-- Anyone can update an existing session (the broadcaster pushes state).
-- Security: ids are unguessable UUIDs and data is non-sensitive.
create policy "Anyone can update fanview sessions"
on public.fanview_sessions for update
using (expires_at > now())
with check (true);

-- Enable realtime
alter publication supabase_realtime add table public.fanview_sessions;
alter table public.fanview_sessions replica identity full;

create index fanview_sessions_expires_idx on public.fanview_sessions (expires_at);
