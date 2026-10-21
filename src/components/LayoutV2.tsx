import { useState, type ReactNode } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router';
import { Leaf, Menu, X, LayoutDashboard, Sprout, BellRing, Settings, LogOut, FlaskConical } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

// Navegación simplificada
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/plantas', label: 'Mis Plantas', icon: Sprout, end: false },
  { to: '/experimentacion', label: 'Experimentación', icon: FlaskConical, end: false },
  { to: '/alertas', label: 'Alertas', icon: BellRing, end: false },
  { to: '/ajustes', label: 'Configuración', icon: Settings, end: false }
];


export function LayoutV2({ children }: {children: ReactNode;}) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div data-ev-id="ev_ac3e39bc05" className="flex min-h-screen items-center justify-center bg-background">
        <div data-ev-id="ev_7f3738f8f6" className="flex flex-col items-center gap-3 text-muted-foreground">
          <Leaf className="h-10 w-10 animate-pulse text-primary" />
          <p data-ev-id="ev_57ca19177d" className="text-sm">Cargando...</p>
        </div>
      </div>);

  }

  if (!user) return <Navigate to="/acceso" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate('/acceso', { replace: true });
  };

  return (
    <div data-ev-id="ev_5ac5d68995" className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      {/* Móvil: barra superior */}
      <header data-ev-id="ev_e12708f8bb" className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div data-ev-id="ev_4aa6e31978" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span data-ev-id="ev_36a977c976" className="font-semibold">Gemelo Digital</span>
        </div>
        <button data-ev-id="ev_6d543077f1" onClick={() => setMenuOpen(!menuOpen)} className="p-2">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Móvil: menú desplegable */}
      {menuOpen &&
      <nav data-ev-id="ev_de6216f61f" className="flex flex-col gap-1 border-b border-border bg-card p-3 lg:hidden">
          {NAV.map(({ to, label, icon: Icon, end }) =>
        <NavLink data-ev-id="ev_28d1c7156d"
        key={to}
        to={to}
        end={end}
        onClick={() => setMenuOpen(false)}
        className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`

        }>

              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
        )}
          <button data-ev-id="ev_cc6754ba29"
        onClick={handleSignOut}
        className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted">

            <LogOut className="h-5 w-5" /> Cerrar sesión
          </button>
        </nav>
      }

      {/* Desktop: sidebar */}
      <aside data-ev-id="ev_0f1154c4ca" className="hidden w-56 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div data-ev-id="ev_892eee1975" className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Leaf className="h-7 w-7 text-primary" />
          <span data-ev-id="ev_a25c897cf5" className="font-semibold">Gemelo Digital</span>
        </div>

        <nav data-ev-id="ev_b02ec60c2e" className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) =>
          <NavLink data-ev-id="ev_953fd6b80e"
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`

          }>

              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          )}
        </nav>

        <div data-ev-id="ev_eba180adea" className="border-t border-border p-3">
          <p data-ev-id="ev_b58cc6cbcb" className="mb-2 truncate text-xs text-muted-foreground">{user.email}</p>
          <button data-ev-id="ev_4d28bf91b3"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">

            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main data-ev-id="ev_7226f87650" className="flex flex-1 flex-col gap-6 overflow-x-hidden p-4 lg:p-6">
        {children}
      </main>
    </div>);

}