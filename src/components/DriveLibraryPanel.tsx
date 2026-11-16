import React, { useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import {
  CURATED_DRIVE_LIBRARIES,
  type DriveEntry,
  type DriveLibraryRoot,
} from '../data/driveLibraries';

interface BreadcrumbItem {
  id: string;
  title: string;
  url: string;
}

interface DriveLibraryPanelProps {
  externalSearch?: string;
  savedUrls: Set<string>;
  onSaveToLibrary: (entry: DriveEntry, libraryLabel: string, subjectHint?: string) => void;
}

export const DriveLibraryPanel: React.FC<DriveLibraryPanelProps> = ({
  externalSearch = '',
  savedUrls,
  onSaveToLibrary,
}) => {
  const [selectedRootId, setSelectedRootId] = useState<string>(
    CURATED_DRIVE_LIBRARIES[0].id
  );
  const [collapsed, setCollapsed] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [folderCache, setFolderCache] = useState<Record<string, DriveEntry[]>>(() => {
    const initial: Record<string, DriveEntry[]> = {};
    for (const lib of CURATED_DRIVE_LIBRARIES) {
      initial[lib.id] = lib.items;
    }
    return initial;
  });
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<DriveEntry | null>(null);

  const activeRoot: DriveLibraryRoot = useMemo(
    () =>
      CURATED_DRIVE_LIBRARIES.find((l) => l.id === selectedRootId) ||
      CURATED_DRIVE_LIBRARIES[0],
    [selectedRootId]
  );

  useEffect(() => {
    setBreadcrumbs([
      {
        id: activeRoot.id,
        title: activeRoot.title,
        url: activeRoot.driveUrl,
      },
    ]);
    setFolderError('');
    setLocalSearch('');
  }, [activeRoot]);

  const currentCrumb =
    breadcrumbs[breadcrumbs.length - 1] || {
      id: activeRoot.id,
      title: activeRoot.title,
      url: activeRoot.driveUrl,
    };

  const currentItems = folderCache[currentCrumb.id] || [];

  const effectiveQuery = (localSearch || externalSearch).trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!effectiveQuery) return currentItems;
    return currentItems.filter((item) =>
      item.title.toLowerCase().includes(effectiveQuery)
    );
  }, [currentItems, effectiveQuery]);

  const subjectHint =
    breadcrumbs.length > 1 ? breadcrumbs[1].title : activeRoot.shortName;

  const openDriveFolder = async (folder: DriveEntry) => {
    setFolderError('');
    setLocalSearch('');
    setBreadcrumbs((prev) => [
      ...prev,
      { id: folder.id, title: folder.title, url: folder.url },
    ]);

    if (folderCache[folder.id]) {
      return;
    }

    setLoadingFolderId(folder.id);
    try {
      const res = await fetch(`/api/drive/folder/${encodeURIComponent(folder.id)}`);
      const data = (await res.json()) as {
        items?: DriveEntry[];
        error?: string;
      };
      if (!res.ok || !Array.isArray(data.items)) {
        throw new Error(
          data.error || 'No se pudo cargar el contenido de esta carpeta.'
        );
      }
      setFolderCache((prev) => ({
        ...prev,
        [folder.id]: data.items || [],
      }));
    } catch (err) {
      setFolderError(
        err instanceof Error
          ? err.message
          : 'No se pudo listar la carpeta de Drive.'
      );
    } finally {
      setLoadingFolderId(null);
    }
  };

  const handleJumpBreadcrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setFolderError('');
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-rose-50/60 px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-900 text-white">
            <FolderOpen size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-rose-950">
                Bibliotecas Virtuales de Google Drive (FOE · MOI)
              </h2>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                Acceso directo
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Navegá por las carpetas de cada materia, abrí los PDFs acá mismo o guardalos en tu biblioteca personal.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 hover:bg-rose-50"
        >
          <span>{collapsed ? 'Mostrar bibliotecas' : 'Contraer'}</span>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-4 p-4 sm:p-5">
          {/* Selector entre Biblioteca Virtual-FOE y MOI Biblioteca Virtual */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {CURATED_DRIVE_LIBRARIES.map((lib) => {
              const isSelected = lib.id === activeRoot.id;
              return (
                <button
                  key={lib.id}
                  type="button"
                  onClick={() => setSelectedRootId(lib.id)}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'border-rose-900 bg-rose-50/70'
                      : 'border-rose-200/80 bg-[#FAF6F0]/60 hover:bg-rose-50/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isSelected ? 'text-rose-950' : 'text-slate-900'
                        }`}
                      >
                        {lib.title}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {lib.subtitle}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isSelected
                        ? 'bg-rose-900 text-white'
                        : 'bg-white text-rose-900 border border-rose-200'
                    }`}
                  >
                    {lib.items.length} ítems
                  </span>
                </button>
              );
            })}
          </div>

          {/* Barra de ruta + buscador dentro de la carpeta */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-rose-100 bg-[#FAF6F0]/70 px-3.5 py-2.5">
            <nav
              aria-label="Ruta en Google Drive"
              className="flex flex-wrap items-center gap-1 text-xs"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb.id}-${idx}`}>
                    {idx > 0 && (
                      <ChevronRight size={13} className="text-slate-400" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleJumpBreadcrumb(idx)}
                      className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                        isLast
                          ? 'bg-rose-900 text-white'
                          : 'text-rose-900 hover:bg-rose-100'
                      }`}
                    >
                      {crumb.title}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Filtrar carpeta o PDF..."
                  className="h-8 w-44 rounded-lg border border-rose-200 bg-white pr-2.5 pl-7 text-xs text-slate-900 outline-none focus:border-rose-900 sm:w-52"
                />
              </div>
              <a
                href={currentCrumb.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-950 hover:bg-rose-50"
              >
                <span>Abrir en Drive</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Contenido de la carpeta actual */}
          {loadingFolderId === currentCrumb.id ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-[#FAF6F0]/40 py-10 text-xs font-medium text-slate-600">
              <Loader2 size={16} className="animate-spin text-rose-900" />
              <span>Cargando archivos de {currentCrumb.title}...</span>
            </div>
          ) : folderError ? (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-xs">
              <p className="font-semibold text-rose-950">{folderError}</p>
              <p className="text-slate-600">
                También podés explorar esta carpeta directamente con el visor incrustado o en Google Drive:
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={currentCrumb.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-950"
                >
                  <span>Abrir {currentCrumb.title} en Google Drive</span>
                  <ExternalLink size={13} />
                </a>
              </div>
              <iframe
                title={`Vista Google Drive - ${currentCrumb.title}`}
                src={`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(
                  currentCrumb.id
                )}#list`}
                className="h-72 w-full rounded-xl border border-rose-200 bg-white"
              />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rose-200 bg-[#FAF6F0]/40 px-4 py-8 text-center text-xs text-slate-600">
              {effectiveQuery
                ? `No hay carpetas ni archivos que coincidan con "${effectiveQuery}".`
                : 'Esta carpeta no contiene elementos visibles o está vacía.'}
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((entry) => {
                const isSaved = savedUrls.has(entry.url);
                if (entry.isFolder) {
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-rose-200/80 bg-[#FAF6F0]/55 p-3 transition-colors hover:border-rose-300 hover:bg-rose-50/60"
                    >
                      <button
                        type="button"
                        onClick={() => void openDriveFolder(entry)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                          <Folder size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-bold leading-snug text-rose-950">
                            {entry.title}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            Carpeta · Ver PDFs
                          </p>
                        </div>
                      </button>

                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir ${entry.title} en Google Drive`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-slate-500 hover:text-rose-900"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col justify-between gap-2.5 rounded-xl border border-rose-200/80 bg-white p-3.5 transition-colors hover:border-rose-300"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-900">
                        <FileText size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">
                          {entry.title}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                          Archivo PDF / Documento · {subjectHint}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-rose-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(entry)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-900 px-2.5 text-[11px] font-semibold text-white hover:bg-rose-950"
                      >
                        <Eye size={12} />
                        <span>Leer</span>
                      </button>

                      {entry.downloadUrl && (
                        <a
                          href={entry.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
                        >
                          <Download size={12} />
                          <span>Descargar</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onSaveToLibrary(entry, activeRoot.title, subjectHint)
                        }
                        disabled={isSaved}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                          isSaved
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-emerald-200 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-100'
                        }`}
                      >
                        {isSaved ? <Check size={12} /> : <BookmarkPlus size={12} />}
                        <span>{isSaved ? 'Guardado' : 'Guardar'}</span>
                      </button>

                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir ${entry.title} en Drive`}
                        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-900"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visor integrado de PDF de Google Drive */}
          {previewFile && (
            <div className="space-y-2.5 rounded-xl border border-rose-300 bg-rose-50/40 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-rose-950">
                    Vista previa: {previewFile.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-900 hover:bg-rose-50"
                  >
                    <span>Abrir en pestaña</span>
                    <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    aria-label="Cerrar vista previa"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-slate-600 hover:text-rose-900"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <iframe
                title={previewFile.title}
                src={previewFile.previewUrl}
                allow="autoplay"
                className="h-[520px] w-full rounded-lg border border-rose-200 bg-white"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};
