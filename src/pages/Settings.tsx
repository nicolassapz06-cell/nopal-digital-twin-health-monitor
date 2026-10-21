import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Thresholds } from '@/lib/health';

const FIELDS: {min: keyof Thresholds;max: keyof Thresholds;label: string;step: string;}[] = [
{ min: 'ph_min', max: 'ph_max', label: 'pH del sustrato', step: '0.1' },
{ min: 'moisture_min', max: 'moisture_max', label: 'Humedad del sustrato (%)', step: '1' },
{ min: 'ec_min', max: 'ec_max', label: 'Conductividad electrica (dS/m)', step: '0.1' },
{ min: 'temp_min', max: 'temp_max', label: 'Temperatura (°C)', step: '0.5' },
{ min: 'humidity_min', max: 'humidity_max', label: 'Humedad relativa (%)', step: '1' },
{ min: 'light_min', max: 'light_max', label: 'Luminosidad (lux)', step: '500' },
{ min: 'hue_min', max: 'hue_max', label: 'Matiz verde saludable (°)', step: '1' }];


const INPUT = 'rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

export default function Settings() {
  const { user } = useAuth();
  const [values, setValues] = useState<Thresholds | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('thresholds').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setValues(data);
      return;
    }
    const { data: created } = await supabase.from('thresholds').insert({ user_id: user.id }).select().maybeSingle();
    setValues(created ?? null);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !values) return;
    setBusy(true);
    setSaved(false);
    const { user_id: _ignored, updated_at: _ts, ...payload } = values;
    const { error } = await supabase.from('thresholds').update(payload).eq('user_id', user.id);
    setBusy(false);
    if (!error) setSaved(true);
  };

  return (
    <Layout>
      <header data-ev-id="ev_62b554c9e4" className="flex flex-col gap-1">
        <h1 data-ev-id="ev_e49605381f" className="text-2xl font-semibold tracking-tight">Umbrales agronomicos</h1>
        <p data-ev-id="ev_4cf255e326" className="text-sm text-muted-foreground">Define los rangos optimos para tu cultivo; el indice de salud y las alertas se calculan con estos valores.</p>
      </header>

      {!values ?
      <p data-ev-id="ev_4ac6ad5a70" className="text-sm text-muted-foreground">Cargando configuracion…</p> :

      <form data-ev-id="ev_77e67e12ab" onSubmit={handleSave} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          {FIELDS.map((f) =>
        <div data-ev-id="ev_bdd24ec1b1" key={f.label} className="grid grid-cols-1 items-center gap-3 md:grid-cols-3">
              <span data-ev-id="ev_97a4f03389" className="text-sm font-medium">{f.label}</span>
              <label data-ev-id="ev_e50c7d26a4" className="flex flex-col gap-1.5 text-xs text-muted-foreground">Minimo
                <input data-ev-id="ev_da66f71aa2" type="number" step={f.step} value={String(values[f.min])} onChange={(e) => setValues({ ...values, [f.min]: Number(e.target.value) })} className={INPUT} />
              </label>
              <label data-ev-id="ev_0bae96201a" className="flex flex-col gap-1.5 text-xs text-muted-foreground">Maximo
                <input data-ev-id="ev_5d14c9a8a7" type="number" step={f.step} value={String(values[f.max])} onChange={(e) => setValues({ ...values, [f.max]: Number(e.target.value) })} className={INPUT} />
              </label>
            </div>
        )}

          <div data-ev-id="ev_94283abb96" className="flex flex-row items-center gap-3">
            <button data-ev-id="ev_55f7305c27" type="submit" disabled={busy} className="flex flex-row items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />} Guardar umbrales
            </button>
            {saved ? <span data-ev-id="ev_1522616050" className="text-sm text-success">Cambios guardados</span> : null}
          </div>
        </form>
      }
    </Layout>);

}