-- ─── Free-tier daily usage cap ───────────────────────────────────────────
-- One row per user per day, tracking how many metered AI calls they've made.
-- Only the service role writes to it (via the try_consume function below);
-- users may read their own row.

create table if not exists public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);

alter table public.usage_daily enable row level security;

drop policy if exists "read own usage" on public.usage_daily;
create policy "read own usage" on public.usage_daily
  for select using (auth.uid() = user_id);

-- Atomically check the day's count against a limit and consume one unit.
-- Returns true if the call may proceed, false if the user is already at/over
-- the limit. The row lock makes this safe under concurrent requests.
create or replace function public.try_consume(p_user uuid, p_day date, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur int;
begin
  insert into public.usage_daily (user_id, day, count)
  values (p_user, p_day, 0)
  on conflict (user_id, day) do nothing;

  select count into cur
  from public.usage_daily
  where user_id = p_user and day = p_day
  for update;

  if cur >= p_limit then
    return false;
  end if;

  update public.usage_daily
  set count = count + 1
  where user_id = p_user and day = p_day;

  return true;
end;
$$;
