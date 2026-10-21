/**
 * CIELAB Color Space Library
 * Conversiones RGB → XYZ → CIELAB y análisis de vegetación
 * 
 * CIELAB es un espacio de color perceptualmente uniforme:
 * - L* = Luminosidad (0-100)
 * - a* = Eje verde-rojo (-128 a +127, negativo = verde)
 * - b* = Eje azul-amarillo (-128 a +127, positivo = amarillo)
 */

export interface RGB {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface LAB {
  l: number; // 0-100 (luminosidad)
  a: number; // -128 a +127 (verde-rojo)
  b: number; // -128 a +127 (azul-amarillo)
}

export interface LABAnalysis {
  lab: LAB;
  greenness: number;      // Índice de verdor basado en a* (0-100, mayor = más verde)
  yellowness: number;     // Índice de amarillamiento basado en b* (0-100)
  chlorophyll: number;    // Estimación de clorofila (basado en L* y a*)
  stressIndex: number;    // Índice de estrés combinado (0-100, menor = más estrés)
  status: 'healthy' | 'moderate' | 'stressed' | 'critical';
  statusLabel: string;
}

export interface ChannelHistogram {
  channel: 'L' | 'a' | 'b';
  bins: number[];         // 256 bins
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export interface ImageAnalysis {
  pixelCount: number;
  labStats: {
    l: { min: number; max: number; mean: number; stdDev: number };
    a: { min: number; max: number; mean: number; stdDev: number };
    b: { min: number; max: number; mean: number; stdDev: number };
  };
  histograms: {
    l: number[];
    a: number[];
    b: number[];
  };
  healthMetrics: {
    greenArea: number;      // % de píxeles con a* < -5 (verde)
    chloroticArea: number;  // % de píxeles con a* > 0 y b* > 15 (amarillo)
    necroticArea: number;   // % de píxeles con L* < 25 (oscuro/muerto)
    healthyArea: number;    // % de píxeles saludables
  };
  overallStatus: 'healthy' | 'moderate' | 'stressed' | 'critical';
}

// Punto blanco de referencia D65
const REF_X = 95.047;
const REF_Y = 100.000;
const REF_Z = 108.883;

/**
 * Convierte RGB (0-255) a XYZ
 */
export function rgbToXyz(rgb: RGB): XYZ {
  // Normalizar a 0-1 y aplicar gamma inversa (sRGB)
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Linearizar (inverso de gamma sRGB)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Escalar a 0-100
  r *= 100;
  g *= 100;
  b *= 100;

  // Matriz de transformación sRGB a XYZ (D65)
  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041
  };
}

/**
 * Convierte XYZ a CIELAB
 */
export function xyzToLab(xyz: XYZ): LAB {
  let x = xyz.x / REF_X;
  let y = xyz.y / REF_Y;
  let z = xyz.z / REF_Z;

  // Función f(t) para CIELAB
  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + (16/116);

  x = f(x);
  y = f(y);
  z = f(z);

  return {
    l: (116 * y) - 16,           // L*: 0-100
    a: 500 * (x - y),            // a*: ~-128 a +127
    b: 200 * (y - z)             // b*: ~-128 a +127
  };
}

/**
 * Convierte RGB directamente a CIELAB
 */
export function rgbToLab(rgb: RGB): LAB {
  return xyzToLab(rgbToXyz(rgb));
}

/**
 * Analiza un color LAB para determinar salud vegetal
 */
export function analyzeLab(lab: LAB): LABAnalysis {
  // Índice de verdor: a* negativo = más verde
  // Normalizamos a* de (-50, +50) a (100, 0)
  const greenness = Math.max(0, Math.min(100, 50 - lab.a));
  
  // Índice de amarillamiento: b* positivo = más amarillo
  // Normalizamos b* de (-20, +60) a (0, 100)
  const yellowness = Math.max(0, Math.min(100, (lab.b + 20) * 1.25));
  
  // Estimación de clorofila (L* alto + a* muy negativo = más clorofila)
  const chlorophyll = Math.max(0, Math.min(100, (lab.l * 0.5) + (50 - lab.a) * 0.5));
  
  // Índice de estrés: combinación de factores
  // Alto verdor + baja amarillez + luminosidad media = bajo estrés
  const stressIndex = Math.max(0, Math.min(100, 
    greenness * 0.5 + 
    (100 - yellowness) * 0.3 + 
    (lab.l > 30 && lab.l < 70 ? 20 : 0)
  ));
  
  // Determinar estado
  let status: LABAnalysis['status'];
  let statusLabel: string;
  
  if (lab.a < -10 && lab.b < 30 && lab.l > 30) {
    status = 'healthy';
    statusLabel = 'Saludable';
  } else if (lab.a < 5 && lab.b < 40) {
    status = 'moderate';
    statusLabel = 'Moderado';
  } else if (lab.a > 5 || lab.b > 40 || lab.l < 25) {
    status = 'stressed';
    statusLabel = 'Estrés';
  } else {
    status = 'critical';
    statusLabel = 'Crítico';
  }
  
  return {
    lab,
    greenness: Math.round(greenness * 10) / 10,
    yellowness: Math.round(yellowness * 10) / 10,
    chlorophyll: Math.round(chlorophyll * 10) / 10,
    stressIndex: Math.round(stressIndex * 10) / 10,
    status,
    statusLabel
  };
}

/**
 * Analiza una imagen completa (array de píxeles RGBA)
 */
export function analyzeImageData(imageData: ImageData): ImageAnalysis {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  
  // Arrays para almacenar valores LAB
  const lValues: number[] = [];
  const aValues: number[] = [];
  const bValues: number[] = [];
  
  // Histogramas (256 bins, desplazados para a* y b*)
  const histL = new Array(256).fill(0);
  const histA = new Array(256).fill(0); // -128 a +127 → 0 a 255
  const histB = new Array(256).fill(0); // -128 a +127 → 0 a 255
  
  // Contadores de áreas
  let greenPixels = 0;
  let chloroticPixels = 0;
  let necroticPixels = 0;
  
  // Procesar cada píxel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    
    // Ignorar píxeles transparentes
    if (alpha < 128) continue;
    
    const lab = rgbToLab({ r, g, b });
    
    lValues.push(lab.l);
    aValues.push(lab.a);
    bValues.push(lab.b);
    
    // Actualizar histogramas
    const lBin = Math.max(0, Math.min(255, Math.round(lab.l * 2.55)));
    const aBin = Math.max(0, Math.min(255, Math.round(lab.a + 128)));
    const bBin = Math.max(0, Math.min(255, Math.round(lab.b + 128)));
    
    histL[lBin]++;
    histA[aBin]++;
    histB[bBin]++;
    
    // Clasificar píxel
    if (lab.a < -5) {
      greenPixels++;
    }
    if (lab.a > 0 && lab.b > 15) {
      chloroticPixels++;
    }
    if (lab.l < 25) {
      necroticPixels++;
    }
  }
  
  const validPixels = lValues.length;
  
  // Calcular estadísticas
  const calcStats = (values: number[]) => {
    if (values.length === 0) return { min: 0, max: 0, mean: 0, stdDev: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100
    };
  };
  
  // Calcular porcentajes de área
  const greenArea = (greenPixels / validPixels) * 100;
  const chloroticArea = (chloroticPixels / validPixels) * 100;
  const necroticArea = (necroticPixels / validPixels) * 100;
  const healthyArea = Math.max(0, 100 - chloroticArea - necroticArea);
  
  // Determinar estado general
  let overallStatus: ImageAnalysis['overallStatus'];
  if (greenArea > 70 && chloroticArea < 10 && necroticArea < 5) {
    overallStatus = 'healthy';
  } else if (greenArea > 50 && chloroticArea < 25) {
    overallStatus = 'moderate';
  } else if (necroticArea > 20 || chloroticArea > 40) {
    overallStatus = 'critical';
  } else {
    overallStatus = 'stressed';
  }
  
  return {
    pixelCount: validPixels,
    labStats: {
      l: calcStats(lValues),
      a: calcStats(aValues),
      b: calcStats(bValues)
    },
    histograms: {
      l: histL,
      a: histA,
      b: histB
    },
    healthMetrics: {
      greenArea: Math.round(greenArea * 10) / 10,
      chloroticArea: Math.round(chloroticArea * 10) / 10,
      necroticArea: Math.round(necroticArea * 10) / 10,
      healthyArea: Math.round(healthyArea * 10) / 10
    },
    overallStatus
  };
}

/**
 * Genera una imagen de canal individual (L*, a*, o b*)
 */
export function generateChannelImage(
  imageData: ImageData,
  channel: 'l' | 'a' | 'b'
): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    
    if (alpha < 128) {
      output.data[i] = 0;
      output.data[i + 1] = 0;
      output.data[i + 2] = 0;
      output.data[i + 3] = 0;
      continue;
    }
    
    const lab = rgbToLab({ r, g, b });
    let value: number;
    
    switch (channel) {
      case 'l':
        // L*: 0-100 → 0-255
        value = Math.round(lab.l * 2.55);
        output.data[i] = value;
        output.data[i + 1] = value;
        output.data[i + 2] = value;
        break;
      case 'a':
        // a*: negativo = verde, positivo = rojo
        if (lab.a < 0) {
          output.data[i] = 0;
          output.data[i + 1] = Math.min(255, Math.round(-lab.a * 4));
          output.data[i + 2] = 0;
        } else {
          output.data[i] = Math.min(255, Math.round(lab.a * 4));
          output.data[i + 1] = 0;
          output.data[i + 2] = 0;
        }
        break;
      case 'b':
        // b*: negativo = azul, positivo = amarillo
        if (lab.b < 0) {
          output.data[i] = 0;
          output.data[i + 1] = 0;
          output.data[i + 2] = Math.min(255, Math.round(-lab.b * 4));
        } else {
          output.data[i] = Math.min(255, Math.round(lab.b * 3));
          output.data[i + 1] = Math.min(255, Math.round(lab.b * 3));
          output.data[i + 2] = 0;
        }
        break;
    }
    
    output.data[i + 3] = 255;
  }
  
  return output;
}

/**
 * Genera mapa de calor de salud (verde = sano, rojo = estrés)
 */
export function generateHealthMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    
    if (alpha < 128) {
      output.data[i] = 0;
      output.data[i + 1] = 0;
      output.data[i + 2] = 0;
      output.data[i + 3] = 0;
      continue;
    }
    
    const lab = rgbToLab({ r, g, b });
    const analysis = analyzeLab(lab);
    
    // Mapear índice de estrés a color (verde → amarillo → rojo)
    const health = analysis.stressIndex / 100;
    
    if (health > 0.6) {
      // Verde (saludable)
      output.data[i] = Math.round((1 - health) * 255);
      output.data[i + 1] = 200;
      output.data[i + 2] = 50;
    } else if (health > 0.3) {
      // Amarillo (moderado)
      output.data[i] = 255;
      output.data[i + 1] = Math.round(health * 400);
      output.data[i + 2] = 0;
    } else {
      // Rojo (estrés)
      output.data[i] = 255;
      output.data[i + 1] = Math.round(health * 255);
      output.data[i + 2] = 0;
    }
    
    output.data[i + 3] = 200; // Semi-transparente para overlay
  }
  
  return output;
}

/**
 * Información de canales para UI
 */
export const CHANNEL_INFO = {
  l: {
    name: 'L*',
    fullName: 'Luminosidad',
    description: 'Intensidad de luz (0 = negro, 100 = blanco)',
    range: '0 - 100',
    plantMeaning: 'Vigor general, densidad foliar'
  },
  a: {
    name: 'a*',
    fullName: 'Eje Verde-Rojo',
    description: 'Negativo = verde, Positivo = rojo/magenta',
    range: '-128 a +127',
    plantMeaning: 'Contenido de clorofila (más negativo = más clorofila)'
  },
  b: {
    name: 'b*',
    fullName: 'Eje Azul-Amarillo',
    description: 'Negativo = azul, Positivo = amarillo',
    range: '-128 a +127',
    plantMeaning: 'Estrés hídrico, senescencia (más positivo = más amarillo)'
  }
} as const;
