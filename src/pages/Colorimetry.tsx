import { useCallback, useEffect, useState } from 'react';
import { Loader2, Palette, Upload } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { averageColorFromImage, colorHealthLabel, greenIndex, hexToRgb, rgbToHex, rgbToHsv, type Rgb } from '@/lib/color';
import { evaluateColor, formatDate, type Thresholds } from '@/lib/health';
import { saveAlerts } from '@/lib/alerts';
import { uploadPhoto } from '@/lib/storage';

type Plant = Tables<'plants'>;
type ColorReading = Tables<'color_readings'>;

export default function Colorimetry() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [readings, setReadings] = useState<ColorReading[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [plantId, setPlantId] = useState('');
  const [rgb, setRgb] = useState<Rgb>({ r: 63, g: 122, b: 62 });
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const [p, c, t] = await Promise.all([
    supabase.from('plants').select('*').eq('user_id', user.id).order('name'),
    supabase.from('color_readings').select('*').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(24),
    supabase.from('thresholds').select('*').eq('user_id', user.id).maybeSingle()]
    );
    setPlants(p.data ?? []);
    setReadings(c.data ?? []);
    setThresholds(t.data ?? null);
    if (!plantId && p.data && p.data.length > 0) setPlantId(p.data[0].id);
  }, [user, plantId]);

  useEffect(() => {
    load();
  }, [load]);

  const hsv = rgbToHsv(rgb);
  const gi = greenIndex(rgb);
  const hex = rgbToHex(rgb);
  const label = colorHealthLabel(hsv, gi);
  const colorIssue = evaluateColor(hsv.h, thresholds);

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setRgb(averageColorFromImage(img));
      setPreview(url);
    };
    img.src = url;
  };

  const handleSave = async () => {
    if (!supabase || !user || !plantId) return;
    setBusy(true);

    let path: string | null = null;
    if (file) path = await uploadPhoto(user.id, file, `colorimetria/${plantId}`);

    const { error } = await supabase.from('color_readings').insert({
      user_id: user.id,
      plant_id: plantId,
      hex,
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      hue: hsv.h,
      saturation: hsv.s,
      value: hsv.v,
      green_index: gi,
      health_label: label,
      image_url: path,
      notes: notes || null
    });

    if (!error) {
      if (colorIssue) await saveAlerts(user.id, plantId, [colorIssue]);
      setNotes('');
      setFile(null);
      setPreview(null);
      load();
    }
    setBusy(false);
  };

  return (
    <Layout>
      <header data-ev-id="ev_f2008fb22d" className="flex flex-col gap-1">
        <h1 data-ev-id="ev_6f2a5d12e0" className="text-2xl font-semibold tracking-tight">Colorimetria de cladodios</h1>
        <p data-ev-id="ev_d6bd87e6c6" className="text-sm text-muted-foreground">Sube una foto del cladodio o selecciona el color observado; el sistema calcula RGB, HSV e indice de verdor.</p>
      </header>

      <section data-ev-id="ev_7704ddbfba" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div data-ev-id="ev_623952ff78" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <label data-ev-id="ev_63665e0bed" className="flex flex-col gap-1.5 text-sm">Planta
            <select data-ev-id="ev_a4324bc5d7" value={plantId} onChange={(e) => setPlantId(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              {plants.length === 0 ? <option data-ev-id="ev_6225c9a2ba" value="">Sin plantas registradas</option> : null}
              {plants.map((p) => <option data-ev-id="ev_4e284e33a7" key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label data-ev-id="ev_d3df5a9201" className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
            <Upload className="h-5 w-5 text-primary" />
            Sube o captura una foto del cladodio
            <input data-ev-id="ev_8c56c49725" type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="hidden" />
          </label>

          {preview ? <img data-ev-id="ev_27f39b047b" src={preview} alt="Muestra analizada del cladodio" className="h-44 w-full rounded-md object-cover" /> : null}

          <label data-ev-id="ev_e82f795a18" className="flex flex-row items-center gap-3 text-sm">Color medido
            <input data-ev-id="ev_8b7828dccb" type="color" value={hex} onChange={(e) => setRgb(hexToRgb(e.target.value))} className="h-10 w-16 cursor-pointer rounded-md border border-border" />
            <span data-ev-id="ev_eb8e6ecc52" className="text-muted-foreground">{hex.toUpperCase()}</span>
          </label>

          <label data-ev-id="ev_788e2e05c5" className="flex flex-col gap-1.5 text-sm">Notas
            <input data-ev-id="ev_3676e70e8d" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Cladodio basal, cara sur" />
          </label>

          <button data-ev-id="ev_f503dc38db" onClick={handleSave} disabled={busy || !plantId} className="flex flex-row items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />} Guardar lectura
          </button>
        </div>

        <div data-ev-id="ev_2e48699bcc" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <div data-ev-id="ev_615d08a26a" className="h-28 w-full rounded-md border border-border" style={{ backgroundColor: hex }} />
          <div data-ev-id="ev_1d64fa2273" className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="R" value={String(rgb.r)} />
            <Metric label="G" value={String(rgb.g)} />
            <Metric label="B" value={String(rgb.b)} />
            <Metric label="Matiz (H)" value={`${hsv.h}°`} />
            <Metric label="Saturacion" value={`${hsv.s}%`} />
            <Metric label="Valor" value={`${hsv.v}%`} />
          </div>

          <div data-ev-id="ev_9ab360d903" className="flex flex-col gap-2">
            <span data-ev-id="ev_99e36d053f" className="text-xs text-muted-foreground">Indice de verdor (ExG)</span>
            <div data-ev-id="ev_f3ae431ba0" className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div data-ev-id="ev_1f309cfb4a" className="h-full rounded-full bg-primary" style={{ width: `${gi}%` }} />
            </div>
            <span data-ev-id="ev_85549eb8da" className="text-sm font-medium">{gi} / 100</span>
          </div>

          <div data-ev-id="ev_a95fe8c05f" className={`rounded-md p-3 text-sm ${colorIssue ? 'bg-warning/10 text-foreground' : 'bg-success/10 text-foreground'}`}>
            <p data-ev-id="ev_01beb92ac8" className="font-medium">{label}</p>
            <p data-ev-id="ev_af5dafac8f" className="text-xs text-muted-foreground">{colorIssue ? colorIssue.recommendation : 'El matiz se encuentra dentro del rango verde saludable configurado.'}</p>
          </div>
        </div>
      </section>

      <section data-ev-id="ev_b47e7cfb8c" className="flex flex-col gap-3">
        <h2 data-ev-id="ev_21861db952" className="text-lg font-semibold tracking-tight">Lecturas registradas</h2>
        {readings.length === 0 ?
        <p data-ev-id="ev_16bbc39145" className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Aun no hay lecturas de color.</p> :

        <div data-ev-id="ev_d1ce901323" className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {readings.map((c) => {
            const plant = plants.find((p) => p.id === c.plant_id);
            return (
              <div data-ev-id="ev_172a6467a4" key={c.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                  <div data-ev-id="ev_99c026f5e1" className="h-12 w-full rounded-md border border-border" style={{ backgroundColor: c.hex }} />
                  <span data-ev-id="ev_af9f61f428" className="truncate text-xs font-medium">{plant?.name ?? 'Planta'}</span>
                  <span data-ev-id="ev_d0f05c559e" className="text-xs text-muted-foreground">{c.health_label}</span>
                  <span data-ev-id="ev_b9a9bb70cb" className="text-xs text-muted-foreground">{formatDate(c.measured_at)}</span>
                </div>);

          })}
          </div>
        }
      </section>
    </Layout>);

}

function Metric({ label, value }: {label: string;value: string;}) {
  return (
    <div data-ev-id="ev_3d524ae6c9" className="flex flex-col gap-0.5 rounded-md bg-muted px-3 py-2">
      <span data-ev-id="ev_0912b736fe" className="text-xs text-muted-foreground">{label}</span>
      <span data-ev-id="ev_924e988b95" className="font-medium">{value}</span>
    </div>);

}