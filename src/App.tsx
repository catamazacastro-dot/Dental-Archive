import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  BarChart3,
  Bell,
  Bone,
  BookOpen,
  Download,
  FileText,
  Home,
  LogIn,
  Sparkles,
  X,
} from 'lucide-react';
import { ApuntesView, type BiblioTab } from './components/ApuntesView';
import { AuthModal } from './components/AuthModal';

const Atlas3DHubView = lazy(async () => {
  try {
    const m = await import('./components/Atlas3DHubView');
    return { default: m.Atlas3DHubView };
  } catch {
    const m = await import('./components/Atlas3DHubView');
    return { default: m.Atlas3DHubView };
  }
});

class AtlasSectionBoundary extends Component<
  { children: ReactNode; onBackHome: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-8 max-w-lg rounded-2xl border border-rose-200 bg-[#FFFDF9] p-6 text-center">
          <h2 className="font-serif text-lg font-bold text-rose-950">
            No se pudo abrir Atlas 3D
          </h2>
          <p className="mt-1.5 text-xs text-slate-600">
            Ocurrió un problema temporal al cargar el entorno 3D. El resto de tus apuntes y datos permanecen intactos.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="min-h-[38px] rounded-xl bg-rose-900 px-4 text-xs font-bold text-white"
            >
              Reintentar Atlas 3D
            </button>
            <button
              type="button"
              onClick={this.props.onBackHome}
              className="min-h-[38px] rounded-xl border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-950"
            >
              Volver a Inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  AvisosInicioStrip,
  AvisosLiveToast,
  AvisosModal,
  triggerBrowserAvisoNotification,
} from './components/AvisosCenter';
import { EncuestasView } from './components/EncuestasView';
import { HistoriaClinicaView } from './components/HistoriaClinicaView';
import { IAView } from './components/IAView';
import { InicioView } from './components/InicioView';
import {
  InstallGuideModal,
  OfflineIndicator,
  PWAInstallButton,
} from './components/PWAInstallModal';
import { SpotifyView } from './components/SpotifyView';
import { MATERIAS_STORAGE_KEY, loadMaterias } from './data/correlativasData';
import { auth, isAdminUser, subscribeAvisos } from './lib/firebase';
import type {
  ApunteNote,
  AvisoGlobal,
  CalendarioEvento,
  EncuestaSocial,
  FlashcardItem,
  MateriaPlan,
  PacienteRecord,
  PreguntaBanco,
  StudySignals,
  TareaPendiente,
} from './types/dental';
import {
  EMPTY_STUDY_SIGNALS,
  STUDY_SIGNALS_STORAGE_KEY,
  detectarTemasPendientes,
  loadStudySignals,
  type TemaAReforzar,
} from './utils/repasoDetector';

type ActiveSection = 'inicio' | 'apuntes' | 'atlas' | 'encuestas' | 'historia' | 'ia';

const KEYS = {
  encuestas: 'dental_archive_encuestas_v1',
  pacientes: 'dental_archive_pacientes_v1',
  apuntes: 'dental_archive_apuntes_v1',
  flashcards: 'dental_archive_flashcards_v1',
  preguntas: 'dental_archive_preguntas_v1',
  eventos: 'dental_archive_eventos_v1',
  tareas: 'dental_archive_tareas_v1',
};

function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // Fallback to initial state
  }
  return fallback;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('inicio');
  const [materias, setMaterias] = useState<MateriaPlan[]>(() => loadMaterias());
  const [eventos, setEventos] = useState<CalendarioEvento[]>(() =>
    loadState<CalendarioEvento[]>(KEYS.eventos, [])
  );
  const [tareas, setTareas] = useState<TareaPendiente[]>(() =>
    loadState<TareaPendiente[]>(KEYS.tareas, [])
  );
  const [encuestas, setEncuestas] = useState<EncuestaSocial[]>(() =>
    loadState<EncuestaSocial[]>(KEYS.encuestas, [])
  );
  const [pacientes, setPacientes] = useState<PacienteRecord[]>(() =>
    loadState<PacienteRecord[]>(KEYS.pacientes, [])
  );
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>(
    () => pacientes[0]?.id || ''
  );
  const [apuntes, setApuntes] = useState<ApunteNote[]>(() =>
    loadState<ApunteNote[]>(KEYS.apuntes, [])
  );
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>(() =>
    loadState<FlashcardItem[]>(KEYS.flashcards, [])
  );
  const [preguntas, setPreguntas] = useState<PreguntaBanco[]>(() =>
    loadState<PreguntaBanco[]>(KEYS.preguntas, [])
  );
  const [studySignals, setStudySignals] = useState<StudySignals>(() =>
    loadStudySignals()
  );
  const [apuntesFilterJump, setApuntesFilterJump] = useState<string>('');
  const [apuntesInitialTab, setApuntesInitialTab] = useState<BiblioTab | undefined>(
    undefined
  );
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAvisosModal, setShowAvisosModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [avisos, setAvisos] = useState<AvisoGlobal[]>([]);
  const [seenAvisos, setSeenAvisos] = useState<Record<string, number>>(() =>
    loadState<Record<string, number>>('dental_archive_seen_avisos_v1', {})
  );
  const notifiedAvisosRef = useRef<Record<string, number>>(
    loadState<Record<string, number>>('dental_archive_notified_avisos_v1', {})
  );
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('dental_archive_seen_avisos_v1', JSON.stringify(seenAvisos));
    } catch {
      // Ignore storage errors
    }
  }, [seenAvisos]);

  useEffect(() => {
    const unsub = subscribeAvisos(
      (items) => {
        setAvisos(items);
        let changed = false;
        for (const av of items) {
          if (!av.activo) continue;
          const prevNotifiedRev = notifiedAvisosRef.current[av.id] || 0;
          if (av.revision > prevNotifiedRev) {
            notifiedAvisosRef.current[av.id] = av.revision;
            changed = true;
            void triggerBrowserAvisoNotification(av);
          }
        }
        if (changed) {
          try {
            localStorage.setItem(
              'dental_archive_notified_avisos_v1',
              JSON.stringify(notifiedAvisosRef.current)
            );
          } catch {
            // Ignore storage errors
          }
        }
      },
      () => {
        // Ignore transient offline/subscription errors silently
      }
    );
    return () => unsub();
  }, []);

  const activeAvisos = useMemo(() => avisos.filter((a) => a.activo), [avisos]);
  const unreadAvisos = useMemo(
    () =>
      activeAvisos.filter((a) => (seenAvisos[a.id] || 0) < a.revision),
    [activeAvisos, seenAvisos]
  );
  const isAdmin = useMemo(() => isAdminUser(currentUser), [currentUser]);

  const handleRequestNotifPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    } catch {
      // Ignore permission dialog cancellation
    }
  }, []);

  const handleAcknowledgeOneAviso = useCallback((aviso: AvisoGlobal) => {
    setSeenAvisos((prev) => ({
      ...prev,
      [aviso.id]: Math.max(prev[aviso.id] || 0, aviso.revision),
    }));
  }, []);

  const handleAcknowledgeAllAvisos = useCallback(() => {
    setSeenAvisos((prev) => {
      const next = { ...prev };
      for (const av of activeAvisos) {
        next[av.id] = Math.max(next[av.id] || 0, av.revision);
      }
      return next;
    });
  }, [activeAvisos]);

  useEffect(() => {
    try {
      localStorage.setItem(MATERIAS_STORAGE_KEY, JSON.stringify(materias));
    } catch {
      // Ignore storage errors
    }
  }, [materias]);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.eventos, JSON.stringify(eventos));
    } catch {
      // Ignore storage errors
    }
  }, [eventos]);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.tareas, JSON.stringify(tareas));
    } catch {
      // Ignore storage errors
    }
  }, [tareas]);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.encuestas, JSON.stringify(encuestas));
    } catch {
      // Ignore storage errors
    }
  }, [encuestas]);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.pacientes, JSON.stringify(pacientes));
    } catch {
      // Ignore storage errors
    }
  }, [pacientes]);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.apuntes, JSON.stringify(apuntes));
    } catch {
      // Ignore storage errors
    }
  }, [apuntes]);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.flashcards, JSON.stringify(flashcards));
    } catch {
      // Ignore storage errors
    }
  }, [flashcards]);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.preguntas, JSON.stringify(preguntas));
    } catch {
      // Ignore storage errors
    }
  }, [preguntas]);

  useEffect(() => {
    try {
      localStorage.setItem(STUDY_SIGNALS_STORAGE_KEY, JSON.stringify(studySignals));
    } catch {
      // Ignore storage errors
    }
  }, [studySignals]);

  const temasRepaso = useMemo(
    () =>
      detectarTemasPendientes({
        signals: studySignals,
        flashcards,
        preguntas,
        eventos,
        materias,
      }),
    [studySignals, flashcards, preguntas, eventos, materias]
  );

  const handleAddEvento = (ev: CalendarioEvento) => {
    setEventos((prev) => [...prev, ev]);
  };

  const handleDeleteEvento = (id: string) => {
    setEventos((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddTarea = (t: TareaPendiente) => {
    setTareas((prev) => [t, ...prev]);
  };

  const handleToggleTarea = (id: string) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completada: !t.completada } : t))
    );
  };

  const handleDeleteTarea = (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddEncuesta = (enc: EncuestaSocial) => {
    setEncuestas((prev) => [enc, ...prev]);
  };

  const handleUpdateEncuesta = (enc: EncuestaSocial) => {
    setEncuestas((prev) => prev.map((e) => (e.id === enc.id ? enc : e)));
  };

  const handleDeleteEncuesta = (id: string) => {
    setEncuestas((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddPaciente = (pac: PacienteRecord) => {
    setPacientes((prev) => [pac, ...prev]);
    setSelectedPacienteId(pac.id);
  };

  const handleUpdatePaciente = (pac: PacienteRecord) => {
    setPacientes((prev) => prev.map((p) => (p.id === pac.id ? pac : p)));
  };

  const handleDeletePaciente = (id: string) => {
    setPacientes((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedPacienteId === id) {
        setSelectedPacienteId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleAddApunte = (note: ApunteNote) => {
    setApuntes((prev) => [note, ...prev]);
  };

  const handleUpdateApunte = (note: ApunteNote) => {
    setApuntes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
  };

  const handleDeleteApunte = (id: string) => {
    setApuntes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddFlashcard = (card: FlashcardItem) => {
    setFlashcards((prev) => [card, ...prev]);
  };

  const handleToggleFlashcardFavorito = (id: string) => {
    setFlashcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, favorito: !c.favorito } : c))
    );
  };

  const handleDeleteFlashcard = (id: string) => {
    setFlashcards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddPregunta = (p: PreguntaBanco) => {
    setPreguntas((prev) => [p, ...prev]);
  };

  const handleTogglePreguntaFavorito = (id: string) => {
    setPreguntas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, favorito: !p.favorito } : p))
    );
  };

  const handleDeletePregunta = (id: string) => {
    setPreguntas((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMarkFlashcard = (id: string, status: 'pendiente' | 'dominada') => {
    const today = new Date().toISOString().slice(0, 10);
    setStudySignals((prev) => {
      const current = prev.flashcards[id];
      const nextResolved = { ...prev.resolvedTopics };
      if (status === 'pendiente') {
        delete nextResolved[`fc:${id}`];
      } else {
        nextResolved[`fc:${id}`] = today;
      }
      return {
        ...prev,
        flashcards: {
          ...prev.flashcards,
          [id]: {
            views: (current?.views || 0) + 1,
            lastReviewed: today,
            status,
          },
        },
        resolvedTopics: nextResolved,
      };
    });
  };

  const handleRecordPreguntaAttempt = (id: string, isCorrect: boolean) => {
    const today = new Date().toISOString().slice(0, 10);
    setStudySignals((prev) => {
      const current = prev.preguntas[id];
      const nextResolved = { ...prev.resolvedTopics };
      if (!isCorrect) {
        delete nextResolved[`preg:${id}`];
      }
      return {
        ...prev,
        preguntas: {
          ...prev.preguntas,
          [id]: {
            attempts: (current?.attempts || 0) + 1,
            wrongCount: (current?.wrongCount || 0) + (isCorrect ? 0 : 1),
            lastCorrect: isCorrect,
            lastAttempt: today,
          },
        },
        resolvedTopics: nextResolved,
      };
    });
  };

  const handleResolveTopic = (topicKey: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setStudySignals((prev) => ({
      ...prev,
      resolvedTopics: {
        ...prev.resolvedTopics,
        [topicKey]: today,
      },
    }));
  };

  const handleResetResolvedTopics = () => {
    setStudySignals((prev) => ({
      ...EMPTY_STUDY_SIGNALS,
      flashcards: prev.flashcards,
      preguntas: prev.preguntas,
      resolvedTopics: {},
    }));
  };

  const handleNavigateRepasoTopic = (tema: TemaAReforzar) => {
    if (tema.origen === 'pregunta') {
      setApuntesInitialTab('preguntas');
      setActiveSection('apuntes');
      return;
    }
    if (tema.origen === 'flashcard') {
      setApuntesInitialTab('flashcards');
      setActiveSection('apuntes');
      return;
    }
    setActiveSection('inicio');
  };

  const handleImportBackupBundle = (bundle: {
    apuntes?: ApunteNote[];
    flashcards?: FlashcardItem[];
    preguntas?: PreguntaBanco[];
  }) => {
    if (Array.isArray(bundle.apuntes) && bundle.apuntes.length > 0) {
      setApuntes((prev) => {
        const ids = new Set(prev.map((a) => a.id));
        const incoming = bundle.apuntes!.filter((a) => a && a.id && !ids.has(a.id));
        return [...incoming, ...prev];
      });
    }
    if (Array.isArray(bundle.flashcards) && bundle.flashcards.length > 0) {
      setFlashcards((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const incoming = bundle.flashcards!.filter((c) => c && c.id && !ids.has(c.id));
        return [...incoming, ...prev];
      });
    }
    if (Array.isArray(bundle.preguntas) && bundle.preguntas.length > 0) {
      setPreguntas((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const incoming = bundle.preguntas!.filter((p) => p && p.id && !ids.has(p.id));
        return [...incoming, ...prev];
      });
    }
  };

  const handleClearInitialFilter = useCallback(() => {
    setApuntesFilterJump('');
    setApuntesInitialTab(undefined);
  }, []);

  const handleOpenApuntesForMateria = (materiaNombre: string) => {
    const matchedMat = materias.find((m) => m.nombre === materiaNombre);
    const hasNotes = apuntes.some((a) => a.materia === materiaNombre);
    if (!hasNotes) {
      const fresh: ApunteNote = {
        id: `ap-${Date.now().toString(36)}`,
        titulo: `Resumen · ${materiaNombre}`,
        materia: materiaNombre,
        anio: matchedMat?.anio || 1,
        categoria: 'resumenes',
        favorito: false,
        etiquetas: [],
        contenido: '',
        offlineReady: true,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      handleAddApunte(fresh);
    }
    setApuntesInitialTab('resumenes');
    setApuntesFilterJump(materiaNombre);
    setActiveSection('apuntes');
  };

  const handleNavigateFromInicio = useCallback(
    (section: ActiveSection, biblioTab?: BiblioTab) => {
      if (section === 'apuntes') {
        setApuntesInitialTab(biblioTab);
        setApuntesFilterJump('');
      }
      setActiveSection(section);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleMobileSelectSection = (section: ActiveSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF6F0] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract (Desktop) + Minimal Mobile Header */}
      <header className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between gap-4 border-b border-rose-200/60 bg-[#FAF6F0]/95 px-4 py-2 backdrop-blur-md md:min-h-[68px] md:border-rose-200 md:bg-[#FFFDF9]/95 lg:px-8 print:hidden">
        {/* Zone 1: Brand Lockup */}
        <button
          type="button"
          onClick={() => setActiveSection('inicio')}
          className="flex shrink-0 items-center gap-3 text-left"
        >
          <svg
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
            className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
          >
            <rect width="44" height="44" rx="12" fill="#7A1C33" />
            <path
              d="M22 14.5C19.2 12.6 14.6 12.1 10.6 13.1C9.7 13.3 9 14.2 9 15.2V30.4C9 31.4 9.9 32.1 10.9 31.9C14.8 31 19.1 31.4 22 33.3M22 14.5C24.8 12.6 29.4 12.1 33.4 13.1C34.3 13.3 35 14.2 35 15.2V30.4C35 31.4 34.1 32.1 33.1 31.9C29.2 31 24.9 31.4 22 33.3M22 14.5V33.3"
              stroke="#FFFFFF"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.5 18.2C14.8 17.8 17.3 18.1 19 18.9M12.5 22.3C14.8 21.9 17.3 22.2 19 23M12.5 26.4C14.8 26 17.3 26.3 19 27.1"
              stroke="#FFFFFF"
              strokeWidth="1.45"
              strokeLinecap="round"
            />
            <path
              d="M31.5 18.2C29.2 17.8 26.7 18.1 25 18.9M31.5 22.3C29.2 21.9 26.7 22.2 25 23M31.5 26.4C29.2 26 26.7 26.3 25 27.1"
              stroke="#FFFFFF"
              strokeWidth="1.45"
              strokeLinecap="round"
            />
          </svg>

          <span className="flex flex-col">
            <span className="text-xl leading-none font-extrabold tracking-tight text-rose-900 sm:text-2xl">
              Dental Archive
            </span>
            <span className="mt-1 text-[9px] font-semibold tracking-[0.14em] text-slate-500 uppercase sm:text-[10px]">
              TU LIBRERIA DENTAL DIGITAL
            </span>
          </span>
        </button>

        {/* Zone 2: Single-line navigation buttons */}
        <nav className="hidden items-center gap-3.5 md:flex lg:gap-5" aria-label="Navegación principal">
          <button
            type="button"
            onClick={() => setActiveSection('inicio')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-3.5 text-sm font-medium transition-colors ${
              activeSection === 'inicio'
                ? 'border-rose-900 text-rose-950'
                : 'border-transparent text-slate-600 hover:text-rose-900'
            }`}
          >
            Inicio
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('apuntes')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-3.5 text-sm font-medium transition-colors ${
              activeSection === 'apuntes'
                ? 'border-rose-900 text-rose-950'
                : 'border-transparent text-slate-600 hover:text-rose-900'
            }`}
          >
            Biblio de Apuntes
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('atlas')}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 py-3.5 text-sm font-medium transition-colors ${
              activeSection === 'atlas'
                ? 'border-rose-900 text-rose-950'
                : 'border-transparent text-slate-600 hover:text-rose-900'
            }`}
          >
            <Bone size={14} className="text-emerald-700" />
            <span>Atlas 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('encuestas')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-3.5 text-sm font-medium transition-colors ${
              activeSection === 'encuestas'
                ? 'border-rose-900 text-rose-950'
                : 'border-transparent text-slate-600 hover:text-rose-900'
            }`}
          >
            Encuestas
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('historia')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-3.5 text-sm font-medium transition-colors ${
              activeSection === 'historia'
                ? 'border-rose-900 text-rose-950'
                : 'border-transparent text-slate-600 hover:text-rose-900'
            }`}
          >
            Historia Clinica
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('ia')}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 py-3.5 text-sm font-medium transition-colors ${
              activeSection === 'ia'
                ? 'border-rose-900 text-rose-950'
                : 'border-transparent text-slate-600 hover:text-rose-900'
            }`}
          >
            <Sparkles size={14} className="text-rose-900" />
            <span>IA</span>
          </button>
        </nav>

        {/* Zone 3: Auth & PWA Install (Desktop) + Minimal 2-line Menu (Mobile) */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => setShowAvisosModal(true)}
              aria-label="Abrir avisos y notificaciones"
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-950 transition-colors hover:bg-rose-50"
            >
              <Bell size={14} className="text-rose-900" />
              <span>
                {unreadAvisos.length > 0 ? `Avisos (${unreadAvisos.length})` : 'Avisos'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-950 transition-colors hover:bg-rose-50"
            >
              {currentUser ? (
                <>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Cuenta'}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-900 text-[10px] font-bold text-white">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[90px] truncate">
                    {(currentUser.displayName || 'Mi cuenta').split(' ')[0]}
                  </span>
                </>
              ) : (
                <>
                  <LogIn size={14} className="text-rose-900" />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>

            <PWAInstallButton
              onOpenGuide={() => setShowInstallModal(true)}
              onLaunchFullscreen={() => setActiveSection('inicio')}
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-rose-900 transition-colors hover:bg-rose-100/70 md:hidden"
          >
            {mobileMenuOpen ? (
              <X size={20} strokeWidth={2} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path
                  d="M4 9H20M4 15H15"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <div
            className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 z-50 flex w-[82%] max-w-xs flex-col justify-between border-l border-rose-200 bg-[#FAF6F0] p-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-rose-200/80 pb-4">
                <span className="text-base font-extrabold tracking-tight text-rose-900">
                  Dental Archive
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-rose-900 hover:bg-rose-100/80"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-4 space-y-1.5">
                {(
                  [
                    { id: 'inicio', label: 'Inicio', icon: Home },
                    { id: 'apuntes', label: 'Biblio de Apuntes', icon: BookOpen },
                    { id: 'atlas', label: 'Atlas 3D', icon: Bone },
                    { id: 'encuestas', label: 'Encuestas', icon: BarChart3 },
                    { id: 'historia', label: 'Historia Clínica', icon: FileText },
                    { id: 'ia', label: 'Notebook IA', icon: Sparkles },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMobileSelectSection(item.id)}
                      className={`flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-rose-900 text-white'
                          : 'text-slate-700 hover:bg-rose-100/70 hover:text-rose-950'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-2 border-t border-rose-200/80 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAvisosModal(true);
                }}
                className="flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-950 hover:bg-rose-50"
              >
                <span className="flex items-center gap-2.5">
                  <Bell size={15} className="text-rose-900" />
                  <span>{isAdmin ? 'Gestionar avisos' : 'Avisos y alertas'}</span>
                </span>
                {unreadAvisos.length > 0 && (
                  <span className="font-mono text-[11px] font-bold text-rose-900 tabular-nums">
                    {unreadAvisos.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAuthModal(true);
                }}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-950 hover:bg-rose-50"
              >
                <LogIn size={15} className="text-rose-900" />
                <span>
                  {currentUser
                    ? `Cuenta: ${(currentUser.displayName || currentUser.email || 'Activa').split(' ')[0]}`
                    : 'Iniciar sesión'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowInstallModal(true);
                }}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <Download size={15} />
                <span>Instalar App en teléfono</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 md:pb-8 ${activeSection !== 'inicio' ? 'pb-20' : 'pb-8'}`}>
        {activeSection === 'inicio' && (
          <div className="pt-4">
            <AvisosInicioStrip
              activeAvisos={activeAvisos}
              unreadCount={unreadAvisos.length}
              isAdmin={isAdmin}
              onOpenModal={() => setShowAvisosModal(true)}
            />
          </div>
        )}

        {activeSection === 'inicio' && (
          <InicioView
            materias={materias}
            setMaterias={setMaterias}
            eventos={eventos}
            onAddEvento={handleAddEvento}
            onDeleteEvento={handleDeleteEvento}
            tareas={tareas}
            onAddTarea={handleAddTarea}
            onToggleTarea={handleToggleTarea}
            onDeleteTarea={handleDeleteTarea}
            onOpenApuntesForMateria={handleOpenApuntesForMateria}
            onNavigateSection={handleNavigateFromInicio}
            temasRepaso={temasRepaso}
            onResolveTopic={handleResolveTopic}
            onNavigateRepasoTopic={handleNavigateRepasoTopic}
            onOpenSpotify={() =>
              document
                .getElementById('spotify-inicio-card')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          />
        )}

        {activeSection === 'apuntes' && (
          <ApuntesView
            apuntes={apuntes}
            materias={materias}
            flashcards={flashcards}
            preguntas={preguntas}
            studySignals={studySignals}
            temasRepaso={temasRepaso}
            initialFilterMateria={apuntesFilterJump}
            initialTab={apuntesInitialTab}
            onClearInitialFilter={handleClearInitialFilter}
            onAddApunte={handleAddApunte}
            onUpdateApunte={handleUpdateApunte}
            onDeleteApunte={handleDeleteApunte}
            onAddFlashcard={handleAddFlashcard}
            onToggleFlashcardFavorito={handleToggleFlashcardFavorito}
            onDeleteFlashcard={handleDeleteFlashcard}
            onAddPregunta={handleAddPregunta}
            onTogglePreguntaFavorito={handleTogglePreguntaFavorito}
            onDeletePregunta={handleDeletePregunta}
            onMarkFlashcard={handleMarkFlashcard}
            onRecordPreguntaAttempt={handleRecordPreguntaAttempt}
            onResolveTopic={handleResolveTopic}
            onResetResolvedTopics={handleResetResolvedTopics}
            onNavigateRepasoTopic={handleNavigateRepasoTopic}
            onImportBackupBundle={handleImportBackupBundle}
          />
        )}

        {activeSection === 'atlas' && (
          <AtlasSectionBoundary onBackHome={() => setActiveSection('inicio')}>
            <Suspense
              fallback={
                <div className="mx-auto flex min-h-[420px] max-w-7xl flex-col items-center justify-center px-4 py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-rose-900" />
                  <p className="mt-3 text-xs font-semibold text-rose-950">
                    Preparando Atlas 3D...
                  </p>
                </div>
              }
            >
              <Atlas3DHubView />
            </Suspense>
          </AtlasSectionBoundary>
        )}

        {activeSection === 'encuestas' && (
          <EncuestasView
            encuestas={encuestas}
            onAddEncuesta={handleAddEncuesta}
            onUpdateEncuesta={handleUpdateEncuesta}
            onDeleteEncuesta={handleDeleteEncuesta}
          />
        )}

        {activeSection === 'historia' && (
          <HistoriaClinicaView
            pacientes={pacientes}
            selectedId={selectedPacienteId}
            onSelectId={setSelectedPacienteId}
            onAddPaciente={handleAddPaciente}
            onUpdatePaciente={handleUpdatePaciente}
            onDeletePaciente={handleDeletePaciente}
          />
        )}

        {activeSection === 'ia' && (
          <IAView
            materias={materias}
            apuntes={apuntes}
            onSaveAsResumen={handleAddApunte}
          />
        )}

        <SpotifyView
          isInicioActive={activeSection === 'inicio'}
          onGoToInicio={() => setActiveSection('inicio')}
        />
      </main>

      {/* Mobile Bottom Tab Bar (< md, visible en secciones internas; IA es la última página) */}
      {activeSection !== 'inicio' && (
        <nav
          aria-label="Navegación móvil"
          className="fixed right-0 bottom-0 left-0 z-30 grid h-14 grid-cols-6 border-t border-rose-200 bg-[#FFFDF9]/95 backdrop-blur-md md:hidden print:hidden"
        >
          <button
            type="button"
            onClick={() => setActiveSection('inicio')}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500"
          >
            <Home size={17} />
            <span>Inicio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('apuntes')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              activeSection === 'apuntes' ? 'text-rose-900' : 'text-slate-500'
            }`}
          >
            <BookOpen size={17} />
            <span>Biblio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('atlas')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              activeSection === 'atlas' ? 'text-rose-900' : 'text-slate-500'
            }`}
          >
            <Bone size={17} />
            <span>Atlas 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('encuestas')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              activeSection === 'encuestas' ? 'text-rose-900' : 'text-slate-500'
            }`}
          >
            <BarChart3 size={17} />
            <span>Encuestas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('historia')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              activeSection === 'historia' ? 'text-rose-900' : 'text-slate-500'
            }`}
          >
            <FileText size={17} />
            <span>Historia</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('ia')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              activeSection === 'ia' ? 'text-rose-900' : 'text-slate-500'
            }`}
          >
            <Sparkles size={17} />
            <span>IA</span>
          </button>
        </nav>
      )}

      <InstallGuideModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        appName="Dental Archive"
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        user={currentUser}
      />

      <AvisosLiveToast
        unreadAvisos={unreadAvisos}
        notifPermission={notifPermission}
        onRequestNotifPermission={handleRequestNotifPermission}
        onAcknowledgeOne={handleAcknowledgeOneAviso}
        onOpenModal={() => setShowAvisosModal(true)}
      />

      <AvisosModal
        isOpen={showAvisosModal}
        onClose={() => setShowAvisosModal(false)}
        avisos={avisos}
        seenAvisos={seenAvisos}
        user={currentUser}
        notifPermission={notifPermission}
        onRequestNotifPermission={handleRequestNotifPermission}
        onAcknowledgeAll={handleAcknowledgeAllAvisos}
        onAcknowledgeOne={handleAcknowledgeOneAviso}
        onOpenSignIn={() => setShowAuthModal(true)}
      />

      <OfflineIndicator />
    </div>
  );
}
