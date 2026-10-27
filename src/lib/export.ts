import type { Tables } from '@/integrations/supabase/helpers';

type EnvReading = Tables<'environmental_readings'>;
type PhenoReading = Tables<'phenotypic_readings'>;
type Plant = Tables<'plants'>;
type Alert = Tables<'alerts'>;

/** Convierte un array de objetos a formato CSV */
function arrayToCSV<T extends Record<string, unknown>>(data: T[], headers: { key: keyof T; label: string }[]): string {
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  const rows = data.map(row => 
    headers.map(h => {
      const value = row[h.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      return String(value);
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

/** Descarga un archivo CSV */
function downloadCSV(content: string, filename: string) {
  const BOM = '\uFEFF'; // Para soporte de caracteres especiales en Excel
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Exporta lecturas ambientales a CSV */
export function exportEnvironmentalReadings(readings: EnvReading[], plantName?: string) {
  const headers: { key: keyof EnvReading; label: string }[] = [
    { key: 'measured_at', label: 'Fecha y hora' },
    { key: 'soil_moisture', label: 'Humedad sustrato (%)' },
    { key: 'soil_ph', label: 'pH sustrato' },
    { key: 'air_temperature', label: 'Temperatura (°C)' },
    { key: 'light_intensity', label: 'Intensidad luminosa (lux)' },
    { key: 'irrigation_frequency_days', label: 'Frecuencia riego (días)' },
    { key: 'hours_since_irrigation', label: 'Horas desde riego' },
    { key: 'hours_since_rain', label: 'Horas desde última lluvia' },
    { key: 'ec', label: 'Conductividad eléctrica (dS/m)' },
    { key: 'humidity_percent', label: 'Humedad relativa (%)' },
    { key: 'par_umol_m2_s', label: 'PAR (µmol/m²/s)' },
    { key: 'vpd_kpa', label: 'Déficit de presión de vapor (kPa)' },
    { key: 'precipitation_mm', label: 'Precipitación (mm)' },
    { key: 'source', label: 'Fuente' },
    { key: 'notes', label: 'Notas' },
  ];

  const csv = arrayToCSV(readings, headers);
  const filename = `variables_ambientales${plantName ? `_${plantName}` : ''}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/** Exporta lecturas fenotípicas a CSV */
export function exportPhenotypicReadings(readings: PhenoReading[], plantName?: string) {
  const headers: { key: keyof PhenoReading; label: string }[] = [
    { key: 'measured_at', label: 'Fecha y hora' },
    { key: 'height_cm', label: 'Altura (cm)' },
    { key: 'cladode_count', label: 'Núm. pencas' },
    { key: 'cladode_length_cm', label: 'Largo penca (cm)' },
    { key: 'cladode_width_cm', label: 'Ancho penca (cm)' },
    { key: 'cladode_thickness_mm', label: 'Grosor penca (mm)' },
    { key: 'new_sprouts', label: 'Brotes nuevos' },
    { key: 'sprout_length_cm', label: 'Largo brotes (cm)' },
    { key: 'sprout_width_cm', label: 'Ancho brotes (cm)' },
    { key: 'color_hex', label: 'Color (HEX)' },
    { key: 'color_hue', label: 'Matiz (°)' },
    { key: 'green_index', label: 'Índice verdor' },
    { key: 'visual_state', label: 'Estado visual' },
    { key: 'general_state', label: 'Estado general' },
    { key: 'spots_present', label: '¿Manchas?' },
    { key: 'spots_description', label: 'Descripción manchas' },
    { key: 'spots_coverage_percent', label: 'Cobertura manchas (%)' },
    { key: 'lesions_present', label: '¿Lesiones?' },
    { key: 'lesions_description', label: 'Descripción lesiones' },
    { key: 'wrinkles_present', label: '¿Arrugas?' },
    { key: 'wrinkles_description', label: 'Descripción arrugas' },
    { key: 'turgor', label: 'Turgencia' },
    { key: 'texture', label: 'Textura' },
    { key: 'notes', label: 'Notas' },
  ];

  const csv = arrayToCSV(readings, headers);
  const filename = `variables_fenotipicas${plantName ? `_${plantName}` : ''}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/** Exporta listado de plantas a CSV */
export function exportPlants(plants: Plant[]) {
  const headers: { key: keyof Plant; label: string }[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'code', label: 'Código' },
    { key: 'variety', label: 'Variedad' },
    { key: 'location', label: 'Ubicación' },
    { key: 'substrate', label: 'Sustrato' },
    { key: 'planted_on', label: 'Fecha plantación' },
    { key: 'cladode_count', label: 'Núm. cladodios' },
    { key: 'height_cm', label: 'Altura (cm)' },
    { key: 'status', label: 'Estado' },
    { key: 'created_at', label: 'Creada' },
    { key: 'notes', label: 'Notas' },
  ];

  const csv = arrayToCSV(plants, headers);
  const filename = `plantas_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/** Exporta alertas a CSV */
export function exportAlerts(alerts: Alert[]) {
  const headers: { key: keyof Alert; label: string }[] = [
    { key: 'created_at', label: 'Fecha' },
    { key: 'variable', label: 'Variable' },
    { key: 'severity', label: 'Severidad' },
    { key: 'message', label: 'Mensaje' },
    { key: 'recommendation', label: 'Recomendación' },
    { key: 'observed_value', label: 'Valor observado' },
    { key: 'resolved', label: 'Resuelta' },
  ];

  const csv = arrayToCSV(alerts, headers);
  const filename = `alertas_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}

/** Genera un reporte completo en formato texto */
export function exportFullReport(
  plant: Plant,
  envReadings: EnvReading[],
  phenoReadings: PhenoReading[],
  healthScore: number | null
) {
  const lines: string[] = [
    '=' .repeat(60),
    'REPORTE DE GEMELO DIGITAL',
    '=' .repeat(60),
    '',
    `Planta: ${plant.name}`,
    `Código: ${plant.code || 'N/A'}`,
    `Variedad: ${plant.variety || 'N/A'}`,
    `Ubicación: ${plant.location || 'N/A'}`,
    `Índice de salud: ${healthScore !== null ? `${healthScore}%` : 'Sin datos'}`,
    `Fecha del reporte: ${new Date().toLocaleString('es-MX')}`,
    '',
    '-'.repeat(60),
    'ÚTLIMAS LECTURAS AMBIENTALES',
    '-'.repeat(60),
  ];

  if (envReadings.length > 0) {
    const latest = envReadings[0];
    lines.push(
      `Fecha: ${new Date(latest.measured_at).toLocaleString('es-MX')}`,
      `Humedad sustrato: ${latest.soil_moisture ?? 'N/A'}%`,
      `pH: ${latest.soil_ph ?? 'N/A'}`,
      `Temperatura: ${latest.air_temperature ?? 'N/A'}°C`,
      `Luz: ${latest.light_intensity ?? 'N/A'} lux`,
      `PAR: ${latest.par_umol_m2_s ?? 'N/A'} µmol/m²/s`,
      `Humedad relativa: ${latest.humidity_percent ?? 'N/A'}%`,
      `Déficit de presión de vapor: ${latest.vpd_kpa ?? 'N/A'} kPa`,
      `Precipitación: ${latest.precipitation_mm ?? 'N/A'} mm`,
      `Horas desde última lluvia: ${latest.hours_since_rain ?? 'N/A'}`,
      `Frecuencia riego: ${latest.irrigation_frequency_days ?? 'N/A'} días`,
      `CE: ${latest.ec ?? 'N/A'} dS/m`,
    );
  } else {
    lines.push('Sin lecturas ambientales registradas.');
  }

  lines.push(
    '',
    '-'.repeat(60),
    'ÚTLIMAS LECTURAS FENOTÍPICAS',
    '-'.repeat(60),
  );

  if (phenoReadings.length > 0) {
    const latest = phenoReadings[0];
    lines.push(
      `Fecha: ${new Date(latest.measured_at).toLocaleString('es-MX')}`,
      `Altura: ${latest.height_cm ?? 'N/A'} cm`,
      `Núm. pencas: ${latest.cladode_count ?? 'N/A'}`,
      `Brotes nuevos: ${latest.new_sprouts ?? 'N/A'}`,
      `Dimensiones de pencas: ${latest.cladode_length_cm ?? 'N/A'} × ${latest.cladode_width_cm ?? 'N/A'} cm; grosor ${latest.cladode_thickness_mm ?? 'N/A'} mm`,
      `Dimensiones de brotes: ${latest.sprout_length_cm ?? 'N/A'} × ${latest.sprout_width_cm ?? 'N/A'} cm`,
      `Estado visual: ${latest.visual_state ?? 'N/A'}`,
      `Estado general: ${latest.general_state ?? 'N/A'}`,
      `Color: ${latest.color_hex ?? 'N/A'}`,
      `Manchas: ${latest.spots_present ? latest.spots_description || 'Sí' : 'No'}`,
      `Lesiones: ${latest.lesions_present ? latest.lesions_description || 'Sí' : 'No'}`,
      `Arrugas: ${latest.wrinkles_present ? latest.wrinkles_description || 'Sí' : 'No'}`,
      `Turgencia: ${latest.turgor ?? 'N/A'}`,
      `Textura: ${latest.texture ?? 'N/A'}`,
      `Índice verdor: ${latest.green_index ?? 'N/A'}`,
    );
  } else {
    lines.push('Sin lecturas fenotípicas registradas.');
  }

  lines.push(
    '',
    '=' .repeat(60),
    'FIN DEL REPORTE',
    '=' .repeat(60),
  );

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte_${plant.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
