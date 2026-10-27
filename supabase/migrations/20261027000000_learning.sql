-- RoboEasy learning platform: accounts and synced progress (self-paced, no classes).
-- Design notes: docs/privacy.md (minimal data) and docs/product/information-architecture.md.
-- Every table has row-level security; anything that crosses users goes through
-- security-definer functions that check the caller and return only what is needed.
-- XP, coins, levels and the robot's upgrades are computed from the event log
-- in the app (lib/learn/economy.ts); the server only stores the log.

-- ── Profiles ────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 24),
  age_range text not null check (age_range in ('under-10', '10-12', '13-15', '16-plus')),
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  -- Goal, weekends, reminders, the robot buddy and its looks (the same shape as the local profile).
  settings jsonb not null default '{}'::jsonb check (pg_column_size(settings) < 4000),
  parent_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Under 16 needs a grown-up's consent (docs/privacy.md).
  constraint consent_under_16 check (age_range = '16-plus' or parent_consent)
);

alter table public.profiles enable row level security;
create policy "own profile: read" on public.profiles for select using (id = auth.uid());
create policy "own profile: create" on public.profiles for insert with check (id = auth.uid());
create policy "own profile: update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Admins (analytics dashboard). Rows are added by hand with the service role.
create table public.admins (user_id uuid primary key references auth.users on delete cascade);
alter table public.admins enable row level security;
create policy "admins: see self" on public.admins for select using (user_id = auth.uid());

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- ── Learning events (the same append-only log as in the browser) ───────

create table public.learn_events (
  user_id uuid not null references auth.users on delete cascade,
  -- Stable ids ("lesson:start-01", "buy:motor-1") make "earn once" events idempotent.
  id text not null check (char_length(id) <= 120),
  kind text not null check (kind in (
    'step_done', 'mistake', 'lesson_done', 'lesson_start', 'real_robot', 'time', 'known',
    'review_done', 'challenge_done', 'certificate', 'achievement', 'game_done', 'purchase'
  )),
  at timestamptz not null,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 16000),
  primary key (user_id, id)
);
create index learn_events_user_at on public.learn_events (user_id, at);

alter table public.learn_events enable row level security;
create policy "own events: read" on public.learn_events for select using (user_id = auth.uid());
create policy "own events: add" on public.learn_events for insert with check (user_id = auth.uid());
-- No update or delete: the log only grows (deleting the account removes it).
-- Admins read everything for the funnel dashboard.
create policy "events: admins read" on public.learn_events for select using (public.is_admin());

-- Adds events (ids already stored are ignored) and returns how many the caller has.
create function public.record_events(events jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 500 then raise exception 'too many events'; end if;
  insert into public.learn_events (user_id, id, kind, at, data)
  select auth.uid(), e ->> 'id', e ->> 'kind',
         to_timestamp(least((e ->> 'at')::double precision / 1000, extract(epoch from now()) + 300)),
         e - 'id' - 'kind' - 'at'
  from jsonb_array_elements(events) as e
  on conflict do nothing;
  return (select count(*)::integer from public.learn_events where user_id = auth.uid());
end
$$;

-- Account deletion (docs/privacy.md): everything goes with the auth user (on delete cascade).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end
$$;

revoke all on function public.delete_my_account(), public.record_events(jsonb) from public, anon;
grant execute on function public.delete_my_account(), public.record_events(jsonb) to authenticated;
