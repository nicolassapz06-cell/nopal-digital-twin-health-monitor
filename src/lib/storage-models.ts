import { supabase } from '@/integrations/supabase/client';

export const MODELS_BUCKET = 'models-3d';

/** Sube un modelo 3D (.glb/.gltf) al bucket privado. */
export async function uploadModel3D(userId: string, file: File): Promise<string | null> {
  if (!supabase) return null;
  const ext = file.name.split('.').pop() || 'glb';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(MODELS_BUCKET).upload(path, file, { upsert: false });
  if (error) {
    console.error('model upload error', error.message);
    return null;
  }
  return path;
}

/** Genera una URL firmada temporal para cargar un modelo 3D privado. */
export async function getModelSignedUrl(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from(MODELS_BUCKET).createSignedUrl(path, 7200); // 2 horas
  if (error) return null;
  return data?.signedUrl ?? null;
}
