/**
 * Índices de Vegetación RGB
 * Fórmulas científicas para analizar la salud de plantas usando canales RGB.
 * Estos índices se usan en agricultura de precisión y análisis de imágenes.
 */

export interface RGB {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface VegetationResult {
  value: number;
  normalized: number; // 0-100 para visualización
  status: 'healthy' | 'moderate' | 'stressed';
  color: string; // Color para visualización
}

/**
 * ExG - Excess Green Index (Woebbecke et al., 1995)
 * Fórmula: 2g - r - b (donde r,g,b están normalizados 0-1)
 * Rango: -1 a 1 (positivo = más verde = más sano)
 */
export function excessGreen(rgb: RGB): VegetationResult {
  const total = rgb.r + rgb.g + rgb.b;
  if (total === 0) return { value: 0, normalized: 50, status: 'moderate', color: '#fbbf24' };
  
  const r = rgb.r / total;
  const g = rgb.g / total;
  const b = rgb.b / total;
  
  const exg = 2 * g - r - b; // Rango: -1 a 1
  const normalized = Math.round((exg + 1) * 50); // Convertir a 0-100
  
  return {
    value: Math.round(exg * 1000) / 1000,
    normalized: Math.max(0, Math.min(100, normalized)),
    status: exg > 0.1 ? 'healthy' : exg > -0.1 ? 'moderate' : 'stressed',
    color: exg > 0.1 ? '#22c55e' : exg > -0.1 ? '#fbbf24' : '#ef4444'
  };
}

/**
 * VARI - Visible Atmospherically Resistant Index (Gitelson et al., 2002)
 * Fórmula: (G - R) / (G + R - B)
 * Rango: -1 a 1 (más positivo = más vegetación sana)
 */
export function vari(rgb: RGB): VegetationResult {
  const { r, g, b } = rgb;
  const denominator = g + r - b;
  
  if (Math.abs(denominator) < 1) {
    return { value: 0, normalized: 50, status: 'moderate', color: '#fbbf24' };
  }
  
  const value = (g - r) / denominator;
  const clamped = Math.max(-1, Math.min(1, value));
  const normalized = Math.round((clamped + 1) * 50);
  
  return {
    value: Math.round(clamped * 1000) / 1000,
    normalized: Math.max(0, Math.min(100, normalized)),
    status: clamped > 0.2 ? 'healthy' : clamped > -0.1 ? 'moderate' : 'stressed',
    color: clamped > 0.2 ? '#22c55e' : clamped > -0.1 ? '#fbbf24' : '#ef4444'
  };
}

/**
 * GLI - Green Leaf Index (Louhaichi et al., 2001)
 * Fórmula: (2G - R - B) / (2G + R + B)
 * Rango: -1 a 1
 */
export function greenLeafIndex(rgb: RGB): VegetationResult {
  const { r, g, b } = rgb;
  const numerator = 2 * g - r - b;
  const denominator = 2 * g + r + b;
  
  if (denominator === 0) {
    return { value: 0, normalized: 50, status: 'moderate', color: '#fbbf24' };
  }
  
  const value = numerator / denominator;
  const normalized = Math.round((value + 1) * 50);
  
  return {
    value: Math.round(value * 1000) / 1000,
    normalized: Math.max(0, Math.min(100, normalized)),
    status: value > 0.2 ? 'healthy' : value > 0 ? 'moderate' : 'stressed',
    color: value > 0.2 ? '#22c55e' : value > 0 ? '#fbbf24' : '#ef4444'
  };
}

/**
 * NGRDI - Normalized Green-Red Difference Index
 * Fórmula: (G - R) / (G + R)
 * Rango: -1 a 1 (positivo = predomina verde)
 */
export function ngrdi(rgb: RGB): VegetationResult {
  const { r, g } = rgb;
  const denominator = g + r;
  
  if (denominator === 0) {
    return { value: 0, normalized: 50, status: 'moderate', color: '#fbbf24' };
  }
  
  const value = (g - r) / denominator;
  const normalized = Math.round((value + 1) * 50);
  
  return {
    value: Math.round(value * 1000) / 1000,
    normalized: Math.max(0, Math.min(100, normalized)),
    status: value > 0.15 ? 'healthy' : value > -0.05 ? 'moderate' : 'stressed',
    color: value > 0.15 ? '#22c55e' : value > -0.05 ? '#fbbf24' : '#ef4444'
  };
}

/**
 * RGBVI - RGB Vegetation Index (Bendig et al., 2015)
 * Fórmula: (G² - R*B) / (G² + R*B)
 * Rango: -1 a 1
 */
export function rgbvi(rgb: RGB): VegetationResult {
  const { r, g, b } = rgb;
  const g2 = g * g;
  const rb = r * b;
  const denominator = g2 + rb;
  
  if (denominator === 0) {
    return { value: 0, normalized: 50, status: 'moderate', color: '#fbbf24' };
  }
  
  const value = (g2 - rb) / denominator;
  const normalized = Math.round((value + 1) * 50);
  
  return {
    value: Math.round(value * 1000) / 1000,
    normalized: Math.max(0, Math.min(100, normalized)),
    status: value > 0.3 ? 'healthy' : value > 0 ? 'moderate' : 'stressed',
    color: value > 0.3 ? '#22c55e' : value > 0 ? '#fbbf24' : '#ef4444'
  };
}

/**
 * Información de cada índice para UI
 */
export const VEGETATION_INDICES = {
  exg: {
    name: 'ExG',
    fullName: 'Excess Green Index',
    formula: '2G - R - B',
    description: 'Detecta exceso de verde. Valores positivos indican vegetación sana.',
    reference: 'Woebbecke et al., 1995',
    calculate: excessGreen
  },
  vari: {
    name: 'VARI',
    fullName: 'Visible Atmospherically Resistant Index',
    formula: '(G-R)/(G+R-B)',
    description: 'Resistente a condiciones atmosféricas. Ideal para monitoreo de clorofila.',
    reference: 'Gitelson et al., 2002',
    calculate: vari
  },
  gli: {
    name: 'GLI',
    fullName: 'Green Leaf Index',
    formula: '(2G-R-B)/(2G+R+B)',
    description: 'Detecta hojas verdes diferenciándolas del suelo y otros elementos.',
    reference: 'Louhaichi et al., 2001',
    calculate: greenLeafIndex
  },
  ngrdi: {
    name: 'NGRDI',
    fullName: 'Normalized Green-Red Difference',
    formula: '(G-R)/(G+R)',
    description: 'Relación verde/rojo normalizada. Simple y efectivo.',
    reference: 'Tucker, 1979',
    calculate: ngrdi
  },
  rgbvi: {
    name: 'RGBVI',
    fullName: 'RGB Vegetation Index',
    formula: '(G²-R×B)/(G²+R×B)',
    description: 'Índice cuadrático que amplifica diferencias de vegetación.',
    reference: 'Bendig et al., 2015',
    calculate: rgbvi
  }
} as const;

export type VegetationIndexType = keyof typeof VEGETATION_INDICES;

/**
 * Calcula todos los índices para un color RGB
 */
export function calculateAllIndices(rgb: RGB): Record<VegetationIndexType, VegetationResult> {
  return {
    exg: excessGreen(rgb),
    vari: vari(rgb),
    gli: greenLeafIndex(rgb),
    ngrdi: ngrdi(rgb),
    rgbvi: rgbvi(rgb)
  };
}

/**
 * Genera filtros CSS para aproximar visualización de índice
 */
export function getIndexCSSFilter(index: VegetationIndexType): string {
  switch (index) {
    case 'exg':
      // Enfatiza verde, reduce rojo y azul
      return 'saturate(1.5) hue-rotate(-10deg) contrast(1.1)';
    case 'vari':
      // Realza diferencia verde-rojo
      return 'saturate(2) hue-rotate(-15deg) brightness(1.05)';
    case 'gli':
      // Separa verde del resto
      return 'saturate(1.8) contrast(1.2) hue-rotate(-5deg)';
    case 'ngrdi':
      // Normalizado verde-rojo
      return 'saturate(1.6) sepia(0.1) hue-rotate(-20deg)';
    case 'rgbvi':
      // Amplifica vegetación
      return 'saturate(2.2) contrast(1.15) brightness(1.02)';
    default:
      return 'none';
  }
}

/**
 * Genera gradiente de escala para leyenda
 */
export function getIndexGradient(): string {
  return 'linear-gradient(to right, #ef4444, #fbbf24, #22c55e)';
}
