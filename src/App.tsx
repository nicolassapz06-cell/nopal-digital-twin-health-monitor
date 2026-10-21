/**
 * ⚠️ ROUTING RULES:
 * - Router is in main.tsx. Do NOT add another <BrowserRouter> here or anywhere.
 * - Use <Routes> + <Route> components ONLY. Do NOT use useRoutes().
 */
import { Routes, Route } from 'react-router';
import Dashboard from '@/pages/Dashboard';
import Auth from '@/pages/Auth';
import PlantsV2 from '@/pages/PlantsV2';
import PlantDetailV2 from '@/pages/PlantDetailV2';
import Experimentation from '@/pages/Experimentation';
import Alerts from '@/pages/AlertsV2';
import Settings from '@/pages/SettingsV2';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/acceso" element={<Auth />} />
      <Route path="/auth/callback" element={<Auth />} />
      <Route path="/plantas" element={<PlantsV2 />} />
      <Route path="/plantas/:id" element={<PlantDetailV2 />} />
      <Route path="/experimentacion" element={<Experimentation />} />
      <Route path="/alertas" element={<Alerts />} />
      <Route path="/ajustes" element={<Settings />} />
    </Routes>
  );
}
