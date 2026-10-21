import type { Tables } from '@/integrations/supabase/helpers';

export type Thresholds = Tables<'thresholds'>;
export type Measurement = Tables<'measurements'>;
export type ColorReading = Tables<'color_readings'>;

export type Severity = 'baja' | 'media' | 'alta';

export interface Issue {
  variable: string;
  label: string;
  severity: Severity;
  message: string;
  recommendation: string;
  value: number;
}

interface VarConfig {
  key: keyof Measurement;
  label: string;
  unit: string;
  min: keyof Thresholds;
  max: keyof Thresholds;
  lowRec: string;
  highRec: string;
  weight: number;
}

export const VARIABLES: VarConfig[] = [
  {
    key: 'ph',
    label: 'pH del sustrato',
    unit: '',
    min: 'ph_min',
    max: 'ph_max',
    lowRec: 'Sustrato acido: aplicar cal agricola o composta madura y suspender fertilizantes acidificantes.',
    highRec: 'Sustrato alcalino: aplicar azufre elemental o materia organica; revisar la calidad del agua de riego.',
    weight: 25,
  },
  {
    key: 'soil_moisture',
    label: 'Humedad del sustrato',
    unit: '%',
    min: 'moisture_min',
    max: 'moisture_max',
    lowRec: 'Deficit hidrico: programar un riego ligero y verificar el sistema de goteo.',
    highRec: 'Exceso de humedad: suspender el riego y mejorar el drenaje, riesgo alto de pudricion radicular.',
    weight: 25,
  },
  {
    key: 'ec',
    label: 'Conductividad electrica',
    unit: 'dS/m',
    min: 'ec_min',
    max: 'ec_max',
    lowRec: 'Baja salinidad: la planta puede estar deficiente de nutrientes, ajustar la solucion nutritiva.',
    highRec: 'Salinidad alta: lavar el sustrato con agua de baja mineralizacion y reducir la fertilizacion.',
    weight: 15,
  },
  {
    key: 'air_temp',
    label: 'Temperatura',
    unit: '°C',
    min: 'temp_min',
    max: 'temp_max',
    lowRec: 'Riesgo de daño por frio: proteger con manta termica o microtúnel durante la noche.',
    highRec: 'Estres termico: aplicar malla sombra y regar en horas frescas.',
    weight: 15,
  },
  {
    key: 'humidity',
    label: 'Humedad relativa',
    unit: '%',
    min: 'humidity_min',
    max: 'humidity_max',
    lowRec: 'Ambiente muy seco: aumentar la frecuencia de riego ligero.',
    highRec: 'Ambiente humedo: ventilar para reducir el riesgo de hongos y bacteriosis.',
    weight: 10,
  },
  {
    key: 'light_lux',
    label: 'Luminosidad',
    unit: 'lux',
    min: 'light_min',
    max: 'light_max',
    lowRec: 'Luz insuficiente: reubicar la planta o retirar sombreado.',
    highRec: 'Exceso de radiacion: instalar malla sombra del 30-50% para evitar quemaduras en cladodios.',
    weight: 10,
  },
];

function severityFor(value: number, min: number, max: number): Severity {
  const range = Math.max(max - min, 0.0001);
  const deviation = value < min ? (min - value) / range : (value - max) / range;
  if (deviation > 0.5) return 'alta';
  if (deviation > 0.2) return 'media';
  return 'baja';
}

export function evaluateMeasurement(m: Partial<Measurement>, t: Thresholds | null): Issue[] {
  if (!t) return [];
  const issues: Issue[] = [];

  for (const cfg of VARIABLES) {
    const raw = m[cfg.key];
    if (raw === null || raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;

    const min = Number(t[cfg.min]);
    const max = Number(t[cfg.max]);
    if (value >= min && value <= max) continue;

    const low = value < min;
    issues.push({
      variable: String(cfg.key),
      label: cfg.label,
      severity: severityFor(value, min, max),
      message: `${cfg.label} ${low ? 'por debajo' : 'por encima'} del rango (${value}${cfg.unit} · rango ${min}-${max}${cfg.unit})`,
      recommendation: low ? cfg.lowRec : cfg.highRec,
      value,
    });
  }

  return issues;
}

export function evaluateColor(hue: number, t: Thresholds | null): Issue | null {
  if (!t) return null;
  const min = Number(t.hue_min);
  const max = Number(t.hue_max);
  if (hue >= min && hue <= max) return null;
  const low = hue < min;
  return {
    variable: 'hue',
    label: 'Colorimetria (matiz)',
    severity: severityFor(hue, min, max),
    message: `Matiz fuera del verde saludable (${hue}° · rango ${min}-${max}°)`,
    recommendation: low
      ? 'Tono amarillento o rojizo: revisar nitrogeno, hierro y exposicion solar directa.'
      : 'Tono verde azulado: posible estres hidrico o exceso de nitrogeno, ajustar riego y fertilizacion.',
    value: hue,
  };
}

const PENALTY: Record<Severity, number> = { baja: 0.4, media: 0.7, alta: 1 };

/** Indice de salud del gemelo digital, 0-100. */
export function healthScore(issues: Issue[]): number {
  let score = 100;
  for (const issue of issues) {
    const cfg = VARIABLES.find((v) => String(v.key) === issue.variable);
    const weight = cfg ? cfg.weight : 20;
    score -= weight * PENALTY[issue.severity];
  }
  return Math.max(0, Math.round(score));
}

export function healthStatus(score: number): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (score >= 80) return { label: 'Saludable', tone: 'success' };
  if (score >= 55) return { label: 'En observacion', tone: 'warning' };
  return { label: 'Critico', tone: 'danger' };
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
