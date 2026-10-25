-- English Together: данные каждого ученика изолированы через RLS.
-- Этот скрипт рассчитан на отдельный Supabase-проект.

create table if not exists public.english_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  study_days integer[] not null default '{1,2,3,4,5}',
  minutes_per_day integer not null default 20 check (minutes_per_day between 5 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.english_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  best_score integer not null default 0 check (best_score between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  confidence integer check (confidence between 1 and 5),
  completed_at timestamptz,
  last_studied_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.english_review_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  due_at timestamptz not null,
  interval_days integer not null default 1 check (interval_days between 1 and 120),
  repetitions integer not null default 0 check (repetitions between 0 and 7),
  last_result boolean,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists english_reviews_user_due_idx
  on public.english_review_items (user_id, due_at);

create table if not exists public.english_level_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id text not null,
  best_score integer not null default 0 check (best_score between 0 and 100),
  played_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create table if not exists public.english_study_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text,
  event_type text not null check (event_type in ('lesson', 'review', 'game')),
  score integer check (score between 0 and 100),
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 240),
  occurred_at timestamptz not null default now()
);

create index if not exists english_events_user_date_idx
  on public.english_study_events (user_id, occurred_at desc);

alter table public.english_profiles enable row level security;
alter table public.english_lesson_progress enable row level security;
alter table public.english_review_items enable row level security;
alter table public.english_level_games enable row level security;
alter table public.english_study_events enable row level security;

revoke all on public.english_profiles from anon;
revoke all on public.english_lesson_progress from anon;
revoke all on public.english_review_items from anon;
revoke all on public.english_level_games from anon;
revoke all on public.english_study_events from anon;

grant usage on schema public to authenticated;
grant select, insert, update on public.english_profiles to authenticated;
grant select, insert, update on public.english_lesson_progress to authenticated;
grant select, insert, update on public.english_review_items to authenticated;
grant select, insert, update on public.english_level_games to authenticated;
grant select, insert on public.english_study_events to authenticated;
grant usage, select on sequence public.english_study_events_id_seq to authenticated;

create policy "english_profiles_select_own" on public.english_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "english_profiles_insert_own" on public.english_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "english_profiles_update_own" on public.english_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "english_progress_select_own" on public.english_lesson_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "english_progress_insert_own" on public.english_lesson_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "english_progress_update_own" on public.english_lesson_progress
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "english_reviews_select_own" on public.english_review_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "english_reviews_insert_own" on public.english_review_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "english_reviews_update_own" on public.english_review_items
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "english_games_select_own" on public.english_level_games
  for select to authenticated using (user_id = (select auth.uid()));
create policy "english_games_insert_own" on public.english_level_games
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "english_games_update_own" on public.english_level_games
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "english_events_select_own" on public.english_study_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "english_events_insert_own" on public.english_study_events
  for insert to authenticated with check (user_id = (select auth.uid()));
