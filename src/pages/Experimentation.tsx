import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Loader2, FlaskConical, Leaf, BarChart3, Activity, Download, Info, RotateCcw, Plus, Beaker, TrendingUp, Calendar, Trash2, Zap, Thermometer, Droplets, Sun, CloudRain, Sprout, Eye } from 'lucide-react';
import { LayoutV2 } from '@/components/LayoutV2';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { getModelSignedUrl } from '@/lib/storage-models';
import '@google/model-viewer';
import {
  analyzeImageData,
  generateChannelImage,
  generateHealthMap,
  CHANNEL_INFO,
  type ImageAnalysis } from
'@/lib/cielab';
import {
  simulateGrowth,
  evaluateConditions,
  calculateGrowthRates,
  type SimulationConditions,
  type SimulationResult } from
'@/lib/predictions';

type Plant = Tables<'plants'>;
type GrowthExperiment = Tables<'growth_experiments'>;

type TabType = 'cielab' | 'experiments' | 'simulator';

const INPUT = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function Experimentation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('cielab');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<'original' | 'l' | 'a' | 'b' | 'health'>('original');
  const [channelImages, setChannelImages] = useState<Record<string, string>>({});
  const [rotate, setRotate] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Experimentos
  const [experiments, setExperiments] = useState<GrowthExperiment[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [savingExp, setSavingExp] = useState(false);

  // Simulador
  const [simConditions, setSimConditions] = useState<SimulationConditions>({
    temperature_c: 23,
    humidity_percent: 45,
    soil_ph: 6.8,
    light_intensity_lux: 30000,
    irrigation_frequency_days: 7
  });
  const [simDays, setSimDays] = useState(30);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [showSprouts3D, setShowSprouts3D] = useState(false);
  const [simModelLoaded, setSimModelLoaded] = useState(false);
  const [sproutPositions, setSproutPositions] = useState<{x: number;y: number;size: number;delay: number;}[]>([]);

  const [expForm, setExpForm] = useState({
    name: '',
    condition_label: '',
    temperature_c: '',
    humidity_percent: '',
    soil_ph: '',
    light_intensity_lux: '',
    irrigation_frequency_days: '',
    duration_days: '',
    initial_height_cm: '',
    initial_cladode_count: '',
    initial_sprouts: '',
    final_height_cm: '',
    final_cladode_count: '',
    final_sprouts: '',
    health_status: '',
    notes: '',
    is_control: false
  });

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simViewerRef = useRef<HTMLDivElement>(null);

  // Cargar plantas y experimentos
  const loadData = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);

    const [plantsRes, expRes] = await Promise.all([
    supabase.from('plants').select('*').eq('user_id', user.id).not('model_3d_id', 'is', null).order('name'),
    supabase.from('growth_experiments').select('*').eq('user_id', user.id).order('created_at', { ascending: false })]
    );

    setPlants(plantsRes.data ?? []);
    setExperiments(expRes.data ?? []);

    if (plantsRes.data && plantsRes.data.length > 0 && !selectedPlant) {
      setSelectedPlant(plantsRes.data[0]);
    }
    setLoading(false);
  }, [user, selectedPlant]);

  useEffect(() => {loadData();}, [loadData]);

  // Cargar modelo cuando cambia la planta
  useEffect(() => {
    const loadModel = async () => {
      if (!supabase || !selectedPlant?.model_3d_id) {
        setModelUrl(null);
        return;
      }
      const { data } = await supabase.
      from('models_3d').
      select('file_path').
      eq('id', selectedPlant.model_3d_id).
      maybeSingle();

      if (data?.file_path) {
        setModelUrl(await getModelSignedUrl(data.file_path));
      }
    };
    loadModel();
    setAnalysis(null);
    setCapturedImage(null);
    setChannelImages({});
    setActiveChannel('original');
    setModelLoaded(false);
    setError(null);
  }, [selectedPlant]);

  // Crear visor 3D
  useEffect(() => {
    const container = viewerRef.current;
    if (!container || !modelUrl) return;

    container.innerHTML = '';
    const viewer = document.createElement('model-viewer');
    viewer.id = 'experiment-viewer';
    viewer.setAttribute('src', modelUrl);
    viewer.setAttribute('alt', 'Modelo 3D para análisis');
    if (rotate) viewer.setAttribute('auto-rotate', '');
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('camera-orbit', '0deg 75deg 100%');
    viewer.setAttribute('exposure', '1.0');
    viewer.setAttribute('shadow-intensity', '0');
    viewer.setAttribute('environment-image', 'neutral');
    viewer.setAttribute('tone-mapping', 'neutral');
    viewer.style.width = '100%';
    viewer.style.height = '100%';
    viewer.style.backgroundColor = '#1a1a2e';

    viewer.addEventListener('load', () => setModelLoaded(true));
    viewer.addEventListener('error', () => setError('Error al cargar el modelo'));

    container.appendChild(viewer);

    return () => {container.innerHTML = '';};
  }, [modelUrl, rotate]);

  // Capturar y analizar
  const captureAndAnalyze = async () => {
    const container = viewerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const viewer = container.querySelector('model-viewer') as HTMLElement & {
      toBlob: (options?: {mimeType?: string;idealAspect?: boolean;}) => Promise<Blob>;
    };

    if (!viewer) {
      setError('Visor no encontrado');
      return;
    }

    setCapturing(true);
    setError(null);

    try {
      viewer.removeAttribute('auto-rotate');
      await new Promise((r) => setTimeout(r, 200));

      const blob = await viewer.toBlob({ mimeType: 'image/png' });

      if (!blob) throw new Error('No se pudo capturar la imagen');

      const url = URL.createObjectURL(blob);
      setCapturedImage(url);

      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = analyzeImageData(imageData);
        setAnalysis(result);

        const channels: Record<string, string> = { original: url };

        const lData = generateChannelImage(imageData, 'l');
        ctx.putImageData(lData, 0, 0);
        channels.l = canvas.toDataURL();

        const aData = generateChannelImage(imageData, 'a');
        ctx.putImageData(aData, 0, 0);
        channels.a = canvas.toDataURL();

        const bData = generateChannelImage(imageData, 'b');
        ctx.putImageData(bData, 0, 0);
        channels.b = canvas.toDataURL();

        const healthData = generateHealthMap(imageData);
        ctx.putImageData(healthData, 0, 0);
        channels.health = canvas.toDataURL();

        setChannelImages(channels);
        setCapturing(false);

        if (rotate) viewer.setAttribute('auto-rotate', '');
      };

      img.onerror = () => {
        setError('Error al procesar la imagen');
        setCapturing(false);
      };

      img.src = url;
    } catch (err) {
      console.error('Error en captura:', err);
      setError('Error al capturar. Asegúrate de que el modelo esté cargado.');
      setCapturing(false);
      if (rotate) {
        const viewer = container.querySelector('model-viewer');
        viewer?.setAttribute('auto-rotate', '');
      }
    }
  };

  // Guardar experimento
  const handleSaveExperiment = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !selectedPlant) return;
    setSavingExp(true);

    const num = (v: string) => v === '' ? null : Number(v);

    // Calcular cambios
    const heightChange = expForm.final_height_cm && expForm.initial_height_cm ?
    Number(expForm.final_height_cm) - Number(expForm.initial_height_cm) :
    null;
    const sproutsChange = expForm.final_sprouts && expForm.initial_sprouts ?
    Number(expForm.final_sprouts) - Number(expForm.initial_sprouts) :
    null;
    const cladodeChange = expForm.final_cladode_count && expForm.initial_cladode_count ?
    Number(expForm.final_cladode_count) - Number(expForm.initial_cladode_count) :
    null;

    await supabase.from('growth_experiments').insert({
      user_id: user.id,
      plant_id: selectedPlant.id,
      name: expForm.name,
      condition_label: expForm.condition_label || null,
      temperature_c: num(expForm.temperature_c),
      humidity_percent: num(expForm.humidity_percent),
      soil_ph: num(expForm.soil_ph),
      light_intensity_lux: num(expForm.light_intensity_lux),
      irrigation_frequency_days: num(expForm.irrigation_frequency_days),
      duration_days: num(expForm.duration_days),
      initial_height_cm: num(expForm.initial_height_cm),
      initial_cladode_count: num(expForm.initial_cladode_count),
      initial_sprouts: num(expForm.initial_sprouts),
      final_height_cm: num(expForm.final_height_cm),
      final_cladode_count: num(expForm.final_cladode_count),
      final_sprouts: num(expForm.final_sprouts),
      height_change_cm: heightChange,
      new_sprouts: sproutsChange,
      cladode_change: cladodeChange,
      health_status: expForm.health_status || null,
      notes: expForm.notes || null,
      is_control: expForm.is_control
    });

    setExpForm({
      name: '', condition_label: '', temperature_c: '', humidity_percent: '',
      soil_ph: '', light_intensity_lux: '', irrigation_frequency_days: '',
      duration_days: '', initial_height_cm: '', initial_cladode_count: '',
      initial_sprouts: '', final_height_cm: '', final_cladode_count: '',
      final_sprouts: '', health_status: '', notes: '', is_control: false
    });
    setShowExpForm(false);
    setSavingExp(false);
    loadData();
  };

  const deleteExperiment = async (id: string) => {
    if (!supabase || !user || !confirm('¿Eliminar este experimento?')) return;
    await supabase.from('growth_experiments').delete().eq('id', id);
    loadData();
  };

  // Exportar análisis CIELAB
  const exportAnalysis = () => {
    if (!analysis || !selectedPlant) return;
    const report = `REPORTE DE ANÁLISIS CIELAB\n${'='.repeat(30)}\nPlanta: ${selectedPlant.name}\nFecha: ${new Date().toLocaleString('es-MX')}\n\nESTADÍSTICAS POR CANAL\n${'-'.repeat(20)}\nL* (Luminosidad): Media=${analysis.labStats.l.mean}, σ=${analysis.labStats.l.stdDev}\na* (Verde-Rojo): Media=${analysis.labStats.a.mean}, σ=${analysis.labStats.a.stdDev}\nb* (Azul-Amarillo): Media=${analysis.labStats.b.mean}, σ=${analysis.labStats.b.stdDev}\n\nMÉTRICAS DE SALUD\n${'-'.repeat(20)}\nÁrea verde: ${analysis.healthMetrics.greenArea}%\nÁrea clorótica: ${analysis.healthMetrics.chloroticArea}%\nÁrea necrótica: ${analysis.healthMetrics.necroticArea}%\n\nESTADO: ${analysis.overallStatus.toUpperCase()}\nPíxeles: ${analysis.pixelCount.toLocaleString()}`;
    const blob = new Blob([report], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cielab-${selectedPlant.name}-${Date.now()}.txt`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':case 'excellent':case 'good':return 'bg-green-500';
      case 'moderate':return 'bg-yellow-500';
      case 'stressed':return 'bg-orange-500';
      case 'critical':return 'bg-red-500';
      default:return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':return 'Saludable';
      case 'excellent':return 'Excelente';
      case 'good':return 'Bueno';
      case 'moderate':return 'Moderado';
      case 'stressed':return 'Estrés';
      case 'critical':return 'Crítico';
      default:return status;
    }
  };

  const plantExperiments = experiments.filter((e) => e.plant_id === selectedPlant?.id);



  // Auto-simular cuando cambian condiciones
  useEffect(() => {
    if (activeTab === 'simulator' && selectedPlant) {
      // Obtener estado inicial desde lecturas o valores por defecto
      const initialState = {
        height: 25,
        sprouts: 0,
        cladodes: 3
      };

      const result = simulateGrowth(
        plantExperiments,
        simConditions,
        simDays,
        initialState
      );

      setSimResult(result);
    }
  }, [simConditions, simDays, selectedPlant, activeTab, plantExperiments]);

  // Generar posiciones de brotes cuando cambie la predicción
  useEffect(() => {
    if (simResult && simResult.sprouts > 0) {
      const positions: {x: number;y: number;size: number;delay: number;}[] = [];
      const sproutCount = Math.min(simResult.sprouts, 12); // Máximo 12 brotes visibles

      for (let i = 0; i < sproutCount; i++) {
        // Posiciones distribuidas en zonas típicas donde brotan los nopales
        // Principalmente en los bordes superiores y laterales de las pencas
        const zone = i % 4; // 4 zonas diferentes
        let x: number, y: number;

        switch (zone) {
          case 0: // Borde superior
            x = 30 + Math.random() * 40;
            y = 15 + Math.random() * 15;
            break;
          case 1: // Lado derecho
            x = 65 + Math.random() * 20;
            y = 25 + Math.random() * 30;
            break;
          case 2: // Lado izquierdo
            x = 15 + Math.random() * 20;
            y = 25 + Math.random() * 30;
            break;
          default: // Parte media-superior
            x = 35 + Math.random() * 30;
            y = 30 + Math.random() * 20;
        }

        positions.push({
          x,
          y,
          size: 8 + Math.random() * 8, // Tamaño variable
          delay: i * 0.15 // Animación escalonada
        });
      }

      setSproutPositions(positions);
    } else {
      setSproutPositions([]);
    }
  }, [simResult]);

  // Crear visor 3D para simulador con escala dinámica
  useEffect(() => {
    const container = simViewerRef.current;
    if (!container || !modelUrl || !showSprouts3D) return;

    container.innerHTML = '';
    const viewer = document.createElement('model-viewer');
    viewer.id = 'sim-3d-viewer';
    viewer.setAttribute('src', modelUrl);
    viewer.setAttribute('alt', 'Modelo 3D con brotes simulados');
    viewer.setAttribute('auto-rotate', '');
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('camera-orbit', '0deg 75deg 105%');
    viewer.setAttribute('exposure', '1.0');
    viewer.setAttribute('shadow-intensity', '0');
    viewer.setAttribute('environment-image', 'neutral');
    viewer.setAttribute('tone-mapping', 'neutral');
    viewer.style.width = '100%';
    viewer.style.height = '100%';
    viewer.style.backgroundColor = '#1a1a2e';
    
    // Aplicar escala dinámica basada en predicción de crecimiento
    if (simResult && simResult.height) {
      const baseHeight = 25; // Altura inicial en cm
      const scaleFactor = Math.max(1, simResult.height / baseHeight);
      // Escalar principalmente en Y (altura) con un poco en X y Z
      const scaleY = scaleFactor;
      const scaleXZ = 1 + (scaleFactor - 1) * 0.3; // Crecimiento lateral más sutil
      viewer.setAttribute('scale', `${scaleXZ} ${scaleY} ${scaleXZ}`);
    }

    viewer.addEventListener('load', () => setSimModelLoaded(true));

    container.appendChild(viewer);

    return () => {
      container.innerHTML = '';
      setSimModelLoaded(false);
    };
  }, [modelUrl, showSprouts3D, simResult]);

  const getConditionIcon = (status: string) => {
    switch (status) {
      case 'optimal':return { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Óptimo' };
      case 'stress_cold':return { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Frío' };
      case 'stress_heat':return { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Calor' };
      case 'low':return { color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Bajo' };
      case 'high':return { color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Alto' };
      case 'acidic':return { color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Ácido' };
      case 'alkaline':return { color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30', label: 'Alcalino' };
      case 'deficit':return { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Déficit' };
      case 'excess':return { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Exceso' };
      default:return { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30', label: status };
    }
  };

  if (loading) {
    return (
      <LayoutV2>
        <div data-ev-id="ev_7528a6fb86" className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutV2>);

  }

  if (plants.length === 0) {
    return (
      <LayoutV2>
        <div data-ev-id="ev_f6d0974e57" className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <FlaskConical className="h-16 w-16 text-muted-foreground" />
          <div data-ev-id="ev_e221e69744">
            <h1 data-ev-id="ev_98454a831d" className="text-xl font-semibold">Sin modelos 3D</h1>
            <p data-ev-id="ev_e00c5f3acb" className="text-muted-foreground">Agrega un modelo 3D a una planta para comenzar.</p>
          </div>
        </div>
      </LayoutV2>);

  }

  return (
    <LayoutV2>
      <canvas data-ev-id="ev_75d55deb32" ref={canvasRef} className="hidden" />

      {/* Header */}
      <header data-ev-id="ev_7ccdef1a27" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-ev-id="ev_20c23e4075">
          <h1 data-ev-id="ev_c5c29c8ca5" className="flex items-center gap-2 text-2xl font-semibold">
            <FlaskConical className="h-6 w-6 text-primary" />
            Experimentación
          </h1>
          <p data-ev-id="ev_ce7285ee3f" className="text-sm text-muted-foreground">Análisis CIELAB y experimentos de crecimiento</p>
        </div>

        <select data-ev-id="ev_1cb60a8e76"
        value={selectedPlant?.id ?? ''}
        onChange={(e) => setSelectedPlant(plants.find((p) => p.id === e.target.value) ?? null)}
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm">

          {plants.map((p) =>
          <option data-ev-id="ev_3d9f498497" key={p.id} value={p.id}>{p.name}</option>
          )}
        </select>
      </header>

      {/* Tabs */}
      <div data-ev-id="ev_99014805cd" className="flex gap-2 border-b border-border">
        <button data-ev-id="ev_dadc54400a"
        onClick={() => setActiveTab('cielab')}
        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        activeTab === 'cielab' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

          <BarChart3 className="h-4 w-4" /> Análisis CIELAB
        </button>
        <button data-ev-id="ev_ac8829be99"
        onClick={() => setActiveTab('experiments')}
        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        activeTab === 'experiments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

          <Beaker className="h-4 w-4" /> Experimentos
          {plantExperiments.length > 0 &&
          <span data-ev-id="ev_1f225bd310" className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{plantExperiments.length}</span>
          }
        </button>
        <button data-ev-id="ev_sim_tab"
        onClick={() => setActiveTab('simulator')}
        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        activeTab === 'simulator' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

          <Zap className="h-4 w-4" /> Simulador
        </button>
      </div>

      {/* Tab: CIELAB */}
      {activeTab === 'cielab' &&
      <div data-ev-id="ev_108f0ecef3" className="grid gap-6 lg:grid-cols-2">
          {/* Visor 3D */}
          <div data-ev-id="ev_0733e0a78a" className="flex flex-col gap-4">
            <div data-ev-id="ev_77dd8ec0de" className="overflow-hidden rounded-2xl border border-border bg-card">
              <div data-ev-id="ev_b803b069a8" className="flex items-center justify-between border-b border-border p-3">
                <div data-ev-id="ev_3e67b2e808" className="flex items-center gap-2">
                  <span data-ev-id="ev_7b45981aa3" className="text-sm font-medium">Modelo 3D</span>
                  {modelLoaded &&
                <span data-ev-id="ev_45ae5f3691" className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Listo
                    </span>
                }
                </div>
                <div data-ev-id="ev_f3d366438d" className="flex gap-2">
                  <button data-ev-id="ev_a574828e94"
                onClick={() => setRotate(!rotate)}
                className={`rounded-lg p-2 text-sm ${rotate ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>

                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button data-ev-id="ev_d8cc211dd3"
                onClick={captureAndAnalyze}
                disabled={capturing || !modelUrl || !modelLoaded}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">

                    {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {capturing ? 'Analizando...' : 'Capturar'}
                  </button>
                </div>
              </div>

              <div data-ev-id="ev_3dcf0e68cf" className="relative h-72 w-full">
                <div data-ev-id="ev_73e514e17a" ref={viewerRef} className="h-full w-full" />
                {modelUrl && !modelLoaded &&
              <div data-ev-id="ev_b9f5cb464b" className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div data-ev-id="ev_ffe5dd22f1" className="flex flex-col items-center gap-2 text-white">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span data-ev-id="ev_70438eeacd" className="text-sm">Cargando...</span>
                    </div>
                  </div>
              }
              </div>

              {error &&
            <div data-ev-id="ev_f184b516ae" className="border-t border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
            }
            </div>

            {/* Canales */}
            {analysis &&
          <div data-ev-id="ev_fe48445357" className="rounded-xl border border-border bg-card p-4">
                <h3 data-ev-id="ev_68f78ad7a5" className="mb-3 text-sm font-medium">Canales</h3>
                <div data-ev-id="ev_30e1213d9d" className="flex flex-wrap gap-2">
                  {(['original', 'l', 'a', 'b', 'health'] as const).map((ch) =>
              <button data-ev-id="ev_2c61407a8b"
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${activeChannel === ch ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>

                      {ch === 'original' ? 'Original' : ch === 'l' ? 'L*' : ch === 'a' ? 'a*' : ch === 'b' ? 'b*' : 'Salud'}
                    </button>
              )}
                </div>
                {channelImages[activeChannel] &&
            <img data-ev-id="ev_85558b5beb" src={channelImages[activeChannel]} alt={activeChannel} className="mt-3 w-full rounded-lg" />
            }
              </div>
          }
          </div>

          {/* Resultados */}
          <div data-ev-id="ev_8b5f11949d" className="flex flex-col gap-4">
            {!analysis ?
          <div data-ev-id="ev_1235cbe1b1" className="flex h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border text-center">
                <Camera className="h-12 w-12 text-muted-foreground" />
                <p data-ev-id="ev_33091c1e9c" className="text-sm text-muted-foreground">Captura una vista para analizar</p>
              </div> :

          <>
                <div data-ev-id="ev_ee4a46ea56" className="rounded-2xl border border-border bg-card p-4">
                  <div data-ev-id="ev_e5292d4950" className="flex items-center justify-between">
                    <div data-ev-id="ev_d317da19e0">
                      <p data-ev-id="ev_38fb3f53f4" className="text-sm text-muted-foreground">Estado</p>
                      <p data-ev-id="ev_b1e338141f" className="text-2xl font-bold">{getStatusLabel(analysis.overallStatus)}</p>
                    </div>
                    <div data-ev-id="ev_0c4cba2485" className={`h-14 w-14 rounded-full ${getStatusColor(analysis.overallStatus)}`} />
                  </div>
                </div>

                <div data-ev-id="ev_0035a1a89d" className="rounded-2xl border border-border bg-card p-4">
                  <h3 data-ev-id="ev_94497df870" className="mb-3 flex items-center gap-2 text-sm font-medium"><Leaf className="h-4 w-4" /> Áreas</h3>
                  <div data-ev-id="ev_bd412a4507" className="grid grid-cols-2 gap-3">
                    <MetricBar label="Verde" value={analysis.healthMetrics.greenArea} color="bg-green-500" />
                    <MetricBar label="Saludable" value={analysis.healthMetrics.healthyArea} color="bg-emerald-500" />
                    <MetricBar label="Clorótica" value={analysis.healthMetrics.chloroticArea} color="bg-yellow-500" />
                    <MetricBar label="Necrótica" value={analysis.healthMetrics.necroticArea} color="bg-red-500" />
                  </div>
                </div>

                <div data-ev-id="ev_39552e1a17" className="rounded-2xl border border-border bg-card p-4">
                  <h3 data-ev-id="ev_a70c182687" className="mb-3 text-sm font-medium">Estadísticas LAB</h3>
                  
                  {/* Tabla completa de estadísticas */}
                  <div data-ev-id="ev_lab_table" className="overflow-x-auto">
                    <table data-ev-id="ev_lab_stats_table" className="w-full text-xs">
                      <thead data-ev-id="ev_5df2667aae">
                        <tr data-ev-id="ev_lab_header" className="border-b border-border">
                          <th data-ev-id="ev_lab_th_channel" className="py-2 text-left font-medium text-muted-foreground">Canal</th>
                          <th data-ev-id="ev_lab_th_min" className="py-2 text-right font-medium text-muted-foreground">Mín</th>
                          <th data-ev-id="ev_lab_th_max" className="py-2 text-right font-medium text-muted-foreground">Máx</th>
                          <th data-ev-id="ev_lab_th_mean" className="py-2 text-right font-medium text-muted-foreground">Media</th>
                          <th data-ev-id="ev_lab_th_std" className="py-2 text-right font-medium text-muted-foreground">σ</th>
                        </tr>
                      </thead>
                      <tbody data-ev-id="ev_8bb30b1599">
                        <tr data-ev-id="ev_lab_row_l" className="border-b border-border/50">
                          <td data-ev-id="ev_lab_l_name" className="py-2 font-medium">L* <span data-ev-id="ev_lab_l_desc" className="text-muted-foreground">(Luminosidad)</span></td>
                          <td data-ev-id="ev_lab_l_min" className="py-2 text-right">{analysis.labStats.l.min}</td>
                          <td data-ev-id="ev_lab_l_max" className="py-2 text-right">{analysis.labStats.l.max}</td>
                          <td data-ev-id="ev_lab_l_mean" className="py-2 text-right font-medium">{analysis.labStats.l.mean}</td>
                          <td data-ev-id="ev_lab_l_std" className="py-2 text-right text-muted-foreground">±{analysis.labStats.l.stdDev}</td>
                        </tr>
                        <tr data-ev-id="ev_lab_row_a" className="border-b border-border/50">
                          <td data-ev-id="ev_lab_a_name" className="py-2 font-medium">a* <span data-ev-id="ev_lab_a_desc" className="text-muted-foreground">(Verde-Rojo)</span></td>
                          <td data-ev-id="ev_lab_a_min" className="py-2 text-right">{analysis.labStats.a.min}</td>
                          <td data-ev-id="ev_lab_a_max" className="py-2 text-right">{analysis.labStats.a.max}</td>
                          <td data-ev-id="ev_lab_a_mean" className={`py-2 text-right font-medium ${analysis.labStats.a.mean < 0 ? 'text-green-600' : 'text-red-500'}`}>{analysis.labStats.a.mean}</td>
                          <td data-ev-id="ev_lab_a_std" className="py-2 text-right text-muted-foreground">±{analysis.labStats.a.stdDev}</td>
                        </tr>
                        <tr data-ev-id="ev_lab_row_b">
                          <td data-ev-id="ev_lab_b_name" className="py-2 font-medium">b* <span data-ev-id="ev_lab_b_desc" className="text-muted-foreground">(Azul-Amarillo)</span></td>
                          <td data-ev-id="ev_lab_b_min" className="py-2 text-right">{analysis.labStats.b.min}</td>
                          <td data-ev-id="ev_lab_b_max" className="py-2 text-right">{analysis.labStats.b.max}</td>
                          <td data-ev-id="ev_lab_b_mean" className={`py-2 text-right font-medium ${analysis.labStats.b.mean > 20 ? 'text-yellow-600' : ''}`}>{analysis.labStats.b.mean}</td>
                          <td data-ev-id="ev_lab_b_std" className="py-2 text-right text-muted-foreground">±{analysis.labStats.b.stdDev}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Indicadores de interpretación */}
                  <div data-ev-id="ev_lab_interpretation" className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div data-ev-id="ev_lab_interp_l" className="rounded-lg bg-muted p-2">
                      <div data-ev-id="ev_lab_interp_l_label" className="text-muted-foreground">Luminosidad</div>
                      <div data-ev-id="ev_lab_interp_l_value" className={`font-medium ${
                  analysis.labStats.l.mean > 60 ? 'text-green-600' :
                  analysis.labStats.l.mean > 40 ? 'text-yellow-600' : 'text-red-600'}`
                  }>
                        {analysis.labStats.l.mean > 60 ? 'Alta' : analysis.labStats.l.mean > 40 ? 'Media' : 'Baja'}
                      </div>
                    </div>
                    <div data-ev-id="ev_lab_interp_a" className="rounded-lg bg-muted p-2">
                      <div data-ev-id="ev_lab_interp_a_label" className="text-muted-foreground">Clorofila</div>
                      <div data-ev-id="ev_lab_interp_a_value" className={`font-medium ${
                  analysis.labStats.a.mean < -10 ? 'text-green-600' :
                  analysis.labStats.a.mean < 0 ? 'text-green-500' : 'text-red-500'}`
                  }>
                        {analysis.labStats.a.mean < -10 ? 'Abundante' : analysis.labStats.a.mean < 0 ? 'Normal' : 'Deficiente'}
                      </div>
                    </div>
                    <div data-ev-id="ev_lab_interp_b" className="rounded-lg bg-muted p-2">
                      <div data-ev-id="ev_lab_interp_b_label" className="text-muted-foreground">Amarillamiento</div>
                      <div data-ev-id="ev_lab_interp_b_value" className={`font-medium ${
                  analysis.labStats.b.mean < 15 ? 'text-green-600' :
                  analysis.labStats.b.mean < 25 ? 'text-yellow-600' : 'text-orange-600'}`
                  }>
                        {analysis.labStats.b.mean < 15 ? 'Ninguno' : analysis.labStats.b.mean < 25 ? 'Leve' : 'Notable'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Histogramas */}
                <div data-ev-id="ev_histograms" className="rounded-2xl border border-border bg-card p-4">
                  <h3 data-ev-id="ev_hist_title" className="mb-3 text-sm font-medium">Histogramas LAB</h3>
                  <div data-ev-id="ev_hist_grid" className="grid gap-4">
                    {/* Histograma L* */}
                    <div data-ev-id="ev_hist_l">
                      <div data-ev-id="ev_hist_l_header" className="mb-1 flex items-center justify-between text-xs">
                        <span data-ev-id="ev_hist_l_label" className="font-medium">L* (Luminosidad)</span>
                        <span data-ev-id="ev_hist_l_range" className="text-muted-foreground">0-100</span>
                      </div>
                      <div data-ev-id="ev_hist_l_bars" className="flex h-12 items-end gap-px rounded bg-muted/50 p-1">
                        {analysis.histograms.l.filter((_, i) => i % 8 === 0).map((val, i) => {
                      const maxVal = Math.max(...analysis.histograms.l);
                      const height = maxVal > 0 ? val / maxVal * 100 : 0;
                      return (
                        <div
                          key={i}
                          data-ev-id="ev_hist_l_bar"
                          className="flex-1 rounded-t bg-gradient-to-t from-gray-600 to-gray-300"
                          style={{ height: `${Math.max(2, height)}%` }} />);


                    })}
                      </div>
                    </div>
                    
                    {/* Histograma a* */}
                    <div data-ev-id="ev_hist_a">
                      <div data-ev-id="ev_hist_a_header" className="mb-1 flex items-center justify-between text-xs">
                        <span data-ev-id="ev_hist_a_label" className="font-medium">a* (Verde ← → Rojo)</span>
                        <span data-ev-id="ev_hist_a_range" className="text-muted-foreground">-128 a +127</span>
                      </div>
                      <div data-ev-id="ev_hist_a_bars" className="flex h-12 items-end gap-px rounded bg-muted/50 p-1">
                        {analysis.histograms.a.filter((_, i) => i % 8 === 0).map((val, i) => {
                      const maxVal = Math.max(...analysis.histograms.a);
                      const height = maxVal > 0 ? val / maxVal * 100 : 0;
                      const isGreen = i < 16; // Primera mitad es verde
                      return (
                        <div
                          key={i}
                          data-ev-id="ev_hist_a_bar"
                          className={`flex-1 rounded-t ${isGreen ? 'bg-gradient-to-t from-green-700 to-green-400' : 'bg-gradient-to-t from-red-700 to-red-400'}`}
                          style={{ height: `${Math.max(2, height)}%` }} />);


                    })}
                      </div>
                    </div>
                    
                    {/* Histograma b* */}
                    <div data-ev-id="ev_hist_b">
                      <div data-ev-id="ev_hist_b_header" className="mb-1 flex items-center justify-between text-xs">
                        <span data-ev-id="ev_hist_b_label" className="font-medium">b* (Azul ← → Amarillo)</span>
                        <span data-ev-id="ev_hist_b_range" className="text-muted-foreground">-128 a +127</span>
                      </div>
                      <div data-ev-id="ev_hist_b_bars" className="flex h-12 items-end gap-px rounded bg-muted/50 p-1">
                        {analysis.histograms.b.filter((_, i) => i % 8 === 0).map((val, i) => {
                      const maxVal = Math.max(...analysis.histograms.b);
                      const height = maxVal > 0 ? val / maxVal * 100 : 0;
                      const isBlue = i < 16; // Primera mitad es azul
                      return (
                        <div
                          key={i}
                          data-ev-id="ev_hist_b_bar"
                          className={`flex-1 rounded-t ${isBlue ? 'bg-gradient-to-t from-blue-700 to-blue-400' : 'bg-gradient-to-t from-yellow-600 to-yellow-300'}`}
                          style={{ height: `${Math.max(2, height)}%` }} />);


                    })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen de píxeles */}
                <div data-ev-id="ev_pixel_summary" className="rounded-xl border border-border bg-card p-3">
                  <div data-ev-id="ev_pixel_grid" className="grid grid-cols-2 gap-3 text-xs">
                    <div data-ev-id="ev_pixel_count">
                      <span data-ev-id="ev_pixel_count_label" className="text-muted-foreground">Píxeles analizados</span>
                      <p data-ev-id="ev_pixel_count_value" className="font-medium">{analysis.pixelCount.toLocaleString()}</p>
                    </div>
                    <div data-ev-id="ev_pixel_dims">
                      <span data-ev-id="ev_pixel_dims_label" className="text-muted-foreground">Resolución</span>
                      <p data-ev-id="ev_pixel_dims_value" className="font-medium">{Math.round(Math.sqrt(analysis.pixelCount * 1.33))} × {Math.round(Math.sqrt(analysis.pixelCount / 1.33))} px</p>
                    </div>
                  </div>
                </div>

                <button data-ev-id="ev_0f265b95fc" onClick={exportAnalysis} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm hover:bg-muted">
                  <Download className="h-4 w-4" /> Exportar
                </button>
              </>
          }

            <div data-ev-id="ev_f39d238060" className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
              <h4 data-ev-id="ev_d4b3094df6" className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                <Info className="h-4 w-4" /> Guía CIELAB
              </h4>
              <p data-ev-id="ev_881d4fa2f8" className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                <strong data-ev-id="ev_725a0fcfdf">a* negativo</strong> = más clorofila (verde sano). <strong data-ev-id="ev_0f56dc8a13">b* alto</strong> = amarillamiento.
              </p>
            </div>
          </div>
        </div>
      }

      {/* Tab: Experimentos */}
      {activeTab === 'experiments' &&
      <div data-ev-id="ev_f1338a462e" className="flex flex-col gap-6">
          {/* Botón nuevo experimento */}
          <div data-ev-id="ev_7a805b2048" className="flex justify-between">
            <h2 data-ev-id="ev_ea6f91ac9a" className="text-lg font-semibold">Experimentos de {selectedPlant?.name}</h2>
            <button data-ev-id="ev_96bdcbb8d4"
          onClick={() => setShowExpForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">

              <Plus className="h-4 w-4" /> Nuevo experimento
            </button>
          </div>

          {/* Formulario */}
          {showExpForm &&
        <div data-ev-id="ev_86ec0a03d9" className="rounded-2xl border border-border bg-card p-4">
              <h3 data-ev-id="ev_bda7af236a" className="mb-4 font-medium">Registrar experimento</h3>
              <form data-ev-id="ev_2c59abc38d" onSubmit={handleSaveExperiment} className="flex flex-col gap-4">
                <div data-ev-id="ev_7e568a70b6" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label data-ev-id="ev_7b531dcf32" className="flex flex-col gap-1 text-sm">
                    Nombre *
                    <input data-ev-id="ev_76b14cac3d" value={expForm.name} onChange={(e) => setExpForm({ ...expForm, name: e.target.value })} className={INPUT} placeholder="Experimento alta luz" required />
                  </label>
                  <label data-ev-id="ev_f39c50f1f6" className="flex flex-col gap-1 text-sm">
                    Condición
                    <select data-ev-id="ev_98a5eca3c8" value={expForm.condition_label} onChange={(e) => setExpForm({ ...expForm, condition_label: e.target.value })} className={INPUT}>
                      <option data-ev-id="ev_0e4ef64b90" value="">Seleccionar...</option>
                      <option data-ev-id="ev_6b272ad964" value="control">Control</option>
                      <option data-ev-id="ev_cfadcb27c5" value="alta_luz">Alta luz</option>
                      <option data-ev-id="ev_a130d6ca7e" value="baja_luz">Baja luz</option>
                      <option data-ev-id="ev_fd061394e8" value="alto_riego">Alto riego</option>
                      <option data-ev-id="ev_ca874c5393" value="bajo_riego">Bajo riego</option>
                      <option data-ev-id="ev_afcaa06e86" value="stress_termico">Estrés térmico</option>
                      <option data-ev-id="ev_becb6ccb6f" value="otro">Otro</option>
                    </select>
                  </label>
                  <label data-ev-id="ev_027acd729b" className="flex flex-col gap-1 text-sm">
                    Duración (días)
                    <input data-ev-id="ev_62d50f1c49" type="number" value={expForm.duration_days} onChange={(e) => setExpForm({ ...expForm, duration_days: e.target.value })} className={INPUT} placeholder="30" />
                  </label>
                </div>

                <div data-ev-id="ev_af8899c896" className="border-t border-border pt-4">
                  <p data-ev-id="ev_5e2803de18" className="mb-2 text-sm font-medium">Condiciones aplicadas</p>
                  <div data-ev-id="ev_479653433c" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <label data-ev-id="ev_c31db0f4df" className="flex flex-col gap-1 text-xs">Temp (°C)<input data-ev-id="ev_5289a56ee7" type="number" step="0.1" value={expForm.temperature_c} onChange={(e) => setExpForm({ ...expForm, temperature_c: e.target.value })} className={INPUT} /></label>
                    <label data-ev-id="ev_af96018fa0" className="flex flex-col gap-1 text-xs">Humedad (%)<input data-ev-id="ev_f9b135b6ab" type="number" step="0.1" value={expForm.humidity_percent} onChange={(e) => setExpForm({ ...expForm, humidity_percent: e.target.value })} className={INPUT} /></label>
                    <label data-ev-id="ev_6c4ace4ea8" className="flex flex-col gap-1 text-xs">pH<input data-ev-id="ev_caae7994c4" type="number" step="0.1" value={expForm.soil_ph} onChange={(e) => setExpForm({ ...expForm, soil_ph: e.target.value })} className={INPUT} /></label>
                    <label data-ev-id="ev_25c5f7ea3a" className="flex flex-col gap-1 text-xs">Luz (lux)<input data-ev-id="ev_4cba640c74" type="number" value={expForm.light_intensity_lux} onChange={(e) => setExpForm({ ...expForm, light_intensity_lux: e.target.value })} className={INPUT} /></label>
                    <label data-ev-id="ev_06802c0e4c" className="flex flex-col gap-1 text-xs">Riego (días)<input data-ev-id="ev_b007f1fecf" type="number" value={expForm.irrigation_frequency_days} onChange={(e) => setExpForm({ ...expForm, irrigation_frequency_days: e.target.value })} className={INPUT} /></label>
                  </div>
                </div>

                <div data-ev-id="ev_e7895334cb" className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div data-ev-id="ev_03772d24ca">
                    <p data-ev-id="ev_cf6f5bf4f0" className="mb-2 text-sm font-medium">Mediciones iniciales</p>
                    <div data-ev-id="ev_b10135486e" className="grid grid-cols-3 gap-2">
                      <label data-ev-id="ev_5138fb3880" className="flex flex-col gap-1 text-xs">Altura (cm)<input data-ev-id="ev_fad7f7b844" type="number" step="0.1" value={expForm.initial_height_cm} onChange={(e) => setExpForm({ ...expForm, initial_height_cm: e.target.value })} className={INPUT} /></label>
                      <label data-ev-id="ev_cfd85e0bf5" className="flex flex-col gap-1 text-xs">Pencas<input data-ev-id="ev_514ed51210" type="number" value={expForm.initial_cladode_count} onChange={(e) => setExpForm({ ...expForm, initial_cladode_count: e.target.value })} className={INPUT} /></label>
                      <label data-ev-id="ev_54370eb33f" className="flex flex-col gap-1 text-xs">Brotes<input data-ev-id="ev_df48869cdb" type="number" value={expForm.initial_sprouts} onChange={(e) => setExpForm({ ...expForm, initial_sprouts: e.target.value })} className={INPUT} /></label>
                    </div>
                  </div>
                  <div data-ev-id="ev_2271d347c8">
                    <p data-ev-id="ev_6b12ecee7a" className="mb-2 text-sm font-medium">Mediciones finales</p>
                    <div data-ev-id="ev_0e909607b1" className="grid grid-cols-3 gap-2">
                      <label data-ev-id="ev_2e3bb6ade2" className="flex flex-col gap-1 text-xs">Altura (cm)<input data-ev-id="ev_ff1e609244" type="number" step="0.1" value={expForm.final_height_cm} onChange={(e) => setExpForm({ ...expForm, final_height_cm: e.target.value })} className={INPUT} /></label>
                      <label data-ev-id="ev_0a3fd48c32" className="flex flex-col gap-1 text-xs">Pencas<input data-ev-id="ev_fc39387747" type="number" value={expForm.final_cladode_count} onChange={(e) => setExpForm({ ...expForm, final_cladode_count: e.target.value })} className={INPUT} /></label>
                      <label data-ev-id="ev_7a2634fc2d" className="flex flex-col gap-1 text-xs">Brotes<input data-ev-id="ev_44f9914235" type="number" value={expForm.final_sprouts} onChange={(e) => setExpForm({ ...expForm, final_sprouts: e.target.value })} className={INPUT} /></label>
                    </div>
                  </div>
                </div>

                <div data-ev-id="ev_70e98342c0" className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <label data-ev-id="ev_f4ccef99bc" className="flex flex-col gap-1 text-sm">
                    Estado de salud
                    <select data-ev-id="ev_7ea4941a45" value={expForm.health_status} onChange={(e) => setExpForm({ ...expForm, health_status: e.target.value })} className={INPUT}>
                      <option data-ev-id="ev_98162cd584" value="">Seleccionar...</option>
                      <option data-ev-id="ev_e1229bbf19" value="excellent">Excelente</option>
                      <option data-ev-id="ev_686699ab0f" value="good">Bueno</option>
                      <option data-ev-id="ev_907c64735f" value="moderate">Moderado</option>
                      <option data-ev-id="ev_43671752e8" value="stressed">Estrés</option>
                      <option data-ev-id="ev_66205b0f11" value="critical">Crítico</option>
                    </select>
                  </label>
                  <label data-ev-id="ev_5ec2aaa599" className="flex items-center gap-2 text-sm">
                    <input data-ev-id="ev_b0e7180de1" type="checkbox" checked={expForm.is_control} onChange={(e) => setExpForm({ ...expForm, is_control: e.target.checked })} />
                    Es experimento control
                  </label>
                </div>

                <label data-ev-id="ev_fbe8b8d16c" className="flex flex-col gap-1 text-sm">
                  Notas
                  <textarea data-ev-id="ev_deb6964574" value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} className={INPUT} rows={2} placeholder="Observaciones..." />
                </label>

                <div data-ev-id="ev_9e6ee744f9" className="flex gap-3">
                  <button data-ev-id="ev_2489d3a21b" type="button" onClick={() => setShowExpForm(false)} className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-muted">Cancelar</button>
                  <button data-ev-id="ev_671c0fc9be" type="submit" disabled={savingExp || !expForm.name} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                    {savingExp && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                  </button>
                </div>
              </form>
            </div>
        }

          {/* Lista de experimentos */}
          {plantExperiments.length === 0 ?
        <div data-ev-id="ev_ce1dd5d4e5" className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
              <Beaker className="h-12 w-12 text-muted-foreground" />
              <div data-ev-id="ev_9dc8e45a34">
                <p data-ev-id="ev_3588458666" className="font-medium">Sin experimentos</p>
                <p data-ev-id="ev_37fe45283e" className="text-sm text-muted-foreground">Registra tu primer experimento de crecimiento</p>
              </div>
            </div> :

        <div data-ev-id="ev_375b1b12af" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plantExperiments.map((exp) =>
          <div data-ev-id="ev_9797549a5a" key={exp.id} className="rounded-xl border border-border bg-card p-4">
                  <div data-ev-id="ev_f45cac54a4" className="mb-3 flex items-start justify-between">
                    <div data-ev-id="ev_c2c3a0b01f">
                      <h4 data-ev-id="ev_2cacd2de57" className="font-medium">{exp.name}</h4>
                      {exp.condition_label &&
                <span data-ev-id="ev_04941fa460" className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{exp.condition_label}</span>
                }
                    </div>
                    <button data-ev-id="ev_8a5fec8009" onClick={() => deleteExperiment(exp.id)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {exp.duration_days &&
            <div data-ev-id="ev_648d3cd9d7" className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {exp.duration_days} días
                    </div>
            }

                  {/* Resultados */}
                  <div data-ev-id="ev_554f2f2f72" className="grid grid-cols-3 gap-2 text-center text-xs">
                    {exp.height_change_cm !== null &&
              <div data-ev-id="ev_18af03629e" className="rounded bg-muted p-2">
                        <div data-ev-id="ev_0973910d65" className="text-muted-foreground">Altura</div>
                        <div data-ev-id="ev_0a562e1f22" className={`font-medium ${Number(exp.height_change_cm) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(exp.height_change_cm) >= 0 ? '+' : ''}{exp.height_change_cm} cm
                        </div>
                      </div>
              }
                    {exp.new_sprouts !== null &&
              <div data-ev-id="ev_a9368dfd91" className="rounded bg-muted p-2">
                        <div data-ev-id="ev_eef76795f9" className="text-muted-foreground">Brotes</div>
                        <div data-ev-id="ev_3f6d1dae53" className={`font-medium ${Number(exp.new_sprouts) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(exp.new_sprouts) >= 0 ? '+' : ''}{exp.new_sprouts}
                        </div>
                      </div>
              }
                    {exp.cladode_change !== null &&
              <div data-ev-id="ev_b2c8cc3d24" className="rounded bg-muted p-2">
                        <div data-ev-id="ev_d9f243a5ab" className="text-muted-foreground">Pencas</div>
                        <div data-ev-id="ev_4ae38743f4" className={`font-medium ${Number(exp.cladode_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(exp.cladode_change) >= 0 ? '+' : ''}{exp.cladode_change}
                        </div>
                      </div>
              }
                  </div>

                  {exp.health_status &&
            <div data-ev-id="ev_0e8879ff6e" className="mt-3 flex items-center gap-2">
                      <div data-ev-id="ev_54fcd59ca1" className={`h-2 w-2 rounded-full ${getStatusColor(exp.health_status)}`} />
                      <span data-ev-id="ev_8b1cf0ae33" className="text-xs">{getStatusLabel(exp.health_status)}</span>
                    </div>
            }

                  {exp.notes && <p data-ev-id="ev_2e93c2fb84" className="mt-2 text-xs text-muted-foreground">{exp.notes}</p>}
                </div>
          )}
            </div>
        }
        </div>
      }

      {/* Tab: Simulador */}
      {activeTab === 'simulator' &&
      <div data-ev-id="ev_sim_content" className="flex flex-col gap-6">
          {/* Header */}
          <div data-ev-id="ev_sim_header" className="flex flex-col gap-2">
            <h2 data-ev-id="ev_sim_title" className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-primary" />
              Simulador de Crecimiento
            </h2>
            <p data-ev-id="ev_sim_desc" className="text-sm text-muted-foreground">
              Predice el crecimiento de {selectedPlant?.name} bajo diferentes condiciones ambientales.
              {plantExperiments.length > 0 ?
            ` Basado en ${plantExperiments.length} experimento(s) registrado(s).` :
            ' Usa valores de referencia para Opuntia (registra experimentos para mejorar precisión).'
            }
            </p>
          </div>

          <div data-ev-id="ev_sim_grid" className="grid gap-6 lg:grid-cols-3">
            {/* Panel de condiciones */}
            <div data-ev-id="ev_sim_conditions" className="lg:col-span-1 flex flex-col gap-4">
              <div data-ev-id="ev_sim_cond_card" className="rounded-2xl border border-border bg-card p-4">
                <h3 data-ev-id="ev_sim_cond_title" className="mb-4 flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4" /> Condiciones Ambientales
                </h3>

                {/* Temperatura */}
                <div data-ev-id="ev_sim_temp" className="mb-4">
                  <label data-ev-id="ev_sim_temp_label" className="flex items-center justify-between text-sm">
                    <span data-ev-id="ev_sim_temp_icon" className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-red-500" /> Temperatura
                    </span>
                    <span data-ev-id="ev_sim_temp_value" className="font-medium">{simConditions.temperature_c}°C</span>
                  </label>
                  <input data-ev-id="ev_sim_temp_slider"
                type="range" min="5" max="45" step="1"
                value={simConditions.temperature_c}
                onChange={(e) => setSimConditions({ ...simConditions, temperature_c: Number(e.target.value) })}
                className="mt-2 w-full accent-primary" />

                  <div data-ev-id="ev_sim_temp_range" className="flex justify-between text-xs text-muted-foreground">
                    <span data-ev-id="ev_sim_temp_min">5°C</span><span data-ev-id="ev_sim_temp_opt">Óptimo: 18-28°C</span><span data-ev-id="ev_sim_temp_max">45°C</span>
                  </div>
                </div>

                {/* Humedad */}
                <div data-ev-id="ev_sim_hum" className="mb-4">
                  <label data-ev-id="ev_sim_hum_label" className="flex items-center justify-between text-sm">
                    <span data-ev-id="ev_sim_hum_icon" className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" /> Humedad
                    </span>
                    <span data-ev-id="ev_sim_hum_value" className="font-medium">{simConditions.humidity_percent}%</span>
                  </label>
                  <input data-ev-id="ev_sim_hum_slider"
                type="range" min="10" max="90" step="1"
                value={simConditions.humidity_percent}
                onChange={(e) => setSimConditions({ ...simConditions, humidity_percent: Number(e.target.value) })}
                className="mt-2 w-full accent-primary" />

                  <div data-ev-id="ev_sim_hum_range" className="flex justify-between text-xs text-muted-foreground">
                    <span data-ev-id="ev_sim_hum_min">10%</span><span data-ev-id="ev_sim_hum_opt">Óptimo: 30-60%</span><span data-ev-id="ev_sim_hum_max">90%</span>
                  </div>
                </div>

                {/* pH */}
                <div data-ev-id="ev_sim_ph" className="mb-4">
                  <label data-ev-id="ev_sim_ph_label" className="flex items-center justify-between text-sm">
                    <span data-ev-id="ev_sim_ph_icon" className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-purple-500" /> pH del Suelo
                    </span>
                    <span data-ev-id="ev_sim_ph_value" className="font-medium">{simConditions.soil_ph}</span>
                  </label>
                  <input data-ev-id="ev_sim_ph_slider"
                type="range" min="4" max="9" step="0.1"
                value={simConditions.soil_ph}
                onChange={(e) => setSimConditions({ ...simConditions, soil_ph: Number(e.target.value) })}
                className="mt-2 w-full accent-primary" />

                  <div data-ev-id="ev_sim_ph_range" className="flex justify-between text-xs text-muted-foreground">
                    <span data-ev-id="ev_sim_ph_min">4.0</span><span data-ev-id="ev_sim_ph_opt">Óptimo: 6.0-7.5</span><span data-ev-id="ev_sim_ph_max">9.0</span>
                  </div>
                </div>

                {/* Luz */}
                <div data-ev-id="ev_sim_light" className="mb-4">
                  <label data-ev-id="ev_sim_light_label" className="flex items-center justify-between text-sm">
                    <span data-ev-id="ev_sim_light_icon" className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-yellow-500" /> Luz
                    </span>
                    <span data-ev-id="ev_sim_light_value" className="font-medium">{(simConditions.light_intensity_lux / 1000).toFixed(0)}k lux</span>
                  </label>
                  <input data-ev-id="ev_sim_light_slider"
                type="range" min="1000" max="80000" step="1000"
                value={simConditions.light_intensity_lux}
                onChange={(e) => setSimConditions({ ...simConditions, light_intensity_lux: Number(e.target.value) })}
                className="mt-2 w-full accent-primary" />

                  <div data-ev-id="ev_sim_light_range" className="flex justify-between text-xs text-muted-foreground">
                    <span data-ev-id="ev_sim_light_min">1k</span><span data-ev-id="ev_sim_light_opt">Óptimo: 10-50k lux</span><span data-ev-id="ev_sim_light_max">80k</span>
                  </div>
                </div>

                {/* Riego */}
                <div data-ev-id="ev_sim_irrig">
                  <label data-ev-id="ev_sim_irrig_label" className="flex items-center justify-between text-sm">
                    <span data-ev-id="ev_sim_irrig_icon" className="flex items-center gap-2">
                      <CloudRain className="h-4 w-4 text-cyan-500" /> Frecuencia de Riego
                    </span>
                    <span data-ev-id="ev_sim_irrig_value" className="font-medium">cada {simConditions.irrigation_frequency_days} días</span>
                  </label>
                  <input data-ev-id="ev_sim_irrig_slider"
                type="range" min="1" max="21" step="1"
                value={simConditions.irrigation_frequency_days}
                onChange={(e) => setSimConditions({ ...simConditions, irrigation_frequency_days: Number(e.target.value) })}
                className="mt-2 w-full accent-primary" />

                  <div data-ev-id="ev_sim_irrig_range" className="flex justify-between text-xs text-muted-foreground">
                    <span data-ev-id="ev_sim_irrig_min">Diario</span><span data-ev-id="ev_sim_irrig_opt">Óptimo: 5-14 días</span><span data-ev-id="ev_sim_irrig_max">21 días</span>
                  </div>
                </div>
              </div>

              {/* Duración */}
              <div data-ev-id="ev_sim_duration" className="rounded-2xl border border-border bg-card p-4">
                <h3 data-ev-id="ev_sim_dur_title" className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" /> Horizonte de Predicción
                </h3>
                <div data-ev-id="ev_sim_dur_btns" className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((d) =>
                <button data-ev-id="ev_sim_dur_btn"
                key={d}
                onClick={() => setSimDays(d)}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                simDays === d ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`
                }>

                      {d}d
                    </button>
                )}
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div data-ev-id="ev_sim_results" className="lg:col-span-2 flex flex-col gap-4">
              {simResult &&
            <>
                {/* Estado de condiciones */}
                <div data-ev-id="ev_sim_status" className="rounded-2xl border border-border bg-card p-4">
                  <div data-ev-id="ev_sim_status_header" className="mb-4 flex items-center justify-between">
                    <h3 data-ev-id="ev_sim_status_title" className="text-sm font-medium">Estado de Condiciones</h3>
                    <div data-ev-id="ev_sim_health_factor" className="flex items-center gap-2">
                      <span data-ev-id="ev_sim_health_label" className="text-xs text-muted-foreground">Factor de crecimiento:</span>
                      <span data-ev-id="ev_sim_health_value" className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    simResult.overallHealthFactor >= 0.8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    simResult.overallHealthFactor >= 0.5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`
                    }>
                        {Math.round(simResult.overallHealthFactor * 100)}%
                      </span>
                    </div>
                  </div>
                  <div data-ev-id="ev_sim_conditions_grid" className="grid grid-cols-5 gap-2">
                    {[
                  { key: 'temperature', icon: <Thermometer className="h-4 w-4" />, label: 'Temp' },
                  { key: 'humidity', icon: <Droplets className="h-4 w-4" />, label: 'Humedad' },
                  { key: 'ph', icon: <FlaskConical className="h-4 w-4" />, label: 'pH' },
                  { key: 'light', icon: <Sun className="h-4 w-4" />, label: 'Luz' },
                  { key: 'irrigation', icon: <CloudRain className="h-4 w-4" />, label: 'Riego' }].
                  map(({ key, icon, label }) => {
                    const status = simResult.conditionEffects[key as keyof typeof simResult.conditionEffects];
                    const style = getConditionIcon(status);
                    return (
                      <div data-ev-id="ev_sim_cond_item" key={key} className={`flex flex-col items-center gap-1 rounded-lg p-2 ${style.bg}`}>
                          <span data-ev-id="ev_sim_cond_icon" className={style.color}>{icon}</span>
                          <span data-ev-id="ev_sim_cond_name" className="text-xs font-medium">{label}</span>
                          <span data-ev-id="ev_sim_cond_status" className={`text-xs ${style.color}`}>{style.label}</span>
                        </div>);

                  })}
                  </div>
                </div>

                {/* Predicciones */}
                <div data-ev-id="ev_sim_predictions" className="grid gap-4 sm:grid-cols-3">
                  <div data-ev-id="ev_sim_pred_height" className="rounded-2xl border border-border bg-card p-4 text-center">
                    <TrendingUp className="mx-auto mb-2 h-8 w-8 text-green-500" />
                    <p data-ev-id="ev_sim_pred_h_label" className="text-sm text-muted-foreground">Altura en {simDays} días</p>
                    <p data-ev-id="ev_sim_pred_h_value" className="text-3xl font-bold text-green-600">{simResult.height ?? '--'}</p>
                    <p data-ev-id="ev_sim_pred_h_unit" className="text-sm text-muted-foreground">cm</p>
                    <p data-ev-id="ev_sim_pred_h_delta" className="mt-1 text-xs text-green-600">+{((simResult.height ?? 25) - 25).toFixed(1)} cm</p>
                  </div>
                  <div data-ev-id="ev_sim_pred_sprouts" className="rounded-2xl border border-border bg-card p-4 text-center">
                    <Leaf className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                    <p data-ev-id="ev_sim_pred_s_label" className="text-sm text-muted-foreground">Brotes nuevos</p>
                    <p data-ev-id="ev_sim_pred_s_value" className="text-3xl font-bold text-emerald-600">{simResult.sprouts ?? '--'}</p>
                    <p data-ev-id="ev_sim_pred_s_unit" className="text-sm text-muted-foreground">brotes</p>
                  </div>
                  <div data-ev-id="ev_sim_pred_cladodes" className="rounded-2xl border border-border bg-card p-4 text-center">
                    <Activity className="mx-auto mb-2 h-8 w-8 text-primary" />
                    <p data-ev-id="ev_sim_pred_c_label" className="text-sm text-muted-foreground">Pencas totales</p>
                    <p data-ev-id="ev_sim_pred_c_value" className="text-3xl font-bold text-primary">{simResult.cladodes ?? '--'}</p>
                    <p data-ev-id="ev_sim_pred_c_unit" className="text-sm text-muted-foreground">pencas</p>
                    <p data-ev-id="ev_sim_pred_c_delta" className="mt-1 text-xs text-primary">+{(simResult.cladodes ?? 3) - 3} nuevas</p>
                  </div>
                </div>

                {/* Gráfico de proyección */}
                <div data-ev-id="ev_sim_chart" className="rounded-2xl border border-border bg-card p-4">
                  <h3 data-ev-id="ev_sim_chart_title" className="mb-4 text-sm font-medium">Proyección de Crecimiento</h3>
                  <div data-ev-id="ev_sim_chart_container" className="relative h-48">
                    <svg data-ev-id="ev_sim_chart_svg" viewBox="0 0 400 160" className="h-full w-full">
                      {/* Grid */}
                      {[0, 40, 80, 120, 160].map((y) =>
                    <line data-ev-id="ev_sim_grid_line" key={y} x1="40" y1={y} x2="390" y2={y} stroke="currentColor" strokeOpacity="0.1" />
                    )}
                      {/* Eje Y labels */}
                      <text data-ev-id="ev_sim_y_max" x="35" y="15" textAnchor="end" className="fill-muted-foreground text-[10px]">
                        {Math.round((simResult.dailyGrowth[simResult.dailyGrowth.length - 1]?.height ?? 30) * 1.1)} cm
                      </text>
                      <text data-ev-id="ev_sim_y_min" x="35" y="155" textAnchor="end" className="fill-muted-foreground text-[10px]">0</text>
                      {/* Línea de altura */}
                      <polyline data-ev-id="ev_sim_line"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    points={simResult.dailyGrowth.map((d, i) => {
                      const x = 40 + i / simDays * 350;
                      const maxH = (simResult.dailyGrowth[simResult.dailyGrowth.length - 1]?.height ?? 30) * 1.1;
                      const y = 155 - d.height / maxH * 150;
                      return `${x},${y}`;
                    }).join(' ')} />

                      {/* Punto final */}
                      <circle data-ev-id="ev_sim_endpoint"
                    cx={390}
                    cy={155 - (simResult.dailyGrowth[simResult.dailyGrowth.length - 1]?.height ?? 25) / ((simResult.dailyGrowth[simResult.dailyGrowth.length - 1]?.height ?? 30) * 1.1) * 150}
                    r="4"
                    fill="#22c55e" />

                      {/* Eje X labels */}
                      <text data-ev-id="ev_sim_x_start" x="40" y="158" textAnchor="start" className="fill-muted-foreground text-[10px]">Hoy</text>
                      <text data-ev-id="ev_sim_x_end" x="390" y="158" textAnchor="end" className="fill-muted-foreground text-[10px]">+{simDays}d</text>
                    </svg>
                  </div>
                </div>

                {/* Confianza */}
                <div data-ev-id="ev_sim_confidence" className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div data-ev-id="ev_sim_conf_info" className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span data-ev-id="ev_sim_conf_text" className="text-sm text-muted-foreground">
                      Predicción basada en {simResult.source === 'experimental' ? 'tus experimentos' : 'valores de referencia'}
                    </span>
                  </div>
                  <span data-ev-id="ev_sim_conf_value" className={`rounded-full px-3 py-1 text-sm font-medium ${
                simResult.confidence >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                simResult.confidence >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`
                }>
                    Confianza: {simResult.confidence}%
                  </span>
                </div>

                {/* Visor 3D con Brotes Simulados */}
                <div data-ev-id="ev_sim_3d_section" className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div data-ev-id="ev_sim_3d_header" className="flex items-center justify-between border-b border-border p-3">
                    <div data-ev-id="ev_sim_3d_title" className="flex items-center gap-2">
                      <Sprout className="h-4 w-4 text-emerald-500" />
                      <span data-ev-id="ev_sim_3d_label" className="text-sm font-medium">Vista 3D Predictiva</span>
                      {simResult.sprouts > 0 &&
                    <span data-ev-id="ev_sim_3d_count" className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          +{simResult.sprouts} brotes
                        </span>
                    }
                      {simResult.height && simResult.height > 25 &&
                    <span data-ev-id="ev_sim_3d_scale" className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          ↑{Math.round((simResult.height / 25 - 1) * 100)}% altura
                        </span>
                    }
                    </div>
                    <button
                    data-ev-id="ev_sim_3d_toggle"
                    onClick={() => setShowSprouts3D(!showSprouts3D)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    showSprouts3D ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`
                    }>

                      <Eye className="h-4 w-4" />
                      {showSprouts3D ? 'Ocultar' : 'Visualizar'}
                    </button>
                  </div>

                  {showSprouts3D &&
                <div data-ev-id="ev_sim_3d_viewer_container" className="relative h-72">
                      <div data-ev-id="ev_sim_3d_viewer" ref={simViewerRef} className="h-full w-full" />
                      
                      {/* Overlay de brotes */}
                      {simModelLoaded && sproutPositions.length > 0 &&
                  <div data-ev-id="ev_sim_sprouts_overlay" className="pointer-events-none absolute inset-0">
                          {sproutPositions.map((sprout, idx) =>
                    <div
                      key={idx}
                      data-ev-id="ev_sim_sprout"
                      className="absolute animate-sprout"
                      style={{
                        left: `${sprout.x}%`,
                        top: `${sprout.y}%`,
                        animationDelay: `${sprout.delay}s`
                      }}>

                              <div
                        data-ev-id="ev_sim_sprout_inner"
                        className="relative flex items-center justify-center"
                        style={{ width: sprout.size * 2, height: sprout.size * 2 }}>

                                {/* Glow effect */}
                                <div
                          data-ev-id="ev_sim_sprout_glow"
                          className="absolute rounded-full bg-emerald-400/30 blur-sm"
                          style={{ width: sprout.size * 2.5, height: sprout.size * 2.5 }} />

                                {/* Sprout icon */}
                                <div
                          data-ev-id="ev_sim_sprout_icon"
                          className="relative rounded-full bg-emerald-500 shadow-lg"
                          style={{ width: sprout.size, height: sprout.size }}>

                                  <Sprout
                            className="absolute text-white"
                            style={{
                              width: sprout.size * 0.7,
                              height: sprout.size * 0.7,
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }} />

                                </div>
                              </div>
                            </div>
                    )}
                        </div>
                  }

                      {/* Loading overlay */}
                      {!simModelLoaded &&
                  <div data-ev-id="ev_sim_3d_loading" className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div data-ev-id="ev_sim_3d_loading_content" className="flex flex-col items-center gap-2 text-white">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span data-ev-id="ev_sim_3d_loading_text" className="text-sm">Cargando modelo...</span>
                          </div>
                        </div>
                  }
                    </div>
                }

                  {!showSprouts3D &&
                <div data-ev-id="ev_sim_3d_preview" className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                      <div data-ev-id="ev_sim_3d_preview_icon" className="relative">
                        <Leaf className="h-12 w-12 text-muted-foreground" />
                        {simResult.sprouts > 0 &&
                    <div data-ev-id="ev_sim_3d_preview_badge" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                            +{Math.min(simResult.sprouts, 9)}{simResult.sprouts > 9 ? '+' : ''}
                          </div>
                    }
                      </div>
                      <p data-ev-id="ev_sim_3d_preview_text" className="text-sm text-muted-foreground">
                        {simResult.sprouts > 0 ?
                    `Visualiza ${simResult.sprouts} brote${simResult.sprouts > 1 ? 's' : ''} simulado${simResult.sprouts > 1 ? 's' : ''} en el modelo 3D` :
                    'No se predicen brotes nuevos con estas condiciones'
                    }
                      </p>
                    </div>
                }
                </div>
              </>
            }
            </div>
          </div>
        </div>
      }
    </LayoutV2>);

}

function MetricBar({ label, value, color }: {label: string;value: number;color: string;}) {
  return (
    <div data-ev-id="ev_0660f4563c">
      <div data-ev-id="ev_c09b166df3" className="mb-1 flex justify-between text-xs">
        <span data-ev-id="ev_48db45fa7f">{label}</span>
        <span data-ev-id="ev_5e54b87c80" className="font-medium">{value}%</span>
      </div>
      <div data-ev-id="ev_89c132453d" className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div data-ev-id="ev_18f51234e6" className={`h-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>);

}