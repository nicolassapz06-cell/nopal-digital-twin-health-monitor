import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { LineChart } from '@/components/Chart';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { evaluateMeasurement, healthScore, healthStatus, formatDate, VARIABLES, type Thresholds } from '@/lib/health';
import { saveAlerts } from '@/lib/alerts';
import { getSignedUrl } from '@/lib/storage';

type Plant = Tables<'plants'>;
type Measurement = Tables<'measurements'>;
type ColorReading = Tables<'color_readings'>;

const INPUT = 'rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const EMPTY = { ph: '', soil_moisture: '', ec: '', air_temp: '', humidity: '', light_lux: '', irrigation_ml: '', notes: '' };

export default function PlantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [colors, setColors] = useState<ColorReading[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !user || !id) return;
    setLoading(true);
    const [p, m, c, t] = await Promise.all([
    supabase.from('plants').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('measurements').select('*').eq('plant_id', id).eq('user_id', user.id).order('measured_at', { ascending: false }).limit(100),
    supabase.from('color_readings').select('*').eq('plant_id', id).eq('user_id', user.id).order('measured_at', { ascending: false }).limit(20),
    supabase.from('thresholds').select('*').eq('user_id', user.id).maybeSingle()]
    );
    setPlant(p.data ?? null);
    setMeasurements(m.data ?? []);
    setColors(c.data ?? []);
    setThresholds(t.data ?? null);
    setPhoto(await getSignedUrl(p.data?.photo_url ?? null));
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = measurements[0] ?? null;
  const issues = latest ? evaluateMeasurement(latest, thresholds) : [];
  const score = latest ? healthScore(issues) : null;
  const status = healthStatus(score ?? 0);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const num = (v: string) => v === '' ? null : Number(v);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !id) return;
    setBusy(true);

    const payload = {
      user_id: user.id,
      plant_id: id,
      ph: num(form.ph),
      soil_moisture: num(form.soil_moisture),
      ec: num(form.ec),
      air_temp: num(form.air_temp),
      humidity: num(form.humidity),
      light_lux: num(form.light_lux),
      irrigation_ml: num(form.irrigation_ml),
      notes: form.notes || null
    };

    const { error } = await supabase.from('measurements').insert(payload);
    if (!error) {
      await saveAlerts(user.id, id, evaluateMeasurement(payload as Partial<Measurement>, thresholds));
      setForm(EMPTY);
      load();
    }
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!supabase || !user || !id) return;
    await supabase.from('plants').delete().eq('id', id).eq('user_id', user.id);
    window.location.href = '/plantas';
  };

  const trend = (key: 'ph' | 'soil_moisture' | 'air_temp' | 'irrigation_ml' | 'ec') =>
  measurements.
  filter((m) => m[key] !== null).
  slice(0, 14).
  reverse().
  map((m) => ({ label: new Date(m.measured_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }), value: Number(m[key]) }));

  if (loading) return <Layout><p data-ev-id="ev_5fcc6212e7" className="text-sm text-muted-foreground">Cargando gemelo…</p></Layout>;
  if (!plant) return <Layout><p data-ev-id="ev_bf61d07715" className="text-sm text-muted-foreground">No se encontro la planta.</p></Layout>;

  return (
    <Layout>
      <Link data-ev-id="ev_309ee03c6f" to="/plantas" className="flex w-fit flex-row items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Volver</Link>

      <header data-ev-id="ev_ef8d99af80" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div data-ev-id="ev_8676df55c2" className="flex flex-row items-center gap-4">
          {photo ? <img data-ev-id="ev_e7444070a1" src={photo} alt={`Fotografia de ${plant.name}`} className="h-20 w-20 rounded-md object-cover" /> : <div data-ev-id="ev_e38206000c" className="flex h-20 w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">Sin foto</div>}
          <div data-ev-id="ev_55c43db8e5" className="flex flex-col gap-1">
            <h1 data-ev-id="ev_558cca22c3" className="text-2xl font-semibold tracking-tight">{plant.name}</h1>
            <p data-ev-id="ev_b8f6d68f4e" className="text-sm text-muted-foreground">{plant.variety || 'Variedad sin definir'} · {plant.location || 'Sin ubicacion'} · sustrato {plant.substrate || 'n/d'}</p>
            <p data-ev-id="ev_8ea92d7d20" className="text-xs text-muted-foreground">{plant.cladode_count ?? '—'} cladodios · {plant.height_cm ?? '—'} cm · plantada {plant.planted_on || 'n/d'}</p>
          </div>
        </div>

        <div data-ev-id="ev_7d5ae28521" className="flex flex-col items-start gap-2 md:items-end">
          <span data-ev-id="ev_453d8c0998" className="text-xs text-muted-foreground">Indice de salud</span>
          <span data-ev-id="ev_40edd616d3" className="text-4xl font-semibold tracking-tight">{score === null ? '—' : `${score}%`}</span>
          <span data-ev-id="ev_ef2c9cebba" className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.tone === 'success' ? 'bg-success/12 text-success' : status.tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-destructive/12 text-destructive'}`}>{score === null ? 'Sin datos' : status.label}</span>
        </div>
      </header>

      <section data-ev-id="ev_d82f6147b8" className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {VARIABLES.map((v) => {
          const value = latest ? latest[v.key] : null;
          const out = issues.some((i) => i.variable === String(v.key));
          return (
            <div data-ev-id="ev_7761f37c79" key={String(v.key)} className={`flex flex-col gap-1 rounded-lg border p-3 ${out ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}>
              <span data-ev-id="ev_2f87d81e71" className="text-xs text-muted-foreground">{v.label}</span>
              <span data-ev-id="ev_3f5982c62b" className="text-lg font-semibold">{value === null || value === undefined ? '—' : `${value}${v.unit}`}</span>
            </div>);

        })}
        <div data-ev-id="ev_4016afbc43" className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
          <span data-ev-id="ev_01e07453be" className="text-xs text-muted-foreground">Riego</span>
          <span data-ev-id="ev_e71556fa71" className="text-lg font-semibold">{latest?.irrigation_ml ?? '—'} ml</span>
        </div>
      </section>

      {issues.length > 0 ?
      <section data-ev-id="ev_7ae4718d8d" className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/5 p-4">
          <h2 data-ev-id="ev_f34117fe43" className="text-sm font-semibold">Diagnostico y recomendaciones</h2>
          <ul data-ev-id="ev_e7f5d9fde6" className="flex flex-col gap-2">
            {issues.map((i) =>
          <li data-ev-id="ev_32630d033b" key={i.variable} className="flex flex-col">
                <span data-ev-id="ev_2f655324a3" className="text-sm font-medium">{i.message}</span>
                <span data-ev-id="ev_e888409c05" className="text-xs text-muted-foreground">{i.recommendation}</span>
              </li>
          )}
          </ul>
        </section> :
      null}

      <section data-ev-id="ev_f62784512b" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div data-ev-id="ev_5281eabbf7" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <span data-ev-id="ev_60f135acce" className="text-sm font-medium">pH</span>
          <LineChart points={trend('ph')} band={thresholds ? { min: Number(thresholds.ph_min), max: Number(thresholds.ph_max) } : undefined} />
        </div>
        <div data-ev-id="ev_a04a48ba40" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <span data-ev-id="ev_eff8b1ce61" className="text-sm font-medium">Humedad del sustrato</span>
          <LineChart points={trend('soil_moisture')} color="#2f7fa8" unit="%" band={thresholds ? { min: Number(thresholds.moisture_min), max: Number(thresholds.moisture_max) } : undefined} />
        </div>
        <div data-ev-id="ev_4ac240b893" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <span data-ev-id="ev_19fd07c89d" className="text-sm font-medium">Riego aplicado (ml)</span>
          <LineChart points={trend('irrigation_ml')} color="#3a86a8" unit=" ml" />
        </div>
        <div data-ev-id="ev_da624bd247" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <span data-ev-id="ev_11532529a7" className="text-sm font-medium">Conductividad electrica</span>
          <LineChart points={trend('ec')} color="#d9782f" unit=" dS/m" band={thresholds ? { min: Number(thresholds.ec_min), max: Number(thresholds.ec_max) } : undefined} />
        </div>
      </section>

      <section data-ev-id="ev_d5f8176773" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <h2 data-ev-id="ev_cc41a34960" className="text-lg font-semibold tracking-tight">Registrar medicion</h2>
        <form data-ev-id="ev_f73ee0d20b" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <label data-ev-id="ev_2b8850b930" className="flex flex-col gap-1.5 text-sm">pH<input data-ev-id="ev_88fa62763c" type="number" step="0.1" value={form.ph} onChange={set('ph')} className={INPUT} /></label>
          <label data-ev-id="ev_95e85c63ff" className="flex flex-col gap-1.5 text-sm">Humedad sustrato (%)<input data-ev-id="ev_14e31213a4" type="number" step="0.1" value={form.soil_moisture} onChange={set('soil_moisture')} className={INPUT} /></label>
          <label data-ev-id="ev_97f169ab92" className="flex flex-col gap-1.5 text-sm">CE (dS/m)<input data-ev-id="ev_f41b0818c1" type="number" step="0.01" value={form.ec} onChange={set('ec')} className={INPUT} /></label>
          <label data-ev-id="ev_57cecfe75c" className="flex flex-col gap-1.5 text-sm">Temperatura (°C)<input data-ev-id="ev_6a1c62fdd7" type="number" step="0.1" value={form.air_temp} onChange={set('air_temp')} className={INPUT} /></label>
          <label data-ev-id="ev_3c87ec75ca" className="flex flex-col gap-1.5 text-sm">Humedad relativa (%)<input data-ev-id="ev_61a31b139a" type="number" step="0.1" value={form.humidity} onChange={set('humidity')} className={INPUT} /></label>
          <label data-ev-id="ev_c5426dffb0" className="flex flex-col gap-1.5 text-sm">Luz (lux)<input data-ev-id="ev_9eca547803" type="number" value={form.light_lux} onChange={set('light_lux')} className={INPUT} /></label>
          <label data-ev-id="ev_4d15eac953" className="flex flex-col gap-1.5 text-sm">Riego (ml)<input data-ev-id="ev_9e5dfc36f3" type="number" value={form.irrigation_ml} onChange={set('irrigation_ml')} className={INPUT} /></label>
          <label data-ev-id="ev_c796e82649" className="flex flex-col gap-1.5 text-sm">Notas<input data-ev-id="ev_fecc23e369" value={form.notes} onChange={set('notes')} className={INPUT} /></label>

          <button data-ev-id="ev_78afe330fd" type="submit" disabled={busy} className="col-span-2 flex flex-row items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 md:col-span-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar
          </button>
        </form>
      </section>

      <section data-ev-id="ev_6937dc59b1" className="flex flex-col gap-3">
        <h2 data-ev-id="ev_768936ef65" className="text-lg font-semibold tracking-tight">Historial de mediciones</h2>
        <div data-ev-id="ev_7468fc9f6d" className="overflow-x-auto rounded-lg border border-border bg-card">
          <table data-ev-id="ev_b9fe88e0ee" className="w-full text-left text-sm">
            <thead data-ev-id="ev_5f5ccb6323" className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr data-ev-id="ev_ac825e6a7d"><th data-ev-id="ev_844f046482" className="px-3 py-2">Fecha</th><th data-ev-id="ev_02b8a5eb88" className="px-3 py-2">pH</th><th data-ev-id="ev_bde56bac30" className="px-3 py-2">Hum.</th><th data-ev-id="ev_aaf2be9505" className="px-3 py-2">CE</th><th data-ev-id="ev_c25e1bc20f" className="px-3 py-2">Temp.</th><th data-ev-id="ev_c138d1d1ae" className="px-3 py-2">HR</th><th data-ev-id="ev_142b170412" className="px-3 py-2">Luz</th><th data-ev-id="ev_c67e365203" className="px-3 py-2">Riego</th></tr>
            </thead>
            <tbody data-ev-id="ev_cc0b927582">
              {measurements.length === 0 ?
              <tr data-ev-id="ev_7974e79c81"><td data-ev-id="ev_6ae3537aa9" colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Sin mediciones registradas.</td></tr> :
              measurements.map((m) =>
              <tr data-ev-id="ev_1e26733f6e" key={m.id} className="border-b border-border last:border-0">
                  <td data-ev-id="ev_c7c0bfebb6" className="px-3 py-2">{formatDate(m.measured_at)}</td>
                  <td data-ev-id="ev_f3de119cd1" className="px-3 py-2">{m.ph ?? '—'}</td>
                  <td data-ev-id="ev_f78ad3004e" className="px-3 py-2">{m.soil_moisture ?? '—'}</td>
                  <td data-ev-id="ev_d25653e844" className="px-3 py-2">{m.ec ?? '—'}</td>
                  <td data-ev-id="ev_5a9b15f258" className="px-3 py-2">{m.air_temp ?? '—'}</td>
                  <td data-ev-id="ev_717c6739e9" className="px-3 py-2">{m.humidity ?? '—'}</td>
                  <td data-ev-id="ev_e54cff6b35" className="px-3 py-2">{m.light_lux ?? '—'}</td>
                  <td data-ev-id="ev_f2863a0ad9" className="px-3 py-2">{m.irrigation_ml ?? '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section data-ev-id="ev_a02f70d776" className="flex flex-col gap-3">
        <div data-ev-id="ev_6aa52339df" className="flex flex-row items-center justify-between">
          <h2 data-ev-id="ev_bda8a9282c" className="text-lg font-semibold tracking-tight">Colorimetria reciente</h2>
          <Link data-ev-id="ev_b5c7422b9e" to="/colorimetria" className="text-sm text-primary underline-offset-4 hover:underline">Nueva lectura de color</Link>
        </div>
        {colors.length === 0 ?
        <p data-ev-id="ev_9a6ae29b39" className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Sin lecturas de color para esta planta.</p> :

        <div data-ev-id="ev_429fe1e0fc" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {colors.map((c) =>
          <div data-ev-id="ev_d9f7860655" key={c.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                <div data-ev-id="ev_00c34dae54" className="h-12 w-full rounded-md border border-border" style={{ backgroundColor: c.hex }} />
                <span data-ev-id="ev_2f41949d92" className="text-xs font-medium">{c.health_label}</span>
                <span data-ev-id="ev_6025738783" className="text-xs text-muted-foreground">H {c.hue}° · S {c.saturation}% · V {c.value}%</span>
                <span data-ev-id="ev_5d46577f7d" className="text-xs text-muted-foreground">{formatDate(c.measured_at)}</span>
              </div>
          )}
          </div>
        }
      </section>

      <button data-ev-id="ev_2122c3e989" onClick={handleDelete} className="flex w-fit flex-row items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/5">
        <Trash2 className="h-4 w-4" /> Eliminar planta y su historial
      </button>
    </Layout>);

}