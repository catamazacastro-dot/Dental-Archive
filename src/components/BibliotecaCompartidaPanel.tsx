import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Check,
  CloudUpload,
  Download,
  ExternalLink,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Users,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import {
  auth,
  deleteSharedResource,
  publishSharedResource,
  signInWithGoogleForSharing,
  signOutSharing,
  subscribeSharedResources,
} from '../lib/firebase';
import type {
  ApunteNote,
  BiblioCategoria,
  FlashcardItem,
  MateriaPlan,
  PreguntaBanco,
  SharedResourceItem,
} from '../types/dental';

interface BibliotecaCompartidaPanelProps {
  materias: MateriaPlan[];
  savedSharedIds: Set<string>;
  onImportApunte: (note: ApunteNote) => void;
  onImportFlashcard: (card: FlashcardItem) => void;
  onImportPregunta: (p: PreguntaBanco) => void;
}

const ALIAS_STORAGE_KEY = 'dental_archive_share_alias_v1';

const CAT_LABELS: Record<SharedResourceItem['categoria'], string> = {
  apuntes: 'Apunte',
  resumenes: 'Resumen / Ficha',
  pdfs: 'PDF / Presentación',
  libros: 'Libro / Bibliografía',
  cuadros: 'Cuadro / Mapa',
  flashcards: 'Flashcard',
  preguntas: 'Pregunta',
};

export const BibliotecaCompartidaPanel: React.FC<BibliotecaCompartidaPanelProps> = ({
  materias,
  savedSharedIds,
  onImportApunte,
  onImportFlashcard,
  onImportPregunta,
}) => {
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [sharedItems, setSharedItems] = useState<SharedResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtros
  const [search, setSearch] = useState('');
  const [filterAnio, setFilterAnio] = useState<number | 'todos'>('todos');
  const [filterTipo, setFilterTipo] = useState<'todos' | SharedResourceItem['tipoRecurso']>('todos');

  // Formulario de publicación opt-in
  const [showPublish, setShowPublish] = useState(false);
  const [authorAlias, setAuthorAlias] = useState(() => {
    try {
      return localStorage.getItem(ALIAS_STORAGE_KEY) || 'Estudiante FOLP';
    } catch {
      return 'Estudiante FOLP';
    }
  });
  const [tipoRecurso, setTipoRecurso] = useState<'documento' | 'flashcard' | 'pregunta'>('documento');
  const [categoria, setCategoria] = useState<BiblioCategoria>('apuntes');
  const [anio, setAnio] = useState(1);
  const [materia, setMateria] = useState(() => materias[0]?.nombre || 'Anatomía I');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [etiquetasRaw, setEtiquetasRaw] = useState('');
  const [autorFuente, setAutorFuente] = useState('');
  const [isbnDoi, setIsbnDoi] = useState('');
  const [enlaceUrl, setEnlaceUrl] = useState('');
  const [flashcardFrente, setFlashcardFrente] = useState('');
  const [preguntaOps, setPreguntaOps] = useState<string[]>(['', '', '', '']);
  const [preguntaCorrecta, setPreguntaCorrecta] = useState(0);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.displayName) {
        const firstName = u.displayName.split(' ')[0];
        setAuthorAlias((prev) => (prev === 'Estudiante FOLP' ? firstName : prev));
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ALIAS_STORAGE_KEY, authorAlias);
    } catch {
      // Ignore storage errors
    }
  }, [authorAlias]);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeSharedResources(
      (items) => {
        setSharedItems(items);
        setLoading(false);
        setErrorMsg('');
      },
      (err) => {
        setLoading(false);
        setErrorMsg(
          isOnline
            ? `No se pudo sincronizar la biblioteca compartida: ${err.message}`
            : 'Sin conexión a internet. Podés seguir usando los recursos ya guardados offline.'
        );
      }
    );
    return () => unsub();
  }, [isOnline]);

  const materiasByYear = useMemo(() => {
    const list = materias.filter((m) => m.anio === anio).map((m) => m.nombre);
    return list.length > 0 ? Array.from(new Set(list)) : materias.map((m) => m.nombre);
  }, [materias, anio]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sharedItems.filter((item) => {
      if (filterAnio !== 'todos' && item.anio !== filterAnio) return false;
      if (filterTipo !== 'todos' && item.tipoRecurso !== filterTipo) return false;
      if (q) {
        const hay = [
          item.titulo,
          item.contenido,
          item.materia,
          item.authorAlias,
          item.autorFuente,
          item.isbnDoi,
          ...item.etiquetas,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sharedItems, filterAnio, filterTipo, search]);

  const handleSignIn = async () => {
    setErrorMsg('');
    try {
      await signInWithGoogleForSharing();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión con Google.'
      );
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setPublishing(true);
    try {
      const etiquetas = etiquetasRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

      const finalCat: SharedResourceItem['categoria'] =
        tipoRecurso === 'flashcard'
          ? 'flashcards'
          : tipoRecurso === 'pregunta'
            ? 'preguntas'
            : categoria;

      await publishSharedResource({
        authorAlias: authorAlias.trim() || 'Estudiante FOLP',
        tipoRecurso,
        categoria: finalCat,
        anio,
        materia,
        titulo:
          tipoRecurso === 'flashcard'
            ? flashcardFrente.trim().slice(0, 180)
            : titulo.trim(),
        contenido: contenido.trim(),
        etiquetas,
        autorFuente,
        isbnDoi,
        enlaceUrl,
        flashcardFrente,
        preguntaOpciones:
          tipoRecurso === 'pregunta'
            ? preguntaOps.map((o) => o.trim()).filter(Boolean)
            : [],
        preguntaCorrecta,
      });

      setTitulo('');
      setContenido('');
      setEtiquetasRaw('');
      setAutorFuente('');
      setIsbnDoi('');
      setEnlaceUrl('');
      setFlashcardFrente('');
      setPreguntaOps(['', '', '', '']);
      setShowPublish(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al publicar el recurso.');
    } finally {
      setPublishing(false);
    }
  };

  const handleImportToLocal = (item: SharedResourceItem) => {
    const today = new Date().toISOString().slice(0, 10);
    if (item.tipoRecurso === 'flashcard') {
      onImportFlashcard({
        id: `fc-sh-${item.id}`,
        anio: item.anio,
        materia: item.materia,
        frente: item.flashcardFrente || item.titulo,
        dorso: item.contenido,
        etiquetas: item.etiquetas,
        favorito: false,
        sharedId: item.id,
        updatedAt: today,
      });
      return;
    }

    if (item.tipoRecurso === 'pregunta') {
      onImportPregunta({
        id: `preg-sh-${item.id}`,
        anio: item.anio,
        materia: item.materia,
        enunciado: item.titulo,
        opciones:
          item.preguntaOpciones.length >= 2
            ? item.preguntaOpciones
            : ['Opción A', 'Opción B'],
        respuestaCorrecta: item.preguntaCorrecta,
        explicacion: item.contenido || undefined,
        etiquetas: item.etiquetas,
        favorito: false,
        sharedId: item.id,
        updatedAt: today,
      });
      return;
    }

    const docCat: BiblioCategoria =
      item.categoria === 'flashcards' || item.categoria === 'preguntas'
        ? 'apuntes'
        : item.categoria;

    onImportApunte({
      id: `ap-sh-${item.id}`,
      titulo: item.titulo,
      materia: item.materia,
      anio: item.anio,
      categoria: docCat,
      favorito: false,
      etiquetas: item.etiquetas,
      autor: item.autorFuente || `Compartido por ${item.authorAlias}`,
      isbnDoi: item.isbnDoi || undefined,
      enlaceUrl: item.enlaceUrl || undefined,
      sharedId: item.id,
      offlineReady: true,
      contenido: item.contenido,
      updatedAt: today,
    });
  };

  return (
    <div className="space-y-5">
      {/* Banner Privacidad + Auth */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-200/80 bg-white p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-rose-900" />
            <h2 className="text-sm font-bold text-rose-950">
              Biblioteca Compartida entre Estudiantes ({sharedItems.length})
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Solo se publica lo que elegís compartir voluntariamente (con alias, sin exponer datos personales). Guardá cualquier recurso en tu dispositivo para usarlo offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isOnline && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
              <WifiOff size={13} />
              <span>Sin conexión</span>
            </span>
          )}

          {user ? (
            <>
              <button
                type="button"
                onClick={() => setShowPublish((v) => !v)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
              >
                <Plus size={14} />
                <span>Compartir recurso</span>
              </button>
              <button
                type="button"
                onClick={signOutSharing}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-rose-50"
              >
                <LogOut size={13} />
                <span>Salir</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={!isOnline}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950 disabled:opacity-50"
            >
              <LogIn size={14} />
              <span>Ingresar con Google para publicar</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-900">
          {errorMsg}
        </div>
      )}

      {/* Formulario de publicación */}
      {showPublish && user && (
        <form
          onSubmit={handlePublish}
          className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/40 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 pb-3">
            <h3 className="text-xs font-bold text-rose-950">
              Publicar en Biblioteca Compartida (opt-in)
            </h3>
            <span className="text-[11px] text-slate-500">
              Tu correo no se guarda ni se muestra públicamente.
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-700">
                Alias público
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={authorAlias}
                onChange={(e) => setAuthorAlias(e.target.value)}
                placeholder="Ej. Cata · 3° Año"
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-700">
                Tipo de recurso
              </label>
              <select
                value={tipoRecurso}
                onChange={(e) =>
                  setTipoRecurso(e.target.value as 'documento' | 'flashcard' | 'pregunta')
                }
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              >
                <option value="documento">Apunte / Resumen / Bibliografía</option>
                <option value="flashcard">Flashcard</option>
                <option value="pregunta">Pregunta de examen</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700">Año</label>
              <select
                value={anio}
                onChange={(e) => {
                  const nextY = Number(e.target.value);
                  setAnio(nextY);
                  const first = materias.find((m) => m.anio === nextY)?.nombre;
                  if (first) setMateria(first);
                }}
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              >
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y}° Año
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-medium text-slate-700">Materia</label>
              <select
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              >
                {materiasByYear.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tipoRecurso === 'documento' && (
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-700">Sección</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as BiblioCategoria)}
                  className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
                >
                  <option value="apuntes">Apuntes</option>
                  <option value="resumenes">Resúmenes y fichas</option>
                  <option value="pdfs">PDFs y presentaciones</option>
                  <option value="libros">Libros y bibliografías</option>
                  <option value="cuadros">Cuadros y mapas</option>
                </select>
              </div>
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-medium text-slate-700">Título</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Resumen Nervio Trigémino V2 y V3 · 1er parcial"
                  className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 text-xs"
                />
              </div>
            </div>
          )}

          {tipoRecurso === 'flashcard' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-700">
                Frente / Pregunta de la Flashcard
              </label>
              <input
                type="text"
                required
                maxLength={1000}
                value={flashcardFrente}
                onChange={(e) => setFlashcardFrente(e.target.value)}
                placeholder="Ej. ¿Por qué orificio sale V3 del cráneo?"
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 text-xs"
              />
            </div>
          )}

          {tipoRecurso === 'pregunta' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-700">
                  Enunciado de la pregunta
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. El conducto de Stenon desemboca frente a:"
                  className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 text-xs"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {preguntaOps.map((op, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreguntaCorrecta(i)}
                      className={`h-7 w-7 shrink-0 rounded border text-xs font-bold ${
                        preguntaCorrecta === i
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input
                      type="text"
                      required={i < 2}
                      value={op}
                      onChange={(e) =>
                        setPreguntaOps((prev) =>
                          prev.map((x, idx) => (idx === i ? e.target.value : x))
                        )
                      }
                      placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                      className="h-8 flex-1 rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-700">
              {tipoRecurso === 'flashcard'
                ? 'Dorso / Respuesta'
                : tipoRecurso === 'pregunta'
                  ? 'Justificación / Explicación (opcional)'
                  : 'Contenido del apunte o resumen'}
            </label>
            <textarea
              rows={4}
              required={tipoRecurso !== 'pregunta'}
              maxLength={15000}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Escribí puntos clave, dosis, reparos anatómicos o explicación..."
              className="mt-1 w-full rounded-lg border border-rose-200 bg-white p-2.5 text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-700">
                Etiquetas (separadas por coma)
              </label>
              <input
                type="text"
                value={etiquetasRaw}
                onChange={(e) => setEtiquetasRaw(e.target.value)}
                placeholder="1er parcial, Final"
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700">
                Fuente / Libro / Cátedra
              </label>
              <input
                type="text"
                maxLength={200}
                value={autorFuente}
                onChange={(e) => setAutorFuente(e.target.value)}
                placeholder="Ej. Figún & Garino 2ª ed."
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700">
                ISBN / DOI (verificable)
              </label>
              <input
                type="text"
                maxLength={100}
                value={isbnDoi}
                onChange={(e) => setIsbnDoi(e.target.value)}
                placeholder="Ej. ISBN 978-950-02-0123-0"
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700">
                Enlace externo (https://)
              </label>
              <input
                type="url"
                maxLength={500}
                value={enlaceUrl}
                onChange={(e) => setEnlaceUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPublish(false)}
              className="min-h-[36px] rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-950"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={publishing}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-rose-900 px-4 text-xs font-semibold text-white hover:bg-rose-950 disabled:opacity-50"
            >
              <CloudUpload size={14} />
              <span>{publishing ? 'Publicando...' : 'Publicar en Biblioteca Compartida'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Filtros de búsqueda */}
      <div className="grid gap-3 rounded-xl border border-rose-200/80 bg-white p-4 sm:grid-cols-12">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en apuntes compartidos (materia, título, autor, ISBN/DOI)..."
          className="h-9 rounded-lg border border-rose-200 px-3 text-xs sm:col-span-6"
        />
        <select
          aria-label="Filtrar compartidos por año"
          value={filterAnio}
          onChange={(e) =>
            setFilterAnio(e.target.value === 'todos' ? 'todos' : Number(e.target.value))
          }
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs sm:col-span-3"
        >
          <option value="todos">Todos los años</option>
          {[1, 2, 3, 4, 5].map((y) => (
            <option key={y} value={y}>
              {y}° Año
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar compartidos por tipo"
          value={filterTipo}
          onChange={(e) =>
            setFilterTipo(e.target.value as 'todos' | SharedResourceItem['tipoRecurso'])
          }
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs sm:col-span-3"
        >
          <option value="todos">Todos los tipos</option>
          <option value="documento">Apuntes y bibliografías</option>
          <option value="flashcard">Flashcards</option>
          <option value="pregunta">Preguntas</option>
        </select>
      </div>

      {/* Lista de recursos compartidos */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Cargando Biblioteca Compartida...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Todavía no hay recursos compartidos con estos filtros. ¡Podés ser el primero en aportar un apunte o bibliografía verificable!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const isSavedOffline = savedSharedIds.has(item.id);
            const isMine = Boolean(user && item.authorUid === user.uid);

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between space-y-3 rounded-xl border border-rose-200/80 bg-white p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[11px] font-medium text-slate-500">
                      <span className="font-semibold text-rose-900">
                        {CAT_LABELS[item.categoria]}
                      </span>{' '}
                      · {item.anio}° Año · {item.materia}
                    </div>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => deleteSharedResource(item.id)}
                        aria-label="Eliminar mi publicación compartida"
                        className="p-1 text-slate-400 hover:text-rose-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{item.titulo}</h3>

                  {item.contenido && (
                    <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                      {item.contenido}
                    </p>
                  )}

                  {(item.autorFuente || item.isbnDoi) && (
                    <p className="text-[11px] text-slate-600">
                      <span className="font-semibold text-rose-950">Fuente:</span>{' '}
                      {item.autorFuente}
                      {item.isbnDoi ? ` · ${item.isbnDoi}` : ''}
                    </p>
                  )}

                  {item.etiquetas.length > 0 && (
                    <p className="text-[11px] font-medium text-rose-900">
                      {item.etiquetas.join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rose-100 pt-3">
                  <span className="text-[11px] text-slate-500">
                    Aporte de <span className="font-semibold text-slate-700">{item.authorAlias}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {item.enlaceUrl && (
                      <a
                        href={item.enlaceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-rose-50"
                      >
                        <span>Fuente</span>
                        <ExternalLink size={11} />
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={isSavedOffline}
                      onClick={() => handleImportToLocal(item)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        isSavedOffline
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'bg-rose-900 text-white hover:bg-rose-950'
                      }`}
                    >
                      {isSavedOffline ? <Check size={13} /> : <Download size={13} />}
                      <span>
                        {isSavedOffline ? 'Guardado offline' : 'Guardar en mi Biblio'}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
