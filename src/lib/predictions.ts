import type { Tables } from '@/integrations/supabase/helpers';

type PhenoReading = Tables<'phenotypic_readings'>;
type GrowthExperiment = Tables<'growth_experiments'>;

/** Condiciones ambientales para simulación */
export interface SimulationConditions {
  temperature_c: number;
  humidity_percent: number;
  soil_ph: number;
  light_intensity_lux: number;
  irrigation_frequency_days: number;
}

/** Resultado de predicción */
export interface PredictionResult {
  height: number | null;
  cladodes: number | null;
  sprouts: number | null;
  confidence: number;
  source: 'phenotypic' | 'experimental' | 'combined';
}

/** Resultado de simulación con detalles */
export interface SimulationResult extends PredictionResult {
  dailyGrowth: { day: number; height: number; sprouts: number; cladodes: number }[];
  conditionEffects: {
    temperature: 'optimal' | 'stress_cold' | 'stress_heat';
    humidity: 'optimal' | 'low' | 'high';
    ph: 'optimal' | 'acidic' | 'alkaline';
    light: 'optimal' | 'low' | 'high';
    irrigation: 'optimal' | 'deficit' | 'excess';
  };
  overallHealthFactor: number; // 0-1, factor multiplicador de crecimiento
}

/** Condiciones óptimas para nopal (Opuntia) */
const OPTIMAL_CONDITIONS = {
  temperature: { min: 18, max: 28, optimal: 23 },
  humidity: { min: 30, max: 60, optimal: 45 },
  ph: { min: 6.0, max: 7.5, optimal: 6.8 },
  light: { min: 10000, max: 50000, optimal: 30000 },
  irrigation: { min: 5, max: 14, optimal: 7 },
};

/** Calcula el factor de estrés para una condición (0 = estrés máximo, 1 = óptimo) */
function conditionFactor(value: number, range: { min: number; max: number; optimal: number }): number {
  if (value < range.min) return Math.max(0, 1 - (range.min - value) / range.min);
  if (value > range.max) return Math.max(0, 1 - (value - range.max) / range.max);
  // Dentro del rango, más cerca del óptimo = mejor
  const distFromOptimal = Math.abs(value - range.optimal);
  const maxDist = Math.max(range.optimal - range.min, range.max - range.optimal);
  return 1 - (distFromOptimal / maxDist) * 0.3; // Máximo 30% de penalización dentro del rango
}

/** Evalúa las condiciones y devuelve factores de crecimiento */
export function evaluateConditions(conditions: SimulationConditions): SimulationResult['conditionEffects'] & { overallFactor: number } {
  const tempFactor = conditionFactor(conditions.temperature_c, OPTIMAL_CONDITIONS.temperature);
  const humFactor = conditionFactor(conditions.humidity_percent, OPTIMAL_CONDITIONS.humidity);
  const phFactor = conditionFactor(conditions.soil_ph, OPTIMAL_CONDITIONS.ph);
  const lightFactor = conditionFactor(conditions.light_intensity_lux, OPTIMAL_CONDITIONS.light);
  const irrigFactor = conditionFactor(conditions.irrigation_frequency_days, OPTIMAL_CONDITIONS.irrigation);

  const overall = tempFactor * humFactor * phFactor * lightFactor * irrigFactor;

  return {
    temperature: conditions.temperature_c < OPTIMAL_CONDITIONS.temperature.min ? 'stress_cold' :
                 conditions.temperature_c > OPTIMAL_CONDITIONS.temperature.max ? 'stress_heat' : 'optimal',
    humidity: conditions.humidity_percent < OPTIMAL_CONDITIONS.humidity.min ? 'low' :
              conditions.humidity_percent > OPTIMAL_CONDITIONS.humidity.max ? 'high' : 'optimal',
    ph: conditions.soil_ph < OPTIMAL_CONDITIONS.ph.min ? 'acidic' :
        conditions.soil_ph > OPTIMAL_CONDITIONS.ph.max ? 'alkaline' : 'optimal',
    light: conditions.light_intensity_lux < OPTIMAL_CONDITIONS.light.min ? 'low' :
           conditions.light_intensity_lux > OPTIMAL_CONDITIONS.light.max ? 'high' : 'optimal',
    irrigation: conditions.irrigation_frequency_days < OPTIMAL_CONDITIONS.irrigation.min ? 'excess' :
                conditions.irrigation_frequency_days > OPTIMAL_CONDITIONS.irrigation.max ? 'deficit' : 'optimal',
    overallFactor: overall,
  };
}

/** Calcula tasas de crecimiento promedio desde experimentos */
export function calculateGrowthRates(experiments: GrowthExperiment[]): {
  heightPerDay: number;
  sproutsPerDay: number;
  cladodesPerDay: number;
  sampleSize: number;
} {
  const validExps = experiments.filter(e => e.duration_days && e.duration_days > 0);
  if (validExps.length === 0) {
    // Tasas por defecto basadas en literatura de Opuntia
    return { heightPerDay: 0.15, sproutsPerDay: 0.02, cladodesPerDay: 0.01, sampleSize: 0 };
  }

  let totalHeightRate = 0, totalSproutRate = 0, totalCladodeRate = 0;
  let heightCount = 0, sproutCount = 0, cladodeCount = 0;

  for (const exp of validExps) {
    const days = exp.duration_days!;
    if (exp.height_change_cm !== null) {
      totalHeightRate += Number(exp.height_change_cm) / days;
      heightCount++;
    }
    if (exp.new_sprouts !== null) {
      totalSproutRate += Number(exp.new_sprouts) / days;
      sproutCount++;
    }
    if (exp.cladode_change !== null) {
      totalCladodeRate += Number(exp.cladode_change) / days;
      cladodeCount++;
    }
  }

  return {
    heightPerDay: heightCount > 0 ? totalHeightRate / heightCount : 0.15,
    sproutsPerDay: sproutCount > 0 ? totalSproutRate / sproutCount : 0.02,
    cladodesPerDay: cladodeCount > 0 ? totalCladodeRate / cladodeCount : 0.01,
    sampleSize: validExps.length,
  };
}

/** Simulación de crecimiento basada en experimentos y condiciones */
export function simulateGrowth(
  experiments: GrowthExperiment[],
  conditions: SimulationConditions,
  daysAhead: number,
  initialState: { height: number; sprouts: number; cladodes: number }
): SimulationResult {
  const rates = calculateGrowthRates(experiments);
  const conditionEval = evaluateConditions(conditions);
  const { overallFactor, ...conditionEffects } = conditionEval;

  // Ajustar tasas según condiciones
  const adjustedHeightRate = rates.heightPerDay * overallFactor;
  const adjustedSproutRate = rates.sproutsPerDay * overallFactor;
  const adjustedCladodeRate = rates.cladodesPerDay * overallFactor;

  // Generar proyección diaria
  const dailyGrowth: SimulationResult['dailyGrowth'] = [];
  let height = initialState.height;
  let sprouts = initialState.sprouts;
  let cladodes = initialState.cladodes;

  for (let day = 0; day <= daysAhead; day++) {
    dailyGrowth.push({
      day,
      height: Math.round(height * 10) / 10,
      sprouts: Math.round(sprouts),
      cladodes: Math.round(cladodes),
    });
    height += adjustedHeightRate;
    sprouts += adjustedSproutRate;
    cladodes += adjustedCladodeRate;
  }

  // Confianza basada en cantidad de datos experimentales
  const baseConfidence = rates.sampleSize === 0 ? 30 : Math.min(85, 40 + rates.sampleSize * 5);
  const confidence = Math.round(baseConfidence * overallFactor);

  return {
    height: Math.round(height * 10) / 10,
    cladodes: Math.round(cladodes),
    sprouts: Math.round(sprouts),
    confidence,
    source: rates.sampleSize > 0 ? 'experimental' : 'phenotypic',
    dailyGrowth,
    conditionEffects,
    overallHealthFactor: overallFactor,
  };
}

/** Calcula predicción lineal simple con base en el historial de lecturas fenotípicas. */
export function linearGrowthPrediction(
  readings: PhenoReading[],
  daysAhead: number
): PredictionResult {
  if (readings.length < 3) {
    return { height: null, cladodes: null, sprouts: null, confidence: 0, source: 'phenotypic' as const };
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

  return { height: heightPred, cladodes: cladodePred, sprouts: sproutPred, confidence, source: 'phenotypic' as const };
}

/** Formatea días a texto legible. */
export function daysToLabel(days: number): string {
  if (days <= 7) return `${days} días`;
  if (days <= 30) return `${Math.round(days / 7)} semanas`;
  return `${Math.round(days / 30)} meses`;
}
