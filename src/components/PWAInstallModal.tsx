import React, { useState } from 'react';
import { Check, Copy, Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 left-3 z-50 flex items-center gap-2 rounded-lg border border-amber-700 bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg md:bottom-4 md:left-4"
    >
      <WifiOff size={14} aria-hidden="true" />
      <span>Modo offline · Apuntes y fichas descargadas disponibles sin internet</span>
    </div>
  );
};

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
}

export const InstallGuideModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  appName,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="pwa-modal-title" className="text-lg font-semibold text-slate-900">
              Instalar en iOS y Android
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Abre este estudio y tus prototipos directamente como aplicación instalada sin tienda de aplicaciones.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        {isInstallable && !isInstalled && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Instalación directa disponible</p>
                <p className="text-xs text-slate-600">Tu navegador permite instalar {appName} ahora mismo.</p>
              </div>
              <button
                type="button"
                onClick={install}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-rose-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-950"
              >
                <Download size={16} />
                <span>Instalar ahora</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className={`rounded-xl border p-4 ${isIOS ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Share size={16} className="text-slate-700" />
              <span>iPhone y iPad (iOS Safari)</span>
            </div>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
              <li>1. Abre esta dirección en Safari desde tu iPhone.</li>
              <li>2. Toca el botón Compartir en la barra inferior.</li>
              <li>3. Elige Añadir a pantalla de inicio y confirma.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Smartphone size={16} className="text-slate-700" />
              <span>Android (Chrome)</span>
            </div>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
              <li>1. Abre esta dirección en Chrome para Android.</li>
              <li>2. Toca el menú superior derecho o el aviso Instalar app.</li>
              <li>3. Confirma para usarla en pantalla completa y sin conexión.</li>
            </ol>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <label htmlFor="pwa-share-url" className="block text-xs font-medium text-slate-600">
            Enlace para abrir en tu teléfono
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="pwa-share-url"
              type="text"
              readOnly
              value={currentUrl}
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              {copiedUrl ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedUrl ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PWAInstallButtonProps {
  onOpenGuide: () => void;
  onLaunchFullscreen: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenGuide,
  onLaunchFullscreen,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled) {
    return (
      <button
        type="button"
        onClick={onLaunchFullscreen}
        className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg bg-rose-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-950 shrink-0"
      >
        <Smartphone size={15} />
        <span>Probar App</span>
      </button>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg bg-rose-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-950 shrink-0"
      >
        <Download size={15} />
        <span>Instalar App</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenGuide}
      className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg bg-rose-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-950 shrink-0"
    >
      <Download size={15} />
      <span>Instalar en Móvil</span>
    </button>
  );
};
