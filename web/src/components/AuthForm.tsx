import { useEffect, useState } from 'react';
import { authenticate, checkUsername } from '../lib/sync';
import { useUI } from '../store/useUI';

const NAME_RE = /^[a-z0-9_.-]{3,24}$/;

/** Create account / sign in with a unique username and a password. */
export default function AuthForm({ onDone, big }: { onDone?: () => void; big?: boolean }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avail, setAvail] = useState<'idle' | 'checking' | 'free' | 'taken' | 'offline'>('idle');
  const name = username.trim().toLowerCase();
  const nameOk = NAME_RE.test(name);
  const pwOk = password.length >= 8;

  useEffect(() => {
    if (mode !== 'register' || !nameOk) { setAvail('idle'); return; }
    setAvail('checking');
    const t = setTimeout(() => {
      checkUsername(name).then((r) => setAvail(r.available ? 'free' : 'taken')).catch(() => setAvail('offline'));
    }, 350);
    return () => clearTimeout(t);
  }, [name, nameOk, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authenticate(mode, name, password);
      useUI.getState().toast(mode === 'register' ? 'Account created. Your plan is syncing.' : 'Signed in. Your plan is syncing.', { kind: 'good' });
      onDone?.();
    } catch (err) {
      const m = (err as Error).message;
      useUI.getState().toast(m === 'Failed to fetch' ? 'Cannot reach the server. Start it with npm run dev.' : m, { kind: 'warn' });
    } finally { setBusy(false); }
  };

  const hint = mode === 'login' ? null
    : !name ? '3-24 letters, numbers, dot, dash or underscore. Must be unique.'
    : !nameOk ? 'Use 3-24 letters, numbers, dot, dash or underscore.'
    : avail === 'taken' ? 'That username is taken.'
    : avail === 'free' ? 'Username is available.'
    : avail === 'checking' ? 'Checking…' : null;
  const canSubmit = !busy && nameOk && pwOk && !(mode === 'register' && avail === 'taken');
  const h = big ? { minHeight: 48 } : undefined;

  return (
    <form onSubmit={submit} className="stack gap-2" style={{ display: 'grid', gap: 8 }}>
      <div className="row gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'register'} className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : ''}`} onClick={() => setMode('register')}>Create account</button>
        <button type="button" role="tab" aria-selected={mode === 'login'} className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : ''}`} onClick={() => setMode('login')}>Sign in</button>
      </div>
      <input className="input" style={h} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" aria-label="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={24} />
      {hint && <div className="small muted" role="status" style={avail === 'taken' ? { color: 'var(--danger, #e5484d)' } : undefined}>{hint}</div>}
      <div className="row gap-2">
        <input className="input grow" style={h} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Password (8+ characters)' : 'Password'} aria-label="Password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
        <button type="button" className="btn btn-sm" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
      </div>
      <button className="btn btn-primary" style={h} disabled={!canSubmit}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
    </form>
  );
}
