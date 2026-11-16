import type {
  CalendarioEvento,
  FlashcardItem,
  MateriaPlan,
  PreguntaBanco,
  StudySignals,
} from '../types/dental';

export const STUDY_SIGNALS_STORAGE_KEY = 'dental_archive_study_signals_v1';

export const EMPTY_STUDY_SIGNALS: StudySignals = {
  flashcards: {},
  preguntas: {},
  resolvedTopics: {},
};

export function loadStudySignals(): StudySignals {
  try {
    const raw = localStorage.getItem(STUDY_SIGNALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudySignals>;
      return {
        flashcards: parsed.flashcards || {},
        preguntas: parsed.preguntas || {},
        resolvedTopics: parsed.resolvedTopics || {},
      };
    }
  } catch {
    // Fallback cleanly
  }
  return EMPTY_STUDY_SIGNALS;
}

export type RepasoOrigen =
  | 'pregunta'
  | 'flashcard'
  | 'calendario'
  | 'correlativas';

export interface TemaAReforzar {
  topicKey: string;
  titulo: string;
  materia: string;
  origen: RepasoOrigen;
  prioridad: 1 | 2 | 3; // 1 = alta, 2 = media, 3 = sugerida
  motivo: string;
  targetId?: string;
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function detectarTemasPendientes(params: {
  signals: StudySignals;
  flashcards: FlashcardItem[];
  preguntas: PreguntaBanco[];
  eventos: CalendarioEvento[];
  materias: MateriaPlan[];
}): TemaAReforzar[] {
  const { signals, flashcards, preguntas, eventos, materias } = params;
  const result: TemaAReforzar[] = [];

  // 1. Preguntas respondidas incorrectamente
  preguntas.forEach((p) => {
    const sig = signals.preguntas[p.id];
    if (sig && (!sig.lastCorrect || sig.wrongCount > 0) && !signals.resolvedTopics[`preg:${p.id}`]) {
      result.push({
        topicKey: `preg:${p.id}`,
        titulo: p.enunciado,
        materia: p.materia,
        origen: 'pregunta',
        prioridad: !sig.lastCorrect ? 1 : 2,
        motivo: !sig.lastCorrect
          ? `Último intento incorrecto (${sig.wrongCount} error${sig.wrongCount === 1 ? '' : 'es'})`
          : `Con ${sig.wrongCount} error${sig.wrongCount === 1 ? '' : 'es'} previos · conviene reconfirmar`,
        targetId: p.id,
      });
    }
  });

  // 2. Flashcards marcadas como "A reforzar"
  flashcards.forEach((c) => {
    const sig = signals.flashcards[c.id];
    if (sig?.status === 'pendiente' && !signals.resolvedTopics[`fc:${c.id}`]) {
      result.push({
        topicKey: `fc:${c.id}`,
        titulo: c.frente,
        materia: c.materia,
        origen: 'flashcard',
        prioridad: 1,
        motivo: `Marcada para repasar (${sig.views} vista${sig.views === 1 ? '' : 's'})`,
        targetId: c.id,
      });
    }
  });

  // 3. Exámenes o Finales próximos (próximos 14 días)
  eventos.forEach((ev) => {
    if (ev.tipo !== 'Examen' && ev.tipo !== 'Final') return;
    const diff = daysUntil(ev.fecha);
    if (diff < 0 || diff > 14) return;
    const topicKey = `ev:${ev.id}`;
    if (signals.resolvedTopics[topicKey]) return;

    result.push({
      topicKey,
      titulo: ev.titulo,
      materia: ev.materia || 'Agenda académica',
      origen: 'calendario',
      prioridad: diff <= 5 ? 1 : 2,
      motivo:
        diff === 0
          ? `${ev.tipo} hoy (${ev.fecha})`
          : `${ev.tipo} en ${diff} día${diff === 1 ? '' : 's'} (${ev.fecha})`,
      targetId: ev.id,
    });
  });

  // 5. Materias en estado Regular (pendientes de rendir Final)
  materias
    .filter((m) => m.estado === 'Regular')
    .slice(0, 6)
    .forEach((m) => {
      const topicKey = `mat:${m.id}`;
      if (signals.resolvedTopics[topicKey]) return;
      result.push({
        topicKey,
        titulo: `Preparar final · ${m.nombre}`,
        materia: `${m.anio}° Año`,
        origen: 'correlativas',
        prioridad: 3,
        motivo: 'Materia en condición Regular (final pendiente)',
        targetId: m.id,
      });
    });

  result.sort((a, b) => a.prioridad - b.prioridad);
  return result;
}
