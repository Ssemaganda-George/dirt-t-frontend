-- Separate buy vs hire pricing and listing type for shop/rental items
alter table public.services
  add column if not exists listing_type text null default 'experience' check (listing_type = any (array['experience','buy','hire'])),
  add column if not exists buy_price numeric(10,2) null,
  add column if not exists rental_price_per_day numeric(10,2) null;

comment on column public.services.listing_type is 'experience=booking/reservation, buy=purchase, hire=rental';
