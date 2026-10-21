import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DataPanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DataPanel({ title, icon, children, className = '' }: DataPanelProps) {
  return (
    <div data-ev-id="ev_5bedb18d0c" className={`flex flex-col gap-3 rounded-lg border border-border bg-card p-4 ${className}`}>
      <div data-ev-id="ev_de109d91d5" className="flex flex-row items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>);

}

interface MetricRowProps {
  label: string;
  value: string | number | null;
  unit?: string;
  trend?: 'up' | 'down' | 'stable' | null;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
}

export function MetricRow({ label, value, unit = '', trend, status = 'neutral' }: MetricRowProps) {
  const colors = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    neutral: 'text-foreground'
  };

  return (
    <div data-ev-id="ev_828bfc1c54" className="flex flex-row items-center justify-between gap-2 border-b border-border/50 py-2 last:border-0">
      <span data-ev-id="ev_1cd323353f" className="text-xs text-muted-foreground">{label}</span>
      <div data-ev-id="ev_8fe2811096" className="flex flex-row items-center gap-1.5">
        <span data-ev-id="ev_25d88dfec1" className={`text-sm font-medium ${colors[status]}`}>
          {value === null || value === undefined || value === '' ? '—' : `${value}${unit}`}
        </span>
        {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-success" />}
        {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
        {trend === 'stable' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
    </div>);

}

interface StatusBadgeProps {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  const styles = {
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/12 text-destructive',
    neutral: 'bg-muted text-muted-foreground'
  };

  return <span data-ev-id="ev_35ff958710" className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>{label}</span>;
}