import type {
  ApunteNote,
  BibliografiaItem,
  BiblioMateriaNode,
  BiblioRecurso,
  BiblioUnidad,
  MateriaPlan,
  RecentConsultedItem,
  RecursoTipo,
} from '../types/dental';

export const BIBLIO_TREE_KEY = 'dental_archive_biblio_tree_v2';
export const BIBLIO_RESOURCES_KEY = 'dental_archive_biblio_resources_v2';
export const BIBLIO_RECENT_KEY = 'dental_archive_biblio_recent_v2';
export const BIBLIO_REFERENCES_KEY = 'dental_archive_biblio_references_v2';

interface UnitSeedSpec {
  titulo: string;
  descripcion?: string;
  temas: string[];
}

const CURRICULUM_UNITS_BY_KEY: Record<string, UnitSeedSpec[]> = {
  introduccion: [
    {
      titulo: 'Unidad 1 · Fundamentos de la Odontología',
      descripcion: 'Historia, rol profesional y bioseguridad inicial.',
      temas: [
        'Evolución de la odontología y salud bucal',
        'Normas de bioseguridad y esterilización',
      ],
    },
    {
      titulo: 'Unidad 2 · Ergonomía e Instrumental Básico',
      temas: [
        'Posiciones de trabajo y ergonomía clínica',
        'Reconocimiento de instrumental de exploración',
      ],
    },
  ],
  anatomia: [
    {
      titulo: 'Unidad 1 · Osteología y Artrología Craneofacial',
      descripcion: 'Huesos del cráneo, cara y ATM.',
      temas: [
        'Maxilar superior, mandíbula y reparos óseos',
        'Articulación temporomandibular (ATM) y biomecánica',
      ],
    },
    {
      titulo: 'Unidad 2 · Miología, Vascularización e Inervación',
      temas: [
        'Músculos masticadores y de la mímica',
        'Nervio trigémino (V par) y facial (VII par)',
        'Sistema arterial carotídeo externo y drenaje venoso',
      ],
    },
    {
      titulo: 'Unidad 3 · Anatomía Dentaria y Oclusión',
      temas: [
        'Morfología coronaria y radicular permanente',
        'Relaciones oclusales y arcos dentarios',
      ],
    },
  ],
  histologia: [
    {
      titulo: 'Unidad 1 · Embriología Craneofacial y Odontogénesis',
      temas: [
        'Desarrollo de los arcos faríngeos y palatogénesis',
        'Estadios de lámina, brote, casquete y campana',
      ],
    },
    {
      titulo: 'Unidad 2 · Tejidos Dentarios y Periodontales',
      temas: [
        'Complejo dentino-pulpar y esmalte dental',
        'Cemento, ligamento periodontal y hueso alveolar',
      ],
    },
  ],
  fisiologia: [
    {
      titulo: 'Unidad 1 · Neurofisiología del Sistema Estomatognático',
      temas: [
        'Receptores periodontales, pulpares y reflejos masticatorios',
        'Fisiología de la secreción salival y deglución',
      ],
    },
    {
      titulo: 'Unidad 2 · Homeostasis Mineral y Dolor Orofacial',
      temas: [
        'Metabolismo fosfocálcico y remodelado óseo',
        'Vías nociceptivas trigeminales',
      ],
    },
  ],
  microbiologia: [
    {
      titulo: 'Unidad 1 · Ecología Oral y Biofilm',
      temas: [
        'Placa bacteriana supragingival y subgingival',
        'Microbiota cariogénica (S. mutans y Lactobacillus)',
      ],
    },
    {
      titulo: 'Unidad 2 · Inmunopatología e Infecciones Odontogénicas',
      temas: [
        'Complejos periodontopatógenos',
        'Control de infecciones y esterilización clínica',
      ],
    },
  ],
  biomateriales: [
    {
      titulo: 'Unidad 1 · Propiedades Físico-Mecánicas y Adhesión',
      temas: [
        'Sistemas adhesivos a esmalte y dentina',
        'Resinas compuestas e ionómeros vítreos',
      ],
    },
    {
      titulo: 'Unidad 2 · Materiales de Impresión y Rehabilitación',
      temas: [
        'Alginatos, siliconas y yesos odontológicos',
        'Cerámicas dentales y aleaciones metálicas',
      ],
    },
  ],
  operatoria: [
    {
      titulo: 'Unidad 1 · Cariología y Diagnóstico de Lesiones',
      temas: [
        'Clasificación de Black y Mount-Hume',
        'Aislamiento absoluto del campo operatorio',
      ],
    },
    {
      titulo: 'Unidad 2 · Restauraciones Directas Estéticas',
      temas: [
        'Protocolo adhesivo y estratificación de resinas',
        'Protección dentinopulpar y pulido',
      ],
    },
  ],
  endodoncia: [
    {
      titulo: 'Unidad 1 · Diagnóstico Pulpar y Periapical',
      temas: [
        'Pruebas de sensibilidad y diagnóstico diferencial',
        'Anatomía de conductos y aperturas camerales',
      ],
    },
    {
      titulo: 'Unidad 2 · Preparación Biomecánica y Obturación',
      temas: [
        'Longitud de trabajo e irrigación con hipoclorito',
        'Técnicas de condensación y selladores',
      ],
    },
  ],
  periodoncia: [
    {
      titulo: 'Unidad 1 · Clasificación e Índices Periodontales',
      temas: [
        'Sondaje, nivel de inserción e índice de O’Leary',
        'Gingivitis vs. Periodontitis (clasificación 2018)',
      ],
    },
    {
      titulo: 'Unidad 2 · Terapia Básica y Mantenimiento',
      temas: [
        'Raspaje y alisado radicular (curetaje)',
        'Control de placa e higiene interproximal',
      ],
    },
  ],
  cirugia: [
    {
      titulo: 'Unidad 1 · Anestesia Local y Exodoncia Simple',
      temas: [
        'Técnicas tronculares e infiltrativas en maxilares',
        'Instrumental de diéresis, exéresis y síntesis',
      ],
    },
    {
      titulo: 'Unidad 2 · Cirugía Compleja e Infecciones',
      temas: [
        'Retenciones dentarias y terceros molares',
        'Manejo de complicaciones postoperatorias',
      ],
    },
  ],
  imagenes: [
    {
      titulo: 'Unidad 1 · Técnicas Radiográficas Intraorales',
      temas: [
        'Periapicales (bisectriz y paralelismo) y Bite-Wing',
        'Anatomía radiográfica normal',
      ],
    },
    {
      titulo: 'Unidad 2 · Ortopantomografía y Tomografía Cone-Beam',
      temas: [
        'Lectura sistemática de panorámica',
        'Interpretación de lesiones radiolúcidas y radiopacas',
      ],
    },
  ],
  protesis: [
    {
      titulo: 'Unidad 1 · Prótesis Fija y Coronas',
      temas: [
        'Principios de tallado y márgenes gingivales',
        'Provisorios y cementado definitivo',
      ],
    },
    {
      titulo: 'Unidad 2 · Prótesis Removible Parcial y Completa',
      temas: [
        'Clasificación de Kennedy y diseño de conectores',
        'Registros intermaxilares y dimensión vertical',
      ],
    },
  ],
  preventiva: [
    {
      titulo: 'Unidad 1 · Epidemiología e Índices Comunitarios',
      temas: [
        'Índices CPOD, ceod e higiene oral simplificado',
        'Promoción de la salud bucal en APS',
      ],
    },
    {
      titulo: 'Unidad 2 · Fluoruros, Selladores y Educación',
      temas: [
        'Mecanismos de acción de fluoruros tópicos',
        'Estrategias educativas y entrevistas motivacionales',
      ],
    },
  ],
};

function resolveUnitSpecsForMateria(nombre: string): UnitSeedSpec[] {
  const n = nombre.toLowerCase();
  if (n.includes('introducci')) return CURRICULUM_UNITS_BY_KEY.introduccion;
  if (n.includes('anatom')) return CURRICULUM_UNITS_BY_KEY.anatomia;
  if (n.includes('histolog')) return CURRICULUM_UNITS_BY_KEY.histologia;
  if (n.includes('fisiolog')) return CURRICULUM_UNITS_BY_KEY.fisiologia;
  if (n.includes('microbiolog')) return CURRICULUM_UNITS_BY_KEY.microbiologia;
  if (n.includes('biomaterial')) return CURRICULUM_UNITS_BY_KEY.biomateriales;
  if (n.includes('operatoria')) return CURRICULUM_UNITS_BY_KEY.operatoria;
  if (n.includes('endodoncia')) return CURRICULUM_UNITS_BY_KEY.endodoncia;
  if (n.includes('periodoncia')) return CURRICULUM_UNITS_BY_KEY.periodoncia;
  if (n.includes('cirug')) return CURRICULUM_UNITS_BY_KEY.cirugia;
  if (n.includes('imágenes') || n.includes('imagenes')) {
    return CURRICULUM_UNITS_BY_KEY.imagenes;
  }
  if (n.includes('prótesis') || n.includes('protesis')) {
    return CURRICULUM_UNITS_BY_KEY.protesis;
  }
  if (n.includes('preventiva') || n.includes('ninos') || n.includes('niños')) {
    return CURRICULUM_UNITS_BY_KEY.preventiva;
  }
  return [
    {
      titulo: 'Unidad 1 · Fundamentos Teóricos de la Cátedra',
      descripcion: 'Programa principal y contenidos base.',
      temas: ['Conceptos esenciales y marco teórico', 'Guía de trabajos prácticos'],
    },
    {
      titulo: 'Unidad 2 · Aplicación Clínica e Integración',
      temas: ['Protocolos y criterios diagnósticos', 'Síntesis para parciales y final'],
    },
  ];
}

function buildMateriaNode(
  mat: MateriaPlan,
  orden: number
): BiblioMateriaNode {
  const specs = resolveUnitSpecsForMateria(mat.nombre);
  const accCycle: Array<'bordo' | 'salvia' | 'rosa'> = ['bordo', 'salvia', 'rosa'];
  return {
    id: `bm-${mat.id}`,
    codigo: mat.codigo,
    nombre: mat.nombre,
    anio: mat.anio,
    orden,
    descripcion: mat.cuatrimestre
      ? `${mat.anio}° Año · ${mat.cuatrimestre}`
      : `${mat.anio}° Año`,
    acento: accCycle[orden % accCycle.length],
    unidades: specs.map((spec, uIdx) => ({
      id: `bu-${mat.id}-${uIdx + 1}`,
      titulo: spec.titulo,
      orden: uIdx + 1,
      descripcion: spec.descripcion,
      temas: spec.temas.map((temaTitulo, tIdx) => ({
        id: `bt-${mat.id}-${uIdx + 1}-${tIdx + 1}`,
        titulo: temaTitulo,
        orden: tIdx + 1,
      })),
    })),
  };
}

export function buildInitialBiblioTree(
  materias: MateriaPlan[]
): BiblioMateriaNode[] {
  return materias.map((m, idx) => buildMateriaNode(m, idx + 1));
}

export function loadBiblioTree(materias: MateriaPlan[]): BiblioMateriaNode[] {
  try {
    const raw = localStorage.getItem(BIBLIO_TREE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BiblioMateriaNode[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial tree
  }
  return buildInitialBiblioTree(materias);
}

function mapLegacyCategoryToTipo(note: ApunteNote): RecursoTipo {
  if (note.archivoDataUrl?.startsWith('data:image/')) return 'imagen';
  if (note.categoria === 'pdfs' || note.categoria === 'libros') return 'pdf';
  if (note.categoria === 'cuadros') return 'ficha';
  if (note.categoria === 'resumenes') return 'resumen';
  return 'apunte';
}

export function buildStarterResources(
  tree: BiblioMateriaNode[],
  legacyApuntes: ApunteNote[]
): BiblioRecurso[] {
  const today = new Date().toISOString().slice(0, 10);
  const migrated: BiblioRecurso[] = [];

  // Migrar apuntes/resúmenes previos del usuario sin perder ninguno
  legacyApuntes.forEach((note, idx) => {
    const matMatch =
      tree.find(
        (m) => m.nombre.toLowerCase() === (note.materia || '').toLowerCase()
      ) ||
      tree.find((m) =>
        m.nombre.toLowerCase().includes((note.materia || '').toLowerCase())
      ) ||
      tree[0];

    if (!matMatch) return;
    const targetUnit = matMatch.unidades[0];
    const targetTema = targetUnit?.temas[0];
    if (!targetUnit || !targetTema) return;

    migrated.push({
      id: `br-mig-${note.id}`,
      materiaId: matMatch.id,
      unidadId: targetUnit.id,
      temaId: targetTema.id,
      tipo: mapLegacyCategoryToTipo(note),
      titulo: note.titulo || 'Material guardado',
      descripcion: note.autor ? `Autor/Fuente: ${note.autor}` : undefined,
      contenido: note.contenido || '',
      etiquetas: Array.isArray(note.etiquetas) ? note.etiquetas : [],
      favorito: Boolean(note.favorito),
      orden: idx + 1,
      archivoNombre: note.archivoNombre,
      archivoDataUrl: note.archivoDataUrl,
      enlaceUrl: note.enlaceUrl,
      sharedId: note.sharedId,
      legacyApunteId: note.id,
      createdAt: note.updatedAt || today,
      updatedAt: note.updatedAt || today,
    });
  });

  if (migrated.length > 0) {
    return migrated;
  }

  // Sembrar ejemplos útiles y ordenados si la biblioteca está vacía por primera vez
  const starters: BiblioRecurso[] = [];
  const anat1 = tree.find((m) => m.nombre.toLowerCase().includes('anatomía i'));
  if (anat1 && anat1.unidades[1]?.temas[1]) {
    starters.push({
      id: 'br-seed-trigemino',
      materiaId: anat1.id,
      unidadId: anat1.unidades[1].id,
      temaId: anat1.unidades[1].temas[1].id,
      tipo: 'resumen',
      titulo: 'Nervio Trigémino (V par) · Ramas V1, V2 y V3',
      descripcion: 'Trayecto, orificios de salida del cráneo y territorio sensitivo.',
      contenido:
        '# Nervio Trigémino (V Par Craneal)\n\nEl ganglio trigeminal (de Gasser) se aloja en la fosita trigeminal de la cara anterosuperior del peñasco temporal y origina tres divisiones:\n\n- **V1 · Oftálmica**: atraviesa la fisura orbitaria superior (hendidura esfenoidal). Puramente sensitiva.\n- **V2 · Maxilar**: sale del cráneo por el agujero redondo mayor rumbo a la fosa pterigopalatina. Inerva piezas dentarias superiores y mucosa palatina/sinusal.\n- **V3 · Mandibular**: nervio mixto que sale por el agujero oval junto a su raíz motora masticadora. Origina el nervio alveolar inferior, lingual y bucal.',
      etiquetas: ['1er parcial', 'Neuroanatomía'],
      favorito: true,
      orden: 1,
      createdAt: today,
      updatedAt: today,
    });
  }

  const perio1 = tree.find((m) => m.nombre.toLowerCase().includes('periodoncia i'));
  if (perio1 && perio1.unidades[0]?.temas[0]) {
    starters.push({
      id: 'br-seed-oleary',
      materiaId: perio1.id,
      unidadId: perio1.unidades[0].id,
      temaId: perio1.unidades[0].temas[0].id,
      tipo: 'ficha',
      titulo: 'Ficha Clínica · Índice de Placa de O’Leary',
      descripcion: 'Fórmula clínica, criterio de riesgo y registro por 4 caras.',
      contenido:
        '# Protocolo de Registro · Índice de O’Leary\n\n**Fórmula:**\n(Total de caras teñidas / (Piezas presentes × 4)) × 100\n\n**Criterio clínico:**\n- Hasta **20%**: paciente compatible con control adecuado de biofilm.\n- Mayor al **20%**: paciente en riesgo, requiere refuerzo de técnica de cepillado (Bass modificada) e higiene interproximal.',
      etiquetas: ['Clínica', 'Prevención'],
      favorito: false,
      orden: 1,
      createdAt: today,
      updatedAt: today,
    });
  }

  const histo1 = tree.find((m) => m.nombre.toLowerCase().includes('histología'));
  if (histo1 && histo1.unidades[0]?.temas[1]) {
    starters.push({
      id: 'br-seed-odontogenesis',
      materiaId: histo1.id,
      unidadId: histo1.unidades[0].id,
      temaId: histo1.unidades[0].temas[1].id,
      tipo: 'apunte',
      titulo: 'Apunte de Cátedra · Estadios de la Odontogénesis',
      descripcion: 'Lámina dentaria, brote, casquete, campana inicial y avanzada.',
      contenido:
        '# Desarrollo Dentario (Odontogénesis)\n\n1. **Lámina dentaria (6.ª semana VIU)**: engrosamiento del epitelio bucal ectodérmico hacia el ectomesénquima subyacente.\n2. **Estadio de Brote o Yema**: proliferación focal epitelial que originará el órgano del esmalte.\n3. **Estadio de Casquete**: diferenciación del epitelio dental externo, interno y retículo estrellado; condensación de la papila dental.\n4. **Estadio de Campana**: diferenciación de ameloblastos y odontoblastos con inicio de dentinogénesis y amelogénesis.',
      etiquetas: ['Embriología', 'Final'],
      favorito: false,
      orden: 1,
      createdAt: today,
      updatedAt: today,
    });
  }

  return starters;
}

export function loadBiblioResources(
  tree: BiblioMateriaNode[],
  legacyApuntes: ApunteNote[]
): BiblioRecurso[] {
  try {
    const raw = localStorage.getItem(BIBLIO_RESOURCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BiblioRecurso[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return buildStarterResources(tree, legacyApuntes);
}

export function loadRecentConsulted(): RecentConsultedItem[] {
  try {
    const raw = localStorage.getItem(BIBLIO_RECENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RecentConsultedItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

export const INITIAL_BIBLIOGRAFIA_ACADEMICA: BibliografiaItem[] = [
  {
    id: 'ref-figun',
    tipo: 'libro',
    titulo: 'Anatomía Odontológica Funcional y Aplicada',
    autores: 'Mario E. Figún & Ricardo R. Garino',
    editorialOJournal: 'Editorial El Ateneo (2ª Edición)',
    anioPublicacion: '2002',
    isbnDoi: 'ISBN 978-950-02-0123-0',
    materia: 'Anatomía I · Anatomía II',
    notas: 'Tratado de referencia clásica para anatomía craneofacial, trigémino, ATM y topografía bucal.',
  },
  {
    id: 'ref-ferraris',
    tipo: 'libro',
    titulo: 'Histología, Embriología e Ingeniería Tisular Bucodental',
    autores: 'María Elsa Gómez de Ferraris & Antonio Campos Muñoz',
    editorialOJournal: 'Editorial Médica Panamericana (4ª Edición)',
    anioPublicacion: '2019',
    isbnDoi: 'ISBN 978-607-8546-21-3',
    materia: 'Histología y Embriología I y II',
    notas: 'Texto base de odontogénesis, complejo dentino-pulpar y periodonto de inserción.',
  },
  {
    id: 'ref-barrancos',
    tipo: 'libro',
    titulo: 'Operatoria Dental: Avances Clínicos, Restauraciones y Estética',
    autores: 'Julio Barrancos Mooney & Patricio J. Barrancos',
    editorialOJournal: 'Editorial Médica Panamericana (5ª Edición)',
    anioPublicacion: '2015',
    isbnDoi: 'ISBN 978-950-06-0269-3',
    materia: 'Operatoria Dental I a VI',
    notas: 'Protocolos de aislamiento, adhesión dentinaria y restauraciones estéticas directas.',
  },
  {
    id: 'ref-cohen',
    tipo: 'libro',
    titulo: 'Cohen. Vías de la Pulpa',
    autores: 'Kenneth M. Hargreaves & Louis H. Berman',
    editorialOJournal: 'Elsevier (12ª Edición)',
    anioPublicacion: '2022',
    isbnDoi: 'ISBN 978-84-1382-151-1',
    materia: 'Endodoncia I y II',
    notas: 'Guía integral de diagnóstico pulpar, anatomía radicular y terapéutica endodóntica.',
  },
  {
    id: 'ref-carranza',
    tipo: 'libro',
    titulo: 'Periodontología Clínica de Carranza',
    autores: 'Michael G. Newman, Henry H. Takei, Perry R. Klokkevold',
    editorialOJournal: 'Elsevier / Amolca (13ª Edición)',
    anioPublicacion: '2019',
    isbnDoi: 'ISBN 978-0323523004',
    materia: 'Periodoncia I y II',
    notas: 'Referencia clínica para clasificación periodontal, etiología del biofilm y terapia básica.',
  },
  {
    id: 'ref-tonetti-2018',
    tipo: 'articulo',
    titulo: 'Staging and grading of periodontitis: Framework and proposal of a new classification',
    autores: 'Maurizio S. Tonetti, Henry Greenwell, Kenneth S. Kornman',
    editorialOJournal: 'Journal of Periodontology / Journal of Clinical Periodontology',
    anioPublicacion: '2018',
    isbnDoi: 'DOI 10.1002/JPER.18-0006',
    materia: 'Periodoncia I y II',
    enlaceUrl: 'https://doi.org/10.1002/JPER.18-0006',
    notas: 'Consenso internacional AAP/EFP sobre estadificación y gradación de la periodontitis.',
  },
];

export function loadBibliografiaAcademica(): BibliografiaItem[] {
  try {
    const raw = localStorage.getItem(BIBLIO_REFERENCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BibliografiaItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore
  }
  return INITIAL_BIBLIOGRAFIA_ACADEMICA;
}
