import type { Tables } from '@/integrations/supabase/helpers';

type PhenoReading = Tables<'phenotypic_readings'>;

/** Calcula predicción lineal simple con base en el historial de lecturas fenotípicas. */
export function linearGrowthPrediction(
  readings: PhenoReading[],
  daysAhead: number
): { height: number | null; cladodes: number | null; sprouts: number | null; confidence: number } {
  if (readings.length < 3) {
    return { height: null, cladodes: null, sprouts: null, confidence: 0 };
  }

  const sorted = [...readings].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  const n = sorted.length;

  const msPerDay = 86400000;
  const t0 = new Date(sorted[0].measured_at).getTime();
  const xs = sorted.map((r) => (new Date(r.measured_at).getTime() - t0) / msPerDay);

  const targetX = xs[xs.length - 1] + daysAhead;

  const predict = (ys: (number | null)[]): number | null => {
    const pairs = ys.map((y, i) => ({ x: xs[i], y })).filter((p): p is { x: number; y: number } => p.y !== null);
    if (pairs.length < 2) return null;

    const sumX = pairs.reduce((s, p) => s + p.x, 0);
    const sumY = pairs.reduce((s, p) => s + p.y, 0);
    const sumXY = pairs.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = pairs.reduce((s, p) => s + p.x * p.x, 0);
    const count = pairs.length;

    const denom = count * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const slope = (count * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / count;

    return Math.max(0, Math.round((slope * targetX + intercept) * 10) / 10);
  };

  const heightPred = predict(sorted.map((r) => r.height_cm));
  const cladodePred = predict(sorted.map((r) => r.cladode_count));
  const sproutPred = predict(sorted.map((r) => r.new_sprouts));

  // Confianza basada en cantidad de datos y varianza
  const basedOn = Math.min(n, 20);
  const confidence = Math.round(Math.min(95, 40 + basedOn * 3));

  return { height: heightPred, cladodes: cladodePred, sprouts: sproutPred, confidence };
}

/** Formatea días a texto legible. */
export function daysToLabel(days: number): string {
  if (days <= 7) return `${days} días`;
  if (days <= 30) return `${Math.round(days / 7)} semanas`;
  return `${Math.round(days / 30)} meses`;
}
