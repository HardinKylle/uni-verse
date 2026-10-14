-- Shared, server-only counters; keys are HMACs, never raw IPs or usernames.
create table public.auth_request_limits (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  attempts integer not null check (attempts > 0),
  expires_at timestamptz not null
);

create index auth_request_limits_expiry_idx on public.auth_request_limits (expires_at);
alter table public.auth_request_limits enable row level security;
-- No browser policies: only the server's service_role may manage counters.
revoke all on table public.auth_request_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.auth_request_limits to service_role;

create function public.consume_auth_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  window_now timestamptz := clock_timestamp();
  current_attempts integer;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$'
    or p_limit is null or p_limit < 1 or p_limit > 120
    or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 3600
  then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  -- Remove only expired limiter metadata, retaining an hour for diagnostics.
  delete from public.auth_request_limits
  where expires_at < window_now - interval '1 hour';

  insert into public.auth_request_limits (key, attempts, expires_at)
  values (p_key, 1, window_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update
  set
    attempts = case
      when auth_request_limits.expires_at <= window_now then 1
      else least(auth_request_limits.attempts + 1, p_limit + 1)
    end,
    expires_at = case
      when auth_request_limits.expires_at <= window_now
        then window_now + make_interval(secs => p_window_seconds)
      else auth_request_limits.expires_at
    end
  returning attempts into current_attempts;

  return current_attempts <= p_limit;
end;
$$;

revoke execute on function public.consume_auth_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;
