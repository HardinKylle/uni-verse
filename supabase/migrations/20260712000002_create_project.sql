-- Atomically create an additional project, cast, and first episode.
create function public.create_project(p_title text, p_script jsonb, p_characters jsonb)
returns uuid
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

  insert into public.projects (owner_id, title, description)
  values (workspace_owner, coalesce(nullif(btrim(p_title), ''), 'Untitled Story'), '')
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

  return new_project_id;
end;
$$;
