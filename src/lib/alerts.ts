import { supabase } from '@/integrations/supabase/client';
import type { Issue } from '@/lib/health';

/** Guarda las alertas derivadas de una evaluacion de umbrales. */
export async function saveAlerts(userId: string, plantId: string, issues: Issue[]): Promise<void> {
  if (!supabase || issues.length === 0) return;
  const rows = issues.map((i) => ({
    user_id: userId,
    plant_id: plantId,
    variable: i.variable,
    severity: i.severity,
    message: i.message,
    recommendation: i.recommendation,
    observed_value: i.value,
  }));
  const { error } = await supabase.from('alerts').insert(rows);
  if (error) console.error('alerts insert error', error.message);
}
