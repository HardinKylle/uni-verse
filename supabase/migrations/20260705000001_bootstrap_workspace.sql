-- Atomically create the first project, cast, and demo episode for a new user.
create function public.bootstrap_workspace(p_script jsonb, p_characters jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  workspace_owner uuid := (select auth.uid());
  new_project_id uuid;
begin
  if workspace_owner is null then
    raise exception 'authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(workspace_owner::text, 0));

  if exists (select 1 from public.projects where owner_id = workspace_owner) then
    return;
  end if;

  insert into public.projects (owner_id, title, description)
  values (workspace_owner, 'Untitled Episode', 'A new story...')
  returning id into new_project_id;

  insert into public.characters (id, project_id, name, color, avatar_path, position)
  select
    (entry.value ->> 'id')::uuid,
    new_project_id,
    entry.value ->> 'name',
    entry.value ->> 'color',
    entry.value ->> 'avatar',
    entry.ordinality - 1
  from jsonb_array_elements(p_characters) with ordinality as entry(value, ordinality);

  insert into public.episodes (project_id, title, position, script)
  values (new_project_id, 'Episode 1', 0, p_script);
end;
$$;
