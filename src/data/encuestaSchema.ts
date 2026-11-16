import type {
  ApunteNote,
  EncuestaSocial,
  PacienteRecord,
  PlanTratamientoRow,
} from '../types/dental';

export interface EncuestaQuestionDef {
  id: keyof Pick<
    EncuestaSocial,
    | 'genero'
    | 'edad'
    | 'paisOrigen'
    | 'nivelEstudios'
    | 'situacionLaboral'
    | 'personasHogar'
    | 'serviciosHogar'
    | 'tieneObraSocial'
    | 'atencionUltimos6Meses'
    | 'motivoAtencion'
    | 'dondeTratamiento'
    | 'frecuenciaConsulta'
    | 'cepilladoVecesDia'
    | 'accesoriosHigiene'
    | 'infoPrevencion'
    | 'conoceAtencionFacultad'
  >;
  numero: number;
  titulo: string;
  multiple?: boolean;
  opciones: string[];
}

export const ENCUESTA_QUESTIONS: EncuestaQuestionDef[] = [
  {
    id: 'genero',
    numero: 1,
    titulo: 'Género',
    opciones: ['Femenino', 'Masculino', 'No especifica'],
  },
  {
    id: 'edad',
    numero: 2,
    titulo: 'Edad',
    opciones: [
      '0 a 15 años',
      '16 a 30 años',
      '31 a 45 años',
      '46 a 60 años',
      '61 a 75 años',
      '+ 76 años',
    ],
  },
  {
    id: 'paisOrigen',
    numero: 3,
    titulo: 'País de origen',
    opciones: ['Argentina', 'Otro', 'Ns/Nc'],
  },
  {
    id: 'nivelEstudios',
    numero: 4,
    titulo: 'Nivel de estudios',
    opciones: [
      'Primarios Completos (PC)',
      'Secundarios Completos (SC)',
      'Terciarios Completos (TC)',
      'Universitarios Completos (UC)',
      'Primarios Incompletos (PI)',
      'Secundarios Incompletos (SI)',
      'Terciarios Incompletos (TI)',
      'Universitarios Incompletos (UI)',
    ],
  },
  {
    id: 'situacionLaboral',
    numero: 5,
    titulo: 'Situación laboral',
    opciones: [
      'Ocupado',
      'Sub-ocupado',
      'Jubilado o pensionado',
      'Ama de casa',
      'Estudiante',
      'Ns/Nc',
    ],
  },
  {
    id: 'personasHogar',
    numero: 6,
    titulo: '¿Cuántas personas habitan en su hogar?',
    opciones: ['1', '2', '3', '4 o más', 'Ns/Nc'],
  },
  {
    id: 'serviciosHogar',
    numero: 7,
    titulo: '¿Qué servicios posee en su hogar?',
    multiple: true,
    opciones: [
      'Agua corriente',
      'Agua de pozo',
      'Gas de red',
      'Gas envasado',
      'Cloacas',
      'Pozo ciego',
      'Letrina',
      'Luz',
      'Internet',
      'Recolección de residuos',
      'Barrido y limpieza',
      'Alumbrado público',
    ],
  },
  {
    id: 'tieneObraSocial',
    numero: 8,
    titulo: '¿Tiene Obra Social?',
    opciones: ['Sí', 'No', 'Ns/Nc'],
  },
  {
    id: 'atencionUltimos6Meses',
    numero: 9,
    titulo: '¿En los últimos 6 meses recibió atención odontológica?',
    opciones: ['Sí', 'No', 'Ns/Nc'],
  },
  {
    id: 'motivoAtencion',
    numero: 10,
    titulo: 'Motivo de la misma',
    opciones: ['Prevención', 'Control', 'Urgencia', 'Otros motivos'],
  },
  {
    id: 'dondeTratamiento',
    numero: 11,
    titulo: '¿Dónde realizó el tratamiento odontológico?',
    opciones: [
      'Hospital',
      'Facultad',
      'Consultorio privado',
      'Unidad sanitaria',
      'Otros',
      'Ns/Nc',
    ],
  },
  {
    id: 'frecuenciaConsulta',
    numero: 12,
    titulo: '¿Con qué frecuencia concurre a la consulta odontológica?',
    opciones: ['1 a 3 meses', '6 meses', '1 año o más', 'Ns/Nc'],
  },
  {
    id: 'cepilladoVecesDia',
    numero: 13,
    titulo: '¿Cuántas veces al día cepilla sus dientes?',
    opciones: ['Nunca', '1 vez', '2 veces', '3 o más veces', 'Ns/Nc'],
  },
  {
    id: 'accesoriosHigiene',
    numero: 14,
    titulo: '¿Utiliza algún accesorio para la higiene bucal?',
    multiple: true,
    opciones: ['Hilo dental', 'Enjuague bucal', 'Cepillos interdentales', 'Ns/Nc'],
  },
  {
    id: 'infoPrevencion',
    numero: 15,
    titulo: '¿Recibió alguna vez información sobre prevención en salud bucal?',
    opciones: ['Sí', 'No', 'Ns/Nc'],
  },
  {
    id: 'conoceAtencionFacultad',
    numero: 16,
    titulo: '¿Conoce la atención odontológica que brinda la Facultad de Odontología en la zona?',
    opciones: ['Sí', 'No', 'Ns/Nc'],
  },
];

export const PLAN_TRATAMIENTO_CATEGORIAS: string[] = [
  'Urgencias',
  'Estructuración de la Situación Odontológica',
  'Control del Medio',
  'Categorización del Paciente · Índices',
  'Técnica de cepillado',
  'Fluoruros',
  'Selladores F y F',
  'Plan Preventivo Básico (P.P.B.)',
  'Inactivación · Abiertas: Spc - Cff',
  'Terapia Básica Periodontal',
  'Operatorias',
  'Endodoncias',
  'Cirugías',
  'Ortodoncia Interceptiva',
  'Mantenedores de Espacio',
  'Prótesis',
  'Revalorización de Índices',
  'Alta Integral',
  'Recitación',
];

export function createEmptyPlanRows(): PlanTratamientoRow[] {
  return PLAN_TRATAMIENTO_CATEGORIAS.map((categoria, idx) => ({
    id: `plan-${idx + 1}`,
    categoria,
    detalle: '',
    estado: 'Pendiente',
  }));
}

export function createBlankEncuesta(): EncuestaSocial {
  return {
    id: `enc-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString().slice(0, 10),
    comision: '',
    anio: String(new Date().getFullYear()),
    centroAps: '',
    numeroEncuesta: '',
    genero: '',
    edad: '',
    paisOrigen: '',
    paisOtro: '',
    nivelEstudios: '',
    situacionLaboral: '',
    personasHogar: '',
    serviciosHogar: [],
    tieneObraSocial: '',
    atencionUltimos6Meses: '',
    motivoAtencion: '',
    dondeTratamiento: '',
    frecuenciaConsulta: '',
    cepilladoVecesDia: '',
    accesoriosHigiene: [],
    infoPrevencion: '',
    conoceAtencionFacultad: '',
  };
}

export function createBlankPaciente(): PacienteRecord {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `pac-${Date.now().toString(36)}`,
    updatedAt: today,
    anonimizado: true,
    codigoCaso: `Caso Práctico #${today.slice(5)}`,
    etapaActual: 'Diagnóstico',
    proximaAccion: '',
    historiaClinicaNro: '',
    asignatura: 'Odontología Preventiva y Social',
    curso: '',
    comision: '',
    anio: String(new Date().getFullYear()),
    docente: '',
    apellido: '',
    nombre: '',
    edad: '',
    dni: '',
    domicilio: '',
    localidad: 'La Plata',
    partidoBarrio: '',
    codigoPostal: '',
    fechaNacimiento: '',
    genero: '',
    paisOrigen: 'Argentina',
    telefono: '',
    email: '',
    obraSocial: '',
    obraSocialCual: '',
    nroAfiliado: '',
    ultimaVisitaOdontologica: '',
    enTratamientoMedico: '',
    tratamientoMedicoCausa: '',
    tomaMedicamentos: '',
    medicamentosCuales: '',
    tuvoHemorragias: '',
    operadoUltimos10Anios: '',
    operadoCausa: '',
    transfusiones: '',
    alergias: '',
    alergiasCuales: '',
    antecedentes: {
      trastornosPsiquiatricos: '',
      diabetes: '',
      dolenciaCardiaca: '',
      hemofilia: '',
      problemasNeurologicos: '',
      problemasRenales: '',
      dialisis: '',
      hepatitis: '',
      tuberculosis: '',
      neumonia: '',
      sifilis: '',
      hipertension: '',
      hiv: '',
    },
    embarazada: '',
    infeccionesRepeticion: '',
    presionMaxima: '',
    presionMinima: '',
    pulso: '',
    frecuenciaRespiratoria: '',
    motivoConsulta: '',
    odontograma: {},
    olearyInicial: {
      fecha: today,
      piezasPresentes: 28,
      stainedSurfaces: {},
      pacienteRiesgo: '',
    },
    olearyFinal: {
      fecha: '',
      piezasPresentes: 28,
      stainedSurfaces: {},
      pacienteRiesgo: '',
    },
    ihsP: '',
    ihsN: '',
    observaciones: '',
    fechaDeclaracion: today,
    firmaPaciente: '',
    firmaEstudiante: '',
    firmaDocente: '',
    radiografias: {
      preoperatoria: '',
      intermedia1: '',
      intermedia2: '',
      intermedia3: '',
      posoperatoria: '',
    },
    evolucion: [
      {
        id: 'ev-1',
        fecha: today,
        codigo: '',
        piezaSector: '',
        cara: '',
        tratamiento: '',
        alumno: '',
        docenteFirma: '',
        nota: '',
        pacienteFirma: '',
      },
    ],
    consentimiento: {
      implica: '',
      tendreQue: '',
      tutorNombre: '',
      tutorDni: '',
      tutorTelefono: '',
      tutorDomicilio: '',
    },
    planTratamiento: createEmptyPlanRows(),
  };
}

export const SAMPLE_ENCUESTAS: EncuestaSocial[] = [
  {
    id: 'sample-enc-1',
    createdAt: '2026-10-12',
    comision: 'Comisión 3',
    anio: '2026',
    centroAps: '14',
    numeroEncuesta: '001',
    genero: 'Femenino',
    edad: '31 a 45 años',
    paisOrigen: 'Argentina',
    paisOtro: '',
    nivelEstudios: 'Secundarios Completos (SC)',
    situacionLaboral: 'Ocupado',
    personasHogar: '4 o más',
    serviciosHogar: ['Agua corriente', 'Gas de red', 'Luz', 'Internet', 'Recolección de residuos'],
    tieneObraSocial: 'No',
    atencionUltimos6Meses: 'Sí',
    motivoAtencion: 'Urgencia',
    dondeTratamiento: 'Unidad sanitaria',
    frecuenciaConsulta: '1 año o más',
    cepilladoVecesDia: '2 veces',
    accesoriosHigiene: ['Hilo dental'],
    infoPrevencion: 'Sí',
    conoceAtencionFacultad: 'Sí',
  },
  {
    id: 'sample-enc-2',
    createdAt: '2026-10-12',
    comision: 'Comisión 3',
    anio: '2026',
    centroAps: '14',
    numeroEncuesta: '002',
    genero: 'Masculino',
    edad: '16 a 30 años',
    paisOrigen: 'Argentina',
    paisOtro: '',
    nivelEstudios: 'Secundarios Incompletos (SI)',
    situacionLaboral: 'Estudiante',
    personasHogar: '3',
    serviciosHogar: ['Agua corriente', 'Gas envasado', 'Luz', 'Internet'],
    tieneObraSocial: 'No',
    atencionUltimos6Meses: 'No',
    motivoAtencion: 'Control',
    dondeTratamiento: 'Hospital',
    frecuenciaConsulta: '1 año o más',
    cepilladoVecesDia: '1 vez',
    accesoriosHigiene: ['Ns/Nc'],
    infoPrevencion: 'No',
    conoceAtencionFacultad: 'No',
  },
  {
    id: 'sample-enc-3',
    createdAt: '2026-10-14',
    comision: 'Comisión 3',
    anio: '2026',
    centroAps: '14',
    numeroEncuesta: '003',
    genero: 'Femenino',
    edad: '46 a 60 años',
    paisOrigen: 'Argentina',
    paisOtro: '',
    nivelEstudios: 'Terciarios Completos (TC)',
    situacionLaboral: 'Ocupado',
    personasHogar: '2',
    serviciosHogar: ['Agua corriente', 'Gas de red', 'Cloacas', 'Luz', 'Internet', 'Alumbrado público'],
    tieneObraSocial: 'Sí',
    atencionUltimos6Meses: 'Sí',
    motivoAtencion: 'Prevención',
    dondeTratamiento: 'Facultad',
    frecuenciaConsulta: '6 meses',
    cepilladoVecesDia: '3 o más veces',
    accesoriosHigiene: ['Hilo dental', 'Enjuague bucal'],
    infoPrevencion: 'Sí',
    conoceAtencionFacultad: 'Sí',
  },
];

export const SAMPLE_PACIENTES: PacienteRecord[] = [
  {
    ...createBlankPaciente(),
    id: 'sample-pac-1',
    historiaClinicaNro: '041825',
    asignatura: 'Odontología Preventiva y Social',
    curso: '3° Año',
    comision: 'Comisión 3',
    anio: '2026',
    docente: 'Prof. Dr. Sergio Lazo',
    apellido: 'Mendoza',
    nombre: 'Lucía Belén',
    edad: '29',
    dni: '39.482.110',
    domicilio: 'Calle 54 N° 718',
    localidad: 'La Plata',
    partidoBarrio: 'Casco Urbano',
    codigoPostal: '1900',
    fechaNacimiento: '1997-04-18',
    genero: 'F',
    paisOrigen: 'Argentina',
    telefono: '221-548-9021',
    email: 'lucia.mendoza@ejemplo.com',
    obraSocial: 'No',
    ultimaVisitaOdontologica: 'Hace 14 meses',
    enTratamientoMedico: 'No',
    tomaMedicamentos: 'No',
    tuvoHemorragias: 'No',
    operadoUltimos10Anios: 'No',
    transfusiones: 'No',
    alergias: 'No',
    antecedentes: {
      trastornosPsiquiatricos: 'No',
      diabetes: 'No',
      dolenciaCardiaca: 'No',
      hemofilia: 'No',
      problemasNeurologicos: 'No',
      problemasRenales: 'No',
      dialisis: 'No',
      hepatitis: 'No',
      tuberculosis: 'No',
      neumonia: 'No',
      sifilis: 'No',
      hipertension: 'No',
      hiv: 'No',
    },
    embarazada: 'No',
    infeccionesRepeticion: 'No',
    presionMaxima: '115',
    presionMinima: '75',
    pulso: '72',
    frecuenciaRespiratoria: '16',
    motivoConsulta: 'Control preventivo y sensibilidad en molar inferior derecho',
    odontograma: {
      '46': { whole: 'caries', surfaces: { O: 'caries' } },
      '36': { whole: 'obturado', surfaces: { O: 'obturado' } },
      '16': { whole: 'obturado', surfaces: { M: 'obturado', O: 'obturado' } },
    },
    olearyInicial: {
      fecha: '2026-10-15',
      piezasPresentes: 28,
      stainedSurfaces: {
        '16-V': true,
        '16-L': true,
        '11-V': true,
        '21-V': true,
        '26-V': true,
        '46-V': true,
        '46-L': true,
        '41-L': true,
        '31-L': true,
        '36-V': true,
      },
      pacienteRiesgo: 'No',
    },
    ihsP: '2',
    ihsN: '0',
    observaciones: 'Paciente colaboradora. Se indica refuerzo de técnica de cepillado de Bass modificado.',
    planTratamiento: PLAN_TRATAMIENTO_CATEGORIAS.map((categoria, idx) => {
      if (idx === 3) {
        return {
          id: `plan-${idx + 1}`,
          categoria,
          detalle: 'CPOD = 3 · O’Leary inicial 8.9% · Riesgo moderado',
          estado: 'Realizado',
        };
      }
      if (idx === 4) {
        return {
          id: `plan-${idx + 1}`,
          categoria,
          detalle: 'Enseñanza técnica de Bass + uso de hilo dental nocturno',
          estado: 'En curso',
        };
      }
      if (idx === 10) {
        return {
          id: `plan-${idx + 1}`,
          categoria,
          detalle: 'Pieza 46 cara Oclusal — resina compuesta',
          estado: 'Pendiente',
        };
      }
      return {
        id: `plan-${idx + 1}`,
        categoria,
        detalle: '',
        estado: 'Pendiente',
      };
    }),
  },
];

export const SAMPLE_APUNTES: ApunteNote[] = [
  {
    id: 'ap-1',
    titulo: 'Protocolo de Índice de O’Leary y Categorización de Riesgo',
    materia: 'Odontología Preventiva y Social',
    contenido:
      'El índice de placa de O’Leary registra presencia de biofilm en 4 caras por pieza presente (Mesial, Distal, Vestibular, Lingual/Palatino). Fórmula: (Total de caras teñidas / (Piezas presentes × 4)) × 100. Valores ≤ 20% indican control compatible con salud; > 20% requiere refuerzo de higiene y recitación.',
    updatedAt: '2026-10-16',
  },
  {
    id: 'ap-2',
    titulo: 'Cálculo de Índices CPOD y ceod',
    materia: 'Odontología Preventiva y Social',
    contenido:
      'CPOD (dentición permanente): C = piezas cariadas, P = perdidas por caries, O = obturadas, D = unidad diente. En dentición temporaria (ceod): c = cariadas, e = con extracción indicada, o = obturadas. Los terceros molares (18, 28, 38, 48) se excluyen del cómputo estándar salvo indicación específica.',
    updatedAt: '2026-10-14',
  },
];
