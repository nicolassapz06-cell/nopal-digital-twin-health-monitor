import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Activity, Droplets, FlaskConical, Sprout, TriangleAlert } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { LineChart } from '@/components/Chart';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { evaluateMeasurement, healthScore, healthStatus, formatDate, type Thresholds } from '@/lib/health';

type Plant = Tables<'plants'>;
type Measurement = Tables<'measurements'>;
type Alert = Tables<'alerts'>;

const TONE: Record<string, string> = {
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/12 text-destructive'
};

export default function Index() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [p, m, a, t] = await Promise.all([
    supabase.from('plants').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('measurements').select('*').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(300),
    supabase.from('alerts').select('*').eq('user_id', user.id).eq('resolved', false).order('created_at', { ascending: false }).limit(6),
    supabase.from('thresholds').select('*').eq('user_id', user.id).maybeSingle()]
    );
    setPlants(p.data ?? []);
    setMeasurements(m.data ?? []);
    setAlerts(a.data ?? []);
    setThresholds(t.data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const latestFor = (plantId: string) => measurements.find((m) => m.plant_id === plantId) ?? null;

  const scores = plants.map((p) => {
    const latest = latestFor(p.id);
    return latest ? healthScore(evaluateMeasurement(latest, thresholds)) : null;
  });
  const measured = scores.filter((s): s is number => s !== null);
  const avgScore = measured.length ? Math.round(measured.reduce((a, b) => a + b, 0) / measured.length) : 0;

  const trend = (key: 'ph' | 'soil_moisture' | 'air_temp') =>
  measurements.
  filter((m) => m[key] !== null).
  slice(0, 14).
  reverse().
  map((m) => ({ label: new Date(m.measured_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }), value: Number(m[key]) }));

  const totalIrrigation = measurements.reduce((sum, m) => sum + Number(m.irrigation_ml ?? 0), 0);

  return (
    <Layout>
      <header data-ev-id="ev_83e61c6619" className="flex flex-col gap-1">
        <h1 data-ev-id="ev_1370e823d2" className="text-2xl font-semibold tracking-tight">Panel del gemelo digital</h1>
        <p data-ev-id="ev_fe7395c995" className="text-sm text-muted-foreground">Estado agregado de tu plantacion de nopal en tiempo real.</p>
      </header>

      {loading ?
      <p data-ev-id="ev_91fcb8873c" className="text-sm text-muted-foreground">Cargando datos…</p> :

      <>
          <section data-ev-id="ev_6133c2063a" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Sprout className="h-4 w-4" />} label="Plantas registradas" value={String(plants.length)} />
            <StatCard icon={<Activity className="h-4 w-4" />} label="Indice de salud promedio" value={`${avgScore}%`} tone={healthStatus(avgScore).tone} />
            <StatCard icon={<Droplets className="h-4 w-4" />} label="Riego acumulado" value={`${(totalIrrigation / 1000).toFixed(1)} L`} />
            <StatCard icon={<TriangleAlert className="h-4 w-4" />} label="Alertas abiertas" value={String(alerts.length)} tone={alerts.length ? 'danger' : 'success'} />
          </section>

          <section data-ev-id="ev_c9057bf289" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="pH del sustrato" icon={<FlaskConical className="h-4 w-4" />}>
              <LineChart points={trend('ph')} band={thresholds ? { min: Number(thresholds.ph_min), max: Number(thresholds.ph_max) } : undefined} />
            </ChartCard>
            <ChartCard title="Humedad del sustrato" icon={<Droplets className="h-4 w-4" />}>
              <LineChart points={trend('soil_moisture')} color="#2f7fa8" unit="%" band={thresholds ? { min: Number(thresholds.moisture_min), max: Number(thresholds.moisture_max) } : undefined} />
            </ChartCard>
            <ChartCard title="Temperatura" icon={<Activity className="h-4 w-4" />}>
              <LineChart points={trend('air_temp')} color="#d9782f" unit="°C" band={thresholds ? { min: Number(thresholds.temp_min), max: Number(thresholds.temp_max) } : undefined} />
            </ChartCard>
          </section>

          <section data-ev-id="ev_471462ea6e" className="flex flex-col gap-3">
            <div data-ev-id="ev_f6be668039" className="flex flex-row items-center justify-between">
              <h2 data-ev-id="ev_c2d14ca1e7" className="text-lg font-semibold tracking-tight">Gemelos activos</h2>
              <Link data-ev-id="ev_ac2c4c77ae" to="/plantas" className="text-sm text-primary underline-offset-4 hover:underline">Administrar plantas</Link>
            </div>

            {plants.length === 0 ?
          <div data-ev-id="ev_1d87ee9534" className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Aun no registras plantas. <Link data-ev-id="ev_da86d5705e" to="/plantas" className="text-primary underline">Crea tu primer gemelo digital</Link>.
              </div> :

          <div data-ev-id="ev_17aa438514" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plants.map((p, i) => {
              const latest = latestFor(p.id);
              const score = scores[i];
              const status = healthStatus(score ?? 0);
              return (
                <Link data-ev-id="ev_84cc555f62" key={p.id} to={`/plantas/${p.id}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
                      <div data-ev-id="ev_7f97c76a5e" className="flex flex-row items-start justify-between gap-2">
                        <div data-ev-id="ev_83529a3a03" className="flex flex-col">
                          <span data-ev-id="ev_e9df519ff6" className="font-medium">{p.name}</span>
                          <span data-ev-id="ev_1e2b1f5957" className="text-xs text-muted-foreground">{p.variety || 'Variedad sin definir'} · {p.location || 'Sin ubicacion'}</span>
                        </div>
                        <span data-ev-id="ev_2dc28d5827" className={`rounded-full px-2.5 py-1 text-xs font-medium ${score === null ? 'bg-muted text-muted-foreground' : TONE[status.tone]}`}>
                          {score === null ? 'Sin datos' : `${score}%`}
                        </span>
                      </div>

                      <div data-ev-id="ev_f22d5e0a59" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div data-ev-id="ev_ac5fe08526" className="h-full rounded-full bg-primary" style={{ width: `${score ?? 0}%` }} />
                      </div>

                      <p data-ev-id="ev_00342d0dd9" className="text-xs text-muted-foreground">
                        {latest ? `Ultima lectura: ${formatDate(latest.measured_at)}` : 'Sin mediciones registradas'}
                      </p>
                    </Link>);

            })}
              </div>
          }
          </section>

          <section data-ev-id="ev_ca6f58ec21" className="flex flex-col gap-3">
            <h2 data-ev-id="ev_dc080f0117" className="text-lg font-semibold tracking-tight">Alertas recientes</h2>
            {alerts.length === 0 ?
          <p data-ev-id="ev_c98a174392" className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Sin alertas abiertas. Todo dentro de los rangos configurados.</p> :

          <ul data-ev-id="ev_25c5b127ac" className="flex flex-col gap-2">
                {alerts.map((a) =>
            <li data-ev-id="ev_e0873f2ad6" key={a.id} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
                    <div data-ev-id="ev_b9cfd8659f" className="flex flex-row items-center justify-between gap-2">
                      <span data-ev-id="ev_84cf7936f4" className="text-sm font-medium">{a.message}</span>
                      <span data-ev-id="ev_b3f3036967" className={`rounded-full px-2 py-0.5 text-xs ${a.severity === 'alta' ? TONE.destructive : a.severity === 'media' ? TONE.warning : 'bg-muted text-muted-foreground'}`}>{a.severity}</span>
                    </div>
                    <p data-ev-id="ev_7d50717aad" className="text-xs text-muted-foreground">{a.recommendation}</p>
                  </li>
            )}
              </ul>
          }
          </section>
        </>
      }
    </Layout>);

}

function StatCard({ icon, label, value, tone }: {icon: React.ReactNode;label: string;value: string;tone?: 'success' | 'warning' | 'danger';}) {
  return (
    <div data-ev-id="ev_50f85120a2" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <span data-ev-id="ev_5e76a0eaf8" className="flex flex-row items-center gap-2 text-xs text-muted-foreground">{icon}{label}</span>
      <span data-ev-id="ev_06e2727d20" className={`text-2xl font-semibold tracking-tight ${tone ? TONE[tone].split(' ')[1] : ''}`}>{value}</span>
    </div>);

}

function ChartCard({ title, icon, children }: {title: string;icon: React.ReactNode;children: React.ReactNode;}) {
  return (
    <div data-ev-id="ev_f4934162b2" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <span data-ev-id="ev_afa22822ab" className="flex flex-row items-center gap-2 text-sm font-medium">{icon}{title}</span>
      {children}
    </div>);

}