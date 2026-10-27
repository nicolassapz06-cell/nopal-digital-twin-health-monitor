import { supabase } from '@/integrations/supabase/client';

export const MODELS_BUCKET = 'models-3d';
const SIGNED_URL_TTL_SECONDS = 7200;
const signedModelUrls = new Map<string, { url: string; expiresAt: number }>();
const pendingSignedModelUrls = new Map<string, Promise<string | null>>();

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
  const cached = signedModelUrls.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const pending = pendingSignedModelUrls.get(path);
  if (pending) return pending;

  const request = supabase.storage.from(MODELS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    .then(({ data, error }) => {
      if (error) return null;
      const signedUrl = data?.signedUrl ?? null;
      if (signedUrl) {
        signedModelUrls.set(path, {
          url: signedUrl,
          expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 60) * 1000
        });
      }
      return signedUrl;
    });

  pendingSignedModelUrls.set(path, request);
  try {
    return await request;
  } finally {
    if (pendingSignedModelUrls.get(path) === request) {
      pendingSignedModelUrls.delete(path);
    }
  }
}
