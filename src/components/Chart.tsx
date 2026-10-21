interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: ChartPoint[];
  color?: string;
  unit?: string;
  band?: {min: number;max: number;};
  height?: number;
}

export function LineChart({ points, color = '#2f6b3c', unit = '', band, height = 160 }: LineChartProps) {
  const data = points ?? [];

  if (data.length === 0) {
    return <div data-ev-id="ev_3997b06601" className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">Sin datos suficientes</div>;
  }

  const W = 320;
  const H = 100;
  const values = data.map((d) => d.value);
  const lo = Math.min(...values, band ? band.min : Infinity);
  const hi = Math.max(...values, band ? band.max : -Infinity);
  const pad = (hi - lo) * 0.15 || 1;
  const min = lo - pad;
  const max = hi + pad;
  const span = max - min || 1;

  const x = (i: number) => data.length === 1 ? W / 2 : i / (data.length - 1) * W;
  const y = (v: number) => H - (v - min) / span * H;

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(data.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;

  const gradId = `grad-${color.replace('#', '')}`;

  return (
    <div data-ev-id="ev_5688d233ff" className="flex flex-col gap-2">
      <svg data-ev-id="ev_97ed97e671" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible">
        <defs data-ev-id="ev_6b2043543a">
          <linearGradient data-ev-id="ev_39f4f44a35" id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop data-ev-id="ev_f60f2c61b4" offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop data-ev-id="ev_7503332107" offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {band ? <rect data-ev-id="ev_43dc9a8f3b" x="0" y={y(band.max)} width={W} height={Math.max(y(band.min) - y(band.max), 1)} fill="#2f6b3c" opacity="0.08" /> : null}

        <path data-ev-id="ev_eb3f6e947e" d={area} fill={`url(#${gradId})`} />
        <path data-ev-id="ev_bd6b2ae7d5" d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) =>
        <circle data-ev-id="ev_c39d9852c7" key={`${d.label}-${i}`} cx={x(i)} cy={y(d.value)} r="2.5" fill={color} vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      <div data-ev-id="ev_6ac01ccc45" className="flex flex-row items-center justify-between text-xs text-muted-foreground">
        <span data-ev-id="ev_3759328f09">{data[0].label}</span>
        <span data-ev-id="ev_96e8ad4329" className="font-medium text-foreground">
          Ultimo: {data[data.length - 1].value}
          {unit}
        </span>
        <span data-ev-id="ev_7751629c13">{data[data.length - 1].label}</span>
      </div>
    </div>);

}