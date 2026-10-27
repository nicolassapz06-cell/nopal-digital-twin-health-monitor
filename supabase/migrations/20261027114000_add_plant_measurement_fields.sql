ALTER TABLE public.environmental_readings
  ADD COLUMN IF NOT EXISTS par_umol_m2_s NUMERIC,
  ADD COLUMN IF NOT EXISTS vpd_kpa NUMERIC,
  ADD COLUMN IF NOT EXISTS precipitation_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS hours_since_rain NUMERIC;

ALTER TABLE public.phenotypic_readings
  ADD COLUMN IF NOT EXISTS sprout_length_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS sprout_width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS lesions_present BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lesions_description TEXT,
  ADD COLUMN IF NOT EXISTS wrinkles_present BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wrinkles_description TEXT,
  ADD COLUMN IF NOT EXISTS turgor TEXT,
  ADD COLUMN IF NOT EXISTS texture TEXT;
