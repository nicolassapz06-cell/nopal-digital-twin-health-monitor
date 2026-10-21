import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Leaf, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import heroImage from '@/assets/generated/nopal-hero.png';

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('La base de datos aun no esta disponible.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      setBusy(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data.session) navigate('/', { replace: true });else
      setInfo('Cuenta creada. Revisa tu correo para confirmarla.');
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(err.message);else
    navigate('/', { replace: true });
  };

  return (
    <div data-ev-id="ev_932bce78d0" className="flex min-h-screen flex-col bg-background lg:flex-row">
      <section data-ev-id="ev_97bfb091bf" className="relative hidden flex-1 lg:block">
        <img data-ev-id="ev_22f8dc6b0d" src={heroImage} alt="Nopal sano monitoreado con sensores" className="h-full w-full object-cover" />
        <div data-ev-id="ev_940be60ac0" className="absolute inset-0 bg-secondary/55" />
        <div data-ev-id="ev_75ae708fd3" className="absolute bottom-0 left-0 flex flex-col gap-3 p-12 text-white">
          <h2 data-ev-id="ev_9f6359a4b9" className="max-w-md text-3xl font-semibold text-balance">Un gemelo digital para cada nopal de tu plantacion</h2>
          <p data-ev-id="ev_e4907e6635" className="max-w-md text-sm text-white/80 text-pretty">Registra pH, riego, clima y colorimetria de cladodios; el sistema calcula el indice de salud y te avisa antes de que la planta se deteriore.</p>
        </div>
      </section>

      <section data-ev-id="ev_5e70825174" className="flex flex-1 items-center justify-center px-6 py-12">
        <div data-ev-id="ev_b5c8b3cf94" className="flex w-full max-w-sm flex-col gap-6">
          <div data-ev-id="ev_e58a1ca3a8" className="flex flex-col gap-2">
            <span data-ev-id="ev_f59c6823bf" className="flex h-11 w-11 items-center justify-center rounded-md bg-primary">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </span>
            <h1 data-ev-id="ev_e760c3812b" className="text-2xl font-semibold tracking-tight">{mode === 'login' ? 'Entra a NopalTwin' : 'Crea tu cuenta'}</h1>
            <p data-ev-id="ev_0c2fa20072" className="text-sm text-muted-foreground">Monitoreo y seguimiento de salud del nopal.</p>
          </div>

          <form data-ev-id="ev_a40c56fcb1" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' ?
            <label data-ev-id="ev_cbcfe29aaa" className="flex flex-col gap-1.5 text-sm">
                Nombre completo
                <input data-ev-id="ev_ab1d5ebb37" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Ing. Ana Ramirez" />
              </label> :
            null}

            <label data-ev-id="ev_27a4f3662a" className="flex flex-col gap-1.5 text-sm">
              Correo
              <input data-ev-id="ev_3632dd1561" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="tu@correo.com" />
            </label>

            <label data-ev-id="ev_711bd5bd96" className="flex flex-col gap-1.5 text-sm">
              Contrasena
              <input data-ev-id="ev_b8e48579aa" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Minimo 6 caracteres" />
            </label>

            {error ? <p data-ev-id="ev_ea15335b05" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            {info ? <p data-ev-id="ev_cce61b7576" className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{info}</p> : null}

            <button data-ev-id="ev_a116bb9c0d" type="submit" disabled={busy} className="flex flex-row items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'login' ? 'Entrar' : 'Registrarme'}
            </button>
          </form>

          <button data-ev-id="ev_85da3fe2ba" onClick={() => {setMode(mode === 'login' ? 'signup' : 'login');setError(null);setInfo(null);}} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            {mode === 'login' ? 'No tengo cuenta, quiero registrarme' : 'Ya tengo cuenta, iniciar sesion'}
          </button>
        </div>
      </section>
    </div>);

}