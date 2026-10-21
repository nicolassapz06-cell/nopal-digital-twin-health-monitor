import { supabase } from '@/integrations/supabase/client';

export const PHOTO_BUCKET = 'plant-photos';

/** Sube una imagen al bucket privado y devuelve la ruta almacenada. */
export async function uploadPhoto(userId: string, file: File, folder: string): Promise<string | null> {
  if (!supabase) return null;
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: false });
  if (error) {
    console.error('upload error', error.message);
    return null;
  }
  return path;
}

/** Genera una URL firmada temporal para mostrar una imagen privada. */
export async function getSignedUrl(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
