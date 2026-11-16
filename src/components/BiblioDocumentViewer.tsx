import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderTree,
  Pencil,
  Save,
  Share2,
  Star,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  auth,
  publishSharedResource,
  signInWithGoogleForSharing,
} from '../lib/firebase';
import type {
  BiblioMateriaNode,
  BiblioRecurso,
  RecursoTipo,
} from '../types/dental';
import { formatFileSize, getBiblioFileBlob } from '../utils/biblioBlobStore';

interface BiblioDocumentViewerProps {
  resource: BiblioRecurso | null;
  tree: BiblioMateriaNode[];
  onClose: () => void;
  onUpdateResource: (next: BiblioRecurso) => void;
  onDeleteResource: (id: string) => void;
}

const TIPO_LABEL: Record<RecursoTipo, string> = {
  pdf: 'Documento PDF',
  apunte: 'Apunte de clase',
  resumen: 'Resumen',
  ficha: 'Ficha clínica',
  imagen: 'Imagen / Esquema',
};

function renderFormattedLines(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2.5 text-[15px] leading-[1.75] text-[#2F2629]">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (/^#\s+/.test(trimmed)) {
          return (
            <h2
              key={i}
              className="border-b border-[#E9D9DC] pb-1.5 pt-2 font-serif text-xl font-semibold text-[#653044]"
            >
              {trimmed.replace(/^#\s+/, '')}
            </h2>
          );
        }
        if (/^#{2,3}\s+/.test(trimmed)) {
          return (
            <h3
              key={i}
              className="pt-2 font-serif text-lg font-semibold text-[#653044]"
            >
              {trimmed.replace(/^#{2,3}\s+/, '')}
            </h3>
          );
        }
        if (/^[-*•]\s+/.test(trimmed)) {
          const item = trimmed.replace(/^[-*•]\s+/, '');
          const parts = item.split(/(\*\*[^*]+\*\*)/g);
          return (
            <div key={i} className="flex items-start gap-2.5 pl-1">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8798E]" />
              <span>
                {parts.map((p, k) =>
                  p.startsWith('**') && p.endsWith('**') ? (
                    <strong key={k} className="font-semibold text-[#261F1D]">
                      {p.slice(2, -2)}
                    </strong>
                  ) : (
                    <React.Fragment key={k}>{p}</React.Fragment>
                  )
                )}
              </span>
            </div>
          );
        }
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((p, k) =>
              p.startsWith('**') && p.endsWith('**') ? (
                <strong key={k} className="font-semibold text-[#261F1D]">
                  {p.slice(2, -2)}
                </strong>
              ) : (
                <React.Fragment key={k}>{p}</React.Fragment>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export const BiblioDocumentViewer: React.FC<BiblioDocumentViewerProps> = ({
  resource,
  tree,
  onClose,
  onUpdateResource,
  onDeleteResource,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [textPreview, setTextPreview] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTagsRaw, setDraftTagsRaw] = useState('');

  const [showOrganize, setShowOrganize] = useState(false);
  const [moveMateriaId, setMoveMateriaId] = useState('');
  const [moveUnidadId, setMoveUnidadId] = useState('');
  const [moveTemaId, setMoveTemaId] = useState('');
  const [moveTipo, setMoveTipo] = useState<RecursoTipo>('apunte');

  const [imageZoom, setImageZoom] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!resource) return;
    setIsEditing(false);
    setShowOrganize(false);
    setImageZoom(1);
    setStatusMessage('');
    setDraftTitle(resource.titulo);
    setDraftDesc(resource.descripcion || '');
    setDraftContent(resource.contenido || '');
    setDraftTagsRaw(resource.etiquetas.join(', '));
    setMoveMateriaId(resource.materiaId);
    setMoveUnidadId(resource.unidadId);
    setMoveTemaId(resource.temaId);
    setMoveTipo(resource.tipo);
  }, [resource]);

  useEffect(() => {
    if (!resource) return;
    let revoked = false;
    let activeObjectUrl = '';
    setBlobUrl('');
    setTextPreview('');

    const load = async () => {
      if (resource.hasLocalBlob) {
        setLoadingFile(true);
        const blob = await getBiblioFileBlob(resource.id);
        if (!revoked && blob) {
          if (
            blob.type.startsWith('text/') ||
            /\.(txt|md)$/i.test(resource.archivoNombre || '')
          ) {
            const text = await blob.text();
            if (!revoked) setTextPreview(text);
          } else {
            activeObjectUrl = URL.createObjectURL(blob);
            setBlobUrl(activeObjectUrl);
          }
          if (!revoked) setLoadingFile(false);
          return;
        }
        if (!revoked) setLoadingFile(false);
      }

      if (resource.serverFileUrl) {
        if (
          resource.archivoMime?.startsWith('text/') ||
          /\.(txt|md)$/i.test(resource.archivoNombre || '')
        ) {
          setLoadingFile(true);
          try {
            const resp = await fetch(resource.serverFileUrl);
            if (resp.ok && !revoked) {
              setTextPreview(await resp.text());
            }
          } catch {
            // Fallback silently
          } finally {
            if (!revoked) setLoadingFile(false);
          }
        } else if (!revoked) {
          setBlobUrl(resource.serverFileUrl);
        }
      } else if (resource.archivoDataUrl) {
        setBlobUrl(resource.archivoDataUrl);
      }
    };

    void load();

    return () => {
      revoked = true;
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [resource]);

  const locationContext = useMemo(() => {
    if (!resource) return { materia: null, unidad: null, tema: null };
    const materia = tree.find((m) => m.id === resource.materiaId) || null;
    const unidad =
      materia?.unidades.find((u) => u.id === resource.unidadId) || null;
    const tema = unidad?.temas.find((t) => t.id === resource.temaId) || null;
    return { materia, unidad, tema };
  }, [resource, tree]);

  const moveTargetMateria = useMemo(
    () => tree.find((m) => m.id === moveMateriaId) || tree[0] || null,
    [tree, moveMateriaId]
  );
  const moveTargetUnidad = useMemo(
    () =>
      moveTargetMateria?.unidades.find((u) => u.id === moveUnidadId) ||
      moveTargetMateria?.unidades[0] ||
      null,
    [moveTargetMateria, moveUnidadId]
  );

  if (!resource) return null;

  const isPdfMime =
    resource.archivoMime === 'application/pdf' ||
    resource.archivoNombre?.toLowerCase().endsWith('.pdf') ||
    resource.tipo === 'pdf';

  const isImageMime =
    resource.archivoMime?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(resource.archivoNombre || '') ||
    resource.tipo === 'imagen';

  const drivePreviewUrl = (() => {
    if (!resource.enlaceUrl) return '';
    const fileMatch = resource.enlaceUrl.match(
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
    );
    if (fileMatch) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }
    if (/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/.test(resource.enlaceUrl)) {
      const m = resource.enlaceUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    }
    return '';
  })();

  const handleSaveEdits = () => {
    const cleanTags = draftTagsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    onUpdateResource({
      ...resource,
      titulo: draftTitle.trim() || resource.titulo,
      descripcion: draftDesc.trim() || undefined,
      contenido: draftContent,
      etiquetas: cleanTags,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setIsEditing(false);
    setStatusMessage('Cambios guardados en tu biblioteca.');
  };

  const handleApplyOrganize = () => {
    if (!moveTargetMateria || !moveTargetUnidad) return;
    const validTema =
      moveTargetUnidad.temas.find((t) => t.id === moveTemaId) ||
      moveTargetUnidad.temas[0];
    if (!validTema) return;

    onUpdateResource({
      ...resource,
      materiaId: moveTargetMateria.id,
      unidadId: moveTargetUnidad.id,
      temaId: validTema.id,
      tipo: moveTipo,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setShowOrganize(false);
    setStatusMessage(
      `Reubicado en ${moveTargetMateria.nombre} · ${moveTargetUnidad.titulo}.`
    );
  };

  const handleDownload = async () => {
    if (resource.serverFileUrl) {
      const a = document.createElement('a');
      a.href = `${resource.serverFileUrl}?download=1`;
      a.download = resource.archivoNombre || `${resource.titulo}.pdf`;
      a.click();
      return;
    }
    if (resource.hasLocalBlob) {
      const blob = await getBiblioFileBlob(resource.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resource.archivoNombre || `${resource.titulo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = resource.archivoNombre || `${resource.titulo}.pdf`;
      a.click();
      return;
    }
    if (resource.enlaceUrl) {
      const driveIdMatch = resource.enlaceUrl.match(
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
      );
      const target = driveIdMatch
        ? `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`
        : resource.enlaceUrl;
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    const contentText = `${resource.titulo}\n${
      locationContext.materia ? `${locationContext.materia.nombre}\n` : ''
    }\n${resource.contenido || ''}`;
    const textBlob = new Blob([contentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(textBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resource.titulo.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyShare = async () => {
    const shareText = [
      resource.titulo,
      locationContext.materia?.nombre,
      resource.enlaceUrl || resource.contenido || resource.descripcion,
    ]
      .filter(Boolean)
      .join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: resource.titulo,
          text: shareText.slice(0, 600),
          url: resource.enlaceUrl || undefined,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  const handlePublishToCommunity = async () => {
    setStatusMessage('');
    try {
      if (!auth.currentUser) {
        await signInWithGoogleForSharing();
      }
      const user = auth.currentUser;
      const alias =
        localStorage.getItem('dental_archive_share_alias_v1') ||
        user?.displayName?.split(' ')[0] ||
        'Estudiante FOLP';

      await publishSharedResource({
        authorAlias: alias,
        tipoRecurso: 'documento',
        categoria:
          resource.tipo === 'pdf'
            ? 'pdfs'
            : resource.tipo === 'resumen'
              ? 'resumenes'
              : resource.tipo === 'ficha'
                ? 'cuadros'
                : 'apuntes',
        anio: locationContext.materia?.anio || 1,
        materia: locationContext.materia?.nombre || 'Odontología General',
        titulo: resource.titulo,
        contenido:
          resource.contenido ||
          resource.descripcion ||
          `Recurso compartido: ${resource.titulo}`,
        etiquetas: resource.etiquetas,
        enlaceUrl: resource.enlaceUrl || '',
      });
      setStatusMessage('Publicado en Bibliografía y Referencias Compartidas.');
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'No se pudo compartir en línea.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#261F1D]/45 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={resource.titulo}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E6DDD6] bg-[#F8F5F1] shadow-[0_24px_60px_-15px_rgba(101,48,68,0.28)]">
        {/* Top Bar del Visor */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E6DDD6] bg-white px-5 py-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#736B66]">
              <span className="font-semibold text-[#653044]">
                {TIPO_LABEL[resource.tipo]}
              </span>
              {locationContext.materia && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{locationContext.materia.nombre}</span>
                </>
              )}
              {locationContext.unidad && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{locationContext.unidad.titulo}</span>
                </>
              )}
              {locationContext.tema && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{locationContext.tema.titulo}</span>
                </>
              )}
            </div>

            <h2 className="font-serif text-xl font-semibold leading-snug text-[#653044] sm:text-2xl">
              {resource.titulo}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateResource({ ...resource, favorito: !resource.favorito })
              }
              title={resource.favorito ? 'Quitar de favoritos' : 'Marcar favorito'}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                resource.favorito
                  ? 'border-[#B8798E] bg-[#E9D9DC]/70 text-[#653044]'
                  : 'border-[#E6DDD6] bg-white text-[#5E5753] hover:bg-[#F8F5F1]'
              }`}
            >
              <Star
                size={14}
                fill={resource.favorito ? 'currentColor' : 'none'}
              />
              <span className="hidden sm:inline">
                {resource.favorito ? 'Favorito' : 'Guardar'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleDownload()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs font-semibold text-[#653044] hover:bg-[#F8F5F1] whitespace-nowrap"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopyShare()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs font-semibold text-[#653044] hover:bg-[#F8F5F1] whitespace-nowrap"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="hidden sm:inline">
                {copied ? 'Copiado' : 'Copiar'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handlePublishToCommunity()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#A1B3A0]/60 bg-[#A1B3A0]/15 px-3 text-xs font-semibold text-[#2E3B2D] hover:bg-[#A1B3A0]/25 whitespace-nowrap"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Compartir</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOrganize((v) => !v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap ${
                showOrganize
                  ? 'border-[#653044] bg-[#653044] text-white'
                  : 'border-[#E6DDD6] bg-white text-[#653044] hover:bg-[#F8F5F1]'
              }`}
            >
              <FolderTree size={14} />
              <span className="hidden sm:inline">Organizar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap ${
                isEditing
                  ? 'border-[#653044] bg-[#653044] text-white'
                  : 'border-[#E6DDD6] bg-white text-[#653044] hover:bg-[#F8F5F1]'
              }`}
            >
              <Pencil size={14} />
              <span className="hidden sm:inline">Editar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDeleteResource(resource.id);
                onClose();
              }}
              aria-label="Eliminar recurso"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E6DDD6] bg-white text-[#736B66] hover:bg-[#E9D9DC]/50 hover:text-[#653044]"
            >
              <Trash2 size={14} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar visor"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#653044] text-white hover:bg-[#522436]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Barra de Organizar / Reubicar */}
        {showOrganize && (
          <div className="border-b border-[#E6DDD6] bg-[#E9D9DC]/35 px-5 py-3.5">
            <div className="grid gap-2.5 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Materia
                </label>
                <select
                  value={moveMateriaId}
                  onChange={(e) => {
                    const nextM = tree.find((m) => m.id === e.target.value);
                    setMoveMateriaId(e.target.value);
                    const nextU = nextM?.unidades[0];
                    setMoveUnidadId(nextU?.id || '');
                    setMoveTemaId(nextU?.temas[0]?.id || '');
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-2.5 text-xs text-[#261F1D]"
                >
                  {tree.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.anio}° · {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Unidad
                </label>
                <select
                  value={moveTargetUnidad?.id || ''}
                  onChange={(e) => {
                    const nextU = moveTargetMateria?.unidades.find(
                      (u) => u.id === e.target.value
                    );
                    setMoveUnidadId(e.target.value);
                    setMoveTemaId(nextU?.temas[0]?.id || '');
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-2.5 text-xs text-[#261F1D]"
                >
                  {(moveTargetMateria?.unidades || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Tema
                </label>
                <select
                  value={moveTemaId}
                  onChange={(e) => setMoveTemaId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-2.5 text-xs text-[#261F1D]"
                >
                  {(moveTargetUnidad?.temas || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Tipo
                </label>
                <select
                  value={moveTipo}
                  onChange={(e) => setMoveTipo(e.target.value as RecursoTipo)}
                  className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-2.5 text-xs text-[#261F1D]"
                >
                  <option value="pdf">PDF</option>
                  <option value="apunte">Apunte</option>
                  <option value="resumen">Resumen</option>
                  <option value="ficha">Ficha</option>
                  <option value="imagen">Imagen</option>
                </select>
              </div>

              <div className="flex items-end sm:col-span-1">
                <button
                  type="button"
                  onClick={handleApplyOrganize}
                  className="h-9 w-full rounded-lg bg-[#653044] px-3 text-xs font-semibold text-white hover:bg-[#522436]"
                >
                  Mover
                </button>
              </div>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="flex items-center gap-2 border-b border-[#A1B3A0]/40 bg-[#A1B3A0]/15 px-5 py-2.5 text-xs font-medium text-[#2E3B2D]">
            <CheckCircle2 size={14} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Área principal de lectura / visualización */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {isEditing ? (
            <div className="mx-auto max-w-3xl space-y-4 rounded-xl border border-[#E6DDD6] bg-white p-5">
              <div>
                <label className="block text-xs font-semibold text-[#653044]">
                  Título del material
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#E6DDD6] px-3 text-sm font-medium text-[#261F1D] outline-none focus:border-[#653044]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#653044]">
                    Descripción breve
                  </label>
                  <input
                    type="text"
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    placeholder="Cátedra, parcial o síntesis..."
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs text-[#261F1D] outline-none focus:border-[#653044]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#653044]">
                    Etiquetas (separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={draftTagsRaw}
                    onChange={(e) => setDraftTagsRaw(e.target.value)}
                    placeholder="1er parcial, Práctico, Esquema"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs text-[#261F1D] outline-none focus:border-[#653044]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#653044]">
                  Contenido / Notas de estudio
                </label>
                <textarea
                  rows={12}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Escribí acá tu apunte, resumen, definiciones o guía clínica..."
                  className="mt-1 w-full resize-y rounded-lg border border-[#E6DDD6] p-3.5 text-sm leading-relaxed text-[#261F1D] outline-none focus:border-[#653044]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-9 rounded-lg border border-[#E6DDD6] bg-white px-4 text-xs font-semibold text-[#5E5753]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#653044] px-4 text-xs font-semibold text-white hover:bg-[#522436]"
                >
                  <Save size={14} />
                  <span>Guardar cambios</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-5">
              {/* Metadata silenciosa sin pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#736B66]">
                <div>
                  <span>Actualizado: {resource.updatedAt}</span>
                  {resource.archivoNombre && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{resource.archivoNombre}</span>
                    </>
                  )}
                  {resource.archivoSize ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="tabular-nums">
                        {formatFileSize(resource.archivoSize)}
                      </span>
                    </>
                  ) : null}
                  {resource.etiquetas.length > 0 && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-medium text-[#653044]">
                        {resource.etiquetas.join(' · ')}
                      </span>
                    </>
                  )}
                </div>

                {resource.enlaceUrl && (
                  <a
                    href={resource.enlaceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#653044] hover:underline"
                  >
                    <span>Abrir enlace original</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {resource.descripcion && (
                <p className="font-serif text-base italic text-[#5E5753]">
                  {resource.descripcion}
                </p>
              )}

              {/* VISOR DE ARCHIVOS INTEGRADO */}
              {loadingFile ? (
                <div className="flex h-72 items-center justify-center rounded-xl border border-[#E6DDD6] bg-white text-xs font-medium text-[#736B66]">
                  Preparando visualización dentro de Dental Archive...
                </div>
              ) : isImageMime && blobUrl ? (
                <div className="space-y-2.5 rounded-xl border border-[#E6DDD6] bg-white p-4">
                  <div className="flex items-center justify-between border-b border-[#F0EAE4] pb-2">
                    <span className="text-xs font-semibold text-[#653044]">
                      Visor de lámina / imagen
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setImageZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))
                        }
                        aria-label="Alejar imagen"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#F8F5F1]"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="w-12 text-center font-mono text-xs text-[#5E5753] tabular-nums">
                        {Math.round(imageZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setImageZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))
                        }
                        aria-label="Acercar imagen"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#F8F5F1]"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[540px] overflow-auto rounded-lg bg-[#F8F5F1] p-3 text-center">
                    <img
                      src={blobUrl}
                      alt={resource.titulo}
                      style={{ transform: `scale(${imageZoom})`, transformOrigin: 'top center' }}
                      className="mx-auto max-h-[480px] rounded object-contain transition-transform duration-150"
                    />
                  </div>
                </div>
              ) : blobUrl && isPdfMime ? (
                <div className="overflow-hidden rounded-xl border border-[#E6DDD6] bg-white">
                  <iframe
                    title={resource.titulo}
                    src={blobUrl}
                    className="h-[560px] w-full bg-white"
                  />
                </div>
              ) : drivePreviewUrl ? (
                <div className="overflow-hidden rounded-xl border border-[#E6DDD6] bg-white">
                  <iframe
                    title={resource.titulo}
                    src={drivePreviewUrl}
                    allow="autoplay"
                    className="h-[560px] w-full bg-white"
                  />
                </div>
              ) : blobUrl ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E6DDD6] bg-white p-10 text-center">
                  <FileText size={30} className="text-[#B8798E]" />
                  <p className="text-sm font-semibold text-[#261F1D]">
                    Documento adjunto listo ({resource.archivoNombre})
                  </p>
                  <p className="max-w-md text-xs text-[#736B66]">
                    Este formato de archivo no admite vista previa nativa en el navegador, pero podés descargarlo directamente sin pérdida de calidad.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#653044] px-4 text-xs font-semibold text-white hover:bg-[#522436]"
                  >
                    <Download size={14} />
                    <span>Descargar documento</span>
                  </button>
                </div>
              ) : null}

              {/* Texto del apunte / resumen / ficha o notas del documento */}
              {(textPreview || resource.contenido) && (
                <article className="rounded-xl border border-[#E6DDD6] bg-white px-6 py-6 sm:px-9 sm:py-8">
                  <div className="mx-auto max-w-2xl">
                    {renderFormattedLines(textPreview || resource.contenido || '')}
                  </div>
                </article>
              )}

              {!blobUrl && !drivePreviewUrl && !textPreview && !resource.contenido && (
                <div className="rounded-xl border border-dashed border-[#D8CDC4] bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-[#653044]">
                    Este recurso aún no tiene contenido escrito ni archivo adjunto.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#653044] px-4 text-xs font-semibold text-white hover:bg-[#522436]"
                  >
                    <Pencil size={13} />
                    <span>Agregar contenido</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
