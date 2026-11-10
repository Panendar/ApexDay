import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Shell } from './components/Shell';
import { FxLayer } from './components/Confetti';
import { FocusMode } from './components/FocusMode';
import { ShiftDialog } from './components/ShiftDialog';
import { TaskEditor } from './components/TaskEditor';
import { QuickAddModal, CaptureModal } from './components/QuickAdd';
import { CommandPalette, Toasts, Celebration, ShortcutsHelp } from './components/Overlays';
import { useStore } from './store/useStore';
import Landing from './pages/Landing';
import Today from './pages/Today';

const Plan = lazy(() => import('./pages/Plan'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Progress = lazy(() => import('./pages/Progress'));
const Routines = lazy(() => import('./pages/Routines'));
const Habits = lazy(() => import('./pages/Habits'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Quests = lazy(() => import('./pages/Quests'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Trash = lazy(() => import('./pages/Trash'));
const Settings = lazy(() => import('./pages/Settings'));

const Fallback = () => <div className="page"><div className="skeleton" style={{ height: 40, width: 260 }} /><div className="skeleton mt-3" style={{ height: 220 }} /></div>;

export default function App() {
  const reduced = useStore((s) => s.settings.motion === 'reduced');
  const loc = useLocation();
  const inApp = loc.pathname.startsWith('/app');
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Today />} />
            <Route path="plan" element={<Plan />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="progress" element={<Progress />} />
            <Route path="routines" element={<Routines />} />
            <Route path="habits" element={<Habits />} />
            <Route path="quests" element={<Quests />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="trash" element={<Trash />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <FxLayer />
      <Toasts />
      {inApp && (<><FocusMode /><ShiftDialog /><TaskEditor /><QuickAddModal /><CaptureModal /><CommandPalette /><ShortcutsHelp /><Celebration /></>)}
    </MotionConfig>
  );
}
