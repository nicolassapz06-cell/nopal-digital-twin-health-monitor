import { getHealthLevel, getHealthConfig } from '@/lib/health-levels';

interface HealthTrafficLightProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showScore?: boolean;
}

export function HealthTrafficLight({ score, size = 'md', showLabel = true, showScore = true }: HealthTrafficLightProps) {
  const level = getHealthLevel(score);
  const config = getHealthConfig(level);
  const Icon = config.icon;

  const sizes = {
    sm: { light: 'h-4 w-4', container: 'gap-1 p-2', text: 'text-xs', icon: 'h-3 w-3' },
    md: { light: 'h-6 w-6', container: 'gap-2 p-3', text: 'text-sm', icon: 'h-4 w-4' },
    lg: { light: 'h-8 w-8', container: 'gap-3 p-4', text: 'text-base', icon: 'h-5 w-5' }
  };

  const s = sizes[size];

  return (
    <div data-ev-id="ev_185bbdb61f" className={`flex flex-col items-center ${s.container} rounded-xl border bg-card`}>
      {/* Semáforo visual */}
      <div data-ev-id="ev_1d9a3013ee" className="flex flex-col gap-1.5 rounded-lg bg-gray-800 p-2">
        <div data-ev-id="ev_1078ccdf6d" className={`${s.light} rounded-full transition-all duration-300 ${level === 'buena' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-green-900/30'}`} />
        <div data-ev-id="ev_fcef79333e" className={`${s.light} rounded-full transition-all duration-300 ${level === 'media' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50' : 'bg-yellow-900/30'}`} />
        <div data-ev-id="ev_4a63f4adb7" className={`${s.light} rounded-full transition-all duration-300 ${level === 'urgente' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-red-900/30'}`} />
      </div>

      {/* Etiqueta y score */}
      <div data-ev-id="ev_3d0d25243d" className="flex flex-col items-center gap-1">
        {showScore && score !== null &&
        <span data-ev-id="ev_d159ad35af" className={`font-bold ${s.text} ${config.textColor}`}>{score}%</span>
        }
        {showLabel &&
        <div data-ev-id="ev_6070d6754d" className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${s.text} ${config.lightColor}`}>
            <Icon className={s.icon} />
            {config.label}
          </div>
        }
      </div>
    </div>);

}

/** Versión horizontal compacta del semáforo */
export function HealthTrafficLightBadge({ score }: {score: number | null;}) {
  const level = getHealthLevel(score);
  const config = getHealthConfig(level);
  const Icon = config.icon;

  return (
    <div data-ev-id="ev_8c3dad84af" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${config.lightColor}`}>
      {/* Mini semáforo */}
      <div data-ev-id="ev_d99b9fd2bd" className="flex gap-0.5">
        <div data-ev-id="ev_6be470c56c" className={`h-2.5 w-2.5 rounded-full ${level === 'buena' ? 'bg-green-500' : 'bg-green-200'}`} />
        <div data-ev-id="ev_57f6bc3fb8" className={`h-2.5 w-2.5 rounded-full ${level === 'media' ? 'bg-yellow-500' : 'bg-yellow-200'}`} />
        <div data-ev-id="ev_35f1da59c4" className={`h-2.5 w-2.5 rounded-full ${level === 'urgente' ? 'bg-red-500' : 'bg-red-200'}`} />
      </div>
      <Icon className="h-4 w-4" />
      <span data-ev-id="ev_6713c36e6b" className="text-sm font-medium">{config.label}</span>
      {score !== null && <span data-ev-id="ev_26ee7991e3" className="text-sm font-bold">{score}%</span>}
    </div>);

}

/** Panel de semáforo con resumen de todas las plantas */
export function HealthSummaryPanel({
  counts


}: {counts: {buena: number;media: number;urgente: number;};}) {
  const total = counts.buena + counts.media + counts.urgente;

  return (
    <div data-ev-id="ev_d8dc4a4f19" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h3 data-ev-id="ev_cbcf9529aa" className="text-sm font-semibold">Semáforo de salud</h3>
      
      <div data-ev-id="ev_0951e0923a" className="flex items-center justify-center gap-6">
        {/* Semáforo grande */}
        <div data-ev-id="ev_8d3cce334a" className="flex flex-col gap-2 rounded-2xl bg-gray-800 p-3 shadow-lg">
          <div data-ev-id="ev_57756525bb" className={`h-10 w-10 rounded-full transition-all ${counts.buena > 0 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-green-900/30'}`} />
          <div data-ev-id="ev_2101ccf4c8" className={`h-10 w-10 rounded-full transition-all ${counts.media > 0 ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50' : 'bg-yellow-900/30'}`} />
          <div data-ev-id="ev_ca3e783392" className={`h-10 w-10 rounded-full transition-all ${counts.urgente > 0 ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-red-900/30'}`} />
        </div>

        {/* Contadores */}
        <div data-ev-id="ev_d648ad180d" className="flex flex-col gap-2">
          <div data-ev-id="ev_51bc1372e0" className="flex items-center gap-2">
            <div data-ev-id="ev_6e9b4471e4" className="h-3 w-3 rounded-full bg-green-500" />
            <span data-ev-id="ev_3ae0c2c607" className="text-sm">Buena:</span>
            <span data-ev-id="ev_846a547c07" className="font-bold text-green-600">{counts.buena}</span>
            <span data-ev-id="ev_b6ee540438" className="text-xs text-muted-foreground">({total > 0 ? Math.round(counts.buena / total * 100) : 0}%)</span>
          </div>
          <div data-ev-id="ev_1bf4fed9a6" className="flex items-center gap-2">
            <div data-ev-id="ev_1cbad9a7f7" className="h-3 w-3 rounded-full bg-yellow-500" />
            <span data-ev-id="ev_f6798a7c18" className="text-sm">Media:</span>
            <span data-ev-id="ev_b98b8a24ba" className="font-bold text-yellow-600">{counts.media}</span>
            <span data-ev-id="ev_57ab3090bf" className="text-xs text-muted-foreground">({total > 0 ? Math.round(counts.media / total * 100) : 0}%)</span>
          </div>
          <div data-ev-id="ev_88f0b6e9fe" className="flex items-center gap-2">
            <div data-ev-id="ev_6f0b9d7aaf" className="h-3 w-3 rounded-full bg-red-500" />
            <span data-ev-id="ev_f6fb0a29b0" className="text-sm">Urgente:</span>
            <span data-ev-id="ev_2bac064876" className="font-bold text-red-600">{counts.urgente}</span>
            <span data-ev-id="ev_cbcebbd73c" className="text-xs text-muted-foreground">({total > 0 ? Math.round(counts.urgente / total * 100) : 0}%)</span>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      {total > 0 &&
      <div data-ev-id="ev_ca5289064d" className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {counts.buena > 0 &&
        <div data-ev-id="ev_483f159a0b"
        className="h-full bg-green-500 transition-all"
        style={{ width: `${counts.buena / total * 100}%` }} />

        }
          {counts.media > 0 &&
        <div data-ev-id="ev_3a551ca8c8"
        className="h-full bg-yellow-500 transition-all"
        style={{ width: `${counts.media / total * 100}%` }} />

        }
          {counts.urgente > 0 &&
        <div data-ev-id="ev_fc8e1dd287"
        className="h-full bg-red-500 transition-all"
        style={{ width: `${counts.urgente / total * 100}%` }} />

        }
        </div>
      }

      <p data-ev-id="ev_ec44baa481" className="text-center text-xs text-muted-foreground">
        {total} plantas monitoreadas
      </p>
    </div>);

}