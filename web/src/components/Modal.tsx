import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Icon';

function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    addEventListener('keydown', h, true);
    return () => removeEventListener('keydown', h, true);
  }, [onClose]);
}

/** Focus trap: keeps Tab inside the dialog and restores focus on close. */
function useTrap(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('input,select,textarea,button:not([data-nofocus]),[tabindex="0"]');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el) return;
      const f = [...el.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input,select,textarea,[tabindex="0"]')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], b = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    addEventListener('keydown', onKey);
    return () => { removeEventListener('keydown', onKey); const a = document.activeElement; if (!a || a === document.body || el?.contains(a)) prev?.focus?.(); };
  }, []); // eslint-disable-line
}

export function Modal({ title, subtitle, onClose, children, wide, footer }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEsc(onClose);
  useTrap(ref);
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={`modal${wide ? ' wide' : ''}`}
        initial={{ y: 40, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0, scale: 0.98 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <div className="modal-head">
          <div><h2>{title}</h2>{subtitle && <p className="muted small mt-1">{subtitle}</p>}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
        {footer && <div className="row mt-4 wrap" style={{ justifyContent: 'flex-end' }}>{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

export function Drawer({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEsc(onClose);
  useTrap(ref);
  return (
    <>
      <motion.div className="overlay" style={{ zIndex: 99 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose} />
      <motion.aside ref={ref} role="dialog" aria-modal="true" className="drawer" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
        <div className="modal-head"><h2>{title}</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        {children}
      </motion.aside>
    </>
  );
}
