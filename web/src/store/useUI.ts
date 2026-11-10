import { create } from 'zustand';
import type { TimerMode } from '../lib/types';
import type { ShiftOp } from '../lib/shift';
import { uid } from '../lib/time';

export interface Toast { id: string; text: string; kind: 'info' | 'good' | 'warn'; action?: { label: string; run: () => void }; ttl: number }
export interface Focus {
  taskId: string;
  mode: TimerMode;
  workMin: number;
  breakMin: number;
  phase: 'idle' | 'work' | 'break' | 'finished';
  running: boolean;
  elapsed: number; // seconds in the current phase
  round: number;
  interruptions: number;
  banked: number; // seconds of work not yet committed to the task
  totalWork: number;
}
export interface Celebration { kind: 'day' | 'level' | 'badge' | 'shift'; title: string; sub: string }
export interface EditorState { id?: string; defaults?: Record<string, unknown> }

interface UI {
  toasts: Toast[];
  toast: (text: string, o?: Partial<Omit<Toast, 'id' | 'text'>>) => string;
  dismiss: (id: string) => void;
  palette: boolean;
  setPalette: (v: boolean) => void;
  quickAdd: boolean;
  setQuickAdd: (v: boolean) => void;
  capture: boolean;
  setCapture: (v: boolean) => void;
  shortcuts: boolean;
  setShortcuts: (v: boolean) => void;
  shift: { open: boolean; kind?: ShiftOp['kind']; date?: string };
  openShift: (kind?: ShiftOp['kind'], date?: string) => void;
  closeShift: () => void;
  editor: EditorState | null;
  openEditor: (e: EditorState) => void;
  closeEditor: () => void;
  focus: Focus | null;
  setFocus: (f: Focus | null | ((f: Focus | null) => Focus | null)) => void;
  celebrate: Celebration | null;
  setCelebrate: (c: Celebration | null) => void;
  selected: string | null;
  select: (id: string | null) => void;
  viewDate: string | null; // Today page can be navigated to other days
  setViewDate: (d: string | null) => void;
  lastCelebration: number;
}

export const useUI = create<UI>((set, get) => ({
  toasts: [],
  toast: (text, o = {}) => {
    const id = uid();
    const t: Toast = { id, text, kind: 'info', ttl: 4500, ...o };
    set((s) => ({ toasts: [...s.toasts.slice(-3), t] }));
    if (t.ttl > 0) setTimeout(() => get().dismiss(id), t.ttl);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  palette: false, setPalette: (palette) => set({ palette }),
  quickAdd: false, setQuickAdd: (quickAdd) => set({ quickAdd }),
  capture: false, setCapture: (capture) => set({ capture }),
  shortcuts: false, setShortcuts: (shortcuts) => set({ shortcuts }),
  shift: { open: false },
  openShift: (kind, date) => set({ shift: { open: true, kind, date } }),
  closeShift: () => set({ shift: { open: false } }),
  editor: null, openEditor: (editor) => set({ editor }), closeEditor: () => set({ editor: null }),
  focus: null,
  setFocus: (f) => set((s) => ({ focus: typeof f === 'function' ? f(s.focus) : f })),
  celebrate: null, setCelebrate: (celebrate) => set({ celebrate, lastCelebration: Date.now() }),
  selected: null, select: (selected) => set({ selected }),
  viewDate: null, setViewDate: (viewDate) => set({ viewDate }),
  lastCelebration: 0,
}));
