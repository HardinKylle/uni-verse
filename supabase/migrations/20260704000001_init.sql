-- Phase 2 initial schema: profiles, projects, characters, episodes.
-- Ownership flows through projects.owner_id; RLS on every table.

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, created by trigger on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at hygiene shared by projects/characters/episodes.
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects: an AU / story world.
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled Story',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_idx on public.projects (owner_id);

alter table public.projects enable row level security;

create policy "projects_all_own" on public.projects
  for all using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- characters: the project-level cast, shared across episodes.
-- ids are client-generated (crypto.randomUUID()) so episode scripts can
-- reference senderIds without a round-trip.
-- ---------------------------------------------------------------------------
create table public.characters (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null default '',
  color text not null,
  avatar_path text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index characters_project_idx on public.characters (project_id);

alter table public.characters enable row level security;

create policy "characters_all_own" on public.characters
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

create trigger characters_set_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- episodes: one conversation. The script column is the serialized EpisodeDoc
-- (messages, frameBreaks, ownerId, activeSenderId, skin settings) — see
-- src/features/studio/persistence/episode-doc.ts.
-- ---------------------------------------------------------------------------
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null default 'Episode 1',
  position integer not null default 0,
  script jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index episodes_project_idx on public.episodes (project_id);

alter table public.episodes enable row level security;

create policy "episodes_all_own" on public.episodes
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

create trigger episodes_set_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();
