import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import type { RepasoOrigen, TemaAReforzar } from '../utils/repasoDetector';

interface ModoRepasoPanelProps {
  temas: TemaAReforzar[];
  onResolveTopic: (topicKey: string) => void;
  onResetResolved?: () => void;
  onNavigateTopic: (tema: TemaAReforzar) => void;
  compact?: boolean;
}

const ORIGEN_LABEL: Record<RepasoOrigen, string> = {
  pregunta: 'Banco de preguntas',
  flashcard: 'Flashcard',
  calendario: 'Calendario',
  correlativas: 'Final pendiente',
};

export const ModoRepasoPanel: React.FC<ModoRepasoPanelProps> = ({
  temas,
  onResolveTopic,
  onResetResolved,
  onNavigateTopic,
  compact = false,
}) => {
  const visible = compact ? temas.slice(0, 5) : temas;

  return (
    <section className="rounded-xl border border-rose-200/80 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rose-100 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-900 text-white">
            <Brain size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-rose-950">
              Modo Repaso · Detección de temas a reforzar ({temas.length})
            </h2>
            <p className="text-xs text-slate-500">
              Detectado en tu dispositivo según errores en preguntas, flashcards pendientes y fechas próximas.
            </p>
          </div>
        </div>

        {onResetResolved && (
          <button
            type="button"
            onClick={onResetResolved}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-950 hover:bg-rose-50"
          >
            <RotateCcw size={12} />
            <span>Reanalizar todo</span>
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-6 text-center">
          <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
          <p className="mt-2 text-xs font-semibold text-slate-800">
            No tenés temas urgentes pendientes de reforzar por ahora
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            A medida que practiques con Flashcards, Banco de Preguntas o cargues finales en el Calendario, los temas débiles aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-rose-100">
          {visible.map((tema) => (
            <div
              key={tema.topicKey}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      tema.prioridad === 1
                        ? 'text-rose-800'
                        : tema.prioridad === 2
                          ? 'text-amber-800'
                          : 'text-slate-600'
                    }`}
                  >
                    <AlertCircle size={12} />
                    <span>{ORIGEN_LABEL[tema.origen]}</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-rose-950">{tema.materia}</span>
                </div>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-900">
                  {tema.titulo}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{tema.motivo}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onResolveTopic(tema.topicKey)}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <CheckCircle2 size={12} />
                  <span>Dominado</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTopic(tema)}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-rose-900 px-3 text-[11px] font-semibold text-white hover:bg-rose-950"
                >
                  <span>Repasar</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
