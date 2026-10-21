import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Loader2, FlaskConical, Leaf, BarChart3, Activity, Download, Info, RotateCcw } from 'lucide-react';
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

type Plant = Tables<'plants'>;

export default function Experimentation() {
  const { user } = useAuth();
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

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cargar plantas
  const loadPlants = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);

    const { data } = await supabase.
    from('plants').
    select('*').
    eq('user_id', user.id).
    not('model_3d_id', 'is', null).
    order('name');

    setPlants(data ?? []);
    if (data && data.length > 0 && !selectedPlant) {
      setSelectedPlant(data[0]);
    }
    setLoading(false);
  }, [user, selectedPlant]);

  useEffect(() => {loadPlants();}, [loadPlants]);

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
    // Limpiar análisis previo
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

    // Eventos de carga
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
      modelIsVisible: boolean;
    };

    if (!viewer) {
      setError('Visor no encontrado');
      return;
    }

    setCapturing(true);
    setError(null);

    try {
      // Pausar rotación para captura
      viewer.removeAttribute('auto-rotate');

      // Esperar a que se estabilice el render
      await new Promise((r) => setTimeout(r, 200));

      // Capturar usando la API correcta de model-viewer (Promise)
      const blob = await viewer.toBlob({ mimeType: 'image/png' });

      if (!blob) {
        throw new Error('No se pudo capturar la imagen');
      }

      // Crear imagen desde blob
      const url = URL.createObjectURL(blob);
      setCapturedImage(url);

      // Procesar imagen
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Analizar imagen
        const result = analyzeImageData(imageData);
        setAnalysis(result);

        // Generar imágenes de canales
        const channels: Record<string, string> = { original: url };

        // Canal L*
        const lData = generateChannelImage(imageData, 'l');
        ctx.putImageData(lData, 0, 0);
        channels.l = canvas.toDataURL();

        // Canal a*
        const aData = generateChannelImage(imageData, 'a');
        ctx.putImageData(aData, 0, 0);
        channels.a = canvas.toDataURL();

        // Canal b*
        const bData = generateChannelImage(imageData, 'b');
        ctx.putImageData(bData, 0, 0);
        channels.b = canvas.toDataURL();

        // Mapa de salud
        const healthData = generateHealthMap(imageData);
        ctx.putImageData(healthData, 0, 0);
        channels.health = canvas.toDataURL();

        setChannelImages(channels);
        setCapturing(false);

        // Restaurar rotación si estaba activa
        if (rotate) {
          viewer.setAttribute('auto-rotate', '');
        }
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

      // Restaurar rotación
      if (rotate) {
        viewer.setAttribute('auto-rotate', '');
      }
    }
  };

  // Exportar análisis
  const exportAnalysis = () => {
    if (!analysis || !selectedPlant) return;

    const report = `REPORTE DE ANÁLISIS CIELAB
=============================
Planta: ${selectedPlant.name}
Fecha: ${new Date().toLocaleString('es-MX')}

ESTADÍSTICAS POR CANAL
----------------------
L* (Luminosidad):
  Mínimo: ${analysis.labStats.l.min}
  Máximo: ${analysis.labStats.l.max}
  Media: ${analysis.labStats.l.mean}
  Desv. Est.: ${analysis.labStats.l.stdDev}

a* (Verde-Rojo):
  Mínimo: ${analysis.labStats.a.min}
  Máximo: ${analysis.labStats.a.max}
  Media: ${analysis.labStats.a.mean}
  Desv. Est.: ${analysis.labStats.a.stdDev}

b* (Azul-Amarillo):
  Mínimo: ${analysis.labStats.b.min}
  Máximo: ${analysis.labStats.b.max}
  Media: ${analysis.labStats.b.mean}
  Desv. Est.: ${analysis.labStats.b.stdDev}

MÉTRICAS DE SALUD
------------------
Área verde (a* < -5): ${analysis.healthMetrics.greenArea}%
Área clorótica: ${analysis.healthMetrics.chloroticArea}%
Área necrótica: ${analysis.healthMetrics.necroticArea}%
Área saludable: ${analysis.healthMetrics.healthyArea}%

ESTADO GENERAL: ${analysis.overallStatus.toUpperCase()}
Píxeles analizados: ${analysis.pixelCount.toLocaleString()}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis-cielab-${selectedPlant.name}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':return 'bg-green-500';
      case 'moderate':return 'bg-yellow-500';
      case 'stressed':return 'bg-orange-500';
      case 'critical':return 'bg-red-500';
      default:return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':return 'Saludable';
      case 'moderate':return 'Moderado';
      case 'stressed':return 'Estrés';
      case 'critical':return 'Crítico';
      default:return status;
    }
  };

  if (loading) {
    return (
      <LayoutV2>
        <div data-ev-id="ev_6add58d781" className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutV2>);

  }

  if (plants.length === 0) {
    return (
      <LayoutV2>
        <div data-ev-id="ev_f3b8d08825" className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <FlaskConical className="h-16 w-16 text-muted-foreground" />
          <div data-ev-id="ev_fab7499ca5">
            <h1 data-ev-id="ev_f5a6d929d8" className="text-xl font-semibold">Sin modelos 3D</h1>
            <p data-ev-id="ev_04907bef18" className="text-muted-foreground">Agrega un modelo 3D a una planta para comenzar el análisis.</p>
          </div>
        </div>
      </LayoutV2>);

  }

  return (
    <LayoutV2>
      <canvas data-ev-id="ev_f18f13bff5" ref={canvasRef} className="hidden" />
      
      <header data-ev-id="ev_b68cf30f36" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-ev-id="ev_a86354d094">
          <h1 data-ev-id="ev_9b11daf899" className="flex items-center gap-2 text-2xl font-semibold">
            <FlaskConical className="h-6 w-6 text-primary" />
            Experimentación
          </h1>
          <p data-ev-id="ev_22178e6eb0" className="text-sm text-muted-foreground">Análisis CIELAB del modelo 3D texturizado</p>
        </div>
        
        <select data-ev-id="ev_5198eee1ab"
        value={selectedPlant?.id ?? ''}
        onChange={(e) => setSelectedPlant(plants.find((p) => p.id === e.target.value) ?? null)}
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm">

          {plants.map((p) =>
          <option data-ev-id="ev_2b7645a46b" key={p.id} value={p.id}>{p.name}</option>
          )}
        </select>
      </header>

      <div data-ev-id="ev_f78868a5c3" className="grid gap-6 lg:grid-cols-2">
        {/* Panel izquierdo: Visor 3D */}
        <div data-ev-id="ev_e478ba6cb0" className="flex flex-col gap-4">
          <div data-ev-id="ev_95db9f9a0c" className="overflow-hidden rounded-2xl border border-border bg-card">
            <div data-ev-id="ev_cb9313e8dc" className="flex items-center justify-between border-b border-border p-3">
              <div data-ev-id="ev_1ae8065a13" className="flex items-center gap-2">
                <span data-ev-id="ev_fe3be4dbf8" className="text-sm font-medium">Modelo 3D</span>
                {modelLoaded &&
                <span data-ev-id="ev_babb17b36e" className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Listo
                  </span>
                }
              </div>
              <div data-ev-id="ev_5aae11ea1f" className="flex gap-2">
                <button data-ev-id="ev_26b4aaee3e"
                onClick={() => setRotate(!rotate)}
                className={`rounded-lg p-2 text-sm ${rotate ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                title={rotate ? 'Detener rotación' : 'Rotar'}>

                  <RotateCcw className="h-4 w-4" />
                </button>
                <button data-ev-id="ev_7af4c0493a"
                onClick={captureAndAnalyze}
                disabled={capturing || !modelUrl || !modelLoaded}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">

                  {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {capturing ? 'Analizando...' : 'Capturar y analizar'}
                </button>
              </div>
            </div>
            
            <div data-ev-id="ev_952388b521" className="relative h-80 w-full">
              <div data-ev-id="ev_cddf8d0687" ref={viewerRef} className="h-full w-full" />
              {/* Indicador de carga del modelo - FUERA del viewerRef */}
              {modelUrl && !modelLoaded &&
              <div data-ev-id="ev_53e5a67328" className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div data-ev-id="ev_5ea2c5db04" className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span data-ev-id="ev_a016289ff5" className="text-sm">Cargando modelo...</span>
                  </div>
                </div>
              }
            </div>
            
            {/* Mensaje de error */}
            {error &&
            <div data-ev-id="ev_0290a856be" className="border-t border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            }
          </div>

          {/* Selector de canal */}
          {analysis &&
          <div data-ev-id="ev_eaa5484bc6" className="rounded-xl border border-border bg-card p-4">
              <h3 data-ev-id="ev_d212a008cb" className="mb-3 text-sm font-medium">Visualización de canales</h3>
              <div data-ev-id="ev_67241e84b1" className="flex flex-wrap gap-2">
                {(['original', 'l', 'a', 'b', 'health'] as const).map((ch) =>
              <button data-ev-id="ev_cae9fc6ff3"
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeChannel === ch ?
              'bg-primary text-primary-foreground' :
              'bg-muted hover:bg-muted/80'}`
              }>

                    {ch === 'original' ? 'Original' :
                ch === 'l' ? 'L* (Luz)' :
                ch === 'a' ? 'a* (Verde-Rojo)' :
                ch === 'b' ? 'b* (Azul-Amarillo)' :
                'Mapa de salud'}
                  </button>
              )}
              </div>
              
              {/* Imagen del canal seleccionado */}
              {channelImages[activeChannel] &&
            <div data-ev-id="ev_69491854ad" className="mt-4">
                  <img data-ev-id="ev_90c9827e90"
              src={channelImages[activeChannel]}
              alt={`Canal ${activeChannel}`}
              className="w-full rounded-lg border border-border" />

                  {activeChannel !== 'original' && activeChannel !== 'health' &&
              <div data-ev-id="ev_01015f57f1" className="mt-2 rounded-lg bg-muted/50 p-3 text-xs">
                      <p data-ev-id="ev_908787c0b4" className="font-medium">{CHANNEL_INFO[activeChannel].fullName}</p>
                      <p data-ev-id="ev_4235be6e5f" className="text-muted-foreground">{CHANNEL_INFO[activeChannel].plantMeaning}</p>
                    </div>
              }
                </div>
            }
            </div>
          }
        </div>

        {/* Panel derecho: Resultados del análisis */}
        <div data-ev-id="ev_f48a4e981f" className="flex flex-col gap-4">
          {!analysis ?
          <div data-ev-id="ev_d914ce07a6" className="flex h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 text-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <div data-ev-id="ev_97ed73fec1">
                <p data-ev-id="ev_72e876af7c" className="font-medium">Sin análisis</p>
                <p data-ev-id="ev_1afa9e18c8" className="text-sm text-muted-foreground">Captura una vista del modelo para analizar</p>
              </div>
            </div> :

          <>
              {/* Estado general */}
              <div data-ev-id="ev_b97a81eb2d" className="rounded-2xl border border-border bg-card p-4">
                <div data-ev-id="ev_33ce9b9eea" className="flex items-center justify-between">
                  <div data-ev-id="ev_357aeecbbc">
                    <h3 data-ev-id="ev_63765dc2f9" className="text-sm font-medium text-muted-foreground">Estado general</h3>
                    <p data-ev-id="ev_6c5cdd8e0c" className="mt-1 text-2xl font-bold">{getStatusLabel(analysis.overallStatus)}</p>
                  </div>
                  <div data-ev-id="ev_8f47d18c23" className={`h-16 w-16 rounded-full ${getStatusColor(analysis.overallStatus)}`} />
                </div>
                <p data-ev-id="ev_b5c3764f3c" className="mt-2 text-xs text-muted-foreground">
                  {analysis.pixelCount.toLocaleString()} píxeles analizados
                </p>
              </div>

              {/* Métricas de área */}
              <div data-ev-id="ev_3a148a2bcb" className="rounded-2xl border border-border bg-card p-4">
                <h3 data-ev-id="ev_46fb59f6b4" className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Leaf className="h-4 w-4" /> Métricas de área
                </h3>
                <div data-ev-id="ev_14b4250c69" className="grid grid-cols-2 gap-3">
                  <MetricBar label="Área verde" value={analysis.healthMetrics.greenArea} color="bg-green-500" />
                  <MetricBar label="Área saludable" value={analysis.healthMetrics.healthyArea} color="bg-emerald-500" />
                  <MetricBar label="Área clorótica" value={analysis.healthMetrics.chloroticArea} color="bg-yellow-500" />
                  <MetricBar label="Área necrótica" value={analysis.healthMetrics.necroticArea} color="bg-red-500" />
                </div>
              </div>

              {/* Estadísticas LAB */}
              <div data-ev-id="ev_6679692079" className="rounded-2xl border border-border bg-card p-4">
                <h3 data-ev-id="ev_ae40c6eaf3" className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4" /> Estadísticas CIELAB
                </h3>
                <div data-ev-id="ev_733ed99ecb" className="flex flex-col gap-4">
                  <ChannelStats label="L*" info="Luminosidad" stats={analysis.labStats.l} color="bg-gray-400" />
                  <ChannelStats label="a*" info="Verde(-) / Rojo(+)" stats={analysis.labStats.a} color="bg-green-500" />
                  <ChannelStats label="b*" info="Azul(-) / Amarillo(+)" stats={analysis.labStats.b} color="bg-yellow-500" />
                </div>
              </div>

              {/* Histogramas simplificados */}
              <div data-ev-id="ev_a919a54b97" className="rounded-2xl border border-border bg-card p-4">
                <h3 data-ev-id="ev_10e23a0fd6" className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4" /> Distribución de valores
                </h3>
                <div data-ev-id="ev_a45a68964e" className="flex flex-col gap-4">
                  <MiniHistogram label="L*" data={analysis.histograms.l} color="#888" />
                  <MiniHistogram label="a*" data={analysis.histograms.a} color="#22c55e" />
                  <MiniHistogram label="b*" data={analysis.histograms.b} color="#eab308" />
                </div>
              </div>

              {/* Exportar */}
              <button data-ev-id="ev_4f8e930af0"
            onClick={exportAnalysis}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted">

                <Download className="h-4 w-4" /> Exportar reporte
              </button>
            </>
          }

          {/* Guía CIELAB */}
          <div data-ev-id="ev_48c693ae29" className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <h4 data-ev-id="ev_8602675df0" className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-300">
              <Info className="h-4 w-4" /> Guía CIELAB
            </h4>
            <div data-ev-id="ev_10f982ca14" className="mt-2 flex flex-col gap-2 text-xs text-blue-700 dark:text-blue-400">
              <p data-ev-id="ev_6fb84d4aea"><strong data-ev-id="ev_537be75d45">L*</strong>: Luminosidad (0-100). Valores altos = mayor vigor.</p>
              <p data-ev-id="ev_dec2c087a2"><strong data-ev-id="ev_bcc4b0afbc">a*</strong>: Valores negativos = más clorofila (verde sano). Positivos = estrés.</p>
              <p data-ev-id="ev_da3d0a546f"><strong data-ev-id="ev_bdc6c08d80">b*</strong>: Valores altos positivos = amarillamiento (clorosis, senescencia).</p>
            </div>
          </div>
        </div>
      </div>
    </LayoutV2>);

}

function MetricBar({ label, value, color }: {label: string;value: number;color: string;}) {
  return (
    <div data-ev-id="ev_d8d08d43b6">
      <div data-ev-id="ev_9760c14490" className="mb-1 flex justify-between text-xs">
        <span data-ev-id="ev_263347b560">{label}</span>
        <span data-ev-id="ev_fe1f291b68" className="font-medium">{value}%</span>
      </div>
      <div data-ev-id="ev_204a119e40" className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div data-ev-id="ev_12580f4e28" className={`h-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>);

}

function ChannelStats({
  label,
  info,
  stats,
  color





}: {label: string;info: string;stats: {min: number;max: number;mean: number;stdDev: number;};color: string;}) {
  return (
    <div data-ev-id="ev_86dff83df3">
      <div data-ev-id="ev_fc77a1bdd5" className="mb-1 flex items-center gap-2">
        <div data-ev-id="ev_cad64f53d3" className={`h-3 w-3 rounded ${color}`} />
        <span data-ev-id="ev_85bf168b8f" className="text-sm font-medium">{label}</span>
        <span data-ev-id="ev_6fd393aac8" className="text-xs text-muted-foreground">({info})</span>
      </div>
      <div data-ev-id="ev_76a4359cde" className="grid grid-cols-4 gap-2 text-xs">
        <div data-ev-id="ev_cc8c9a3c61" className="rounded bg-muted p-1.5 text-center">
          <div data-ev-id="ev_150c98a440" className="text-muted-foreground">Mín</div>
          <div data-ev-id="ev_1333a3dd2e" className="font-medium">{stats.min}</div>
        </div>
        <div data-ev-id="ev_cd5507821d" className="rounded bg-muted p-1.5 text-center">
          <div data-ev-id="ev_a4930fea81" className="text-muted-foreground">Máx</div>
          <div data-ev-id="ev_fecbddaf45" className="font-medium">{stats.max}</div>
        </div>
        <div data-ev-id="ev_950750b9f9" className="rounded bg-muted p-1.5 text-center">
          <div data-ev-id="ev_583a3c71ea" className="text-muted-foreground">Media</div>
          <div data-ev-id="ev_8c694716cd" className="font-medium">{stats.mean}</div>
        </div>
        <div data-ev-id="ev_36d5693396" className="rounded bg-muted p-1.5 text-center">
          <div data-ev-id="ev_e083767a21" className="text-muted-foreground">σ</div>
          <div data-ev-id="ev_9c5d520dbf" className="font-medium">{stats.stdDev}</div>
        </div>
      </div>
    </div>);

}

function MiniHistogram({ label, data, color }: {label: string;data: number[];color: string;}) {
  // Reducir a 32 bins para visualización
  const bins = 32;
  const binSize = Math.ceil(data.length / bins);
  const reduced: number[] = [];

  for (let i = 0; i < bins; i++) {
    let sum = 0;
    for (let j = i * binSize; j < Math.min((i + 1) * binSize, data.length); j++) {
      sum += data[j];
    }
    reduced.push(sum);
  }

  const max = Math.max(...reduced, 1);

  return (
    <div data-ev-id="ev_6e49aa2d55">
      <div data-ev-id="ev_5fcf59e537" className="mb-1 text-xs font-medium">{label}</div>
      <div data-ev-id="ev_ef6cd92da6" className="flex h-12 items-end gap-px rounded bg-muted/50 p-1">
        {reduced.map((v, i) =>
        <div data-ev-id="ev_baf29d7595"
        key={i}
        className="flex-1 rounded-t"
        style={{
          height: `${v / max * 100}%`,
          backgroundColor: color,
          minHeight: v > 0 ? '2px' : '0'
        }} />

        )}
      </div>
    </div>);

}