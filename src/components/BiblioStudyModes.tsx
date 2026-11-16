import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Shuffle,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  FlashcardItem,
  FlashcardSignal,
  MateriaPlan,
  PreguntaBanco,
  PreguntaSignal,
} from '../types/dental';

const TAG_SUGGESTIONS = ['1er parcial', '2do parcial', 'Final', 'Práctico', 'Resumen'];

interface TagEditorProps {
  etiquetas: string[];
  onChange: (next: string[]) => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({ etiquetas, onChange }) => {
  const [tagInput, setTagInput] = useState('');

  const addTag = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    if (!etiquetas.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      onChange([...etiquetas, clean]);
    }
    setTagInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Tag size={12} />
          <span>Etiquetas:</span>
        </span>
        {etiquetas.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(etiquetas.filter((t) => t !== tag))}
            title={`Quitar etiqueta "${tag}"`}
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-950 hover:bg-rose-100"
          >
            <span>{tag}</span>
            <X size={11} />
          </button>
        ))}

        <div className="inline-flex items-center gap-1">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Ej. 1er parcial"
            className="h-7 w-28 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-rose-900"
          />
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            className="h-7 rounded-md border border-rose-200 bg-white px-2 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
          >
            + Etiqueta
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-slate-400">Sugerencias:</span>
        {TAG_SUGGESTIONS.filter(
          (sug) => !etiquetas.some((t) => t.toLowerCase() === sug.toLowerCase())
        ).map((sug) => (
          <button
            key={sug}
            type="button"
            onClick={() => addTag(sug)}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-950"
          >
            + {sug}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ==========================
   FLASHCARDS PANEL
========================== */
interface FlashcardsPanelProps {
  cards: FlashcardItem[];
  materias: MateriaPlan[];
  defaultAnio: number;
  defaultMateria: string;
  flashcardSignals?: Record<string, FlashcardSignal>;
  onMarkFlashcard?: (id: string, status: 'pendiente' | 'dominada') => void;
  onAddCard: (card: FlashcardItem) => void;
  onToggleFavorito: (id: string) => void;
  onDeleteCard: (id: string) => void;
}

export const FlashcardsPanel: React.FC<FlashcardsPanelProps> = ({
  cards,
  materias,
  defaultAnio,
  defaultMateria,
  flashcardSignals = {},
  onMarkFlashcard,
  onAddCard,
  onToggleFavorito,
  onDeleteCard,
}) => {
  const [showNew, setShowNew] = useState(false);
  const [anio, setAnio] = useState<number>(defaultAnio || 1);
  const [materia, setMateria] = useState<string>(defaultMateria || materias[0]?.nombre || '');
  const [frente, setFrente] = useState('');
  const [dorso, setDorso] = useState('');
  const [etiquetas, setEtiquetas] = useState<string[]>([]);

  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);

  const materiasOptions = useMemo(() => {
    const byYear = materias.filter((m) => m.anio === anio).map((m) => m.nombre);
    const list = byYear.length > 0 ? byYear : materias.map((m) => m.nombre);
    return Array.from(new Set(list));
  }, [materias, anio]);

  const studyDeck = useMemo(() => {
    if (!shuffledOrder) return cards;
    const byId = new Map(cards.map((c) => [c.id, c]));
    const ordered = shuffledOrder.map((id) => byId.get(id)).filter(Boolean) as FlashcardItem[];
    const missing = cards.filter((c) => !shuffledOrder.includes(c.id));
    return [...ordered, ...missing];
  }, [cards, shuffledOrder]);

  const safeIndex = studyDeck.length > 0 ? Math.min(studyIndex, studyDeck.length - 1) : 0;
  const currentCard = studyDeck[safeIndex] || null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frente.trim() || !dorso.trim()) return;
    onAddCard({
      id: `fc-${Date.now().toString(36)}`,
      anio,
      materia: materia || materiasOptions[0] || 'General',
      frente: frente.trim(),
      dorso: dorso.trim(),
      etiquetas,
      favorito: false,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setFrente('');
    setDorso('');
    setEtiquetas([]);
    setShowNew(false);
  };

  const handleShuffle = () => {
    const ids = cards.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffledOrder(ids);
    setStudyIndex(0);
    setFlipped(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-rose-950">
            Flashcards de estudio ({cards.length})
          </h2>
          <p className="text-xs text-slate-500">
            Tocá la tarjeta para darla vuelta y repasar conceptos clave antes de parciales o finales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cards.length > 1 && (
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 hover:bg-rose-50"
            >
              <Shuffle size={14} />
              <span>Mezclar</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
          >
            <Plus size={14} />
            <span>Nueva flashcard</span>
          </button>
        </div>
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/40 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700">Año</label>
              <select
                value={anio}
                onChange={(e) => {
                  const nextAnio = Number(e.target.value);
                  setAnio(nextAnio);
                  const first = materias.find((m) => m.anio === nextAnio)?.nombre;
                  if (first) setMateria(first);
                }}
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
              >
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y}° Año
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-9">
              <label className="block text-xs font-medium text-slate-700">Asignatura</label>
              <select
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
              >
                {materiasOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Frente / Pregunta
              </label>
              <textarea
                rows={3}
                required
                value={frente}
                onChange={(e) => setFrente(e.target.value)}
                placeholder="Ej. ¿Qué inerva el nervio alveolar inferior?"
                className="mt-1 w-full rounded-lg border border-rose-200 bg-white p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Dorso / Respuesta
              </label>
              <textarea
                rows={3}
                required
                value={dorso}
                onChange={(e) => setDorso(e.target.value)}
                placeholder="Ej. Piezas dentarias inferiores, cuerpo mandibular y labio inferior..."
                className="mt-1 w-full rounded-lg border border-rose-200 bg-white p-2.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <TagEditor etiquetas={etiquetas} onChange={setEtiquetas} />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="min-h-[34px] rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-950"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[34px] rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
            >
              Guardar flashcard
            </button>
          </div>
        </form>
      )}

      {/* Visor interactivo */}
      {currentCard ? (
        <div className="rounded-xl border border-rose-200/80 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-medium text-rose-950">
              {currentCard.anio}° Año · {currentCard.materia}
              {currentCard.etiquetas.length > 0
                ? ` · ${currentCard.etiquetas.join(' · ')}`
                : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tabular-nums">
                {safeIndex + 1} / {studyDeck.length}
              </span>
              <button
                type="button"
                onClick={() => onToggleFavorito(currentCard.id)}
                aria-label="Marcar flashcard como favorita"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                  currentCard.favorito
                    ? 'border-amber-300 bg-amber-50 text-amber-600'
                    : 'border-slate-200 text-slate-400 hover:text-amber-600'
                }`}
              >
                <Star size={14} fill={currentCard.favorito ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={`flex min-h-[160px] w-full flex-col items-center justify-center rounded-xl border p-6 text-center transition-colors ${
              flipped
                ? 'border-rose-900 bg-rose-950 text-white'
                : 'border-rose-200 bg-rose-50/50 text-rose-950 hover:bg-rose-50'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                flipped ? 'text-rose-200' : 'text-rose-800'
              }`}
            >
              {flipped ? 'Respuesta' : 'Pregunta (tocar para girar)'}
            </span>
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-base font-semibold leading-relaxed">
              {flipped ? currentCard.dorso : currentCard.frente}
            </p>
          </button>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => {
                setStudyIndex((i) => Math.max(0, i - 1));
                setFlipped(false);
              }}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-950"
            >
              <RotateCcw size={13} />
              <span>{flipped ? 'Ver pregunta' : 'Ver respuesta'}</span>
            </button>

            <button
              type="button"
              disabled={safeIndex >= studyDeck.length - 1}
              onClick={() => {
                setStudyIndex((i) => Math.min(studyDeck.length - 1, i + 1));
                setFlipped(false);
              }}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 disabled:opacity-40"
            >
              <span>Siguiente</span>
              <ChevronRight size={15} />
            </button>
          </div>

          {onMarkFlashcard && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rose-100 pt-3">
              <span className="text-[11px] text-slate-500">
                Estado de repaso:{' '}
                <strong className="text-rose-950">
                  {flashcardSignals[currentCard.id]?.status === 'pendiente'
                    ? 'Pendiente de reforzar'
                    : flashcardSignals[currentCard.id]?.status === 'dominada'
                      ? 'Dominada'
                      : 'Sin calificar'}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMarkFlashcard(currentCard.id, 'pendiente')}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                    flashcardSignals[currentCard.id]?.status === 'pendiente'
                      ? 'border-amber-400 bg-amber-100 text-amber-900'
                      : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  A reforzar (Modo Repaso)
                </button>
                <button
                  type="button"
                  onClick={() => onMarkFlashcard(currentCard.id, 'dominada')}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                    flashcardSignals[currentCard.id]?.status === 'dominada'
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Ya la sé
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Todavía no cargaste flashcards con estos filtros. Creá la primera arriba.
        </div>
      )}

      {/* Lista de tarjetas */}
      {cards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((c, idx) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShuffledOrder(null);
                      setStudyIndex(idx);
                      setFlipped(false);
                    }}
                    className="text-left text-xs font-bold text-rose-950 hover:underline"
                  >
                    {c.frente}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleFavorito(c.id)}
                      aria-label="Favorito"
                      className={`p-1 ${
                        c.favorito ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                      }`}
                    >
                      <Star size={14} fill={c.favorito ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCard(c.id)}
                      aria-label="Eliminar flashcard"
                      className="p-1 text-slate-400 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">{c.dorso}</p>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                {c.anio}° Año · {c.materia}
                {c.etiquetas.length > 0 ? ` · ${c.etiquetas.join(' · ')}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ==========================
   BANCO DE PREGUNTAS PANEL
========================== */
interface BancoPreguntasPanelProps {
  preguntas: PreguntaBanco[];
  materias: MateriaPlan[];
  defaultAnio: number;
  defaultMateria: string;
  preguntaSignals?: Record<string, PreguntaSignal>;
  onRecordPreguntaAttempt?: (id: string, isCorrect: boolean) => void;
  onAddPregunta: (p: PreguntaBanco) => void;
  onToggleFavorito: (id: string) => void;
  onDeletePregunta: (id: string) => void;
}

export const BancoPreguntasPanel: React.FC<BancoPreguntasPanelProps> = ({
  preguntas,
  materias,
  defaultAnio,
  defaultMateria,
  preguntaSignals = {},
  onRecordPreguntaAttempt,
  onAddPregunta,
  onToggleFavorito,
  onDeletePregunta,
}) => {
  const [showNew, setShowNew] = useState(false);
  const [anio, setAnio] = useState<number>(defaultAnio || 1);
  const [materia, setMateria] = useState<string>(defaultMateria || materias[0]?.nombre || '');
  const [enunciado, setEnunciado] = useState('');
  const [opciones, setOpciones] = useState<string[]>(['', '', '', '']);
  const [correcta, setCorrecta] = useState(0);
  const [explicacion, setExplicacion] = useState('');
  const [etiquetas, setEtiquetas] = useState<string[]>([]);

  const [answers, setAnswers] = useState<Record<string, number>>({});

  const materiasOptions = useMemo(() => {
    const byYear = materias.filter((m) => m.anio === anio).map((m) => m.nombre);
    const list = byYear.length > 0 ? byYear : materias.map((m) => m.nombre);
    return Array.from(new Set(list));
  }, [materias, anio]);

  const score = useMemo(() => {
    let respondidas = 0;
    let aciertos = 0;
    preguntas.forEach((p) => {
      if (answers[p.id] !== undefined) {
        respondidas += 1;
        if (answers[p.id] === p.respuestaCorrecta) aciertos += 1;
      }
    });
    return { respondidas, aciertos };
  }, [preguntas, answers]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOps = opciones.map((o) => o.trim()).filter(Boolean);
    if (!enunciado.trim() || cleanOps.length < 2) return;
    const safeCorrecta = Math.min(correcta, cleanOps.length - 1);
    onAddPregunta({
      id: `preg-${Date.now().toString(36)}`,
      anio,
      materia: materia || materiasOptions[0] || 'General',
      enunciado: enunciado.trim(),
      opciones: cleanOps,
      respuestaCorrecta: safeCorrecta,
      explicacion: explicacion.trim() || undefined,
      etiquetas,
      favorito: false,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setEnunciado('');
    setOpciones(['', '', '', '']);
    setCorrecta(0);
    setExplicacion('');
    setEtiquetas([]);
    setShowNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-rose-950">
            Banco de preguntas ({preguntas.length})
          </h2>
          <p className="text-xs text-slate-500 tabular-nums">
            {score.respondidas > 0
              ? `Autoevaluación: ${score.aciertos}/${score.respondidas} correctas`
              : 'Cargá preguntas de parciales o finales para practicar multiple choice.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {score.respondidas > 0 && (
            <button
              type="button"
              onClick={() => setAnswers({})}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-950 hover:bg-rose-50"
            >
              <RotateCcw size={13} />
              <span>Reiniciar práctica</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
          >
            <Plus size={14} />
            <span>Nueva pregunta</span>
          </button>
        </div>
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/40 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700">Año</label>
              <select
                value={anio}
                onChange={(e) => {
                  const nextAnio = Number(e.target.value);
                  setAnio(nextAnio);
                  const first = materias.find((m) => m.anio === nextAnio)?.nombre;
                  if (first) setMateria(first);
                }}
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
              >
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y}° Año
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-9">
              <label className="block text-xs font-medium text-slate-700">Asignatura</label>
              <select
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
              >
                {materiasOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Enunciado</label>
            <textarea
              rows={2}
              required
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              placeholder="Escribí la consigna de examen..."
              className="mt-1 w-full rounded-lg border border-rose-200 bg-white p-2.5 text-xs text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-700">
              Opciones (marcá la respuesta correcta)
            </span>
            {opciones.map((op, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrecta(i)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                    correcta === i
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                  title="Marcar como respuesta correcta"
                >
                  {correcta === i ? <Check size={13} /> : String.fromCharCode(65 + i)}
                </button>
                <input
                  type="text"
                  required={i < 2}
                  value={op}
                  onChange={(e) =>
                    setOpciones((prev) =>
                      prev.map((item, idx) => (idx === i ? e.target.value : item))
                    )
                  }
                  placeholder={`Opción ${String.fromCharCode(65 + i)}${i >= 2 ? ' (opcional)' : ''}`}
                  className="h-9 flex-1 rounded-lg border border-rose-200 bg-white px-3 text-xs text-slate-900"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Justificación / Explicación (opcional)
            </label>
            <input
              type="text"
              value={explicacion}
              onChange={(e) => setExplicacion(e.target.value)}
              placeholder="Ej. Porque corresponde al agujero oval..."
              className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 text-xs text-slate-900"
            />
          </div>

          <TagEditor etiquetas={etiquetas} onChange={setEtiquetas} />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="min-h-[34px] rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-950"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[34px] rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
            >
              Guardar pregunta
            </button>
          </div>
        </form>
      )}

      {preguntas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Todavía no hay preguntas en el banco con estos filtros.
        </div>
      ) : (
        <div className="space-y-4">
          {preguntas.map((p, idx) => {
            const chosen = answers[p.id];
            const answered = chosen !== undefined;
            return (
              <div
                key={p.id}
                className="space-y-3 rounded-xl border border-rose-200/80 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Pregunta {idx + 1} · {p.anio}° Año · {p.materia}
                      {p.etiquetas.length > 0 ? ` · ${p.etiquetas.join(' · ')}` : ''}
                      {preguntaSignals[p.id] && !preguntaSignals[p.id].lastCorrect
                        ? ' · En Modo Repaso'
                        : ''}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{p.enunciado}</h3>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleFavorito(p.id)}
                      aria-label="Marcar pregunta favorita"
                      className={`p-1 ${
                        p.favorito ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                      }`}
                    >
                      <Star size={15} fill={p.favorito ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePregunta(p.id)}
                      aria-label="Eliminar pregunta"
                      className="p-1 text-slate-400 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {p.opciones.map((op, opIdx) => {
                    const isSelected = chosen === opIdx;
                    const isRight = p.respuestaCorrecta === opIdx;
                    let cls =
                      'border-slate-200 bg-white text-slate-800 hover:border-rose-200 hover:bg-rose-50/40';
                    if (answered) {
                      if (isRight) {
                        cls = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (isSelected) {
                        cls = 'border-rose-600 bg-rose-50 text-rose-900';
                      } else {
                        cls = 'border-slate-100 bg-slate-50/60 text-slate-400';
                      }
                    }

                    return (
                      <button
                        key={opIdx}
                        type="button"
                        onClick={() => {
                          setAnswers((prev) => ({ ...prev, [p.id]: opIdx }));
                          onRecordPreguntaAttempt?.(p.id, opIdx === p.respuestaCorrecta);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${cls}`}
                      >
                        <span className="font-mono font-bold">
                          {String.fromCharCode(65 + opIdx)}.
                        </span>
                        <span className="flex-1">{op}</span>
                      </button>
                    );
                  })}
                </div>

                {answered && p.explicacion && (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">Explicación:</span>{' '}
                    {p.explicacion}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
