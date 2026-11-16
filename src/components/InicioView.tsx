import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bone,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Lock,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  INITIAL_MATERIAS_PLAN,
  MATERIAS_DELETED_STORAGE_KEY,
  loadDeletedMateriaIds,
} from '../data/correlativasData';
import type {
  CalendarioEvento,
  EventoTipo,
  MateriaEstado,
  MateriaPlan,
  TareaPendiente,
} from '../types/dental';
import type { TemaAReforzar } from '../utils/repasoDetector';
import { ModoRepasoPanel } from './ModoRepasoPanel';

interface InicioViewProps {
  materias: MateriaPlan[];
  setMaterias: React.Dispatch<React.SetStateAction<MateriaPlan[]>>;
  eventos: CalendarioEvento[];
  onAddEvento: (ev: CalendarioEvento) => void;
  onDeleteEvento: (id: string) => void;
  tareas: TareaPendiente[];
  onAddTarea: (t: TareaPendiente) => void;
  onToggleTarea: (id: string) => void;
  onDeleteTarea: (id: string) => void;
  onOpenApuntesForMateria: (materiaNombre: string) => void;
  onNavigateSection?: (
    section: 'apuntes' | 'atlas' | 'encuestas' | 'historia' | 'ia',
    biblioTab?: 'pdfs' | 'resumenes'
  ) => void;
  temasRepaso?: TemaAReforzar[];
  onResolveTopic?: (topicKey: string) => void;
  onNavigateRepasoTopic?: (tema: TemaAReforzar) => void;
  onOpenSpotify?: () => void;
}

const SELECTED_ANIO_STORAGE_KEY = 'dental_archive_selected_anio_v1';
const POMODORO_VISIBLE_KEY = 'dental_archive_pomodoro_visible_v1';
const ANIOS = [1, 2, 3, 4, 5] as const;

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function playBellChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // Ignore audio context restrictions
  }
}

export const InicioView: React.FC<InicioViewProps> = ({
  materias,
  setMaterias,
  eventos,
  onAddEvento,
  onDeleteEvento,
  tareas,
  onAddTarea,
  onToggleTarea,
  onDeleteTarea,
  onOpenApuntesForMateria,
  onNavigateSection,
  temasRepaso = [],
  onResolveTopic,
  onNavigateRepasoTopic,
  onOpenSpotify,
}) => {
  // === CORRELATIVAS STATE ===
  const [selectedAnio, setSelectedAnio] = useState<1 | 2 | 3 | 4 | 5>(() => {
    try {
      const saved = Number(localStorage.getItem(SELECTED_ANIO_STORAGE_KEY));
      if (saved >= 1 && saved <= 5) return saved as 1 | 2 | 3 | 4 | 5;
    } catch {
      // Ignore storage errors
    }
    return 1;
  });
  const [showAddMateria, setShowAddMateria] = useState(false);
  const [newMateriaNombre, setNewMateriaNombre] = useState('');
  const [newMateriaCuatrimestre, setNewMateriaCuatrimestre] = useState('2° Cuatrimestre');
  const [newMateriaCorrelativas, setNewMateriaCorrelativas] = useState<string[]>([]);
  const [hiddenCorrelativaIds, setHiddenCorrelativaIds] = useState<string[]>([]);
  const [editingCorrelativaOptions, setEditingCorrelativaOptions] = useState(false);
  const [correlativasExpanded, setCorrelativasExpanded] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_ANIO_STORAGE_KEY, String(selectedAnio));
    } catch {
      // Ignore storage errors
    }
  }, [selectedAnio]);

  // === CALENDARIO STATE ===
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [showAddEvento, setShowAddEvento] = useState(false);
  const [eventoTipo, setEventoTipo] = useState<EventoTipo>('Cursada');
  const [eventoTitulo, setEventoTitulo] = useState('');
  const [eventoMateria, setEventoMateria] = useState('');
  const [eventoHora, setEventoHora] = useState('');
  const [eventoNotas, setEventoNotas] = useState('');

  // === TAREAS PENDIENTES STATE ===
  const [tareaTexto, setTareaTexto] = useState('');
  const [tareaMateria, setTareaMateria] = useState('');
  const [tareaFecha, setTareaFecha] = useState('');

  // === POMODORO A ELECCIÓN STATE ===
  const [pomodoroEnabled, setPomodoroEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(POMODORO_VISIBLE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [focusMins, setFocusMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [pomodoroFullscreen, setPomodoroFullscreen] = useState(false);
  const [focusGoal, setFocusGoal] = useState('');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(POMODORO_VISIBLE_KEY, String(pomodoroEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [pomodoroEnabled]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          playBellChime();
          setIsRunning(false);
          if (pomodoroMode === 'focus') {
            setCompletedCycles((c) => c + 1);
            setPomodoroMode('break');
            return breakMins * 60;
          } else {
            setPomodoroMode('focus');
            return focusMins * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, pomodoroMode, focusMins, breakMins]);

  const applyPomodoroPreset = (nextFocus: number, nextBreak: number) => {
    const safeFocus = Math.max(1, Math.min(180, nextFocus));
    const safeBreak = Math.max(1, Math.min(60, nextBreak));
    setIsRunning(false);
    setFocusMins(safeFocus);
    setBreakMins(safeBreak);
    setPomodoroMode('focus');
    setSecondsLeft(safeFocus * 60);
  };

  const formattedClock = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsLeft]);

  const totalPhaseSeconds = (pomodoroMode === 'focus' ? focusMins : breakMins) * 60;
  const pomodoroProgress =
    totalPhaseSeconds > 0
      ? Math.min(1, Math.max(0, (totalPhaseSeconds - secondsLeft) / totalPhaseSeconds))
      : 0;

  const openPomodoroFullscreen = () => {
    setPomodoroFullscreen(true);
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        void document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignore fullscreen API restrictions inside iframes
    }
  };

  const closePomodoroFullscreen = () => {
    setPomodoroFullscreen(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore fullscreen exit errors
    }
  };

  useEffect(() => {
    if (!pomodoroFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePomodoroFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pomodoroFullscreen]);

  // === CORRELATIVAS MEMOS ===
  const materiaById = useMemo(() => {
    const map: Record<string, MateriaPlan> = {};
    materias.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [materias]);

  const materiasDelAnio = useMemo(
    () => materias.filter((m) => m.anio === selectedAnio),
    [materias, selectedAnio]
  );

  const materiasAnteriores = useMemo(
    () => materias.filter((m) => m.anio <= selectedAnio),
    [materias, selectedAnio]
  );

  const visibleCorrelativaOptions = useMemo(
    () => materiasAnteriores.filter((m) => !hiddenCorrelativaIds.includes(m.id)),
    [materiasAnteriores, hiddenCorrelativaIds]
  );

  const allMateriaNames = useMemo(
    () => Array.from(new Set(materias.map((m) => m.nombre))),
    [materias]
  );

  const careerStats = useMemo(() => {
    const aprobadas = materias.filter((m) => m.estado === 'Aprobada').length;
    const regulares = materias.filter((m) => m.estado === 'Regular').length;
    return { total: materias.length, aprobadas, regulares };
  }, [materias]);

  const yearStats = useMemo(() => {
    const aprobadas = materiasDelAnio.filter((m) => m.estado === 'Aprobada').length;
    const regulares = materiasDelAnio.filter((m) => m.estado === 'Regular').length;
    const pendientes = materiasDelAnio.filter((m) => m.estado === 'Pendiente').length;
    return { aprobadas, regulares, pendientes };
  }, [materiasDelAnio]);

  const checkCorrelativas = (materia: MateriaPlan) => {
    const faltanCursar = materia.correlativasParaCursar
      .map((id) => materiaById[id])
      .filter((req) => req && req.estado === 'Pendiente');

    const faltanRendir = materia.correlativasParaRendir
      .map((id) => materiaById[id])
      .filter((req) => req && req.estado !== 'Aprobada');

    return {
      puedeCursar: faltanCursar.length === 0,
      puedeRendir: faltanRendir.length === 0,
      faltanCursar,
      faltanRendir,
    };
  };

  const handleSetEstado = (materiaId: string, estado: MateriaEstado) => {
    setMaterias((prev) =>
      prev.map((m) => (m.id === materiaId ? { ...m, estado } : m))
    );
  };

  const handleDeleteMateria = (materiaId: string) => {
    setMaterias((prev) =>
      prev
        .filter((m) => m.id !== materiaId)
        .map((m) => ({
          ...m,
          correlativasParaCursar: m.correlativasParaCursar.filter((id) => id !== materiaId),
          correlativasParaRendir: m.correlativasParaRendir.filter((id) => id !== materiaId),
        }))
    );
    try {
      const deleted = loadDeletedMateriaIds();
      if (!deleted.includes(materiaId)) {
        localStorage.setItem(
          MATERIAS_DELETED_STORAGE_KEY,
          JSON.stringify([...deleted, materiaId])
        );
      }
    } catch {
      // Ignore storage errors
    }
  };

  const hasDeletedInitial = useMemo(() => {
    const activeIds = new Set(materias.map((m) => m.id));
    return INITIAL_MATERIAS_PLAN.some((m) => !activeIds.has(m.id));
  }, [materias]);

  const handleRestoreInitialMaterias = () => {
    try {
      localStorage.removeItem(MATERIAS_DELETED_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setMaterias((prev) => {
      const prevById = new Map(prev.map((m) => [m.id, m]));
      const initialIds = new Set(INITIAL_MATERIAS_PLAN.map((m) => m.id));
      const restoredInitial = INITIAL_MATERIAS_PLAN.map((base) => {
        const existing = prevById.get(base.id);
        return existing ? { ...base, estado: existing.estado } : base;
      });
      const custom = prev.filter((m) => !initialIds.has(m.id));
      return [...restoredInitial, ...custom];
    });
  };

  const handleAddCustomMateria = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = newMateriaNombre.trim();
    if (!nombre) return;
    const newMat: MateriaPlan = {
      id: `mat-${Date.now().toString(36)}`,
      anio: selectedAnio,
      nombre,
      cuatrimestre: newMateriaCuatrimestre || undefined,
      correlativasParaCursar: newMateriaCorrelativas,
      correlativasParaRendir: newMateriaCorrelativas,
      estado: 'Pendiente',
    };
    setMaterias((prev) => [...prev, newMat]);
    setNewMateriaNombre('');
    setNewMateriaCuatrimestre('2° Cuatrimestre');
    setNewMateriaCorrelativas([]);
    setCorrelativasExpanded(true);
    setShowAddMateria(false);
  };

  // === CALENDAR HELPERS ===
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    // Monday = 0 ... Sunday = 6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { iso: string; day: number; inMonth: boolean }[] = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      cells.push({ iso: toIsoDate(d), day: d.getDate(), inMonth: false });
    }
    // Current month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const d = new Date(year, month, dNum);
      cells.push({ iso: toIsoDate(d), day: dNum, inMonth: true });
    }
    // Trailing padding up to multiple of 7
    while (cells.length % 7 !== 0) {
      const nextIndex = cells.length - (startOffset + daysInMonth) + 1;
      const d = new Date(year, month + 1, nextIndex);
      cells.push({ iso: toIsoDate(d), day: d.getDate(), inMonth: false });
    }
    return cells;
  }, [viewMonth]);

  const eventosByDate = useMemo(() => {
    const map: Record<string, CalendarioEvento[]> = {};
    eventos.forEach((ev) => {
      if (!map[ev.fecha]) map[ev.fecha] = [];
      map[ev.fecha].push(ev);
    });
    return map;
  }, [eventos]);

  const selectedDayEventos = useMemo(
    () =>
      (eventosByDate[selectedDate] || []).slice().sort((a, b) =>
        (a.hora || '').localeCompare(b.hora || '')
      ),
    [eventosByDate, selectedDate]
  );

  const upcomingEventos = useMemo(
    () =>
      eventos
        .filter((ev) => ev.fecha >= todayIso)
        .slice()
        .sort((a, b) => `${a.fecha} ${a.hora || ''}`.localeCompare(`${b.fecha} ${b.hora || ''}`))
        .slice(0, 6),
    [eventos, todayIso]
  );

  const handleCreateEvento = (e: React.FormEvent) => {
    e.preventDefault();
    const tituloFinal = eventoTitulo.trim() || eventoMateria || eventoTipo;
    onAddEvento({
      id: `ev-${Date.now().toString(36)}`,
      titulo: tituloFinal,
      tipo: eventoTipo,
      fecha: selectedDate,
      hora: eventoHora.trim() || undefined,
      materia: eventoMateria || undefined,
      notas: eventoNotas.trim() || undefined,
    });
    setEventoTitulo('');
    setEventoMateria('');
    setEventoHora('');
    setEventoNotas('');
    setShowAddEvento(false);
  };

  const handleCreateTarea = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = tareaTexto.trim();
    if (!texto) return;
    onAddTarea({
      id: `tar-${Date.now().toString(36)}`,
      texto,
      materia: tareaMateria || undefined,
      fechaLimite: tareaFecha || undefined,
      completada: false,
      createdAt: todayIso,
    });
    setTareaTexto('');
    setTareaMateria('');
    setTareaFecha('');
  };

  const pendingTareasCount = useMemo(
    () => tareas.filter((t) => !t.completada).length,
    [tareas]
  );

  const sortedTareas = useMemo(
    () =>
      tareas.slice().sort((a, b) => {
        if (a.completada !== b.completada) return a.completada ? 1 : -1;
        return (a.fechaLimite || '9999-99-99').localeCompare(b.fechaLimite || '9999-99-99');
      }),
    [tareas]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* HERO ROSA ANTIGUO */}
      <section className="rounded-[22px] bg-[#EED9DC] px-6 py-6 sm:px-8 sm:py-8">
        <p className="text-[11px] font-bold tracking-[0.08em] text-[#7A1C33] uppercase">
          TU ESPACIO ACADÉMICO
        </p>
        <h1 className="mt-2.5 max-w-xl text-[28px] leading-[1.12] font-extrabold tracking-tight text-[#7A1C33] text-balance sm:text-4xl">
          Aprendé. Practicá.
          <br />
          Evolucioná.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed font-medium text-[#6B454E]">
          Todo lo que necesitás para tu formación odontológica, en un solo lugar.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateSection?.('apuntes', 'pdfs')}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#7A1C33] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#68162A]"
          >
            <span>Explorar biblioteca</span>
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection?.('atlas')}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#7A1C33]/25 bg-[#FFFDF9] px-4 py-3 text-sm font-bold text-[#7A1C33] transition-colors hover:bg-white"
          >
            <Bone size={16} className="text-[#4D6351]" />
            <span>Atlas Osteológico 3D</span>
          </button>
        </div>
      </section>

      {/* EXPLORÁ TU BIBLIOTECA — GRILLA 2x2 */}
      <section className="space-y-3.5">
        <h2 className="text-[22px] font-extrabold tracking-tight text-[#7A1C33] sm:text-2xl">
          Explorá tu biblioteca
        </h2>

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onNavigateSection?.('encuestas')}
            className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-[#E6CFD2] bg-[#F2E2E4] p-4 text-left transition-colors hover:bg-[#ECD6D9] active:scale-[0.99]"
          >
            <BarChart3 size={20} strokeWidth={1.8} className="text-[#7A1C33]" />
            <span className="mt-4 text-[17px] leading-tight font-extrabold tracking-tight text-[#7A1C33]">
              Encuestas
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection?.('apuntes', 'resumenes')}
            className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-[#D4DFD5] bg-[#EAEFEA] p-4 text-left transition-colors hover:bg-[#E0E7E0] active:scale-[0.99]"
          >
            <BookOpen size={20} strokeWidth={1.8} className="text-[#4D6351]" />
            <span className="mt-4 text-[17px] leading-tight font-extrabold tracking-tight text-[#7A1C33]">
              Apuntes
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection?.('historia')}
            className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-[#E6CFD2] bg-[#F2E2E4] p-4 text-left transition-colors hover:bg-[#ECD6D9] active:scale-[0.99]"
          >
            <ClipboardList size={20} strokeWidth={1.8} className="text-[#7A1C33]" />
            <span className="mt-4 text-[17px] leading-tight font-extrabold tracking-tight text-[#7A1C33]">
              Área clínica
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection?.('ia')}
            className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-[#D4DFD5] bg-[#EAEFEA] p-4 text-left transition-colors hover:bg-[#E0E7E0] active:scale-[0.99]"
          >
            <Sparkles size={20} strokeWidth={1.8} className="text-[#4D6351]" />
            <span className="mt-4 text-[17px] leading-tight font-extrabold tracking-tight text-[#7A1C33]">
              Notebook IA
            </span>
          </button>
        </div>

        <p className="pt-1 pb-2 text-center text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">
          UNA BIBLIOTECA PARA TODA TU CARRERA
        </p>
      </section>

      {/* Header de Agenda y Plan de Carrera */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-b border-rose-200/80 py-5">
        <div>
          <p className="text-xs font-medium text-slate-500 tabular-nums">
            Uso personal · {careerStats.aprobadas}/{careerStats.total} aprobadas ·{' '}
            {upcomingEventos.length} eventos próximos · {pendingTareasCount} tareas pendientes
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-rose-950 sm:text-2xl">
            Agenda y Plan de Carrera
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setPomodoroEnabled((v) => !v)}
          className={`inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${
            pomodoroEnabled
              ? 'border-rose-900 bg-rose-900 text-white hover:bg-rose-950'
              : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
          }`}
        >
          <Clock size={14} />
          <span>{pomodoroEnabled ? 'Ocultar Pomodoro' : 'Activar Pomodoro'}</span>
        </button>
      </div>

      {/* AGENDA: CALENDARIO + TAREAS + POMODORO */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* CALENDARIO DE CURSADA, EXÁMENES Y FINALES */}
        <section className="overflow-hidden rounded-xl border border-rose-200/80 bg-white lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 bg-rose-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-rose-900" />
              <h2 className="text-sm font-bold text-rose-950">
                Calendario · {MESES_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setViewMonth(
                    (cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1)
                  )
                }
                aria-label="Mes anterior"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-950 hover:bg-rose-50"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(todayIso);
                }}
                className="h-8 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-950 hover:bg-rose-50"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() =>
                  setViewMonth(
                    (cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
                  )
                }
                aria-label="Mes siguiente"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-950 hover:bg-rose-50"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Leyenda de tipos */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-800" />
                  Cursada
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  Examen
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-700" />
                  Final
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddEvento((v) => !v)}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-rose-900 px-3 text-xs font-semibold text-white hover:bg-rose-950"
              >
                <Plus size={14} />
                <span>Agendar en {selectedDate.split('-').reverse().join('/')}</span>
              </button>
            </div>

            {/* Formulario para agregar cursada / examen / final */}
            {showAddEvento && (
              <form
                onSubmit={handleCreateEvento}
                className="mb-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-rose-950">
                    Nuevo evento · {selectedDate.split('-').reverse().join('/')}
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 ring-1 ring-rose-200">
                    {(['Cursada', 'Examen', 'Final'] as EventoTipo[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEventoTipo(t)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          eventoTipo === t
                            ? t === 'Final'
                              ? 'bg-emerald-700 text-white'
                              : t === 'Examen'
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-medium text-slate-600">
                      Título o tema
                    </label>
                    <input
                      type="text"
                      value={eventoTitulo}
                      onChange={(e) => setEventoTitulo(e.target.value)}
                      placeholder="Ej. 1° Parcial / Mesa de final / Comisión"
                      className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-600">
                      Asignatura (opcional)
                    </label>
                    <select
                      value={eventoMateria}
                      onChange={(e) => setEventoMateria(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs text-slate-900"
                    >
                      <option value="">Seleccionar materia...</option>
                      {allMateriaNames.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600">
                      Hora (opcional)
                    </label>
                    <input
                      type="time"
                      value={eventoHora}
                      onChange={(e) => setEventoHora(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={eventoNotas}
                    onChange={(e) => setEventoNotas(e.target.value)}
                    placeholder="Aula, comisión, bibliografía o recordatorio..."
                    className="h-9 flex-1 rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddEvento(false)}
                      className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-950"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="h-9 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Grilla mensual */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="py-1.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell) => {
                const dayEvents = eventosByDate[cell.iso] || [];
                const isSelected = selectedDate === cell.iso;
                const isToday = todayIso === cell.iso;
                const hasCursada = dayEvents.some((e) => e.tipo === 'Cursada');
                const hasExamen = dayEvents.some((e) => e.tipo === 'Examen');
                const hasFinal = dayEvents.some((e) => e.tipo === 'Final');

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedDate(cell.iso)}
                    className={`flex min-h-[48px] flex-col items-center justify-between rounded-lg border p-1.5 text-xs transition-colors ${
                      isSelected
                        ? 'border-rose-900 bg-rose-900 text-white'
                        : isToday
                          ? 'border-rose-400 bg-rose-50 text-rose-950'
                          : cell.inMonth
                            ? 'border-slate-100 bg-white text-slate-800 hover:border-rose-200 hover:bg-rose-50/40'
                            : 'border-transparent bg-slate-50/60 text-slate-400 hover:bg-rose-50/30'
                    }`}
                  >
                    <span className="font-semibold tabular-nums">{cell.day}</span>
                    <div className="flex h-2 items-center gap-1">
                      {hasCursada && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? 'bg-rose-200' : 'bg-rose-800'
                          }`}
                        />
                      )}
                      {hasExamen && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? 'bg-amber-300' : 'bg-amber-600'
                          }`}
                        />
                      )}
                      {hasFinal && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-300' : 'bg-emerald-700'
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Eventos del día seleccionado y próximos */}
            <div className="mt-4 grid gap-4 border-t border-rose-100 pt-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold text-rose-950">
                  Día {selectedDate.split('-').reverse().join('/')}
                </h3>
                {selectedDayEventos.length === 0 ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Sin cursadas ni exámenes cargados en esta fecha.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selectedDayEventos.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">
                            <span
                              className={
                                ev.tipo === 'Final'
                                  ? 'text-emerald-700'
                                  : ev.tipo === 'Examen'
                                    ? 'text-amber-700'
                                    : 'text-rose-900'
                              }
                            >
                              {ev.tipo}
                            </span>
                            {ev.hora ? ` · ${ev.hora}` : ''} · {ev.titulo}
                          </p>
                          {(ev.materia || ev.notas) && (
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {[ev.materia, ev.notas].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteEvento(ev.id)}
                          aria-label={`Eliminar ${ev.titulo}`}
                          className="shrink-0 p-1 text-slate-400 hover:text-rose-700"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-rose-950">Próximas fechas</h3>
                {upcomingEventos.length === 0 ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Agregá cursadas, parciales o mesas de final para verlos aquí.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {upcomingEventos.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDate(ev.fecha)}
                          className="min-w-0 truncate text-left hover:text-rose-900"
                        >
                          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                            {ev.fecha.split('-').reverse().slice(0, 2).join('/')}
                          </span>{' '}
                          ·{' '}
                          <span
                            className={`font-semibold ${
                              ev.tipo === 'Final'
                                ? 'text-emerald-700'
                                : ev.tipo === 'Examen'
                                  ? 'text-amber-700'
                                  : 'text-rose-900'
                            }`}
                          >
                            {ev.tipo}
                          </span>{' '}
                          · {ev.titulo}
                        </button>
                        {ev.hora && (
                          <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
                            {ev.hora}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* COLUMNA DERECHA: TAREAS PENDIENTES + POMODORO A ELECCIÓN */}
        <div className="space-y-6 lg:col-span-5">
          {/* Tareas pendientes */}
          <section className="overflow-hidden rounded-xl border border-rose-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-rose-200/80 bg-rose-50/70 px-4 py-3">
              <h2 className="text-sm font-bold text-rose-950">Tareas pendientes</h2>
              <span className="text-xs font-medium text-slate-600 tabular-nums">
                {pendingTareasCount} pendientes
              </span>
            </div>

            <div className="p-4">
              <form onSubmit={handleCreateTarea} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={tareaTexto}
                    onChange={(e) => setTareaTexto(e.target.value)}
                    placeholder="Ej. Repasar guía de Biofísica / Comprar instrumental..."
                    className="h-9 flex-1 rounded-lg border border-rose-200 bg-white px-3 text-xs text-slate-900"
                  />
                  <button
                    type="submit"
                    aria-label="Agregar tarea"
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-rose-900 px-3 text-xs font-semibold text-white hover:bg-rose-950"
                  >
                    <Plus size={14} />
                    <span>Agregar</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Materia de la tarea"
                    value={tareaMateria}
                    onChange={(e) => setTareaMateria(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700"
                  >
                    <option value="">Materia (opcional)</option>
                    {allMateriaNames.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    aria-label="Fecha límite"
                    value={tareaFecha}
                    onChange={(e) => setTareaFecha(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700"
                  />
                </div>
              </form>

              {sortedTareas.length === 0 ? (
                <p className="mt-4 text-center text-xs text-slate-500">
                  No tenés tareas pendientes cargadas.
                </p>
              ) : (
                <ul className="mt-4 max-h-60 divide-y divide-slate-100 overflow-y-auto">
                  {sortedTareas.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleTarea(t.id)}
                        className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            t.completada
                              ? 'border-rose-900 bg-rose-900 text-white'
                              : 'border-slate-300 bg-white hover:border-rose-900'
                          }`}
                        >
                          {t.completada && <Check size={11} />}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-medium ${
                              t.completada ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}
                          >
                            {t.texto}
                          </p>
                          {(t.materia || t.fechaLimite) && (
                            <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                              {[
                                t.materia,
                                t.fechaLimite
                                  ? t.fechaLimite.split('-').reverse().join('/')
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTarea(t.id)}
                        aria-label={`Eliminar tarea ${t.texto}`}
                        className="shrink-0 p-1 text-slate-400 hover:text-rose-700"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Pomodoro a elección */}
          {pomodoroEnabled && (
            <section className="overflow-hidden rounded-xl border border-rose-200/80 bg-white">
              <div className="flex items-center justify-between border-b border-rose-200/80 bg-rose-50/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-rose-900" />
                  <h2 className="text-sm font-bold text-rose-950">Pomodoro de estudio</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600 tabular-nums">
                    {completedCycles} {completedCycles === 1 ? 'bloque' : 'bloques'} hoy
                  </span>
                  <button
                    type="button"
                    onClick={openPomodoroFullscreen}
                    title="Abrir Pomodoro en pantalla grande (Modo Focus)"
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-950 transition-colors hover:bg-rose-100"
                  >
                    <Maximize2 size={12} />
                    <span>Focus</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex rounded-lg bg-rose-50 p-0.5 ring-1 ring-rose-200/70">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRunning(false);
                        setPomodoroMode('focus');
                        setSecondsLeft(focusMins * 60);
                      }}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        pomodoroMode === 'focus'
                          ? 'bg-rose-900 text-white'
                          : 'text-rose-950/75'
                      }`}
                    >
                      Estudio ({focusMins}m)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRunning(false);
                        setPomodoroMode('break');
                        setSecondsLeft(breakMins * 60);
                      }}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        pomodoroMode === 'break'
                          ? 'bg-rose-900 text-white'
                          : 'text-rose-950/75'
                      }`}
                    >
                      Descanso ({breakMins}m)
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {[
                      { label: '25/5', f: 25, b: 5 },
                      { label: '45/15', f: 45, b: 15 },
                      { label: '50/10', f: 50, b: 10 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPomodoroPreset(preset.f, preset.b)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold tabular-nums ${
                          focusMins === preset.f && breakMins === preset.b
                            ? 'border-rose-900 bg-rose-50 text-rose-950'
                            : 'border-slate-200 text-slate-600 hover:border-rose-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reloj + controles */}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-100 bg-rose-50/40 px-4 py-3">
                  <div className="font-mono text-3xl font-bold tracking-tight text-rose-950 tabular-nums">
                    {formattedClock}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRunning((r) => !r)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
                    >
                      {isRunning ? <Pause size={14} /> : <Play size={14} />}
                      <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRunning(false);
                        setSecondsLeft(
                          (pomodoroMode === 'focus' ? focusMins : breakMins) * 60
                        );
                      }}
                      aria-label="Reiniciar temporizador"
                      className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-rose-200 bg-white px-2.5 text-rose-950 hover:bg-rose-50"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={openPomodoroFullscreen}
                      aria-label="Pantalla grande Focus"
                      title="Pantalla grande Focus"
                      className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-rose-200 bg-white px-2.5 text-rose-950 hover:bg-rose-50"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Configuración personalizada */}
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
                  <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <span>Minutos estudio</span>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={focusMins}
                      onChange={(e) =>
                        applyPomodoroPreset(Number(e.target.value) || 25, breakMins)
                      }
                      className="w-14 text-right font-mono font-semibold text-slate-900 tabular-nums outline-none"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <span>Minutos descanso</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={breakMins}
                      onChange={(e) =>
                        applyPomodoroPreset(focusMins, Number(e.target.value) || 5)
                      }
                      className="w-14 text-right font-mono font-semibold text-slate-900 tabular-nums outline-none"
                    />
                  </label>
                </div>

                {onOpenSpotify && (
                  <button
                    type="button"
                    onClick={onOpenSpotify}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-950 transition-colors hover:bg-rose-100"
                  >
                    <Music2 size={14} className="text-rose-900" />
                    <span>Música de estudio en Spotify</span>
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* MODO REPASO AUTOMÁTICO */}
      {onResolveTopic && onNavigateRepasoTopic && (
        <ModoRepasoPanel
          compact
          temas={temasRepaso}
          onResolveTopic={onResolveTopic}
          onNavigateTopic={onNavigateRepasoTopic}
        />
      )}

      {/* CORRELATIVAS DE LA CARRERA (1° A 5° AÑO) */}
      <section className="overflow-hidden rounded-xl border border-rose-200/80 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 bg-rose-50/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-rose-950">
              Correlativas de la Carrera · {selectedAnio}° Año
            </h2>
            <p className="text-xs text-slate-600 tabular-nums">
              {materiasDelAnio.length} asignaturas · {yearStats.aprobadas} aprobadas ·{' '}
              {yearStats.regulares} regulares · {yearStats.pendientes} pendientes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Año 1-5 */}
            <div
              role="group"
              aria-label="Seleccionar año de cursada"
              className="flex items-center gap-1 rounded-lg border border-rose-200/70 bg-white p-0.5"
            >
              {ANIOS.map((anio) => {
                const active = selectedAnio === anio;
                return (
                  <button
                    key={anio}
                    type="button"
                    onClick={() => {
                      setSelectedAnio(anio);
                      setNewMateriaCorrelativas([]);
                      setEditingCorrelativaOptions(false);
                    }}
                    className={`min-h-[32px] whitespace-nowrap rounded-md px-2.5 text-xs font-semibold tabular-nums transition-colors ${
                      active
                        ? 'bg-rose-900 text-white'
                        : 'text-rose-950/75 hover:text-rose-950'
                    }`}
                  >
                    {anio}°
                  </button>
                );
              })}
            </div>

            {hasDeletedInitial && (
              <button
                type="button"
                onClick={handleRestoreInitialMaterias}
                className="inline-flex min-h-[34px] items-center rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-900 hover:bg-rose-50"
              >
                Restaurar materias
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowAddMateria((v) => !v);
                setEditingCorrelativaOptions(false);
              }}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 hover:bg-rose-50"
            >
              <Plus size={14} />
              <span>Agregar materia</span>
            </button>
            <button
              type="button"
              onClick={() => setCorrelativasExpanded((v) => !v)}
              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-950 hover:bg-rose-50"
            >
              <span>{correlativasExpanded ? 'Ocultar' : 'Mostrar'}</span>
              {correlativasExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Formulario opcional para añadir materia personalizada al año seleccionado */}
        {showAddMateria && (
          <form
            onSubmit={handleAddCustomMateria}
            className="space-y-3 border-b border-rose-200/80 bg-rose-50/40 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-slate-700">
                  Nombre de la asignatura ({selectedAnio}° Año)
                </label>
                <input
                  type="text"
                  required
                  value={newMateriaNombre}
                  onChange={(e) => setNewMateriaNombre(e.target.value)}
                  placeholder="Ej. Curso Optativo / Taller"
                  className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 text-xs text-slate-900"
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="new-materia-cuatrimestre"
                  className="block text-xs font-medium text-slate-700"
                >
                  Cuatrimestre / Régimen
                </label>
                <select
                  id="new-materia-cuatrimestre"
                  value={newMateriaCuatrimestre}
                  onChange={(e) => setNewMateriaCuatrimestre(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
                >
                  <option value="1° Cuatrimestre">1° Cuatrimestre</option>
                  <option value="2° Cuatrimestre">2° Cuatrimestre</option>
                  <option value="Anual">Anual</option>
                  <option value="Introductorio · Bimestral">Introductorio · Bimestral</option>
                  <option value="">Sin especificar</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-xs font-medium text-slate-700">
                    Correlativas previas (opcional)
                  </span>
                  <div className="flex items-center gap-2">
                    {newMateriaCorrelativas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewMateriaCorrelativas([])}
                        className="text-[11px] font-medium text-rose-900 hover:underline"
                      >
                        Quitar todas
                      </button>
                    )}
                    {hiddenCorrelativaIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHiddenCorrelativaIds([])}
                        className="text-[11px] font-medium text-rose-900 hover:underline"
                      >
                        Restaurar opciones
                      </button>
                    )}
                    {visibleCorrelativaOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditingCorrelativaOptions((v) => !v)}
                        className="text-[11px] font-medium text-slate-500 hover:text-rose-900"
                      >
                        {editingCorrelativaOptions ? 'Listo' : 'Ocultar opciones'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-rose-200 bg-white p-2">
                  {visibleCorrelativaOptions.length === 0 ? (
                    <span className="text-[11px] text-slate-400">
                      No hay opciones visibles para seleccionar.
                    </span>
                  ) : (
                    visibleCorrelativaOptions.map((prevMat) => {
                      const checked = newMateriaCorrelativas.includes(prevMat.id);
                      return (
                        <button
                          key={prevMat.id}
                          type="button"
                          onClick={() => {
                            if (editingCorrelativaOptions) {
                              setHiddenCorrelativaIds((cur) =>
                                cur.includes(prevMat.id) ? cur : [...cur, prevMat.id]
                              );
                              setNewMateriaCorrelativas((cur) =>
                                cur.filter((id) => id !== prevMat.id)
                              );
                              return;
                            }
                            setNewMateriaCorrelativas((cur) =>
                              cur.includes(prevMat.id)
                                ? cur.filter((id) => id !== prevMat.id)
                                : [...cur, prevMat.id]
                            );
                          }}
                          title={
                            editingCorrelativaOptions
                              ? `Ocultar opción ${prevMat.nombre} (no borra la materia)`
                              : checked
                                ? `Quitar ${prevMat.nombre}`
                                : `Seleccionar ${prevMat.nombre}`
                          }
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                            editingCorrelativaOptions
                              ? 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                              : checked
                                ? 'border-rose-900 bg-rose-900 text-white hover:bg-rose-950'
                                : 'border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50/60'
                          }`}
                        >
                          <span>{prevMat.nombre}</span>
                          {(checked || editingCorrelativaOptions) && <X size={12} />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMateria(false)}
                className="min-h-[34px] rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-950 hover:bg-rose-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[34px] rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
              >
                Guardar materia
              </button>
            </div>
          </form>
        )}

        {correlativasExpanded && (
          <div className="divide-y divide-slate-100">
            {materiasDelAnio.map((mat) => {
              const status = checkCorrelativas(mat);
              const corrCursarNames = mat.correlativasParaCursar
                .map((id) => materiaById[id]?.nombre)
                .filter(Boolean);

              return (
                <div
                  key={mat.id}
                  className="grid gap-3 px-4 py-3.5 lg:grid-cols-12 lg:items-center"
                >
                  <div className="lg:col-span-5">
                    <div className="flex items-baseline gap-2">
                      {mat.codigo && (
                        <span className="font-mono text-[11px] font-semibold text-rose-900/75 tabular-nums">
                          {mat.codigo}
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-slate-900">{mat.nombre}</h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {mat.cuatrimestre ? `${mat.cuatrimestre} · ` : ''}
                      {mat.correlativasResumen
                        ? `Correlativas: ${mat.correlativasResumen}`
                        : corrCursarNames.length === 0
                          ? 'Sin correlativas previas'
                          : `Correlativas: ${corrCursarNames.join(' · ')}`}
                    </p>
                  </div>

                  {/* Estado de habilitación por correlativas */}
                  <div className="lg:col-span-3">
                    {status.puedeCursar ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 size={14} />
                        <span>
                          {status.puedeRendir
                            ? 'Habilitada para cursar y rendir'
                            : 'Habilitada para cursar (faltan finales)'}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-start gap-1.5 text-xs font-medium text-amber-700">
                        <Lock size={14} className="mt-0.5 shrink-0" />
                        <span>
                          {status.faltanCursar.length > 4
                            ? `Falta regularizar ${status.faltanCursar.length} asignaturas`
                            : `Falta regularizar: ${status.faltanCursar
                                .map((f) => f.nombre)
                                .join(', ')}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Estado cursada + Acceso rápido a apuntes + Eliminar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 lg:col-span-4 lg:justify-end">
                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                      {(['Pendiente', 'Regular', 'Aprobada'] as MateriaEstado[]).map((est) => {
                        const active = mat.estado === est;
                        return (
                          <button
                            key={est}
                            type="button"
                            onClick={() => handleSetEstado(mat.id, est)}
                            className={`min-h-[30px] rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                              active
                                ? est === 'Aprobada'
                                  ? 'bg-emerald-700 text-white'
                                  : est === 'Regular'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {est}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenApuntesForMateria(mat.nombre)}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <BookOpen size={12} />
                      <span>Apuntes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMateria(mat.id)}
                      aria-label={`Eliminar ${mat.nombre}`}
                      title={`Eliminar ${mat.nombre}`}
                      className="inline-flex min-h-[32px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* POMODORO PANTALLA GRANDE (MODO FOCUS) */}
      {pomodoroFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Modo Focus Pomodoro"
          className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#1e070e] via-[#2b0914] to-[#120408] px-5 py-6 text-rose-50 sm:px-10 sm:py-8"
        >
          {/* Barra superior Focus */}
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-950/70 px-3 py-1.5 text-xs font-semibold text-rose-100">
                <Clock size={14} />
                <span>
                  {pomodoroMode === 'focus' ? 'Modo Focus · Estudio' : 'Tiempo de Descanso'}
                </span>
              </span>
              <span className="text-xs font-medium text-rose-200/80 tabular-nums">
                {completedCycles} {completedCycles === 1 ? 'bloque' : 'bloques'} completados hoy
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenSpotify && (
                <button
                  type="button"
                  onClick={() => {
                    closePomodoroFullscreen();
                    onOpenSpotify();
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-300/25 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/15"
                >
                  <Music2 size={14} />
                  <span>Spotify</span>
                </button>
              )}
              <button
                type="button"
                onClick={closePomodoroFullscreen}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-300/30 bg-white/10 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Minimize2 size={14} />
                <span>Salir de pantalla grande</span>
              </button>
            </div>
          </div>

          {/* Reloj Central + Anillo de Progreso */}
          <div className="mx-auto my-auto flex w-full max-w-2xl flex-col items-center py-6 text-center">
            {/* Selector Estudio / Descanso */}
            <div className="mb-6 inline-flex rounded-xl border border-rose-300/20 bg-black/25 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setPomodoroMode('focus');
                  setSecondsLeft(focusMins * 60);
                }}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  pomodoroMode === 'focus'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-200/75 hover:text-white'
                }`}
              >
                Estudio ({focusMins}m)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setPomodoroMode('break');
                  setSecondsLeft(breakMins * 60);
                }}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  pomodoroMode === 'break'
                    ? 'bg-emerald-600 text-white'
                    : 'text-rose-200/75 hover:text-white'
                }`}
              >
                Descanso ({breakMins}m)
              </button>
            </div>

            {/* Anillo SVG + Reloj gigante */}
            <div className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
              <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90">
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="8"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  stroke={pomodoroMode === 'focus' ? '#fb7185' : '#34d399'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 108}
                  strokeDashoffset={2 * Math.PI * 108 * (1 - pomodoroProgress)}
                  className="transition-[stroke-dashoffset] duration-500 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-6xl font-bold tracking-tight text-white tabular-nums sm:text-7xl">
                  {formattedClock}
                </span>
                <span className="mt-2 text-xs font-medium tracking-wide text-rose-200/80 uppercase">
                  {isRunning
                    ? pomodoroMode === 'focus'
                      ? 'Enfoque activo'
                      : 'Descansando'
                    : 'En pausa'}
                </span>
              </div>
            </div>

            {/* Objetivo del bloque Focus */}
            <div className="mt-6 w-full max-w-md space-y-2.5">
              <input
                type="text"
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="¿Qué tema o materia estás estudiando en este bloque?"
                className="h-10 w-full rounded-xl border border-rose-300/25 bg-white/10 px-4 text-center text-sm text-white placeholder:text-rose-200/50 outline-none focus:border-rose-300"
              />
              {tareas.some((t) => !t.completada) && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {tareas
                    .filter((t) => !t.completada)
                    .slice(0, 3)
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFocusGoal(t.texto)}
                        className="rounded-lg border border-rose-300/20 bg-white/5 px-2.5 py-1 text-[11px] text-rose-100/85 hover:bg-white/15"
                      >
                        {t.texto}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Controles principales grandes */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsRunning((r) => !r)}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-rose-950 shadow-lg transition-transform hover:scale-[1.02]"
              >
                {isRunning ? <Pause size={18} /> : <Play size={18} />}
                <span>{isRunning ? 'Pausar' : 'Iniciar enfoque'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setSecondsLeft(
                    (pomodoroMode === 'focus' ? focusMins : breakMins) * 60
                  );
                }}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-rose-300/30 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
              >
                <RotateCcw size={16} />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Barra inferior Presets */}
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-2 text-xs">
            {[
              { label: '25 / 5 min', f: 25, b: 5 },
              { label: '45 / 15 min', f: 45, b: 15 },
              { label: '50 / 10 min', f: 50, b: 10 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPomodoroPreset(preset.f, preset.b)}
                className={`rounded-lg border px-3 py-1.5 font-semibold tabular-nums transition-colors ${
                  focusMins === preset.f && breakMins === preset.b
                    ? 'border-rose-300 bg-rose-800/80 text-white'
                    : 'border-rose-300/20 bg-white/5 text-rose-200/80 hover:bg-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
