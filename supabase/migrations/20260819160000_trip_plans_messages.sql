-- Conversational refinement: store the back-and-forth between the traveler and
-- the trip advisor alongside the plan it produced. Written only by the
-- trip-planner edge function (service role), same as plan/request/status.
alter table public.trip_plans
  add column if not exists messages jsonb not null default '[]'::jsonb;
