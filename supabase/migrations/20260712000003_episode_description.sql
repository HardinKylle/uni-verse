-- Episode-level descriptive metadata displayed in the editor.
alter table public.episodes
  add column description text not null default '';
