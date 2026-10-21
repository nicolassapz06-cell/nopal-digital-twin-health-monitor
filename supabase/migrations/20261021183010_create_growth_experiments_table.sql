-- Tabla para registrar experimentos de crecimiento bajo diferentes condiciones
CREATE TABLE public.growth_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  
  -- Nombre/descripcion del experimento
  name TEXT NOT NULL,
  description TEXT,
  condition_label TEXT,
  
  -- Condiciones experimentales aplicadas
  temperature_c NUMERIC(5,2),
  humidity_percent NUMERIC(5,2),
  soil_ph NUMERIC(4,2),
  light_intensity_lux INTEGER,
  irrigation_frequency_days INTEGER,
  
  -- Duracion del experimento
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  duration_days INTEGER,
  
  -- Mediciones iniciales
  initial_height_cm NUMERIC(6,2),
  initial_cladode_count INTEGER,
  initial_sprouts INTEGER,
  
  -- Resultados observados
  final_height_cm NUMERIC(6,2),
  final_cladode_count INTEGER,
  final_sprouts INTEGER,
  height_change_cm NUMERIC(6,2),
  new_sprouts INTEGER,
  cladode_change INTEGER,
  
  -- Observaciones cualitativas
  health_status TEXT CHECK (health_status IN ('excellent', 'good', 'moderate', 'stressed', 'critical')),
  color_change TEXT,
  notes TEXT,
  
  -- Metadatos
  is_control BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_growth_experiments_user_id ON public.growth_experiments(user_id);
CREATE INDEX idx_growth_experiments_plant_id ON public.growth_experiments(plant_id);
CREATE INDEX idx_growth_experiments_condition ON public.growth_experiments(condition_label);

-- RLS
ALTER TABLE public.growth_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own experiments" ON public.growth_experiments
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own experiments" ON public.growth_experiments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own experiments" ON public.growth_experiments
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own experiments" ON public.growth_experiments
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);