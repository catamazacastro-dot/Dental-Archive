export type YesNoNs = 'Sí' | 'No' | 'Ns/Nc' | '';
export type YesNo = 'Si' | 'No' | '';

export interface EncuestaSocial {
  id: string;
  createdAt: string;
  comision: string;
  anio: string;
  centroAps: string;
  numeroEncuesta: string;
  genero: string;
  edad: string;
  paisOrigen: string;
  paisOtro: string;
  nivelEstudios: string;
  situacionLaboral: string;
  personasHogar: string;
  serviciosHogar: string[];
  tieneObraSocial: string;
  atencionUltimos6Meses: string;
  motivoAtencion: string;
  dondeTratamiento: string;
  frecuenciaConsulta: string;
  cepilladoVecesDia: string;
  accesoriosHigiene: string[];
  infoPrevencion: string;
  conoceAtencionFacultad: string;
}

export type ToothCondition =
  | 'sano'
  | 'caries'
  | 'obturado'
  | 'ausente'
  | 'endodoncia'
  | 'corona'
  | 'extraccion';

export type ToothSurface = 'V' | 'L' | 'M' | 'D' | 'O';

export interface ToothRecord {
  whole: ToothCondition;
  surfaces: Partial<Record<ToothSurface, 'caries' | 'obturado'>>;
}

export interface OLearySample {
  fecha: string;
  piezasPresentes: number;
  stainedSurfaces: Record<string, boolean>; // key: `${toothId}-${surface}`
  pacienteRiesgo: YesNo;
}

export interface EvolucionRow {
  id: string;
  fecha: string;
  codigo: string;
  piezaSector: string;
  cara: string;
  tratamiento: string;
  alumno: string;
  docenteFirma: string;
  nota: string;
  pacienteFirma: string;
}

export interface RadiografiasState {
  preoperatoria: string;
  intermedia1: string;
  intermedia2: string;
  intermedia3: string;
  posoperatoria: string;
}

export type PlanRowEstado = 'Pendiente' | 'En curso' | 'Realizado';

export interface PlanTratamientoRow {
  id: string;
  categoria: string;
  detalle: string;
  estado: PlanRowEstado;
}

export type CasoClinicoEtapa =
  | 'Diagnóstico'
  | 'O’Leary / Higiene'
  | 'Operatoria / Rehab.'
  | 'Control / Alta';

export interface PacienteRecord {
  id: string;
  updatedAt: string;
  // Seguimiento anónimo para casos de práctica
  anonimizado?: boolean;
  codigoCaso?: string;
  etapaActual?: CasoClinicoEtapa;
  proximaAccion?: string;
  // Encabezado Historia Clínica
  historiaClinicaNro: string;
  asignatura: string;
  curso: string;
  comision: string;
  anio: string;
  docente: string;
  // Datos del Paciente
  apellido: string;
  nombre: string;
  edad: string;
  dni: string;
  domicilio: string;
  localidad: string;
  partidoBarrio: string;
  codigoPostal: string;
  fechaNacimiento: string;
  genero: 'M' | 'F' | 'No Esp.' | '';
  paisOrigen: string;
  telefono: string;
  email: string;
  obraSocial: YesNo;
  obraSocialCual: string;
  nroAfiliado: string;
  // Cuestionario Pre-Clínico
  ultimaVisitaOdontologica: string;
  enTratamientoMedico: YesNo;
  tratamientoMedicoCausa: string;
  tomaMedicamentos: YesNo;
  medicamentosCuales: string;
  tuvoHemorragias: YesNo;
  operadoUltimos10Anios: YesNo;
  operadoCausa: string;
  transfusiones: YesNo;
  alergias: YesNo;
  alergiasCuales: string;
  antecedentes: {
    trastornosPsiquiatricos: YesNo;
    diabetes: YesNo;
    dolenciaCardiaca: YesNo;
    hemofilia: YesNo;
    problemasNeurologicos: YesNo;
    problemasRenales: YesNo;
    dialisis: YesNo;
    hepatitis: YesNo;
    tuberculosis: YesNo;
    neumonia: YesNo;
    sifilis: YesNo;
    hipertension: YesNo;
    hiv: YesNo;
  };
  embarazada: YesNo;
  infeccionesRepeticion: YesNo;
  presionMaxima: string;
  presionMinima: string;
  pulso: string;
  frecuenciaRespiratoria: string;
  motivoConsulta: string;
  // Examen Clínico
  odontograma: Record<string, ToothRecord>;
  olearyInicial: OLearySample;
  olearyFinal: OLearySample;
  ihsP: string;
  ihsN: string;
  observaciones: string;
  fechaDeclaracion: string;
  firmaPaciente: string;
  firmaEstudiante: string;
  firmaDocente: string;
  // Página 2: Radiografías, Evolución y Consentimiento
  radiografias: RadiografiasState;
  evolucion: EvolucionRow[];
  consentimiento: {
    implica: string;
    tendreQue: string;
    tutorNombre: string;
    tutorDni: string;
    tutorTelefono: string;
    tutorDomicilio: string;
  };
  // Plan de Tratamiento OPS (unido al mismo paciente)
  planTratamiento: PlanTratamientoRow[];
}

export type BiblioCategoria =
  | 'apuntes'
  | 'resumenes'
  | 'pdfs'
  | 'libros'
  | 'cuadros';

export type RecursoTipo = 'pdf' | 'apunte' | 'resumen' | 'ficha' | 'imagen';

export interface BiblioTema {
  id: string;
  titulo: string;
  orden: number;
  descripcion?: string;
}

export interface BiblioUnidad {
  id: string;
  titulo: string;
  orden: number;
  descripcion?: string;
  temas: BiblioTema[];
}

export interface BiblioMateriaNode {
  id: string;
  codigo?: string;
  nombre: string;
  anio: 1 | 2 | 3 | 4 | 5;
  orden: number;
  descripcion?: string;
  acento: 'bordo' | 'salvia' | 'rosa';
  unidades: BiblioUnidad[];
}

export interface BiblioRecurso {
  id: string;
  materiaId: string;
  unidadId: string;
  temaId: string;
  tipo: RecursoTipo;
  titulo: string;
  descripcion?: string;
  contenido?: string;
  etiquetas: string[];
  favorito: boolean;
  orden: number;
  archivoNombre?: string;
  archivoMime?: string;
  archivoSize?: number;
  archivoDataUrl?: string;
  hasLocalBlob?: boolean;
  serverFileUrl?: string;
  storageBackend?: 'server' | 'local';
  sha256?: string;
  relativePath?: string;
  enlaceUrl?: string;
  sharedId?: string;
  legacyApunteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecentConsultedItem {
  resourceId: string;
  viewedAt: string;
}

export interface BibliografiaItem {
  id: string;
  tipo: 'libro' | 'articulo' | 'guia';
  titulo: string;
  autores: string;
  editorialOJournal: string;
  anioPublicacion: string;
  isbnDoi?: string;
  materia?: string;
  enlaceUrl?: string;
  notas?: string;
}

export interface ApunteNote {
  id: string;
  titulo: string;
  materia: string;
  anio?: number;
  categoria?: BiblioCategoria;
  favorito?: boolean;
  etiquetas?: string[];
  autor?: string;
  isbnDoi?: string;
  enlaceUrl?: string;
  archivoNombre?: string;
  archivoDataUrl?: string;
  sharedId?: string;
  offlineReady?: boolean;
  contenido: string;
  updatedAt: string;
}

export interface FlashcardItem {
  id: string;
  anio: number;
  materia: string;
  frente: string;
  dorso: string;
  etiquetas: string[];
  favorito: boolean;
  sharedId?: string;
  updatedAt: string;
}

export interface PreguntaBanco {
  id: string;
  anio: number;
  materia: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion?: string;
  etiquetas: string[];
  favorito: boolean;
  sharedId?: string;
  updatedAt: string;
}

export type MateriaEstado = 'Pendiente' | 'Regular' | 'Aprobada';

export interface MateriaPlan {
  id: string;
  codigo?: string;
  anio: 1 | 2 | 3 | 4 | 5;
  nombre: string;
  cuatrimestre?: string;
  correlativasParaCursar: string[]; // IDs of required subjects (at least Regular)
  correlativasParaRendir: string[]; // IDs of required subjects (Aprobada)
  correlativasResumen?: string;
  estado: MateriaEstado;
}

export type EventoTipo = 'Cursada' | 'Examen' | 'Final';

export interface CalendarioEvento {
  id: string;
  titulo: string;
  tipo: EventoTipo;
  fecha: string; // YYYY-MM-DD
  hora?: string;
  materia?: string;
  notas?: string;
}

export interface TareaPendiente {
  id: string;
  texto: string;
  materia?: string;
  fechaLimite?: string;
  completada: boolean;
  createdAt: string;
}

export interface FlashcardSignal {
  status: 'pendiente' | 'dominada';
  views: number;
  lastReviewed: string;
}

export interface PreguntaSignal {
  attempts: number;
  wrongCount: number;
  lastCorrect: boolean;
  lastAttempt: string;
}

export interface StudySignals {
  flashcards: Record<string, FlashcardSignal>;
  preguntas: Record<string, PreguntaSignal>;
  resolvedTopics: Record<string, string>;
}

export interface SharedResourceItem {
  id: string;
  authorUid: string;
  authorAlias: string;
  isPublic: boolean;
  tipoRecurso: 'documento' | 'flashcard' | 'pregunta';
  categoria: BiblioCategoria | 'flashcards' | 'preguntas';
  anio: number;
  materia: string;
  titulo: string;
  contenido: string;
  etiquetas: string[];
  autorFuente: string;
  isbnDoi: string;
  enlaceUrl: string;
  flashcardFrente: string;
  preguntaOpciones: string[];
  preguntaCorrecta: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface SpotifyPlaylistItem {
  id: string;
  titulo: string;
  categoria: string;
  spotifyUrl: string;
  embedPath: string; // e.g. playlist/37i9dQZF1DX8Uebhn9wzrS
  esPredeterminada?: boolean;
}

export type AvisoCategoria = 'aviso' | 'importante' | 'examen' | 'recordatorio';

export interface AvisoGlobal {
  id: string;
  authorUid: string;
  isPublic: boolean;
  activo: boolean;
  titulo: string;
  mensaje: string;
  categoria: AvisoCategoria;
  revision: number;
  createdAtMs: number;
  updatedAtMs: number;
}
