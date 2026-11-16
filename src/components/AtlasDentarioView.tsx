import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  FileUp,
  GraduationCap,
  Info,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Scissors,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  DENTAL_FRAMES_MANIFEST,
  ESTRUCTURAS_DENTALES_INFO,
  GRUPOS_PERMANENTES,
  GRUPOS_TEMPORARIOS,
  PIEZA_BY_FDI,
  PIEZAS_PERMANENTES,
  PIEZAS_TEMPORARIAS,
  type ArcadaTipo,
  type DentalVistaId,
  type DenticionTipo,
  type EstructuraDentalId,
  type GrupoDental,
  type LadoDental,
  type PiezaDentariaInfo,
} from '../data/dentarioAtlasData';
import {
  AtlasToothCanvas,
  type AtlasToothCanvasHandle,
  type CortePlanoTipo,
  type DentalModelSummary,
  type LoadedDentalMeshRecord,
} from './AtlasToothCanvas';

type DentalMode = 'exploracion' | 'examen';
type DentalSideTab = 'ficha' | 'estructuras';
type DentalExamStyle = 'identificar-pieza' | 'identificar-estructura';

const EMPTY_KEYS: string[] = [];

interface ExamPieceQuestion {
  targetFdi: string;
  pieza: PiezaDentariaInfo;
}

interface ExamStructureQuestion {
  targetFdi: string;
  pieza: PiezaDentariaInfo;
  targetKeys: string[];
  targetConceptId: string;
  targetLabel: string;
  options: { id: string; label: string }[];
}

const CONCEPTO_BOTONES: { id: EstructuraDentalId; label: string }[] = [
  { id: 'corona', label: 'Corona' },
  { id: 'cuello', label: 'Cuello' },
  { id: 'raices', label: 'Raíz / Raíces' },
  { id: 'esmalte', label: 'Esmalte' },
  { id: 'dentina', label: 'Dentina' },
  { id: 'cemento', label: 'Cemento' },
  { id: 'pulpa', label: 'Pulpa' },
  { id: 'camara-pulpar', label: 'Cámara pulpar' },
  { id: 'conductos', label: 'Conductos' },
  { id: 'apice', label: 'Ápice' },
];

function shuffleArray<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getKeysForConcept(
  conceptId: string,
  meshes: LoadedDentalMeshRecord[]
): string[] {
  switch (conceptId) {
    case 'corona':
      return meshes
        .filter((m) => ['enamel', 'dentin-coronal', 'pulp-chamber'].includes(m.layerType))
        .map((m) => m.key);
    case 'cuello':
      return meshes.filter((m) => m.layerType === 'landmark-cuello').map((m) => m.key);
    case 'raices':
      return meshes
        .filter((m) => ['cementum', 'dentin-radicular', 'canal'].includes(m.layerType))
        .map((m) => m.key);
    case 'esmalte':
      return meshes.filter((m) => m.layerType === 'enamel').map((m) => m.key);
    case 'dentina':
      return meshes
        .filter((m) => ['dentin-coronal', 'dentin-radicular'].includes(m.layerType))
        .map((m) => m.key);
    case 'dentina-coronaria':
      return meshes.filter((m) => m.layerType === 'dentin-coronal').map((m) => m.key);
    case 'dentina-radicular':
      return meshes.filter((m) => m.layerType === 'dentin-radicular').map((m) => m.key);
    case 'cemento':
      return meshes.filter((m) => m.layerType === 'cementum').map((m) => m.key);
    case 'pulpa':
      return meshes
        .filter((m) => ['pulp-chamber', 'canal'].includes(m.layerType))
        .map((m) => m.key);
    case 'camara-pulpar':
      return meshes.filter((m) => m.layerType === 'pulp-chamber').map((m) => m.key);
    case 'conductos':
      return meshes.filter((m) => m.layerType === 'canal').map((m) => m.key);
    case 'apice':
      return meshes.filter((m) => m.layerType === 'landmark-apice').map((m) => m.key);
    default:
      return meshes.some((m) => m.key === conceptId) ? [conceptId] : [];
  }
}

function mapMeshRecordToConceptId(rec: LoadedDentalMeshRecord): string {
  switch (rec.layerType) {
    case 'enamel':
      return 'esmalte';
    case 'dentin-coronal':
      return 'dentin-coronal';
    case 'dentin-radicular':
      return 'dentin-radicular';
    case 'cementum':
      return 'cemento';
    case 'pulp-chamber':
      return 'pulp-chamber';
    case 'canal':
      return 'conductos';
    case 'landmark-cuello':
      return 'cuello';
    case 'landmark-apice':
      return 'apice';
    case 'pdl':
      return 'pdl';
    default:
      return rec.key;
  }
}

export const AtlasDentarioView: React.FC = () => {
  const canvasRef = useRef<AtlasToothCanvasHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [denticion, setDenticion] = useState<DenticionTipo>('permanente');
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoDental | 'todos'>('todos');
  const [selectedFdi, setSelectedFdi] = useState<string>('11');
  const [customBuffersByFdi, setCustomBuffersByFdi] = useState<
    Record<string, { buffer: ArrayBuffer; label: string }>
  >({});

  const [mode, setMode] = useState<DentalMode>('exploracion');
  const [sideTab, setSideTab] = useState<DentalSideTab>('ficha');
  const [showAttribution, setShowAttribution] = useState(false);

  // Viewer states
  const [modelSummary, setModelSummary] = useState<DentalModelSummary | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [activeVista, setActiveVista] = useState<DentalVistaId>('inicial');
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [selectedMeshKey, setSelectedMeshKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [showPdl, setShowPdl] = useState(false);
  const [isolatedConcept, setIsolatedConcept] = useState<string | null>(null);
  const [translucentHardTissues, setTranslucentHardTissues] = useState(false);
  const [clipMode, setClipMode] = useState<CortePlanoTipo>('ninguno');
  const [clipOffset, setClipOffset] = useState(0);

  // Exam states
  const [examStyle, setExamStyle] = useState<DentalExamStyle>('identificar-pieza');
  const [examPieceQ, setExamPieceQ] = useState<ExamPieceQuestion | null>(null);
  const [examPickTipo, setExamPickTipo] = useState<string>('');
  const [examPickArcada, setExamPickArcada] = useState<ArcadaTipo | ''>('');
  const [examPickLado, setExamPickLado] = useState<LadoDental | ''>('');
  const [examPickFdi, setExamPickFdi] = useState<string>('');
  const [examPieceSubmitted, setExamPieceSubmitted] = useState(false);

  const [examStructQ, setExamStructQ] = useState<ExamStructureQuestion | null>(null);
  const [examStructPicked, setExamStructPicked] = useState<string | null>(null);
  const [examStructSubmitted, setExamStructSubmitted] = useState(false);
  const [examScore, setExamScore] = useState({ correct: 0, total: 0, streak: 0 });

  const activeFdi =
    mode === 'examen'
      ? examStyle === 'identificar-pieza'
        ? examPieceQ?.targetFdi || '16'
        : examStructQ?.targetFdi || '16'
      : selectedFdi;

  const activePieza = PIEZA_BY_FDI[activeFdi] || PIEZAS_PERMANENTES[0];

  const activeCustomBuffer = customBuffersByFdi[activeFdi];

  const modelSource = useMemo(() => {
    if (activeCustomBuffer) {
      return {
        kind: 'buffer' as const,
        buffer: activeCustomBuffer.buffer,
        label: activeCustomBuffer.label,
        fdi: activeFdi,
      };
    }
    if (activePieza.modeloUrl) {
      return {
        kind: 'url' as const,
        url: activePieza.modeloUrl,
        label: `FDI ${activePieza.fdi} · ${activePieza.nombre}`,
        fdi: activePieza.fdi,
      };
    }
    return null;
  }, [activeCustomBuffer, activePieza, activeFdi]);

  const activeFrameManifest = useMemo(
    () => DENTAL_FRAMES_MANIFEST[activeFdi] || null,
    [activeFdi]
  );

  // Default hidden PDL unless showPdl is toggled on (checks both manifest and loaded summary so frame 0 starts clean)
  const effectiveHiddenKeys = useMemo(() => {
    const base = new Set(hiddenKeys);
    if (!showPdl) {
      if (activeFrameManifest) {
        for (const name of activeFrameManifest.meshNames) {
          if (name.toLowerCase().startsWith('pdl')) base.add(name);
        }
      }
      if (modelSummary) {
        for (const m of modelSummary.meshes) {
          if (m.layerType === 'pdl') base.add(m.key);
        }
      }
    }
    return Array.from(base);
  }, [hiddenKeys, showPdl, activeFrameManifest, modelSummary]);

  const highlightedKeys = useMemo(() => {
    if (mode === 'examen') return [];
    if (selectedMeshKey) return [selectedMeshKey];
    if (activeConceptId && modelSummary) {
      return getKeysForConcept(activeConceptId, modelSummary.meshes);
    }
    return [];
  }, [mode, selectedMeshKey, activeConceptId, modelSummary]);

  const isolatedKeys = useMemo(() => {
    if (mode === 'examen' || !isolatedConcept || !modelSummary) return null;
    if (modelSummary.meshes.some((m) => m.key === isolatedConcept)) {
      return [isolatedConcept];
    }
    const keys = getKeysForConcept(isolatedConcept, modelSummary.meshes);
    return keys.length > 0 ? keys : null;
  }, [mode, isolatedConcept, modelSummary]);

  const handleModelLoaded = useCallback((summary: DentalModelSummary) => {
    setModelSummary(summary);
    setModelError(null);
    setHiddenKeys([]);
    setIsolatedConcept(null);
    setActiveVista('inicial');
  }, []);

  const handleModelError = useCallback((msg: string) => {
    setModelError(msg);
  }, []);

  const handleSelectPieza = (fdi: string) => {
    setSelectedFdi(fdi);
    setActiveConceptId(null);
    setSelectedMeshKey(null);
    setIsolatedConcept(null);
    setHiddenKeys([]);
    setClipMode('ninguno');
    setClipOffset(0);
    setTranslucentHardTissues(false);
    setModelError(null);
  };

  const handleSelectDenticion = (next: DenticionTipo) => {
    setDenticion(next);
    setSelectedGrupo('todos');
    if (next === 'permanente' && !PIEZA_BY_FDI[selectedFdi]?.modeloUrl && Number(selectedFdi) >= 50) {
      handleSelectPieza('11');
    } else if (next === 'temporaria' && Number(selectedFdi) < 50) {
      handleSelectPieza('51');
    }
  };

  const handleSelectConcept = (conceptId: EstructuraDentalId) => {
    setSelectedMeshKey(null);
    setActiveConceptId((prev) => (prev === conceptId ? null : conceptId));
    setSideTab('estructuras');

    // Automatically reveal internal anatomy when selecting internal pulp/dentin concepts
    if (['pulpa', 'camara-pulpar', 'conductos', 'dentina'].includes(conceptId)) {
      setTranslucentHardTissues(true);
    }
  };

  const handleCanvasSelectMesh = useCallback((meshKey: string | null) => {
    if (mode === 'examen') return;
    setActiveConceptId(null);
    setSelectedMeshKey(meshKey);
    if (meshKey) {
      setSideTab('estructuras');
    }
  }, [mode]);

  const handleSelectVista = (vista: DentalVistaId) => {
    setActiveVista(vista);
    canvasRef.current?.applyDentalView(vista);
  };

  const handleResetView = () => {
    setActiveVista('inicial');
    canvasRef.current?.resetView();
  };

  const handleToggleIsolateMesh = (keyOrConcept: string) => {
    setIsolatedConcept((prev) => (prev === keyOrConcept ? null : keyOrConcept));
  };

  const handleToggleHideMesh = (key: string) => {
    setHiddenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    if (isolatedConcept === key) {
      setIsolatedConcept(null);
    }
  };

  const handleUploadCustomTooth = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      setModelError('Seleccioná un archivo .glb o .gltf válido.');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      setCustomBuffersByFdi((prev) => ({
        ...prev,
        [activeFdi]: { buffer, label: `${file.name} (FDI ${activeFdi})` },
      }));
      setModelError(null);
    } catch {
      setModelError('No se pudo leer el archivo 3D seleccionado.');
    }
  };

  // === EXAM ENGINE ===
  const generatePieceQuestion = useCallback((prevFdi?: string) => {
    const pool = prevFdi
      ? PIEZAS_PERMANENTES.filter((p) => p.fdi !== prevFdi)
      : PIEZAS_PERMANENTES;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setExamPieceQ({ targetFdi: picked.fdi, pieza: picked });
    setExamPickTipo('');
    setExamPickArcada('');
    setExamPickLado('');
    setExamPickFdi('');
    setExamPieceSubmitted(false);
    setClipMode('ninguno');
    setTranslucentHardTissues(false);
  }, []);

  const generateStructureQuestion = useCallback((prevFdi?: string) => {
    const pool = prevFdi
      ? PIEZAS_PERMANENTES.filter((p) => p.fdi !== prevFdi)
      : PIEZAS_PERMANENTES;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const manifest = DENTAL_FRAMES_MANIFEST[picked.fdi];

    const conceptChoices: { id: string; label: string; needsTranslucent: boolean }[] = [
      { id: 'esmalte', label: 'Esmalte', needsTranslucent: false },
      { id: 'cemento', label: 'Cemento radicular', needsTranslucent: false },
      { id: 'cuello', label: 'Cuello dentario (línea cervical)', needsTranslucent: false },
      { id: 'apice', label: 'Ápice radicular', needsTranslucent: false },
      { id: 'dentina-coronaria', label: 'Dentina coronaria', needsTranslucent: true },
      { id: 'dentina-radicular', label: 'Dentina radicular', needsTranslucent: true },
      { id: 'camara-pulpar', label: 'Cámara pulpar', needsTranslucent: true },
      { id: 'conductos', label: 'Conductos radiculares', needsTranslucent: true },
    ];
    const chosen = conceptChoices[Math.floor(Math.random() * conceptChoices.length)];
    const distractors = shuffleArray(
      conceptChoices.filter((c) => c.id !== chosen.id)
    ).slice(0, 3);
    const options = shuffleArray([chosen, ...distractors]).map((c) => ({
      id: c.id,
      label: c.label,
    }));

    // Compute mesh keys directly from manifest or landmark keys
    let targetKeys: string[] = [];
    if (chosen.id === 'cuello') targetKeys = ['landmark-cuello'];
    else if (chosen.id === 'apice')
      targetKeys = [
        'landmark-apice',
        'landmark-apice-2',
        'landmark-apice-3',
        'landmark-apice-4',
      ];
    else if (manifest) {
      if (chosen.id === 'esmalte')
        targetKeys = manifest.meshNames.filter((n) => n.startsWith('enamel'));
      else if (chosen.id === 'cemento')
        targetKeys = manifest.meshNames.filter((n) => n.startsWith('cementum'));
      else if (chosen.id === 'dentina-coronaria')
        targetKeys = manifest.meshNames.filter((n) => n.startsWith('dentin-coronal'));
      else if (chosen.id === 'dentina-radicular')
        targetKeys = manifest.meshNames.filter((n) => n.startsWith('dentin-radicular'));
      else if (chosen.id === 'camara-pulpar')
        targetKeys = manifest.meshNames.filter((n) => n.startsWith('pulp-chamber'));
      else if (chosen.id === 'conductos')
        targetKeys = manifest.meshNames.filter((n) => n.startsWith('canal'));
    }

    setExamStructQ({
      targetFdi: picked.fdi,
      pieza: picked,
      targetKeys,
      targetConceptId: chosen.id,
      targetLabel: chosen.label,
      options,
    });
    setExamStructPicked(null);
    setExamStructSubmitted(false);
    setTranslucentHardTissues(chosen.needsTranslucent);
    setClipMode('ninguno');
  }, []);

  useEffect(() => {
    if (mode === 'examen') {
      if (examStyle === 'identificar-pieza' && !examPieceQ) {
        generatePieceQuestion();
      } else if (examStyle === 'identificar-estructura' && !examStructQ) {
        generateStructureQuestion();
      }
    }
  }, [mode, examStyle, examPieceQ, examStructQ, generatePieceQuestion, generateStructureQuestion]);

  const handleSubmitPieceExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examPieceQ || examPieceSubmitted) return;
    const p = examPieceQ.pieza;
    const allCorrect =
      examPickTipo === p.tipoCorto &&
      examPickArcada === p.arcada &&
      examPickLado === p.lado &&
      examPickFdi.trim() === p.fdi;
    setExamPieceSubmitted(true);
    setExamScore((prev) => ({
      correct: prev.correct + (allCorrect ? 1 : 0),
      total: prev.total + 1,
      streak: allCorrect ? prev.streak + 1 : 0,
    }));
  };

  const handleAnswerStructExam = (optId: string) => {
    if (!examStructQ || examStructSubmitted) return;
    const isCorrect = optId === examStructQ.targetConceptId;
    setExamStructPicked(optId);
    setExamStructSubmitted(true);
    setExamScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      streak: isCorrect ? prev.streak + 1 : 0,
    }));
  };

  // Quadrants for compact odontogram selector
  const quadrants = useMemo(() => {
    if (denticion === 'permanente') {
      return {
        supDer: PIEZAS_PERMANENTES.filter((p) => p.cuadranteFdi === 1).reverse(), // 18..11
        supIzq: PIEZAS_PERMANENTES.filter((p) => p.cuadranteFdi === 2), // 21..28
        infDer: PIEZAS_PERMANENTES.filter((p) => p.cuadranteFdi === 4).reverse(), // 48..41
        infIzq: PIEZAS_PERMANENTES.filter((p) => p.cuadranteFdi === 3), // 31..38
      };
    }
    return {
      supDer: PIEZAS_TEMPORARIAS.filter((p) => p.cuadranteFdi === 5).reverse(), // 55..51
      supIzq: PIEZAS_TEMPORARIAS.filter((p) => p.cuadranteFdi === 6), // 61..65
      infDer: PIEZAS_TEMPORARIAS.filter((p) => p.cuadranteFdi === 8).reverse(), // 85..81
      infIzq: PIEZAS_TEMPORARIAS.filter((p) => p.cuadranteFdi === 7), // 71..75
    };
  }, [denticion]);

  const gruposDisponibles =
    denticion === 'permanente' ? GRUPOS_PERMANENTES : GRUPOS_TEMPORARIOS;

  const uniquePermanentTypes = useMemo(() => {
    const seen = new Set<string>();
    return PIEZAS_PERMANENTES.map((p) => p.tipoCorto).filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  }, []);

  const selectedMeshRecord = useMemo(
    () =>
      selectedMeshKey && modelSummary
        ? modelSummary.meshes.find((m) => m.key === selectedMeshKey) || null
        : null,
    [selectedMeshKey, modelSummary]
  );

  const activeStructureDetail = useMemo(() => {
    if (selectedMeshRecord) {
      const conceptId = mapMeshRecordToConceptId(selectedMeshRecord);
      const baseConcept = ESTRUCTURAS_DENTALES_INFO[conceptId];
      return {
        title: selectedMeshRecord.label,
        subtitle: selectedMeshRecord.subtitle,
        definicion: selectedMeshRecord.detail,
        caracteristicasClinicas: baseConcept?.caracteristicasClinicas || [],
      };
    }
    if (activeConceptId && ESTRUCTURAS_DENTALES_INFO[activeConceptId]) {
      const c = ESTRUCTURAS_DENTALES_INFO[activeConceptId];
      return {
        title: c.nombre,
        subtitle: c.subtitulo,
        definicion: c.definicion,
        caracteristicasClinicas: c.caracteristicasClinicas,
      };
    }
    return null;
  }, [selectedMeshRecord, activeConceptId]);

  const hoveredMeshRecord = useMemo(
    () =>
      hoveredKey && modelSummary
        ? modelSummary.meshes.find((m) => m.key === hoveredKey) || null
        : null,
    [hoveredKey, modelSummary]
  );

  const lingualLabel = activePieza.arcada.startsWith('Superior')
    ? 'Palatina'
    : 'Lingual';
  const oclusalLabel = activePieza.esAnterior ? 'Incisal' : 'Oclusal';

  return (
    <div className="space-y-5">
      {/* Encabezado del módulo Atlas Dentario 3D */}
      <section className="flex flex-col gap-4 border-b border-rose-200/80 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase">
            ANATOMÍA DENTARIA Y ENDODÓNTICA · NOTACIÓN FDI
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-rose-950 sm:text-3xl">
            Atlas Dentario 3D
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
            Dentición permanente completa (32 piezas con modelos 3D multicapa) y dentición temporaria (20 piezas), diferenciando anatomía habitual de variantes radiculares y camerales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Modo de estudio del Atlas Dentario"
            className="inline-flex rounded-xl border border-rose-200 bg-[#FFFDF9] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'exploracion'}
              onClick={() => {
                setMode('exploracion');
                setTranslucentHardTissues(false);
              }}
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
              onClick={() => setMode('examen')}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
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
              if (file) void handleUploadCustomTooth(file);
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

          {activeCustomBuffer && (
            <button
              type="button"
              onClick={() => {
                setCustomBuffersByFdi((prev) => {
                  const next = { ...prev };
                  delete next[activeFdi];
                  return next;
                });
                setModelError(null);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              <RotateCcw size={13} />
              <span>{activePieza.modeloUrl ? 'Restaurar base' : 'Quitar archivo'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAttribution((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Info size={14} className="text-emerald-700" />
            <span>Fuentes y licencia</span>
          </button>
        </div>
      </section>

      {showAttribution && (
        <section className="rounded-xl border border-emerald-200 bg-[#EAEFEA]/70 p-4 text-xs text-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="font-bold text-rose-950">
                Origen de los modelos 3D dentarios y fuentes anatómicas
              </p>
              <p>
                Piezas permanentes (FDI 11–48) derivadas de <strong>BodyParts3D</strong> (© DBCLS,{' '}
                <a
                  href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-rose-900 underline"
                >
                  CC BY-SA 2.1 JP
                </a>
                ) con capas internas (esmalte, dentina coronaria/radicular, cemento, cámara pulpar y conductos) y terceros molares integrados desde <strong>Dental Scope</strong> (CC BY-SA 4.0).
              </p>
              <p className="text-slate-600">
                Dentición temporaria (FDI 51–85): no existen mallas 3D segmentadas en BodyParts3D ni Dental Scope; se deja estructurado el módulo completo con fichas verificadas y carga de modelos `.glb`/`.gltf` propios.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAttribution(false)}
              aria-label="Cerrar fuentes"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-slate-600"
            >
              <X size={15} />
            </button>
          </div>
        </section>
      )}

      {/* SELECTOR DE DENTICIÓN, GRUPOS Y ODONTOGRAMA FDI (en Exploración) */}
      {mode === 'exploracion' && (
        <section className="space-y-3 rounded-2xl border border-rose-200/80 bg-[#FFFDF9] p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Switch Dentición Permanente / Temporaria */}
            <div className="flex items-center gap-1 rounded-xl border border-rose-200 bg-[#FAF6F0] p-1">
              <button
                type="button"
                onClick={() => handleSelectDenticion('permanente')}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-bold transition-colors ${
                  denticion === 'permanente'
                    ? 'bg-rose-900 text-white'
                    : 'text-slate-700 hover:text-rose-950'
                }`}
              >
                Permanente (32)
              </button>
              <button
                type="button"
                onClick={() => handleSelectDenticion('temporaria')}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-bold transition-colors ${
                  denticion === 'temporaria'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:text-emerald-900'
                }`}
              >
                Temporaria (20)
              </button>
            </div>

            {/* Filtro de grupo anatómico */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedGrupo('todos')}
                className={`min-h-[32px] rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                  selectedGrupo === 'todos'
                    ? 'border-rose-900 bg-rose-900 text-white'
                    : 'border-rose-200 bg-white text-slate-700 hover:bg-rose-50'
                }`}
              >
                Todos los grupos
              </button>
              {gruposDisponibles.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setSelectedGrupo(g);
                    const firstInGroup = (
                      denticion === 'permanente' ? PIEZAS_PERMANENTES : PIEZAS_TEMPORARIAS
                    ).find((p) => p.grupo === g);
                    if (firstInGroup) handleSelectPieza(firstInGroup.fdi);
                  }}
                  className={`min-h-[32px] rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                    selectedGrupo === g
                      ? 'border-rose-900 bg-rose-900 text-white'
                      : 'border-rose-200 bg-white text-slate-700 hover:bg-rose-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla Odontograma FDI interactiva por cuadrante */}
          <div className="space-y-1.5 overflow-x-auto pt-1">
            {/* Arcada Superior */}
            <div className="flex min-w-max items-center justify-center gap-2">
              <div className="flex items-center gap-1">
                {quadrants.supDer.map((p) => {
                  const isSel = selectedFdi === p.fdi;
                  const dimmed =
                    selectedGrupo !== 'todos' && p.grupo !== selectedGrupo;
                  return (
                    <button
                      key={p.fdi}
                      type="button"
                      title={`FDI ${p.fdi} · ${p.nombre}`}
                      onClick={() => handleSelectPieza(p.fdi)}
                      className={`flex h-9 w-9 flex-col items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums transition-colors ${
                        isSel
                          ? 'border-rose-900 bg-rose-900 text-white'
                          : dimmed
                            ? 'border-slate-200 bg-slate-50 text-slate-300'
                            : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                      }`}
                    >
                      {p.fdi}
                    </button>
                  );
                })}
              </div>
              <div className="h-8 w-px bg-rose-300" aria-hidden="true" />
              <div className="flex items-center gap-1">
                {quadrants.supIzq.map((p) => {
                  const isSel = selectedFdi === p.fdi;
                  const dimmed =
                    selectedGrupo !== 'todos' && p.grupo !== selectedGrupo;
                  return (
                    <button
                      key={p.fdi}
                      type="button"
                      title={`FDI ${p.fdi} · ${p.nombre}`}
                      onClick={() => handleSelectPieza(p.fdi)}
                      className={`flex h-9 w-9 flex-col items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums transition-colors ${
                        isSel
                          ? 'border-rose-900 bg-rose-900 text-white'
                          : dimmed
                            ? 'border-slate-200 bg-slate-50 text-slate-300'
                            : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                      }`}
                    >
                      {p.fdi}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Arcada Inferior */}
            <div className="flex min-w-max items-center justify-center gap-2">
              <div className="flex items-center gap-1">
                {quadrants.infDer.map((p) => {
                  const isSel = selectedFdi === p.fdi;
                  const dimmed =
                    selectedGrupo !== 'todos' && p.grupo !== selectedGrupo;
                  return (
                    <button
                      key={p.fdi}
                      type="button"
                      title={`FDI ${p.fdi} · ${p.nombre}`}
                      onClick={() => handleSelectPieza(p.fdi)}
                      className={`flex h-9 w-9 flex-col items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums transition-colors ${
                        isSel
                          ? 'border-rose-900 bg-rose-900 text-white'
                          : dimmed
                            ? 'border-slate-200 bg-slate-50 text-slate-300'
                            : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                      }`}
                    >
                      {p.fdi}
                    </button>
                  );
                })}
              </div>
              <div className="h-8 w-px bg-rose-300" aria-hidden="true" />
              <div className="flex items-center gap-1">
                {quadrants.infIzq.map((p) => {
                  const isSel = selectedFdi === p.fdi;
                  const dimmed =
                    selectedGrupo !== 'todos' && p.grupo !== selectedGrupo;
                  return (
                    <button
                      key={p.fdi}
                      type="button"
                      title={`FDI ${p.fdi} · ${p.nombre}`}
                      onClick={() => handleSelectPieza(p.fdi)}
                      className={`flex h-9 w-9 flex-col items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums transition-colors ${
                        isSel
                          ? 'border-rose-900 bg-rose-900 text-white'
                          : dimmed
                            ? 'border-slate-200 bg-slate-50 text-slate-300'
                            : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                      }`}
                    >
                      {p.fdi}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between px-2 text-[10px] font-medium text-slate-500">
              <span>Derecha del paciente (Q1/Q4 · Q5/Q8)</span>
              <span>Izquierda del paciente (Q2/Q3 · Q6/Q7)</span>
            </div>
          </div>
        </section>
      )}

      {modelError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-950"
        >
          <span>{modelError}</span>
          <button
            type="button"
            onClick={() => setModelError(null)}
            className="shrink-0 rounded-lg bg-rose-900 px-3 py-1.5 font-semibold text-white"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* WORKSPACE PRINCIPAL: VISOR 3D + PANEL DE FICHA / ESTRUCTURAS / EXAMEN */}
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        {/* VISOR 3D DENTARIO */}
        <section className="overflow-hidden rounded-2xl border border-rose-200/80 bg-[#FFFDF9] lg:col-span-7">
          {/* Barra superior del visor */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/70 bg-rose-50/60 px-3.5 py-2.5">
            <div className="min-w-0">
              {mode === 'examen' && examStyle === 'identificar-pieza' && !examPieceSubmitted ? (
                <p className="text-xs font-bold text-amber-900">
                  Pieza dental incógnita · Identificá tipo, arcada, lado y FDI
                </p>
              ) : (
                <p className="truncate text-xs font-bold text-rose-950">
                  <span className="font-mono text-rose-800 tabular-nums">
                    FDI {activePieza.fdi}
                  </span>{' '}
                  · {activePieza.nombre}
                </p>
              )}
            </div>

            {modelSource && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTranslucentHardTissues((v) => !v)}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                    translucentHardTissues
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                  }`}
                >
                  <Eye size={13} />
                  <span>Ver pulpa</span>
                </button>

                {mode === 'exploracion' && (
                  <button
                    type="button"
                    onClick={() => setShowPdl((v) => !v)}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                      showPdl
                        ? 'border-rose-900 bg-rose-900 text-white'
                        : 'border-rose-200 bg-white text-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    <span>LPD</span>
                  </button>
                )}

                {mode === 'exploracion' &&
                  (hiddenKeys.length > 0 || isolatedConcept !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setHiddenKeys([]);
                        setIsolatedConcept(null);
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800"
                    >
                      <span>Mostrar todo</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => canvasRef.current?.zoomBy(0.82)}
                  aria-label="Acercar diente"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-950 hover:bg-rose-50"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.zoomBy(1.22)}
                  aria-label="Alejar diente"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-950 hover:bg-rose-50"
                >
                  <Minus size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
                >
                  <RotateCcw size={13} />
                  <span>Restablecer</span>
                </button>
              </div>
            )}
          </div>

          {/* Área de render 3D o aviso honesto de recurso faltante */}
          <div className="relative h-[340px] w-full sm:h-[430px] lg:h-[500px]">
            {modelSource ? (
              <>
                <AtlasToothCanvas
                  ref={canvasRef}
                  modelSource={modelSource}
                  frameManifest={activeFrameManifest}
                  highlightedKeys={highlightedKeys}
                  hoveredKey={
                    mode === 'examen' && examStyle === 'identificar-estructura'
                      ? null
                      : hoveredKey
                  }
                  hiddenKeys={mode === 'exploracion' ? effectiveHiddenKeys : EMPTY_KEYS}
                  isolatedKeys={isolatedKeys}
                  translucentHardTissues={translucentHardTissues}
                  clipMode={clipMode}
                  clipOffset={clipOffset}
                  examHighlightKeys={
                    mode === 'examen' &&
                    examStyle === 'identificar-estructura' &&
                    examStructQ
                      ? examStructQ.targetKeys
                      : EMPTY_KEYS
                  }
                  onSelectMesh={handleCanvasSelectMesh}
                  onHoverMesh={setHoveredKey}
                  onModelLoaded={handleModelLoaded}
                  onModelError={handleModelError}
                />

                {/* Etiqueta flotante superior izquierda */}
                <div className="pointer-events-none absolute top-3 left-3 max-w-[80%]">
                  {mode === 'exploracion' && hoveredMeshRecord && (
                    <div className="rounded-lg border border-rose-200 bg-[#FFFDF9]/95 px-3 py-1.5 shadow-xs">
                      <p className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                        Capa / Reparador anatómico
                      </p>
                      <p className="text-xs font-bold text-rose-950">
                        {hoveredMeshRecord.label}
                      </p>
                    </div>
                  )}

                  {mode === 'exploracion' && !hoveredMeshRecord && activeStructureDetail && (
                    <div className="rounded-lg border border-rose-300 bg-[#FFFDF9]/95 px-3 py-1.5 shadow-xs">
                      <p className="text-[10px] font-bold tracking-wider text-rose-800 uppercase">
                        Estructura seleccionada
                      </p>
                      <p className="text-xs font-bold text-rose-950">
                        {activeStructureDetail.title}
                      </p>
                    </div>
                  )}

                  {mode === 'examen' && examStyle === 'identificar-estructura' && examStructQ && (
                    <div className="rounded-lg border border-amber-300 bg-[#FFFDF9]/95 px-3 py-1.5 shadow-xs">
                      <p className="text-[10px] font-bold tracking-wider text-amber-800 uppercase">
                        Estructura señalada en ámbar
                      </p>
                      <p className="text-xs font-semibold text-slate-800">
                        {examStructSubmitted
                          ? examStructQ.targetLabel
                          : 'Nombre oculto · Rotá o realizá corte interno'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Recurso 3D faltante para dentición temporaria — NUNCA usar imagen plana sustitutiva */
              <div className="flex h-full w-full flex-col items-center justify-center bg-[#F6EFE6] p-6 text-center">
                <div className="max-w-md space-y-3 rounded-2xl border border-amber-300 bg-[#FFFDF9] p-5 shadow-xs">
                  <AlertCircle size={26} className="mx-auto text-amber-700" />
                  <p className="text-[11px] font-bold tracking-wider text-amber-800 uppercase">
                    Recurso 3D segmentado aún no incorporado
                  </p>
                  <h2 className="font-serif text-lg font-bold text-rose-950">
                    FDI {activePieza.fdi} · {activePieza.nombre}
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {activePieza.recursoFaltanteDetalle}
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    No se utiliza ninguna imagen plana ni diente permanente reescalado como sustituto para preservar el rigor anatómico. La ficha completa ya está disponible en el panel lateral y podés cargar un archivo <code>.glb</code> o <code>.gltf</code> si contás con el modelo.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-rose-900 px-4 text-xs font-bold text-white hover:bg-rose-950"
                  >
                    <FileUp size={14} />
                    <span>Cargar modelo .GLB / .GLTF para FDI {activePieza.fdi}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Barra inferior de Vistas Dentales y Cortes Internos */}
          {modelSource && (
            <div className="space-y-3 border-t border-rose-200/70 bg-[#FAF6F0] px-3.5 py-3">
              {/* Vistas anatómicas específicas de la pieza */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'vestibular', label: 'Vestibular' },
                      { id: 'lingual', label: lingualLabel },
                      { id: 'mesial', label: 'Mesial' },
                      { id: 'distal', label: 'Distal' },
                      { id: 'oclusal', label: oclusalLabel },
                    ] as const
                  ).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVista(v.id)}
                      className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                        activeVista === v.id
                          ? 'border-rose-900 bg-rose-900 text-white'
                          : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] text-slate-500">
                  360° libre · Rueda/pellizco: zoom
                </span>
              </div>

              {/* Control de Cortes Internos reales (Clipping Plane) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rose-200/60 pt-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-950">
                    <Scissors size={13} className="text-emerald-700" />
                    <span>Corte interno:</span>
                  </span>
                  {(
                    [
                      { id: 'ninguno', label: 'Sin corte' },
                      { id: 'vestibulo-lingual', label: 'Vestíbulo-Lingual' },
                      { id: 'mesio-distal', label: 'Mesio-Distal' },
                      { id: 'axial', label: 'Axial' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClipMode(c.id);
                        if (c.id === 'ninguno') setClipOffset(0);
                      }}
                      className={`min-h-[32px] rounded-md border px-2 text-[11px] font-semibold transition-colors ${
                        clipMode === c.id
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-rose-200 bg-white text-slate-700 hover:bg-rose-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {clipMode !== 'ninguno' && (
                  <div className="flex min-w-[200px] flex-1 items-center gap-2 sm:max-w-xs">
                    <label
                      htmlFor="dental-clip-slider"
                      className="shrink-0 text-[11px] font-medium text-slate-600"
                    >
                      Plano:
                    </label>
                    <input
                      id="dental-clip-slider"
                      type="range"
                      min={-0.75}
                      max={0.75}
                      step={0.02}
                      value={clipOffset}
                      onChange={(e) => setClipOffset(Number(e.target.value))}
                      className="w-full accent-emerald-700"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* COLUMNA DERECHA: FICHA / ESTRUCTURAS ANATÓMICAS / MODO EXAMEN */}
        <section className="overflow-hidden rounded-2xl border border-rose-200/80 bg-[#FFFDF9] lg:col-span-5">
          {mode === 'exploracion' ? (
            <>
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
                    Ficha de la Pieza
                  </button>
                  <button
                    type="button"
                    onClick={() => setSideTab('estructuras')}
                    className={`min-h-[38px] border-b-2 px-3 pb-2 text-xs font-bold transition-colors ${
                      sideTab === 'estructuras'
                        ? 'border-rose-900 text-rose-950'
                        : 'border-transparent text-slate-600 hover:text-rose-900'
                    }`}
                  >
                    Estructuras y Capas
                  </button>
                </div>

                {isolatedConcept && (
                  <button
                    type="button"
                    onClick={() => setIsolatedConcept(null)}
                    className="mb-1.5 rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    Salir de aislar
                  </button>
                )}
              </div>

              {sideTab === 'ficha' ? (
                <article className="max-h-[610px] space-y-4 overflow-y-auto p-4 sm:p-5">
                  <div className="border-b border-rose-200/70 pb-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
                      <span className="text-emerald-700 uppercase">
                        Dentición {activePieza.denticion} · {activePieza.arcada}
                      </span>
                      <span className="font-mono font-bold text-rose-900 tabular-nums">
                        FDI {activePieza.fdi}
                      </span>
                    </div>
                    <h2 className="mt-1 font-serif text-xl font-bold text-rose-950">
                      {activePieza.nombre}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Grupo: {activePieza.grupo} · Lado: {activePieza.lado}
                    </p>
                  </div>

                  {/* Características anatómicas */}
                  <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                      Características anatómicas
                    </h3>
                    <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                      {activePieza.caracteristicasAnatomicas.map((c, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Número de raíces (Habitual vs Variantes) */}
                  <div className="rounded-xl border border-rose-200/70 bg-[#F8F5F1] p-3.5 text-xs">
                    <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                      Número de raíces
                    </h3>
                    <p className="mt-1.5 leading-relaxed text-slate-800">
                      <strong>Anatomía habitual:</strong> {activePieza.numeroRaices.habitual}
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-600">
                      <strong>Variantes anatómicas:</strong> {activePieza.numeroRaices.variantes}
                    </p>
                  </div>

                  {/* Conductos radiculares (Habitual vs Variantes) */}
                  <div className="rounded-xl border border-emerald-200 bg-[#EAEFEA]/75 p-3.5 text-xs">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-emerald-900 uppercase">
                      <Sparkles size={13} className="text-emerald-700" />
                      <span>Número y disposición de conductos</span>
                    </h3>
                    <p className="mt-1.5 leading-relaxed text-slate-800">
                      <strong>Habitual:</strong> {activePieza.conductosRadiculares.habitual}
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-700">
                      <strong>Disposición:</strong> {activePieza.conductosRadiculares.disposicion}
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-600">
                      <strong>Variantes:</strong> {activePieza.conductosRadiculares.variantes}
                    </p>
                  </div>

                  {/* Caras dentarias */}
                  <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                      Descripción por caras
                    </h3>
                    <dl className="mt-1.5 space-y-2 text-xs leading-relaxed text-slate-700">
                      <div>
                        <dt className="font-bold text-slate-900">Vestibular</dt>
                        <dd>{activePieza.caras.vestibular}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-900">{lingualLabel}</dt>
                        <dd>{activePieza.caras.palatinaOLingual}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-900">Mesial</dt>
                        <dd>{activePieza.caras.mesial}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-900">Distal</dt>
                        <dd>{activePieza.caras.distal}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-slate-900">{oclusalLabel}</dt>
                        <dd>{activePieza.caras.oclusalOIncisal}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Rasgos diferenciales */}
                  <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                      Rasgos diferenciales y lateralidad
                    </h3>
                    <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-700">
                      {activePieza.rasgosDiferenciales.map((r, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bibliografía verificable */}
                  <div className="border-t border-rose-200/70 pt-3">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      <BookOpen size={12} />
                      <span>Bibliografía verificable</span>
                    </h3>
                    <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-500">
                      {activePieza.bibliografia.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ) : (
                /* PESTAÑA ESTRUCTURAS Y CAPAS INTERNAS */
                <div className="max-h-[610px] space-y-4 overflow-y-auto p-4 sm:p-5">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-rose-900 uppercase">
                      Regiones y tejidos anatómicos
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {CONCEPTO_BOTONES.map((b) => {
                        const active = activeConceptId === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            disabled={!modelSource}
                            onClick={() => handleSelectConcept(b.id)}
                            className={`flex min-h-[36px] items-center justify-between rounded-lg border px-2.5 text-left text-xs font-semibold transition-colors disabled:opacity-45 ${
                              active
                                ? 'border-rose-900 bg-rose-900 text-white'
                                : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
                            }`}
                          >
                            <span>{b.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detalle de la estructura seleccionada */}
                  {activeStructureDetail && (
                    <div className="space-y-2 rounded-xl border border-emerald-200 bg-[#EAEFEA]/75 p-3.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-rose-950">
                            {activeStructureDetail.title}
                          </p>
                          <p className="text-[11px] text-emerald-800">
                            {activeStructureDetail.subtitle}
                          </p>
                        </div>
                        {(activeConceptId || selectedMeshKey) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleIsolateMesh(
                                selectedMeshKey || activeConceptId || ''
                              )
                            }
                            className="inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-md border border-emerald-700 bg-white px-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                          >
                            <Layers size={12} />
                            <span>
                              {isolatedConcept === (selectedMeshKey || activeConceptId)
                                ? 'Mostrar todo'
                                : 'Aislar'}
                            </span>
                          </button>
                        )}
                      </div>
                      <p className="leading-relaxed text-slate-700">
                        {activeStructureDetail.definicion}
                      </p>
                      {activeStructureDetail.caracteristicasClinicas.length > 0 && (
                        <ul className="space-y-1 pt-1 text-[11px] leading-relaxed text-slate-600">
                          {activeStructureDetail.caracteristicasClinicas.map((cl, i) => (
                            <li key={i}>• {cl}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Lista individual de mallas del modelo actual (con ocultar/aislar) */}
                  {modelSummary && (
                    <div>
                      <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        Mallas individuales de FDI {activePieza.fdi} ({modelSummary.meshes.length})
                      </p>
                      <ul className="divide-y divide-slate-100 rounded-xl border border-rose-200/70 bg-white">
                        {modelSummary.meshes.map((m) => {
                          const isSel = selectedMeshKey === m.key;
                          const isHidden = effectiveHiddenKeys.includes(m.key);
                          const isIso = isolatedConcept === m.key;
                          return (
                            <li
                              key={m.key}
                              className={`flex items-center justify-between gap-2 px-3 py-2 ${
                                isSel ? 'bg-rose-50/80' : 'hover:bg-slate-50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleCanvasSelectMesh(m.key)}
                                onMouseEnter={() => setHoveredKey(m.key)}
                                onMouseLeave={() => setHoveredKey(null)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p
                                  className={`truncate text-xs font-semibold ${
                                    isHidden
                                      ? 'text-slate-400 line-through'
                                      : isSel
                                        ? 'text-rose-950'
                                        : 'text-slate-800'
                                  }`}
                                >
                                  {m.label}
                                </p>
                                <p className="truncate text-[11px] text-slate-500">
                                  {m.subtitle}
                                </p>
                              </button>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleIsolateMesh(m.key)}
                                  title="Aislar capa"
                                  aria-label={`Aislar ${m.label}`}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                                    isIso
                                      ? 'border-emerald-700 bg-emerald-700 text-white'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  <Layers size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (m.layerType === 'pdl') {
                                      setShowPdl((v) => !v);
                                    } else {
                                      handleToggleHideMesh(m.key);
                                    }
                                  }}
                                  title={isHidden ? 'Mostrar' : 'Ocultar'}
                                  aria-label={isHidden ? `Mostrar ${m.label}` : `Ocultar ${m.label}`}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                                    isHidden
                                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* PANEL MODO EXAMEN DENTARIO */
            <div className="max-h-[610px] space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/70 pb-3">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
                    AUTOEVALUACIÓN DENTARIA 3D
                  </p>
                  <h2 className="font-serif text-lg font-bold text-rose-950">
                    Modo Examen
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800">
                    {examScore.correct}/{examScore.total}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-900">
                    <Award size={13} />
                    <span>Racha {examScore.streak}</span>
                  </span>
                </div>
              </div>

              {/* Selector de modalidad de examen */}
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-rose-200 bg-[#FAF6F0] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setExamStyle('identificar-pieza');
                    generatePieceQuestion();
                  }}
                  className={`min-h-[34px] rounded-lg px-2 text-[11px] font-semibold transition-colors ${
                    examStyle === 'identificar-pieza'
                      ? 'bg-rose-900 text-white'
                      : 'text-slate-600 hover:text-rose-950'
                  }`}
                >
                  Identificar pieza (FDI)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExamStyle('identificar-estructura');
                    generateStructureQuestion();
                  }}
                  className={`min-h-[34px] rounded-lg px-2 text-[11px] font-semibold transition-colors ${
                    examStyle === 'identificar-estructura'
                      ? 'bg-rose-900 text-white'
                      : 'text-slate-600 hover:text-rose-950'
                  }`}
                >
                  Identificar estructura
                </button>
              </div>

              {examStyle === 'identificar-pieza' && examPieceQ && (
                <form onSubmit={handleSubmitPieceExam} className="space-y-3">
                  <p className="text-xs leading-relaxed text-slate-600">
                    Observá la anatomía coronaria, las raíces y el número de conductos (activando <strong>Ver pulpa</strong> o <strong>Corte interno</strong> si lo necesitás) para identificar la pieza:
                  </p>

                  <div>
                    <label
                      htmlFor="exam-tipo"
                      className="block text-[11px] font-semibold text-slate-700"
                    >
                      1. Tipo de diente
                    </label>
                    <select
                      id="exam-tipo"
                      required
                      disabled={examPieceSubmitted}
                      value={examPickTipo}
                      onChange={(e) => setExamPickTipo(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
                    >
                      <option value="">Seleccionar tipo...</option>
                      {uniquePermanentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="exam-arcada"
                        className="block text-[11px] font-semibold text-slate-700"
                      >
                        2. Arcada
                      </label>
                      <select
                        id="exam-arcada"
                        required
                        disabled={examPieceSubmitted}
                        value={examPickArcada}
                        onChange={(e) =>
                          setExamPickArcada(e.target.value as ArcadaTipo | '')
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs text-slate-900"
                      >
                        <option value="">Arcada...</option>
                        <option value="Superior (maxilar)">Superior (maxilar)</option>
                        <option value="Inferior (mandibular)">Inferior (mandibular)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="exam-lado"
                        className="block text-[11px] font-semibold text-slate-700"
                      >
                        3. Lado
                      </label>
                      <select
                        id="exam-lado"
                        required
                        disabled={examPieceSubmitted}
                        value={examPickLado}
                        onChange={(e) =>
                          setExamPickLado(e.target.value as LadoDental | '')
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs text-slate-900"
                      >
                        <option value="">Lado...</option>
                        <option value="Derecho">Derecho</option>
                        <option value="Izquierdo">Izquierdo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="exam-fdi"
                      className="block text-[11px] font-semibold text-slate-700"
                    >
                      4. Número FDI (ej. 11, 26, 34, 48)
                    </label>
                    <input
                      id="exam-fdi"
                      type="text"
                      required
                      disabled={examPieceSubmitted}
                      maxLength={2}
                      value={examPickFdi}
                      onChange={(e) => setExamPickFdi(e.target.value.replace(/\D/g, ''))}
                      placeholder="Código FDI de 2 dígitos"
                      className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 font-mono text-xs text-slate-900 tabular-nums"
                    />
                  </div>

                  {!examPieceSubmitted ? (
                    <button
                      type="submit"
                      className="min-h-[42px] w-full rounded-xl bg-rose-900 text-xs font-bold text-white hover:bg-rose-950"
                    >
                      Verificar identificación
                    </button>
                  ) : (
                    <div className="space-y-2.5 rounded-xl border border-rose-200 bg-[#F8F5F1] p-3.5 text-xs">
                      <p className="font-bold text-rose-950">
                        Respuesta correcta: FDI {examPieceQ.pieza.fdi} ·{' '}
                        {examPieceQ.pieza.nombre}
                      </p>
                      <ul className="space-y-1 text-[11px] text-slate-700">
                        <li>
                          • Tipo:{' '}
                          <strong
                            className={
                              examPickTipo === examPieceQ.pieza.tipoCorto
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {examPickTipo === examPieceQ.pieza.tipoCorto
                              ? 'Correcto'
                              : `Elegiste "${examPickTipo}"`}
                          </strong>
                        </li>
                        <li>
                          • Arcada:{' '}
                          <strong
                            className={
                              examPickArcada === examPieceQ.pieza.arcada
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {examPickArcada === examPieceQ.pieza.arcada
                              ? 'Correcto'
                              : `Elegiste "${examPickArcada}"`}
                          </strong>
                        </li>
                        <li>
                          • Lado:{' '}
                          <strong
                            className={
                              examPickLado === examPieceQ.pieza.lado
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {examPickLado === examPieceQ.pieza.lado
                              ? 'Correcto'
                              : `Elegiste "${examPickLado}"`}
                          </strong>
                        </li>
                        <li>
                          • FDI:{' '}
                          <strong
                            className={
                              examPickFdi === examPieceQ.pieza.fdi
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {examPickFdi === examPieceQ.pieza.fdi
                              ? 'Correcto'
                              : `Ingresaste "${examPickFdi}"`}
                          </strong>
                        </li>
                      </ul>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        {examPieceQ.pieza.rasgosDiferenciales[0]}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => generatePieceQuestion(examPieceQ.targetFdi)}
                          className="min-h-[38px] rounded-lg bg-rose-900 px-3.5 text-xs font-bold text-white hover:bg-rose-950"
                        >
                          Siguiente pieza
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('exploracion');
                            setDenticion('permanente');
                            handleSelectPieza(examPieceQ.targetFdi);
                            setSideTab('ficha');
                          }}
                          className="min-h-[38px] rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950"
                        >
                          Ver ficha completa
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {examStyle === 'identificar-estructura' && examStructQ && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-slate-800">
                    Pieza de referencia: <strong>FDI {examStructQ.pieza.fdi}</strong> ({examStructQ.pieza.nombre}). Identificá la estructura resaltada en ámbar:
                  </div>

                  <div className="space-y-2">
                    {examStructQ.options.map((opt) => {
                      const isTarget = opt.id === examStructQ.targetConceptId;
                      const isPicked = opt.id === examStructPicked;
                      let cls =
                        'border-rose-200 bg-white text-slate-800 hover:bg-rose-50/70';
                      if (examStructSubmitted) {
                        if (isTarget) {
                          cls = 'border-emerald-600 bg-emerald-50 text-emerald-950';
                        } else if (isPicked) {
                          cls = 'border-rose-500 bg-rose-50 text-rose-950';
                        } else {
                          cls = 'border-slate-200 bg-slate-50 text-slate-400';
                        }
                      }
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={examStructSubmitted}
                          onClick={() => handleAnswerStructExam(opt.id)}
                          className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3.5 text-left text-xs font-semibold transition-colors ${cls}`}
                        >
                          <span>{opt.label}</span>
                          {examStructSubmitted && isTarget && (
                            <CheckCircle2 size={16} className="text-emerald-700" />
                          )}
                          {examStructSubmitted && isPicked && !isTarget && (
                            <XCircle size={16} className="text-rose-700" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {examStructSubmitted && (
                    <div className="space-y-2 rounded-xl border border-rose-200 bg-[#F8F5F1] p-3.5 text-xs">
                      <p className="font-bold text-rose-950">
                        {examStructQ.targetLabel}
                      </p>
                      <p className="leading-relaxed text-slate-700">
                        {ESTRUCTURAS_DENTALES_INFO[examStructQ.targetConceptId]?.definicion ||
                          ''}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          generateStructureQuestion(examStructQ.targetFdi)
                        }
                        className="min-h-[38px] rounded-lg bg-rose-900 px-3.5 text-xs font-bold text-white hover:bg-rose-950"
                      >
                        Siguiente estructura
                      </button>
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
