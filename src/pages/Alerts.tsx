import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BellRing, Check } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { formatDate } from '@/lib/health';

type Alert = Tables<'alerts'>;
type Plant = Tables<'plants'>;

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [a, p] = await Promise.all([
    supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('plants').select('*').eq('user_id', user.id)]
    );
    setAlerts(a.data ?? []);
    setPlants(p.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string) => {
    if (!supabase || !user) return;
    await supabase.from('alerts').update({ resolved: true }).eq('id', id).eq('user_id', user.id);
    load();
  };

  const visible = alerts.filter((a) => showResolved ? true : !a.resolved);

  return (
    <Layout>
      <header data-ev-id="ev_928e8fe65f" className="flex flex-row items-start justify-between gap-4">
        <div data-ev-id="ev_6623fbcd47" className="flex flex-col gap-1">
          <h1 data-ev-id="ev_ea50ae1f66" className="text-2xl font-semibold tracking-tight">Alertas y recomendaciones</h1>
          <p data-ev-id="ev_189dfb14de" className="text-sm text-muted-foreground">Generadas automaticamente cuando una variable sale de los umbrales configurados.</p>
        </div>
        <label data-ev-id="ev_2d85761ea8" className="flex flex-row items-center gap-2 text-sm text-muted-foreground">
          <input data-ev-id="ev_9c3a52d631" type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Ver resueltas
        </label>
      </header>

      {loading ?
      <p data-ev-id="ev_da6b9c11d6" className="text-sm text-muted-foreground">Cargando alertas…</p> :
      visible.length === 0 ?
      <div data-ev-id="ev_5e850363dc" className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <BellRing className="h-8 w-8 text-primary" />
          <p data-ev-id="ev_6e057e0204" className="text-sm text-muted-foreground">No hay alertas pendientes.</p>
        </div> :

      <ul data-ev-id="ev_ed48d06d64" className="flex flex-col gap-3">
          {visible.map((a) => {
          const plant = plants.find((p) => p.id === a.plant_id);
          return (
            <li data-ev-id="ev_4bdf498232" key={a.id} className={`flex flex-col gap-2 rounded-lg border p-4 ${a.resolved ? 'border-border bg-muted/40' : a.severity === 'alta' ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'}`}>
                <div data-ev-id="ev_775260ad0a" className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <span data-ev-id="ev_e2d994d31d" className="text-sm font-medium">{a.message}</span>
                  <span data-ev-id="ev_ab9e08abdc" className="rounded-full bg-card px-2 py-0.5 text-xs capitalize">{a.severity}</span>
                </div>
                <p data-ev-id="ev_b83d33be6f" className="text-xs text-muted-foreground">{a.recommendation}</p>
                <div data-ev-id="ev_cc6cce945c" className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <span data-ev-id="ev_e1748220bc" className="text-xs text-muted-foreground">
                    {plant ? <Link data-ev-id="ev_fe4027543f" to={`/plantas/${plant.id}`} className="text-primary underline-offset-4 hover:underline">{plant.name}</Link> : 'Planta eliminada'} · {formatDate(a.created_at)}
                  </span>
                  {a.resolved ?
                <span data-ev-id="ev_18862174db" className="text-xs text-success">Resuelta</span> :

                <button data-ev-id="ev_c4031506c6" onClick={() => resolve(a.id)} className="flex flex-row items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">
                      <Check className="h-3.5 w-3.5" /> Marcar como atendida
                    </button>
                }
                </div>
              </li>);

        })}
        </ul>
      }
    </Layout>);

}