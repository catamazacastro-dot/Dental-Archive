import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  BookOpen,
  Check,
  CheckSquare,
  Copy,
  FilePlus2,
  FileText,
  FolderPlus,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import type { ApunteNote, MateriaPlan } from '../types/dental';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

interface NotebookSource {
  id: string;
  titulo: string;
  tipo: 'apunte' | 'texto' | 'archivo';
  contenido: string;
  activo: boolean;
  addedAt: string;
}

interface NotebookSavedNote {
  id: string;
  titulo: string;
  contenido: string;
  createdAt: string;
}

interface NotebookWorkspace {
  id: string;
  titulo: string;
  materia: string;
  sources: NotebookSource[];
  messages: ChatMessage[];
  pinnedNotes: NotebookSavedNote[];
  updatedAt: string;
}

interface IAViewProps {
  materias: MateriaPlan[];
  apuntes: ApunteNote[];
  onSaveAsResumen: (note: ApunteNote) => void;
}

const NOTEBOOKS_STORAGE_KEY = 'dental_archive_ai_notebooks_v1';
const ACTIVE_NOTEBOOK_KEY = 'dental_archive_ai_active_notebook_v1';
const LEGACY_CHAT_STORAGE_KEY = 'dental_archive_ai_chat_v1';

const STUDIO_ACTIONS = [
  {
    id: 'guia',
    label: 'Guía de estudio',
    prompt:
      'Armame una guía de estudio clara y estructurada con subtítulos y puntos clave basada en las fuentes activas de este cuaderno.',
  },
  {
    id: 'parcial',
    label: 'Preguntas tipo parcial',
    prompt:
      'Generame 5 preguntas tipo multiple choice de nivel universitario con sus respuestas justificadas usando las fuentes de este cuaderno.',
  },
  {
    id: 'glosario',
    label: 'Conceptos clave',
    prompt:
      'Extraé un glosario con las definiciones, estructuras y puntos críticos más evaluados de este cuaderno.',
  },
  {
    id: 'cuadro',
    label: 'Cuadro comparativo',
    prompt:
      'Hacé un cuadro comparativo resumiendo las diferencias y relaciones principales de los temas de este cuaderno.',
  },
];

function createDefaultNotebook(initialMessages: ChatMessage[] = []): NotebookWorkspace {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: `nb-${Date.now().toString(36)}`,
    titulo: 'Cuaderno General · Odontología',
    materia: '',
    sources: [],
    messages: initialMessages,
    pinnedNotes: [],
    updatedAt: now,
  };
}

function loadNotebooks(): NotebookWorkspace[] {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NotebookWorkspace[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((nb) => ({
          ...nb,
          sources: Array.isArray(nb.sources) ? nb.sources : [],
          messages: Array.isArray(nb.messages) ? nb.messages : [],
          pinnedNotes: Array.isArray(nb.pinnedNotes) ? nb.pinnedNotes : [],
        }));
      }
    }
    const legacyRaw = localStorage.getItem(LEGACY_CHAT_STORAGE_KEY);
    if (legacyRaw) {
      const legacyMsgs = JSON.parse(legacyRaw);
      if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
        return [createDefaultNotebook(legacyMsgs as ChatMessage[])];
      }
    }
  } catch {
    // Fallback
  }
  return [createDefaultNotebook()];
}

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedAiText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (/^#{1,3}\s+/.test(trimmed)) {
          const heading = trimmed.replace(/^#{1,3}\s+/, '');
          return (
            <h4 key={idx} className="pt-1 text-sm font-bold text-rose-950">
              {renderInlineBold(heading)}
            </h4>
          );
        }
        if (/^[-*•]\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-800" />
              <span>{renderInlineBold(itemText)}</span>
            </div>
          );
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="shrink-0 pt-0.5 font-mono text-xs font-bold text-rose-900 tabular-nums">
                  {match[1]}
                </span>
                <span>{renderInlineBold(match[2])}</span>
              </div>
            );
          }
        }
        return <p key={idx}>{renderInlineBold(trimmed)}</p>;
      })}
    </div>
  );
}

export const IAView: React.FC<IAViewProps> = ({
  materias,
  apuntes,
  onSaveAsResumen,
}) => {
  const isOnline = useOnlineStatus();
  const [notebooks, setNotebooks] = useState<NotebookWorkspace[]>(() => loadNotebooks());
  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_NOTEBOOK_KEY) || '';
    } catch {
      return '';
    }
  });

  // UI states
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'fuentes' | 'notas'>('chat');
  const [desktopRightTab, setDesktopRightTab] = useState<'chat' | 'notas'>('chat');

  // Create / rename notebook states
  const [showNewNotebookForm, setShowNewNotebookForm] = useState(false);
  const [newNbTitle, setNewNbTitle] = useState('');
  const [newNbMateria, setNewNbMateria] = useState('');
  const [renamingNotebook, setRenamingNotebook] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  // Add source states
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceMode, setSourceMode] = useState<'biblio' | 'texto' | 'archivo'>('biblio');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceBody, setSourceBody] = useState('');
  const [biblioSearch, setBiblioSearch] = useState('');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // Manual note in notebook
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');

  // Chat streaming state
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedMsgId, setPinnedMsgId] = useState<string | null>(null);
  const [savedResumenId, setSavedResumenId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeNotebook = useMemo(() => {
    return (
      notebooks.find((n) => n.id === activeNotebookId) ||
      notebooks[0] ||
      createDefaultNotebook()
    );
  }, [notebooks, activeNotebookId]);

  useEffect(() => {
    if (!notebooks.some((n) => n.id === activeNotebookId) && notebooks[0]) {
      setActiveNotebookId(notebooks[0].id);
    }
  }, [notebooks, activeNotebookId]);

  useEffect(() => {
    try {
      const trimmed = notebooks.map((nb) => ({
        ...nb,
        messages: nb.messages.slice(-40),
      }));
      localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore storage errors
    }
  }, [notebooks]);

  useEffect(() => {
    try {
      if (activeNotebook.id) {
        localStorage.setItem(ACTIVE_NOTEBOOK_KEY, activeNotebook.id);
      }
    } catch {
      // Ignore storage errors
    }
  }, [activeNotebook.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeNotebook.messages.length, isStreaming]);

  const updateActiveNotebook = (
    updater: (nb: NotebookWorkspace) => NotebookWorkspace
  ) => {
    const targetId = activeNotebook.id;
    setNotebooks((prev) =>
      prev.map((nb) =>
        nb.id === targetId
          ? { ...updater(nb), updatedAt: new Date().toISOString().slice(0, 10) }
          : nb
      )
    );
  };

  const materiaOptions = useMemo(
    () =>
      Array.from(new Set(materias.map((m) => m.nombre))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [materias]
  );

  const availableApuntes = useMemo(() => {
    const q = biblioSearch.trim().toLowerCase();
    return apuntes
      .filter((a) => a.contenido.trim().length > 0 || a.archivoNombre || a.enlaceUrl)
      .filter(
        (a) =>
          !q ||
          a.titulo.toLowerCase().includes(q) ||
          a.materia.toLowerCase().includes(q)
      );
  }, [apuntes, biblioSearch]);

  const activeSources = useMemo(
    () => activeNotebook.sources.filter((s) => s.activo),
    [activeNotebook.sources]
  );

  const handleCreateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newNbTitle.trim();
    if (!title) return;
    const fresh: NotebookWorkspace = {
      id: `nb-${Date.now().toString(36)}`,
      titulo: title,
      materia: newNbMateria,
      sources: [],
      messages: [],
      pinnedNotes: [],
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setNotebooks((prev) => [fresh, ...prev]);
    setActiveNotebookId(fresh.id);
    setNewNbTitle('');
    setNewNbMateria('');
    setShowNewNotebookForm(false);
    setErrorMsg('');
  };

  const handleDeleteNotebook = (id: string) => {
    if (isStreaming && id === activeNotebook.id) {
      abortRef.current?.abort();
    }
    setNotebooks((prev) => {
      const remaining = prev.filter((n) => n.id !== id);
      if (remaining.length === 0) {
        const fresh = createDefaultNotebook();
        setActiveNotebookId(fresh.id);
        return [fresh];
      }
      if (activeNotebook.id === id) {
        setActiveNotebookId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = renameDraft.trim();
    if (clean) {
      updateActiveNotebook((nb) => ({ ...nb, titulo: clean }));
    }
    setRenamingNotebook(false);
  };

  const handleAttachApunteSource = (apunte: ApunteNote) => {
    const textContent =
      apunte.contenido.trim() ||
      `Material de biblioteca: ${apunte.titulo} (${apunte.materia}, ${apunte.anio}° año).${
        apunte.archivoNombre ? ` Archivo: ${apunte.archivoNombre}.` : ''
      }${apunte.enlaceUrl ? ` Enlace: ${apunte.enlaceUrl}.` : ''}`;

    const fresh: NotebookSource = {
      id: `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      titulo: `${apunte.titulo} (${apunte.materia})`,
      tipo: 'apunte',
      contenido: textContent,
      activo: true,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    updateActiveNotebook((nb) => ({
      ...nb,
      sources: [fresh, ...nb.sources],
    }));
    setShowAddSource(false);
  };

  const handleAddTextSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBody.trim()) return;
    const fresh: NotebookSource = {
      id: `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      titulo: sourceTitle.trim() || `Fuente de texto (${activeNotebook.sources.length + 1})`,
      tipo: 'texto',
      contenido: sourceBody.trim(),
      activo: true,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    updateActiveNotebook((nb) => ({
      ...nb,
      sources: [fresh, ...nb.sources],
    }));
    setSourceTitle('');
    setSourceBody('');
    setShowAddSource(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result.trim() : '';
      if (!content) {
        setErrorMsg('El archivo seleccionado está vacío o no contiene texto legible (.txt / .md).');
        return;
      }
      const fresh: NotebookSource = {
        id: `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        titulo: file.name,
        tipo: 'archivo',
        contenido: content.slice(0, 30000),
        activo: true,
        addedAt: new Date().toISOString().slice(0, 10),
      };
      updateActiveNotebook((nb) => ({
        ...nb,
        sources: [fresh, ...nb.sources],
      }));
      setShowAddSource(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleSource = (sourceId: string) => {
    updateActiveNotebook((nb) => ({
      ...nb,
      sources: nb.sources.map((s) =>
        s.id === sourceId ? { ...s, activo: !s.activo } : s
      ),
    }));
  };

  const handleDeleteSource = (sourceId: string) => {
    updateActiveNotebook((nb) => ({
      ...nb,
      sources: nb.sources.filter((s) => s.id !== sourceId),
    }));
  };

  const sendPrompt = async (rawText: string) => {
    const clean = rawText.trim();
    if (!clean || isStreaming) return;
    if (!isOnline) {
      setErrorMsg('Necesitás conexión a internet para consultar con Notebook IA.');
      return;
    }

    setErrorMsg('');
    setDesktopRightTab('chat');
    setMobilePanel('chat');

    const targetNbId = activeNotebook.id;
    const userMsg: ChatMessage = {
      id: `u-${Date.now().toString(36)}`,
      role: 'user',
      text: clean,
      createdAt: new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const assistantId = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const placeholderMsg: ChatMessage = {
      id: assistantId,
      role: 'model',
      text: '',
      createdAt: new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const nextHistory = [...activeNotebook.messages, userMsg];
    setNotebooks((prev) =>
      prev.map((nb) =>
        nb.id === targetNbId
          ? { ...nb, messages: [...nextHistory, placeholderMsg] }
          : nb
      )
    );
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          notebookTitle: activeNotebook.titulo,
          materia: activeNotebook.materia || undefined,
          fuentes: activeSources.map((s) => ({
            titulo: s.titulo,
            contenido: s.contenido,
          })),
        }),
      });

      if (!response.ok) {
        let serverError = 'No se pudo conectar con la IA.';
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) serverError = data.error;
        } catch {
          // Ignore parse fallback
        }
        throw new Error(serverError);
      }

      if (!response.body) {
        throw new Error('La respuesta del servidor no incluyó contenido.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const lines = evt.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const rawJson = line.slice(6).trim();
            if (!rawJson) continue;
            try {
              const payload = JSON.parse(rawJson) as {
                text?: string;
                error?: string;
                done?: boolean;
              };
              if (payload.error) {
                throw new Error(payload.error);
              }
              if (payload.text) {
                accumulated += payload.text;
                setNotebooks((prev) =>
                  prev.map((nb) =>
                    nb.id === targetNbId
                      ? {
                          ...nb,
                          messages: nb.messages.map((m) =>
                            m.id === assistantId ? { ...m, text: accumulated } : m
                          ),
                        }
                      : nb
                  )
                );
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== 'Unexpected end of JSON input'
              ) {
                throw parseErr;
              }
            }
          }
        }
      }

      if (!accumulated.trim()) {
        setNotebooks((prev) =>
          prev.map((nb) =>
            nb.id === targetNbId
              ? {
                  ...nb,
                  messages: nb.messages.filter((m) => m.id !== assistantId),
                }
              : nb
          )
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setNotebooks((prev) =>
          prev.map((nb) =>
            nb.id === targetNbId
              ? {
                  ...nb,
                  messages: nb.messages.filter(
                    (m) => m.id !== assistantId || m.text.trim().length > 0
                  ),
                }
              : nb
          )
        );
      } else {
        setNotebooks((prev) =>
          prev.map((nb) =>
            nb.id === targetNbId
              ? {
                  ...nb,
                  messages: nb.messages.filter((m) => m.id !== assistantId),
                }
              : nb
          )
        );
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al consultar con Notebook IA.'
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    abortRef.current?.abort();
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handlePinReplyToNotebook = (msg: ChatMessage, msgIdx: number) => {
    const prevUserMsg = [...activeNotebook.messages]
      .slice(0, msgIdx)
      .reverse()
      .find((m) => m.role === 'user');
    const title = prevUserMsg
      ? prevUserMsg.text.slice(0, 68)
      : `Nota · ${activeNotebook.titulo}`;

    const freshNote: NotebookSavedNote = {
      id: `note-${Date.now().toString(36)}`,
      titulo: title,
      contenido: msg.text,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    updateActiveNotebook((nb) => ({
      ...nb,
      pinnedNotes: [freshNote, ...nb.pinnedNotes],
    }));

    setPinnedMsgId(msg.id);
    setTimeout(() => setPinnedMsgId((cur) => (cur === msg.id ? null : cur)), 2200);
  };

  const handleAddManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteBody.trim()) return;
    const freshNote: NotebookSavedNote = {
      id: `note-${Date.now().toString(36)}`,
      titulo: newNoteTitle.trim() || `Apunte del cuaderno`,
      contenido: newNoteBody.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    updateActiveNotebook((nb) => ({
      ...nb,
      pinnedNotes: [freshNote, ...nb.pinnedNotes],
    }));
    setNewNoteTitle('');
    setNewNoteBody('');
  };

  const handleExportToResumenes = (id: string, title: string, content: string) => {
    const matchedMat = materias.find((m) => m.nombre === activeNotebook.materia);
    onSaveAsResumen({
      id: `ap-nb-${Date.now().toString(36)}`,
      titulo: title.slice(0, 80),
      materia:
        activeNotebook.materia || materias[0]?.nombre || 'Odontología General',
      anio: matchedMat?.anio || 1,
      categoria: 'resumenes',
      favorito: false,
      etiquetas: ['Notebook IA', activeNotebook.titulo.slice(0, 24)],
      offlineReady: true,
      contenido: content,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setSavedResumenId(id);
    setTimeout(() => setSavedResumenId((cur) => (cur === id ? null : cur)), 2400);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* HEADER + CREAR CUADERNO */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rose-200/80 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Cuadernos de estudio con fuentes propias · Resúmenes, guías y preguntas de examen
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-rose-900">
            <Sparkles size={22} className="text-rose-900" />
            <span>Notebook IA</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowNewNotebookForm((v) => !v)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-rose-900 px-4 text-xs font-bold text-white transition-colors hover:bg-rose-950"
        >
          <FolderPlus size={15} />
          <span>Nuevo cuaderno</span>
        </button>
      </div>

      {/* FORMULARIO CREAR CUADERNO */}
      {showNewNotebookForm && (
        <form
          onSubmit={handleCreateNotebook}
          className="grid gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:grid-cols-12 sm:items-end"
        >
          <div className="sm:col-span-5">
            <label
              htmlFor="nb-title-input"
              className="block text-[11px] font-semibold text-rose-950"
            >
              Nombre del cuaderno
            </label>
            <input
              id="nb-title-input"
              type="text"
              required
              value={newNbTitle}
              onChange={(e) => setNewNbTitle(e.target.value)}
              placeholder="Ej. Parcial Anatomía · Cabeza y Cuello"
              className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 text-xs text-slate-900"
            />
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="nb-materia-select"
              className="block text-[11px] font-semibold text-rose-950"
            >
              Materia (opcional)
            </label>
            <select
              id="nb-materia-select"
              value={newNbMateria}
              onChange={(e) => setNewNbMateria(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-800"
            >
              <option value="">General / Todas las materias</option>
              {materiaOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 sm:col-span-3 sm:justify-end">
            <button
              type="submit"
              className="h-9 flex-1 rounded-lg bg-rose-900 px-3.5 text-xs font-bold text-white hover:bg-rose-950 sm:flex-none"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowNewNotebookForm(false)}
              className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-rose-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* SELECTOR DE CUADERNOS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {notebooks.map((nb) => {
          const isActive = nb.id === activeNotebook.id;
          return (
            <div
              key={nb.id}
              className={`group flex shrink-0 items-center rounded-xl border transition-colors ${
                isActive
                  ? 'border-rose-900 bg-rose-900 text-white'
                  : 'border-rose-200 bg-white text-slate-800 hover:bg-rose-50/70'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (isStreaming) abortRef.current?.abort();
                  setActiveNotebookId(nb.id);
                  setRenamingNotebook(false);
                  setErrorMsg('');
                }}
                className="flex min-h-[40px] items-center gap-2 px-3.5 text-left"
              >
                <BookMarked size={14} className={isActive ? 'text-rose-100' : 'text-rose-900'} />
                <span className="max-w-[180px] truncate text-xs font-bold">
                  {nb.titulo}
                </span>
                <span
                  className={`text-[11px] tabular-nums ${
                    isActive ? 'text-rose-200' : 'text-slate-500'
                  }`}
                >
                  · {nb.sources.length}
                </span>
              </button>

              {notebooks.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteNotebook(nb.id)}
                  aria-label={`Eliminar cuaderno ${nb.titulo}`}
                  title={`Eliminar cuaderno ${nb.titulo}`}
                  className={`mr-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'text-rose-200 hover:bg-rose-950 hover:text-white'
                      : 'text-slate-400 hover:bg-rose-100 hover:text-rose-800'
                  }`}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* BARRA DEL CUADERNO ACTIVO */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {renamingNotebook ? (
            <form onSubmit={handleRenameSubmit} className="flex flex-1 items-center gap-2">
              <input
                type="text"
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                className="h-8 max-w-sm flex-1 rounded-lg border border-rose-300 bg-white px-2.5 text-xs font-semibold text-slate-900"
              />
              <button
                type="submit"
                className="h-8 rounded-lg bg-rose-900 px-3 text-xs font-semibold text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setRenamingNotebook(false)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <span className="truncate text-sm font-bold text-rose-950">
                {activeNotebook.titulo}
              </span>
              {activeNotebook.materia && (
                <span className="hidden text-xs font-medium text-emerald-700 sm:inline">
                  · {activeNotebook.materia}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setRenameDraft(activeNotebook.titulo);
                  setRenamingNotebook(true);
                }}
                aria-label="Renombrar cuaderno"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-rose-900"
              >
                <Pencil size={13} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
          <span>
            {activeSources.length} {activeSources.length === 1 ? 'fuente activa' : 'fuentes activas'}
          </span>
          {activeNotebook.messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                abortRef.current?.abort();
                updateActiveNotebook((nb) => ({ ...nb, messages: [] }));
                setErrorMsg('');
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
            >
              <RotateCcw size={12} />
              <span>Limpiar chat</span>
            </button>
          )}
        </div>
      </div>

      {/* SWITCHER MÓVIL (< lg) */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-rose-200 bg-white p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePanel('chat')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
            mobilePanel === 'chat'
              ? 'bg-rose-900 text-white'
              : 'text-slate-600 hover:text-rose-950'
          }`}
        >
          Chat IA
        </button>
        <button
          type="button"
          onClick={() => setMobilePanel('fuentes')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold tabular-nums transition-colors ${
            mobilePanel === 'fuentes'
              ? 'bg-rose-900 text-white'
              : 'text-slate-600 hover:text-rose-950'
          }`}
        >
          Fuentes ({activeNotebook.sources.length})
        </button>
        <button
          type="button"
          onClick={() => setMobilePanel('notas')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold tabular-nums transition-colors ${
            mobilePanel === 'notas'
              ? 'bg-rose-900 text-white'
              : 'text-slate-600 hover:text-rose-950'
          }`}
        >
          Notas ({activeNotebook.pinnedNotes.length})
        </button>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
          <WifiOff size={15} />
          <span>
            Estás sin conexión. Podés revisar tus cuadernos, fuentes y notas guardadas; para consultar a la IA necesitás internet.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-900">
          {errorMsg}
        </div>
      )}

      {/* ESPACIO NOTEBOOK: FUENTES (4 COLS) + CHAT/NOTAS (8 COLS) */}
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        {/* PANEL FUENTES */}
        <aside
          className={`overflow-hidden rounded-2xl border border-rose-200/80 bg-white lg:col-span-4 lg:block ${
            mobilePanel === 'fuentes' ? 'block' : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between border-b border-rose-200/80 bg-rose-50/70 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-rose-950">Fuentes del cuaderno</h2>
              <p className="text-[11px] text-slate-500 tabular-nums">
                {activeSources.length} de {activeNotebook.sources.length} activas
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddSource((v) => !v)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-900 px-2.5 text-[11px] font-semibold text-white hover:bg-rose-950"
            >
              <Plus size={13} />
              <span>Agregar</span>
            </button>
          </div>

          <div className="p-3.5 space-y-3">
            {showAddSource && (
              <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-white p-0.5 ring-1 ring-rose-200">
                  <button
                    type="button"
                    onClick={() => setSourceMode('biblio')}
                    className={`rounded-md py-1.5 text-[11px] font-semibold ${
                      sourceMode === 'biblio'
                        ? 'bg-rose-900 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    Biblio
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('texto')}
                    className={`rounded-md py-1.5 text-[11px] font-semibold ${
                      sourceMode === 'texto'
                        ? 'bg-rose-900 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('archivo')}
                    className={`rounded-md py-1.5 text-[11px] font-semibold ${
                      sourceMode === 'archivo'
                        ? 'bg-rose-900 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    Archivo
                  </button>
                </div>

                {sourceMode === 'biblio' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={biblioSearch}
                      onChange={(e) => setBiblioSearch(e.target.value)}
                      placeholder="Buscar en tus resúmenes o PDFs..."
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                    />
                    {availableApuntes.length === 0 ? (
                      <p className="py-2 text-center text-[11px] text-slate-500">
                        No tenés resúmenes ni apuntes cargados todavía en Biblio de Apuntes.
                      </p>
                    ) : (
                      <div className="max-h-48 space-y-1.5 overflow-y-auto">
                        {availableApuntes.map((ap) => (
                          <button
                            key={ap.id}
                            type="button"
                            onClick={() => handleAttachApunteSource(ap)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-rose-300 hover:bg-rose-50/60"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-900">
                                {ap.titulo}
                              </p>
                              <p className="truncate text-[10px] text-slate-500">
                                {ap.materia}
                              </p>
                            </div>
                            <Plus size={14} className="shrink-0 text-rose-900" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {sourceMode === 'texto' && (
                  <form onSubmit={handleAddTextSource} className="space-y-2">
                    <input
                      type="text"
                      value={sourceTitle}
                      onChange={(e) => setSourceTitle(e.target.value)}
                      placeholder="Título de la fuente (ej. Teórico Nervio Facial)"
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                    />
                    <textarea
                      rows={4}
                      required
                      value={sourceBody}
                      onChange={(e) => setSourceBody(e.target.value)}
                      placeholder="Pegá acá tu apunte, clase desgrabada o guía..."
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900"
                    />
                    <button
                      type="submit"
                      className="h-8 w-full rounded-lg bg-rose-900 text-xs font-semibold text-white hover:bg-rose-950"
                    >
                      Agregar fuente al cuaderno
                    </button>
                  </form>
                )}

                {sourceMode === 'archivo' && (
                  <div className="space-y-2 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-rose-300 bg-white px-4 py-5 text-xs font-semibold text-rose-950 hover:bg-rose-50"
                    >
                      <Upload size={18} className="text-rose-900" />
                      <span>Elegir archivo de texto (.txt, .md)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeNotebook.sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/30 p-5 text-center">
                <FileText size={20} className="mx-auto text-rose-900/60" />
                <p className="mt-2 text-xs font-semibold text-slate-800">
                  Cuaderno sin fuentes todavía
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Agregá resúmenes de tu Biblio, texto pegado o archivos para que la IA responda basada en tu material.
                </p>
              </div>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                {activeNotebook.sources.map((src) => {
                  const isExpanded = expandedSourceId === src.id;
                  return (
                    <li
                      key={src.id}
                      className={`rounded-xl border p-2.5 transition-colors ${
                        src.activo
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-200 bg-slate-50/60 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSource(src.id)}
                          aria-label={
                            src.activo
                              ? `Desactivar fuente ${src.titulo}`
                              : `Activar fuente ${src.titulo}`
                          }
                          className="mt-0.5 shrink-0 text-emerald-700"
                        >
                          {src.activo ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} className="text-slate-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSourceId(isExpanded ? null : src.id)
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-bold text-slate-900">
                            {src.titulo}
                          </p>
                          <p className="text-[10px] text-slate-500 tabular-nums">
                            {src.tipo === 'apunte'
                              ? 'Biblio'
                              : src.tipo === 'archivo'
                                ? 'Archivo'
                                : 'Texto'}{' '}
                            · {src.contenido.length.toLocaleString('es-AR')} car.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSource(src.id)}
                          aria-label={`Quitar fuente ${src.titulo}`}
                          className="shrink-0 p-1 text-slate-400 hover:text-rose-800"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {isExpanded && (
                        <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-relaxed text-slate-700">
                          {src.contenido.slice(0, 800)}
                          {src.contenido.length > 800 ? '...' : ''}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* PANEL DERECHO: CHAT + NOTAS DEL CUADERNO */}
        <section className="space-y-3 lg:col-span-8">
          {/* Desktop switcher Chat / Notas */}
          <div className="hidden items-center justify-between rounded-xl border border-rose-200/80 bg-white px-3.5 py-2 lg:flex">
            <div className="flex items-center gap-1 rounded-lg bg-rose-50/70 p-0.5">
              <button
                type="button"
                onClick={() => setDesktopRightTab('chat')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  desktopRightTab === 'chat'
                    ? 'bg-rose-900 text-white'
                    : 'text-slate-600 hover:text-rose-950'
                }`}
              >
                Chat del cuaderno
              </button>
              <button
                type="button"
                onClick={() => setDesktopRightTab('notas')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                  desktopRightTab === 'notas'
                    ? 'bg-rose-900 text-white'
                    : 'text-slate-600 hover:text-rose-950'
                }`}
              >
                Notas guardadas ({activeNotebook.pinnedNotes.length})
              </button>
            </div>

            <span className="text-[11px] font-medium text-slate-500">
              {activeSources.length > 0
                ? `Respuestas fundamentadas en ${activeSources.length} ${
                    activeSources.length === 1 ? 'fuente' : 'fuentes'
                  }`
                : 'Agregá fuentes a la izquierda o preguntá directamente'}
            </span>
          </div>

          {/* VISTA CHAT */}
          <div
            className={`${
              mobilePanel === 'chat' ? 'block' : 'hidden'
            } ${desktopRightTab === 'chat' ? 'lg:block' : 'lg:hidden'} space-y-3`}
          >
            {/* Studio quick actions */}
            <div className="flex flex-wrap gap-2">
              {STUDIO_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={!isOnline || isStreaming}
                  onClick={() => void sendPrompt(action.prompt)}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-45"
                >
                  <Sparkles size={12} />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Conversación */}
            <div className="flex min-h-[360px] max-h-[54vh] flex-col overflow-y-auto rounded-2xl border border-rose-200/80 bg-white p-4 sm:p-5">
              {activeNotebook.messages.length === 0 ? (
                <div className="my-auto flex flex-col items-center py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-900">
                    <BookMarked size={22} />
                  </div>
                  <h2 className="mt-3 text-base font-bold text-rose-950">
                    {activeNotebook.titulo}
                  </h2>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-600">
                    {activeSources.length > 0
                      ? `Tenés ${activeSources.length} ${
                          activeSources.length === 1 ? 'fuente activa' : 'fuentes activas'
                        } en este cuaderno. Usá los botones de arriba o hacé una pregunta específica.`
                      : 'Cargá resúmenes o texto en Fuentes para estudiar como en NotebookLM, o consultale directo a la IA.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeNotebook.messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[85%] ${
                            isUser
                              ? 'bg-rose-900 text-white'
                              : 'border border-rose-200/80 bg-rose-50/35 text-slate-800'
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {msg.text}
                            </p>
                          ) : msg.text ? (
                            <FormattedAiText text={msg.text} />
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-900" />
                              Analizando fuentes del cuaderno...
                            </span>
                          )}
                        </div>

                        {!isUser &&
                          msg.text &&
                          !(isStreaming && idx === activeNotebook.messages.length - 1) && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1">
                              <button
                                type="button"
                                onClick={() => void handleCopy(msg.id, msg.text)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                              >
                                {copiedId === msg.id ? (
                                  <Check size={11} />
                                ) : (
                                  <Copy size={11} />
                                )}
                                <span>{copiedId === msg.id ? 'Copiado' : 'Copiar'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePinReplyToNotebook(msg, idx)}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                              >
                                <NotebookPen size={11} />
                                <span>
                                  {pinnedMsgId === msg.id
                                    ? 'Guardada en Notas'
                                    : 'Fijar en Notas'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleExportToResumenes(
                                    msg.id,
                                    activeNotebook.titulo,
                                    msg.text
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-900 hover:bg-rose-50"
                              >
                                {savedResumenId === msg.id ? (
                                  <>
                                    <BookOpen size={11} />
                                    <span>Enviado a Mis Resúmenes</span>
                                  </>
                                ) : (
                                  <>
                                    <FilePlus2 size={11} />
                                    <span>Exportar a Resúmenes</span>
                                  </>
                                )}
                              </button>

                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {msg.createdAt}
                              </span>
                            </div>
                          )}
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendPrompt(input);
              }}
              className="flex items-end gap-2 rounded-2xl border border-rose-200/80 bg-white p-3"
            >
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendPrompt(input);
                  }
                }}
                placeholder={
                  activeSources.length > 0
                    ? `Preguntá sobre las ${activeSources.length} fuentes de "${activeNotebook.titulo}"...`
                    : 'Escribí tu consulta sobre la materia o pegá una duda...'
                }
                className="max-h-36 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                >
                  <Square size={13} fill="currentColor" />
                  <span>Detener</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || !isOnline}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-rose-900 px-4 text-xs font-semibold text-white hover:bg-rose-950 disabled:opacity-40"
                >
                  <Send size={14} />
                  <span>Preguntar</span>
                </button>
              )}
            </form>
          </div>

          {/* VISTA NOTAS GUARDADAS DEL CUADERNO */}
          <div
            className={`${
              mobilePanel === 'notas' ? 'block' : 'hidden'
            } ${desktopRightTab === 'notas' ? 'lg:block' : 'lg:hidden'} space-y-4`}
          >
            <form
              onSubmit={handleAddManualNote}
              className="space-y-2.5 rounded-2xl border border-rose-200/80 bg-white p-4"
            >
              <h3 className="text-xs font-bold text-rose-950">
                Nueva nota rápida en este cuaderno
              </h3>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Título (ej. Puntos clave del parcial)"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
              />
              <textarea
                rows={3}
                required
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                placeholder="Escribí conclusiones, mnemotecnias o recordatorios..."
                className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-900"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
              >
                <Plus size={14} />
                <span>Guardar nota en cuaderno</span>
              </button>
            </form>

            {activeNotebook.pinnedNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-8 text-center">
                <NotebookPen size={22} className="mx-auto text-rose-900/60" />
                <p className="mt-2 text-xs font-semibold text-slate-800">
                  Todavía no guardaste notas en este cuaderno
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tocá «Fijar en Notas» debajo de cualquier respuesta de la IA o escribí una arriba.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeNotebook.pinnedNotes.map((note) => (
                  <article
                    key={note.id}
                    className="flex flex-col justify-between rounded-2xl border border-rose-200/80 bg-white p-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-rose-950">{note.titulo}</h4>
                        <button
                          type="button"
                          onClick={() =>
                            updateActiveNotebook((nb) => ({
                              ...nb,
                              pinnedNotes: nb.pinnedNotes.filter((n) => n.id !== note.id),
                            }))
                          }
                          aria-label={`Eliminar nota ${note.titulo}`}
                          className="shrink-0 p-1 text-slate-400 hover:text-rose-800"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                        {note.createdAt}
                      </p>
                      <div className="mt-2 max-h-48 overflow-y-auto text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {note.contenido}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-rose-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleExportToResumenes(note.id, note.titulo, note.contenido)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-900 hover:underline"
                      >
                        <FilePlus2 size={12} />
                        <span>
                          {savedResumenId === note.id
                            ? 'Enviado a Mis Resúmenes'
                            : 'Enviar a Mis Resúmenes'}
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
