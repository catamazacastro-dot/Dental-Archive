import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BiblioMateriaNode,
  BiblioRecurso,
  BiblioTema,
  BiblioUnidad,
  RecursoTipo,
} from '../types/dental';

interface BiblioAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tree: BiblioMateriaNode[];
  resources: BiblioRecurso[];
  onChangeTree: (next: BiblioMateriaNode[]) => void;
  onChangeResources: (next: BiblioRecurso[]) => void;
  onDeleteResource?: (resId: string) => void;
  onResetDefaultCatalog: () => void;
}

type AdminSection = 'materias' | 'unidades' | 'temas' | 'recursos';

export const BiblioAdminPanel: React.FC<BiblioAdminPanelProps> = ({
  isOpen,
  onClose,
  tree,
  resources,
  onChangeTree,
  onChangeResources,
  onDeleteResource,
  onResetDefaultCatalog,
}) => {
  const [section, setSection] = useState<AdminSection>('materias');
  const [resourceScope, setResourceScope] = useState<'tema' | 'subidos'>('tema');
  const [resourceQuery, setResourceQuery] = useState('');

  const [selectedMateriaId, setSelectedMateriaId] = useState<string>(
    () => tree[0]?.id || ''
  );
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>(
    () => tree[0]?.unidades[0]?.id || ''
  );
  const [selectedTemaId, setSelectedTemaId] = useState<string>(
    () => tree[0]?.unidades[0]?.temas[0]?.id || ''
  );

  // Forms
  const [newMatNombre, setNewMatNombre] = useState('');
  const [newMatAnio, setNewMatAnio] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newMatAcento, setNewMatAcento] = useState<'bordo' | 'salvia' | 'rosa'>('bordo');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExtra, setEditExtra] = useState('');

  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');

  const [newTemaTitle, setNewTemaTitle] = useState('');

  const currentMateria = useMemo(
    () => tree.find((m) => m.id === selectedMateriaId) || tree[0] || null,
    [tree, selectedMateriaId]
  );

  const currentUnidad = useMemo(
    () =>
      currentMateria?.unidades.find((u) => u.id === selectedUnidadId) ||
      currentMateria?.unidades[0] ||
      null,
    [currentMateria, selectedUnidadId]
  );

  const currentTema = useMemo(
    () =>
      currentUnidad?.temas.find((t) => t.id === selectedTemaId) ||
      currentUnidad?.temas[0] ||
      null,
    [currentUnidad, selectedTemaId]
  );

  const currentTemaResources = useMemo(
    () =>
      resources
        .filter((r) => r.temaId === currentTema?.id)
        .sort((a, b) => a.orden - b.orden),
    [resources, currentTema?.id]
  );

  const uploadedResources = useMemo(() => {
    const q = resourceQuery.trim().toLowerCase();
    return resources
      .filter((r) => Boolean(r.serverFileUrl || r.hasLocalBlob || r.archivoNombre))
      .filter((r) => {
        if (!q) return true;
        const mat = tree.find((m) => m.id === r.materiaId);
        return [r.titulo, r.archivoNombre || '', r.relativePath || '', mat?.nombre || '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
  }, [resources, resourceQuery, tree]);

  const removeResourcesList = (toRemove: BiblioRecurso[]) => {
    const removeIds = new Set(toRemove.map((r) => r.id));
    if (onDeleteResource) {
      toRemove.forEach((r) => onDeleteResource(r.id));
    } else {
      onChangeResources(resources.filter((r) => !removeIds.has(r.id)));
    }
  };

  if (!isOpen) return null;

  function swapOrder<T extends { orden: number }>(
    list: T[],
    idx: number,
    dir: -1 | 1
  ): T[] {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return list;
    const copy = [...list];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    return copy.map((item, i) => ({ ...item, orden: i + 1 }));
  }

  /* === MATERIAS CRUD === */
  const handleAddMateria = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = newMatNombre.trim();
    if (!nombre) return;
    const baseId = Date.now().toString(36);
    const created: BiblioMateriaNode = {
      id: `bm-${baseId}`,
      nombre,
      anio: newMatAnio,
      orden: tree.length + 1,
      descripcion: `${newMatAnio}° Año`,
      acento: newMatAcento,
      unidades: [
        {
          id: `bu-${baseId}-1`,
          titulo: 'Unidad 1 · Contenidos Generales',
          orden: 1,
          temas: [
            {
              id: `bt-${baseId}-1-1`,
              titulo: 'Tema inicial',
              orden: 1,
            },
          ],
        },
      ],
    };
    onChangeTree([...tree, created]);
    setSelectedMateriaId(created.id);
    setSelectedUnidadId(created.unidades[0].id);
    setSelectedTemaId(created.unidades[0].temas[0].id);
    setNewMatNombre('');
  };

  const handleSaveMateriaEdit = (matId: string) => {
    const clean = editTitle.trim();
    if (!clean) return;
    onChangeTree(
      tree.map((m) =>
        m.id === matId
          ? { ...m, nombre: clean, descripcion: editExtra.trim() || m.descripcion }
          : m
      )
    );
    setEditingId(null);
  };

  const handleDeleteMateria = (matId: string) => {
    const nextTree = tree
      .filter((m) => m.id !== matId)
      .map((m, i) => ({ ...m, orden: i + 1 }));
    onChangeTree(nextTree);
    removeResourcesList(resources.filter((r) => r.materiaId === matId));
  };

  /* === UNIDADES CRUD === */
  const handleAddUnidad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMateria || !newUnitTitle.trim()) return;
    const baseId = Date.now().toString(36);
    const newUnit: BiblioUnidad = {
      id: `bu-${baseId}`,
      titulo: newUnitTitle.trim(),
      descripcion: newUnitDesc.trim() || undefined,
      orden: currentMateria.unidades.length + 1,
      temas: [
        {
          id: `bt-${baseId}-1`,
          titulo: 'Tema 1 · Desarrollo',
          orden: 1,
        },
      ],
    };
    onChangeTree(
      tree.map((m) =>
        m.id === currentMateria.id
          ? { ...m, unidades: [...m.unidades, newUnit] }
          : m
      )
    );
    setSelectedUnidadId(newUnit.id);
    setSelectedTemaId(newUnit.temas[0].id);
    setNewUnitTitle('');
    setNewUnitDesc('');
  };

  const handleSaveUnidadEdit = (unitId: string) => {
    if (!currentMateria || !editTitle.trim()) return;
    onChangeTree(
      tree.map((m) =>
        m.id === currentMateria.id
          ? {
              ...m,
              unidades: m.unidades.map((u) =>
                u.id === unitId
                  ? {
                      ...u,
                      titulo: editTitle.trim(),
                      descripcion: editExtra.trim() || undefined,
                    }
                  : u
              ),
            }
          : m
      )
    );
    setEditingId(null);
  };

  const handleDeleteUnidad = (unitId: string) => {
    if (!currentMateria) return;
    onChangeTree(
      tree.map((m) =>
        m.id === currentMateria.id
          ? {
              ...m,
              unidades: m.unidades
                .filter((u) => u.id !== unitId)
                .map((u, idx) => ({ ...u, orden: idx + 1 })),
            }
          : m
      )
    );
    removeResourcesList(resources.filter((r) => r.unidadId === unitId));
  };

  /* === TEMAS CRUD === */
  const handleAddTema = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMateria || !currentUnidad || !newTemaTitle.trim()) return;
    const newTema: BiblioTema = {
      id: `bt-${Date.now().toString(36)}`,
      titulo: newTemaTitle.trim(),
      orden: currentUnidad.temas.length + 1,
    };
    onChangeTree(
      tree.map((m) =>
        m.id === currentMateria.id
          ? {
              ...m,
              unidades: m.unidades.map((u) =>
                u.id === currentUnidad.id
                  ? { ...u, temas: [...u.temas, newTema] }
                  : u
              ),
            }
          : m
      )
    );
    setSelectedTemaId(newTema.id);
    setNewTemaTitle('');
  };

  const handleSaveTemaEdit = (temaId: string) => {
    if (!currentMateria || !currentUnidad || !editTitle.trim()) return;
    onChangeTree(
      tree.map((m) =>
        m.id === currentMateria.id
          ? {
              ...m,
              unidades: m.unidades.map((u) =>
                u.id === currentUnidad.id
                  ? {
                      ...u,
                      temas: u.temas.map((t) =>
                        t.id === temaId ? { ...t, titulo: editTitle.trim() } : t
                      ),
                    }
                  : u
              ),
            }
          : m
      )
    );
    setEditingId(null);
  };

  const handleDeleteTema = (temaId: string) => {
    if (!currentMateria || !currentUnidad) return;
    onChangeTree(
      tree.map((m) =>
        m.id === currentMateria.id
          ? {
              ...m,
              unidades: m.unidades.map((u) =>
                u.id === currentUnidad.id
                  ? {
                      ...u,
                      temas: u.temas
                        .filter((t) => t.id !== temaId)
                        .map((t, idx) => ({ ...t, orden: idx + 1 })),
                    }
                  : u
              ),
            }
          : m
      )
    );
    removeResourcesList(resources.filter((r) => r.temaId === temaId));
  };

  /* === RECURSOS ADMIN === */
  const handleMoveResourceOrder = (resId: string, dir: -1 | 1) => {
    const idx = currentTemaResources.findIndex((r) => r.id === resId);
    if (idx < 0) return;
    const reordered = swapOrder(currentTemaResources, idx, dir);
    const mapById = new Map(reordered.map((r) => [r.id, r]));
    onChangeResources(resources.map((r) => mapById.get(r.id) || r));
  };

  const handleChangeResourceTipo = (resId: string, tipo: RecursoTipo) => {
    onChangeResources(
      resources.map((r) => (r.id === resId ? { ...r, tipo } : r))
    );
  };

  const handleSaveResourceEdit = (resId: string) => {
    if (!editTitle.trim()) return;
    onChangeResources(
      resources.map((r) =>
        r.id === resId ? { ...r, titulo: editTitle.trim() } : r
      )
    );
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#261F1D]/45 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Administrar Biblioteca de Apuntes"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E6DDD6] bg-[#F8F5F1] shadow-[0_24px_60px_-15px_rgba(101,48,68,0.28)]">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6DDD6] bg-white px-5 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#653044]">
              Administrar Biblioteca
            </h2>
            <p className="text-xs text-[#736B66]">
              Creá, editá, eliminá y ordená materias, unidades, temas y recursos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetDefaultCatalog}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E6DDD6] bg-white px-3 text-xs font-semibold text-[#736B66] hover:bg-[#F8F5F1] hover:text-[#653044]"
            >
              <RotateCcw size={13} />
              <span>Restaurar base</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar administración"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#653044] text-white hover:bg-[#522436]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Pestañas de administración */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-[#E6DDD6] bg-white px-5 py-2.5">
          {(
            [
              { id: 'materias', label: `Materias (${tree.length})` },
              { id: 'unidades', label: 'Unidades' },
              { id: 'temas', label: 'Temas' },
              { id: 'recursos', label: `Recursos (${resources.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSection(tab.id);
                setEditingId(null);
              }}
              className={`h-8 shrink-0 whitespace-nowrap rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                section === tab.id
                  ? 'bg-[#653044] text-white'
                  : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Selectores contextuales para Unidades / Temas / Recursos */}
          {section !== 'materias' && (
            <div className="mb-4 grid gap-3 rounded-xl border border-[#E6DDD6] bg-white p-3.5 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#653044]">
                  Materia seleccionada
                </label>
                <select
                  value={currentMateria?.id || ''}
                  onChange={(e) => {
                    const m = tree.find((x) => x.id === e.target.value);
                    setSelectedMateriaId(e.target.value);
                    setSelectedUnidadId(m?.unidades[0]?.id || '');
                    setSelectedTemaId(m?.unidades[0]?.temas[0]?.id || '');
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

              {(section === 'temas' || section === 'recursos') && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Unidad seleccionada
                  </label>
                  <select
                    value={currentUnidad?.id || ''}
                    onChange={(e) => {
                      const u = currentMateria?.unidades.find(
                        (x) => x.id === e.target.value
                      );
                      setSelectedUnidadId(e.target.value);
                      setSelectedTemaId(u?.temas[0]?.id || '');
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
                  >
                    {(currentMateria?.unidades || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {section === 'recursos' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Tema seleccionado
                  </label>
                  <select
                    value={currentTema?.id || ''}
                    onChange={(e) => setSelectedTemaId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-2.5 text-xs text-[#261F1D]"
                  >
                    {(currentUnidad?.temas || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {section === 'materias' && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddMateria}
                className="grid gap-2.5 rounded-xl border border-[#E6DDD6] bg-white p-4 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Nueva materia
                  </label>
                  <input
                    type="text"
                    value={newMatNombre}
                    onChange={(e) => setNewMatNombre(e.target.value)}
                    placeholder="Ej. Ortodoncia Clínica"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs outline-none focus:border-[#653044]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Año
                  </label>
                  <select
                    value={newMatAnio}
                    onChange={(e) =>
                      setNewMatAnio(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-2 text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>
                        {y}° Año
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Acento de tarjeta
                  </label>
                  <select
                    value={newMatAcento}
                    onChange={(e) =>
                      setNewMatAcento(e.target.value as 'bordo' | 'salvia' | 'rosa')
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] bg-white px-2 text-xs"
                  >
                    <option value="bordo">Bordó (#653044)</option>
                    <option value="salvia">Verde salvia (#A1B3A0)</option>
                    <option value="rosa">Rosa antiguo (#B8798E)</option>
                  </select>
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-[#653044] px-3 text-xs font-semibold text-white hover:bg-[#522436]"
                  >
                    <Plus size={14} />
                    <span>Crear</span>
                  </button>
                </div>
              </form>

              <div className="divide-y divide-[#F0EAE4] overflow-hidden rounded-xl border border-[#E6DDD6] bg-white">
                {tree.map((mat, idx) => (
                  <div
                    key={mat.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    {editingId === mat.id ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 flex-1 rounded border border-[#653044] px-2 text-xs font-medium"
                        />
                        <input
                          type="text"
                          value={editExtra}
                          onChange={(e) => setEditExtra(e.target.value)}
                          placeholder="Subtítulo..."
                          className="h-8 w-44 rounded border border-[#E6DDD6] px-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveMateriaEdit(mat.id)}
                          className="inline-flex h-8 items-center gap-1 rounded bg-[#653044] px-2.5 text-xs font-semibold text-white"
                        >
                          <Check size={13} />
                          <span>Listo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#261F1D]">
                          <span className="mr-2 font-mono text-[#736B66] tabular-nums">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          {mat.nombre}
                        </p>
                        <p className="text-[11px] text-[#736B66]">
                          {mat.anio}° Año · {mat.unidades.length} unidades
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onChangeTree(swapOrder(tree, idx, -1))}
                        aria-label="Subir materia"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === tree.length - 1}
                        onClick={() => onChangeTree(swapOrder(tree, idx, 1))}
                        aria-label="Bajar materia"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(mat.id);
                          setEditTitle(mat.nombre);
                          setEditExtra(mat.descripcion || '');
                        }}
                        aria-label="Editar materia"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#E9D9DC]/40"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMateria(mat.id)}
                        aria-label="Eliminar materia"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#736B66] hover:bg-[#E9D9DC]/50 hover:text-[#653044]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'unidades' && currentMateria && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddUnidad}
                className="grid gap-2.5 rounded-xl border border-[#E6DDD6] bg-white p-4 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Nueva unidad en {currentMateria.nombre}
                  </label>
                  <input
                    type="text"
                    value={newUnitTitle}
                    onChange={(e) => setNewUnitTitle(e.target.value)}
                    placeholder="Ej. Unidad 4 · Casos Clínicos"
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs outline-none focus:border-[#653044]"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-[#653044]">
                    Descripción breve (opcional)
                  </label>
                  <input
                    type="text"
                    value={newUnitDesc}
                    onChange={(e) => setNewUnitDesc(e.target.value)}
                    placeholder="Resumen de objetivos de la unidad..."
                    className="mt-1 h-9 w-full rounded-lg border border-[#E6DDD6] px-3 text-xs outline-none focus:border-[#653044]"
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-[#653044] px-3 text-xs font-semibold text-white hover:bg-[#522436]"
                  >
                    <Plus size={14} />
                    <span>Agregar</span>
                  </button>
                </div>
              </form>

              <div className="divide-y divide-[#F0EAE4] overflow-hidden rounded-xl border border-[#E6DDD6] bg-white">
                {currentMateria.unidades.map((unit, idx) => (
                  <div
                    key={unit.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    {editingId === unit.id ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 flex-1 rounded border border-[#653044] px-2 text-xs"
                        />
                        <input
                          type="text"
                          value={editExtra}
                          onChange={(e) => setEditExtra(e.target.value)}
                          placeholder="Descripción..."
                          className="h-8 w-44 rounded border border-[#E6DDD6] px-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveUnidadEdit(unit.id)}
                          className="inline-flex h-8 items-center gap-1 rounded bg-[#653044] px-2.5 text-xs font-semibold text-white"
                        >
                          <Check size={13} />
                          <span>Listo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#261F1D]">
                          {unit.titulo}
                        </p>
                        <p className="text-[11px] text-[#736B66]">
                          {unit.temas.length} temas
                          {unit.descripcion ? ` · ${unit.descripcion}` : ''}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          onChangeTree(
                            tree.map((m) =>
                              m.id === currentMateria.id
                                ? { ...m, unidades: swapOrder(m.unidades, idx, -1) }
                                : m
                            )
                          )
                        }
                        aria-label="Subir unidad"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentMateria.unidades.length - 1}
                        onClick={() =>
                          onChangeTree(
                            tree.map((m) =>
                              m.id === currentMateria.id
                                ? { ...m, unidades: swapOrder(m.unidades, idx, 1) }
                                : m
                            )
                          )
                        }
                        aria-label="Bajar unidad"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(unit.id);
                          setEditTitle(unit.titulo);
                          setEditExtra(unit.descripcion || '');
                        }}
                        aria-label="Editar unidad"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#E9D9DC]/40"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUnidad(unit.id)}
                        aria-label="Eliminar unidad"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#736B66] hover:bg-[#E9D9DC]/50 hover:text-[#653044]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'temas' && currentMateria && currentUnidad && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddTema}
                className="flex flex-wrap gap-2.5 rounded-xl border border-[#E6DDD6] bg-white p-4"
              >
                <input
                  type="text"
                  value={newTemaTitle}
                  onChange={(e) => setNewTemaTitle(e.target.value)}
                  placeholder={`Nuevo tema dentro de ${currentUnidad.titulo}...`}
                  className="h-9 flex-1 rounded-lg border border-[#E6DDD6] px-3 text-xs outline-none focus:border-[#653044]"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#653044] px-4 text-xs font-semibold text-white hover:bg-[#522436]"
                >
                  <Plus size={14} />
                  <span>Agregar tema</span>
                </button>
              </form>

              <div className="divide-y divide-[#F0EAE4] overflow-hidden rounded-xl border border-[#E6DDD6] bg-white">
                {currentUnidad.temas.map((tema, idx) => (
                  <div
                    key={tema.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    {editingId === tema.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 flex-1 rounded border border-[#653044] px-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveTemaEdit(tema.id)}
                          className="inline-flex h-8 items-center gap-1 rounded bg-[#653044] px-2.5 text-xs font-semibold text-white"
                        >
                          <Check size={13} />
                          <span>Listo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#261F1D]">
                          {tema.titulo}
                        </p>
                        <p className="text-[11px] text-[#736B66]">
                          {resources.filter((r) => r.temaId === tema.id).length} recursos
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          onChangeTree(
                            tree.map((m) =>
                              m.id === currentMateria.id
                                ? {
                                    ...m,
                                    unidades: m.unidades.map((u) =>
                                      u.id === currentUnidad.id
                                        ? { ...u, temas: swapOrder(u.temas, idx, -1) }
                                        : u
                                    ),
                                  }
                                : m
                            )
                          )
                        }
                        aria-label="Subir tema"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentUnidad.temas.length - 1}
                        onClick={() =>
                          onChangeTree(
                            tree.map((m) =>
                              m.id === currentMateria.id
                                ? {
                                    ...m,
                                    unidades: m.unidades.map((u) =>
                                      u.id === currentUnidad.id
                                        ? { ...u, temas: swapOrder(u.temas, idx, 1) }
                                        : u
                                    ),
                                  }
                                : m
                            )
                          )
                        }
                        aria-label="Bajar tema"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(tema.id);
                          setEditTitle(tema.titulo);
                        }}
                        aria-label="Editar tema"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#E9D9DC]/40"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTema(tema.id)}
                        aria-label="Eliminar tema"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#736B66] hover:bg-[#E9D9DC]/50 hover:text-[#653044]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'recursos' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6DDD6] bg-white p-3">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResourceScope('tema')}
                    className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                      resourceScope === 'tema'
                        ? 'bg-[#653044] text-white'
                        : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                    }`}
                  >
                    Del tema ({currentTemaResources.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResourceScope('subidos')}
                    className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                      resourceScope === 'subidos'
                        ? 'bg-[#653044] text-white'
                        : 'bg-[#F8F5F1] text-[#5E5753] hover:text-[#653044]'
                    }`}
                  >
                    Archivos subidos (
                    {
                      resources.filter((r) =>
                        Boolean(r.serverFileUrl || r.hasLocalBlob || r.archivoNombre)
                      ).length
                    }
                    )
                  </button>
                </div>

                {resourceScope === 'subidos' && (
                  <input
                    type="text"
                    value={resourceQuery}
                    onChange={(e) => setResourceQuery(e.target.value)}
                    placeholder="Buscar archivo por título, carpeta o materia..."
                    className="h-8 w-full rounded-lg border border-[#E6DDD6] bg-[#F8F5F1]/60 px-3 text-xs outline-none focus:border-[#653044] sm:w-64"
                  />
                )}
              </div>

              <div className="divide-y divide-[#F0EAE4] overflow-hidden rounded-xl border border-[#E6DDD6] bg-white">
                {(resourceScope === 'tema' ? currentTemaResources : uploadedResources)
                  .length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#736B66]">
                    {resourceScope === 'tema'
                      ? 'Este tema no tiene recursos asignados todavía.'
                      : 'No hay archivos subidos que coincidan con ese filtro.'}
                  </div>
                ) : (
                  (resourceScope === 'tema'
                    ? currentTemaResources
                    : uploadedResources
                  ).map((res, idx) => {
                    const mat = tree.find((m) => m.id === res.materiaId);
                    const unit = mat?.unidades.find((u) => u.id === res.unidadId);
                    return (
                      <div
                        key={res.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                      >
                        {editingId === res.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-8 flex-1 rounded border border-[#653044] px-2 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveResourceEdit(res.id)}
                              className="inline-flex h-8 items-center gap-1 rounded bg-[#653044] px-2.5 text-xs font-semibold text-white"
                            >
                              <Check size={13} />
                              <span>Listo</span>
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-[#261F1D]">
                              {res.titulo}
                            </p>
                            <p className="truncate text-[11px] text-[#736B66]">
                              {mat?.nombre || 'Materia'}
                              {unit ? ` · ${unit.titulo}` : ''}
                              {res.archivoNombre ? ` · ${res.archivoNombre}` : ''}
                              {res.storageBackend === 'server'
                                ? ' · Persistente en servidor'
                                : ''}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <select
                            aria-label="Tipo de recurso"
                            value={res.tipo}
                            onChange={(e) =>
                              handleChangeResourceTipo(
                                res.id,
                                e.target.value as RecursoTipo
                              )
                            }
                            className="h-8 rounded-lg border border-[#E6DDD6] bg-[#F8F5F1] px-2 text-[11px] font-semibold text-[#653044]"
                          >
                            <option value="pdf">PDF</option>
                            <option value="apunte">Apunte</option>
                            <option value="resumen">Resumen</option>
                            <option value="ficha">Ficha</option>
                            <option value="imagen">Imagen</option>
                          </select>

                          {resourceScope === 'tema' && (
                            <>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveResourceOrder(res.id, -1)}
                                aria-label="Subir recurso"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === currentTemaResources.length - 1}
                                onClick={() => handleMoveResourceOrder(res.id, 1)}
                                aria-label="Bajar recurso"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#5E5753] hover:bg-[#F8F5F1] disabled:opacity-35"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(res.id);
                              setEditTitle(res.titulo);
                            }}
                            aria-label="Editar título"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#653044] hover:bg-[#E9D9DC]/40"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDeleteResource) {
                                onDeleteResource(res.id);
                              } else {
                                onChangeResources(
                                  resources.filter((r) => r.id !== res.id)
                                );
                              }
                            }}
                            aria-label="Eliminar recurso"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6DDD6] text-[#736B66] hover:bg-[#E9D9DC]/50 hover:text-[#653044]"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
