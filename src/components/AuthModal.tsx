import React, { useEffect, useState } from 'react';
import { type User } from 'firebase/auth';
import { Check, LogIn, LogOut, ShieldCheck, UserCheck, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { signInWithGoogleForSharing, signOutSharing } from '../lib/firebase';

const ALIAS_STORAGE_KEY = 'dental_archive_share_alias_v1';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

function getReadableAuthError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  if (code === 'auth/popup-closed-by-user') {
    return 'Se cerró la ventana de inicio de sesión antes de completar el acceso.';
  }
  if (code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana emergente. Habilitá las ventanas emergentes e intentá nuevamente.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Sin conexión a internet para autenticar con Google.';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'No se pudo completar el inicio de sesión.';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user }) => {
  const isOnline = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [alias, setAlias] = useState(() => {
    try {
      return localStorage.getItem(ALIAS_STORAGE_KEY) || 'Estudiante FOLP';
    } catch {
      return 'Estudiante FOLP';
    }
  });
  const [aliasSaved, setAliasSaved] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      const firstName = user.displayName.split(' ')[0];
      setAlias((prev) => {
        if (prev === 'Estudiante FOLP' && firstName) {
          try {
            localStorage.setItem(ALIAS_STORAGE_KEY, firstName);
          } catch {
            // Ignore storage errors
          }
          return firstName;
        }
        return prev;
      });
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setErrorMsg('');
    setBusy(true);
    try {
      await signInWithGoogleForSharing();
      onClose();
    } catch (err) {
      setErrorMsg(getReadableAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg('');
    setBusy(true);
    try {
      await signOutSharing();
      onClose();
    } catch (err) {
      setErrorMsg(getReadableAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAlias = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = alias.trim().slice(0, 60) || 'Estudiante FOLP';
    setAlias(clean);
    try {
      localStorage.setItem(ALIAS_STORAGE_KEY, clean);
    } catch {
      // Ignore storage errors
    }
    setAliasSaved(true);
    setTimeout(() => setAliasSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-rose-950">
              {user ? 'Tu sesión' : 'Iniciar sesión'}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {user
                ? 'Sesión iniciada con Google en este navegador.'
                : 'Accedé con tu cuenta de Google para publicar y gestionar recursos en la Biblioteca Compartida.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-950"
          >
            <X size={18} />
          </button>
        </div>

        {!isOnline && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <WifiOff size={15} className="shrink-0" />
            <span>
              Sin conexión a internet. Podés seguir usando toda tu información guardada offline en el dispositivo.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-900">
            {errorMsg}
          </div>
        )}

        {user ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full border border-rose-200 object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-900 text-sm font-bold text-white">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {user.displayName || 'Estudiante'}
                </p>
                <p className="truncate text-xs text-slate-600">{user.email}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <UserCheck size={12} />
                  <span>Cuenta Google verificada</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveAlias} className="space-y-2 rounded-xl border border-slate-200 p-3.5">
              <label htmlFor="auth-public-alias" className="block text-xs font-semibold text-slate-800">
                Alias público en Biblioteca Compartida
              </label>
              <p className="text-[11px] text-slate-500">
                Se muestra al compartir apuntes para proteger tu correo y datos personales.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="auth-public-alias"
                  type="text"
                  maxLength={60}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-rose-200 px-3 text-xs text-slate-900"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-950 hover:bg-rose-100"
                >
                  {aliasSaved ? <Check size={13} className="text-emerald-700" /> : null}
                  <span>{aliasSaved ? 'Guardado' : 'Guardar'}</span>
                </button>
              </div>
            </form>

            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-[11px] text-emerald-900">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-700" />
              <span>
                Tus correlativas, calendario, apuntes privados, encuestas e historias clínicas siguen guardados únicamente en este dispositivo.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[38px] rounded-lg border border-slate-200 px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSignOut}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-900 px-4 text-xs font-semibold text-white hover:bg-rose-950 disabled:opacity-50"
              >
                <LogOut size={14} />
                <span>{busy ? 'Saliendo...' : 'Cerrar sesión'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 text-xs text-slate-700">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-rose-900" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-950">Uso personal y privacidad garantizada</p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Tus apuntes personales, calendario, correlativas, encuestas e historias clínicas permanecen solo en tu dispositivo. Iniciar sesión únicamente habilita publicar o administrar tus aportes en la Biblioteca Compartida.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || !isOnline}
              onClick={handleSignIn}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-rose-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-950 disabled:opacity-50"
            >
              <LogIn size={16} />
              <span>{busy ? 'Conectando con Google...' : 'Iniciar sesión con Google'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[38px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Continuar sin iniciar sesión (modo local)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
