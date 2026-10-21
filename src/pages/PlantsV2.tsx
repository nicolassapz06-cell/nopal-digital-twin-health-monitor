import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Plus, Sprout, Loader2, Search, Upload, Box } from 'lucide-react';
import { LayoutV2 } from '@/components/LayoutV2';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { uploadPhoto, getSignedUrl } from '@/lib/storage';
import { uploadModel3D } from '@/lib/storage-models';
import { healthScore, evaluateMeasurement, type Thresholds } from '@/lib/health';
import { getHealthLevel } from '@/lib/health-levels';

type Plant = Tables<'plants'>;
type EnvReading = Tables<'environmental_readings'>;

const INPUT = 'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function PlantsV2() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [envReadings, setEnvReadings] = useState<EnvReading[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '', variety: '', location: '', height_cm: '', cladode_count: '', notes: ''
  });

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);

    const [pl, env, th] = await Promise.all([
    supabase.from('plants').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('environmental_readings').select('*').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(200),
    supabase.from('thresholds').select('*').eq('user_id', user.id).maybeSingle()]
    );

    setPlants(pl.data ?? []);
    setEnvReadings(env.data ?? []);
    setThresholds(th.data ?? null);

    // Cargar URLs de fotos
    const urls: Record<string, string> = {};
    for (const p of pl.data ?? []) {
      if (p.photo_url) {
        const url = await getSignedUrl(p.photo_url);
        if (url) urls[p.id] = url;
      }
    }
    setPhotoUrls(urls);
    setLoading(false);
  }, [user]);

  useEffect(() => {load();}, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !form.name.trim()) return;
    setSaving(true);

    let photoPath: string | null = null;
    let modelId: string | null = null;

    // Subir foto si existe
    if (photoFile) {
      photoPath = await uploadPhoto(user.id, photoFile, 'plants');
    }

    // Subir modelo 3D si existe
    if (modelFile) {
      const modelPath = await uploadModel3D(user.id, modelFile);
      if (modelPath) {
        const { data } = await supabase.from('models_3d').insert({
          user_id: user.id,
          name: `Modelo de ${form.name}`,
          file_path: modelPath,
          file_size_kb: Math.round(modelFile.size / 1024)
        }).select('id').single();
        modelId = data?.id ?? null;
      }
    }

    await supabase.from('plants').insert({
      user_id: user.id,
      name: form.name.trim(),
      variety: form.variety || null,
      location: form.location || null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      cladode_count: form.cladode_count ? Number(form.cladode_count) : null,
      notes: form.notes || null,
      photo_url: photoPath,
      model_3d_id: modelId
    });

    setForm({ name: '', variety: '', location: '', height_cm: '', cladode_count: '', notes: '' });
    setPhotoFile(null);
    setModelFile(null);
    setShowForm(false);
    setSaving(false);
    load();
  };

  // Filtrar plantas
  const filtered = plants.filter((p) =>
  p.name.toLowerCase().includes(search.toLowerCase()) ||
  p.variety?.toLowerCase().includes(search.toLowerCase())
  );

  // Obtener salud de una planta
  const getPlantHealth = (plantId: string) => {
    const env = envReadings.find((r) => r.plant_id === plantId);
    if (!env) return null;
    const issues = evaluateMeasurement({
      ph: env.soil_ph, soil_moisture: env.soil_moisture,
      air_temp: env.air_temperature, humidity: env.humidity_percent,
      light_lux: env.light_intensity, ec: env.ec
    }, thresholds);
    return healthScore(issues);
  };

  return (
    <LayoutV2>
      <header data-ev-id="ev_6fd24aecb9" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-ev-id="ev_e7b8a01509">
          <h1 data-ev-id="ev_d7749b001e" className="text-2xl font-semibold">Mis Plantas</h1>
          <p data-ev-id="ev_1aaebefd17" className="text-sm text-muted-foreground">{plants.length} plantas registradas</p>
        </div>
        <button data-ev-id="ev_d1a00bcb69"
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">

          <Plus className="h-4 w-4" /> Nueva planta
        </button>
      </header>

      {/* Buscador */}
      {plants.length > 0 &&
      <div data-ev-id="ev_103692605c" className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input data-ev-id="ev_c467e0dd6d"
        type="text"
        placeholder="Buscar planta..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />

        </div>
      }

      {/* Modal de nueva planta */}
      {showForm &&
      <div data-ev-id="ev_19654b2bb1" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div data-ev-id="ev_cc5fb86349" className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
            <h2 data-ev-id="ev_8f428634cb" className="mb-4 text-lg font-semibold">Nueva planta</h2>
            
            <form data-ev-id="ev_6646ce2cc1" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div data-ev-id="ev_46dd491dfd" className="grid gap-4 sm:grid-cols-2">
                <label data-ev-id="ev_3cd45920b2" className="flex flex-col gap-1.5 text-sm">
                  Nombre *
                  <input data-ev-id="ev_a28b76d96a"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={INPUT}
                placeholder="Mi nopal"
                required />

                </label>
                <label data-ev-id="ev_546af6278d" className="flex flex-col gap-1.5 text-sm">
                  Variedad
                  <input data-ev-id="ev_4a61d1e01d"
                value={form.variety}
                onChange={(e) => setForm({ ...form, variety: e.target.value })}
                className={INPUT}
                placeholder="Opuntia ficus-indica" />

                </label>
              </div>
              
              <label data-ev-id="ev_b5cab70788" className="flex flex-col gap-1.5 text-sm">
                Ubicación
                <input data-ev-id="ev_fc91092e4a"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={INPUT}
              placeholder="Invernadero 1, cama 3" />

              </label>
              
              <div data-ev-id="ev_7c379163c0" className="grid gap-4 sm:grid-cols-2">
                <label data-ev-id="ev_3ffd93cba8" className="flex flex-col gap-1.5 text-sm">
                  Altura (cm)
                  <input data-ev-id="ev_2345f017e3"
                type="number"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                className={INPUT}
                placeholder="50" />

                </label>
                <label data-ev-id="ev_fee4bf6a26" className="flex flex-col gap-1.5 text-sm">
                  Núm. pencas
                  <input data-ev-id="ev_e90042e992"
                type="number"
                value={form.cladode_count}
                onChange={(e) => setForm({ ...form, cladode_count: e.target.value })}
                className={INPUT}
                placeholder="5" />

                </label>
              </div>
              
              <div data-ev-id="ev_255af6a5b7" className="grid gap-4 sm:grid-cols-2">
                <label data-ev-id="ev_b75cdbd9ab" className="flex flex-col gap-1.5 text-sm">
                  Foto
                  <div data-ev-id="ev_9e00673419" className="flex items-center gap-2">
                    <input data-ev-id="ev_71d2b0aac0"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="photo-input" />

                    <label data-ev-id="ev_3f974465a9"
                  htmlFor="photo-input"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">

                      <Upload className="h-4 w-4" />
                      {photoFile ? photoFile.name : 'Subir foto'}
                    </label>
                  </div>
                </label>
                
                <label data-ev-id="ev_f5a6c18b0d" className="flex flex-col gap-1.5 text-sm">
                  Modelo 3D
                  <div data-ev-id="ev_efc17a1c1d" className="flex items-center gap-2">
                    <input data-ev-id="ev_feac23cfc0"
                  type="file"
                  accept=".glb,.gltf"
                  onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="model-input" />

                    <label data-ev-id="ev_91430914c9"
                  htmlFor="model-input"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">

                      <Box className="h-4 w-4" />
                      {modelFile ? modelFile.name : 'Subir .glb'}
                    </label>
                  </div>
                </label>
              </div>
              
              <label data-ev-id="ev_9318461365" className="flex flex-col gap-1.5 text-sm">
                Notas
                <textarea data-ev-id="ev_8eac5bd4d9"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={INPUT}
              rows={2}
              placeholder="Observaciones adicionales" />

              </label>
              
              <div data-ev-id="ev_1a193918b5" className="flex gap-3 pt-2">
                <button data-ev-id="ev_d21490b82b"
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">

                  Cancelar
                </button>
                <button data-ev-id="ev_f27313e4d8"
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">

                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Lista de plantas */}
      {loading ?
      <div data-ev-id="ev_dddbb60c75" className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div> :
      plants.length === 0 ?
      <div data-ev-id="ev_6fd28b4c4d" className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
          <Sprout className="h-12 w-12 text-muted-foreground" />
          <div data-ev-id="ev_acdaeb6f1c">
            <p data-ev-id="ev_0bfe6efa89" className="font-medium">No hay plantas registradas</p>
            <p data-ev-id="ev_158d26ae48" className="text-sm text-muted-foreground">Agrega tu primera planta para comenzar</p>
          </div>
        </div> :

      <div data-ev-id="ev_271a858666" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
          const score = getPlantHealth(p.id);
          const level = getHealthLevel(score);

          return (
            <Link data-ev-id="ev_b57728bd77"
            key={p.id}
            to={`/plantas/${p.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">

                {/* Imagen */}
                <div data-ev-id="ev_c6a2803982" className="relative h-40 bg-muted">
                  {photoUrls[p.id] ?
                <img data-ev-id="ev_0a152e4718"
                src={photoUrls[p.id]}
                alt={p.name}
                className="h-full w-full object-cover" /> :


                <div data-ev-id="ev_616abfda4a" className="flex h-full items-center justify-center">
                      <Sprout className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                }
                  
                  {/* Indicador de modelo 3D */}
                  {p.model_3d_id &&
                <div data-ev-id="ev_a97272fcc8" className="absolute right-2 top-2 rounded-full bg-primary/90 p-1.5">
                      <Box className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                }
                  
                  {/* Indicador de salud */}
                  <div data-ev-id="ev_1f3c28a865" className={`absolute bottom-2 right-2 rounded-full px-2 py-1 text-xs font-medium ${
                level === 'buena' ? 'bg-green-500 text-white' :
                level === 'media' ? 'bg-yellow-500 text-black' :
                'bg-red-500 text-white'}`
                }>
                    {score !== null ? `${score}%` : 'Sin datos'}
                  </div>
                </div>
                
                {/* Info */}
                <div data-ev-id="ev_cfe85debba" className="flex flex-1 flex-col gap-1 p-4">
                  <h3 data-ev-id="ev_1e61b4ef5e" className="font-semibold group-hover:text-primary">{p.name}</h3>
                  <p data-ev-id="ev_43aff17298" className="text-sm text-muted-foreground">
                    {p.variety ?? 'Sin variedad'}
                  </p>
                  {p.location &&
                <p data-ev-id="ev_7a22aa5eca" className="text-xs text-muted-foreground">
                      📍 {p.location}
                    </p>
                }
                </div>
              </Link>);

        })}
        </div>
      }
    </LayoutV2>);

}