-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.thresholds (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- ============ UPDATED_AT ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PLANTS (gemelos digitales) ============
CREATE TABLE public.plants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  variety TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  substrate TEXT,
  planted_on DATE,
  cladode_count INTEGER,
  height_cm NUMERIC,
  photo_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','cuarentena','archivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
CREATE INDEX plants_user_id_idx ON public.plants(user_id);

CREATE POLICY "plants_select_own" ON public.plants FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "plants_insert_own" ON public.plants FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "plants_update_own" ON public.plants FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "plants_delete_own" ON public.plants FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE TRIGGER plants_set_updated_at BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MEASUREMENTS (pH, riego, clima) ============
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ph NUMERIC,
  soil_moisture NUMERIC,
  ec NUMERIC,
  air_temp NUMERIC,
  humidity NUMERIC,
  light_lux NUMERIC,
  irrigation_ml NUMERIC,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','sensor')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
CREATE INDEX measurements_user_id_idx ON public.measurements(user_id);
CREATE INDEX measurements_plant_id_idx ON public.measurements(plant_id);
CREATE INDEX measurements_measured_at_idx ON public.measurements(measured_at DESC);

CREATE POLICY "measurements_select_own" ON public.measurements FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "measurements_insert_own" ON public.measurements FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "measurements_update_own" ON public.measurements FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "measurements_delete_own" ON public.measurements FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ COLOR READINGS (colorimetría) ============
CREATE TABLE public.color_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hex TEXT NOT NULL,
  r INTEGER NOT NULL,
  g INTEGER NOT NULL,
  b INTEGER NOT NULL,
  hue NUMERIC NOT NULL,
  saturation NUMERIC NOT NULL,
  value NUMERIC NOT NULL,
  green_index NUMERIC,
  health_label TEXT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.color_readings ENABLE ROW LEVEL SECURITY;
CREATE INDEX color_readings_user_id_idx ON public.color_readings(user_id);
CREATE INDEX color_readings_plant_id_idx ON public.color_readings(plant_id);

CREATE POLICY "color_readings_select_own" ON public.color_readings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "color_readings_insert_own" ON public.color_readings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "color_readings_update_own" ON public.color_readings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "color_readings_delete_own" ON public.color_readings FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ THRESHOLDS (umbrales por usuario) ============
CREATE TABLE public.thresholds (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ph_min NUMERIC NOT NULL DEFAULT 6.0,
  ph_max NUMERIC NOT NULL DEFAULT 7.5,
  moisture_min NUMERIC NOT NULL DEFAULT 15,
  moisture_max NUMERIC NOT NULL DEFAULT 45,
  temp_min NUMERIC NOT NULL DEFAULT 10,
  temp_max NUMERIC NOT NULL DEFAULT 35,
  humidity_min NUMERIC NOT NULL DEFAULT 20,
  humidity_max NUMERIC NOT NULL DEFAULT 70,
  light_min NUMERIC NOT NULL DEFAULT 5000,
  light_max NUMERIC NOT NULL DEFAULT 90000,
  ec_min NUMERIC NOT NULL DEFAULT 0.5,
  ec_max NUMERIC NOT NULL DEFAULT 2.5,
  hue_min NUMERIC NOT NULL DEFAULT 75,
  hue_max NUMERIC NOT NULL DEFAULT 150,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thresholds_select_own" ON public.thresholds FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "thresholds_insert_own" ON public.thresholds FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "thresholds_update_own" ON public.thresholds FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TRIGGER thresholds_set_updated_at BEFORE UPDATE ON public.thresholds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ALERTS ============
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  variable TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'media' CHECK (severity IN ('baja','media','alta')),
  message TEXT NOT NULL,
  recommendation TEXT,
  observed_value NUMERIC,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX alerts_user_id_idx ON public.alerts(user_id);
CREATE INDEX alerts_plant_id_idx ON public.alerts(plant_id);

CREATE POLICY "alerts_select_own" ON public.alerts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "alerts_insert_own" ON public.alerts FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "alerts_update_own" ON public.alerts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "alerts_delete_own" ON public.alerts FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ SIGNUP TRIGGER ============
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE: fotos de plantas (privado por usuario) ============
INSERT INTO storage.buckets (id, name, public) VALUES ('plant-photos', 'plant-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "plant_photos_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "plant_photos_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "plant_photos_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "plant_photos_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
