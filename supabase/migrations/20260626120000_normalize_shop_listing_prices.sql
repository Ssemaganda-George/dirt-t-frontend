-- Normalize shop listing_type and buy_price for retail checkout consistency.

UPDATE services
SET listing_type = 'buy'
WHERE buy_price IS NOT NULL
  AND rental_price_per_day IS NOT NULL
  AND listing_type = 'experience'
  AND category_id = 'cat_shops';

UPDATE services
SET buy_price = price
WHERE category_id = 'cat_shops'
  AND buy_price IS NULL
  AND rental_price_per_day IS NULL
  AND price IS NOT NULL
  AND price > 0;
