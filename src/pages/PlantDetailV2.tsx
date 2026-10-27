import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, Trash2, Thermometer, Sprout, Droplets, Sun, Upload, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { LayoutV2 } from '@/components/LayoutV2';
import { Model3DViewer } from '@/components/Model3DViewer';
import { HealthTrafficLight } from '@/components/HealthTrafficLight';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { uploadModel3D, getModelSignedUrl } from '@/lib/storage-models';
import { getSignedUrl, uploadPhoto } from '@/lib/storage';
import { healthScore, evaluateMeasurement, type Thresholds } from '@/lib/health';
import { saveAlerts } from '@/lib/alerts';
import { rgbToHsv, rgbToHex, greenIndex, hexToRgb, averageColorFromImage } from '@/lib/color';
import { exportEnvironmentalReadings, exportPhenotypicReadings, exportFullReport } from '@/lib/export';

type Plant = Tables<'plants'>;
type EnvReading = Tables<'environmental_readings'>;
type PhenoReading = Tables<'phenotypic_readings'>;

const INPUT = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function PlantDetailV2() {
  const { id } = useParams();
  const { user } = useAuth();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [envReadings, setEnvReadings] = useState<EnvReading[]>([]);
  const [phenoReadings, setPhenoReadings] = useState<PhenoReading[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingModel, setUploadingModel] = useState(false);

  // Forms
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [showPhenoForm, setShowPhenoForm] = useState(false);
  const [busyEnv, setBusyEnv] = useState(false);
  const [busyPheno, setBusyPheno] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [phenoError, setPhenoError] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState('#3a7d44');
  const [phenoFile, setPhenoFile] = useState<File | null>(null);

  const [envForm, setEnvForm] = useState({
    soil_moisture: '', soil_ph: '', air_temperature: '', humidity_percent: '',
    light_intensity: '', par_umol_m2_s: '', vpd_kpa: '', precipitation_mm: '',
    hours_since_rain: ''
  });
  const [phenoForm, setPhenoForm] = useState({
    height_cm: '', cladode_count: '', cladode_length_cm: '', cladode_width_cm: '',
    cladode_thickness_mm: '', new_sprouts: '', sprout_length_cm: '', sprout_width_cm: '',
    spots_present: false, spots_description: '', lesions_present: false,
    lesions_description: '', wrinkles_present: false, wrinkles_description: '',
    turgor: '', texture: '', visual_state: '', general_state: ''
  });

  const load = useCallback(async () => {
    if (!supabase || !user || !id) return;
    setLoading(true);

    const [p, env, pheno, th] = await Promise.all([
    supabase.from('plants').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('environmental_readings').select('*').eq('plant_id', id).eq('user_id', user.id).order('measured_at', { ascending: false }).limit(50),
    supabase.from('phenotypic_readings').select('*').eq('plant_id', id).eq('user_id', user.id).order('measured_at', { ascending: false }).limit(50),
    supabase.from('thresholds').select('*').eq('user_id', user.id).maybeSingle()]
    );

    setPlant(p.data ?? null);
    setEnvReadings(env.data ?? []);
    setPhenoReadings(pheno.data ?? []);
    setThresholds(th.data ?? null);

    if (p.data?.model_3d_id) {
      const { data: m } = await supabase.from('models_3d').select('file_path').eq('id', p.data.model_3d_id).maybeSingle();
      if (m?.file_path) setModelUrl(await getModelSignedUrl(m.file_path));
    }
    setPhotoUrl(await getSignedUrl(p.data?.photo_url ?? null));
    setLoading(false);
  }, [user, id]);

  useEffect(() => {load();}, [load]);

  const latestEnv = envReadings[0] ?? null;
  const latestPheno = phenoReadings[0] ?? null;

  const issues = latestEnv ? evaluateMeasurement({
    ph: latestEnv.soil_ph, soil_moisture: latestEnv.soil_moisture,
    air_temp: latestEnv.air_temperature, humidity: latestEnv.humidity_percent,
    light_lux: latestEnv.light_intensity, ec: latestEnv.ec
  }, thresholds) : [];
  const score = latestEnv ? healthScore(issues) : null;

  const num = (v: string) => v === '' ? null : Number(v);

  // Subir modelo 3D
  const handleModelUpload = async (file: File) => {
    if (!supabase || !user || !id || !plant) return;
    setUploadingModel(true);
    const filePath = await uploadModel3D(user.id, file);
    if (filePath) {
      const { data } = await supabase.from('models_3d').insert({
        user_id: user.id, name: `Modelo de ${plant.name}`,
        file_path: filePath, file_size_kb: Math.round(file.size / 1024)
      }).select('id').single();

      if (data) {
        await supabase.from('plants').update({ model_3d_id: data.id }).eq('id', id);
        setModelUrl(await getModelSignedUrl(filePath));
      }
    }
    setUploadingModel(false);
  };

  // Guardar lectura ambiental
  const handleEnvSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !id) return;
    setBusyEnv(true);
    setEnvError(null);

    const payload = {
      user_id: user.id, plant_id: id,
      soil_moisture: num(envForm.soil_moisture), soil_ph: num(envForm.soil_ph),
      air_temperature: num(envForm.air_temperature), humidity_percent: num(envForm.humidity_percent),
      light_intensity: num(envForm.light_intensity), par_umol_m2_s: num(envForm.par_umol_m2_s),
      vpd_kpa: num(envForm.vpd_kpa), precipitation_mm: num(envForm.precipitation_mm),
      hours_since_rain: num(envForm.hours_since_rain)
    };

    const { error } = await supabase.from('environmental_readings').insert(payload);
    if (error) {
      setEnvError(error.message);
    } else {
      await saveAlerts(user.id, id, evaluateMeasurement({
        ph: payload.soil_ph, soil_moisture: payload.soil_moisture,
        air_temp: payload.air_temperature, humidity: payload.humidity_percent,
        light_lux: payload.light_intensity, ec: null
      }, thresholds));
      setEnvForm({
        soil_moisture: '', soil_ph: '', air_temperature: '', humidity_percent: '',
        light_intensity: '', par_umol_m2_s: '', vpd_kpa: '', precipitation_mm: '',
        hours_since_rain: ''
      });
      setShowEnvForm(false);
      load();
    }
    setBusyEnv(false);
  };

  // Guardar lectura fenotípica
  const handlePhenoFile = (f: File | null) => {
    if (!f) return;
    setPhenoFile(f);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => setColorHex(rgbToHex(averageColorFromImage(img)));
    img.src = url;
  };

  const handlePhenoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !id) return;
    setBusyPheno(true);
    setPhenoError(null);

    let photoPath: string | null = null;
    if (phenoFile) photoPath = await uploadPhoto(user.id, phenoFile, `pheno/${id}`);

    const rgb = hexToRgb(colorHex);
    const hsv = rgbToHsv(rgb);

    const { error } = await supabase.from('phenotypic_readings').insert({
      user_id: user.id, plant_id: id,
      height_cm: num(phenoForm.height_cm), cladode_count: phenoForm.cladode_count ? Number(phenoForm.cladode_count) : null,
      cladode_length_cm: num(phenoForm.cladode_length_cm), cladode_width_cm: num(phenoForm.cladode_width_cm),
      cladode_thickness_mm: num(phenoForm.cladode_thickness_mm),
      new_sprouts: phenoForm.new_sprouts ? Number(phenoForm.new_sprouts) : null,
      sprout_length_cm: num(phenoForm.sprout_length_cm), sprout_width_cm: num(phenoForm.sprout_width_cm),
      spots_present: phenoForm.spots_present, spots_description: phenoForm.spots_description || null,
      lesions_present: phenoForm.lesions_present, lesions_description: phenoForm.lesions_description || null,
      wrinkles_present: phenoForm.wrinkles_present, wrinkles_description: phenoForm.wrinkles_description || null,
      turgor: phenoForm.turgor || null, texture: phenoForm.texture || null,
      visual_state: phenoForm.visual_state || null, general_state: phenoForm.general_state || null,
      color_hex: colorHex, color_hue: hsv.h, color_saturation: hsv.s, color_value: hsv.v,
      green_index: greenIndex(rgb), photo_url: photoPath
    });

    if (error) {
      setPhenoError(error.message);
    } else {
      setPhenoForm({
        height_cm: '', cladode_count: '', cladode_length_cm: '', cladode_width_cm: '',
        cladode_thickness_mm: '', new_sprouts: '', sprout_length_cm: '', sprout_width_cm: '',
        spots_present: false, spots_description: '', lesions_present: false,
        lesions_description: '', wrinkles_present: false, wrinkles_description: '',
        turgor: '', texture: '', visual_state: '', general_state: ''
      });
      setPhenoFile(null);
      setShowPhenoForm(false);
      load();
    }
    setBusyPheno(false);
  };

  const handleDelete = async () => {
    if (!supabase || !user || !id || !confirm('¿Eliminar esta planta?')) return;
    await supabase.from('plants').delete().eq('id', id);
    window.location.href = '/plantas';
  };

  if (loading) return <LayoutV2><div data-ev-id="ev_ea8fd70a61" className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></LayoutV2>;
  if (!plant) return <LayoutV2><p data-ev-id="ev_a479619f7f" className="text-muted-foreground">Planta no encontrada</p></LayoutV2>;

  return (
    <LayoutV2>
      <Link data-ev-id="ev_a695b61289" to="/plantas" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      {/* Cabecera con modelo 3D */}
      <div data-ev-id="ev_332c6b6224" className="grid gap-6 lg:grid-cols-5">
        {/* Modelo 3D - columna principal */}
        <div data-ev-id="ev_e30b0db9f0" className="lg:col-span-3">
          <div data-ev-id="ev_0ad5d8bb26" className="overflow-hidden rounded-2xl border border-border bg-card">
            <div data-ev-id="ev_2899bc74ae" className="flex items-center justify-between border-b border-border p-4">
              <div data-ev-id="ev_478612668a" className="flex items-center gap-3">
                {photoUrl && <img data-ev-id="ev_e14dfbc460" src={photoUrl} alt={plant.name} className="h-12 w-12 rounded-lg object-cover" />}
                <div data-ev-id="ev_57058e799c">
                  <h1 data-ev-id="ev_aa0c04f47c" className="text-xl font-semibold">{plant.name}</h1>
                  <p data-ev-id="ev_c1b30fd1db" className="text-sm text-muted-foreground">{plant.variety ?? 'Sin variedad'} · {plant.location ?? 'Sin ubicación'}</p>
                </div>
              </div>
              <HealthTrafficLight score={score} size="sm" />
            </div>
            
            <div data-ev-id="ev_9cccb1a75f" className="p-4">
              <Model3DViewer
                modelUrl={modelUrl}
                height={380}
                healthScore={score}
                colorimetryHex={latestPheno?.color_hex}
                heightCm={latestPheno?.height_cm ?? plant.height_cm}
                cladodeCount={latestPheno?.cladode_count ?? plant.cladode_count}
                showColorMode={true}
                showUpload={true}
                onFileSelect={handleModelUpload} />

            </div>
            
            {/* Resumen de mediciones */}
            <div data-ev-id="ev_06b2ad4347" className="grid gap-3 border-t border-border bg-muted/20 p-3 sm:p-4">
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Thermometer className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Ambiente</h2>
                    <p className="text-[11px] text-muted-foreground">Condiciones actuales de cultivo</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 sm:p-3">
                  <Stat icon={<Droplets className="h-3.5 w-3.5 text-blue-500" />} label="Humedad sustrato" value={latestEnv?.soil_moisture} unit="%" />
                  <Stat icon={<span data-ev-id="ev_6e65006ed3" className="text-xs">pH</span>} label="pH" value={latestEnv?.soil_ph} />
                  <Stat icon={<Thermometer className="h-3.5 w-3.5 text-orange-500" />} label="Temp. aire" value={latestEnv?.air_temperature} unit="°C" />
                  <Stat icon={<Droplets className="h-3.5 w-3.5 text-blue-500" />} label="Humedad relativa" value={latestEnv?.humidity_percent} unit="%" />
                  <Stat icon={<Sun className="h-3.5 w-3.5 text-yellow-500" />} label="Intensidad luminosa" value={latestEnv?.light_intensity} unit=" lux" />
                  <Stat icon={<Sun className="h-3.5 w-3.5 text-yellow-500" />} label="PAR" value={latestEnv?.par_umol_m2_s} unit=" µmol/m²/s" />
                  <Stat icon={<span className="text-xs">VPD</span>} label="Déficit presión vapor" value={latestEnv?.vpd_kpa} unit=" kPa" />
                  <Stat icon={<Droplets className="h-3.5 w-3.5 text-blue-500" />} label="Precipitación" value={latestEnv?.precipitation_mm} unit=" mm" />
                  <Stat icon={<span className="text-xs">⏱</span>} label="Desde última lluvia" value={latestEnv?.hours_since_rain} unit=" h" />
                </div>
              </section>
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                    <Sprout className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Desarrollo de la planta</h2>
                    <p className="text-[11px] text-muted-foreground">Medidas fenotípicas más recientes</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2 sm:p-3">
                  <Stat icon={<Sprout className="h-3.5 w-3.5 text-green-500" />} label="Altura" value={latestPheno?.height_cm ?? plant.height_cm} unit=" cm" />
                  <Stat icon={<span data-ev-id="ev_0275adb93e" className="text-xs">🌿</span>} label="Pencas" value={latestPheno?.cladode_count ?? plant.cladode_count} />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div data-ev-id="ev_4b964c7992" className="flex flex-col gap-4 lg:col-span-2">
          {/* Capturar datos */}
          <div data-ev-id="ev_575f70d235" className="rounded-xl border border-border bg-card p-4">
            <h3 data-ev-id="ev_695c0b9676" className="mb-3 font-semibold">Registrar medición</h3>
            <div data-ev-id="ev_a1ed535438" className="flex gap-2">
              <button data-ev-id="ev_668d100bdf" onClick={() => {setShowEnvForm(!showEnvForm);setShowPhenoForm(false);}} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${showEnvForm ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>
                <Thermometer className="mr-1 inline h-4 w-4" /> Ambiental
              </button>
              <button data-ev-id="ev_c7303e735e" onClick={() => {setShowPhenoForm(!showPhenoForm);setShowEnvForm(false);}} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${showPhenoForm ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>
                <Sprout className="mr-1 inline h-4 w-4" /> Fenotípica
              </button>
            </div>
            
            {showEnvForm &&
            <form data-ev-id="ev_89cde7267a" onSubmit={handleEnvSubmit} className="mt-4 flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <NumericField label="Humedad del sustrato (%)" value={envForm.soil_moisture} onChange={(value) => setEnvForm({ ...envForm, soil_moisture: value })} />
                  <NumericField label="pH del sustrato" value={envForm.soil_ph} onChange={(value) => setEnvForm({ ...envForm, soil_ph: value })} />
                  <NumericField label="Temperatura del aire (°C)" value={envForm.air_temperature} onChange={(value) => setEnvForm({ ...envForm, air_temperature: value })} />
                  <NumericField label="Humedad relativa (%)" value={envForm.humidity_percent} onChange={(value) => setEnvForm({ ...envForm, humidity_percent: value })} />
                  <NumericField label="Intensidad luminosa (lux)" value={envForm.light_intensity} onChange={(value) => setEnvForm({ ...envForm, light_intensity: value })} />
                  <NumericField label="PAR (µmol/m²/s)" value={envForm.par_umol_m2_s} onChange={(value) => setEnvForm({ ...envForm, par_umol_m2_s: value })} />
                  <NumericField label="Déficit de presión de vapor (kPa)" value={envForm.vpd_kpa} onChange={(value) => setEnvForm({ ...envForm, vpd_kpa: value })} />
                  <NumericField label="Precipitación (mm)" value={envForm.precipitation_mm} onChange={(value) => setEnvForm({ ...envForm, precipitation_mm: value })} />
                  <NumericField label="Horas desde la última lluvia" value={envForm.hours_since_rain} onChange={(value) => setEnvForm({ ...envForm, hours_since_rain: value })} />
                </div>
                {envError && <p role="alert" className="text-sm text-destructive">{envError}</p>}
                <button data-ev-id="ev_d95e7f39b7" type="submit" disabled={busyEnv} className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                  {busyEnv ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Guardar'}
                </button>
              </form>
            }
            
            {showPhenoForm &&
            <form data-ev-id="ev_815ee430a5" onSubmit={handlePhenoSubmit} className="mt-4 flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <NumericField label="Altura (cm)" value={phenoForm.height_cm} onChange={(value) => setPhenoForm({ ...phenoForm, height_cm: value })} />
                  <NumericField label="Número de pencas" value={phenoForm.cladode_count} onChange={(value) => setPhenoForm({ ...phenoForm, cladode_count: value })} step="1" />
                  <NumericField label="Largo de penca (cm)" value={phenoForm.cladode_length_cm} onChange={(value) => setPhenoForm({ ...phenoForm, cladode_length_cm: value })} />
                  <NumericField label="Ancho de penca (cm)" value={phenoForm.cladode_width_cm} onChange={(value) => setPhenoForm({ ...phenoForm, cladode_width_cm: value })} />
                  <NumericField label="Grosor de penca (mm)" value={phenoForm.cladode_thickness_mm} onChange={(value) => setPhenoForm({ ...phenoForm, cladode_thickness_mm: value })} />
                  <NumericField label="Número de brotes nuevos" value={phenoForm.new_sprouts} onChange={(value) => setPhenoForm({ ...phenoForm, new_sprouts: value })} step="1" />
                  <NumericField label="Largo de brote (cm)" value={phenoForm.sprout_length_cm} onChange={(value) => setPhenoForm({ ...phenoForm, sprout_length_cm: value })} />
                  <NumericField label="Ancho de brote (cm)" value={phenoForm.sprout_width_cm} onChange={(value) => setPhenoForm({ ...phenoForm, sprout_width_cm: value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckDescription
                    label="Manchas"
                    checked={phenoForm.spots_present}
                    description={phenoForm.spots_description}
                    onCheckedChange={(checked) => setPhenoForm({ ...phenoForm, spots_present: checked })}
                    onDescriptionChange={(value) => setPhenoForm({ ...phenoForm, spots_description: value })}
                  />
                  <CheckDescription
                    label="Lesiones"
                    checked={phenoForm.lesions_present}
                    description={phenoForm.lesions_description}
                    onCheckedChange={(checked) => setPhenoForm({ ...phenoForm, lesions_present: checked })}
                    onDescriptionChange={(value) => setPhenoForm({ ...phenoForm, lesions_description: value })}
                  />
                  <CheckDescription
                    label="Arrugas"
                    checked={phenoForm.wrinkles_present}
                    description={phenoForm.wrinkles_description}
                    onCheckedChange={(checked) => setPhenoForm({ ...phenoForm, wrinkles_present: checked })}
                    onDescriptionChange={(value) => setPhenoForm({ ...phenoForm, wrinkles_description: value })}
                  />
                  <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    Turgencia
                    <select value={phenoForm.turgor} onChange={(e) => setPhenoForm({ ...phenoForm, turgor: e.target.value })} className={INPUT}>
                      <option value="">Seleccionar</option>
                      <option value="turgente">Turgente</option>
                      <option value="normal">Normal</option>
                      <option value="flacida">Flácida</option>
                    </select>
                  </label>
                  <TextField label="Textura" value={phenoForm.texture} onChange={(value) => setPhenoForm({ ...phenoForm, texture: value })} />
                  <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    Estado visual
                    <select value={phenoForm.visual_state} onChange={(e) => setPhenoForm({ ...phenoForm, visual_state: e.target.value })} className={INPUT}>
                      <option value="">Seleccionar</option>
                      <option value="excelente">Excelente</option>
                      <option value="bueno">Bueno</option>
                      <option value="regular">Regular</option>
                      <option value="deteriorado">Deteriorado</option>
                    </select>
                  </label>
                </div>
                <div data-ev-id="ev_e3d2f17744" className="flex items-center gap-3">
                  <input data-ev-id="ev_40f8c49049" type="file" accept="image/*" onChange={(e) => handlePhenoFile(e.target.files?.[0] ?? null)} className="hidden" id="pheno-photo" />
                  <label data-ev-id="ev_64cb38257e" htmlFor="pheno-photo" className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">
                    <Upload className="mr-1 inline h-4 w-4" /> Foto
                  </label>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">{phenoFile?.name ?? ''}</span>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Color
                  <input data-ev-id="ev_7a332be57c" type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
                  </label>
                  <span data-ev-id="ev_019324cb5e" className="text-xs text-muted-foreground">{colorHex}</span>
                </div>
                {phenoError && <p role="alert" className="text-sm text-destructive">{phenoError}</p>}
                <button data-ev-id="ev_3a9a99523b" type="submit" disabled={busyPheno} className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                  {busyPheno ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Guardar'}
                </button>
              </form>
            }
          </div>
          
          {/* Exportar */}
          <div data-ev-id="ev_64ef586d21" className="rounded-xl border border-border bg-card p-4">
            <h3 data-ev-id="ev_9ec5ed3f48" className="mb-3 font-semibold">Exportar datos</h3>
            <div data-ev-id="ev_87411220db" className="flex flex-col gap-2">
              <button data-ev-id="ev_8942544d46" onClick={() => exportEnvironmentalReadings(envReadings, plant.name)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                <Download className="h-4 w-4" /> Variables ambientales
              </button>
              <button data-ev-id="ev_9d25430b0e" onClick={() => exportPhenotypicReadings(phenoReadings, plant.name)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                <Download className="h-4 w-4" /> Variables fenotípicas
              </button>
              <button data-ev-id="ev_9e1b723d7f" onClick={() => exportFullReport(plant, envReadings, phenoReadings, score)} className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary hover:bg-primary/10">
                <Download className="h-4 w-4" /> Reporte completo
              </button>
            </div>
          </div>
          
          {/* Eliminar */}
          <button data-ev-id="ev_e7e9260efb" onClick={handleDelete} className="flex items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30">
            <Trash2 className="h-4 w-4" /> Eliminar planta
          </button>
        </div>
      </div>

      {/* Historial */}
      <HistorySection title="Historial ambiental" readings={envReadings} type="env" />
      <HistorySection title="Historial fenotípico" readings={phenoReadings} type="pheno" />
    </LayoutV2>);

}

function Stat({ icon, label, value, unit }: {icon: React.ReactNode;label: string;value?: number | null;unit?: string;}) {
  return (
    <div data-ev-id="ev_87974cd63b" className="flex min-h-[76px] flex-col justify-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-2.5 text-center sm:p-3">
      <div data-ev-id="ev_29634e4f6a" className="flex items-center justify-center gap-1 text-xs text-muted-foreground">{icon}</div>
      <div data-ev-id="ev_5a6c6ed7ef" className="text-sm font-semibold leading-tight">{value != null ? `${value}${unit || ''}` : '—'}</div>
      <div data-ev-id="ev_03d0fcf639" className="text-[10px] leading-tight text-muted-foreground">{label}</div>
    </div>);

}

function HistorySection({ title, readings, type }: {title: string;readings: EnvReading[] | PhenoReading[];type: 'env' | 'pheno';}) {
  const [expanded, setExpanded] = useState(false);
  if (readings.length === 0) return null;

  const displayReadings = expanded ? readings : readings.slice(0, 5);

  return (
    <div data-ev-id="ev_45e511ebe4" className="rounded-xl border border-border bg-card">
      <button data-ev-id="ev_449159844a" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left">
        <h3 data-ev-id="ev_84601201c2" className="font-semibold">{title}</h3>
        <div data-ev-id="ev_25c7937216" className="flex items-center gap-2 text-sm text-muted-foreground">
          {readings.length} registros
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <div data-ev-id="ev_33cd525848" className="overflow-x-auto border-t border-border">
        <table data-ev-id="ev_13c878186a" className="w-full text-sm">
          <thead data-ev-id="ev_84af18ef37" className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              {type === 'env' ? (
                <>
                  <th className="px-3 py-2">Humedad sustrato (%)</th><th className="px-3 py-2">pH</th>
                  <th className="px-3 py-2">Temp. aire (°C)</th><th className="px-3 py-2">Humedad relativa (%)</th>
                  <th className="px-3 py-2">Luz (lux)</th><th className="px-3 py-2">PAR (µmol/m²/s)</th>
                  <th className="px-3 py-2">VPD (kPa)</th><th className="px-3 py-2">Precipitación (mm)</th>
                  <th className="px-3 py-2">Horas desde lluvia</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2">Altura (cm)</th><th className="px-3 py-2">Pencas</th>
                  <th className="px-3 py-2">Dimensiones penca (cm/mm)</th><th className="px-3 py-2">Brotes</th>
                  <th className="px-3 py-2">Dimensiones brote (cm)</th><th className="px-3 py-2">Color</th>
                  <th className="px-3 py-2">Manchas</th><th className="px-3 py-2">Lesiones</th>
                  <th className="px-3 py-2">Arrugas</th><th className="px-3 py-2">Turgencia</th>
                  <th className="px-3 py-2">Textura</th><th className="px-3 py-2">Estado</th>
                </>
              )}
            </tr>
          </thead>
          <tbody data-ev-id="ev_f5f7be016c">
            {displayReadings.map((reading) => {
              const date = new Date(reading.measured_at).toLocaleDateString('es-MX');
              if (type === 'env') {
                const env = reading as EnvReading;
                return (
                  <tr key={reading.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{date}</td>
                    <td className="px-3 py-2 text-center">{env.soil_moisture ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.soil_ph ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.air_temperature ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.humidity_percent ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.light_intensity ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.par_umol_m2_s ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.vpd_kpa ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.precipitation_mm ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{env.hours_since_rain ?? '—'}</td>
                  </tr>
                );
              }

              const pheno = reading as PhenoReading;
              return (
                <tr key={reading.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{date}</td>
                  <td className="px-3 py-2 text-center">{pheno.height_cm ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{pheno.cladode_count ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{pheno.cladode_length_cm ?? '—'} × {pheno.cladode_width_cm ?? '—'} / {pheno.cladode_thickness_mm ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{pheno.new_sprouts ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{pheno.sprout_length_cm ?? '—'} × {pheno.sprout_width_cm ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{pheno.color_hex ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{formatFinding(pheno.spots_present, pheno.spots_description)}</td>
                  <td className="px-3 py-2 text-center">{formatFinding(pheno.lesions_present, pheno.lesions_description)}</td>
                  <td className="px-3 py-2 text-center">{formatFinding(pheno.wrinkles_present, pheno.wrinkles_description)}</td>
                  <td className="px-3 py-2 text-center">{pheno.turgor ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{pheno.texture ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{pheno.visual_state ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumericField({ label, value, onChange, step = 'any' }: {label: string;value: string;onChange: (value: string) => void;step?: string;}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      {label}
      <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />
    </label>
  );
}

function TextField({ label, value, onChange }: {label: string;value: string;onChange: (value: string) => void;}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      {label}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />
    </label>
  );
}

function CheckDescription({ label, checked, description, onCheckedChange, onDescriptionChange }: {
  label: string;
  checked: boolean;
  description: string;
  onCheckedChange: (checked: boolean) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
        {label}
      </label>
      {checked && <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} className={INPUT} rows={2} placeholder={`Describe ${label.toLowerCase()}`} />}
    </div>
  );
}

function formatFinding(present: boolean | null, description: string | null) {
  if (present === null) return '—';
  return present ? description || 'Sí' : 'No';
}