-- Migration: Add tour style and booking customisation fields to services
-- These fields support the standardised safari/tour checkout and category filters

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS tour_style text NULL
    CHECK (tour_style IN (
      'wildlife_safari','birding','photography_safari',
      'gorilla_chimp','primate_tour',
      'adventure_trek','mountain_climbing','white_water','hiking','water_activities','cycling_tour',
      'eco_tour','conservation','forest_nature',
      'cultural_heritage','community_tour','historical',
      'family','honeymoon','customizable','other'
    )),
  ADD COLUMN IF NOT EXISTS group_type text NULL
    CHECK (group_type IN ('private','small_group','join_group','large_group')),
  ADD COLUMN IF NOT EXISTS accommodation_standard text NULL
    CHECK (accommodation_standard IN ('budget','midrange','upmarket','luxury','ultra_luxury')),
  ADD COLUMN IF NOT EXISTS park_fees_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visa_support boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS child_friendly boolean NOT NULL DEFAULT false;

-- Index for category page filter (tour_style)
CREATE INDEX IF NOT EXISTS idx_services_tour_style ON public.services (tour_style);

COMMENT ON COLUMN public.services.tour_style IS 'Primary safari/tour classification — maps to /category/tours filter chips';
COMMENT ON COLUMN public.services.group_type IS 'Default group type offered by operator — tourist can override at checkout';
COMMENT ON COLUMN public.services.accommodation_standard IS 'Accommodation tier included in the tour price';
COMMENT ON COLUMN public.services.park_fees_included IS 'True if national park / gorilla permit fees are bundled in the price';
COMMENT ON COLUMN public.services.visa_support IS 'True if operator provides visa / permit application assistance';
