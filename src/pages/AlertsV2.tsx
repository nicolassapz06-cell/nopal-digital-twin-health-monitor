import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bell, Check, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { LayoutV2 } from '@/components/LayoutV2';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { formatDate } from '@/lib/health';

type Alert = Tables<'alerts'>;
type Plant = Tables<'plants'>;

export default function AlertsV2() {
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

  useEffect(() => {load();}, [load]);

  const resolve = async (id: string) => {
    if (!supabase || !user) return;
    await supabase.from('alerts').update({ resolved: true }).eq('id', id).eq('user_id', user.id);
    load();
  };

  const visible = alerts.filter((a) => showResolved || !a.resolved);
  const pending = alerts.filter((a) => !a.resolved).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'alta':return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'media':return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityStyle = (severity: string, resolved: boolean) => {
    if (resolved) return 'border-border bg-muted/30';
    switch (severity) {
      case 'alta':return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30';
      case 'media':return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30';
      default:return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30';
    }
  };

  return (
    <LayoutV2>
      <header data-ev-id="ev_372e551fbb" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-ev-id="ev_adb4279ba1">
          <div data-ev-id="ev_88acafd39f" className="flex items-center gap-3">
            <h1 data-ev-id="ev_6e78be5c4a" className="text-2xl font-semibold">Alertas</h1>
            {pending > 0 &&
            <span data-ev-id="ev_8693bdf9ef" className="flex h-6 items-center rounded-full bg-red-500 px-2.5 text-xs font-medium text-white">
                {pending} pendientes
              </span>
            }
          </div>
          <p data-ev-id="ev_0b99a0dc2e" className="text-sm text-muted-foreground">Notificaciones generadas cuando las variables salen de los umbrales</p>
        </div>
        
        <label data-ev-id="ev_d2faa95a3b" className="flex items-center gap-2 text-sm">
          <input data-ev-id="ev_f55ef12257"
          type="checkbox"
          checked={showResolved}
          onChange={(e) => setShowResolved(e.target.checked)}
          className="rounded" />

          Mostrar resueltas
        </label>
      </header>

      {loading ?
      <div data-ev-id="ev_cfc7850cd4" className="flex h-40 items-center justify-center">
          <span data-ev-id="ev_2f6f5a1897" className="text-sm text-muted-foreground">Cargando...</span>
        </div> :
      visible.length === 0 ?
      <div data-ev-id="ev_1592c3d03c" className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div data-ev-id="ev_486baf0b6e" className="rounded-full bg-green-100 p-4 dark:bg-green-950">
            <Bell className="h-10 w-10 text-green-600" />
          </div>
          <div data-ev-id="ev_e31c4edc6e">
            <p data-ev-id="ev_1f26276d22" className="font-medium">Sin alertas pendientes</p>
            <p data-ev-id="ev_8eb62165e3" className="text-sm text-muted-foreground">Todas tus plantas están dentro de los umbrales óptimos</p>
          </div>
        </div> :

      <div data-ev-id="ev_430f81813e" className="flex flex-col gap-3">
          {visible.map((a) => {
          const plant = plants.find((p) => p.id === a.plant_id);

          return (
            <div data-ev-id="ev_1510b095ea"
            key={a.id}
            className={`rounded-xl border p-4 ${getSeverityStyle(a.severity ?? 'baja', a.resolved ?? false)}`}>

                <div data-ev-id="ev_17006e285f" className="flex items-start justify-between gap-4">
                  <div data-ev-id="ev_c7675f6ca9" className="flex items-start gap-3">
                    {getSeverityIcon(a.severity ?? 'baja')}
                    <div data-ev-id="ev_e80bb4ab44">
                      <p data-ev-id="ev_a52a907df0" className={`font-medium ${a.resolved ? 'text-muted-foreground' : ''}`}>
                        {a.message}
                      </p>
                      <p data-ev-id="ev_485fcd796c" className="mt-1 text-sm text-muted-foreground">
                        {a.recommendation}
                      </p>
                      <div data-ev-id="ev_48f69d2642" className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        {plant ?
                      <Link data-ev-id="ev_61e375d5eb" to={`/plantas/${plant.id}`} className="text-primary hover:underline">
                            {plant.name}
                          </Link> :

                      <span data-ev-id="ev_91b9a589cd">Planta eliminada</span>
                      }
                        <span data-ev-id="ev_5249d4f713">·</span>
                        <span data-ev-id="ev_49e78ea886">{formatDate(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!a.resolved &&
                <button data-ev-id="ev_ec02693c2e"
                onClick={() => resolve(a.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted">

                      <Check className="h-4 w-4" /> Atendida
                    </button>
                }
                </div>
              </div>);

        })}
        </div>
      }
    </LayoutV2>);

}