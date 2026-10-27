import { type ReactNode } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router';
import { LayoutDashboard, Sprout, Palette, BellRing, SlidersHorizontal, LogOut, Leaf } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const NAV = [
{ to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
{ to: '/plantas', label: 'Plantas', icon: Sprout, end: false },
{ to: '/colorimetria', label: 'Colorimetria', icon: Palette, end: false },
{ to: '/alertas', label: 'Alertas', icon: BellRing, end: false },
{ to: '/ajustes', label: 'Umbrales', icon: SlidersHorizontal, end: false }];


export function Layout({ children }: {children: ReactNode;}) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div data-ev-id="ev_66435bd3a4" className="flex min-h-screen items-center justify-center bg-background">
        <div data-ev-id="ev_56737e7754" className="flex flex-col items-center gap-3 text-muted-foreground">
          <Leaf className="h-8 w-8 animate-pulse text-primary" />
          <p data-ev-id="ev_3ff2b664e9" className="text-sm">Cargando gemelo digital…</p>
        </div>
      </div>);

  }

  if (!user) return <Navigate to="/acceso" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate('/acceso', { replace: true });
  };

  return (
    <div data-ev-id="ev_9b36a5c078" className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <aside data-ev-id="ev_2340343eed" className="flex flex-col gap-6 border-b border-border bg-secondary px-4 py-5 text-secondary-foreground md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div data-ev-id="ev_3a9ec4de1c" className="flex flex-row items-center gap-2">
          <span data-ev-id="ev_2a8bd8964d" className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </span>
          <div data-ev-id="ev_f8537e805f" className="flex flex-col">
            <span data-ev-id="ev_2c438b50f8" className="text-sm font-semibold tracking-tight">D.Twin</span>
            <span data-ev-id="ev_46dddea893" className="text-xs text-white/60">Gemelo digital</span>
          </div>
        </div>

        <nav data-ev-id="ev_21a0be89b2" className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {NAV.map(({ to, label, icon: Icon, end }) =>
          <NavLink data-ev-id="ev_8268d1a270"
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
          `flex shrink-0 flex-row items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-white/75 hover:bg-white/10'}`
          }>

              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          )}
        </nav>

        <div data-ev-id="ev_cb778964e9" className="mt-auto hidden flex-col gap-2 md:flex">
          <p data-ev-id="ev_55be0039c9" className="truncate text-xs text-white/60">{user.email}</p>
          <button data-ev-id="ev_0956209e09" onClick={handleSignOut} className="flex flex-row items-center gap-2 rounded-md px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Cerrar sesion
          </button>
        </div>
      </aside>

      <main data-ev-id="ev_66b96b5a36" className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div data-ev-id="ev_10f12949b1" className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
      </main>
    </div>);

}