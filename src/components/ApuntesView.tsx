import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookMarked,
  BookOpen,
  Brain,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FileUp,
  FolderPlus,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Settings2,
  Share2,
  SlidersHorizontal,
  Star,
  StickyNote,
  Upload,
  UploadCloud,
  WifiOff,
} from 'lucide-react';
import {
  BIBLIO_RECENT_KEY,
  BIBLIO_REFERENCES_KEY,
  BIBLIO_RESOURCES_KEY,
  BIBLIO_TREE_KEY,
  buildInitialBiblioTree,
  buildStarterResources,
  loadBibliografiaAcademica,
  loadBiblioResources,
  loadBiblioTree,
  loadRecentConsulted,
} from '../data/biblioLibrarySeed';
import type { DriveEntry } from '../data/driveLibraries';
import type {
  ApunteNote,
  BiblioCategoria,
  BibliografiaItem,
  BiblioMateriaNode,
  BiblioRecurso,
  FlashcardItem,
  MateriaPlan,
  PreguntaBanco,
  RecentConsultedItem,
  RecursoTipo,
  StudySignals,
} from '../types/dental';
import { deleteBiblioFileBlob, formatFileSize, getBiblioFileBlob } from '../utils/biblioBlobStore';
import type { TemaAReforzar } from '../utils/repasoDetector';
import { BiblioAdminPanel } from './BiblioAdminPanel';
import { BiblioBulkUploadModal } from './BiblioBulkUploadModal';
import { BiblioDocumentViewer } from './BiblioDocumentViewer';
import { BibliografiaAcademicaPanel } from './BibliografiaAcademicaPanel';
import { BancoPreguntasPanel, FlashcardsPanel } from './BiblioStudyModes';
import { BiblioUploadModal } from './BiblioUploadModal';
import { ModoRepasoPanel } from './ModoRepasoPanel';

export type BiblioTab =
  | 'pdfs'
  | 'resumenes'
  | 'flashcards'
  | 'preguntas'
  | 'repaso'
  | 'compartida';

interface ApuntesViewProps {
  apuntes: ApunteNote[];
  materias: MateriaPlan[];
  flashcards: FlashcardItem[];
  preguntas: PreguntaBanco[];
  studySignals: StudySignals;
  temasRepaso: TemaAReforzar[];
  initialFilterMateria?: string;
  initialTab?: BiblioTab;
  onClearInitialFilter?: () => void;
  onAddApunte: (note: ApunteNote) => void;
  onUpdateApunte: (note: ApunteNote) => void;
  onDeleteApunte: (id: string) => void;
  onAddFlashcard: (card: FlashcardItem) => void;
  onToggleFlashcardFavorito: (id: string) => void;
  onDeleteFlashcard: (id: string) => void;
  onAddPregunta: (p: PreguntaBanco) => void;
  onTogglePreguntaFavorito: (id: string) => void;
  onDeletePregunta: (id: string) => void;
  onMarkFlashcard: (id: string, status: 'pendiente' | 'dominada') => void;
  onRecordPreguntaAttempt: (id: string, isCorrect: boolean) => void;
  onResolveTopic: (topicKey: string) => void;
  onResetResolvedTopics: () => void;
  onNavigateRepasoTopic: (tema: TemaAReforzar) => void;
  onImportBackupBundle?: (bundle: {
    apuntes?: ApunteNote[];
    flashcards?: FlashcardItem[];
    preguntas?: PreguntaBanco[];
  }) => void;
}

type MainSection = 'biblioteca' | 'bibliografia' | 'practica';
type PracticaTab = 'flashcards' | 'preguntas' | 'repaso';

const TIPO_META: Record<
  RecursoTipo,
  {
    label: string;
    short: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    toneClass: string;
  }
> = {
  pdf: {
    label: 'PDF / Documento',
    short: 'PDF',
    icon: FileUp,
    toneClass: 'bg-[#E9D9DC]/70 text-[#653044]',
  },
  apunte: {
    label: 'Apunte',
    short: 'Apunte',
    icon: BookOpen,
    toneClass: 'bg-[#A1B3A0]/25 text-[#2E3B2D]',
  },
  resumen: {
    label: 'Resumen',
    short: 'Resumen',
    icon: FileText,
    toneClass: 'bg-[#E9D9DC]/50 text-[#653044]',
  },
  ficha: {
    label: 'Ficha',
    short: 'Ficha',
    icon: StickyNote,
    toneClass: 'bg-[#A1B3A0]/20 text-[#2E3B2D]',
  },
  imagen: {
    label: 'Imagen / Lámina',
    short: 'Imagen',
    icon: ImageIcon,
    toneClass: 'bg-[#B8798E]/20 text-[#653044]',
  },
};

function toLegacyCategoria(tipo: RecursoTipo): BiblioCategoria {
  if (tipo === 'pdf') return 'pdfs';
  if (tipo === 'resumen') return 'resumenes';
  if (tipo === 'ficha') return 'cuadros';
  return 'apuntes';
}

export const ApuntesView: React.FC<ApuntesViewProps> = ({
  apuntes,
  materias,
  flashcards,
  preguntas,
  studySignals,
  temasRepaso,
  initialFilterMateria,
  initialTab,
  onClearInitialFilter,
  onAddApunte,
  onUpdateApunte,
  onDeleteApunte,
  onAddFlashcard,
  onToggleFlashcardFavorito,
  onDeleteFlashcard,
  onAddPregunta,
  onTogglePreguntaFavorito,
  onDeletePregunta,
  onMarkFlashcard,
  onRecordPreguntaAttempt,
  onResolveTopic,
  onResetResolvedTopics,
  onNavigateRepasoTopic,
  onImportBackupBundle,
}) => {
  // Secciones principales claramente separadas
  const [mainSection, setMainSection] = useState<MainSection>('biblioteca');
  const [practicaTab, setPracticaTab] = useState<PracticaTab>('flashcards');

  // Árbol jerárquico: Materia -> Unidad -> Tema + Recursos + Recientes + Bibliografía
  const [tree, setTree] = useState<BiblioMateriaNode[]>(() => loadBiblioTree(materias));
  const [resources, setResources] = useState<BiblioRecurso[]>(() =>
    loadBiblioResources(loadBiblioTree(materias), apuntes)
  );
  const [recentConsulted, setRecentConsulted] = useState<RecentConsultedItem[]>(() =>
    loadRecentConsulted()
  );
  const [references, setReferences] = useState<BibliografiaItem[]>(() =>
    loadBibliografiaAcademica()
  );

  // Navegación jerárquica dentro de Biblioteca de Apuntes
  const [selectedMateriaId, setSelectedMateriaId] = useState<string | null>(null);
  const [selectedUnidadId, setSelectedUnidadId] = useState<string | null>(null);
  const [selectedTemaId, setSelectedTemaId] = useState<string | null>(null);

  // Buscador General y Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnio, setFilterAnio] = useState<number | 'todos'>('todos');
  const [filterMateriaId, setFilterMateriaId] = useState<string>('todas');
  const [filterUnidadId, setFilterUnidadId] = useState<string>('todas');
  const [filterTipo, setFilterTipo] = useState<'todos' | RecursoTipo>('todos');
  const [onlyFavoritos, setOnlyFavoritos] = useState(false);

  // Modales y visor
  const [viewerResourceId, setViewerResourceId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [uploadDefaultTipo, setUploadDefaultTipo] = useState<RecursoTipo>('pdf');
  const [adminOpen, setAdminOpen] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  const serverReadyRef = useRef(false);
  const skipNextSyncRef = useRef(false);

  // Quick inline creation inside Materia view
  const [quickUnitTitle, setQuickUnitTitle] = useState('');
  const [showQuickUnitForm, setShowQuickUnitForm] = useState(false);
  const [quickTemaTitle, setQuickTemaTitle] = useState('');
  const [addingTemaForUnitId, setAddingTemaForUnitId] = useState<string | null>(null);

  // Hidratación inicial desde almacenamiento persistente del servidor
  useEffect(() => {
    let cancelled = false;
    const hydrateFromServer = async () => {
      try {
        const res = await fetch('/api/library/state');
        if (!res.ok) {
          serverReadyRef.current = true;
          return;
        }
        const data = (await res.json()) as {
          tree?: BiblioMateriaNode[];
          resources?: BiblioRecurso[];
        };
        if (cancelled) return;

        const serverTree = Array.isArray(data.tree) ? data.tree : [];
        const serverResources = Array.isArray(data.resources) ? data.resources : [];

        if (serverTree.length > 0) {
          skipNextSyncRef.current = true;
          setTree((prevTree) => {
            const byId = new Map(serverTree.map((m) => [m.id, m]));
            const extraLocal = prevTree.filter((m) => !byId.has(m.id));
            return [...serverTree, ...extraLocal];
          });
          setResources((prevRes) => {
            const localMap = new Map(prevRes.map((r) => [r.id, r]));
            const serverIds = new Set(serverResources.map((r) => r.id));
            const mergedServer = serverResources.map((sr) => {
              const loc = localMap.get(sr.id);
              return loc?.hasLocalBlob ? { ...sr, hasLocalBlob: true } : sr;
            });
            const localOnly = prevRes.filter(
              (r) => !serverIds.has(r.id) && r.storageBackend !== 'server'
            );
            return [...mergedServer, ...localOnly];
          });
        } else {
          // Sembrar el servidor la primera vez
          await fetch('/api/library/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tree,
              resources: resources.map((r) => ({ ...r, archivoDataUrl: undefined })),
            }),
          }).catch(() => {});
        }
      } catch {
        // Offline / fallback silencioso
      } finally {
        if (!cancelled) {
          serverReadyRef.current = true;
        }
      }
    };
    void hydrateFromServer();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistencia localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BIBLIO_TREE_KEY, JSON.stringify(tree));
    } catch {
      // Ignore storage quota issues
    }
  }, [tree]);

  useEffect(() => {
    try {
      const lightweight = resources.map((r) => ({
        ...r,
        archivoDataUrl:
          r.hasLocalBlob || (r.archivoDataUrl && r.archivoDataUrl.length > 200000)
            ? undefined
            : r.archivoDataUrl,
      }));
      localStorage.setItem(BIBLIO_RESOURCES_KEY, JSON.stringify(lightweight));
    } catch {
      // Ignore storage quota issues
    }
  }, [resources]);

  // Sincronización automática con la base de datos persistente del servidor
  useEffect(() => {
    if (!serverReadyRef.current) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const sanitizedResources = resources.map((r) => ({
        ...r,
        archivoDataUrl:
          r.archivoDataUrl && r.archivoDataUrl.length > 200000
            ? undefined
            : r.archivoDataUrl,
      }));
      void fetch('/api/library/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree, resources: sanitizedResources }),
      }).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timer);
  }, [tree, resources]);

  useEffect(() => {
    try {
      localStorage.setItem(BIBLIO_RECENT_KEY, JSON.stringify(recentConsulted));
    } catch {
      // Ignore
    }
  }, [recentConsulted]);

  useEffect(() => {
    try {
      localStorage.setItem(BIBLIO_REFERENCES_KEY, JSON.stringify(references));
    } catch {
      // Ignore
    }
  }, [references]);

  // Navegación entrante desde Inicio o Modo Repaso
  useEffect(() => {
    if (initialTab === 'flashcards' || initialTab === 'preguntas' || initialTab === 'repaso') {
      setMainSection('practica');
      setPracticaTab(initialTab);
    } else if (initialTab === 'compartida') {
      setMainSection('bibliografia');
    } else if (initialTab === 'pdfs' || initialTab === 'resumenes') {
      setMainSection('biblioteca');
      if (initialTab === 'resumenes') {
        setFilterTipo('resumen');
      } else {
        setFilterTipo('todos');
      }
    }

    if (initialFilterMateria) {
      setMainSection('biblioteca');
      const found = tree.find(
        (m) => m.nombre.toLowerCase() === initialFilterMateria.toLowerCase()
      );
      if (found) {
        setSelectedMateriaId(found.id);
        const firstUnit = found.unidades[0];
        setSelectedUnidadId(firstUnit?.id || null);
        setSelectedTemaId(firstUnit?.temas[0]?.id || null);
      } else {
        setSearchQuery(initialFilterMateria);
      }
      onClearInitialFilter?.();
    } else if (initialTab) {
      onClearInitialFilter?.();
    }
  }, [initialTab, initialFilterMateria, tree, onClearInitialFilter]);

  const orderedTree = useMemo(
    () => [...tree].sort((a, b) => a.orden - b.orden),
    [tree]
  );

  const selectedMateria = useMemo(
    () => orderedTree.find((m) => m.id === selectedMateriaId) || null,
    [orderedTree, selectedMateriaId]
  );

  const selectedUnidad = useMemo(() => {
    if (!selectedMateria) return null;
    return (
      selectedMateria.unidades.find((u) => u.id === selectedUnidadId) ||
      selectedMateria.unidades[0] ||
      null
    );
  }, [selectedMateria, selectedUnidadId]);

  const selectedTema = useMemo(() => {
    if (!selectedUnidad) return null;
    return (
      selectedUnidad.temas.find((t) => t.id === selectedTemaId) ||
      selectedUnidad.temas[0] ||
      null
    );
  }, [selectedUnidad, selectedTemaId]);

  const viewerResource = useMemo(
    () => resources.find((r) => r.id === viewerResourceId) || null,
    [resources, viewerResourceId]
  );

  // Helper para abrir visor + registrar en Últimos Materiales Consultados
  const handleOpenViewer = (resId: string) => {
    setViewerResourceId(resId);
    const nowIso = new Date().toISOString();
    setRecentConsulted((prev) => {
      const without = prev.filter((item) => item.resourceId !== resId);
      return [{ resourceId: resId, viewedAt: nowIso }, ...without].slice(0, 12);
    });
  };

  // Mantener sincronizado con apuntes[] de App.tsx para Notebook IA
  const syncCreateToApuntes = (created: BiblioRecurso) => {
    const mat = orderedTree.find((m) => m.id === created.materiaId);
    onAddApunte({
      id: created.id,
      titulo: created.titulo,
      materia: mat?.nombre || 'Odontología General',
      anio: mat?.anio || 1,
      categoria: toLegacyCategoria(created.tipo),
      favorito: created.favorito,
      etiquetas: created.etiquetas,
      enlaceUrl: created.enlaceUrl,
      archivoNombre: created.archivoNombre,
      offlineReady: true,
      contenido:
        created.contenido ||
        created.descripcion ||
        `${TIPO_META[created.tipo].label}: ${created.titulo}`,
      updatedAt: created.updatedAt,
    });
  };

  const handleCreateResource = (created: BiblioRecurso) => {
    setResources((prev) => [created, ...prev]);
    syncCreateToApuntes(created);
    setStatusBanner(`"${created.titulo}" guardado en tu Biblioteca de Apuntes.`);
  };

  const handleUpdateResource = (next: BiblioRecurso) => {
    setResources((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    if (next.storageBackend === 'server' || next.serverFileUrl) {
      void fetch(`/api/library/resources/${encodeURIComponent(next.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: next.titulo,
          tipo: next.tipo,
          favorito: next.favorito,
          descripcion: next.descripcion,
          contenido: next.contenido,
          etiquetas: next.etiquetas,
          orden: next.orden,
          materiaId: next.materiaId,
          unidadId: next.unidadId,
          temaId: next.temaId,
        }),
      }).catch(() => {});
    }
    const targetLegacyId = next.legacyApunteId || next.id;
    const mat = orderedTree.find((m) => m.id === next.materiaId);
    if (apuntes.some((a) => a.id === targetLegacyId)) {
      onUpdateApunte({
        id: targetLegacyId,
        titulo: next.titulo,
        materia: mat?.nombre || 'Odontología General',
        anio: mat?.anio || 1,
        categoria: toLegacyCategoria(next.tipo),
        favorito: next.favorito,
        etiquetas: next.etiquetas,
        enlaceUrl: next.enlaceUrl,
        archivoNombre: next.archivoNombre,
        offlineReady: true,
        contenido: next.contenido || next.descripcion || '',
        updatedAt: next.updatedAt,
      });
    }
  };

  const handleDeleteResource = (resId: string) => {
    const target = resources.find((r) => r.id === resId);
    setResources((prev) => prev.filter((r) => r.id !== resId));
    setRecentConsulted((prev) => prev.filter((x) => x.resourceId !== resId));
    if (target?.hasLocalBlob) {
      void deleteBiblioFileBlob(resId);
    }
    if (target?.serverFileUrl || target?.storageBackend === 'server') {
      void fetch(`/api/library/resources/${encodeURIComponent(resId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    const legacyId = target?.legacyApunteId || resId;
    if (apuntes.some((a) => a.id === legacyId)) {
      onDeleteApunte(legacyId);
    }
  };

  const handleToggleFavorite = (res: BiblioRecurso) => {
    handleUpdateResource({ ...res, favorito: !res.favorito });
  };

  const handleDownloadResource = async (res: BiblioRecurso) => {
    if (res.serverFileUrl) {
      const a = document.createElement('a');
      a.href = `${res.serverFileUrl}?download=1`;
      a.download = res.archivoNombre || `${res.titulo}.pdf`;
      a.click();
      return;
    }
    if (res.hasLocalBlob) {
      const blob = await getBiblioFileBlob(res.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.archivoNombre || `${res.titulo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }
    if (res.archivoDataUrl) {
      const a = document.createElement('a');
      a.href = res.archivoDataUrl;
      a.download = res.archivoNombre || `${res.titulo}.pdf`;
      a.click();
      return;
    }
    if (res.enlaceUrl) {
      const driveIdMatch = res.enlaceUrl.match(
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
      );
      const target = driveIdMatch
        ? `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`
        : res.enlaceUrl;
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    const mat = orderedTree.find((m) => m.id === res.materiaId);
    const textBlob = new Blob(
      [`${res.titulo}\n${mat ? `${mat.nombre}\n` : ''}\n${res.contenido || ''}`],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(textBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${res.titulo.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickShareResource = async (res: BiblioRecurso) => {
    const mat = orderedTree.find((m) => m.id === res.materiaId);
    const shareText = [res.titulo, mat?.nombre, res.enlaceUrl || res.contenido || res.descripcion]
      .filter(Boolean)
      .join('\n');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: res.titulo,
          text: shareText.slice(0, 600),
          url: res.enlaceUrl || undefined,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setStatusBanner(`"${res.titulo}" copiado para compartir.`);
    } catch {
      handleOpenViewer(res.id);
    }
  };

  const handleMoveOrderInTema = (temaId: string, resId: string, dir: -1 | 1) => {
    const inTema = resources
      .filter((r) => r.temaId === temaId)
      .sort((a, b) => a.orden - b.orden);
    const idx = inTema.findIndex((r) => r.id === resId);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= inTema.length) return;
    const copy = [...inTema];
    const tmp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = tmp;
    const reindexed = copy.map((item, i) => ({ ...item, orden: i + 1 }));
    const byId = new Map(reindexed.map((r) => [r.id, r]));
    setResources((prev) => prev.map((r) => byId.get(r.id) || r));
  };

  // Guardar PDF desde Drive (en Bibliografía) hacia Biblioteca de Apuntes
  const handleImportDriveToApuntes = (
    entry: DriveEntry,
    libraryLabel: string,
    subjectHint?: string
  ) => {
    const hint = (subjectHint || '').toLowerCase();
    const matchedMat =
      orderedTree.find(
        (m) =>
          m.nombre.toLowerCase().includes(hint) ||
          hint.includes(m.nombre.toLowerCase().split(' ')[0])
      ) || orderedTree[0];

    if (!matchedMat) return;
    const unit = matchedMat.unidades[0];
    const tema = unit?.temas[0];
    if (!unit || !tema) return;

    const today = new Date().toISOString().slice(0, 10);
    const created: BiblioRecurso = {
      id: `br-drive-${Date.now().toString(36)}`,
      materiaId: matchedMat.id,
      unidadId: unit.id,
      temaId: tema.id,
      tipo: 'pdf',
      titulo: entry.title.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim(),
      descripcion: `Importado de ${libraryLabel}${subjectHint ? ` · ${subjectHint}` : ''}`,
      etiquetas: ['Drive', libraryLabel],
      favorito: false,
      orden: resources.length + 1,
      enlaceUrl: entry.url,
      createdAt: today,
      updatedAt: today,
    };
    handleCreateResource(created);
  };

  const savedUrlsSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of resources) {
      if (r.enlaceUrl) s.add(r.enlaceUrl);
    }
    return s;
  }, [resources]);

  const savedSharedIds = useMemo(() => {
    const ids = new Set<string>();
    apuntes.forEach((a) => a.sharedId && ids.add(a.sharedId));
    resources.forEach((r) => r.sharedId && ids.add(r.sharedId));
    flashcards.forEach((f) => f.sharedId && ids.add(f.sharedId));
    preguntas.forEach((p) => p.sharedId && ids.add(p.sharedId));
    return ids;
  }, [apuntes, resources, flashcards, preguntas]);

  // Unidades disponibles en filtro según materia elegida
  const filterMateriaObj = useMemo(
    () => orderedTree.find((m) => m.id === filterMateriaId) || null,
    [orderedTree, filterMateriaId]
  );

  // Detectar si hay búsqueda o filtro activo en vista general
  const hasGlobalFilter = Boolean(
    searchQuery.trim() ||
      filterMateriaId !== 'todas' ||
      filterUnidadId !== 'todas' ||
      filterTipo !== 'todos' ||
      onlyFavoritos
  );

  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((res) => {
      const mat = orderedTree.find((m) => m.id === res.materiaId);
      if (filterAnio !== 'todos' && mat?.anio !== filterAnio) return false;
      if (filterMateriaId !== 'todas' && res.materiaId !== filterMateriaId) {
        return false;
      }
      if (filterUnidadId !== 'todas' && res.unidadId !== filterUnidadId) {
        return false;
      }
      if (filterTipo !== 'todos' && res.tipo !== filterTipo) return false;
      if (onlyFavoritos && !res.favorito) return false;
      if (q) {
        const unit = mat?.unidades.find((u) => u.id === res.unidadId);
        const tema = unit?.temas.find((t) => t.id === res.temaId);
        const hay = [
          res.titulo,
          res.descripcion || '',
          res.contenido || '',
          res.archivoNombre || '',
          mat?.nombre || '',
          unit?.titulo || '',
          tema?.titulo || '',
          ...res.etiquetas,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    resources,
    orderedTree,
    searchQuery,
    filterAnio,
    filterMateriaId,
    filterUnidadId,
    filterTipo,
    onlyFavoritos,
  ]);

  // Materias filtradas por Año (y texto si se busca nombre de materia)
  const visibleMateriasCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orderedTree.filter((mat) => {
      if (filterAnio !== 'todos' && mat.anio !== filterAnio) return false;
      if (filterMateriaId !== 'todas' && mat.id !== filterMateriaId) return false;
      if (q) {
        const inMat =
          mat.nombre.toLowerCase().includes(q) ||
          mat.unidades.some(
            (u) =>
              u.titulo.toLowerCase().includes(q) ||
              u.temas.some((t) => t.titulo.toLowerCase().includes(q))
          );
        const hasMatchingRes = filteredResources.some((r) => r.materiaId === mat.id);
        return inMat || hasMatchingRes;
      }
      return true;
    });
  }, [orderedTree, filterAnio, filterMateriaId, searchQuery, filteredResources]);

  const favoriteResources = useMemo(
    () => resources.filter((r) => r.favorito),
    [resources]
  );

  const recentResources = useMemo(
    () =>
      recentConsulted
        .map((item) => ({
          entry: item,
          resource: resources.find((r) => r.id === item.resourceId),
        }))
        .filter((x): x is { entry: RecentConsultedItem; resource: BiblioRecurso } =>
          Boolean(x.resource)
        )
        .slice(0, 5),
    [recentConsulted, resources]
  );

  // Estadísticas por materia
  const resourceStatsByMateria = useMemo(() => {
    const map: Record<string, { count: number; tipos: Set<RecursoTipo> }> = {};
    for (const r of resources) {
      if (!map[r.materiaId]) {
        map[r.materiaId] = { count: 0, tipos: new Set() };
      }
      map[r.materiaId].count += 1;
      map[r.materiaId].tipos.add(r.tipo);
    }
    return map;
  }, [resources]);

  // Recursos del tema actual dentro de una materia seleccionada
  const currentTemaResources = useMemo(() => {
    if (!selectedTema) return [];
    const q = searchQuery.trim().toLowerCase();
    return resources
      .filter((r) => {
        if (r.temaId !== selectedTema.id) return false;
        if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false;
        if (onlyFavoritos && !r.favorito) return false;
        if (q) {
          const hay = [
            r.titulo,
            r.descripcion || '',
            r.contenido || '',
            ...r.etiquetas,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.orden - b.orden);
  }, [resources, selectedTema, filterTipo, onlyFavoritos, searchQuery]);

  const handleOpenMateria = (mat: BiblioMateriaNode) => {
    setSelectedMateriaId(mat.id);
    const firstU = mat.unidades[0];
    setSelectedUnidadId(firstU?.id || null);
    setSelectedTemaId(firstU?.temas[0]?.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddQuickUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMateria || !quickUnitTitle.trim()) return;
    const baseId = Date.now().toString(36);
    const createdUnit = {
      id: `bu-${baseId}`,
      titulo: quickUnitTitle.trim(),
      orden: selectedMateria.unidades.length + 1,
      temas: [
        {
          id: `bt-${baseId}-1`,
          titulo: 'Tema 1 · Desarrollo',
          orden: 1,
        },
      ],
    };
    setTree((prev) =>
      prev.map((m) =>
        m.id === selectedMateria.id
          ? { ...m, unidades: [...m.unidades, createdUnit] }
          : m
      )
    );
    setSelectedUnidadId(createdUnit.id);
    setSelectedTemaId(createdUnit.temas[0].id);
    setQuickUnitTitle('');
    setShowQuickUnitForm(false);
  };

  const handleAddQuickTema = (e: React.FormEvent, unitId: string) => {
    e.preventDefault();
    if (!selectedMateria || !quickTemaTitle.trim()) return;
    const newTema = {
      id: `bt-${Date.now().toString(36)}`,
      titulo: quickTemaTitle.trim(),
      orden:
        (selectedMateria.unidades.find((u) => u.id === unitId)?.temas.length || 0) + 1,
    };
    setTree((prev) =>
      prev.map((m) =>
        m.id === selectedMateria.id
          ? {
              ...m,
              unidades: m.unidades.map((u) =>
                u.id === unitId ? { ...u, temas: [...u.temas, newTema] } : u
              ),
            }
          : m
      )
    );
    setSelectedUnidadId(unitId);
    setSelectedTemaId(newTema.id);
    setQuickTemaTitle('');
    setAddingTemaForUnitId(null);
  };

  const handleImportOfflineBundle = (file: File | undefined) => {
    if (!file || !onImportBackupBundle) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as {
          apuntes?: ApunteNote[];
          flashcards?: FlashcardItem[];
          preguntas?: PreguntaBanco[];
        };
        onImportBackupBundle(parsed);
        setStatusBanner(
          `Respaldo importado: ${parsed.apuntes?.length || 0} apuntes · ${
            parsed.flashcards?.length || 0
          } flashcards.`
        );
      } catch {
        setStatusBanner('Archivo JSON de respaldo inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportOfflineBundle = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      apuntes,
      flashcards,
      preguntas,
      biblioTree: tree,
      biblioResources: resources,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dental-archive-biblioteca-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusBanner('Respaldo completo (.json) descargado.');
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#F8F5F1] text-[#261F1D]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* CABECERA EDITORIAL + NAVEGACIÓN SEPARADA */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6DDD6] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#736B66]">
              <WifiOff size={13} className="text-[#5D7561]" />
              <span>Biblioteca Universitaria Digital · Acceso offline</span>
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#653044] sm:text-[34px]">
              Biblioteca de Apuntes
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkUploadOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#B8798E] bg-[#E9D9DC]/55 px-4 text-xs font-semibold text-[#653044] transition-colors hover:bg-[#E9D9DC] whitespace-nowrap"
            >
              <UploadCloud size={15} />
              <span>Carga masiva (.ZIP / múltiples)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUploadDefaultTipo('pdf');
                setUploadModalOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#653044] px-4 text-xs font-semibold text-white shadow-[0_4px_14px_-4px_rgba(101,48,68,0.4)] transition-colors hover:bg-[#522436] whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Subir material / crear apunte</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E6DDD6] bg-white px-3.5 text-xs font-semibold text-[#653044] shadow-[0_2px_10px_-4px_rgba(101,48,68,0.08)] transition-colors hover:bg-[#E9D9DC]/40 whitespace-nowrap"
            >
              <Settings2 size={14} />
              <span>Administrar</span>
            </button>
          </div>
        </header>

        {/* SEPARACIÓN CLARA DE ESPACIOS: Apuntes vs Bibliografía vs Práctica */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-[#E6DDD6] bg-white p-1 shadow-[0_2px_12px_-4px_rgba(101,48,68,0.06)]">
            <button
              type="button"
              onClick={() => setMainSection('biblioteca')}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap ${
                mainSection === 'biblioteca'
                  ? 'bg-[#653044] text-white'
                  : 'text-[#5E5753] hover:text-[#653044]'
              }`}
            >
              <BookOpen size={14} />
              <span>Biblioteca de Apuntes</span>
            </button>

            <button
              type="button"
              onClick={() => setMainSection('bibliografia')}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap ${
                mainSection === 'bibliografia'
                  ? 'bg-[#653044] text-white'
                  : 'text-[#5E5753] hover:text-[#653044]'
              }`}
            >
              <BookMarked size={14} />
              <span>Bibliografía Académica y Referencias</span>
            </button>

            <button
              type="button"
              onClick={() => setMainSection('practica')}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap ${
                mainSection === 'practica'
                  ? 'bg-[#653044] text-white'
                  : 'text-[#5E5753] hover:text-[#653044]'
              }`}
            >
              <Brain size={14} />
              <span>Práctica y Repaso</span>
            </button>
          </div>

          {statusBanner && (
            <span className="text-xs font-semibold text-[#2E3B2D]">
              {statusBanner}
            </span>
          )}
        </div>

        {/* ============================================================
            SECCIÓN 1: BIBLIOTECA DE APUNTES REDISEÑADA
        ============================================================ */}
        {mainSection === 'biblioteca' && (
          <div className="space-y-6">
            {/* Buscador General + Filtros por Materia, Unidad y Tipo */}
            <section className="space-y-3 rounded-2xl border border-[#E6DDD6] bg-white p-4 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)] sm:p-5">
              <div className="grid gap-3 md:grid-cols-12">
                <div className="relative md:col-span-5">
                  <Search
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#736B66]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscador general: materias, unidades, temas, PDFs o apuntes..."
                    className="h-10 w-full rounded-xl border border-[#E6DDD6] bg-[#F8F5F1]/70 pr-3 pl-10 text-xs text-[#261F1D] outline-none transition-colors focus:border-[#653044] focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <select
                    aria-label="Filtrar por materia"
                    value={filterMateriaId}
                    onChange={(e) => {
                      setFilterMateriaId(e.target.value);
                      setFilterUnidadId('todas');
                    }}
                    className="h-10 w-full rounded-xl border border-[#E6DDD6] bg-white px-3 text-xs font-medium text-[#261F1D]"
                  >
                    <option value="todas">Todas las materias</option>
                    {orderedTree.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.anio}° · {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <select
                    aria-label="Filtrar por unidad"
                    value={filterUnidadId}
                    disabled={!filterMateriaObj}
                    onChange={(e) => setFilterUnidadId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#E6DDD6] bg-white px-3 text-xs font-medium text-[#261F1D] disabled:opacity-50"
                  >
                    <option value="todas">
                      {filterMateriaObj ? 'Todas las unidades' : 'Unidad (elegí materia)'}
                    </option>
                    {(filterMateriaObj?.unidades || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    aria-label="Filtrar por tipo de recurso"
                    value={filterTipo}
                    onChange={(e) =>
                      setFilterTipo(e.target.value as 'todos' | RecursoTipo)
                    }
                    className="h-10 w-full rounded-xl border border-[#E6DDD6] bg-white px-3 text-xs font-medium text-[#261F1D]"
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="pdf">PDFs</option>
                    <option value="apunte">Apuntes</option>
                    <option value="resumen">Resúmenes</option>
                    <option value="ficha">Fichas</option>
                    <option value="imagen">Imágenes</option>
                  </select>
                </div>
              </div>

              {/* Filtros rápidos por Año y Favoritos */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#736B66]">
                    <SlidersHorizontal size={12} />
                    <span>Año:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterAnio('todos')}
                    className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                      filterAnio === 'todos'
                        ? 'bg-[#653044] text-white'
                        : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                    }`}
                  >
                    Todos
                  </button>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setFilterAnio(y)}
                      className={`h-8 rounded-lg px-2.5 text-xs font-semibold tabular-nums transition-colors ${
                        filterAnio === y
                          ? 'bg-[#653044] text-white'
                          : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                      }`}
                    >
                      {y}°
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setOnlyFavoritos((v) => !v)}
                    className={`ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      onlyFavoritos
                        ? 'border-[#B8798E] bg-[#E9D9DC]/70 text-[#653044]'
                        : 'border-[#E6DDD6] bg-white text-[#5E5753] hover:bg-[#F8F5F1]'
                    }`}
                  >
                    <Star size={13} fill={onlyFavoritos ? 'currentColor' : 'none'} />
                    <span>Favoritos ({favoriteResources.length})</span>
                  </button>
                </div>

                {(hasGlobalFilter || filterAnio !== 'todos') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterAnio('todos');
                      setFilterMateriaId('todas');
                      setFilterUnidadId('todas');
                      setFilterTipo('todos');
                      setOnlyFavoritos(false);
                    }}
                    className="text-xs font-semibold text-[#653044] hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </section>

            {/* VISTA INTERNA DE UNA MATERIA (UNIDADES -> TEMAS -> RECURSOS) */}
            {selectedMateria ? (
              <div className="space-y-5">
                {/* Breadcrumb y cabecera de la Materia */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DDD6] bg-white px-5 py-4 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)]">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMateriaId(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#653044] hover:underline"
                    >
                      <ArrowLeft size={14} />
                      <span>Volver a todas las materias</span>
                    </button>
                    <h2 className="font-serif text-2xl font-semibold text-[#653044]">
                      {selectedMateria.nombre}
                    </h2>
                    <p className="text-xs text-[#736B66]">
                      {selectedMateria.anio}° Año
                      <span aria-hidden="true"> · </span>
                      <span className="tabular-nums">
                        {selectedMateria.unidades.length} unidades
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span className="tabular-nums">
                        {resourceStatsByMateria[selectedMateria.id]?.count || 0} recursos
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickUnitForm((v) => !v)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E6DDD6] bg-[#F8F5F1] px-3 text-xs font-semibold text-[#653044] hover:bg-[#E9D9DC]/50"
                    >
                      <FolderPlus size={14} />
                      <span>Nueva unidad</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkUploadOpen(true)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#B8798E] bg-[#E9D9DC]/45 px-3 text-xs font-semibold text-[#653044] hover:bg-[#E9D9DC]/80"
                    >
                      <UploadCloud size={14} />
                      <span>Carga masiva</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadDefaultTipo('pdf');
                        setUploadModalOpen(true);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#653044] px-3.5 text-xs font-semibold text-white hover:bg-[#522436]"
                    >
                      <Plus size={14} />
                      <span>Subir a este tema</span>
                    </button>
                  </div>
                </div>

                {showQuickUnitForm && (
                  <form
                    onSubmit={handleAddQuickUnit}
                    className="flex flex-wrap gap-2 rounded-2xl border border-[#E9D9DC] bg-white p-4"
                  >
                    <input
                      type="text"
                      value={quickUnitTitle}
                      onChange={(e) => setQuickUnitTitle(e.target.value)}
                      placeholder={`Título de la nueva unidad en ${selectedMateria.nombre}...`}
                      className="h-9 flex-1 rounded-lg border border-[#E6DDD6] px-3 text-xs outline-none focus:border-[#653044]"
                    />
                    <button
                      type="submit"
                      className="h-9 rounded-lg bg-[#653044] px-4 text-xs font-semibold text-white"
                    >
                      Crear unidad
                    </button>
                  </form>
                )}

                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Columna izquierda: Unidades y Temas */}
                  <aside className="space-y-3 lg:col-span-4">
                    {selectedMateria.unidades
                      .slice()
                      .sort((a, b) => a.orden - b.orden)
                      .map((unit) => {
                        const isUnitActive = selectedUnidad?.id === unit.id;
                        return (
                          <div
                            key={unit.id}
                            className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                              isUnitActive
                                ? 'border-[#B8798E] shadow-[0_4px_18px_-6px_rgba(101,48,68,0.12)]'
                                : 'border-[#E6DDD6]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUnidadId(unit.id);
                                if (unit.temas[0]) setSelectedTemaId(unit.temas[0].id);
                              }}
                              className={`flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors ${
                                isUnitActive ? 'bg-[#E9D9DC]/35' : 'hover:bg-[#F8F5F1]'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="font-serif text-sm font-semibold text-[#653044]">
                                  {unit.titulo}
                                </p>
                                {unit.descripcion && (
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-[#736B66]">
                                    {unit.descripcion}
                                  </p>
                                )}
                              </div>
                              <ChevronRight
                                size={15}
                                className={`shrink-0 text-[#653044] transition-transform ${
                                  isUnitActive ? 'rotate-90' : ''
                                }`}
                              />
                            </button>

                            {isUnitActive && (
                              <div className="border-t border-[#F0EAE4] px-3 py-2.5 space-y-1">
                                {unit.temas
                                  .slice()
                                  .sort((a, b) => a.orden - b.orden)
                                  .map((tema) => {
                                    const isTemaActive = selectedTema?.id === tema.id;
                                    const count = resources.filter(
                                      (r) => r.temaId === tema.id
                                    ).length;
                                    return (
                                      <button
                                        key={tema.id}
                                        type="button"
                                        onClick={() => setSelectedTemaId(tema.id)}
                                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                                          isTemaActive
                                            ? 'bg-[#653044] font-semibold text-white'
                                            : 'text-[#4A4340] hover:bg-[#F8F5F1]'
                                        }`}
                                      >
                                        <span className="line-clamp-2">{tema.titulo}</span>
                                        <span
                                          className={`shrink-0 font-mono text-[11px] tabular-nums ${
                                            isTemaActive ? 'text-[#E9D9DC]' : 'text-[#736B66]'
                                          }`}
                                        >
                                          {count}
                                        </span>
                                      </button>
                                    );
                                  })}

                                {addingTemaForUnitId === unit.id ? (
                                  <form
                                    onSubmit={(e) => handleAddQuickTema(e, unit.id)}
                                    className="flex gap-1.5 pt-1.5"
                                  >
                                    <input
                                      type="text"
                                      value={quickTemaTitle}
                                      onChange={(e) => setQuickTemaTitle(e.target.value)}
                                      placeholder="Nuevo tema..."
                                      className="h-8 flex-1 rounded-lg border border-[#E6DDD6] px-2.5 text-xs outline-none focus:border-[#653044]"
                                    />
                                    <button
                                      type="submit"
                                      className="h-8 rounded-lg bg-[#653044] px-2.5 text-xs font-semibold text-white"
                                    >
                                      +
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setAddingTemaForUnitId(unit.id)}
                                    className="mt-1 inline-flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[#653044] hover:bg-[#F8F5F1]"
                                  >
                                    <Plus size={12} />
                                    <span>Agregar tema</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </aside>

                  {/* Columna derecha: Recursos del Tema Seleccionado */}
                  <div className="space-y-4 lg:col-span-8">
                    {selectedUnidad && selectedTema ? (
                      <div className="space-y-4 rounded-2xl border border-[#E6DDD6] bg-white p-5 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)]">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0EAE4] pb-4">
                          <div>
                            <p className="text-xs font-medium text-[#736B66]">
                              {selectedUnidad.titulo}
                            </p>
                            <h3 className="mt-0.5 font-serif text-xl font-semibold text-[#653044]">
                              {selectedTema.titulo}
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'todos', label: 'Todos' },
                                { id: 'pdf', label: 'PDFs' },
                                { id: 'apunte', label: 'Apuntes' },
                                { id: 'resumen', label: 'Resúmenes' },
                                { id: 'ficha', label: 'Fichas' },
                                { id: 'imagen', label: 'Imágenes' },
                              ] as const
                            ).map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setFilterTipo(t.id)}
                                className={`h-8 rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${
                                  filterTipo === t.id
                                    ? 'bg-[#653044] text-white'
                                    : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {currentTemaResources.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-[#D8CDC4] bg-[#F8F5F1]/60 px-6 py-12 text-center">
                            <BookOpen size={26} className="mx-auto text-[#B8798E]" />
                            <p className="mt-3 font-serif text-base font-semibold text-[#653044]">
                              Este tema todavía está esperando tu primer material
                            </p>
                            <p className="mt-1 text-xs text-[#736B66]">
                              Podés subir un PDF, una lámina clínica, escribir un resumen o armar una ficha de estudio.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDefaultTipo('pdf');
                                  setUploadModalOpen(true);
                                }}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#653044] px-4 text-xs font-semibold text-white hover:bg-[#522436]"
                              >
                                <FileUp size={14} />
                                <span>Subir PDF / Archivo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setBulkUploadOpen(true)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#B8798E] bg-[#E9D9DC]/45 px-4 text-xs font-semibold text-[#653044] hover:bg-[#E9D9DC]/80"
                              >
                                <UploadCloud size={14} />
                                <span>Carga masiva (.ZIP)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDefaultTipo('resumen');
                                  setUploadModalOpen(true);
                                }}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E6DDD6] bg-white px-4 text-xs font-semibold text-[#653044] hover:bg-[#F8F5F1]"
                              >
                                <FileText size={14} />
                                <span>Escribir resumen</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {currentTemaResources.map((res, idx) => {
                              const meta = TIPO_META[res.tipo];
                              const Icon = meta.icon;
                              return (
                                <article
                                  key={res.id}
                                  className="flex flex-col justify-between gap-3 rounded-xl border border-[#E6DDD6] bg-[#F8F5F1]/45 p-4 transition-colors hover:border-[#B8798E]/70 hover:bg-white sm:flex-row sm:items-center"
                                >
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.toneClass}`}
                                      >
                                        <Icon size={12} />
                                        <span>{meta.short}</span>
                                      </span>
                                      <span className="text-[11px] text-[#736B66]">
                                        {res.updatedAt}
                                        {res.archivoSize
                                          ? ` · ${formatFileSize(res.archivoSize)}`
                                          : ''}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenViewer(res.id)}
                                      className="block text-left font-serif text-base font-semibold text-[#653044] hover:underline"
                                    >
                                      {res.titulo}
                                    </button>

                                    {(res.descripcion || res.etiquetas.length > 0) && (
                                      <p className="line-clamp-1 text-xs text-[#736B66]">
                                        {res.descripcion}
                                        {res.descripcion && res.etiquetas.length > 0
                                          ? ' · '
                                          : ''}
                                        {res.etiquetas.join(' · ')}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenViewer(res.id)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#653044] px-3 text-xs font-semibold text-white hover:bg-[#522436]"
                                    >
                                      <Eye size={13} />
                                      <span>Ver</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void handleDownloadResource(res)}
                                      aria-label={`Descargar ${res.titulo}`}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] bg-white text-[#653044] hover:bg-[#F8F5F1]"
                                    >
                                      <Download size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void handleQuickShareResource(res)}
                                      aria-label={`Compartir ${res.titulo}`}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] bg-white text-[#653044] hover:bg-[#F8F5F1]"
                                    >
                                      <Share2 size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleFavorite(res)}
                                      aria-label="Marcar favorito"
                                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                                        res.favorito
                                          ? 'border-[#B8798E] bg-[#E9D9DC]/70 text-[#653044]'
                                          : 'border-[#E6DDD6] bg-white text-[#736B66] hover:text-[#653044]'
                                      }`}
                                    >
                                      <Star
                                        size={13}
                                        fill={res.favorito ? 'currentColor' : 'none'}
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() =>
                                        handleMoveOrderInTema(selectedTema.id, res.id, -1)
                                      }
                                      aria-label="Subir orden"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] bg-white text-[#736B66] hover:text-[#653044] disabled:opacity-30"
                                    >
                                      <ArrowUp size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={idx === currentTemaResources.length - 1}
                                      onClick={() =>
                                        handleMoveOrderInTema(selectedTema.id, res.id, 1)
                                      }
                                      aria-label="Bajar orden"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] bg-white text-[#736B66] hover:text-[#653044] disabled:opacity-30"
                                    >
                                      <ArrowDown size={13} />
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[#E6DDD6] bg-white p-8 text-center text-xs text-[#736B66]">
                        Seleccioná o creá una unidad y un tema en el panel izquierdo.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* VISTA PRINCIPAL DE LA BIBLIOTECA */
              <div className="space-y-7">
                {/* RESULTADOS DE BÚSQUEDA / FILTRO ACTIVO */}
                {hasGlobalFilter && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-serif text-xl font-semibold text-[#653044]">
                        Resultados encontrados ({filteredResources.length})
                      </h2>
                    </div>

                    {filteredResources.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#D8CDC4] bg-white p-8 text-center text-xs text-[#736B66]">
                        No hay materiales que coincidan con esos filtros. Podés limpiar los filtros o subir uno nuevo.
                      </div>
                    ) : (
                      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                        {filteredResources.map((res) => {
                          const meta = TIPO_META[res.tipo];
                          const Icon = meta.icon;
                          const mat = orderedTree.find((m) => m.id === res.materiaId);
                          const unit = mat?.unidades.find((u) => u.id === res.unidadId);
                          return (
                            <article
                              key={res.id}
                              className="flex flex-col justify-between rounded-2xl border border-[#E6DDD6] bg-white p-4 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)]"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.toneClass}`}
                                  >
                                    <Icon size={12} />
                                    <span>{meta.short}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFavorite(res)}
                                    aria-label="Favorito"
                                    className="text-[#B8798E] hover:text-[#653044]"
                                  >
                                    <Star
                                      size={14}
                                      fill={res.favorito ? 'currentColor' : 'none'}
                                    />
                                  </button>
                                </div>

                                <h3 className="font-serif text-base font-semibold leading-snug text-[#653044]">
                                  {res.titulo}
                                </h3>

                                <p className="text-[11px] text-[#736B66]">
                                  {mat?.nombre}
                                  {unit ? ` · ${unit.titulo}` : ''}
                                </p>
                              </div>

                              <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F0EAE4] pt-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenViewer(res.id)}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#653044] px-3 text-xs font-semibold text-white hover:bg-[#522436]"
                                >
                                  <Eye size={13} />
                                  <span>Abrir</span>
                                </button>
                                <div className="flex items-center gap-1.5">
                                  {res.enlaceUrl && (
                                    <a
                                      href={res.enlaceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label="Abrir enlace externo"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#F8F5F1]"
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => void handleDownloadResource(res)}
                                    aria-label="Descargar"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#F8F5F1]"
                                  >
                                    <Download size={12} />
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                {/* ACCESOS CURADOS: ÚLTIMOS CONSULTADOS Y FAVORITOS */}
                {!hasGlobalFilter && (recentResources.length > 0 || favoriteResources.length > 0) && (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {/* Últimos consultados */}
                    <section className="rounded-2xl border border-[#E6DDD6] bg-white p-5 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-[#653044]" />
                          <h2 className="font-serif text-lg font-semibold text-[#653044]">
                            Últimos consultados
                          </h2>
                        </div>
                        <span className="text-xs text-[#736B66] tabular-nums">
                          {recentResources.length} recientes
                        </span>
                      </div>

                      {recentResources.length === 0 ? (
                        <p className="py-4 text-xs text-[#736B66]">
                          Los apuntes, PDFs o láminas que abras aparecerán acá para retomar al instante.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#F0EAE4]">
                          {recentResources.map(({ resource }) => {
                            const mat = orderedTree.find(
                              (m) => m.id === resource.materiaId
                            );
                            const meta = TIPO_META[resource.tipo];
                            return (
                              <button
                                key={resource.id}
                                type="button"
                                onClick={() => handleOpenViewer(resource.id)}
                                className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[#F8F5F1]/80 px-1.5 rounded-lg"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-[#261F1D]">
                                    {resource.titulo}
                                  </p>
                                  <p className="truncate text-[11px] text-[#736B66]">
                                    {meta.short} · {mat?.nombre || 'Materia'}
                                  </p>
                                </div>
                                <span className="shrink-0 text-[11px] font-semibold text-[#653044]">
                                  Abrir
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Favoritos */}
                    <section className="rounded-2xl border border-[#E6DDD6] bg-white p-5 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star size={16} className="text-[#B8798E]" fill="currentColor" />
                          <h2 className="font-serif text-lg font-semibold text-[#653044]">
                            Materiales favoritos
                          </h2>
                        </div>
                        {favoriteResources.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setOnlyFavoritos(true)}
                            className="text-xs font-semibold text-[#653044] hover:underline"
                          >
                            Ver todos
                          </button>
                        )}
                      </div>

                      {favoriteResources.length === 0 ? (
                        <p className="py-4 text-xs text-[#736B66]">
                          Marcá con estrella tus resúmenes o PDFs clave para parciales.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#F0EAE4]">
                          {favoriteResources.slice(0, 5).map((res) => {
                            const mat = orderedTree.find((m) => m.id === res.materiaId);
                            const meta = TIPO_META[res.tipo];
                            return (
                              <button
                                key={res.id}
                                type="button"
                                onClick={() => handleOpenViewer(res.id)}
                                className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[#F8F5F1]/80 px-1.5 rounded-lg"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-[#261F1D]">
                                    {res.titulo}
                                  </p>
                                  <p className="truncate text-[11px] text-[#736B66]">
                                    {meta.short} · {mat?.nombre || 'Materia'}
                                  </p>
                                </div>
                                <span className="shrink-0 text-[11px] font-semibold text-[#653044]">
                                  Ver
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* MATERIAS ORGANIZADAS EN TARJETAS VISUALES */}
                <section className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="font-serif text-2xl font-semibold text-[#653044]">
                        Materias de la carrera
                      </h2>
                      <p className="text-xs text-[#736B66]">
                        Elegí una asignatura para explorar sus unidades, temas y documentos organizados.
                      </p>
                    </div>
                    <span className="text-xs font-medium text-[#736B66] tabular-nums">
                      {visibleMateriasCards.length} asignaturas · {resources.length} recursos
                    </span>
                  </div>

                  {visibleMateriasCards.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#D8CDC4] bg-white p-10 text-center text-xs text-[#736B66]">
                      No se encontraron materias con ese criterio.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleMateriasCards.map((mat) => {
                        const stats = resourceStatsByMateria[mat.id];
                        const resCount = stats?.count || 0;
                        const accentHeader =
                          mat.acento === 'salvia'
                            ? 'bg-[#A1B3A0]/35 text-[#2E3B2D]'
                            : mat.acento === 'rosa'
                              ? 'bg-[#E9D9DC]/80 text-[#653044]'
                              : 'bg-[#653044]/10 text-[#653044]';

                        return (
                          <button
                            key={mat.id}
                            type="button"
                            onClick={() => handleOpenMateria(mat)}
                            className="group flex flex-col justify-between rounded-2xl border border-[#E6DDD6] bg-white p-5 text-left shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#B8798E] hover:shadow-[0_10px_28px_-8px_rgba(101,48,68,0.14)]"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${accentHeader}`}
                                >
                                  {mat.anio}° Año
                                </span>
                                <span className="text-[11px] font-medium text-[#736B66] tabular-nums">
                                  {mat.unidades.length}{' '}
                                  {mat.unidades.length === 1 ? 'unidad' : 'unidades'} ·{' '}
                                  {resCount} {resCount === 1 ? 'recurso' : 'recursos'}
                                </span>
                              </div>

                              <h3 className="font-serif text-lg font-semibold leading-snug text-[#653044] group-hover:text-[#522436]">
                                {mat.nombre}
                              </h3>

                              <div className="space-y-1 border-t border-[#F2ECE6] pt-2.5">
                                {mat.unidades.slice(0, 2).map((u) => (
                                  <p
                                    key={u.id}
                                    className="line-clamp-1 text-xs text-[#736B66]"
                                  >
                                    {u.titulo}
                                  </p>
                                ))}
                                {mat.unidades.length > 2 && (
                                  <p className="text-[11px] font-medium text-[#B8798E]">
                                    + {mat.unidades.length - 2} unidades más
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between pt-2 text-xs font-semibold text-[#653044]">
                              <span>Explorar unidades</span>
                              <ChevronRight
                                size={15}
                                className="transition-transform group-hover:translate-x-0.5"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            SECCIÓN 2: BIBLIOGRAFÍA ACADÉMICA Y REFERENCIAS CIENTÍFICAS
        ============================================================ */}
        {mainSection === 'bibliografia' && (
          <BibliografiaAcademicaPanel
            references={references}
            onChangeReferences={setReferences}
            materias={materias}
            savedUrls={savedUrlsSet}
            savedSharedIds={savedSharedIds}
            onSaveDriveToLibrary={handleImportDriveToApuntes}
            onImportApunte={(note) => {
              onAddApunte(note);
              setStatusBanner(`"${note.titulo}" guardado en tu biblioteca.`);
            }}
            onImportFlashcard={onAddFlashcard}
            onImportPregunta={onAddPregunta}
          />
        )}

        {/* ============================================================
            SECCIÓN 3: PRÁCTICA Y REPASO + RESPALDO OFFLINE
        ============================================================ */}
        {mainSection === 'practica' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DDD6] bg-white p-4">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPracticaTab('flashcards')}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                    practicaTab === 'flashcards'
                      ? 'bg-[#653044] text-white'
                      : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                  }`}
                >
                  <Layers size={14} />
                  <span>Flashcards ({flashcards.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPracticaTab('preguntas')}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                    practicaTab === 'preguntas'
                      ? 'bg-[#653044] text-white'
                      : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                  }`}
                >
                  <HelpCircle size={14} />
                  <span>Banco de preguntas ({preguntas.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPracticaTab('repaso')}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                    practicaTab === 'repaso'
                      ? 'bg-[#653044] text-white'
                      : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                  }`}
                >
                  <Brain size={14} />
                  <span>Modo Repaso ({temasRepaso.length})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportOfflineBundle}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs font-semibold text-[#653044] hover:bg-[#F8F5F1]"
                >
                  <Download size={13} />
                  <span>Respaldo JSON</span>
                </button>
                {onImportBackupBundle && (
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs font-semibold text-[#653044] hover:bg-[#F8F5F1]">
                    <Upload size={13} />
                    <span>Importar</span>
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => handleImportOfflineBundle(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {practicaTab === 'flashcards' && (
              <FlashcardsPanel
                cards={flashcards}
                materias={materias}
                defaultAnio={filterAnio === 'todos' ? 1 : filterAnio}
                defaultMateria=""
                flashcardSignals={studySignals.flashcards}
                onMarkFlashcard={onMarkFlashcard}
                onAddCard={onAddFlashcard}
                onToggleFavorito={onToggleFlashcardFavorito}
                onDeleteCard={onDeleteFlashcard}
              />
            )}

            {practicaTab === 'preguntas' && (
              <BancoPreguntasPanel
                preguntas={preguntas}
                materias={materias}
                defaultAnio={filterAnio === 'todos' ? 1 : filterAnio}
                defaultMateria=""
                preguntaSignals={studySignals.preguntas}
                onRecordPreguntaAttempt={onRecordPreguntaAttempt}
                onAddPregunta={onAddPregunta}
                onToggleFavorito={onTogglePreguntaFavorito}
                onDeletePregunta={onDeletePregunta}
              />
            )}

            {practicaTab === 'repaso' && (
              <ModoRepasoPanel
                temas={temasRepaso}
                onResolveTopic={onResolveTopic}
                onResetResolved={onResetResolvedTopics}
                onNavigateTopic={(tema) => {
                  if (tema.origen === 'flashcard') {
                    setPracticaTab('flashcards');
                  } else if (tema.origen === 'pregunta') {
                    setPracticaTab('preguntas');
                  } else {
                    onNavigateRepasoTopic(tema);
                  }
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* MODALES INTEGRADOS */}
      <BiblioDocumentViewer
        resource={viewerResource}
        tree={orderedTree}
        onClose={() => setViewerResourceId(null)}
        onUpdateResource={handleUpdateResource}
        onDeleteResource={handleDeleteResource}
      />

      <BiblioUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        tree={orderedTree}
        defaultMateriaId={selectedMateria?.id || orderedTree[0]?.id}
        defaultUnidadId={selectedUnidad?.id}
        defaultTemaId={selectedTema?.id}
        defaultTipo={uploadDefaultTipo}
        onCreateResource={handleCreateResource}
      />

      <BiblioBulkUploadModal
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        tree={orderedTree}
        defaultMateriaId={selectedMateria?.id || orderedTree[0]?.id}
        defaultUnidadId={selectedUnidad?.id}
        onCompletedBatch={({ newResources, latestTree }) => {
          if (latestTree && latestTree.length > 0) {
            setTree(latestTree);
          }
          setResources((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const uniqueNew = newResources.filter((r) => !existingIds.has(r.id));
            return [...uniqueNew, ...prev];
          });
          newResources.forEach((r) => syncCreateToApuntes(r));
          setStatusBanner(
            `Carga masiva completada: ${newResources.length} ${
              newResources.length === 1 ? 'archivo guardado' : 'archivos guardados'
            } en almacenamiento persistente.`
          );
        }}
      />

      <BiblioAdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        tree={orderedTree}
        resources={resources}
        onChangeTree={setTree}
        onChangeResources={setResources}
        onDeleteResource={handleDeleteResource}
        onResetDefaultCatalog={() => {
          const freshTree = buildInitialBiblioTree(materias);
          setTree(freshTree);
          setResources(buildStarterResources(freshTree, apuntes));
          setSelectedMateriaId(null);
          setStatusBanner('Estructura base restaurada.');
        }}
      />
    </div>
  );
};
