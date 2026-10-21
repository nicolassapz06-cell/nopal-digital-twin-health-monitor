-- ============ SPECIES (catálogo de especies) ============
CREATE TABLE public.species (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  scientific_name TEXT,
  description TEXT,
  default_model_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
CREATE INDEX species_user_id_idx ON public.species(user_id);

CREATE POLICY "species_select_own" ON public.species FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "species_insert_own" ON public.species FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "species_update_own" ON public.species FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "species_delete_own" ON public.species FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ PROJECTS (hasta 50+ por usuario) ============
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','pausado','finalizado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX projects_user_id_idx ON public.projects(user_id);

CREATE POLICY "projects_select_own" ON public.projects FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MODELS_3D (archivos .glb/.gltf de Blender) ============
CREATE TABLE public.models_3d (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  species_id UUID REFERENCES public.species ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_kb INTEGER,
  growth_stage TEXT DEFAULT 'adulto' CHECK (growth_stage IN ('plantula','juvenil','adulto','maduro')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.models_3d ENABLE ROW LEVEL SECURITY;
CREATE INDEX models_3d_user_id_idx ON public.models_3d(user_id);
CREATE INDEX models_3d_species_id_idx ON public.models_3d(species_id);

CREATE POLICY "models_3d_select_own" ON public.models_3d FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "models_3d_insert_own" ON public.models_3d FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "models_3d_update_own" ON public.models_3d FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "models_3d_delete_own" ON public.models_3d FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ Agregar campos a plants ============
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects ON DELETE CASCADE;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS species_id UUID REFERENCES public.species ON DELETE SET NULL;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS model_3d_id UUID REFERENCES public.models_3d ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS plants_project_id_idx ON public.plants(project_id);
CREATE INDEX IF NOT EXISTS plants_species_id_idx ON public.plants(species_id);

-- ============ ENVIRONMENTAL_READINGS (variables ambientales y de manejo) ============
CREATE TABLE public.environmental_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  soil_moisture NUMERIC,
  soil_ph NUMERIC,
  air_temperature NUMERIC,
  light_intensity NUMERIC,
  irrigation_frequency_days NUMERIC,
  hours_since_irrigation NUMERIC,
  ec NUMERIC,
  humidity_percent NUMERIC,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','sensor','iot')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.environmental_readings ENABLE ROW LEVEL SECURITY;
CREATE INDEX env_readings_user_id_idx ON public.environmental_readings(user_id);
CREATE INDEX env_readings_plant_id_idx ON public.environmental_readings(plant_id);
CREATE INDEX env_readings_measured_at_idx ON public.environmental_readings(measured_at DESC);

CREATE POLICY "env_readings_select_own" ON public.environmental_readings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "env_readings_insert_own" ON public.environmental_readings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "env_readings_update_own" ON public.environmental_readings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "env_readings_delete_own" ON public.environmental_readings FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ PHENOTYPIC_READINGS (variables fenotípicas y de estado) ============
CREATE TABLE public.phenotypic_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  height_cm NUMERIC,
  cladode_count INTEGER,
  cladode_length_cm NUMERIC,
  cladode_width_cm NUMERIC,
  cladode_thickness_mm NUMERIC,
  new_sprouts INTEGER DEFAULT 0,
  color_hex TEXT,
  color_hue NUMERIC,
  color_saturation NUMERIC,
  color_value NUMERIC,
  green_index NUMERIC,
  spots_present BOOLEAN DEFAULT false,
  spots_description TEXT,
  spots_coverage_percent NUMERIC,
  visual_state TEXT CHECK (visual_state IN ('excelente','bueno','regular','deteriorado','critico')),
  general_state TEXT CHECK (general_state IN ('saludable','estres_leve','estres_moderado','estres_severo','enfermo')),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.phenotypic_readings ENABLE ROW LEVEL SECURITY;
CREATE INDEX pheno_readings_user_id_idx ON public.phenotypic_readings(user_id);
CREATE INDEX pheno_readings_plant_id_idx ON public.phenotypic_readings(plant_id);
CREATE INDEX pheno_readings_measured_at_idx ON public.phenotypic_readings(measured_at DESC);

CREATE POLICY "pheno_readings_select_own" ON public.phenotypic_readings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "pheno_readings_insert_own" ON public.phenotypic_readings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "pheno_readings_update_own" ON public.phenotypic_readings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "pheno_readings_delete_own" ON public.phenotypic_readings FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ GROWTH_PREDICTIONS (predicción de crecimiento) ============
CREATE TABLE public.growth_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_date DATE NOT NULL,
  predicted_height_cm NUMERIC,
  predicted_cladode_count INTEGER,
  predicted_sprouts INTEGER,
  confidence_percent NUMERIC,
  algorithm TEXT DEFAULT 'linear_regression',
  based_on_readings INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.growth_predictions ENABLE ROW LEVEL SECURITY;
CREATE INDEX growth_pred_user_id_idx ON public.growth_predictions(user_id);
CREATE INDEX growth_pred_plant_id_idx ON public.growth_predictions(plant_id);

CREATE POLICY "growth_pred_select_own" ON public.growth_predictions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "growth_pred_insert_own" ON public.growth_predictions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "growth_pred_delete_own" ON public.growth_predictions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ============ STORAGE: modelos 3D (privado por usuario) ============
INSERT INTO storage.buckets (id, name, public) VALUES ('models-3d', 'models-3d', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "models_3d_storage_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'models-3d' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "models_3d_storage_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'models-3d' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "models_3d_storage_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'models-3d' AND (storage.foldername(name))[1] = (select auth.uid())::text);
