-- Trip planner tables. Run in Travel Tails SQL editor (postgres).
-- No payment / wallet / booking columns.

create table if not exists public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  visitor_id text,
  request jsonb not null,
  plan jsonb not null,
  status text not null default 'draft'
    check (status in ('draft', 'booked', 'abandoned')),
  created_at timestamptz not null default now()
);

create index if not exists trip_plans_visitor_created_idx
  on public.trip_plans (visitor_id, created_at desc);

create index if not exists trip_plans_user_created_idx
  on public.trip_plans (user_id, created_at desc);

alter table public.trip_plans enable row level security;

drop policy if exists trip_plans_owner_select on public.trip_plans;
create policy trip_plans_owner_select
  on public.trip_plans
  for select
  to authenticated
  using (user_id = auth.uid());

-- Writes only from the trip-planner edge function (service role bypasses RLS).
revoke insert, update, delete on public.trip_plans from anon, authenticated;

create table if not exists public.trip_wish_requests (
  id uuid primary key default gen_random_uuid(),
  trip_plan_id uuid references public.trip_plans (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  visitor_id text,
  wish_title text not null,
  wish_category text,
  wish_cost_band text,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists trip_wish_requests_title_idx
  on public.trip_wish_requests (wish_category, wish_title);

alter table public.trip_wish_requests enable row level security;

revoke select, insert, update, delete on public.trip_wish_requests from anon, authenticated;

grant select on public.trip_plans to authenticated;
