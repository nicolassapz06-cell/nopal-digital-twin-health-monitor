import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Plus, Sprout, Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { uploadPhoto } from '@/lib/storage';

type Plant = Tables<'plants'>;

const INPUT = 'rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

export default function Plants() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', variety: '', location: '', substrate: '', planted_on: '', cladode_count: '', height_cm: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const { data } = await supabase.from('plants').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPlants(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    setError(null);

    let photoPath: string | null = null;
    if (file) photoPath = await uploadPhoto(user.id, file, 'fichas');

    const { error: err } = await supabase.from('plants').insert({
      user_id: user.id,
      name: form.name,
      code: form.code || null,
      variety: form.variety || null,
      location: form.location || null,
      substrate: form.substrate || null,
      planted_on: form.planted_on || null,
      cladode_count: form.cladode_count ? Number(form.cladode_count) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      notes: form.notes || null,
      photo_url: photoPath
    });

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ name: '', code: '', variety: '', location: '', substrate: '', planted_on: '', cladode_count: '', height_cm: '', notes: '' });
    setFile(null);
    setOpen(false);
    load();
  };

  return (
    <Layout>
      <header data-ev-id="ev_3f19a01738" className="flex flex-row items-start justify-between gap-4">
        <div data-ev-id="ev_b6f4405cad" className="flex flex-col gap-1">
          <h1 data-ev-id="ev_e74d74099f" className="text-2xl font-semibold tracking-tight">Plantas</h1>
          <p data-ev-id="ev_a414dd9490" className="text-sm text-muted-foreground">Ficha tecnica de cada nopal con su gemelo digital asociado.</p>
        </div>
        <button data-ev-id="ev_6a96ea7b59" onClick={() => setOpen(!open)} className="flex flex-row items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Nueva planta
        </button>
      </header>

      {open ?
      <form data-ev-id="ev_63c679fb1d" onSubmit={handleCreate} className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-3">
          <label data-ev-id="ev_241f43b213" className="flex flex-col gap-1.5 text-sm">Nombre / identificador
            <input data-ev-id="ev_11aa912571" required value={form.name} onChange={set('name')} className={INPUT} placeholder="Nopal A-01" />
          </label>
          <label data-ev-id="ev_8f546c3697" className="flex flex-col gap-1.5 text-sm">Codigo de lote
            <input data-ev-id="ev_7d286928a5" value={form.code} onChange={set('code')} className={INPUT} placeholder="LT-2024-07" />
          </label>
          <label data-ev-id="ev_03ae447f94" className="flex flex-col gap-1.5 text-sm">Variedad
            <input data-ev-id="ev_f74468445c" value={form.variety} onChange={set('variety')} className={INPUT} placeholder="Opuntia ficus-indica" />
          </label>
          <label data-ev-id="ev_07fb089d60" className="flex flex-col gap-1.5 text-sm">Ubicacion
            <input data-ev-id="ev_7c7b0873eb" value={form.location} onChange={set('location')} className={INPUT} placeholder="Invernadero 2, cama 4" />
          </label>
          <label data-ev-id="ev_614cb8334d" className="flex flex-col gap-1.5 text-sm">Sustrato
            <input data-ev-id="ev_fa72a7f238" value={form.substrate} onChange={set('substrate')} className={INPUT} placeholder="Arena-composta 70/30" />
          </label>
          <label data-ev-id="ev_22ece50844" className="flex flex-col gap-1.5 text-sm">Fecha de plantacion
            <input data-ev-id="ev_10a5e35cd4" type="date" value={form.planted_on} onChange={set('planted_on')} className={INPUT} />
          </label>
          <label data-ev-id="ev_93b01ca83f" className="flex flex-col gap-1.5 text-sm">Numero de cladodios
            <input data-ev-id="ev_a44014f1e0" type="number" value={form.cladode_count} onChange={set('cladode_count')} className={INPUT} placeholder="6" />
          </label>
          <label data-ev-id="ev_015f15b012" className="flex flex-col gap-1.5 text-sm">Altura (cm)
            <input data-ev-id="ev_fbac94a342" type="number" step="0.1" value={form.height_cm} onChange={set('height_cm')} className={INPUT} placeholder="85" />
          </label>
          <label data-ev-id="ev_57132f615a" className="flex flex-col gap-1.5 text-sm">Fotografia
            <input data-ev-id="ev_9a4e9a0ae2" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </label>
          <label data-ev-id="ev_584e23528b" className="flex flex-col gap-1.5 text-sm md:col-span-3">Notas
            <textarea data-ev-id="ev_3816be0635" value={form.notes} onChange={set('notes')} rows={2} className={INPUT} placeholder="Observaciones de campo" />
          </label>

          {error ? <p data-ev-id="ev_f15c7db076" className="text-sm text-destructive md:col-span-3">{error}</p> : null}

          <div data-ev-id="ev_ec9e80efa3" className="flex flex-row gap-2 md:col-span-3">
            <button data-ev-id="ev_c659093d9b" type="submit" disabled={busy} className="flex flex-row items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar planta
            </button>
            <button data-ev-id="ev_be292d9bc3" type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </form> :
      null}

      {loading ?
      <p data-ev-id="ev_d92e126c1d" className="text-sm text-muted-foreground">Cargando plantas…</p> :
      plants.length === 0 ?
      <div data-ev-id="ev_2fe93a58d6" className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Sprout className="h-8 w-8 text-primary" />
          <p data-ev-id="ev_81c678d6df" className="text-sm text-muted-foreground">Registra tu primera planta para comenzar el seguimiento.</p>
        </div> :

      <div data-ev-id="ev_284f06708f" className="overflow-x-auto rounded-lg border border-border bg-card">
          <table data-ev-id="ev_3894f2495b" className="w-full text-left text-sm">
            <thead data-ev-id="ev_8a20f7f475" className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr data-ev-id="ev_5bb6ab64dc">
                <th data-ev-id="ev_7a2d98befb" className="px-4 py-3">Planta</th>
                <th data-ev-id="ev_e83a881b64" className="px-4 py-3">Variedad</th>
                <th data-ev-id="ev_00ff0ed43f" className="px-4 py-3">Ubicacion</th>
                <th data-ev-id="ev_45d35b4d66" className="px-4 py-3">Plantada</th>
                <th data-ev-id="ev_0aaf0ff8c1" className="px-4 py-3">Estado</th>
                <th data-ev-id="ev_25ed3a5f24" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody data-ev-id="ev_79e01a18ac">
              {plants.map((p) =>
            <tr data-ev-id="ev_f83d1dc24f" key={p.id} className="border-b border-border last:border-0">
                  <td data-ev-id="ev_f1c17e0b62" className="px-4 py-3 font-medium">{p.name}{p.code ? <span data-ev-id="ev_2470f47324" className="ml-2 text-xs text-muted-foreground">{p.code}</span> : null}</td>
                  <td data-ev-id="ev_bae3c4c4d8" className="px-4 py-3 text-muted-foreground">{p.variety || '—'}</td>
                  <td data-ev-id="ev_073c79de02" className="px-4 py-3 text-muted-foreground">{p.location || '—'}</td>
                  <td data-ev-id="ev_553ee70959" className="px-4 py-3 text-muted-foreground">{p.planted_on || '—'}</td>
                  <td data-ev-id="ev_5e26fcab95" className="px-4 py-3"><span data-ev-id="ev_a701874d6e" className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.status}</span></td>
                  <td data-ev-id="ev_f76fa4b142" className="px-4 py-3 text-right"><Link data-ev-id="ev_f63cc842b9" to={`/plantas/${p.id}`} className="text-primary underline-offset-4 hover:underline">Abrir gemelo</Link></td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      }
    </Layout>);

}