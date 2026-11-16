import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Files,
  FolderOpen,
  FolderTree,
  Loader2,
  RotateCcw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type {
  BiblioMateriaNode,
  BiblioRecurso,
  RecursoTipo,
} from '../types/dental';
import { formatFileSize, saveBiblioFileBlob } from '../utils/biblioBlobStore';

interface BiblioBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: BiblioMateriaNode[];
  defaultMateriaId?: string;
  defaultUnidadId?: string;
  onCompletedBatch: (payload: {
    newResources: BiblioRecurso[];
    latestTree?: BiblioMateriaNode[];
  }) => void;
}

type QueueItemStatus =
  | 'ready'
  | 'duplicate'
  | 'uploading'
  | 'uploaded'
  | 'error'
  | 'skipped';

interface BulkQueueItem {
  localId: string;
  file: File;
  originalName: string;
  relativePath: string;
  size: number;
  sha256: string;
  titulo: string;
  tipo: RecursoTipo;
  materiaId: string;
  materiaNombre: string;
  unidadId: string;
  unidadTitulo: string;
  temaId: string;
  temaTitulo: string;
  selected: boolean;
  status: QueueItemStatus;
  progress: number;
  duplicateReason?: string;
  errorMessage?: string;
}

const IGNORED_ZIP_PATTERN =
  /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)/i;

function inferRecursoTipo(fileName: string, mimeType: string): RecursoTipo {
  const lower = fileName.toLowerCase();
  if (
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(lower)
  ) {
    return 'imagen';
  }
  if (lower.includes('resumen') || lower.includes('sintesis')) return 'resumen';
  if (lower.includes('ficha') || lower.includes('cuadro')) return 'ficha';
  if (/\.(txt|md|doc|docx)$/i.test(lower)) return 'apunte';
  return 'pdf';
}

function cleanBaseTitle(fileName: string): string {
  return (
    fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || fileName
  );
}

function normalizeStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function guessMimeFromName(name: string, fallback = 'application/octet-stream'): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.pptx'))
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  return fallback;
}

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below if subtle crypto unavailable
  }
  const bytes = new Uint8Array(buffer);
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193);
    if (i % 2 === 0) {
      h2 ^= bytes[i];
      h2 = Math.imul(h2, 0x01000193);
    }
  }
  return `fb-${bytes.length}-${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`;
}

export const BiblioBulkUploadModal: React.FC<BiblioBulkUploadModalProps> = ({
  isOpen,
  onClose,
  tree,
  defaultMateriaId,
  defaultUnidadId,
  onCompletedBatch,
}) => {
  const multiFilesInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [queue, setQueue] = useState<BulkQueueItem[]>([]);
  const [preservingFolders, setPreservingFolders] = useState(true);
  const [batchMateriaId, setBatchMateriaId] = useState<string>(
    () => defaultMateriaId || tree[0]?.id || ''
  );
  const [batchUnidadId, setBatchUnidadId] = useState<string>(
    () => defaultUnidadId || tree[0]?.unidades[0]?.id || ''
  );
  const [batchTemaId, setBatchTemaId] = useState<string>(
    () => tree[0]?.unidades[0]?.temas[0]?.id || ''
  );
  const [batchTipo, setBatchTipo] = useState<'auto' | RecursoTipo>('auto');

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [supportsDirectoryPicker] = useState(() => {
    if (typeof document === 'undefined') return false;
    const inp = document.createElement('input');
    return 'webkitdirectory' in inp;
  });

  useEffect(() => {
    if (!isOpen) return;
    const initMat =
      tree.find((m) => m.id === defaultMateriaId) || tree[0] || null;
    const initUnit =
      initMat?.unidades.find((u) => u.id === defaultUnidadId) ||
      initMat?.unidades[0] ||
      null;
    setBatchMateriaId(initMat?.id || '');
    setBatchUnidadId(initUnit?.id || '');
    setBatchTemaId(initUnit?.temas[0]?.id || '');
    setGlobalError('');
    setExtractStatus('');
  }, [isOpen, defaultMateriaId, defaultUnidadId, tree]);

  const batchMateria = useMemo(
    () => tree.find((m) => m.id === batchMateriaId) || tree[0] || null,
    [tree, batchMateriaId]
  );

  const batchUnidad = useMemo(
    () =>
      batchMateria?.unidades.find((u) => u.id === batchUnidadId) ||
      batchMateria?.unidades[0] ||
      null,
    [batchMateria, batchUnidadId]
  );

  if (!isOpen) return null;

  const resolveMappingFromPath = (
    relativePath: string,
    fallbackMatId: string,
    fallbackUnitId: string,
    fallbackTemaId: string
  ) => {
    const parts = relativePath.split('/').filter(Boolean);
    const folders = parts.length > 1 ? parts.slice(0, -1) : [];

    const fallbackMat =
      tree.find((m) => m.id === fallbackMatId) || tree[0] || null;
    const fallbackUnit =
      fallbackMat?.unidades.find((u) => u.id === fallbackUnitId) ||
      fallbackMat?.unidades[0] ||
      null;
    const fallbackTema =
      fallbackUnit?.temas.find((t) => t.id === fallbackTemaId) ||
      fallbackUnit?.temas[0] ||
      null;

    if (!preservingFolders || folders.length === 0) {
      return {
        materiaId: fallbackMat?.id || '',
        materiaNombre: fallbackMat?.nombre || 'Odontología General',
        unidadId: fallbackUnit?.id || '',
        unidadTitulo: fallbackUnit?.titulo || 'Unidad 1 · Materiales',
        temaId: fallbackTema?.id || '',
        temaTitulo: fallbackTema?.titulo || 'Documentos importados',
      };
    }

    // 1 nivel: carpeta -> puede ser Materia o Unidad
    if (folders.length === 1) {
      const f0 = folders[0];
      const matchedMat = tree.find(
        (m) =>
          normalizeStr(m.nombre) === normalizeStr(f0) ||
          normalizeStr(m.nombre).includes(normalizeStr(f0))
      );
      if (matchedMat) {
        const u0 = matchedMat.unidades[0];
        return {
          materiaId: matchedMat.id,
          materiaNombre: matchedMat.nombre,
          unidadId: u0?.id || '',
          unidadTitulo: u0?.titulo || 'Unidad 1 · Materiales',
          temaId: u0?.temas[0]?.id || '',
          temaTitulo: u0?.temas[0]?.titulo || 'Materiales de cátedra',
        };
      }
      const matchedUnit = fallbackMat?.unidades.find((u) =>
        normalizeStr(u.titulo).includes(normalizeStr(f0))
      );
      return {
        materiaId: fallbackMat?.id || '',
        materiaNombre: fallbackMat?.nombre || 'Odontología General',
        unidadId: matchedUnit?.id || '',
        unidadTitulo: matchedUnit?.titulo || f0,
        temaId: matchedUnit?.temas[0]?.id || '',
        temaTitulo: matchedUnit?.temas[0]?.titulo || 'Documentos de unidad',
      };
    }

    // 2 niveles: carpeta/subcarpeta
    if (folders.length === 2) {
      const [f0, f1] = folders;
      const matchedMat = tree.find(
        (m) =>
          normalizeStr(m.nombre) === normalizeStr(f0) ||
          normalizeStr(m.nombre).includes(normalizeStr(f0))
      );
      if (matchedMat) {
        const matchedUnit = matchedMat.unidades.find((u) =>
          normalizeStr(u.titulo).includes(normalizeStr(f1))
        );
        return {
          materiaId: matchedMat.id,
          materiaNombre: matchedMat.nombre,
          unidadId: matchedUnit?.id || '',
          unidadTitulo: matchedUnit?.titulo || f1,
          temaId: matchedUnit?.temas[0]?.id || '',
          temaTitulo: matchedUnit?.temas[0]?.titulo || 'Documentos de unidad',
        };
      }
      const matchedUnit = fallbackMat?.unidades.find((u) =>
        normalizeStr(u.titulo).includes(normalizeStr(f0))
      );
      const matchedTema = matchedUnit?.temas.find((t) =>
        normalizeStr(t.titulo).includes(normalizeStr(f1))
      );
      return {
        materiaId: fallbackMat?.id || '',
        materiaNombre: fallbackMat?.nombre || 'Odontología General',
        unidadId: matchedUnit?.id || '',
        unidadTitulo: matchedUnit?.titulo || f0,
        temaId: matchedTema?.id || '',
        temaTitulo: matchedTema?.titulo || f1,
      };
    }

    // 3+ niveles: Materia / Unidad / Tema...
    const [f0, f1, ...rest] = folders;
    const temaJoin = rest.join(' / ');
    const matchedMat = tree.find(
      (m) =>
        normalizeStr(m.nombre) === normalizeStr(f0) ||
        normalizeStr(m.nombre).includes(normalizeStr(f0))
    );
    const matchedUnit = matchedMat?.unidades.find((u) =>
      normalizeStr(u.titulo).includes(normalizeStr(f1))
    );
    const matchedTema = matchedUnit?.temas.find((t) =>
      normalizeStr(t.titulo).includes(normalizeStr(temaJoin))
    );

    return {
      materiaId: matchedMat?.id || '',
      materiaNombre: matchedMat?.nombre || f0,
      unidadId: matchedUnit?.id || '',
      unidadTitulo: matchedUnit?.titulo || f1,
      temaId: matchedTema?.id || '',
      temaTitulo: matchedTema?.titulo || temaJoin,
    };
  };

  const ingestIncomingFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    setGlobalError('');
    setIsExtracting(true);
    setExtractStatus('Analizando archivos y detectando carpetas...');

    const extractedPairs: Array<{ file: File; relativePath: string }> = [];

    try {
      for (const f of incoming) {
        const lowerName = f.name.toLowerCase();
        if (lowerName.endsWith('.zip')) {
          setExtractStatus(`Extrayendo carpeta comprimida: ${f.name}...`);
          const zip = await JSZip.loadAsync(f);
          const entries = Object.values(zip.files).filter(
            (entry) => !entry.dir && !IGNORED_ZIP_PATTERN.test(entry.name)
          );
          for (const entry of entries) {
            const cleanPath = entry.name.replace(/^\/+/, '');
            const baseName = cleanPath.split('/').pop() || entry.name;
            if (!baseName || baseName.startsWith('.')) continue;
            const blob = await entry.async('blob');
            const mime = guessMimeFromName(baseName, blob.type);
            const extractedFile = new File([blob], baseName, { type: mime });
            extractedPairs.push({
              file: extractedFile,
              relativePath: cleanPath,
            });
          }
        } else {
          if (IGNORED_ZIP_PATTERN.test(f.name) || f.name.startsWith('.')) {
            continue;
          }
          const relPath =
            (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
            f.name;
          extractedPairs.push({
            file: f,
            relativePath: relPath,
          });
        }
      }

      if (extractedPairs.length === 0) {
        setGlobalError(
          'No se encontraron archivos válidos dentro de la selección o el ZIP.'
        );
        setIsExtracting(false);
        setExtractStatus('');
        return;
      }

      setExtractStatus(
        `Verificando duplicados (SHA-256) en ${extractedPairs.length} archivos...`
      );

      const newItemsRaw: BulkQueueItem[] = [];
      const seenHashesInQueue = new Set(queue.map((q) => q.sha256));

      for (let i = 0; i < extractedPairs.length; i += 1) {
        const { file, relativePath } = extractedPairs[i];
        const buffer = await file.arrayBuffer();
        const sha256 = await computeSha256Hex(buffer);

        const isBatchDup = seenHashesInQueue.has(sha256);
        seenHashesInQueue.add(sha256);

        const mapped = resolveMappingFromPath(
          relativePath,
          batchMateria?.id || '',
          batchUnidad?.id || '',
          batchTemaId
        );

        const inferredTipo =
          batchTipo === 'auto'
            ? inferRecursoTipo(file.name, file.type)
            : batchTipo;

        newItemsRaw.push({
          localId: `bq-${Date.now().toString(36)}-${i}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          file,
          originalName: file.name,
          relativePath,
          size: file.size,
          sha256,
          titulo: cleanBaseTitle(file.name),
          tipo: inferredTipo,
          materiaId: mapped.materiaId,
          materiaNombre: mapped.materiaNombre,
          unidadId: mapped.unidadId,
          unidadTitulo: mapped.unidadTitulo,
          temaId: mapped.temaId,
          temaTitulo: mapped.temaTitulo,
          selected: !isBatchDup,
          status: isBatchDup ? 'duplicate' : 'ready',
          progress: 0,
          duplicateReason: isBatchDup
            ? 'Duplicado repetido dentro de este mismo lote.'
            : undefined,
        });
      }

      // Verificar contra la base de datos persistente del servidor
      try {
        const checkRes = await fetch('/api/library/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hashes: newItemsRaw.map((x) => x.sha256),
          }),
        });
        if (checkRes.ok) {
          const data = (await checkRes.json()) as {
            duplicates?: Array<{
              sha256: string;
              existingId: string;
              existingTitle: string;
            }>;
          };
          const dupMap = new Map(
            (data.duplicates || []).map((d) => [d.sha256, d.existingTitle])
          );
          for (const item of newItemsRaw) {
            const existingTitle = dupMap.get(item.sha256);
            if (existingTitle) {
              item.status = 'duplicate';
              item.selected = false;
              item.duplicateReason = `Ya guardado como "${existingTitle}"`;
            }
          }
        }
      } catch {
        // Si falla el check previo, el endpoint /upload igual valida duplicados
      }

      setQueue((prev) => [...prev, ...newItemsRaw]);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : 'No se pudieron procesar algunos archivos o el archivo ZIP.'
      );
    } finally {
      setIsExtracting(false);
      setExtractStatus('');
    }
  };

  const handleApplyBatchDestination = () => {
    if (!batchMateria) return;
    const unit = batchUnidad || batchMateria.unidades[0];
    const tema =
      unit?.temas.find((t) => t.id === batchTemaId) || unit?.temas[0];

    setQueue((prev) =>
      prev.map((item) => {
        if (!item.selected || item.status === 'uploaded') return item;
        return {
          ...item,
          materiaId: batchMateria.id,
          materiaNombre: batchMateria.nombre,
          unidadId: unit?.id || '',
          unidadTitulo: unit?.titulo || item.unidadTitulo,
          temaId: tema?.id || '',
          temaTitulo: tema?.titulo || item.temaTitulo,
          tipo: batchTipo === 'auto' ? item.tipo : batchTipo,
        };
      })
    );
  };

  const uploadSingleItem = (item: BulkQueueItem): Promise<{
    ok: boolean;
    resource?: BiblioRecurso;
    tree?: BiblioMateriaNode[];
    duplicateReason?: string;
    error?: string;
  }> => {
    return new Promise((resolve) => {
      const form = new FormData();
      form.append('file', item.file, item.originalName);
      form.append('originalName', item.originalName);
      form.append('titulo', item.titulo);
      form.append('tipo', item.tipo);
      if (item.materiaId) form.append('materiaId', item.materiaId);
      form.append('materiaNombre', item.materiaNombre);
      const matchedMat = tree.find((m) => m.id === item.materiaId);
      form.append('anio', String(matchedMat?.anio || 1));
      if (item.unidadId) form.append('unidadId', item.unidadId);
      form.append('unidadTitulo', item.unidadTitulo);
      if (item.temaId) form.append('temaId', item.temaId);
      form.append('temaTitulo', item.temaTitulo);
      form.append('relativePath', item.relativePath);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/library/upload');

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId
                ? { ...q, status: 'uploading', progress: pct }
                : q
            )
          );
        }
      };

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText || '{}') as {
            resource?: BiblioRecurso;
            tree?: BiblioMateriaNode[];
            duplicate?: boolean;
            existingTitle?: string;
            error?: string;
          };

          if (xhr.status === 201 && parsed.resource) {
            resolve({
              ok: true,
              resource: parsed.resource,
              tree: parsed.tree,
            });
            return;
          }

          if (xhr.status === 409 && parsed.duplicate) {
            resolve({
              ok: false,
              duplicateReason:
                parsed.error ||
                `Duplicado existente: "${parsed.existingTitle || 'Archivo'}"`,
            });
            return;
          }

          resolve({
            ok: false,
            error: parsed.error || `Error del servidor (HTTP ${xhr.status}).`,
          });
        } catch {
          resolve({
            ok: false,
            error: `Respuesta inválida del servidor (HTTP ${xhr.status}).`,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          ok: false,
          error: 'Error de red durante la subida. Revisá tu conexión.',
        });
      };

      xhr.send(form);
    });
  };

  const saveItemOfflineFallback = async (
    item: BulkQueueItem
  ): Promise<BiblioRecurso> => {
    const localId = `br-loc-${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    await saveBiblioFileBlob(localId, item.file);
    let extractedText: string | undefined;
    if (
      item.file.type.startsWith('text/') ||
      /\.(txt|md)$/i.test(item.originalName)
    ) {
      extractedText = (await item.file.text().catch(() => '')).slice(0, 100000) || undefined;
    }
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: localId,
      materiaId: item.materiaId || tree[0]?.id || '',
      unidadId: item.unidadId || tree[0]?.unidades[0]?.id || '',
      temaId: item.temaId || tree[0]?.unidades[0]?.temas[0]?.id || '',
      tipo: item.tipo,
      titulo: (item.titulo || item.originalName).trim().slice(0, 220),
      contenido: extractedText,
      etiquetas: [],
      favorito: false,
      orden: Date.now(),
      archivoNombre: item.originalName,
      archivoMime: item.file.type || guessMimeFromName(item.originalName),
      archivoSize: item.size,
      hasLocalBlob: true,
      storageBackend: 'local',
      sha256: item.sha256,
      relativePath: item.relativePath || undefined,
      createdAt: today,
      updatedAt: today,
    };
  };

  const handleStartUpload = async (onlyFailed = false) => {
    const candidates = queue.filter((q) =>
      onlyFailed
        ? q.status === 'error'
        : q.selected && (q.status === 'ready' || q.status === 'error')
    );

    if (candidates.length === 0) return;

    setIsUploading(true);
    setGlobalError('');
    const createdList: BiblioRecurso[] = [];
    let latestTree: BiblioMateriaNode[] | undefined;

    for (const item of candidates) {
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? { ...q, status: 'uploading', progress: 5, errorMessage: undefined }
            : q
        )
      );

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        try {
          const offlineRes = await saveItemOfflineFallback(item);
          createdList.push(offlineRes);
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId
                ? { ...q, status: 'uploaded', progress: 100 }
                : q
            )
          );
        } catch {
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId
                ? {
                    ...q,
                    status: 'error',
                    progress: 0,
                    errorMessage: 'No se pudo guardar localmente sin conexión.',
                  }
                : q
            )
          );
        }
        continue;
      }

      const res = await uploadSingleItem(item);

      if (res.ok && res.resource) {
        let cachedLocal = false;
        if (item.file.size <= 25 * 1024 * 1024) {
          try {
            await saveBiblioFileBlob(res.resource.id, item.file);
            cachedLocal = true;
          } catch {
            cachedLocal = false;
          }
        }
        createdList.push({
          ...res.resource,
          hasLocalBlob: cachedLocal || res.resource.hasLocalBlob,
        });
        if (res.tree) latestTree = res.tree;
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? { ...q, status: 'uploaded', progress: 100 }
              : q
          )
        );
      } else if (res.duplicateReason) {
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? {
                  ...q,
                  status: 'duplicate',
                  selected: false,
                  progress: 0,
                  duplicateReason: res.duplicateReason,
                }
              : q
          )
        );
      } else if (res.error?.includes('Error de red')) {
        try {
          const offlineRes = await saveItemOfflineFallback(item);
          createdList.push(offlineRes);
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId
                ? { ...q, status: 'uploaded', progress: 100 }
                : q
            )
          );
        } catch {
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId
                ? {
                    ...q,
                    status: 'error',
                    progress: 0,
                    errorMessage: res.error || 'Error al subir este archivo.',
                  }
                : q
            )
          );
        }
      } else {
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? {
                  ...q,
                  status: 'error',
                  progress: 0,
                  errorMessage: res.error || 'Error al subir este archivo.',
                }
              : q
          )
        );
      }
    }

    setIsUploading(false);

    if (createdList.length > 0) {
      onCompletedBatch({
        newResources: createdList,
        latestTree,
      });
    }
  };

  const stats = useMemo(() => {
    let ready = 0;
    let uploaded = 0;
    let duplicate = 0;
    let error = 0;
    let totalBytes = 0;
    let progressSum = 0;
    let activeCount = 0;

    for (const q of queue) {
      if (q.status === 'ready' && q.selected) {
        ready += 1;
        totalBytes += q.size;
        activeCount += 1;
      } else if (q.status === 'uploading') {
        activeCount += 1;
        progressSum += q.progress;
      } else if (q.status === 'uploaded') {
        uploaded += 1;
        activeCount += 1;
        progressSum += 100;
      } else if (q.status === 'duplicate') {
        duplicate += 1;
      } else if (q.status === 'error') {
        error += 1;
        activeCount += 1;
      }
    }
    const overallPct =
      activeCount > 0 ? Math.round(progressSum / activeCount) : 0;

    return { ready, uploaded, duplicate, error, totalBytes, overallPct };
  }, [queue]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#261F1D]/50 p-2.5 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Carga masiva a la Biblioteca de Apuntes"
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E6DDD6] bg-[#F8F5F1] shadow-[0_24px_60px_-15px_rgba(101,48,68,0.3)]">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6DDD6] bg-white px-5 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#653044] sm:text-2xl">
              Carga Masiva de Apuntes y Carpetas
            </h2>
            <p className="text-xs text-[#736B66]">
              Subí múltiples archivos o importá carpetas completas en .ZIP conservando materia, unidad y subcarpetas en almacenamiento persistente.
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            aria-label="Cerrar carga masiva"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#653044] text-white hover:bg-[#522436] disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {/* Zona de selección múltiple / ZIP / Carpeta */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.length) {
                void ingestIncomingFiles(e.dataTransfer.files);
              }
            }}
            className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
              isDragging
                ? 'border-[#653044] bg-[#E9D9DC]/40'
                : 'border-[#D8CDC4] bg-white'
            }`}
          >
            <input
              ref={multiFilesInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*,.zip"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void ingestIncomingFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <input
              ref={zipInputRef}
              type="file"
              multiple
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void ingestIncomingFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            {supportsDirectoryPicker && (
              <input
                ref={(el) => {
                  folderInputRef.current = el;
                  if (el) {
                    el.setAttribute('webkitdirectory', '');
                    el.setAttribute('directory', '');
                  }
                }}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void ingestIncomingFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            )}

            <UploadCloud size={28} className="mx-auto text-[#B8798E]" />
            <p className="mt-2 font-serif text-base font-semibold text-[#653044]">
              Elegí cómo importar tus materiales
            </p>
            <p className="mt-0.5 text-xs text-[#736B66]">
              Compatible con computadora y celular · Máximo 50 MB por archivo · Detección automática de duplicados
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                disabled={isExtracting || isUploading}
                onClick={() => multiFilesInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#653044] px-4 text-xs font-semibold text-white hover:bg-[#522436] disabled:opacity-50"
              >
                <Files size={15} />
                <span>Seleccionar múltiples archivos</span>
              </button>

              <button
                type="button"
                disabled={isExtracting || isUploading}
                onClick={() => zipInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#B8798E] bg-[#E9D9DC]/45 px-4 text-xs font-semibold text-[#653044] hover:bg-[#E9D9DC]/80 disabled:opacity-50"
              >
                <FileArchive size={15} />
                <span>Importar carpeta (.ZIP)</span>
              </button>

              {supportsDirectoryPicker && (
                <button
                  type="button"
                  disabled={isExtracting || isUploading}
                  onClick={() => folderInputRef.current?.click()}
                  className="hidden h-10 items-center gap-2 rounded-xl border border-[#E6DDD6] bg-[#F8F5F1] px-4 text-xs font-semibold text-[#653044] hover:bg-[#E9D9DC]/40 disabled:opacity-50 sm:inline-flex"
                >
                  <FolderOpen size={15} />
                  <span>Subir carpeta de PC</span>
                </button>
              )}
            </div>

            {isExtracting && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#653044]">
                <Loader2 size={14} className="animate-spin" />
                <span>{extractStatus || 'Procesando archivos...'}</span>
              </div>
            )}
          </div>

          {globalError && (
            <div className="flex items-center gap-2 rounded-xl border border-[#B8798E] bg-[#E9D9DC]/60 px-4 py-3 text-xs font-semibold text-[#653044]">
              <AlertCircle size={15} className="shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Controles de Asignación de Materia / Unidad y Estructura */}
          <div className="space-y-3 rounded-2xl border border-[#E6DDD6] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EAE4] pb-3">
              <div className="flex items-center gap-2">
                <FolderTree size={15} className="text-[#653044]" />
                <span className="text-xs font-bold text-[#653044]">
                  Destino y organización de carpetas
                </span>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#261F1D]">
                <input
                  type="checkbox"
                  checked={preservingFolders}
                  onChange={(e) => setPreservingFolders(e.target.checked)}
                  className="h-4 w-4 accent-[#653044]"
                />
                <span>Mantener estructura de carpetas y subcarpetas del ZIP</span>
              </label>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Materia destino (base)
                </label>
                <select
                  value={batchMateria?.id || ''}
                  onChange={(e) => {
                    const m = tree.find((x) => x.id === e.target.value);
                    setBatchMateriaId(e.target.value);
                    const u = m?.unidades[0];
                    setBatchUnidadId(u?.id || '');
                    setBatchTemaId(u?.temas[0]?.id || '');
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

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Unidad destino
                </label>
                <select
                  value={batchUnidad?.id || ''}
                  onChange={(e) => {
                    const u = batchMateria?.unidades.find(
                      (x) => x.id === e.target.value
                    );
                    setBatchUnidadId(e.target.value);
                    setBatchTemaId(u?.temas[0]?.id || '');
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
                >
                  {(batchMateria?.unidades || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Tema destino
                </label>
                <select
                  value={batchTemaId}
                  onChange={(e) => setBatchTemaId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
                >
                  {(batchUnidad?.temas || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Categoría
                </label>
                <select
                  value={batchTipo}
                  onChange={(e) =>
                    setBatchTipo(e.target.value as 'auto' | RecursoTipo)
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
                >
                  <option value="auto">Automática</option>
                  <option value="pdf">PDF</option>
                  <option value="apunte">Apunte</option>
                  <option value="resumen">Resumen</option>
                  <option value="ficha">Ficha</option>
                  <option value="imagen">Imagen</option>
                </select>
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="button"
                  disabled={queue.length === 0 || isUploading}
                  onClick={handleApplyBatchDestination}
                  className="h-9 w-full rounded-lg border border-[#653044] bg-white px-2.5 text-xs font-semibold text-[#653044] hover:bg-[#E9D9DC]/40 disabled:opacity-40"
                >
                  Aplicar a lote
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Progreso General */}
          {queue.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-[#E6DDD6] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-[#653044] tabular-nums">
                  Vista previa: {queue.length} archivos · {stats.ready} listos (
                  {formatFileSize(stats.totalBytes) || '0 B'})
                  {stats.duplicate > 0 && ` · ${stats.duplicate} duplicados omitidos`}
                  {stats.uploaded > 0 && ` · ${stats.uploaded} guardados`}
                  {stats.error > 0 && ` · ${stats.error} con error`}
                </div>
                {!isUploading && queue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQueue([])}
                    className="text-xs font-semibold text-[#736B66] hover:text-[#653044]"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {(isUploading || stats.uploaded > 0) && (
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E9D9DC]">
                    <div
                      className="h-full bg-[#653044] transition-all duration-150"
                      style={{ width: `${stats.overallPct}%` }}
                    />
                  </div>
                  <p className="text-right font-mono text-[11px] text-[#736B66] tabular-nums">
                    Progreso total: {stats.overallPct}%
                  </p>
                </div>
              )}

              {/* Lista Editable de Vista Previa */}
              <div className="max-h-[340px] divide-y divide-[#F0EAE4] overflow-y-auto rounded-xl border border-[#F0EAE4]">
                {queue.map((item) => (
                  <div
                    key={item.localId}
                    className={`space-y-2 p-3 text-xs ${
                      item.status === 'duplicate'
                        ? 'bg-[#F8F5F1]/80 opacity-80'
                        : item.status === 'uploaded'
                          ? 'bg-[#A1B3A0]/12'
                          : item.status === 'error'
                            ? 'bg-[#E9D9DC]/35'
                            : 'bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        disabled={
                          isUploading ||
                          item.status === 'uploaded' ||
                          item.status === 'duplicate'
                        }
                        onChange={(e) =>
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.localId === item.localId
                                ? { ...q, selected: e.target.checked }
                                : q
                            )
                          )
                        }
                        className="h-4 w-4 shrink-0 accent-[#653044]"
                      />

                      {/* Título editable */}
                      <input
                        type="text"
                        disabled={isUploading || item.status === 'uploaded'}
                        value={item.titulo}
                        onChange={(e) =>
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.localId === item.localId
                                ? { ...q, titulo: e.target.value }
                                : q
                            )
                          )
                        }
                        className="h-8 min-w-[160px] flex-1 rounded-lg border border-[#E6DDD6] bg-white px-2.5 text-xs font-semibold text-[#261F1D] outline-none focus:border-[#653044] disabled:bg-transparent"
                      />

                      {/* Categoría editable */}
                      <select
                        aria-label={`Categoría de ${item.titulo}`}
                        disabled={isUploading || item.status === 'uploaded'}
                        value={item.tipo}
                        onChange={(e) =>
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.localId === item.localId
                                ? { ...q, tipo: e.target.value as RecursoTipo }
                                : q
                            )
                          )
                        }
                        className="h-8 rounded-lg border border-[#E6DDD6] bg-white px-2 text-xs font-semibold text-[#653044]"
                      >
                        <option value="pdf">PDF</option>
                        <option value="apunte">Apunte</option>
                        <option value="resumen">Resumen</option>
                        <option value="ficha">Ficha</option>
                        <option value="imagen">Imagen</option>
                      </select>

                      {/* Materia por fila */}
                      <select
                        aria-label={`Materia de ${item.titulo}`}
                        disabled={isUploading || item.status === 'uploaded'}
                        value={item.materiaId || '__custom__'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') return;
                          const mat = tree.find((m) => m.id === val);
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.localId === item.localId
                                ? {
                                    ...q,
                                    materiaId: mat?.id || '',
                                    materiaNombre: mat?.nombre || q.materiaNombre,
                                    unidadId: mat?.unidades[0]?.id || '',
                                    unidadTitulo:
                                      mat?.unidades[0]?.titulo || q.unidadTitulo,
                                    temaId: mat?.unidades[0]?.temas[0]?.id || '',
                                    temaTitulo:
                                      mat?.unidades[0]?.temas[0]?.titulo ||
                                      q.temaTitulo,
                                  }
                                : q
                            )
                          );
                        }}
                        className="h-8 max-w-[180px] rounded-lg border border-[#E6DDD6] bg-white px-2 text-xs text-[#261F1D]"
                      >
                        {!item.materiaId && (
                          <option value="__custom__">
                            Nueva: {item.materiaNombre}
                          </option>
                        )}
                        {tree.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre}
                          </option>
                        ))}
                      </select>

                      <span className="font-mono text-[11px] text-[#736B66] tabular-nums">
                        {formatFileSize(item.size)}
                      </span>

                      {!isUploading && item.status !== 'uploaded' && (
                        <button
                          type="button"
                          onClick={() =>
                            setQueue((prev) =>
                              prev.filter((q) => q.localId !== item.localId)
                            )
                          }
                          aria-label={`Quitar ${item.titulo}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#736B66] hover:bg-[#E9D9DC]/50 hover:text-[#653044]"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Ruta de subcarpetas y destino + estado */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pl-6 text-[11px] text-[#736B66]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[#5E5753]">
                          {item.relativePath}
                        </span>
                        <span aria-hidden="true">→</span>
                        <span className="font-medium text-[#653044]">
                          {item.materiaNombre} / {item.unidadTitulo} /{' '}
                          {item.temaTitulo}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === 'uploading' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#653044] tabular-nums">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Subiendo {item.progress}%</span>
                          </span>
                        )}
                        {item.status === 'uploaded' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#2E3B2D]">
                            <CheckCircle2 size={12} />
                            <span>Guardado en BD</span>
                          </span>
                        )}
                        {item.status === 'duplicate' && (
                          <span className="font-semibold text-[#653044]">
                            Duplicado · {item.duplicateReason}
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#653044]">
                            <AlertCircle size={12} />
                            <span>{item.errorMessage}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6DDD6] bg-white px-5 py-3.5">
          <span className="text-xs text-[#736B66]">
            Los archivos se almacenan en el servidor con verificación anti-duplicados SHA-256.
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {stats.error > 0 && !isUploading && (
              <button
                type="button"
                onClick={() => void handleStartUpload(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#B8798E] bg-[#E9D9DC]/50 px-4 text-xs font-semibold text-[#653044]"
              >
                <RotateCcw size={14} />
                <span>Reintentar fallidos ({stats.error})</span>
              </button>
            )}

            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="h-10 rounded-xl border border-[#E6DDD6] bg-white px-4 text-xs font-semibold text-[#5E5753]"
            >
              {stats.uploaded > 0 && stats.ready === 0 ? 'Listo' : 'Cerrar'}
            </button>

            <button
              type="button"
              disabled={isUploading || stats.ready === 0}
              onClick={() => void handleStartUpload(false)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#653044] px-5 text-xs font-semibold text-white hover:bg-[#522436] disabled:opacity-45"
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Subiendo archivos...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Confirmar y subir ({stats.ready})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
