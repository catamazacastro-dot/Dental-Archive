import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  FileUp,
  Focus,
  GraduationCap,
  HelpCircle,
  Info,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  ATLAS_VISTAS_PRESET,
  type AtlasVistaId,
  type AtlasVistaPreset,
  type CraneoRegion,
} from '../data/craneoAtlasData';
import {
  AtlasSkullCanvas,
  type AtlasModelSummary,
  type AtlasSkullCanvasHandle,
  type LoadedMeshRecord,
} from './AtlasSkullCanvas';

const DEFAULT_MODEL_URL = '/models/craneo-humano.glb';
const DEFAULT_MODEL_LABEL = 'Cráneo Humano Segmentado (BodyParts3D · 22 huesos)';

type AtlasMode = 'exploracion' | 'examen';
type ExplorerSideTab = 'ficha' | 'estructuras';
type RegionFilter = 'todas' | CraneoRegion;
type ExamStyle = 'nombrar' | 'senalar';

const EMPTY_KEYS: string[] = [];

interface ExamQuestion {
  targetKey: string;
  targetName: string;
  targetRegion: CraneoRegion;
  options: { key: string; label: string }[];
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const AtlasOsteologicoView: React.FC = () => {
  const canvasRef = useRef<AtlasSkullCanvasHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [modelSource, setModelSource] = useState<
    | { kind: 'url'; url: string; label: string }
    | { kind: 'buffer'; buffer: ArrayBuffer; label: string }
  >({
    kind: 'url',
    url: DEFAULT_MODEL_URL,
    label: DEFAULT_MODEL_LABEL,
  });

  const [modelSummary, setModelSummary] = useState<AtlasModelSummary | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Mode & panel state
  const [mode, setMode] = useState<AtlasMode>('exploracion');
  const [sideTab, setSideTab] = useState<ExplorerSideTab>('ficha');
  const [showAttribution, setShowAttribution] = useState(false);

  // Viewer interaction state
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [isolatedKey, setIsolatedKey] = useState<string | null>(null);
  const [translucentContext, setTranslucentContext] = useState(false);
  const [activeVista, setActiveVista] = useState<AtlasVistaId>('inicial');

  // Structure list filters
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('todas');

  // Exam state
  const [examRegion, setExamRegion] = useState<RegionFilter>('todas');
  const [examStyle, setExamStyle] = useState<ExamStyle>('nombrar');
  const [examQuestion, setExamQuestion] = useState<ExamQuestion | null>(null);
  const [examPickedKey, setExamPickedKey] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [examScore, setExamScore] = useState({ correct: 0, total: 0, streak: 0 });
  const [examIsolateHint, setExamIsolateHint] = useState(false);

  const meshByKey = useMemo(() => {
    const map = new Map<string, LoadedMeshRecord>();
    if (modelSummary) {
      for (const m of modelSummary.meshes) {
        map.set(m.key, m);
      }
    }
    return map;
  }, [modelSummary]);

  const selectedMesh = useMemo(
    () => (selectedKey ? meshByKey.get(selectedKey) || null : null),
    [selectedKey, meshByKey]
  );

  const hoveredMesh = useMemo(
    () => (hoveredKey ? meshByKey.get(hoveredKey) || null : null),
    [hoveredKey, meshByKey]
  );

  const hiddenSet = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);

  const getDisplayName = useCallback((m: LoadedMeshRecord): string => {
    return m.info?.nombre || m.rawName;
  }, []);

  const filteredMeshes = useMemo(() => {
    if (!modelSummary) return [];
    const q = searchQuery.trim().toLowerCase();
    return modelSummary.meshes.filter((m) => {
      if (regionFilter !== 'todas' && m.info?.region !== regionFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        m.info?.nombre,
        m.info?.nombreLatino,
        m.info?.fmaId,
        m.rawName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [modelSummary, searchQuery, regionFilter]);

  const handleModelLoaded = useCallback((summary: AtlasModelSummary) => {
    setModelSummary(summary);
    setModelError(null);
    setHiddenKeys([]);
    setIsolatedKey(null);
    setHoveredKey(null);
    setActiveVista('inicial');
    setExamQuestion(null);
    setExamPickedKey(null);
    setExamResult('idle');

    // Select mandible or first recognized mesh softly only? Better: start clean with no forced selection or let user click;
    // keep selectedKey null so whole skull displays in crisp natural bone ivory first.
    setSelectedKey(null);
  }, []);

  const handleModelError = useCallback((message: string) => {
    setModelError(message);
  }, []);

  const handleSelectVista = (preset: AtlasVistaPreset) => {
    setActiveVista(preset.id);
    canvasRef.current?.applyPresetView(preset);
  };

  const handleResetView = () => {
    setActiveVista('inicial');
    canvasRef.current?.resetView();
  };

  const handleToggleHide = (key: string) => {
    setHiddenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    if (isolatedKey === key) {
      setIsolatedKey(null);
    }
  };

  const handleToggleIsolate = (key: string) => {
    setIsolatedKey((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        setHiddenKeys((cur) => cur.filter((k) => k !== next));
        window.setTimeout(() => {
          canvasRef.current?.focusStructure(next);
        }, 20);
      }
      return next;
    });
  };

  const handleShowAll = () => {
    setHiddenKeys([]);
    setIsolatedKey(null);
  };

  const handleSelectFromList = (key: string) => {
    setSelectedKey(key);
    setSideTab('ficha');
    if (hiddenSet.has(key)) {
      setHiddenKeys((prev) => prev.filter((k) => k !== key));
    }
    canvasRef.current?.focusStructure(key);
  };

  // === EXAM ENGINE ===
  const eligibleExamMeshes = useMemo(() => {
    if (!modelSummary) return [];
    return modelSummary.meshes.filter((m) => {
      if (!m.info) return false;
      if (examRegion !== 'todas' && m.info.region !== examRegion) return false;
      return true;
    });
  }, [modelSummary, examRegion]);

  const generateNextQuestion = useCallback(
    (styleOverride?: ExamStyle, prevTargetKey?: string) => {
      const pool = eligibleExamMeshes;
      if (pool.length < 2) {
        setExamQuestion(null);
        return;
      }
      const candidates =
        pool.length > 2 && prevTargetKey
          ? pool.filter((m) => m.key !== prevTargetKey)
          : pool;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      if (!target || !target.info) return;

      // Prefer distractors from the same region for academic rigor, falling back to any skull bone
      const sameRegion = pool.filter(
        (m) => m.key !== target.key && m.info?.region === target.info?.region
      );
      const others = pool.filter((m) => m.key !== target.key);
      const distractorPool = sameRegion.length >= 3 ? sameRegion : others;
      const distractors = shuffleArray(distractorPool).slice(0, 3);

      const options = shuffleArray([target, ...distractors]).map((m) => ({
        key: m.key,
        label: m.info?.nombre || m.rawName,
      }));

      setExamQuestion({
        targetKey: target.key,
        targetName: target.info.nombre,
        targetRegion: target.info.region,
        options,
      });
      setExamPickedKey(null);
      setExamResult('idle');
      setExamIsolateHint(false);

      const activeStyle = styleOverride ?? examStyle;
      if (activeStyle === 'nombrar') {
        window.setTimeout(() => {
          canvasRef.current?.focusStructure(target.key);
        }, 40);
      } else {
        canvasRef.current?.resetView();
      }
    },
    [eligibleExamMeshes, examStyle]
  );

  useEffect(() => {
    if (mode === 'examen') {
      generateNextQuestion(examStyle);
    }
    // Regenerate question when examRegion changes while in exam mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examRegion]);

  const handleSwitchMode = (nextMode: AtlasMode) => {
    setMode(nextMode);
    setHiddenKeys([]);
    setIsolatedKey(null);
    setTranslucentContext(false);

    if (nextMode === 'examen') {
      setSelectedKey(null);
      generateNextQuestion(examStyle);
    } else {
      setExamQuestion(null);
      setExamPickedKey(null);
      setExamResult('idle');
      setExamIsolateHint(false);
    }
  };

  const handleAnswerExamOption = (pickedKey: string) => {
    if (!examQuestion || examResult !== 'idle') return;
    const isCorrect = pickedKey === examQuestion.targetKey;
    setExamPickedKey(pickedKey);
    setExamResult(isCorrect ? 'correct' : 'incorrect');
    setExamScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      streak: isCorrect ? prev.streak + 1 : 0,
    }));
  };

  const handleCanvasSelect = useCallback(
    (meshKey: string | null) => {
      if (mode === 'examen') {
        if (
          examStyle === 'senalar' &&
          examQuestion &&
          examResult === 'idle' &&
          meshKey
        ) {
          handleAnswerExamOption(meshKey);
        }
        return;
      }
      setSelectedKey(meshKey);
      if (meshKey) {
        setSideTab('ficha');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, examStyle, examQuestion, examResult]
  );

  // === CUSTOM GLB / GLTF UPLOAD ===
  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      setModelError('Formato no admitido. Seleccioná un archivo .glb o .gltf válido.');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      setModelError(null);
      setModelSource({
        kind: 'buffer',
        buffer,
        label: `${file.name} (modelo cargado)`,
      });
    } catch {
      setModelError('No se pudo leer el archivo seleccionado desde el dispositivo.');
    }
  };

  const handleRestoreDefaultModel = () => {
    setModelError(null);
    setModelSource({
      kind: 'url',
      url: DEFAULT_MODEL_URL,
      label: DEFAULT_MODEL_LABEL,
    });
  };

  const examTargetInfo = useMemo(() => {
    if (!examQuestion) return null;
    return meshByKey.get(examQuestion.targetKey)?.info || null;
  }, [examQuestion, meshByKey]);

  const effectiveExamHighlightKey = useMemo(() => {
    if (mode !== 'examen' || !examQuestion) return null;
    if (examStyle === 'nombrar') return examQuestion.targetKey;
    // In 'senalar' mode, only reveal target highlight AFTER answering
    if (examResult !== 'idle') return examQuestion.targetKey;
    return null;
  }, [mode, examQuestion, examStyle, examResult]);

  const effectiveExamWrongKey = useMemo(() => {
    if (mode !== 'examen' || examResult !== 'incorrect') return null;
    return examPickedKey;
  }, [mode, examResult, examPickedKey]);

  const effectiveIsolatedKey = useMemo(() => {
    if (mode === 'examen' && examStyle === 'nombrar' && examIsolateHint && examQuestion) {
      return examQuestion.targetKey;
    }
    return isolatedKey;
  }, [mode, examStyle, examIsolateHint, examQuestion, isolatedKey]);

  const effectiveTranslucent = useMemo(() => {
    if (mode === 'examen' && examStyle === 'nombrar' && examIsolateHint) {
      return true;
    }
    return translucentContext;
  }, [mode, examStyle, examIsolateHint, translucentContext]);

  const isCustomModel = modelSource.kind === 'buffer';
  const hiddenCount = hiddenKeys.length;

  return (
    <div className="space-y-5">
      {/* Encabezado académico editorial Rose & Sage */}
      <section className="flex flex-col gap-4 border-b border-rose-200/80 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase">
            ANATOMÍA HUMANA · OSTEOLOGÍA CRANEAL
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-rose-950 sm:text-3xl">
            Atlas Osteológico 3D
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
            Cráneo humano segmentado en {modelSummary?.meshCount ?? 22} piezas óseas individuales para exploración anatómica, correlación odontológica y autoevaluación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Modo: Exploración / Examen */}
          <div
            role="tablist"
            aria-label="Modo de estudio del Atlas"
            className="inline-flex rounded-xl border border-rose-200 bg-[#FFFDF9] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'exploracion'}
              onClick={() => handleSwitchMode('exploracion')}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                mode === 'exploracion'
                  ? 'bg-rose-900 text-white'
                  : 'text-slate-600 hover:text-rose-950'
              }`}
            >
              <Compass size={14} />
              <span>Exploración</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'examen'}
              onClick={() => handleSwitchMode('examen')}
              disabled={eligibleExamMeshes.length < 2}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors disabled:opacity-45 ${
                mode === 'examen'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              <GraduationCap size={14} />
              <span>Modo Examen</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleFileUpload(file);
              }
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 transition-colors hover:bg-rose-50"
          >
            <FileUp size={14} className="text-rose-900" />
            <span>Cargar .GLB / .GLTF</span>
          </button>

          {isCustomModel && (
            <button
              type="button"
              onClick={handleRestoreDefaultModel}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              <RotateCcw size={14} />
              <span>Cráneo base</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAttribution((v) => !v)}
            aria-expanded={showAttribution}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Info size={14} className="text-emerald-700" />
            <span>Fuentes y licencia</span>
          </button>
        </div>
      </section>

      {/* Banner de fuentes y licencia CC BY-SA 2.1 JP */}
      {showAttribution && (
        <section className="rounded-xl border border-emerald-200 bg-[#EAEFEA]/70 p-4 text-xs text-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="font-bold text-rose-950">
                Origen anatómico del modelo 3D y bibliografía de referencia
              </p>
              <p>
                Mallas anatómicas derivadas de <strong>BodyParts3D (release 3.0)</strong>, © The Database Center for Life Science (DBCLS), publicadas bajo licencia{' '}
                <a
                  href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-rose-900 underline"
                >
                  CC BY-SA 2.1 Japan
                </a>{' '}
                (Mitsuhashi et al., <em>Nucleic Acids Research</em>, 2009; DOI: 10.1093/nar/gkn613), optimizadas en glTF 2.0 por OrganUI y segmentadas en 22 huesos craneales individuales con códigos FMA para Dental Archive.
              </p>
              <p className="text-slate-600">
                Textos descriptivos basados en <em>Terminologia Anatomica (FIPAT)</em>, Figún &amp; Garino (<em>Anatomía Odontológica Funcional y Aplicada</em>), Rouvière &amp; Delmas (<em>Anatomía Humana · Cabeza y Cuello</em>) y Moore (<em>Anatomía con Orientación Clínica</em>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAttribution(false)}
              aria-label="Cerrar información de fuentes"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-slate-600 hover:bg-emerald-50"
            >
              <X size={15} />
            </button>
          </div>
        </section>
      )}

      {/* Aviso si un archivo personalizado no está segmentado */}
      {modelSummary?.isSingleMesh && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950"
        >
          <HelpCircle size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="space-y-1">
            <p className="font-bold">
              Modelo de malla única detectado ({modelSummary.sourceLabel})
            </p>
            <p className="leading-relaxed text-amber-900">
              Este archivo contiene una sola malla unificada. Podés rotarlo, hacer zoom y observar sus vistas, pero la selección individual, el aislamiento y el Modo Examen requieren un archivo .GLB o .GLTF segmentado en mallas anatómicas independientes.
            </p>
          </div>
        </div>
      )}

      {modelError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-950"
        >
          <span>{modelError}</span>
          <button
            type="button"
            onClick={handleRestoreDefaultModel}
            className="shrink-0 rounded-lg bg-rose-900 px-3 py-1.5 font-semibold text-white hover:bg-rose-950"
          >
            Cargar cráneo base
          </button>
        </div>
      )}

      {/* WORKSPACE PRINCIPAL: VISOR 3D + PANEL DE INFORMACIÓN / EXAMEN */}
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        {/* COLUMNA IZQUIERDA: VISOR 3D INTERACTIVO */}
        <section className="overflow-hidden rounded-2xl border border-rose-200/80 bg-[#FFFDF9] lg:col-span-7">
          {/* Barra superior compacta del visor */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/70 bg-rose-50/60 px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="font-semibold text-rose-950 truncate">
                {modelSummary?.sourceLabel || DEFAULT_MODEL_LABEL}
              </span>
              {hiddenCount > 0 && mode === 'exploracion' && (
                <span className="font-mono text-[11px] font-semibold text-amber-800 tabular-nums">
                  · {hiddenCount} oculta{hiddenCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {mode === 'exploracion' && (hiddenCount > 0 || isolatedKey !== null) && (
                <button
                  type="button"
                  onClick={handleShowAll}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <Eye size={13} />
                  <span>Mostrar todo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => canvasRef.current?.zoomBy(0.82)}
                aria-label="Acercar modelo"
                title="Acercar (Zoom +)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-950 hover:bg-rose-50"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => canvasRef.current?.zoomBy(1.22)}
                aria-label="Alejar modelo"
                title="Alejar (Zoom -)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-950 hover:bg-rose-50"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
              >
                <RotateCcw size={13} />
                <span>Restablecer</span>
              </button>
            </div>
          </div>

          {/* Lienzo WebGL 3D con overlays mínimos y dropzone GLB/GLTF */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                void handleFileUpload(file);
              }
            }}
            className="relative h-[340px] w-full sm:h-[440px] lg:h-[540px]"
          >
            <AtlasSkullCanvas
              ref={canvasRef}
              modelSource={modelSource}
              selectedKey={mode === 'exploracion' ? selectedKey : null}
              hoveredKey={
                mode === 'examen' && examStyle === 'nombrar' ? null : hoveredKey
              }
              hiddenKeys={mode === 'exploracion' ? hiddenKeys : EMPTY_KEYS}
              isolatedKey={effectiveIsolatedKey}
              translucentContext={effectiveTranslucent}
              examHighlightKey={effectiveExamHighlightKey}
              examResultState={examResult}
              examWrongKey={effectiveExamWrongKey}
              onSelectMesh={handleCanvasSelect}
              onHoverMesh={setHoveredKey}
              onModelLoaded={handleModelLoaded}
              onModelError={handleModelError}
            />

            {/* Etiqueta flotante superior izquierda (estructura bajo el cursor o modo examen) */}
            <div className="pointer-events-none absolute top-3 left-3 max-w-[78%] space-y-1">
              {mode === 'exploracion' && hoveredMesh && (
                <div className="rounded-lg border border-rose-200/90 bg-[#FFFDF9]/92 px-3 py-1.5 shadow-xs backdrop-blur-xs">
                  <p className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                    {hoveredMesh.info?.region === 'neurocraneo'
                      ? 'Neurocráneo'
                      : hoveredMesh.info?.region === 'viscerocraneo'
                        ? 'Viscerocráneo'
                        : 'Estructura 3D'}
                  </p>
                  <p className="text-xs font-bold text-rose-950">
                    {getDisplayName(hoveredMesh)}
                  </p>
                </div>
              )}

              {mode === 'exploracion' && !hoveredMesh && selectedMesh && (
                <div className="rounded-lg border border-rose-300/80 bg-[#FFFDF9]/90 px-3 py-1.5 shadow-xs backdrop-blur-xs">
                  <p className="text-[10px] font-bold tracking-wider text-rose-800 uppercase">
                    Seleccionada
                  </p>
                  <p className="text-xs font-bold text-rose-950">
                    {getDisplayName(selectedMesh)}
                  </p>
                </div>
              )}

              {mode === 'examen' && examQuestion && (
                <div className="rounded-lg border border-amber-300 bg-[#FFFDF9]/92 px-3 py-1.5 shadow-xs backdrop-blur-xs">
                  <p className="text-[10px] font-bold tracking-wider text-amber-800 uppercase">
                    Modo Examen
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {examStyle === 'nombrar'
                      ? examResult === 'idle'
                        ? 'Estructura resaltada sin identificar'
                        : examQuestion.targetName
                      : `Señalá en el modelo: ${examQuestion.targetName}`}
                  </p>
                </div>
              )}
            </div>

            {/* Acciones rápidas contextuales sobre la estructura seleccionada */}
            {mode === 'exploracion' && selectedMesh && (
              <div className="absolute right-3 bottom-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => canvasRef.current?.focusStructure(selectedMesh.key)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-200 bg-[#FFFDF9]/95 px-2.5 text-xs font-semibold text-rose-950 shadow-xs backdrop-blur-xs hover:bg-rose-50"
                >
                  <Focus size={13} className="text-rose-900" />
                  <span>Enfocar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleIsolate(selectedMesh.key)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-xs backdrop-blur-xs transition-colors ${
                    isolatedKey === selectedMesh.key
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-rose-200 bg-[#FFFDF9]/95 text-rose-950 hover:bg-rose-50'
                  }`}
                >
                  <Layers size={13} />
                  <span>{isolatedKey === selectedMesh.key ? 'Salir de aislar' : 'Aislar'}</span>
                </button>
                {isolatedKey === selectedMesh.key && (
                  <button
                    type="button"
                    onClick={() => setTranslucentContext((v) => !v)}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-xs backdrop-blur-xs ${
                      translucentContext
                        ? 'border-rose-900 bg-rose-900 text-white'
                        : 'border-rose-200 bg-[#FFFDF9]/95 text-rose-950 hover:bg-rose-50'
                    }`}
                  >
                    <span>Contexto</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleHide(selectedMesh.key)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-200 bg-[#FFFDF9]/95 px-2.5 text-xs font-semibold text-rose-950 shadow-xs backdrop-blur-xs hover:bg-rose-50"
                >
                  <EyeOff size={13} className="text-slate-600" />
                  <span>Ocultar</span>
                </button>
              </div>
            )}

            {/* Overlay al arrastrar archivo GLB/GLTF */}
            {isDraggingFile && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center border-2 border-dashed border-rose-900 bg-[#FAF6F0]/90 p-6 text-center">
                <Upload size={28} className="text-rose-900" />
                <p className="mt-2 font-serif text-base font-bold text-rose-950">
                  Soltá tu modelo .GLB o .GLTF aquí
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Se indexarán automáticamente las mallas individuales del modelo.
                </p>
              </div>
            )}
          </div>

          {/* Barra inferior de Vistas Anatómicas Predefinidas */}
          <div className="border-t border-rose-200/70 bg-[#FAF6F0] px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {ATLAS_VISTAS_PRESET.map((preset) => {
                  const active = activeVista === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectVista(preset)}
                      className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-rose-900 bg-rose-900 text-white'
                          : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                      }`}
                    >
                      {preset.shortLabel}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500">
                Arrastrar: rotar 360° · Rueda / pellizco: zoom · Clic derecho / 2 dedos: desplazar
              </p>
            </div>
          </div>
        </section>

        {/* COLUMNA DERECHA: FICHA ANATÓMICA + LISTA DE ESTRUCTURAS / MODO EXAMEN */}
        <section className="overflow-hidden rounded-2xl border border-rose-200/80 bg-[#FFFDF9] lg:col-span-5">
          {mode === 'exploracion' ? (
            <>
              {/* Pestañas del panel lateral en modo exploración */}
              <div className="flex items-center justify-between border-b border-rose-200/80 bg-rose-50/60 px-3 pt-2.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSideTab('ficha')}
                    className={`min-h-[38px] border-b-2 px-3 pb-2 text-xs font-bold transition-colors ${
                      sideTab === 'ficha'
                        ? 'border-rose-900 text-rose-950'
                        : 'border-transparent text-slate-600 hover:text-rose-900'
                    }`}
                  >
                    Ficha Anatómica
                  </button>
                  <button
                    type="button"
                    onClick={() => setSideTab('estructuras')}
                    className={`min-h-[38px] border-b-2 px-3 pb-2 text-xs font-bold tabular-nums transition-colors ${
                      sideTab === 'estructuras'
                        ? 'border-rose-900 text-rose-950'
                        : 'border-transparent text-slate-600 hover:text-rose-900'
                    }`}
                  >
                    Estructuras ({modelSummary?.meshCount ?? 22})
                  </button>
                </div>

                {isolatedKey && (
                  <button
                    type="button"
                    onClick={() => setIsolatedKey(null)}
                    className="mb-1.5 rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800"
                  >
                    Vista completa
                  </button>
                )}
              </div>

              {sideTab === 'ficha' ? (
                <div className="max-h-[600px] overflow-y-auto p-4 sm:p-5">
                  {!selectedMesh ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-rose-200/70 bg-[#F8F5F1] p-4">
                        <p className="text-[11px] font-bold tracking-[0.1em] text-emerald-700 uppercase">
                          EXPLORACIÓN INTERACTIVA
                        </p>
                        <h2 className="mt-1 font-serif text-lg font-bold text-rose-950">
                          Seleccioná un hueso del cráneo
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                          Hacé clic o tocá cualquier estructura en el modelo 3D —o elegila desde la pestaña{' '}
                          <button
                            type="button"
                            onClick={() => setSideTab('estructuras')}
                            className="font-semibold text-rose-900 underline"
                          >
                            Estructuras
                          </button>{' '}
                          para acceder rápidamente a huesos profundos como el esfenoides, etmoides, palatino o vómer.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-rose-200/70 bg-white p-3.5">
                          <p className="font-bold text-rose-950">Neurocráneo (8)</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                            Frontal, parietales (2), occipital, temporales (2), esfenoides y etmoides.
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-200/80 bg-[#EAEFEA]/60 p-3.5">
                          <p className="font-bold text-emerald-900">Viscerocráneo (14)</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                            Maxilares (2), mandíbula, cigomáticos (2), nasales (2), lagrimales (2), palatinos (2), cornetes inferiores (2) y vómer.
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          Accesos rápidos de interés odontológico
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'mandible',
                            'right-maxilla',
                            'right-palatine-bone',
                            'sphenoid-bone',
                            'right-temporal-bone',
                            'right-zygomatic-bone',
                          ].map((k) => {
                            const rec = meshByKey.get(k);
                            if (!rec) return null;
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleSelectFromList(k)}
                                className="flex min-h-[40px] items-center justify-between rounded-lg border border-rose-200/80 bg-white px-3 text-left text-xs font-semibold text-rose-950 transition-colors hover:bg-rose-50"
                              >
                                <span className="truncate">{getDisplayName(rec)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : selectedMesh.info ? (
                    <article className="space-y-4">
                      {/* Encabezado de ficha */}
                      <div className="border-b border-rose-200/70 pb-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
                          <span className="text-emerald-700 uppercase">
                            {selectedMesh.info.region === 'neurocraneo'
                              ? 'Neurocráneo'
                              : 'Viscerocráneo'}{' '}
                            · {selectedMesh.info.lateralidad}
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {selectedMesh.info.fmaId}
                          </span>
                        </div>
                        <h2 className="mt-1 font-serif text-xl font-bold text-rose-950">
                          {selectedMesh.info.nombre}
                        </h2>
                        <p className="text-xs italic text-slate-500">
                          Terminologia Anatomica: {selectedMesh.info.nombreLatino}
                        </p>

                        {/* Controles de estructura dentro de la ficha */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              canvasRef.current?.focusStructure(selectedMesh.key)
                            }
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-950 hover:bg-rose-50"
                          >
                            <Focus size={13} />
                            <span>Enfocar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleIsolate(selectedMesh.key)}
                            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${
                              isolatedKey === selectedMesh.key
                                ? 'border-emerald-700 bg-emerald-700 text-white'
                                : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                            }`}
                          >
                            <Layers size={13} />
                            <span>
                              {isolatedKey === selectedMesh.key
                                ? 'Quitar aislamiento'
                                : 'Aislar hueso'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleHide(selectedMesh.key)}
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {hiddenSet.has(selectedMesh.key) ? (
                              <>
                                <Eye size={13} />
                                <span>Mostrar</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={13} />
                                <span>Ocultar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 1. Ubicación */}
                      <div>
                        <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                          Ubicación
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-700">
                          {selectedMesh.info.ubicacion}
                        </p>
                      </div>

                      {/* 2. Características principales */}
                      <div>
                        <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                          Características principales
                        </h3>
                        <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                          {selectedMesh.info.caracteristicas.map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 3. Accidentes anatómicos */}
                      <div>
                        <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                          Accidentes anatómicos
                        </h3>
                        <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                          {selectedMesh.info.accidentesAnatomicos.map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 4. Articulaciones y relaciones */}
                      <div>
                        <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                          Articulaciones y relaciones relevantes
                        </h3>
                        <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                          {selectedMesh.info.articulacionesYRelaciones.map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 5. Información útil para odontología */}
                      <div className="rounded-xl border border-emerald-200 bg-[#EAEFEA]/75 p-3.5">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-emerald-900 uppercase">
                          <Sparkles size={13} className="text-emerald-700" />
                          <span>Información útil para odontología</span>
                        </h3>
                        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-800">
                          {selectedMesh.info.relevanciaOdontologica.map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 6. Bibliografía y fuente */}
                      <div className="border-t border-rose-200/70 pt-3">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          <BookOpen size={12} />
                          <span>Bibliografía y fuente del contenido</span>
                        </h3>
                        <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-500">
                          {selectedMesh.info.bibliografia.map((ref, idx) => (
                            <li key={idx}>{ref}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ) : (
                    /* Fallback honesto para mallas desconocidas de archivos externos cargados por el usuario */
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                      <h2 className="font-serif text-lg font-bold text-rose-950">
                        {selectedMesh.rawName}
                      </h2>
                      <p>
                        Malla perteneciente al archivo externo cargado ({selectedMesh.vertexCount.toLocaleString('es-AR')} vértices).
                      </p>
                      <p className="leading-relaxed text-slate-600">
                        No se encontró correspondencia automática con la base osteológica del cráneo humano; por rigor anatómico no se muestran descripciones autogeneradas para nombres no verificados. Podés enfocar, aislar u ocultar esta malla libremente.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* PESTAÑA LISTA SINCRONIZADA DE ESTRUCTURAS */
                <div className="flex max-h-[600px] flex-col">
                  <div className="space-y-2.5 border-b border-rose-200/70 p-3.5">
                    <div className="relative">
                      <Search
                        size={14}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar hueso (ej. esfenoides, mandíbula, FMA)..."
                        className="h-9 w-full rounded-lg border border-rose-200 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {(
                          [
                            { id: 'todas', label: 'Todas' },
                            { id: 'neurocraneo', label: 'Neurocráneo' },
                            { id: 'viscerocraneo', label: 'Viscerocráneo' },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setRegionFilter(f.id)}
                            className={`min-h-[30px] rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                              regionFilter === f.id
                                ? 'bg-rose-900 text-white'
                                : 'bg-rose-50 text-slate-700 hover:bg-rose-100'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={handleShowAll}
                          className="text-[11px] font-semibold text-emerald-700 hover:underline"
                        >
                          Mostrar todas
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className="divide-y divide-slate-100 overflow-y-auto">
                    {filteredMeshes.length === 0 ? (
                      <li className="p-6 text-center text-xs text-slate-500">
                        No hay estructuras que coincidan con la búsqueda.
                      </li>
                    ) : (
                      filteredMeshes.map((m) => {
                        const isSelected = selectedKey === m.key;
                        const isHidden = hiddenSet.has(m.key);
                        const isIso = isolatedKey === m.key;

                        return (
                          <li
                            key={m.key}
                            className={`flex items-center justify-between gap-2 px-3.5 py-2.5 transition-colors ${
                              isSelected ? 'bg-rose-50/90' : 'hover:bg-slate-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectFromList(m.key)}
                              onMouseEnter={() => setHoveredKey(m.key)}
                              onMouseLeave={() => setHoveredKey(null)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p
                                className={`truncate text-xs font-semibold ${
                                  isHidden
                                    ? 'text-slate-400 line-through'
                                    : isSelected
                                      ? 'text-rose-950'
                                      : 'text-slate-800'
                                }`}
                              >
                                {getDisplayName(m)}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {m.info
                                  ? `${m.info.nombreLatino} · ${m.info.fmaId}`
                                  : m.rawName}
                              </p>
                            </button>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleIsolate(m.key)}
                                aria-label={`Aislar ${getDisplayName(m)}`}
                                title="Aislar estructura"
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-colors ${
                                  isIso
                                    ? 'border-emerald-700 bg-emerald-700 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800'
                                }`}
                              >
                                <Layers size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleHide(m.key)}
                                aria-label={
                                  isHidden
                                    ? `Mostrar ${getDisplayName(m)}`
                                    : `Ocultar ${getDisplayName(m)}`
                                }
                                title={isHidden ? 'Mostrar' : 'Ocultar'}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                  isHidden
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-900'
                                }`}
                              >
                                {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </>
          ) : (
            /* PANEL DE MODO EXAMEN */
            <div className="space-y-4 p-4 sm:p-5">
              {/* Encabezado y puntaje del examen */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/70 pb-3">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
                    AUTOEVALUACIÓN ANATÓMICA
                  </p>
                  <h2 className="font-serif text-lg font-bold text-rose-950">
                    Modo Examen · Cráneo 3D
                  </h2>
                </div>

                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center">
                    <span className="font-bold text-emerald-800">
                      {examScore.correct}/{examScore.total}
                    </span>
                    <span className="ml-1 text-[11px] text-emerald-700">aciertos</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-semibold text-rose-900">
                    <Award size={13} />
                    <span>Racha {examScore.streak}</span>
                  </div>
                </div>
              </div>

              {/* Configuración rápida de modalidad y filtro regional */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Dinámica
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg border border-rose-200 bg-[#FAF6F0] p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setExamStyle('nombrar');
                        generateNextQuestion('nombrar');
                      }}
                      className={`min-h-[32px] rounded-md px-2 text-[11px] font-semibold transition-colors ${
                        examStyle === 'nombrar'
                          ? 'bg-rose-900 text-white'
                          : 'text-slate-600 hover:text-rose-950'
                      }`}
                    >
                      Nombrar señalada
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExamStyle('senalar');
                        generateNextQuestion('senalar');
                      }}
                      className={`min-h-[32px] rounded-md px-2 text-[11px] font-semibold transition-colors ${
                        examStyle === 'senalar'
                          ? 'bg-rose-900 text-white'
                          : 'text-slate-600 hover:text-rose-950'
                      }`}
                    >
                      Señalar en 3D
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="exam-region-select"
                    className="block text-[11px] font-semibold text-slate-600"
                  >
                    Región evaluada
                  </label>
                  <select
                    id="exam-region-select"
                    value={examRegion}
                    onChange={(e) => {
                      const nextReg = e.target.value as RegionFilter;
                      setExamRegion(nextReg);
                    }}
                    className="mt-1 h-[36px] w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                  >
                    <option value="todas">Cráneo completo (22)</option>
                    <option value="neurocraneo">Solo Neurocráneo (8)</option>
                    <option value="viscerocraneo">Solo Viscerocráneo (14)</option>
                  </select>
                </div>
              </div>

              {!examQuestion ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-center">
                  <p className="text-xs text-slate-700">
                    Presioná el botón para iniciar la evaluación con esta región.
                  </p>
                  <button
                    type="button"
                    onClick={() => generateNextQuestion()}
                    className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    <GraduationCap size={15} />
                    <span>Comenzar pregunta</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Consigna */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                    {examStyle === 'nombrar' ? (
                      <>
                        <p className="text-[11px] font-bold tracking-wider text-amber-900 uppercase">
                          Identificación visual (nombre oculto)
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-800">
                          Observá la estructura resaltada en ámbar en el cráneo 3D. Podés rotar 360°, hacer zoom o activar el contexto translúcido antes de responder.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              canvasRef.current?.focusStructure(examQuestion.targetKey)
                            }
                            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 text-[11px] font-semibold text-amber-950 hover:bg-amber-100/60"
                          >
                            <Focus size={12} />
                            <span>Reenfocar estructura</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExamIsolateHint((v) => !v)}
                            className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold ${
                              examIsolateHint
                                ? 'border-emerald-700 bg-emerald-700 text-white'
                                : 'border-amber-300 bg-white text-amber-950 hover:bg-amber-100/60'
                            }`}
                          >
                            <Layers size={12} />
                            <span>
                              {examIsolateHint
                                ? 'Mostrar cráneo opaco'
                                : 'Ver en contexto translúcido'}
                            </span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] font-bold tracking-wider text-amber-900 uppercase">
                          Localización en el cráneo 3D
                        </p>
                        <p className="mt-1 text-sm font-bold text-rose-950">
                          Hacé clic o tocá sobre: {examQuestion.targetName}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Girando el modelo podés acceder a estructuras laterales, basales u orbitarias.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Opciones múltiples en modo 'nombrar' */}
                  {examStyle === 'nombrar' && (
                    <div className="space-y-2">
                      {examQuestion.options.map((opt) => {
                        const isTarget = opt.key === examQuestion.targetKey;
                        const isPicked = opt.key === examPickedKey;
                        let styleClass =
                          'border-rose-200 bg-white text-slate-800 hover:border-rose-400 hover:bg-rose-50/60';
                        if (examResult !== 'idle') {
                          if (isTarget) {
                            styleClass =
                              'border-emerald-600 bg-emerald-50 text-emerald-950';
                          } else if (isPicked) {
                            styleClass = 'border-rose-500 bg-rose-50 text-rose-950';
                          } else {
                            styleClass = 'border-slate-200 bg-slate-50 text-slate-400';
                          }
                        }

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={examResult !== 'idle'}
                            onClick={() => handleAnswerExamOption(opt.key)}
                            className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-xs font-semibold transition-colors ${styleClass}`}
                          >
                            <span>{opt.label}</span>
                            {examResult !== 'idle' && isTarget && (
                              <CheckCircle2
                                size={16}
                                className="shrink-0 text-emerald-700"
                              />
                            )}
                            {examResult !== 'idle' && isPicked && !isTarget && (
                              <XCircle size={16} className="shrink-0 text-rose-700" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {examStyle === 'senalar' && examResult === 'idle' && (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-3 text-xs text-slate-600">
                      <Crosshair size={16} className="shrink-0 text-rose-900" />
                      <span>
                        Esperando tu selección directa sobre el cráneo tridimensional...
                      </span>
                    </div>
                  )}

                  {/* Feedback posterior a la respuesta */}
                  {examResult !== 'idle' && examTargetInfo && (
                    <div
                      className={`space-y-2.5 rounded-xl border p-3.5 text-xs ${
                        examResult === 'correct'
                          ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950'
                          : 'border-rose-300 bg-rose-50/80 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        {examResult === 'correct' ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-700" />
                            <span>Correcto · {examTargetInfo.nombre}</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={16} className="text-rose-700" />
                            <span>
                              Era: {examTargetInfo.nombre} ({examTargetInfo.nombreLatino})
                            </span>
                          </>
                        )}
                      </div>
                      <p className="leading-relaxed text-slate-700">
                        {examTargetInfo.ubicacion}
                      </p>
                      <p className="leading-relaxed text-slate-700">
                        <strong>Dato odontológico:</strong>{' '}
                        {examTargetInfo.relevanciaOdontologica[0]}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            generateNextQuestion(examStyle, examQuestion.targetKey)
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-bold text-white hover:bg-rose-950"
                        >
                          <span>Siguiente estructura</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('exploracion');
                            setSelectedKey(examQuestion.targetKey);
                            setSideTab('ficha');
                            setExamIsolateHint(false);
                          }}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 hover:bg-rose-50"
                        >
                          <BookOpen size={13} />
                          <span>Abrir ficha completa</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
