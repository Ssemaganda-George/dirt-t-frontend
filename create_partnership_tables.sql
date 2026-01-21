-- Create table for partner requests (footer form submissions)
create table if not exists partner_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  website text,
  message text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc', now())
);

-- Enable RLS on partner_requests
alter table partner_requests enable row level security;

-- Allow public inserts (for the form submission)
drop policy if exists "Allow public inserts on partner_requests" on partner_requests;
create policy "Allow public inserts on partner_requests" on partner_requests
  for insert with check (true);

-- Allow admins to read and update
drop policy if exists "Allow admins to manage partner_requests" on partner_requests;
create policy "Allow admins to manage partner_requests" on partner_requests
  for all using (auth.jwt() ->> 'role' = 'admin');

-- Create table for actual partners
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  website text,
  description text,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Enable RLS on partners
alter table partners enable row level security;

-- Allow admins to manage partners
drop policy if exists "Allow admins to manage partners" on partners;
create policy "Allow admins to manage partners" on partners
  for all using (auth.jwt() ->> 'role' = 'admin');
