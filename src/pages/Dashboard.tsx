import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Sprout, Bell, TrendingUp, Droplets, Thermometer, Sun, ChevronRight, Plus } from 'lucide-react';
import { LayoutV2 } from '@/components/LayoutV2';
import { Model3DViewer } from '@/components/Model3DViewer';
import { HealthSummaryPanel } from '@/components/HealthTrafficLight';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { getModelSignedUrl } from '@/lib/storage-models';
import { healthScore, healthStatus, evaluateMeasurement, type Thresholds } from '@/lib/health';
import { getHealthLevel } from '@/lib/health-levels';

type Plant = Tables<'plants'>;
type EnvReading = Tables<'environmental_readings'>;
type PhenoReading = Tables<'phenotypic_readings'>;
type Alert = Tables<'alerts'>;

export default function Dashboard() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [envReadings, setEnvReadings] = useState<EnvReading[]>([]);
  const [phenoReadings, setPhenoReadings] = useState<PhenoReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);

    const [pl, env, pheno, al, th] = await Promise.all([
    supabase.from('plants').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('environmental_readings').select('*').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(200),
    supabase.from('phenotypic_readings').select('*').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(200),
    supabase.from('alerts').select('*').eq('user_id', user.id).eq('resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('thresholds').select('*').eq('user_id', user.id).maybeSingle()]
    );

    setPlants(pl.data ?? []);
    setEnvReadings(env.data ?? []);
    setPhenoReadings(pheno.data ?? []);
    setAlerts(al.data ?? []);
    setThresholds(th.data ?? null);

    if (pl.data && pl.data.length > 0 && !selectedPlant) {
      setSelectedPlant(pl.data[0]);
    }
    setLoading(false);
  }, [user, selectedPlant]);

  useEffect(() => {load();}, [load]);

  // Cargar modelo 3D
  useEffect(() => {
    const loadModel = async () => {
      if (!supabase || !selectedPlant?.model_3d_id) {
        setModelUrl(null);
        return;
      }
      const { data } = await supabase.from('models_3d').select('file_path').eq('id', selectedPlant.model_3d_id).maybeSingle();
      if (data?.file_path) {
        setModelUrl(await getModelSignedUrl(data.file_path));
      } else {
        setModelUrl(null);
      }
    };
    loadModel();
  }, [selectedPlant]);

  // Datos de la planta seleccionada
  const plantEnv = selectedPlant ? envReadings.filter((r) => r.plant_id === selectedPlant.id) : [];
  const plantPheno = selectedPlant ? phenoReadings.filter((r) => r.plant_id === selectedPlant.id) : [];
  const latestEnv = plantEnv[0] ?? null;
  const latestPheno = plantPheno[0] ?? null;

  // Índice de salud
  const issues = latestEnv ? evaluateMeasurement({
    ph: latestEnv.soil_ph,
    soil_moisture: latestEnv.soil_moisture,
    air_temp: latestEnv.air_temperature,
    humidity: latestEnv.humidity_percent,
    light_lux: latestEnv.light_intensity,
    ec: latestEnv.ec
  }, thresholds) : [];
  const score = latestEnv ? healthScore(issues) : null;
  const status = healthStatus(score ?? 0);

  // Conteos de salud
  const healthCounts = useMemo(() => {
    const counts = { buena: 0, media: 0, urgente: 0 };
    plants.forEach((plant) => {
      const plantEnvReadings = envReadings.filter((r) => r.plant_id === plant.id);
      const latest = plantEnvReadings[0];
      if (latest) {
        const plantIssues = evaluateMeasurement({
          ph: latest.soil_ph, soil_moisture: latest.soil_moisture,
          air_temp: latest.air_temperature, humidity: latest.humidity_percent,
          light_lux: latest.light_intensity, ec: latest.ec
        }, thresholds);
        counts[getHealthLevel(healthScore(plantIssues))]++;
      } else {
        counts.media++;
      }
    });
    return counts;
  }, [plants, envReadings, thresholds]);

  if (loading) {
    return (
      <LayoutV2>
        <div data-ev-id="ev_43ac43ae76" className="flex h-64 items-center justify-center">
          <Sprout className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </LayoutV2>);

  }

  // Sin plantas - mostrar bienvenida
  if (plants.length === 0) {
    return (
      <LayoutV2>
        <div data-ev-id="ev_dc43d43d24" className="flex flex-col items-center justify-center gap-6 py-20 text-center">
          <div data-ev-id="ev_db3d777ce7" className="rounded-full bg-primary/10 p-6">
            <Sprout className="h-16 w-16 text-primary" />
          </div>
          <div data-ev-id="ev_f909348ca0">
            <h1 data-ev-id="ev_4c0f5baa87" className="text-2xl font-semibold">Bienvenido al Gemelo Digital</h1>
            <p data-ev-id="ev_ae1b557fca" className="mt-2 text-muted-foreground">Comienza agregando tu primera planta para monitorear su salud.</p>
          </div>
          <Link data-ev-id="ev_3d7a44f64a"
          to="/plantas"
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground">

            <Plus className="h-5 w-5" /> Agregar planta
          </Link>
        </div>
      </LayoutV2>);

  }

  return (
    <LayoutV2>
      {/* Encabezado con selector de planta */}
      <header data-ev-id="ev_58e78d5bb1" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-ev-id="ev_04f2e67326">
          <h1 data-ev-id="ev_7a0a499289" className="text-2xl font-semibold">Gemelo Digital</h1>
          <p data-ev-id="ev_a3d42dfee5" className="text-sm text-muted-foreground">Monitoreo en tiempo real de tus plantas</p>
        </div>
        
        {plants.length > 1 &&
        <select data-ev-id="ev_eb1771f70d"
        value={selectedPlant?.id ?? ''}
        onChange={(e) => setSelectedPlant(plants.find((p) => p.id === e.target.value) ?? null)}
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm">

            {plants.map((p) =>
          <option data-ev-id="ev_56386dd29b" key={p.id} value={p.id}>{p.name}</option>
          )}
          </select>
        }
      </header>

      {/* Layout principal */}
      <div data-ev-id="ev_d494798eb0" className="grid gap-6 lg:grid-cols-3">
        {/* Columna izquierda: Modelo 3D */}
        <div data-ev-id="ev_4ef0e08aae" className="lg:col-span-2">
          <div data-ev-id="ev_81ba48ce43" className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* Info de la planta */}
            <div data-ev-id="ev_e9beee853f" className="flex items-center justify-between border-b border-border p-4">
              <div data-ev-id="ev_bc888f98d2">
                <h2 data-ev-id="ev_99aaaa1fc3" className="text-lg font-semibold">{selectedPlant?.name}</h2>
                <p data-ev-id="ev_e50daa4644" className="text-sm text-muted-foreground">
                  {selectedPlant?.variety ?? 'Sin variedad'} · {selectedPlant?.location ?? 'Sin ubicación'}
                </p>
              </div>
              <div data-ev-id="ev_8acee398a1" className="text-right">
                <div data-ev-id="ev_cf9d399ff8" className={`text-2xl font-bold ${status.tone === 'success' ? 'text-green-600' : status.tone === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {score !== null ? `${score}%` : '—'}
                </div>
                <div data-ev-id="ev_a9900873aa" className="text-xs text-muted-foreground">Índice de salud</div>
              </div>
            </div>
            
            {/* Visor 3D */}
            <div data-ev-id="ev_9e98b2ead0" className="p-4">
              <Model3DViewer
                modelUrl={modelUrl}
                height={350}
                healthScore={score}
                colorimetryHex={latestPheno?.color_hex}
                heightCm={latestPheno?.height_cm ?? selectedPlant?.height_cm}
                cladodeCount={latestPheno?.cladode_count ?? selectedPlant?.cladode_count}
                showColorMode={true} />

            </div>
            
            {/* Variables rápidas */}
            <div data-ev-id="ev_8535da1f78" className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
              <QuickStat icon={<Droplets className="h-4 w-4 text-blue-500" />} label="Humedad" value={latestEnv?.soil_moisture} unit="%" />
              <QuickStat icon={<Thermometer className="h-4 w-4 text-orange-500" />} label="Temperatura" value={latestEnv?.air_temperature} unit="°C" />
              <QuickStat icon={<Sun className="h-4 w-4 text-yellow-500" />} label="Luz" value={latestEnv?.light_intensity} unit=" lux" />
              <QuickStat icon={<TrendingUp className="h-4 w-4 text-green-500" />} label="Altura" value={latestPheno?.height_cm ?? selectedPlant?.height_cm} unit=" cm" />
            </div>
          </div>
          
          {/* Link a detalle */}
          <Link data-ev-id="ev_7ee55f7b8c"
          to={`/plantas/${selectedPlant?.id}`}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted">

            Ver detalle completo <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Columna derecha: Resumen */}
        <div data-ev-id="ev_c9d440f0db" className="flex flex-col gap-4">
          {/* Semáforo de salud */}
          <HealthSummaryPanel counts={healthCounts} />
          
          {/* Alertas recientes */}
          <div data-ev-id="ev_80f1d1a963" className="rounded-xl border border-border bg-card p-4">
            <div data-ev-id="ev_d70c488539" className="mb-3 flex items-center justify-between">
              <h3 data-ev-id="ev_279568c428" className="font-semibold">Alertas</h3>
              {alerts.length > 0 &&
              <span data-ev-id="ev_7e372d4ac0" className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {alerts.length}
                </span>
              }
            </div>
            
            {alerts.length === 0 ?
            <p data-ev-id="ev_15b3236384" className="text-sm text-muted-foreground">Sin alertas pendientes 🌱</p> :

            <div data-ev-id="ev_855b5a7920" className="flex flex-col gap-2">
                {alerts.slice(0, 3).map((a) =>
              <div data-ev-id="ev_5a1d94fbfb" key={a.id} className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
                    <p data-ev-id="ev_7b2f6ecefe" className="text-sm font-medium text-red-800 dark:text-red-300">{a.message}</p>
                    <p data-ev-id="ev_315c92e019" className="mt-1 text-xs text-red-600 dark:text-red-400">{a.recommendation}</p>
                  </div>
              )}
                {alerts.length > 3 &&
              <Link data-ev-id="ev_3b77105350" to="/alertas" className="text-center text-sm text-primary hover:underline">
                    Ver todas ({alerts.length})
                  </Link>
              }
              </div>
            }
          </div>
          
          {/* Lista de plantas */}
          <div data-ev-id="ev_94ebc066bc" className="rounded-xl border border-border bg-card p-4">
            <div data-ev-id="ev_cff7358216" className="mb-3 flex items-center justify-between">
              <h3 data-ev-id="ev_2228818089" className="font-semibold">Mis plantas</h3>
              <Link data-ev-id="ev_4c3f2d356c" to="/plantas" className="text-sm text-primary hover:underline">Ver todas</Link>
            </div>
            <div data-ev-id="ev_4acc81e3af" className="flex flex-col gap-2">
              {plants.slice(0, 4).map((p) => {
                const pEnv = envReadings.find((r) => r.plant_id === p.id);
                const pScore = pEnv ? healthScore(evaluateMeasurement({
                  ph: pEnv.soil_ph, soil_moisture: pEnv.soil_moisture,
                  air_temp: pEnv.air_temperature, humidity: pEnv.humidity_percent,
                  light_lux: pEnv.light_intensity, ec: pEnv.ec
                }, thresholds)) : null;
                const level = getHealthLevel(pScore);

                return (
                  <button data-ev-id="ev_f51dec0238"
                  key={p.id}
                  onClick={() => setSelectedPlant(p)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selectedPlant?.id === p.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'}`
                  }>

                    <div data-ev-id="ev_a00de2ea17">
                      <p data-ev-id="ev_de6e7e3227" className="font-medium">{p.name}</p>
                      <p data-ev-id="ev_3d85a9c4ca" className="text-xs text-muted-foreground">{p.variety ?? 'Sin variedad'}</p>
                    </div>
                    <div data-ev-id="ev_b278a66890" className={`h-3 w-3 rounded-full ${
                    level === 'buena' ? 'bg-green-500' : level === 'media' ? 'bg-yellow-500' : 'bg-red-500'}`
                    } />
                  </button>);

              })}
            </div>
          </div>
        </div>
      </div>
    </LayoutV2>);

}

function QuickStat({ icon, label, value, unit }: {icon: React.ReactNode;label: string;value?: number | null;unit?: string;}) {
  return (
    <div data-ev-id="ev_404adabd08" className="flex flex-col gap-1 bg-card p-4">
      <div data-ev-id="ev_07e40ee49f" className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div data-ev-id="ev_12adb3bda4" className="text-lg font-semibold">
        {value !== null && value !== undefined ? `${value}${unit || ''}` : '—'}
      </div>
    </div>);

}