-- Add kpi_ratings column to service_reviews table
-- This stores category-specific rating breakdowns as JSONB
-- Example: {"cleanliness": 5, "accuracy": 4, "check_in": 5, "communication": 4, "location": 5, "value": 4}

ALTER TABLE service_reviews 
ADD COLUMN IF NOT EXISTS kpi_ratings JSONB DEFAULT NULL;

-- Add a comment describing the column
COMMENT ON COLUMN service_reviews.kpi_ratings IS 'Category-specific KPI ratings stored as JSON. Keys depend on service category (e.g., hotels: cleanliness, accuracy, check_in, communication, location, value)';

-- Create an index on kpi_ratings for potential future queries
CREATE INDEX IF NOT EXISTS idx_service_reviews_kpi_ratings ON service_reviews USING GIN (kpi_ratings) WHERE kpi_ratings IS NOT NULL;
