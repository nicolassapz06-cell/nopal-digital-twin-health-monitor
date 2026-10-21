export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round((max === 0 ? 0 : d / max) * 1000) / 10,
    v: Math.round(max * 1000) / 10,
  };
}

/** Indice de verdor normalizado (ExG simplificado), 0-100. */
export function greenIndex({ r, g, b }: Rgb): number {
  const sum = r + g + b;
  if (sum === 0) return 0;
  const exg = (2 * g - r - b) / sum;
  return Math.round(clamp((exg + 0.5) * 100, 0, 100) * 10) / 10;
}

/** Etiqueta cualitativa del estado del cladodio segun color. */
export function colorHealthLabel(hsv: Hsv, gi: number): string {
  if (hsv.v < 18) return 'Tejido oscuro / necrosis';
  if (hsv.h >= 75 && hsv.h <= 150 && hsv.s >= 25 && gi >= 50) return 'Verde saludable';
  if (hsv.h > 150 && hsv.h <= 200) return 'Verde azulado (posible estres hidrico)';
  if (hsv.h >= 45 && hsv.h < 75) return 'Amarillamiento (clorosis incipiente)';
  if (hsv.h >= 20 && hsv.h < 45) return 'Amarillo-cafe (clorosis avanzada)';
  if (hsv.h < 20 || hsv.h > 330) return 'Rojizo (estres por luz o frio)';
  if (hsv.s < 20) return 'Decoloracion / perdida de pigmento';
  return 'Fuera de rango tipico';
}

/** Promedio de color de una region central de la imagen en un canvas. */
export function averageColorFromImage(img: HTMLImageElement, cropRatio = 0.5): Rgb {
  const canvas = document.createElement('canvas');
  const w = Math.min(img.naturalWidth || 300, 600);
  const h = Math.round(((img.naturalHeight || 300) / (img.naturalWidth || 300)) * w);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 0, g: 0, b: 0 };
  ctx.drawImage(img, 0, 0, w, h);

  const cw = Math.max(1, Math.round(w * cropRatio));
  const ch = Math.max(1, Math.round(h * cropRatio));
  const sx = Math.round((w - cw) / 2);
  const sy = Math.round((h - ch) / 2);
  const { data } = ctx.getImageData(sx, sy, cw, ch);

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}
