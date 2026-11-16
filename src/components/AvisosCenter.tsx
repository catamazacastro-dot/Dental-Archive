import React, { useState } from 'react';
import { type User } from 'firebase/auth';
import {
  Bell,
  BellRing,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Megaphone,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  createGlobalAviso,
  deleteGlobalAviso,
  isAdminUser,
  updateGlobalAviso,
} from '../lib/firebase';
import type { AvisoCategoria, AvisoGlobal } from '../types/dental';

const CATEGORIA_META: Record<
  AvisoCategoria,
  { label: string; toneClass: string; textClass: string }
> = {
  aviso: {
    label: 'Aviso general',
    toneClass: 'border-rose-200 bg-rose-50/60',
    textClass: 'text-rose-900',
  },
  importante: {
    label: 'Importante',
    toneClass: 'border-rose-300 bg-rose-100/70',
    textClass: 'text-rose-950',
  },
  examen: {
    label: 'Examen / Mesa',
    toneClass: 'border-emerald-200 bg-emerald-50/70',
    textClass: 'text-emerald-800',
  },
  recordatorio: {
    label: 'Recordatorio',
    toneClass: 'border-amber-200 bg-amber-50/70',
    textClass: 'text-amber-900',
  },
};

function formatAvisoDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export async function triggerBrowserAvisoNotification(aviso: AvisoGlobal): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const prefix = aviso.revision > 1 ? 'Aviso actualizado' : 'Nuevo aviso';
  const title = `${prefix} · ${aviso.titulo}`;
  const options: NotificationOptions = {
    body: aviso.mensaje.slice(0, 180),
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `dental-archive-aviso-${aviso.id}-r${aviso.revision}`,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    // Ignore notification restrictions on unsupported browsers
  }
}

interface AvisosLiveToastProps {
  unreadAvisos: AvisoGlobal[];
  notifPermission: NotificationPermission | 'unsupported';
  onRequestNotifPermission: () => void;
  onAcknowledgeOne: (aviso: AvisoGlobal) => void;
  onOpenModal: () => void;
}

export const AvisosLiveToast: React.FC<AvisosLiveToastProps> = ({
  unreadAvisos,
  notifPermission,
  onRequestNotifPermission,
  onAcknowledgeOne,
  onOpenModal,
}) => {
  if (unreadAvisos.length === 0) return null;
  const topAviso = unreadAvisos[0];
  const meta = CATEGORIA_META[topAviso.categoria];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-18 right-3 left-3 z-40 mx-auto max-w-xl rounded-2xl border border-rose-300 bg-[#FFFDF9] p-4 shadow-xl md:right-6 md:left-auto md:w-[420px] print:hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-900 text-white">
            <BellRing size={16} />
          </span>
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-wide ${meta.textClass}`}>
              {topAviso.revision > 1 ? 'Aviso actualizado' : 'Nuevo aviso'} · {meta.label}
              {unreadAvisos.length > 1 ? ` (+${unreadAvisos.length - 1} más)` : ''}
            </p>
            <h3 className="mt-0.5 text-sm font-extrabold text-rose-950">
              {topAviso.titulo}
            </h3>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-700">
              {topAviso.mensaje}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAcknowledgeOne(topAviso)}
          aria-label="Cerrar notificación"
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-900"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rose-100 pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAcknowledgeOne(topAviso)}
            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-rose-900 px-3 text-xs font-semibold text-white hover:bg-rose-950"
          >
            <Check size={13} />
            <span>Entendido</span>
          </button>

          <button
            type="button"
            onClick={onOpenModal}
            className="inline-flex min-h-[34px] items-center rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 hover:bg-rose-50"
          >
            Ver avisos
          </button>
        </div>

        {notifPermission === 'default' && (
          <button
            type="button"
            onClick={onRequestNotifPermission}
            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Bell size={12} />
            <span>Activar alertas</span>
          </button>
        )}
      </div>
    </div>
  );
};

interface AvisosInicioStripProps {
  activeAvisos: AvisoGlobal[];
  unreadCount: number;
  isAdmin: boolean;
  onOpenModal: () => void;
}

export const AvisosInicioStrip: React.FC<AvisosInicioStripProps> = ({
  activeAvisos,
  unreadCount,
  isAdmin,
  onOpenModal,
}) => {
  if (activeAvisos.length === 0 && !isAdmin) return null;

  const latest = activeAvisos[0];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <Megaphone size={18} className="mt-0.5 shrink-0 text-rose-900" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wide text-rose-900 uppercase">
              {activeAvisos.length > 0
                ? `${activeAvisos.length} ${
                    activeAvisos.length === 1 ? 'aviso activo' : 'avisos activos'
                  }${unreadCount > 0 ? ` · ${unreadCount} sin leer` : ''}`
                : 'Tablón de avisos (administración)'}
            </p>
            {latest ? (
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-900">
                {latest.titulo}: <span className="font-normal text-slate-700">{latest.mensaje}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-600">
                Publicá un aviso para que todos los usuarios reciban una notificación al entrar o actualizar.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl bg-rose-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-rose-950"
        >
          <Bell size={13} />
          <span>{isAdmin ? 'Gestionar avisos' : 'Ver avisos'}</span>
        </button>
      </div>
    </div>
  );
};

interface AvisosModalProps {
  isOpen: boolean;
  onClose: () => void;
  avisos: AvisoGlobal[];
  seenAvisos: Record<string, number>;
  user: User | null;
  notifPermission: NotificationPermission | 'unsupported';
  onRequestNotifPermission: () => void;
  onAcknowledgeAll: () => void;
  onAcknowledgeOne: (aviso: AvisoGlobal) => void;
  onOpenSignIn: () => void;
}

export const AvisosModal: React.FC<AvisosModalProps> = ({
  isOpen,
  onClose,
  avisos,
  seenAvisos,
  user,
  notifPermission,
  onRequestNotifPermission,
  onAcknowledgeAll,
  onAcknowledgeOne,
  onOpenSignIn,
}) => {
  const isAdmin = isAdminUser(user);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [categoria, setCategoria] = useState<AvisoCategoria>('aviso');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const visibleAvisos = isAdmin ? avisos : avisos.filter((a) => a.activo);
  const unreadCount = avisos.filter(
    (a) => a.activo && (seenAvisos[a.id] || 0) < a.revision
  ).length;

  const resetForm = () => {
    setEditingId(null);
    setTitulo('');
    setMensaje('');
    setCategoria('aviso');
    setShowForm(false);
    setErrorMsg('');
  };

  const startEdit = (aviso: AvisoGlobal) => {
    setEditingId(aviso.id);
    setTitulo(aviso.titulo);
    setMensaje(aviso.mensaje);
    setCategoria(aviso.categoria);
    setShowForm(true);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) return;
    setBusy(true);
    setErrorMsg('');
    try {
      if (editingId) {
        const current = avisos.find((a) => a.id === editingId);
        const nextRevision = (current?.revision || 1) + 1;
        await updateGlobalAviso(editingId, {
          titulo,
          mensaje,
          categoria,
          activo: current?.activo ?? true,
          nextRevision,
        });
      } else {
        await createGlobalAviso({
          titulo,
          mensaje,
          categoria,
          activo: true,
        });
      }
      resetForm();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el aviso. Verificá tu sesión de administrador.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActivo = async (aviso: AvisoGlobal) => {
    setBusy(true);
    setErrorMsg('');
    try {
      const reactivating = !aviso.activo;
      await updateGlobalAviso(aviso.id, {
        titulo: aviso.titulo,
        mensaje: aviso.mensaje,
        categoria: aviso.categoria,
        activo: reactivating,
        nextRevision: reactivating ? aviso.revision + 1 : aviso.revision,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar el estado.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (avisoId: string) => {
    setBusy(true);
    setErrorMsg('');
    try {
      await deleteGlobalAviso(avisoId);
      if (editingId === avisoId) resetForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo eliminar el aviso.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avisos-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-rose-200 bg-[#FAF6F0] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-rose-200 bg-[#FFFDF9] px-5 py-4">
          <div>
            <h2
              id="avisos-modal-title"
              className="flex items-center gap-2 text-lg font-extrabold text-rose-900"
            >
              <Megaphone size={18} />
              <span>Avisos y Recordatorios</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Mensajes globales en tiempo real para que nadie olvide fechas ni novedades.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de avisos"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Bar: Notification opt-in + Mark all read + Admin Create */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              {notifPermission === 'granted' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <BellRing size={14} />
                  <span>Notificaciones activadas en este dispositivo</span>
                </span>
              ) : notifPermission === 'denied' ? (
                <span className="text-xs text-slate-600">
                  Alertas del navegador bloqueadas (habilitalas en la configuración del sitio).
                </span>
              ) : notifPermission === 'default' ? (
                <button
                  type="button"
                  onClick={onRequestNotifPermission}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <Bell size={14} />
                  <span>Activar notificaciones del navegador</span>
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  Los avisos aparecen automáticamente dentro de la app.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onAcknowledgeAll}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Check size={13} />
                  <span>Marcar leídos</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (showForm && !editingId) {
                      resetForm();
                    } else {
                      setEditingId(null);
                      setTitulo('');
                      setMensaje('');
                      setCategoria('aviso');
                      setShowForm(true);
                    }
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-bold text-white hover:bg-rose-950"
                >
                  <Plus size={14} />
                  <span>Nuevo aviso</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-900">
              {errorMsg}
            </div>
          )}

          {/* Admin Create / Edit Form */}
          {isAdmin && showForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-3 rounded-2xl border border-rose-300 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-rose-950">
                  {editingId ? 'Modificar aviso (volverá a notificar)' : 'Publicar nuevo aviso global'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-900"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="aviso-titulo"
                    className="block text-[11px] font-semibold text-slate-700"
                  >
                    Título del aviso
                  </label>
                  <input
                    id="aviso-titulo"
                    type="text"
                    required
                    maxLength={140}
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej. Cambio de horario mesa de Anatomía"
                    className="mt-1 h-9 w-full rounded-lg border border-rose-200 px-3 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="aviso-categoria"
                    className="block text-[11px] font-semibold text-slate-700"
                  >
                    Tipo
                  </label>
                  <select
                    id="aviso-categoria"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as AvisoCategoria)}
                    className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
                  >
                    <option value="aviso">Aviso general</option>
                    <option value="importante">Importante</option>
                    <option value="examen">Examen / Mesa</option>
                    <option value="recordatorio">Recordatorio</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="aviso-mensaje"
                  className="block text-[11px] font-semibold text-slate-700"
                >
                  Mensaje para todos los usuarios
                </label>
                <textarea
                  id="aviso-mensaje"
                  rows={3}
                  required
                  maxLength={2000}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribí el detalle, fecha, aula o recordatorio..."
                  className="mt-1 w-full rounded-lg border border-rose-200 p-3 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-rose-900 px-4 text-xs font-bold text-white hover:bg-rose-950 disabled:opacity-50"
                >
                  <BellRing size={14} />
                  <span>
                    {busy
                      ? 'Guardando...'
                      : editingId
                        ? 'Guardar modificación y notificar'
                        : 'Publicar y notificar'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* List of Avisos */}
          {visibleAvisos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-8 text-center">
              <Megaphone size={24} className="mx-auto text-rose-900/50" />
              <p className="mt-2 text-sm font-bold text-slate-800">
                No hay avisos publicados en este momento
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cuando haya novedades o recordatorios académicos aparecerán acá y recibirás una alerta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAvisos.map((av) => {
                const meta = CATEGORIA_META[av.categoria];
                const isUnread = av.activo && (seenAvisos[av.id] || 0) < av.revision;
                return (
                  <article
                    key={av.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      av.activo ? meta.toneClass : 'border-slate-200 bg-slate-100/80 opacity-75'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className={`text-[11px] font-bold uppercase tracking-wide ${meta.textClass}`}>
                          {meta.label}
                          {av.revision > 1 ? ` · Actualizado (v${av.revision})` : ''}
                          {!av.activo ? ' · Pausado' : ''}
                          {isUnread ? ' · Nuevo' : ''}
                        </p>
                        <h3 className="mt-0.5 text-sm font-extrabold text-slate-900">
                          {av.titulo}
                        </h3>
                      </div>

                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {formatAvisoDate(av.updatedAtMs)}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-800">
                      {av.mensaje}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-2.5">
                      <div>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => onAcknowledgeOne(av)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-950"
                          >
                            <Check size={12} />
                            <span>Marcar como visto</span>
                          </button>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(av)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
                          >
                            <Edit3 size={12} />
                            <span>Modificar</span>
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleToggleActivo(av)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {av.activo ? <EyeOff size={12} /> : <Eye size={12} />}
                            <span>{av.activo ? 'Pausar' : 'Reactivar'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete(av.id)}
                            aria-label={`Eliminar aviso ${av.titulo}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
                          >
                            <Trash2 size={12} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!user && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs text-slate-600">
              <span>¿Sos la administradora? Iniciá sesión con Google para publicar o editar avisos.</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSignIn();
                }}
                className="font-bold text-rose-900 hover:underline"
              >
                Iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
