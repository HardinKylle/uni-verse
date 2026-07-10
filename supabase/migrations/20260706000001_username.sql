-- Issue 16: a unique, URL-safe username per account.
-- profiles already exists (initial schema) with a signup trigger; this adds
-- the username column, case-insensitive uniqueness, and metadata intake.

alter table public.profiles add column username text;

-- Format and reserved names mirror src/app/login/validate-username.ts —
-- keep both in sync.
alter table public.profiles add constraint profiles_username_valid check (
  username is null
  or (
    username ~ '^[a-z0-9_]{3,20}$'
    and username not in ('admin', 'kathalis', 'api', 'login', 'auth', 'settings')
  )
);

create unique index profiles_username_unique on public.profiles (lower(username));

-- The claim flow upserts the caller's own row; the row normally already
-- exists via the signup trigger, but upsert requires an insert policy.
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);

-- Accept a username passed through auth.signUp options.data. An invalid or
-- reserved candidate is dropped rather than rejected, and losing a uniqueness
-- race falls back to no username — either way account creation succeeds and
-- the user lands on the choose-your-username step instead.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text := lower(new.raw_user_meta_data ->> 'username');
begin
  if candidate !~ '^[a-z0-9_]{3,20}$'
    or candidate in ('admin', 'kathalis', 'api', 'login', 'auth', 'settings')
  then
    candidate := null;
  end if;

  begin
    insert into public.profiles (id, display_name, username)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      candidate
    );
  exception when unique_violation then
    insert into public.profiles (id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
    );
  end;

  return new;
end;
$$;
