import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, Save, Info } from 'lucide-react';
import { LayoutV2 } from '@/components/LayoutV2';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Thresholds } from '@/lib/health';

const FIELDS: {min: keyof Thresholds;max: keyof Thresholds;label: string;step: string;icon: string;}[] = [
{ min: 'ph_min', max: 'ph_max', label: 'pH del sustrato', step: '0.1', icon: '🧪' },
{ min: 'moisture_min', max: 'moisture_max', label: 'Humedad del sustrato', step: '1', icon: '💧' },
{ min: 'temp_min', max: 'temp_max', label: 'Temperatura', step: '0.5', icon: '🌡️' },
{ min: 'humidity_min', max: 'humidity_max', label: 'Humedad relativa', step: '1', icon: '💨' },
{ min: 'light_min', max: 'light_max', label: 'Luminosidad (lux)', step: '500', icon: '☀️' },
{ min: 'ec_min', max: 'ec_max', label: 'Conductividad eléctrica', step: '0.1', icon: '⚡' },
{ min: 'hue_min', max: 'hue_max', label: 'Matiz verde saludable', step: '1', icon: '🎨' }];


const INPUT = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center';

export default function SettingsV2() {
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

  useEffect(() => {load();}, [load]);

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
    <LayoutV2>
      <header data-ev-id="ev_34e992e833">
        <h1 data-ev-id="ev_614e1fad3b" className="text-2xl font-semibold">Configuración</h1>
        <p data-ev-id="ev_d45c43e554" className="text-sm text-muted-foreground">Ajusta los parámetros de monitoreo</p>
      </header>

      {/* Umbrales */}
      <div data-ev-id="ev_a75dae24bb" className="rounded-2xl border border-border bg-card">
        <div data-ev-id="ev_3e1a04a862" className="border-b border-border p-4">
          <h2 data-ev-id="ev_3abd9c928f" className="font-semibold">Umbrales óptimos</h2>
          <p data-ev-id="ev_62a34301a3" className="text-sm text-muted-foreground">Define los rangos ideales para tus plantas. El índice de salud y las alertas se calculan con estos valores.</p>
        </div>

        {!values ?
        <div data-ev-id="ev_e3897dff66" className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div> :

        <form data-ev-id="ev_3fc491db17" onSubmit={handleSave} className="p-4">
            <div data-ev-id="ev_c27b5d7cbc" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) =>
            <div data-ev-id="ev_c02473cb9b" key={f.label} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div data-ev-id="ev_d1c18c72bf" className="mb-3 flex items-center gap-2">
                    <span data-ev-id="ev_3227edd1d6" className="text-lg">{f.icon}</span>
                    <span data-ev-id="ev_66eae4330a" className="text-sm font-medium">{f.label}</span>
                  </div>
                  <div data-ev-id="ev_686dba537c" className="flex items-center gap-2">
                    <div data-ev-id="ev_cccb76b998" className="flex-1">
                      <label data-ev-id="ev_a7e0e90d72" className="mb-1 block text-xs text-muted-foreground">Mín</label>
                      <input data-ev-id="ev_5f284ab77c"
                  type="number"
                  step={f.step}
                  value={String(values[f.min])}
                  onChange={(e) => setValues({ ...values, [f.min]: Number(e.target.value) })}
                  className={INPUT} />

                    </div>
                    <span data-ev-id="ev_bcae56ce7d" className="mt-5 text-muted-foreground">—</span>
                    <div data-ev-id="ev_5f433e5038" className="flex-1">
                      <label data-ev-id="ev_d4e192db2c" className="mb-1 block text-xs text-muted-foreground">Máx</label>
                      <input data-ev-id="ev_05cf7c3be4"
                  type="number"
                  step={f.step}
                  value={String(values[f.max])}
                  onChange={(e) => setValues({ ...values, [f.max]: Number(e.target.value) })}
                  className={INPUT} />

                    </div>
                  </div>
                </div>
            )}
            </div>

            <div data-ev-id="ev_600a9e20f1" className="mt-6 flex items-center gap-4">
              <button data-ev-id="ev_1a4f911b44"
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">

                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar cambios
              </button>
              {saved && <span data-ev-id="ev_3017d5a016" className="text-sm text-green-600">Cambios guardados ✓</span>}
            </div>
          </form>
        }
      </div>

      {/* Guía */}
      <div data-ev-id="ev_2d8017ea9f" className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div data-ev-id="ev_ae986c1625">
          <p data-ev-id="ev_41c8855e8f" className="font-medium text-blue-800 dark:text-blue-300">Cómo funciona el índice de salud</p>
          <p data-ev-id="ev_b75e97e12b" className="mt-1 text-sm text-blue-700 dark:text-blue-400">
            El sistema compara cada lectura ambiental con tus umbrales y calcula un porcentaje de salud.
            <br data-ev-id="ev_c542495058" />
            <strong data-ev-id="ev_36bc166462">🟢 Verde (75-100%)</strong> = Condiciones óptimas &nbsp;&bull;&nbsp;
            <strong data-ev-id="ev_fbf0cbff7d">🟡 Amarillo (45-74%)</strong> = Requiere atención &nbsp;&bull;&nbsp;
            <strong data-ev-id="ev_f391ff6c38">🔴 Rojo (&lt;45%)</strong> = Urgente
          </p>
        </div>
      </div>
    </LayoutV2>);

}