-- ─── Free-tier daily practice-session cap ────────────────────────────────
-- Counts how many practice sessions (scenario role-plays) a user starts each
-- day. Free users are capped at FREE_DAILY_SESSIONS (default 5). Mirrors the
-- usage_daily / try_consume pattern but for whole sessions rather than AI calls.

create table if not exists public.session_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);

alter table public.session_daily enable row level security;

drop policy if exists "read own sessions" on public.session_daily;
create policy "read own sessions" on public.session_daily
  for select using (auth.uid() = user_id);

create or replace function public.try_consume_session(p_user uuid, p_day date, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur int;
begin
  insert into public.session_daily (user_id, day, count)
  values (p_user, p_day, 0)
  on conflict (user_id, day) do nothing;

  select count into cur
  from public.session_daily
  where user_id = p_user and day = p_day
  for update;

  if cur >= p_limit then
    return false;
  end if;

  update public.session_daily
  set count = count + 1
  where user_id = p_user and day = p_day;

  return true;
end;
$$;
