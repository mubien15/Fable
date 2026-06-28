-- ════════════════════════════════════════════════════════════════════════
-- Fable — Supabase schema (P2: accounts + payments)
-- Run this once in the Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════

-- ─── profiles: identity + billing ────────────────────────────────────────
-- One row per auth user. Holds the subscription tier that gates the app.
create table if not exists public.profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  name                     text,
  role                     text,                       -- auditor | consultant | manager | all
  onboarded                boolean      not null default false,
  upcoming_moment          text,
  tier                     text         not null default 'free',  -- free | monthly | annual | full
  stripe_customer_id       text,
  stripe_subscription_id   text,
  subscription_status      text,                       -- active | trialing | past_due | canceled | null
  current_period_end       timestamptz,
  created_at               timestamptz  not null default now(),
  updated_at               timestamptz  not null default now()
);

-- ─── user_state: the app's data blob (mirrors localStorage) ──────────────
-- Keeps the existing data model intact: sessions, dailyRep, completedData,
-- rehearsals and prefs live inside one JSON document per user. Lets us sync
-- to the cloud without rewriting the app's data logic.
create table if not exists public.user_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb        not null default '{}'::jsonb,
  updated_at  timestamptz  not null default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────
-- A signed-in user can read/write ONLY their own rows. The publishable key
-- is safe in the browser because of these policies.
alter table public.profiles   enable row level security;
alter table public.user_state enable row level security;

drop policy if exists "own profile read"    on public.profiles;
drop policy if exists "own profile write"   on public.profiles;
drop policy if exists "own profile update"  on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile write"  on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "own state read"   on public.user_state;
drop policy if exists "own state write"  on public.user_state;
drop policy if exists "own state update" on public.user_state;
create policy "own state read"   on public.user_state for select using (auth.uid() = user_id);
create policy "own state write"  on public.user_state for insert with check (auth.uid() = user_id);
create policy "own state update" on public.user_state for update using (auth.uid() = user_id);

-- ─── Auto-provision rows on signup ───────────────────────────────────────
-- When a new auth user is created, seed an empty profile + state row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', null))
  on conflict (id) do nothing;

  insert into public.user_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── keep updated_at fresh ───────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch   on public.profiles;
drop trigger if exists user_state_touch on public.user_state;
create trigger profiles_touch   before update on public.profiles   for each row execute function public.touch_updated_at();
create trigger user_state_touch before update on public.user_state for each row execute function public.touch_updated_at();
