import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  FileUp,
  Image as ImageIcon,
  Link2,
  Plus,
  UploadCloud,
  X,
} from 'lucide-react';
import type {
  BiblioMateriaNode,
  BiblioRecurso,
  RecursoTipo,
} from '../types/dental';
import { formatFileSize, saveBiblioFileBlob } from '../utils/biblioBlobStore';
import { getSafeExternalUrl } from '../utils/urlSanitizer';

interface BiblioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: BiblioMateriaNode[];
  defaultMateriaId?: string;
  defaultUnidadId?: string;
  defaultTemaId?: string;
  defaultTipo?: RecursoTipo;
  onCreateResource: (resource: BiblioRecurso) => void;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB via IndexedDB

export const BiblioUploadModal: React.FC<BiblioUploadModalProps> = ({
  isOpen,
  onClose,
  tree,
  defaultMateriaId,
  defaultUnidadId,
  defaultTemaId,
  defaultTipo = 'pdf',
  onCreateResource,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'archivo' | 'texto' | 'enlace'>('archivo');

  const [materiaId, setMateriaId] = useState(
    () => defaultMateriaId || tree[0]?.id || ''
  );
  const [unidadId, setUnidadId] = useState('');
  const [temaId, setTemaId] = useState('');
  const [tipo, setTipo] = useState<RecursoTipo>(defaultTipo);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contenido, setContenido] = useState('');
  const [enlaceUrl, setEnlaceUrl] = useState('');
  const [etiquetasRaw, setEtiquetasRaw] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedMateria = useMemo(
    () => tree.find((m) => m.id === materiaId) || tree[0] || null,
    [tree, materiaId]
  );

  const selectedUnidad = useMemo(
    () =>
      selectedMateria?.unidades.find((u) => u.id === unidadId) ||
      selectedMateria?.unidades[0] ||
      null,
    [selectedMateria, unidadId]
  );

  useEffect(() => {
    if (!isOpen) return;
    const initMat =
      tree.find((m) => m.id === defaultMateriaId) || tree[0] || null;
    const initUnit =
      initMat?.unidades.find((u) => u.id === defaultUnidadId) ||
      initMat?.unidades[0] ||
      null;
    const initTema =
      initUnit?.temas.find((t) => t.id === defaultTemaId) ||
      initUnit?.temas[0] ||
      null;

    setMateriaId(initMat?.id || '');
    setUnidadId(initUnit?.id || '');
    setTemaId(initTema?.id || '');
    setTipo(defaultTipo);
    setMode(
      defaultTipo === 'apunte' ||
        defaultTipo === 'resumen' ||
        defaultTipo === 'ficha'
        ? 'texto'
        : 'archivo'
    );
    setTitulo('');
    setDescripcion('');
    setContenido('');
    setEnlaceUrl('');
    setEtiquetasRaw('');
    setSelectedFile(null);
    setErrorMsg('');
  }, [
    isOpen,
    tree,
    defaultMateriaId,
    defaultUnidadId,
    defaultTemaId,
    defaultTipo,
  ]);

  if (!isOpen) return null;

  const handleFilePick = (file: File | undefined) => {
    if (!file) return;
    setErrorMsg('');
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMsg(
        `El archivo supera 25 MB (${formatFileSize(file.size)}). Podés vincularlo mediante enlace de Drive.`
      );
      return;
    }
    setSelectedFile(file);
    if (!titulo.trim()) {
      setTitulo(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim());
    }
    if (file.type.startsWith('image/')) {
      setTipo('imagen');
    } else if (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    ) {
      setTipo('pdf');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedMateria || !selectedUnidad) {
      setErrorMsg('Seleccioná una materia y una unidad.');
      return;
    }
    const targetTema =
      selectedUnidad.temas.find((t) => t.id === temaId) ||
      selectedUnidad.temas[0];
    if (!targetTema) {
      setErrorMsg('Esta unidad no tiene temas todavía.');
      return;
    }

    if (mode === 'archivo' && !selectedFile) {
      setErrorMsg('Seleccioná un archivo PDF, imagen o documento para subir.');
      return;
    }
    const safeEnlaceUrl = mode === 'enlace' ? getSafeExternalUrl(enlaceUrl) : undefined;
    if (mode === 'enlace' && !safeEnlaceUrl) {
      setErrorMsg('Pegá un enlace válido que comience con https:// o http://.');
      return;
    }

    setSaving(true);
    try {
      const cleanTags = etiquetasRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

      if (mode === 'archivo' && selectedFile) {
        let localText = contenido.trim();
        if (
          !localText &&
          (selectedFile.type.startsWith('text/') ||
            /\.(txt|md)$/i.test(selectedFile.name))
        ) {
          localText = await selectedFile.text().catch(() => '');
        }

        const saveLocallyOffline = async (): Promise<BiblioRecurso> => {
          const localId = `br-loc-${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 6)}`;
          await saveBiblioFileBlob(localId, selectedFile);
          const today = new Date().toISOString().slice(0, 10);
          return {
            id: localId,
            materiaId: selectedMateria.id,
            unidadId: selectedUnidad.id,
            temaId: targetTema.id,
            tipo,
            titulo: (titulo.trim() || selectedFile.name).slice(0, 220),
            descripcion: descripcion.trim() || undefined,
            contenido: localText || undefined,
            etiquetas: cleanTags,
            favorito: false,
            orden: Date.now(),
            archivoNombre: selectedFile.name,
            archivoMime: selectedFile.type || 'application/octet-stream',
            archivoSize: selectedFile.size,
            hasLocalBlob: true,
            storageBackend: 'local',
            createdAt: today,
            updatedAt: today,
          };
        };

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const offlineResource = await saveLocallyOffline();
          onCreateResource(offlineResource);
          onClose();
          return;
        }

        const form = new FormData();
        form.append('file', selectedFile, selectedFile.name);
        form.append('originalName', selectedFile.name);
        form.append('titulo', titulo.trim() || selectedFile.name);
        form.append('tipo', tipo);
        form.append('materiaId', selectedMateria.id);
        form.append('materiaNombre', selectedMateria.nombre);
        form.append('anio', String(selectedMateria.anio));
        form.append('unidadId', selectedUnidad.id);
        form.append('unidadTitulo', selectedUnidad.titulo);
        form.append('temaId', targetTema.id);
        form.append('temaTitulo', targetTema.titulo);
        if (descripcion.trim()) form.append('descripcion', descripcion.trim());
        if (cleanTags.length > 0) form.append('etiquetas', JSON.stringify(cleanTags));

        try {
          const res = await fetch('/api/library/upload', {
            method: 'POST',
            body: form,
          });

          const payload = (await res.json().catch(() => ({}))) as {
            resource?: BiblioRecurso;
            duplicate?: boolean;
            error?: string;
          };

          if (res.status === 409 && payload.duplicate) {
            setErrorMsg(
              payload.error ||
                'Este archivo ya existe en tu biblioteca (duplicado detectado).'
            );
            setSaving(false);
            return;
          }

          if (res.ok && payload.resource) {
            let cachedLocal = false;
            try {
              await saveBiblioFileBlob(payload.resource.id, selectedFile);
              cachedLocal = true;
            } catch {
              cachedLocal = false;
            }
            onCreateResource({
              ...payload.resource,
              contenido: localText || payload.resource.contenido,
              hasLocalBlob: cachedLocal,
            });
            onClose();
            return;
          }

          if (res.status < 500) {
            throw new Error(
              payload.error || 'No se pudo guardar el archivo en el servidor.'
            );
          }
        } catch (uploadErr) {
          // Si es error de validación HTTP 4xx, informarlo; si es error de red o 5xx, guardar offline en IndexedDB
          if (
            uploadErr instanceof Error &&
            !(uploadErr instanceof TypeError) &&
            !uploadErr.message.includes('Failed to fetch') &&
            !uploadErr.message.includes('NetworkError')
          ) {
            throw uploadErr;
          }
        }

        const offlineFallback = await saveLocallyOffline();
        onCreateResource(offlineFallback);
        onClose();
        return;
      }

      const id = `br-${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const today = new Date().toISOString().slice(0, 10);

      const created: BiblioRecurso = {
        id,
        materiaId: selectedMateria.id,
        unidadId: selectedUnidad.id,
        temaId: targetTema.id,
        tipo,
        titulo:
          titulo.trim() ||
          `Material de ${selectedMateria.nombre}`,
        descripcion: descripcion.trim() || undefined,
        contenido: contenido.trim() || undefined,
        etiquetas: cleanTags,
        favorito: false,
        orden: Date.now(),
        enlaceUrl: safeEnlaceUrl,
        createdAt: today,
        updatedAt: today,
      };

      onCreateResource(created);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el material en tu biblioteca.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#261F1D]/45 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Agregar material a la Biblioteca"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E6DDD6] bg-[#F8F5F1] shadow-[0_24px_60px_-15px_rgba(101,48,68,0.28)]">
        <div className="flex items-center justify-between border-b border-[#E6DDD6] bg-white px-5 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#653044]">
              Incorporar material a la biblioteca
            </h2>
            <p className="text-xs text-[#736B66]">
              Subí PDFs, láminas, documentos o redactá apuntes y fichas por tema.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#653044] text-white hover:bg-[#522436]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Selector de modalidad */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-white p-1 border border-[#E6DDD6]">
            <button
              type="button"
              onClick={() => setMode('archivo')}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'archivo'
                  ? 'bg-[#653044] text-white'
                  : 'text-[#5E5753] hover:text-[#653044]'
              }`}
            >
              <FileUp size={14} />
              <span>Subir archivo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('texto');
                if (tipo === 'pdf' || tipo === 'imagen') setTipo('apunte');
              }}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'texto'
                  ? 'bg-[#653044] text-white'
                  : 'text-[#5E5753] hover:text-[#653044]'
              }`}
            >
              <FileText size={14} />
              <span>Escribir nota</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('enlace')}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'enlace'
                  ? 'bg-[#653044] text-white'
                  : 'text-[#5E5753] hover:text-[#653044]'
              }`}
            >
              <Link2 size={14} />
              <span>Enlace / Drive</span>
            </button>
          </div>

          {/* Ubicación jerárquica */}
          <div className="grid gap-3 rounded-xl border border-[#E6DDD6] bg-white p-4 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#653044]">
                Materia
              </label>
              <select
                value={selectedMateria?.id || ''}
                onChange={(e) => {
                  const nextMat = tree.find((m) => m.id === e.target.value);
                  setMateriaId(e.target.value);
                  const nextUnit = nextMat?.unidades[0];
                  setUnidadId(nextUnit?.id || '');
                  setTemaId(nextUnit?.temas[0]?.id || '');
                }}
                className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
              >
                {tree.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.anio}° · {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#653044]">
                Unidad
              </label>
              <select
                value={selectedUnidad?.id || ''}
                onChange={(e) => {
                  const nextUnit = selectedMateria?.unidades.find(
                    (u) => u.id === e.target.value
                  );
                  setUnidadId(e.target.value);
                  setTemaId(nextUnit?.temas[0]?.id || '');
                }}
                className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
              >
                {(selectedMateria?.unidades || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#653044]">
                Tema
              </label>
              <select
                value={temaId}
                onChange={(e) => setTemaId(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
              >
                {(selectedUnidad?.temas || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-[#653044]">
                Tipo de recurso
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as RecursoTipo)}
                className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-2.5 text-xs font-medium text-[#261F1D]"
              >
                <option value="pdf">PDF / Documento</option>
                <option value="apunte">Apunte</option>
                <option value="resumen">Resumen</option>
                <option value="ficha">Ficha</option>
                <option value="imagen">Imagen / Esquema</option>
              </select>
            </div>
            <div className="sm:col-span-8">
              <label className="block text-[11px] font-semibold text-[#653044]">
                Título del material
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Clasificación de Black y aislamiento absoluto"
                className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs text-[#261F1D] outline-none focus:border-[#653044]"
              />
            </div>
          </div>

          {mode === 'archivo' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilePick(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-[#653044] bg-[#E9D9DC]/40'
                  : 'border-[#D8CDC4] bg-white hover:border-[#B8798E]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*"
                onChange={(e) => handleFilePick(e.target.files?.[0])}
                className="hidden"
              />
              {selectedFile ? (
                <>
                  {selectedFile.type.startsWith('image/') ? (
                    <ImageIcon size={26} className="text-[#653044]" />
                  ) : (
                    <FileText size={26} className="text-[#653044]" />
                  )}
                  <p className="mt-2 text-xs font-bold text-[#653044]">
                    {selectedFile.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#736B66] tabular-nums">
                    {formatFileSize(selectedFile.size)} · Listo para guardar offline y ver sin descargar
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud size={26} className="text-[#B8798E]" />
                  <p className="mt-2 text-xs font-semibold text-[#261F1D]">
                    Arrastrá tu archivo acá o hacé clic para seleccionarlo
                  </p>
                  <p className="mt-1 text-[11px] text-[#736B66]">
                    PDFs, imágenes clínicas, esquemas, TXT/MD o documentos (hasta 25 MB offline)
                  </p>
                </>
              )}
            </div>
          )}

          {mode === 'enlace' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#653044]">
                URL del documento (Google Drive, Campus Virtual o PDF directo)
              </label>
              <input
                type="url"
                value={enlaceUrl}
                onChange={(e) => setEnlaceUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="mt-1 h-10 w-full rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs text-[#261F1D] outline-none focus:border-[#653044]"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#653044]">
                Descripción breve (opcional)
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Clase teórica · Prof. Pérez"
                className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs text-[#261F1D]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#653044]">
                Etiquetas (separadas por coma)
              </label>
              <input
                type="text"
                value={etiquetasRaw}
                onChange={(e) => setEtiquetasRaw(e.target.value)}
                placeholder="1er parcial, Práctico"
                className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs text-[#261F1D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#653044]">
              {mode === 'texto'
                ? 'Contenido del apunte, resumen o ficha'
                : 'Notas adicionales (opcional)'}
            </label>
            <textarea
              rows={mode === 'texto' ? 8 : 3}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder={
                mode === 'texto'
                  ? 'Escribí acá los conceptos clave, protocolos o síntesis de estudio...'
                  : 'Páginas a estudiar, aclaraciones de la cátedra...'
              }
              className="mt-1 w-full resize-y rounded-lg border border-[#E6DDD6] bg-white p-3 text-xs leading-relaxed text-[#261F1D] outline-none focus:border-[#653044]"
            />
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-[#B8798E] bg-[#E9D9DC]/50 px-3 py-2 text-xs font-medium text-[#653044]">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[#E6DDD6] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-[#E6DDD6] bg-white px-4 text-xs font-semibold text-[#5E5753]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#653044] px-5 text-xs font-semibold text-white hover:bg-[#522436] disabled:opacity-50"
            >
              <Plus size={14} />
              <span>{saving ? 'Guardando...' : 'Guardar en biblioteca'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
