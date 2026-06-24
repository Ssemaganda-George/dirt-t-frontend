-- Add listing_type to services to distinguish buy vs hire/rental
alter table public.services
  add column if not exists listing_type text null default 'experience' check (listing_type = any (array['experience','buy','hire']));

comment on column public.services.listing_type is 'experience=booking/reservation, buy=purchase, hire=rental';
