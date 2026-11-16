import React, { useMemo, useState } from 'react';
import {
  BookMarked,
  ExternalLink,
  FlaskConical,
  Library,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import type { DriveEntry } from '../data/driveLibraries';
import type {
  ApunteNote,
  BibliografiaItem,
  FlashcardItem,
  MateriaPlan,
  PreguntaBanco,
} from '../types/dental';
import { BibliotecaCompartidaPanel } from './BibliotecaCompartidaPanel';
import { DriveLibraryPanel } from './DriveLibraryPanel';

interface BibliografiaAcademicaPanelProps {
  references: BibliografiaItem[];
  onChangeReferences: (next: BibliografiaItem[]) => void;
  materias: MateriaPlan[];
  savedUrls: Set<string>;
  savedSharedIds: Set<string>;
  onSaveDriveToLibrary: (
    entry: DriveEntry,
    libraryLabel: string,
    subjectHint?: string
  ) => void;
  onImportApunte: (note: ApunteNote) => void;
  onImportFlashcard: (card: FlashcardItem) => void;
  onImportPregunta: (p: PreguntaBanco) => void;
}

type RefSubTab = 'referencias' | 'repositorios' | 'compartida';

export const BibliografiaAcademicaPanel: React.FC<BibliografiaAcademicaPanelProps> = ({
  references,
  onChangeReferences,
  materias,
  savedUrls,
  savedSharedIds,
  onSaveDriveToLibrary,
  onImportApunte,
  onImportFlashcard,
  onImportPregunta,
}) => {
  const [subTab, setSubTab] = useState<RefSubTab>('referencias');
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | BibliografiaItem['tipo']>('todos');
  const [showAdd, setShowAdd] = useState(false);

  const [tipo, setTipo] = useState<BibliografiaItem['tipo']>('libro');
  const [titulo, setTitulo] = useState('');
  const [autores, setAutores] = useState('');
  const [editorial, setEditorial] = useState('');
  const [anioPub, setAnioPub] = useState('');
  const [isbnDoi, setIsbnDoi] = useState('');
  const [materia, setMateria] = useState('');
  const [enlaceUrl, setEnlaceUrl] = useState('');
  const [notas, setNotas] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return references.filter((ref) => {
      if (filterTipo !== 'todos' && ref.tipo !== filterTipo) return false;
      if (!q) return true;
      return [
        ref.titulo,
        ref.autores,
        ref.editorialOJournal,
        ref.isbnDoi || '',
        ref.materia || '',
        ref.notas || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [references, filterTipo, search]);

  const handleAddReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    const item: BibliografiaItem = {
      id: `ref-${Date.now().toString(36)}`,
      tipo,
      titulo: titulo.trim(),
      autores: autores.trim() || 'Autores varios',
      editorialOJournal: editorial.trim() || 'Publicación académica',
      anioPublicacion: anioPub.trim() || String(new Date().getFullYear()),
      isbnDoi: isbnDoi.trim() || undefined,
      materia: materia.trim() || undefined,
      enlaceUrl: enlaceUrl.trim() || undefined,
      notas: notas.trim() || undefined,
    };
    onChangeReferences([item, ...references]);
    setTitulo('');
    setAutores('');
    setEditorial('');
    setAnioPub('');
    setIsbnDoi('');
    setMateria('');
    setEnlaceUrl('');
    setNotas('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado editorial separado de la Biblioteca de Apuntes */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#E6DDD6] bg-white p-5 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)]">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-[#B8798E]">
            Espacio Científico y Editorial · Separado de tus apuntes de cursada
          </p>
          <h2 className="font-serif text-2xl font-semibold text-[#653044]">
            Bibliografía Académica y Referencias Científicas
          </h2>
          <p className="max-w-2xl text-xs leading-relaxed text-[#736B66]">
            Tratados oficiales de cátedra, artículos indexados con DOI/ISBN, repositorios virtuales de libros (FOE · MOI) y aportes de la comunidad estudiantil.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#F8F5F1] p-1">
          <button
            type="button"
            onClick={() => setSubTab('referencias')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'referencias'
                ? 'bg-[#653044] text-white'
                : 'text-[#5E5753] hover:text-[#653044]'
            }`}
          >
            <BookMarked size={14} />
            <span>Libros y Papers ({references.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('repositorios')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'repositorios'
                ? 'bg-[#653044] text-white'
                : 'text-[#5E5753] hover:text-[#653044]'
            }`}
          >
            <Library size={14} />
            <span>Repositorios FOE · MOI</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('compartida')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'compartida'
                ? 'bg-[#653044] text-white'
                : 'text-[#5E5753] hover:text-[#653044]'
            }`}
          >
            <Users size={14} />
            <span>Comunidad</span>
          </button>
        </div>
      </div>

      {subTab === 'referencias' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DDD6] bg-white p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#736B66]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por libro, autor, editorial, ISBN/DOI o materia..."
                className="h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 pr-3 pl-9 text-xs text-[#261F1D] outline-none focus:border-[#653044]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar referencias por tipo"
                value={filterTipo}
                onChange={(e) =>
                  setFilterTipo(e.target.value as 'todos' | BibliografiaItem['tipo'])
                }
                className="h-9 rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs font-medium text-[#261F1D]"
              >
                <option value="todos">Todas las fuentes</option>
                <option value="libro">Libros de cátedra</option>
                <option value="articulo">Artículos científicos</option>
                <option value="guia">Consensos / Guías</option>
              </select>

              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#653044] px-3.5 text-xs font-semibold text-white hover:bg-[#522436] whitespace-nowrap"
              >
                <Plus size={14} />
                <span>Nueva referencia</span>
              </button>
            </div>
          </div>

          {showAdd && (
            <form
              onSubmit={handleAddReference}
              className="space-y-3 rounded-2xl border border-[#E9D9DC] bg-white p-5 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.08)]"
            >
              <h3 className="font-serif text-base font-semibold text-[#653044]">
                Registrar libro o artículo científico
              </h3>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Tipo
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as BibliografiaItem['tipo'])}
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-2.5 text-xs"
                  >
                    <option value="libro">Libro / Tratado</option>
                    <option value="articulo">Artículo científico (Paper)</option>
                    <option value="guia">Guía / Consenso clínico</option>
                  </select>
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Título completo
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej. Tratado de Operatoria Dental"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Año de publicación
                  </label>
                  <input
                    type="text"
                    value={anioPub}
                    onChange={(e) => setAnioPub(e.target.value)}
                    placeholder="2024"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Autores
                  </label>
                  <input
                    type="text"
                    value={autores}
                    onChange={(e) => setAutores(e.target.value)}
                    placeholder="Apellido, N."
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Editorial o Revista (Journal)
                  </label>
                  <input
                    type="text"
                    value={editorial}
                    onChange={(e) => setEditorial(e.target.value)}
                    placeholder="Elsevier / Panamericana"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    ISBN o DOI
                  </label>
                  <input
                    type="text"
                    value={isbnDoi}
                    onChange={(e) => setIsbnDoi(e.target.value)}
                    placeholder="DOI 10.1000/... o ISBN"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Materia vinculada
                  </label>
                  <input
                    type="text"
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    placeholder="Ej. Periodoncia I"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Enlace DOI / PubMed / PDF
                  </label>
                  <input
                    type="url"
                    value={enlaceUrl}
                    onChange={(e) => setEnlaceUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Notas de citación
                  </label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Capítulos clave para final..."
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="h-9 rounded-lg border border-[#E6DDD6] px-3 text-xs font-semibold text-[#736B66]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-[#653044] px-4 text-xs font-semibold text-white hover:bg-[#522436]"
                >
                  Guardar referencia
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((ref) => (
              <article
                key={ref.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E6DDD6] bg-white p-5 shadow-[0_4px_20px_-6px_rgba(101,48,68,0.06)]"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-[#736B66]">
                      <span className="font-semibold text-[#653044]">
                        {ref.tipo === 'articulo'
                          ? 'Artículo científico'
                          : ref.tipo === 'guia'
                            ? 'Consenso / Guía'
                            : 'Libro de cátedra'}
                      </span>
                      {ref.anioPublicacion && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="tabular-nums">{ref.anioPublicacion}</span>
                        </>
                      )}
                      {ref.materia && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{ref.materia}</span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeReferences(references.filter((r) => r.id !== ref.id))
                      }
                      aria-label="Quitar referencia"
                      className="text-[#968D87] hover:text-[#653044]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 className="font-serif text-lg font-semibold leading-snug text-[#653044]">
                    {ref.titulo}
                  </h3>

                  <p className="text-xs font-medium text-[#261F1D]">{ref.autores}</p>
                  <p className="text-xs text-[#736B66]">
                    {ref.editorialOJournal}
                    {ref.isbnDoi ? ` · ${ref.isbnDoi}` : ''}
                  </p>

                  {ref.notas && (
                    <p className="pt-1 text-xs leading-relaxed text-[#5E5753]">
                      {ref.notas}
                    </p>
                  )}
                </div>

                {ref.enlaceUrl && (
                  <div className="mt-4 border-t border-[#F0EAE4] pt-3">
                    <a
                      href={ref.enlaceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#653044] hover:underline"
                    >
                      <FlaskConical size={13} />
                      <span>Consultar fuente científica</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {subTab === 'repositorios' && (
        <DriveLibraryPanel
          externalSearch={search}
          savedUrls={savedUrls}
          onSaveToLibrary={onSaveDriveToLibrary}
        />
      )}

      {subTab === 'compartida' && (
        <BibliotecaCompartidaPanel
          materias={materias}
          savedSharedIds={savedSharedIds}
          onImportApunte={onImportApunte}
          onImportFlashcard={onImportFlashcard}
          onImportPregunta={onImportPregunta}
        />
      )}
    </div>
  );
};
