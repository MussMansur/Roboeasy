-- RoboEasy learning platform: accounts, synced progress, classes.
-- Design notes: docs/privacy.md (minimal data) and docs/product/information-architecture.md.
-- Every table has row-level security; anything that crosses users goes through
-- security-definer functions that check the caller and return only what is needed.

-- ── Profiles ────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 24),
  age_range text not null check (age_range in ('under-10', '10-12', '13-15', '16-plus')),
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  -- Goal, weekends, reminders, robot looks (the same shape as the local profile).
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
  -- Stable ids ("lesson:start-01") make "earn once" events idempotent.
  id text not null check (char_length(id) <= 120),
  kind text not null check (kind in (
    'step_done', 'mistake', 'lesson_done', 'lesson_start', 'real_robot', 'time', 'known',
    'review_done', 'challenge_done', 'certificate', 'achievement'
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

-- XP rules, the same as lib/learn/xp.ts (tests compare them).
create function public.xp_for_event(kind text, data jsonb) returns integer
language sql immutable set search_path = '' as $$
  select case kind
    when 'lesson_done' then 10 + case when coalesce((data ->> 'project')::boolean, false) then 20 else 0 end
    when 'step_done' then case
      when coalesce((data ->> 'firstTry')::boolean, false)
        and coalesce((data ->> 'hints')::integer, 0) = 0
        and data ->> 'stepType' in ('code', 'debug', 'predict', 'quiz', 'project') then 2
      else 0 end
    when 'review_done' then 5
    when 'real_robot' then 10
    when 'challenge_done' then 25
    else 0
  end
$$;

-- Adds events (ids already stored are ignored) and returns the caller's total XP.
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
  return (select coalesce(sum(public.xp_for_event(kind, data)), 0)::integer from public.learn_events where user_id = auth.uid());
end
$$;

create function public.my_xp() returns integer
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(public.xp_for_event(kind, data)), 0)::integer from public.learn_events where user_id = auth.uid()
$$;

-- ── Classes ─────────────────────────────────────────────────────────────

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  join_code text not null unique check (join_code ~ '^[A-Z2-9]{6}$'),
  -- Synchronous class mode: the lesson everyone opens together.
  live_lesson text check (live_lesson ~ '^[a-z0-9-]{1,40}$'),
  live_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid not null references public.classes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index class_members_user on public.class_members (user_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,40}$'),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_id, lesson_id)
);

create function public.is_member(cls uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_members where class_id = cls and user_id = auth.uid())
$$;

create function public.is_teacher(cls uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes where id = cls and teacher_id = auth.uid())
$$;

-- A teacher of a class this learner belongs to.
create function public.teaches(learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m join public.classes c on c.id = m.class_id
    where m.user_id = learner and c.teacher_id = auth.uid()
  )
$$;

alter table public.classes enable row level security;
create policy "classes: teacher or member reads" on public.classes for select using (teacher_id = auth.uid() or public.is_member(id));
create policy "classes: teacher updates" on public.classes for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "classes: teacher deletes" on public.classes for delete using (teacher_id = auth.uid());
-- Created only through create_class() (it makes the join code).

alter table public.class_members enable row level security;
create policy "members: self or teacher reads" on public.class_members for select using (user_id = auth.uid() or public.is_teacher(class_id));
create policy "members: leave or remove" on public.class_members for delete using (user_id = auth.uid() or public.is_teacher(class_id));
-- Joined only through join_class().

alter table public.assignments enable row level security;
create policy "assignments: class reads" on public.assignments for select using (public.is_member(class_id) or public.is_teacher(class_id));
create policy "assignments: teacher adds" on public.assignments for insert with check (public.is_teacher(class_id));
create policy "assignments: teacher changes" on public.assignments for update using (public.is_teacher(class_id)) with check (public.is_teacher(class_id));
create policy "assignments: teacher removes" on public.assignments for delete using (public.is_teacher(class_id));

-- Teachers see the events of their learners (progress, stuck points, solutions); admins see all.
create policy "events: teacher of the learner reads" on public.learn_events for select using (public.teaches(user_id));
create policy "events: admins read" on public.learn_events for select using (public.is_admin());

-- Only adults (16+) with a profile create classes.
create function public.create_class(class_name text) returns public.classes
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  created public.classes;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and age_range = '16-plus') then
    raise exception 'only adults can create classes';
  end if;
  if (select count(*) from public.classes where teacher_id = auth.uid()) >= 30 then raise exception 'too many classes'; end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = code);
  end loop;
  insert into public.classes (teacher_id, name, join_code) values (auth.uid(), btrim(class_name), code) returning * into created;
  return created;
end
$$;

create function public.join_class(code text) returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare
  cls public.classes;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.profiles where profiles.id = auth.uid()) then raise exception 'no profile'; end if;
  select * into cls from public.classes where join_code = upper(btrim(code));
  if cls.id is null then raise exception 'class not found'; end if;
  if (select count(*) from public.class_members where class_id = cls.id) >= 60 then raise exception 'class is full'; end if;
  insert into public.class_members (class_id, user_id) values (cls.id, auth.uid()) on conflict do nothing;
  return query select cls.id, cls.name;
end
$$;

-- Teacher view: one row per learner. Nickname only — no age, settings or email.
create function public.class_overview(cls uuid) returns table (
  user_id uuid, nickname text, lessons_done integer, xp integer, mistakes integer, last_active timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_teacher(cls) then raise exception 'not your class'; end if;
  return query
    select m.user_id, p.nickname,
      (select count(*) from public.learn_events e where e.user_id = m.user_id and e.kind = 'lesson_done')::integer,
      (select coalesce(sum(public.xp_for_event(e.kind, e.data)), 0) from public.learn_events e where e.user_id = m.user_id)::integer,
      (select count(*) from public.learn_events e where e.user_id = m.user_id and e.kind = 'mistake')::integer,
      (select max(e.at) from public.learn_events e where e.user_id = m.user_id)
    from public.class_members m join public.profiles p on p.id = m.user_id
    where m.class_id = cls
    order by p.nickname;
end
$$;

-- Class leaderboard: XP earned in the last 7 days, nicknames only, members and teacher.
create function public.class_leaderboard(cls uuid) returns table (nickname text, xp integer, is_me boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_member(cls) or public.is_teacher(cls)) then raise exception 'not your class'; end if;
  return query
    select p.nickname,
      (select coalesce(sum(public.xp_for_event(e.kind, e.data)), 0) from public.learn_events e
        where e.user_id = m.user_id and e.at > now() - interval '7 days')::integer as week_xp,
      m.user_id = auth.uid()
    from public.class_members m join public.profiles p on p.id = m.user_id
    where m.class_id = cls
    order by 2 desc, 1;
end
$$;

-- Account deletion (docs/privacy.md): everything goes with the auth user (on delete cascade).
-- Photos are removed first by the app through the Storage API (lib/learn/cloud.ts:
-- storage rows cannot be deleted from SQL).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end
$$;

revoke all on function public.create_class(text), public.join_class(text), public.class_overview(uuid),
  public.class_leaderboard(uuid), public.delete_my_account(), public.record_events(jsonb), public.my_xp() from public, anon;
grant execute on function public.create_class(text), public.join_class(text), public.class_overview(uuid),
  public.class_leaderboard(uuid), public.delete_my_account(), public.record_events(jsonb), public.my_xp() to authenticated;

-- ── Real robot photos (optional, class only) ────────────────────────────
-- Path: {class_id}/{user_id}/{lesson}.jpg. The browser re-encodes the photo
-- (no EXIF/location) before upload. Visible to the learner and the class teacher.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('robot-photos', 'robot-photos', false, 2 * 1024 * 1024, array['image/jpeg']);

create policy "photos: learner uploads to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'robot-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "photos: learner replaces own" on storage.objects for update to authenticated
  using (bucket_id = 'robot-photos' and owner = auth.uid());
create policy "photos: learner or teacher reads" on storage.objects for select to authenticated
  using (
    bucket_id = 'robot-photos'
    and (owner = auth.uid() or public.is_teacher(((storage.foldername(name))[1])::uuid))
  );
create policy "photos: learner deletes own" on storage.objects for delete to authenticated
  using (bucket_id = 'robot-photos' and owner = auth.uid());
