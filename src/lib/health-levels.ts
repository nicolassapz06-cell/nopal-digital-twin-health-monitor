import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export type HealthLevel = 'buena' | 'media' | 'urgente';

export function getHealthLevel(score: number | null): HealthLevel {
  if (score === null) return 'media';
  if (score >= 75) return 'buena';
  if (score >= 45) return 'media';
  return 'urgente';
}

export function getHealthConfig(level: HealthLevel) {
  const configs = {
    buena: {
      label: 'Buena',
      description: 'La planta está saludable',
      color: 'bg-green-500',
      lightColor: 'bg-green-100 text-green-800 border-green-200',
      textColor: 'text-green-600',
      icon: CheckCircle2,
      glow: 'shadow-green-500/50',
    },
    media: {
      label: 'Media',
      description: 'Requiere atención',
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      textColor: 'text-yellow-600',
      icon: AlertTriangle,
      glow: 'shadow-yellow-500/50',
    },
    urgente: {
      label: 'Urgente',
      description: 'Acción inmediata requerida',
      color: 'bg-red-500',
      lightColor: 'bg-red-100 text-red-800 border-red-200',
      textColor: 'text-red-600',
      icon: XCircle,
      glow: 'shadow-red-500/50',
    },
  };
  return configs[level];
}
