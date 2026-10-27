import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router';
import { Leaf, Menu, X, LayoutDashboard, Sprout, BellRing, Settings, LogOut, FlaskConical, Moon, Sun, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';

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
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('No se pudo cambiar el modo de pantalla completa', error);
      window.alert('No se pudo activar la pantalla completa en este navegador.');
    }
  };

  const themeToggle = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={darkMode}
      aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="theme-toggle flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
    >
      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  );

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
      <header data-ev-id="ev_e12708f8bb" className="flex h-16 items-center justify-between border-b border-border bg-card/90 px-4 shadow-sm backdrop-blur lg:hidden">
        <div data-ev-id="ev_4aa6e31978" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Leaf className="h-5 w-5 text-primary" />
          </span>
          <span data-ev-id="ev_36a977c976" className="font-semibold tracking-tight">Gemelo Digital</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'} title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} className="rounded-lg p-2 hover:bg-muted">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={toggleTheme} aria-pressed={darkMode} aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'} className="theme-toggle rounded-lg p-2">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button data-ev-id="ev_6d543077f1" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 hover:bg-muted">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Móvil: menú desplegable */}
      {menuOpen &&
      <nav data-ev-id="ev_de6216f61f" className="flex flex-col gap-1 border-b border-border bg-card p-3 shadow-sm lg:hidden">
          {NAV.map(({ to, label, icon: Icon, end }) =>
        <NavLink data-ev-id="ev_28d1c7156d"
        key={to}
        to={to}
        end={end}
        onClick={() => setMenuOpen(false)}
        className={({ isActive }) =>
        `nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive ? 'nav-link-active' : ''}`

        }>

              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
        )}
              {themeToggle}
              <button data-ev-id="ev_cc6754ba29"
        onClick={handleSignOut}
        className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted">

            <LogOut className="h-5 w-5" /> Cerrar sesión
          </button>
        </nav>
      }

      {/* Desktop: sidebar */}
      <aside data-ev-id="ev_0f1154c4ca" className="app-sidebar hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div data-ev-id="ev_892eee1975" className="flex h-[4.5rem] items-center gap-3 border-b border-border px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Leaf className="h-6 w-6 text-primary" />
          </span>
          <div className="flex flex-col">
            <span data-ev-id="ev_a25c897cf5" className="font-semibold tracking-tight">D.Twin</span>
            <span className="text-[11px] text-muted-foreground">Gemelo digital agrícola</span>
          </div>
        </div>

        <nav data-ev-id="ev_b02ec60c2e" className="flex flex-1 flex-col gap-1.5 p-4">
          {NAV.map(({ to, label, icon: Icon, end }) =>
          <NavLink data-ev-id="ev_953fd6b80e"
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
          `nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'nav-link-active' : ''}`

          }>

              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          )}
        </nav>

        <div data-ev-id="ev_eba180adea" className="flex flex-col gap-3 border-t border-border p-4">
          {themeToggle}
          <button type="button" onClick={toggleFullscreen} aria-pressed={isFullscreen} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
          <p data-ev-id="ev_b58cc6cbcb" className="truncate text-xs text-muted-foreground">{user.email}</p>
          <button data-ev-id="ev_4d28bf91b3"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">

            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main data-ev-id="ev_7226f87650" className="app-main flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <div className="app-main-inner flex flex-col gap-6">
          {children}
        </div>
      </main>
    </div>);

}