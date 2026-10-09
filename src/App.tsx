import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { IntroPage } from '@/pages/IntroPage';

const StudioPage = lazy(() => import('@/pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LedgerPage = lazy(() => import('@/pages/LedgerPage').then((m) => ({ default: m.LedgerPage })));
const ScenariosPage = lazy(() => import('@/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage })));
const MethodPage = lazy(() => import('@/pages/MethodPage').then((m) => ({ default: m.MethodPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-graphite-400">
        <span className="h-2 w-2 animate-breathe rounded-full bg-amber-glow" />
        <span className="text-sm">Loading simulation workspace…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/method" element={<MethodPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
