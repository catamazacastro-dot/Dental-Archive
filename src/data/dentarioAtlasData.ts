import framesManifestRaw from './dentalFramesManifest.json';

export type DenticionTipo = 'permanente' | 'temporaria';
export type ArcadaTipo = 'Superior (maxilar)' | 'Inferior (mandibular)';
export type LadoDental = 'Derecho' | 'Izquierdo';

export type GrupoDentalPermanente =
  | 'Incisivos centrales'
  | 'Incisivos laterales'
  | 'Caninos'
  | 'Primeros premolares'
  | 'Segundos premolares'
  | 'Primeros molares'
  | 'Segundos molares'
  | 'Terceros molares';

export type GrupoDentalTemporaria =
  | 'Incisivos centrales'
  | 'Incisivos laterales'
  | 'Caninos'
  | 'Primeros molares'
  | 'Segundos molares';

export type GrupoDental = GrupoDentalPermanente | GrupoDentalTemporaria;

export type DentalVistaId =
  | 'inicial'
  | 'vestibular'
  | 'lingual'
  | 'mesial'
  | 'distal'
  | 'oclusal';

export type EstructuraDentalId =
  | 'corona'
  | 'cuello'
  | 'raices'
  | 'esmalte'
  | 'dentina'
  | 'dentina-coronaria'
  | 'dentina-radicular'
  | 'cemento'
  | 'pulpa'
  | 'camara-pulpar'
  | 'conductos'
  | 'apice'
  | 'pdl';

export interface ToothFrameManifest {
  frame: {
    origin: [number, number, number];
    axis: [number, number, number];
    mesial: [number, number, number];
    buccal: [number, number, number];
  };
  landmarks: Record<string, [number, number, number]>;
  layers: string[];
  meshNames: string[];
}

export const DENTAL_FRAMES_MANIFEST = framesManifestRaw as unknown as Record<
  string,
  ToothFrameManifest
>;

export interface PiezaDentariaInfo {
  fdi: string;
  nombre: string;
  denticion: DenticionTipo;
  grupo: GrupoDental;
  tipoCorto: string; // Para opciones de examen (ej. "Primer molar superior")
  arcada: ArcadaTipo;
  lado: LadoDental;
  cuadranteFdi: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  esAnterior: boolean; // Para etiquetar "Incisal" vs "Oclusal" y "Palatina" vs "Lingual"
  modeloUrl: string | null; // null cuando falta el recurso 3D (dentición temporaria)
  recurso3DEstado: 'disponible' | 'pendiente';
  recursoFaltanteDetalle?: string;
  caracteristicasAnatomicas: string[];
  numeroRaices: {
    habitual: string;
    variantes: string;
  };
  conductosRadiculares: {
    habitual: string;
    disposicion: string;
    variantes: string;
  };
  caras: {
    vestibular: string;
    palatinaOLingual: string;
    mesial: string;
    distal: string;
    oclusalOIncisal: string;
  };
  rasgosDiferenciales: string[];
  bibliografia: string[];
}

export interface EstructuraDentalDetalle {
  id: EstructuraDentalId | string;
  nombre: string;
  subtitulo: string;
  definicion: string;
  caracteristicasClinicas: string[];
  capasRelacionadas: string[]; // prefijos de mallas en el GLB (p. ej. ['enamel'])
  esLandmark?: 'cuello' | 'apice';
}

export const GRUPOS_PERMANENTES: GrupoDentalPermanente[] = [
  'Incisivos centrales',
  'Incisivos laterales',
  'Caninos',
  'Primeros premolares',
  'Segundos premolares',
  'Primeros molares',
  'Segundos molares',
  'Terceros molares',
];

export const GRUPOS_TEMPORARIOS: GrupoDentalTemporaria[] = [
  'Incisivos centrales',
  'Incisivos laterales',
  'Caninos',
  'Primeros molares',
  'Segundos molares',
];

export const ESTRUCTURAS_DENTALES_INFO: Record<string, EstructuraDentalDetalle> = {
  corona: {
    id: 'corona',
    nombre: 'Corona anatómica',
    subtitulo: 'Porción recubierta por esmalte hasta la línea cervical',
    definicion:
      'Segmento coronario del diente delimitado por el esmalte adamantino desde el borde incisal o cara oclusal hasta la unión amelocementaria (cuello anatómico).',
    caracteristicasClinicas: [
      'Se distingue la corona anatómica (revestida de esmalte) de la corona clínica (porción visible por encima del margen gingival).',
      'Comprende esmalte superficial, dentina coronaria subyacente y la cámara pulpar en su interior.',
    ],
    capasRelacionadas: ['enamel', 'dentin-coronal', 'pulp-chamber'],
  },
  cuello: {
    id: 'cuello',
    nombre: 'Cuello dentario (línea cervical / UAC)',
    subtitulo: 'Unión amelocementaria (límite corona–raíz)',
    definicion:
      'Zona de transición anatómica donde termina el esmalte coronario e inicia el cemento radicular, describiendo curvaturas características hacia incisal/oclusal en las caras proximales (mayor en mesial que en distal).',
    caracteristicasClinicas: [
      'El esmalte alcanza aquí su menor espesor; el cemento cubre al esmalte (~60%), se enfrenta borde a borde (~30%) o deja un estrecho sector de dentina expuesta (~10%, zonas de sensibilidad cervical).',
      'Reparo clave en periodoncia para medir la pérdida de inserción clínica (NIC) y en operatoria para el sellado del margen gingival.',
    ],
    capasRelacionadas: [],
    esLandmark: 'cuello',
  },
  raices: {
    id: 'raices',
    nombre: 'Raíz o raíces dentarias',
    subtitulo: 'Porción radicular revestida por cemento',
    definicion:
      'Segmento del diente alojado en el alvéolo óseo desde la unión amelocementaria hasta el ápice radicular, integrado por cemento periférico, dentina radicular y el o los conductos radiculares.',
    caracteristicasClinicas: [
      'Su número y morfología varían estrictamente según la pieza dentaria (unirradiculares, birradiculares o multirradiculares con tronco radicular y furcación).',
      'La inclinación apical suele dirigirse ligeramente hacia distal (signo de la inclinación radicular útil para identificar lado).',
    ],
    capasRelacionadas: ['cementum', 'dentin-radicular'],
  },
  esmalte: {
    id: 'esmalte',
    nombre: 'Esmalte dental',
    subtitulo: 'Tejido adamantino mineralizado externo de la corona',
    definicion:
      'Tejido de origen ectodérmico, acelular y altamente mineralizado (~96% hidroxiapatita cálcica) que recubre exclusivamente la corona anatómica.',
    caracteristicasClinicas: [
      'Alcanza su máximo espesor en cúspides y bordes incisales (~2–2.5 mm) y se adelgaza en filo de cuchillo hacia el cuello cervical.',
      'Su carácter prismático y avascular explica que no se regenere, pero permita grabado ácido micromecánico en odontología adhesiva.',
    ],
    capasRelacionadas: ['enamel'],
  },
  dentina: {
    id: 'dentina',
    nombre: 'Dentina (coronaria y radicular)',
    subtitulo: 'Tejido mineralizado elástico que conforma el eje estructural',
    definicion:
      'Tejido conjuntivo mineralizado (~70% inorgánico, ~20% orgánico con colágeno tipo I, ~10% agua) atravesado por túbulos dentinarios que alojan las prolongaciones odontoblásticas.',
    caracteristicasClinicas: [
      'Presenta sensibilidad por mecanismo hidrodinámico al quedar expuesta (dentina coronaria bajo esmalte o dentina radicular bajo cemento).',
      'Se diferencia funcionalmente en dentina primaria, secundaria (fisiológica continua) y terciaria (reaccional/reparativa frente a caries o desgaste).',
    ],
    capasRelacionadas: ['dentin-coronal', 'dentin-radicular'],
  },
  'dentin-coronal': {
    id: 'dentina-coronaria',
    nombre: 'Dentina coronaria',
    subtitulo: 'Núcleo dentinario de la corona bajo el esmalte',
    definicion:
      'Porción de la dentina situada por encima del nivel cervical; actúa como soporte elástico del esmalte frágil y forma el techo y paredes de la cámara pulpar.',
    caracteristicasClinicas: [
      'El límite amelodentinario (LAD) presenta festoneado biomecánico que disipa fuerzas masticatorias.',
      'En preparaciones cavitarias profundas la densidad y diámetro de los túbulos aumentan cerca de los cuernos pulpares.',
    ],
    capasRelacionadas: ['dentin-coronal'],
  },
  'dentin-radicular': {
    id: 'dentina-radicular',
    nombre: 'Dentina radicular',
    subtitulo: 'Pared dentinaria de la raíz entre cemento y conducto',
    definicion:
      'Porción radicular de la dentina recubierta externamente por cemento y tapizada internamente por la pulpa radicular; forma las paredes de los conductos.',
    caracteristicasClinicas: [
      'En su tercio más externo bajo el cemento presenta la zona granulosa de Tomes.',
      'En endodoncia, el espesor de la dentina en las zonas de peligro de furcación (p. ej. raíz mesial de molares inferiores) condiciona la instrumentación mecánica.',
    ],
    capasRelacionadas: ['dentin-radicular'],
  },
  cemento: {
    id: 'cemento',
    nombre: 'Cemento radicular',
    subtitulo: 'Tejido mineralizado mesenquimático de anclaje periodontal',
    definicion:
      'Tejido similar al hueso pero avascular que recubre la dentina radicular desde el cuello hasta el foramen apical, permitiendo la inserción de las fibras principales de Sharpey del ligamento periodontal.',
    caracteristicasClinicas: [
      'Cemento acelular (fibrilar primario): predomina en los tercios cervical y medio.',
      'Cemento celular: se deposita principalmente en el tercio apical y furcaciones, compensando la erupción continua y el desgaste oclusal.',
    ],
    capasRelacionadas: ['cementum'],
  },
  pulpa: {
    id: 'pulpa',
    nombre: 'Pulpa dental (complejo pulpar completo)',
    subtitulo: 'Tejido conjuntivo laxo vascularizado e inervado (cámara + conductos)',
    definicion:
      'Órgano formativo, nutritivo, sensitivo y defensivo alojado en la cavidad pulpar central del diente, compuesto por pulpa coronaria (en cámara pulpar) y pulpa radicular (en conductos).',
    caracteristicasClinicas: [
      'Su periferia está tapizada por odontoblastos responsables de la dentinogénesis continua.',
      'Recibe irrigación e inervación (fibras A-delta y C del nervio trigémino) a través del foramen apical y conductos accesorios.',
    ],
    capasRelacionadas: ['pulp-chamber', 'canal'],
  },
  'pulp-chamber': {
    id: 'camara-pulpar',
    nombre: 'Cámara pulpar',
    subtitulo: 'Cavidad central coronaria que aloja la pulpa coronaria',
    definicion:
      'Espacio anatómico ubicado en el centro de la corona (y parte cervical del tronco en multirradiculares), delimitado por techo con cuernos pulpares, paredes axiales y piso cameral en dientes con múltiples raíces.',
    caracteristicasClinicas: [
      'La forma de la cámara pulpar reproduce en miniatura la morfología externa de la corona; los cuernos pulpares se proyectan bajo cada cúspide o lóbulo.',
      'En la apertura endodóntica, el piso oscuro con las líneas del mapa dentinario (leyes de Krasner y Rankow) guía la localización de la entrada de los conductos.',
    ],
    capasRelacionadas: ['pulp-chamber'],
  },
  conductos: {
    id: 'conductos',
    nombre: 'Conductos radiculares',
    subtitulo: 'Trayectos pulpares desde el piso/cuello hasta el foramen apical',
    definicion:
      'Conductos excavados en el eje de la dentina radicular que continúan la cámara pulpar hasta el ápice; su número, sección y curvatura dependen específicamente de cada grupo y pieza dentaria.',
    caracteristicasClinicas: [
      'Pueden presentar configuraciones de Vertucci tipo I a VIII (conductos únicos, bifurcados, fusionados en un foramen o con istmos transversales).',
      'En el modelo 3D podés hacer clic sobre cada conducto individual (p. ej. MV1, MV2, palatino o distal) para identificar su trayecto específico.',
    ],
    capasRelacionadas: ['canal'],
  },
  apice: {
    id: 'apice',
    nombre: 'Ápice radicular y foramen apical',
    subtitulo: 'Extremo terminal de la raíz y puerta vasculonerviosa',
    definicion:
      'Porción terminal cónica de cada raíz donde confluyen la dentina y el cemento en la constricción apical (límite CDC: cemento-dentina-conducto) antes de abrirse en el foramen apical.',
    caracteristicasClinicas: [
      'El foramen apical anatómico no siempre coincide exactamente con el vértice geométrico del ápice (desviación de hasta 0.5–1.5 mm).',
      'La constricción apical constituye el límite ideal de preparación y obturación endodóntica.',
    ],
    capasRelacionadas: [],
    esLandmark: 'apice',
  },
  pdl: {
    id: 'pdl',
    nombre: 'Ligamento periodontal',
    subtitulo: 'Tejido fibroso de sostén entre cemento y hueso alveolar',
    definicion:
      'Membrana de tejido conectivo denso orientado que une el cemento radicular a la cortical alveolar (lámina dura), actuando como amortiguador viscoelástico y receptor propioceptivo.',
    caracteristicasClinicas: [
      'Espesor medio fisiológico entre 0.15 y 0.35 mm (más estrecho en el fulcro radicular).',
      'Se incluye como capa opcional para observar su relación externa con el cemento y el cuello.',
    ],
    capasRelacionadas: ['pdl'],
  },
};

ESTRUCTURAS_DENTALES_INFO['camara-pulpar'] = ESTRUCTURAS_DENTALES_INFO['pulp-chamber'];
ESTRUCTURAS_DENTALES_INFO['dentina-coronaria'] = ESTRUCTURAS_DENTALES_INFO['dentin-coronal'];
ESTRUCTURAS_DENTALES_INFO['dentina-radicular'] = ESTRUCTURAS_DENTALES_INFO['dentin-radicular'];

export function describeCanalLayerName(meshName: string): {
  title: string;
  subtitle: string;
  detail: string;
} {
  const lower = meshName.toLowerCase();
  if (lower.includes('enamel')) {
    return {
      title: ESTRUCTURAS_DENTALES_INFO.esmalte.nombre,
      subtitle: 'Capa externa de la corona anatómica',
      detail: ESTRUCTURAS_DENTALES_INFO.esmalte.definicion,
    };
  }
  if (lower.includes('dentin-coronal')) {
    return {
      title: ESTRUCTURAS_DENTALES_INFO['dentin-coronal'].nombre,
      subtitle: 'Dentina de la porción coronaria',
      detail: ESTRUCTURAS_DENTALES_INFO['dentin-coronal'].definicion,
    };
  }
  if (lower.includes('dentin-radicular')) {
    return {
      title: ESTRUCTURAS_DENTALES_INFO['dentin-radicular'].nombre,
      subtitle: 'Dentina de la porción radicular',
      detail: ESTRUCTURAS_DENTALES_INFO['dentin-radicular'].definicion,
    };
  }
  if (lower.includes('cementum')) {
    return {
      title: ESTRUCTURAS_DENTALES_INFO.cemento.nombre,
      subtitle: 'Revestimiento externo de la raíz anatómica',
      detail: ESTRUCTURAS_DENTALES_INFO.cemento.definicion,
    };
  }
  if (lower.includes('pdl')) {
    return {
      title: ESTRUCTURAS_DENTALES_INFO.pdl.nombre,
      subtitle: 'Tejido de inserción periodontal',
      detail: ESTRUCTURAS_DENTALES_INFO.pdl.definicion,
    };
  }
  if (lower.includes('pulp-chamber')) {
    return {
      title: ESTRUCTURAS_DENTALES_INFO['pulp-chamber'].nombre,
      subtitle: 'Pulpa coronaria (techo, cuernos y piso)',
      detail: ESTRUCTURAS_DENTALES_INFO['pulp-chamber'].definicion,
    };
  }
  if (lower.includes('canal-mesiobuccal-1')) {
    return {
      title: 'Conducto mesiovestibular 1 (MV1)',
      subtitle: 'Conducto principal de la raíz mesiovestibular',
      detail: 'Conducto ubicado en el ángulo mesiovestibular de molares superiores; suele presentar curvatura distal en el tercio apical.',
    };
  }
  if (lower.includes('canal-mesiobuccal-2')) {
    return {
      title: 'Conducto mesiovestibular 2 (MV2)',
      subtitle: 'Segundo conducto de la raíz mesiovestibular',
      detail: 'Conducto accesorio o secundario situado por palatino del MV1 siguiendo la línea entre MV1 y palatino; presente con alta frecuencia en primeros molares superiores.',
    };
  }
  if (lower.includes('canal-distobuccal')) {
    return {
      title: 'Conducto distovestibular (DV)',
      subtitle: 'Conducto de la raíz distovestibular',
      detail: 'Conducto único en la raíz distovestibular de molares superiores, generalmente más recto y de menor calibre que el palatino.',
    };
  }
  if (lower.includes('canal-palatal')) {
    return {
      title: 'Conducto palatino (P)',
      subtitle: 'Conducto de la raíz palatina',
      detail: 'Conducto amplio y recto correspondiente a la raíz palatina (en molares superiores y primeros premolares superiores birradiculares); suele curvarse hacia vestibular en el tercio apical.',
    };
  }
  if (lower.includes('canal-buccal')) {
    return {
      title: 'Conducto vestibular (V)',
      subtitle: 'Conducto de la raíz o vertiente vestibular',
      detail: 'Conducto situado bajo la cúspide vestibular (habitual en primeros premolares superiores con dos conductos).',
    };
  }
  if (lower.includes('canal-mesial-1')) {
    return {
      title: 'Conducto mesial 1 (mesiovestibular)',
      subtitle: 'Conducto mesiovestibular de la raíz mesial',
      detail: 'Uno de los dos conductos habituales de la raíz mesial en molares inferiores, frecuentemente unido al mesiolingual mediante un istmo.',
    };
  }
  if (lower.includes('canal-mesial-2')) {
    return {
      title: 'Conducto mesial 2 (mesiolingual)',
      subtitle: 'Conducto mesiolingual de la raíz mesial',
      detail: 'Segundo conducto habitual de la raíz mesial en molares inferiores; suele seguir un trayecto ligeramente más recto en su entrada que el mesiovestibular.',
    };
  }
  if (lower.includes('canal-mesial')) {
    return {
      title: 'Conducto mesial (M)',
      subtitle: 'Conducto principal de la raíz mesial',
      detail: 'Conducto correspondiente a la raíz mesial en molares inferiores.',
    };
  }
  if (lower.includes('canal-distal')) {
    return {
      title: 'Conducto distal (D)',
      subtitle: 'Conducto de la raíz distal',
      detail: 'Conducto amplio y ovoideo en sentido vestíbulo-lingual en la raíz distal de molares inferiores (puede bifurcarse en distovestibular y distolingual como variante).',
    };
  }
  if (lower.includes('canal-single')) {
    return {
      title: 'Conducto radicular único',
      subtitle: 'Trayecto pulpar central de raíz única',
      detail: ESTRUCTURAS_DENTALES_INFO.conductos.definicion,
    };
  }
  return {
    title: `Conducto radicular (${meshName})`,
    subtitle: 'Conducto radicular segmentado',
    detail: ESTRUCTURAS_DENTALES_INFO.conductos.definicion,
  };
}

const BIBLIO_PERMANENTES_BASE = [
  'Figún ME, Garino RR. Anatomía Odontológica Funcional y Aplicada. 2ª ed. Buenos Aires: El Ateneo.',
  'Nelson SJ. Wheeler’s Dental Anatomy, Physiology, and Occlusion. 11ª ed. St. Louis: Elsevier.',
  'Vertucci FJ. Root canal anatomy of the human permanent teeth. Oral Surg Oral Med Oral Pathol. 1984;58(5):589–599.',
  'Monsarrat P, et al. Interrelationships in the variability of root canal anatomy among the permanent teeth. PLOS ONE. 2016;11(10):e0165329 (CC BY).',
];

const BIBLIO_TERCEROS_MOLARES = [
  'Al-Qudah AA, et al. Root and canal morphology of third molars in a Jordanian subpopulation. Scientific Reports. 2023 (CC BY 4.0).',
  ...BIBLIO_PERMANENTES_BASE,
];

const BIBLIO_TEMPORARIAS = [
  'Figún ME, Garino RR. Anatomía Odontológica Funcional y Aplicada (Cap. Dentición Temporaria). 2ª ed. El Ateneo.',
  'Nelson SJ. Wheeler’s Dental Anatomy, Physiology, and Occlusion (Cap. 3: The Primary [Deciduous] Teeth). 11ª ed. Elsevier.',
  'Boj JR, Catalá M, Mendoza A, Planells P, Cortés O. Odontopediatría: La evolución del niño al adulto joven. Ripano.',
];

interface TipoDentalTemplate {
  suffix: string; // '1'..'8' para permanente, '1'..'5' para temporaria
  arcada: ArcadaTipo;
  grupo: GrupoDental;
  tipoCorto: string;
  esAnterior: boolean;
  caracteristicasAnatomicas: string[];
  numeroRaices: { habitual: string; variantes: string };
  conductosRadiculares: { habitual: string; disposicion: string; variantes: string };
  caras: {
    vestibular: string;
    palatinaOLingual: string;
    mesial: string;
    distal: string;
    oclusalOIncisal: string;
  };
  rasgosDiferenciales: (lado: LadoDental) => string[];
  bibliografia: string[];
}

function buildPermanentTooth(
  cuadrante: 1 | 2 | 3 | 4,
  tpl: TipoDentalTemplate
): PiezaDentariaInfo {
  const fdi = `${cuadrante}${tpl.suffix}`;
  const lado: LadoDental = cuadrante === 1 || cuadrante === 4 ? 'Derecho' : 'Izquierdo';
  const ladoLower = lado === 'Derecho' ? 'derecho' : 'izquierdo';
  return {
    fdi,
    nombre: `${tpl.tipoCorto} ${ladoLower}`,
    denticion: 'permanente',
    grupo: tpl.grupo,
    tipoCorto: tpl.tipoCorto,
    arcada: tpl.arcada,
    lado,
    cuadranteFdi: cuadrante,
    esAnterior: tpl.esAnterior,
    modeloUrl: `/models/teeth/tooth-${fdi}.glb`,
    recurso3DEstado: 'disponible',
    caracteristicasAnatomicas: tpl.caracteristicasAnatomicas,
    numeroRaices: tpl.numeroRaices,
    conductosRadiculares: tpl.conductosRadiculares,
    caras: tpl.caras,
    rasgosDiferenciales: tpl.rasgosDiferenciales(lado),
    bibliografia: tpl.bibliografia,
  };
}

function buildTemporaryTooth(
  cuadrante: 5 | 6 | 7 | 8,
  tpl: TipoDentalTemplate
): PiezaDentariaInfo {
  const fdi = `${cuadrante}${tpl.suffix}`;
  const lado: LadoDental = cuadrante === 5 || cuadrante === 8 ? 'Derecho' : 'Izquierdo';
  const ladoLower = lado === 'Derecho' ? 'derecho' : 'izquierdo';
  return {
    fdi,
    nombre: `${tpl.tipoCorto} temporario ${ladoLower}`,
    denticion: 'temporaria',
    grupo: tpl.grupo,
    tipoCorto: `${tpl.tipoCorto} temporario`,
    arcada: tpl.arcada,
    lado,
    cuadranteFdi: cuadrante,
    esAnterior: tpl.esAnterior,
    modeloUrl: null,
    recurso3DEstado: 'pendiente',
    recursoFaltanteDetalle: `Falta incorporar archivo .glb / .gltf segmentado para la pieza temporaria FDI ${fdi} (con mallas independientes de esmalte, dentina, cemento, cámara pulpar y conductos).`,
    caracteristicasAnatomicas: tpl.caracteristicasAnatomicas,
    numeroRaices: tpl.numeroRaices,
    conductosRadiculares: tpl.conductosRadiculares,
    caras: tpl.caras,
    rasgosDiferenciales: tpl.rasgosDiferenciales(lado),
    bibliografia: tpl.bibliografia,
  };
}

// === PLANTILLAS DENTICIÓN PERMANENTE (16 TIPOS ANATÓMICOS DIFERENCIADOS) ===
const PERM_SUP_TEMPLATES: TipoDentalTemplate[] = [
  {
    suffix: '1',
    arcada: 'Superior (maxilar)',
    grupo: 'Incisivos centrales',
    tipoCorto: 'Incisivo central superior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Es el incisivo de mayor anchura mesiodistal; su corona es trapezoidal alargada en sentido cérvico-incisal.',
      'Recién erupcionado presenta tres mamelones en el borde incisal (correspondientes a los tres lóbulos vestibulares de desarrollo).',
      'Cámara pulpar amplia y achatada en sentido vestíbulo-palatino, con tres cuernos pulpares bien definidos hacia incisal.',
    ],
    numeroRaices: {
      habitual: '1 raíz cónica, gruesa y recta de sección triangular redondeada.',
      variantes: 'Rara vez presenta dilaceración apical o bifurcación radicular por traumatismos tempranos.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único amplio y recto (Vertucci tipo I en >99%).',
      disposicion: 'Sección circular en tercio apical y triangular con base vestibular en tercio cervical.',
      variantes: 'Conductos laterales accesorios ocasionales (~10–15%) o doble conducto excepcional.',
    },
    caras: {
      vestibular: 'Convexa con dos surcos de desarrollo poco profundos que delimitan tres lóbulos; borde mesial casi recto y distal más convexo.',
      palatinaOLingual: 'Fosa palatina cóncava delimitada por crestas marginales mesial y distal bien marcadas y un cíngulo prominente desplazado hacia distal.',
      mesial: 'Contorno triangular en cuña; curvatura de la línea cervical muy pronunciada hacia incisal.',
      distal: 'Contorno similar al mesial pero con línea cervical menos pronunciada hacia incisal.',
      oclusalOIncisal: 'Borde incisal ancho y casi recto; contorno triangular con vértice hacia el cíngulo palatino.',
    },
    rasgosDiferenciales: (lado) => [
      `Ángulo mesioincisal casi recto (≈90°), orientado hacia la línea media; ángulo distoincisal más redondeado y obtuso hacia el lado ${lado === 'Derecho' ? 'derecho' : 'izquierdo'}.`,
      'A diferencia del incisivo central inferior, su diámetro mesiodistal es mucho mayor que el del lateral superior y su fosa palatina posee crestas marginales marcadas.',
      'La línea cervical es más convexa hacia incisal en mesial que en distal.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '2',
    arcada: 'Superior (maxilar)',
    grupo: 'Incisivos laterales',
    tipoCorto: 'Incisivo lateral superior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Corona de morfología semejante al incisivo central superior pero más estrecha mesiodistalmente y más convexa.',
      'Es la pieza anterior con mayor variabilidad morfológica después de los terceros molares (puede presentarse conoide o agénesico).',
    ],
    numeroRaices: {
      habitual: '1 raíz única delgada, aplanada mesiodistalmente y más larga en proporción a su corona que la del central.',
      variantes: 'Con frecuencia presenta una marcada curvatura apical hacia distal (y en ocasiones hacia palatino).',
    },
    conductosRadiculares: {
      habitual: '1 conducto único (Vertucci tipo I en ~97–99%), de menor calibre que el central y con curvatura apical frecuente hacia distopalatino.',
      disposicion: 'Sección ovoidea en tercio cervical y circular hacia el ápice.',
      variantes: 'Puede presentar invaginación coronaria (dens invaginatus) o surco palatogingival que origina un segundo conducto (~2–3%).',
    },
    caras: {
      vestibular: 'Más estrecha y redondeada que la del central; ambos ángulos incisales redondeados (el distoincisal marcadamente).',
      palatinaOLingual: 'Fosa palatina profunda y estrecha; con frecuencia muestra un agujero ciego (foramen caecum) en la unión entre cíngulo y fosa.',
      mesial: 'Aspecto triangular estrecho; cresta incisal alineada con el eje radicular.',
      distal: 'Contorno más corto y convexo que mesial; curvatura cervical menor que la mesial.',
      oclusalOIncisal: 'Contorno ovoideo con mayor convexidad vestibular que el central superior.',
    },
    rasgosDiferenciales: () => [
      'Diferencia clave frente al central superior: menor anchura mesiodistal, ángulos incisales muy redondeados, agujero ciego palatino frecuente y raíz proporcionalmente más larga con desvío distoapical.',
      'Diferencia frente al lateral inferior: presenta fosa palatina profunda, crestas marginales nítidas y es más ancho que el central de su propia arcada (en la inferior el lateral es más ancho que el central).',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '3',
    arcada: 'Superior (maxilar)',
    grupo: 'Caninos',
    tipoCorto: 'Canino superior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Es el diente más largo de la dentición humana; forma la eminencia canina que da soporte al ángulo labial.',
      'Corona pentagonal con una sola cúspide aguda y robusta reforzada por una cresta vestibular marcada.',
      'Cámara pulpar muy amplia en sentido vestíbulo-palatino con un único cuerno pulpar central prominente.',
    ],
    numeroRaices: {
      habitual: '1 raíz muy larga, gruesa y aplanada mesiodistalmente con surcos longitudinales en ambas caras proximales.',
      variantes: 'Rara vez presenta bifurcación radicular apical o inclinación marcada hacia distal/vestibular.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único amplio y largo (Vertucci tipo I >98%), muy elongado en sentido vestíbulo-palatino.',
      disposicion: 'Sección ovalada amplia en sentido vestíbulo-palatino en los tercios cervical y medio, redondeándose en el ápice.',
      variantes: 'Dos conductos (vestibular y palatino) en <2% de los casos.',
    },
    caras: {
      vestibular: 'Pentagonal, con lóbulo medio muy desarrollado; vertiente incisal mesial más corta que la distal.',
      palatinaOLingual: 'Cíngulo voluminoso dividido por una cresta palatina en dos fosas (mesiopalatina y distopalatina) bien delimitadas.',
      mesial: 'Cúspide ubicada ligeramente por vestibular respecto al eje radicular; mayor dimensión vestíbulo-palatina entre dientes anteriores.',
      distal: 'Más corta y convexa; punto de contacto más cervical que en mesial.',
      oclusalOIncisal: 'Contorno romboidal asimétrico con fuerte prominencia vestibular.',
    },
    rasgosDiferenciales: () => [
      'Diferencia entre lados: la vertiente mesioincisal es más corta y menos inclinada que la distoincisal; la eminencia vestibular es más convexa hacia mesial.',
      'Diferencia frente al canino inferior: corona más ancha mesiodistalmente, vertientes incisales en ángulo más agudo (~105°), cíngulo y cresta palatina mucho más marcados.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '4',
    arcada: 'Superior (maxilar)',
    grupo: 'Primeros premolares',
    tipoCorto: 'Primer premolar superior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Único premolar que presenta de manera habitual dos raíces y dos conductos diferenciados.',
      'Corona de contorno hexagonal en oclusal con dos cúspides (vestibular ligeramente más alta y aguda que la palatina).',
      'Presenta un surco de desarrollo mesial característico que cruza el reborde marginal mesial.',
    ],
    numeroRaices: {
      habitual: '2 raíces (vestibular y palatina), bifurcadas desde el tercio medio o apical (~55–65% de los casos).',
      variantes: '1 raíz única aplanada con surcos proximales profundos (~30–40%) o 3 raíces (dos vestibulares y una palatina, ~2–6%, variante "molarizada").',
    },
    conductosRadiculares: {
      habitual: '2 conductos (vestibular y palatino, ~80–85%), aun cuando las raíces se encuentren externamente fusionadas.',
      disposicion: 'Cámara pulpar alargada en sentido vestíbulo-palatino con piso por debajo del nivel cervical cuando es birradicular.',
      variantes: '1 conducto único (~10–15%) o 3 conductos (MV, DV y P) en ~2–5%.',
    },
    caras: {
      vestibular: 'Semejante a la del canino pero más estrecha; vertiente mesial de la cúspide vestibular más larga que la distal (rasgo único entre premolares superiores).',
      palatinaOLingual: 'Más estrecha y convexa que la vestibular; vértice de la cúspide palatina desplazado hacia mesial.',
      mesial: 'Contorno trapezoidal con marcada concavidad cervical (fosa canina del premolar) y surco mesial de desarrollo que cruza el reborde marginal.',
      distal: 'Más lisa y convexa, sin concavidad cervical ni surco cruzando el reborde marginal.',
      oclusalOIncisal: 'Hexagonal asimétrica; surco central largo y recto que se continúa hacia mesial; fosas triangulares más cercanas a los bordes.',
    },
    rasgosDiferenciales: () => [
      'Claves frente al segundo premolar superior: posee dos raíces habituales, concavidad mesial marcada con surco que corta el reborde marginal mesial, y la vertiente mesial de la cúspide vestibular es más larga que la distal.',
      'Clave de lateralidad: el vértice de la cúspide palatina apunta hacia mesial y la concavidad cervical está siempre en mesial.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '5',
    arcada: 'Superior (maxilar)',
    grupo: 'Segundos premolares',
    tipoCorto: 'Segundo premolar superior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Corona más redondeada y simétrica que el primer premolar superior, con cúspides vestibular y palatina de altura casi equivalente.',
      'Carece de la depresión mesial cervical marcada y el reborde marginal mesial rara vez está cortado por un surco.',
    ],
    numeroRaices: {
      habitual: '1 raíz única más larga que la del primer premolar, comprimida mesiodistalmente.',
      variantes: '2 raíces (vestibular y palatina) en ~10–15% de los casos; 3 raíces es extremadamente infrecuente (<1%).',
    },
    conductosRadiculares: {
      habitual: '1 conducto único ancho en sentido vestíbulo-palatino (Vertucci tipo I en ~50–60%).',
      disposicion: 'Conducto ovalado que puede bifurcarse en tercio medio y volver a converger en el ápice (tipo II) o mantener dos conductos independientes (tipo IV).',
      variantes: '2 conductos separados en ~35–45% de los casos; 3 conductos <1%.',
    },
    caras: {
      vestibular: 'Más redondeada que el primero; vertiente mesial de la cúspide vestibular más corta que la distal.',
      palatinaOLingual: 'Casi tan ancha y alta como la vestibular.',
      mesial: 'Convexa y continua en toda su altura; sin depresión cervical marcada.',
      distal: 'Muy similar a la mesial pero ligeramente más convexa.',
      oclusalOIncisal: 'Contorno ovoideo; surco central muy corto, centrado y con múltiples surcos suplementarios ("aspecto arrugado").',
    },
    rasgosDiferenciales: () => [
      'Diferencias clave frente al 1° premolar superior: cúspides de altura similar, contorno oclusal ovoideo con surco central corto y múltiples surcos accesorios, ausencia de fosa mesial y una sola raíz habitual.',
      'Para identificar lado: la cúspide palatina se inclina ligeramente hacia mesial y la vertiente distal vestibular es más larga que la mesial.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '6',
    arcada: 'Superior (maxilar)',
    grupo: 'Primeros molares',
    tipoCorto: 'Primer molar superior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Pieza clave de la oclusión (llave molar de Angle); es el diente de mayor volumen de la arcada maxilar.',
      'Presenta cuatro cúspides principales funcionales (MV, DV, MP, DP) más el tubérculo de Carabelli en la cara palatina de la cúspide mesiopalatina (frecuencia ~50–70%).',
      'Posee una cresta o puente adamantino oblicuo que une la cúspide mesiopalatina con la distovestibular.',
    ],
    numeroRaices: {
      habitual: '3 raíces bien divergentes: mesiovestibular (ancha vestíbulo-palatinamente), distovestibular (cónica) y palatina (la más larga y divergente).',
      variantes: 'Fusión parcial de raíces vestibulares con palatina (<5%) o presencia de 4 raíces supernumerarias (<1%).',
    },
    conductosRadiculares: {
      habitual: '3 o 4 conductos: palatino (1 amplio), distovestibular (1) y raíz mesiovestibular con 2 conductos (MV1 y MV2 en ~55–75% en CBCT/clínica).',
      disposicion: 'El orificio MV2 suele ubicarse ligeramente por mesial de la línea imaginaria entre MV1 y el conducto palatino.',
      variantes: 'Raíz MV con conducto único (Vertucci tipo I ~25–40%) o segundo conducto en raíz distovestibular/palatina (<2%).',
    },
    caras: {
      vestibular: 'Se observan las dos cúspides vestibulares (MV más ancha que DV) y el surco vestibular de desarrollo que termina en fosita vestibular.',
      palatinaOLingual: 'Cúspide mesiopalatina voluminosa (lleva el tubérculo de Carabelli en tercio medio/oclusal) y cúspide distopalatina más pequeña.',
      mesial: 'Más ancha y plana; presencia frecuente de la divergencia amplia entre raíz MV y raíz palatina.',
      distal: 'Más estrecha y convexa; permite visualizar parcialmente las cúspides vestibulares y el reborde oblicuo.',
      oclusalOIncisal: 'Romboidal (ángulos agudos MV y DP; obtusos DV y MP); puente adamantino oblicuo, fosa central y fosa distal diferenciadas.',
    },
    rasgosDiferenciales: () => [
      'Diferencias frente al 2° molar superior: mayor tamaño, tubérculo de Carabelli característico, cuatro cúspides bien desarrolladas, raíces muy divergentes y alta incidencia de MV2.',
      'Para determinar el lado: la cúspide más grande (mesiopalatina) y el tubérculo de Carabelli están hacia mesiopalatino; la raíz palatina diverge ampliamente hacia palatino.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '7',
    arcada: 'Superior (maxilar)',
    grupo: 'Segundos molares',
    tipoCorto: 'Segundo molar superior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Corona más estrecha mesiodistalmente que la del primer molar, con fuerte reducción (o ausencia en forma tricuspídea) de la cúspide distopalatina.',
      'Tubérculo de Carabelli habitualmente ausente; puente oblicuo menos pronunciado.',
    ],
    numeroRaices: {
      habitual: '3 raíces (mesiovestibular, distovestibular y palatina), menos divergentes y más inclinadas hacia distal que en el primer molar.',
      variantes: 'Fusión de dos o las tres raíces (especialmente MV con palatina o fusión vestibular) en ~15–25% de los casos.',
    },
    conductosRadiculares: {
      habitual: '3 conductos principales (MV1, DV, Palatino), con presencia de MV2 en ~30–50% (menor que en el primer molar).',
      disposicion: 'Los orificios vestibulares y palatino se disponen formando un triángulo mucho más comprimido mesiodistalmente que en el 1° molar.',
      variantes: '1 o 2 conductos en raíces fusionadas (~10–15%) o hasta 4–5 conductos.',
    },
    caras: {
      vestibular: 'Cúspide MV claramente mayor que la DV; las raíces vestibulares se inclinan fuertemente hacia distal.',
      palatinaOLingual: 'Cúspide DP muy reducida o ausente en molares superiores tricuspídeos ("en forma de corazón").',
      mesial: 'Contorno similar al 1° molar pero de menor altura y diámetro vestíbulo-palatino.',
      distal: 'Al ser más estrecha la cara distal, desde distal se observa mayor porción de la cara vestibular.',
      oclusalOIncisal: 'Romboidal más aplastada o triangular/cordiforme si falta la cúspide distopalatina.',
    },
    rasgosDiferenciales: () => [
      'Diferencia clave frente al 1° molar superior: reducción marcada de la cúspide distopalatina, ausencia habitual de tubérculo de Carabelli, raíces paralelas o fusionadas inclinadas hacia distal.',
      'Mayor compresión de los orificios camerales en sentido mesiodistal.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '8',
    arcada: 'Superior (maxilar)',
    grupo: 'Terceros molares',
    tipoCorto: 'Tercer molar superior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Es la pieza más pequeña y morfológicamente más variable de los molares superiores; con frecuencia presenta corona triangular tricuspídea (sin cúspide DP).',
      'Frecuentemente impactado o en malposición por falta de espacio en la tuberosidad del maxilar.',
    ],
    numeroRaices: {
      habitual: '3 raíces cortas, fusionadas total o parcialmente en un bloque cónico con marcada inclinación distal.',
      variantes: 'De 1 raíz cónica fusionada (~35–45%) hasta 3 raíces separadas o 4–5 raíces supernumerarias.',
    },
    conductosRadiculares: {
      habitual: '3 conductos (cuando conserva 3 raíces) o 1–2 conductos cuando las raíces están fusionadas.',
      disposicion: 'Gran variabilidad en diámetro, curvaturas apicales abruptas y confluencia de conductos.',
      variantes: 'De 1 solo conducto amplio (raíz cónica) hasta 4–5 conductos complejos según estudios CBCT (Al-Qudah et al., 2023).',
    },
    caras: {
      vestibular: 'Cúspide MV prominente y DV muy pequeña; raíces cortas y convergentes hacia el ápice.',
      palatinaOLingual: 'Generalmente unicuspídea (cúspide mesiopalatina amplia) cuando la forma es triangular.',
      mesial: 'Cúspide y cresta marginal mesial más altas que las distales.',
      distal: 'Muy convexa y reducida en anchura.',
      oclusalOIncisal: 'Contorno triangular o cordiforme con numerosos surcos suplementarios y cúspides pequeñas.',
    },
    rasgosDiferenciales: () => [
      'No generalizar su anatomía: varía ampliamente desde formas tricuspídeas diminutas con raíz única fusionada hasta molares tetracuspídeos trirradiculares.',
      'Su inclinación radicular extrema hacia distal y proximidad al piso del seno maxilar y tuberosidad lo diferencian del segundo molar superior.',
    ],
    bibliografia: BIBLIO_TERCEROS_MOLARES,
  },
];

const PERM_INF_TEMPLATES: TipoDentalTemplate[] = [
  {
    suffix: '1',
    arcada: 'Inferior (mandibular)',
    grupo: 'Incisivos centrales',
    tipoCorto: 'Incisivo central inferior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Es el diente más pequeño y simétrico de toda la dentición permanente.',
      'Su diámetro vestíbulo-lingual es mayor que el mesiodistal.',
      'Es más estrecho que el incisivo lateral inferior (relación inversa respecto a la arcada superior).',
    ],
    numeroRaices: {
      habitual: '1 raíz única muy aplanada mesiodistalmente, con surcos longitudinales marcados en las caras mesial y distal.',
      variantes: 'Rara vez presenta bifurcación radicular apical.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único en ~60–70% de los casos (Vertucci tipo I), muy estrecho mesiodistalmente.',
      disposicion: 'Sección acintada en sentido vestíbulo-lingual.',
      variantes: '2 conductos (vestibular y lingual, tipo II o III) en un significativo **25–40%** de las piezas: nunca asumir que todo incisivo inferior tiene un solo conducto.',
    },
    caras: {
      vestibular: 'Muy simétrica y estrecha; ambos ángulos incisales (mesial y distal) son casi rectos (~90°).',
      palatinaOLingual: 'Lisa y poco excavada; cíngulo suave y crestas marginales apenas perceptibles.',
      mesial: 'Cónica/triangular muy estrecha; borde incisal centrado o levemente lingual al eje longitudinal.',
      distal: 'Prácticamente simétrica respecto a mesial; ligera menor curvatura cervical.',
      oclusalOIncisal: 'Borde incisal perpendicular a la bisectriz vestíbulo-lingual (simetría bilateral que dificulta distinguir derecha de izquierda).',
    },
    rasgosDiferenciales: () => [
      'Frente al lateral inferior: el central inferior es más pequeño y casi simétrico, con borde incisal recto y sin torsión distal.',
      'Importancia endodóntica diferencial: hasta un 30–40% presentan un segundo conducto lingual oculto bajo el hombro lingual.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '2',
    arcada: 'Inferior (mandibular)',
    grupo: 'Incisivos laterales',
    tipoCorto: 'Incisivo lateral inferior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Ligeramente más ancho y grande que el incisivo central inferior en todas sus dimensiones.',
      'Presenta una torsión distolingual característica de su borde incisal para seguir la curva del arco mandibular.',
    ],
    numeroRaices: {
      habitual: '1 raíz única recta y fuertemente aplanada mesiodistalmente con depresión longitudinal distal más profunda.',
      variantes: 'Ligera desviación distal del tercio apical; raíz doble muy rara (<1%).',
    },
    conductosRadiculares: {
      habitual: '1 conducto único ovalado en sentido vestíbulo-lingual (~60–70%).',
      disposicion: 'Alargado en sentido vestíbulo-lingual; el conducto lingual suele quedar oculto si la apertura es demasiado vestibular.',
      variantes: '2 conductos (vestibular y lingual, Vertucci tipo II/III/IV) en **30–40%** de los casos.',
    },
    caras: {
      vestibular: 'Asimétrica respecto al central; el ángulo distoincisal es ligeramente más redondeado y ubicado más hacia cervical.',
      palatinaOLingual: 'Fosa lingual suave; el cíngulo está levemente desplazado hacia distal.',
      mesial: 'Más larga y recta que la cara distal.',
      distal: 'Más corta y convexa; revela parte del borde incisal girado lingualmente.',
      oclusalOIncisal: 'Rasgo clave: el borde incisal describe una ligera curva/torsión hacia distolingual en lugar de ser recto.',
    },
    rasgosDiferenciales: () => [
      'Frente al incisivo central inferior: mayor anchura, asimetría coronaria, ángulo distoincisal más cervical y torsión distolingual del borde incisal.',
      'Frente al incisivo lateral superior: mucho más estrecho, fosa lingual poco profunda y elevada incidencia de doble conducto.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '3',
    arcada: 'Inferior (mandibular)',
    grupo: 'Caninos',
    tipoCorto: 'Canino inferior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Corona más estrecha mesiodistalmente y proporcionalmente más alargada que la del canino superior.',
      'La cara mesial forma una línea casi continua y recta desde la corona hasta la raíz.',
    ],
    numeroRaices: {
      habitual: '1 raíz única larga y aplanada mesiodistalmente (~94%).',
      variantes: 'Bifurcación radicular en raíz vestibular y raíz lingual en **~2–6%** de los caninos inferiores (rasgo prácticamente exclusivo entre los caninos).',
    },
    conductosRadiculares: {
      habitual: '1 conducto único amplio en sentido vestíbulo-lingual (~85–92%).',
      disposicion: 'Alargado vestíbulo-lingualmente; estrecho en sentido mesiodistal.',
      variantes: '2 conductos (vestibular y lingual, tipo II/III/IV) en **~8–15%** de los casos.',
    },
    caras: {
      vestibular: 'Corona más angosta; vertiente mesial de la cúspide muy corta y casi horizontal, vertiente distal mucho más larga e inclinada.',
      palatinaOLingual: 'Cíngulo suave, cresta lingual poco pronunciada y fosas poco profundas.',
      mesial: 'Perfil mesial continuo casi rectilíneo entre corona y raíz; cúspide inclinada hacia lingual.',
      distal: 'Más convexa y corta que mesial.',
      oclusalOIncisal: 'Contorno ovoideo estrecho con cresta vestibular menos convexa que el canino superior.',
    },
    rasgosDiferenciales: () => [
      'Frente al canino superior: corona más angosta, menor relieve lingual, vertiente mesial mucho más corta y posibilidad de dos raíces o dos conductos (~8–15%).',
      'Lateralidad: borde mesial rectilíneo continuo con la raíz y vertiente distal más larga y cervical.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '4',
    arcada: 'Inferior (mandibular)',
    grupo: 'Primeros premolares',
    tipoCorto: 'Primer premolar inferior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Posee morfología intermedia entre canino y premolar ("caniniforme"): cúspide vestibular muy desarrollada y cúspide lingual diminuta no funcional.',
      'Presenta un surco mesiolingual característico que separa el reborde marginal mesial de la cúspide lingual.',
      'La corona está fuertemente inclinada hacia lingual respecto al eje radicular (~45° de plano oclusal).',
    ],
    numeroRaices: {
      habitual: '1 raíz única cónica redondeada, más estrecha por lingual.',
      variantes: 'Surcos radiculares profundos o bifurcación radicular (2 raíces/conductos, especialmente con variante de conducto en C o Tome’s root ~5–15%).',
    },
    conductosRadiculares: {
      habitual: '1 conducto único (Vertucci tipo I en ~70–75%).',
      disposicion: 'Conducto recto en la porción cervical que puede dividirse abruptamente en dos en el tercio medio (difícil acceso al conducto lingual).',
      variantes: '2 conductos (vestibular y lingual, Vertucci tipo III/V) en **~20–28%** de los casos; 3 conductos en <2%.',
    },
    caras: {
      vestibular: 'Cúspide vestibular puntiaguda y centrada; contorno muy parecido a un canino pequeño.',
      palatinaOLingual: 'Muy estrecha; permite ver casi toda la vertiente oclusal vestibular y el surco mesiolingual.',
      mesial: 'Marcada inclinación lingual de la corona; el reborde marginal mesial desciende bruscamente hacia lingual (casi paralelo al eje oclusal) interrumpido por el surco mesiolingual.',
      distal: 'Reborde marginal distal más alto y perpendicular al eje largo; sin surco mesiolingual.',
      oclusalOIncisal: 'Contorno romboidal/circular; cresta transversa prominente que une la gran cúspide vestibular con la pequeña lingual, separando fosita mesial (más pequeña) y distal.',
    },
    rasgosDiferenciales: () => [
      'Diferencias frente al segundo premolar inferior: cúspide lingual muy pequeña, plano oclusal inclinado ~45° hacia lingual, presencia de surco mesiolingual y cresta transversa continua.',
      'Diferencias frente a premolares superiores: un solo grupo de raíz habitual, asimetría marcada de cúspides e inclinación coronaria lingual.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '5',
    arcada: 'Inferior (mandibular)',
    grupo: 'Segundos premolares',
    tipoCorto: 'Segundo premolar inferior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Es el único premolar que presenta con alta frecuencia **tres cúspides** (una vestibular grande, una mesiolingual mediana y una distolingual menor) en configuración oclusal en "Y" (~55–65%), o dos cúspides en configuración en "U" o "H".',
      'Cúspide lingual funcional mucho más desarrollada que la del primer premolar inferior.',
    ],
    numeroRaices: {
      habitual: '1 raíz única más gruesa, larga y redondeada que la del primer premolar inferior.',
      variantes: '2 raíces o raíz bífida apical es poco frecuente (<3%).',
    },
    conductosRadiculares: {
      habitual: '1 conducto único amplio y recto (Vertucci tipo I en ~85–95%).',
      disposicion: 'Sección circular u ovalada con menor dificultad de acceso que el 1° premolar inferior.',
      variantes: '2 conductos (~5–12%) o 3 conductos (<1%).',
    },
    caras: {
      vestibular: 'Cúspide vestibular más ancha y menos puntiaguda que la del primer premolar inferior.',
      palatinaOLingual: 'Más ancha y alta; en la forma tricuspídea se observan dos cúspides linguales (ML mayor que DL) separadas por un surco lingual.',
      mesial: 'Reborde marginal mesial más alto que el distal; menor inclinación lingual que el 1° premolar y ausencia de surco mesiolingual.',
      distal: 'Reborde marginal distal más cervical, permitiendo ver más de la cara oclusal desde distal.',
      oclusalOIncisal: 'Cuadrangular (forma tricuspídea en "Y" con fosita central) o redondeada (forma bicuspídea en "H" o "U").',
    },
    rasgosDiferenciales: () => [
      'Frente al primer premolar inferior: cara oclusal cuadrangular más simétrica, cúspides linguales bien desarrolladas (a menudo 2 linguales), ausencia de surco mesiolingual y casi siempre 1 solo conducto.',
      'Atención clínica: su ápice se encuentra en íntima vecindad con el foramen mentoniano.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '6',
    arcada: 'Inferior (mandibular)',
    grupo: 'Primeros molares',
    tipoCorto: 'Primer molar inferior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Es el diente más grande de la mandíbula y la primera pieza permanente en erupcionar (~6 años).',
      'Presenta habitualmente **cinco cúspides**: tres vestibulares (MV, Centrovestibular/Mediovestibular y DV pequeña) y dos linguales (ML y DL).',
    ],
    numeroRaices: {
      habitual: '2 raíces anchas en sentido vestíbulo-lingual y aplanadas mesiodistalmente: raíz mesial (con concavidad longitudinal y mayor curvatura) y raíz distal.',
      variantes: 'Presencia de una tercera raíz supernumeraria distolingual (*radix entomolaris*, ~3–15% según población) o mesiovestibular (*radix paramolaris*, <1%).',
    },
    conductosRadiculares: {
      habitual: '3 o 4 conductos: raíz mesial con **2 conductos** (mesiovestibular y mesiolingual en >90–95%); raíz distal con 1 conducto amplio (~60–70%) o 2 conductos (DV y DL en ~30–40%).',
      disposicion: 'Los conductos mesiales suelen comunicarse por istmos; la pared distal de la raíz mesial es delgada ("zona de peligro").',
      variantes: 'Conducto mesial medio (MM) en ~1–15%, o 4 conductos separados (MV, ML, DV, DL).',
    },
    caras: {
      vestibular: 'Ancha y trapezoidal; se observan 3 cúspides vestibulares separadas por dos surcos (el surco MV termina en fosita vestibular).',
      palatinaOLingual: 'Se observan 2 cúspides linguales altas y puntiagudas (ML ligeramente mayor que DL).',
      mesial: 'Contorno romboidal con marcada inclinación lingual de la corona; raíz mesial muy ancha.',
      distal: 'Más estrecha y corta que la mesial, dejando ver parte de las cúspides vestibulares y de la raíz mesial.',
      oclusalOIncisal: 'Contorno pentagonal alargado mesiodistalmente; surco central en zigzag con bifurcaciones hacia las tres cúspides vestibulares.',
    },
    rasgosDiferenciales: () => [
      'Diferencias frente al 2° molar inferior: presencia habitual de 5 cúspides (pentagonal vs cuadrangular de 4 cúspides en el 2° molar) y raíces más divergentes.',
      'Lateralidad: la cúspide distovestibular (5ª cúspide) es la más pequeña y se ubica en distovestibular; las raíces se inclinan hacia distal.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '7',
    arcada: 'Inferior (mandibular)',
    grupo: 'Segundos molares',
    tipoCorto: 'Segundo molar inferior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Corona simétrica de contorno rectangular o cuadrangular con **cuatro cúspides** de tamaño similar (MV, DV, ML y DL).',
      'Presenta un patrón oclusal cruciforme ("+") formado por la intersección perpendicular del surco central y los surcos vestibular y lingual.',
    ],
    numeroRaices: {
      habitual: '2 raíces (mesial y distal), más cortas, más juntas entre sí y más inclinadas hacia distal que las del primer molar inferior.',
      variantes: 'Fusión de ambas raíces (raíz cónica o en herradura/"en C") presente en ~10–35% según población.',
    },
    conductosRadiculares: {
      habitual: '3 conductos (2 mesiales: MV y ML; 1 distal amplio, ~65–75%).',
      disposicion: 'Orificios más próximos entre sí; mayor riesgo de fusión hacia la porción apical.',
      variantes: 'Conducto en "C" (*C-shaped canal*, ~8–30% cuando hay fusión radicular en herradura lingual/vestibular), 2 conductos (1M + 1D) o 4 conductos.',
    },
    caras: {
      vestibular: 'Solo 2 cúspides vestibulares (MV ligeramente más ancha que DV) separadas por un surco vestibular único; línea cervical casi recta.',
      palatinaOLingual: '2 cúspides linguales simétricas; menor diferencia de anchura entre mesial y distal que en el primer molar.',
      mesial: 'Menor dimensión vestíbulo-lingual que el primer molar; inclinación lingual de la corona.',
      distal: 'Muy similar a la cara mesial aunque ligeramente más baja.',
      oclusalOIncisal: 'Rectangular simétrica con surco en cruz ("+"); ausencia habitual de 5ª cúspide.',
    },
    rasgosDiferenciales: () => [
      'Diferencias clave frente al 1° molar inferior: 4 cúspides en cruz ("+") en lugar de 5 cúspides, raíces menos divergentes con inclinación distal y posibilidad significativa de anatomía en "C".',
      'Lateralidad: prominencia cervical mesiovestibular más marcada y raíces inclinadas hacia distal.',
    ],
    bibliografia: BIBLIO_PERMANENTES_BASE,
  },
  {
    suffix: '8',
    arcada: 'Inferior (mandibular)',
    grupo: 'Terceros molares',
    tipoCorto: 'Tercer molar inferior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Morfología coronaria muy variable: puede adoptar un patrón cuadrangular de 4 cúspides (similar al 2° molar) o pentagonal de 5 cúspides (similar al 1° molar) con numerosos surcos accesorios.',
      'Con frecuencia presenta retención o impactación mesioangular u horizontal respecto al borde anterior de la rama mandibular.',
    ],
    numeroRaices: {
      habitual: '2 raíces (mesial y distal) cortas, frecuentemente curvadas en dirección distal y próximas al conducto mandibular.',
      variantes: 'Fusión radicular en 1 raíz cónica (~25–35%), 3 raíces o raíces múltiples en gancho.',
    },
    conductosRadiculares: {
      habitual: '2 o 3 conductos (mesial único o doble y distal único), aunque su número es sumamente inconstante.',
      disposicion: 'Trayectos cortos con curvaturas acentuadas en tercio medio-apical.',
      variantes: 'De 1 conducto único (en raíces fusionadas o patrón en C) hasta 4–5 conductos (Al-Qudah et al., 2023).',
    },
    caras: {
      vestibular: 'Corona bulbosa muy convexa en cervical; raíces cortas y frecuentemente fusionadas o curvas hacia distal.',
      palatinaOLingual: 'Cúspides linguales más agudas; cara más estrecha hacia cervical.',
      mesial: 'Semejante al segundo molar pero de menor altura coronorradicular.',
      distal: 'Muy redondeada y corta.',
      oclusalOIncisal: 'Tabla oclusal reducida por convergencia de cúspides, aspecto muy fisurado con surcos suplementarios.',
    },
    rasgosDiferenciales: () => [
      'No asumir un número fijo de cúspides o conductos: alterna variantes tetracuspídeas y pentacuspídeas, con elevada proporción de raíces fusionadas o curvas hacia distal.',
      'Relación crítica en cirugía oral: proximidad directa de sus ápices con el conducto alveolar inferior (nervio dentario inferior) y el nervio lingual.',
    ],
    bibliografia: BIBLIO_TERCEROS_MOLARES,
  },
];

// === PLANTILLAS DENTICIÓN TEMPORARIA (10 TIPOS ANATÓMICOS DIFERENCIADOS) ===
const TEMP_SUP_TEMPLATES: TipoDentalTemplate[] = [
  {
    suffix: '1',
    arcada: 'Superior (maxilar)',
    grupo: 'Incisivos centrales',
    tipoCorto: 'Incisivo central superior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Único incisivo cuya anchura mesiodistal es mayor que la altura cérvico-incisal coronaria (corona ancha y corta).',
      'Presenta cíngulo muy abultado y prominencia cervical vestibular marcada.',
      'Coloración más blanco-azulada/opaca y espesor de esmalte menor (~0.5–1 mm) que el permanente.',
    ],
    numeroRaices: {
      habitual: '1 raíz única cónica, proporcionalmente larga respecto a la corona corta, con ligera inclinación vestibular en tercio apical para alojar el germen del permanente por palatino.',
      variantes: 'Reabsorción fisiológica progresiva (rizólisis) desde palato-apical entre los 4 y 7 años.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único amplio en relación con el volumen dentinario.',
      disposicion: 'Cámara pulpar amplia que sigue de cerca la superficie coronaria; paredes dentinarias delgadas.',
      variantes: 'Conductos accesorios escasos.',
    },
    caras: {
      vestibular: 'Muy convexa, lisa, sin surcos de desarrollo visibles; borde incisal recto.',
      palatinaOLingual: 'Cíngulo muy prominente que ocupa casi la mitad cervical, delimitando una fosa palatina pequeña y cóncava.',
      mesial: 'Dimensión vestíbulo-palatina ancha en cervical por el abultamiento del cíngulo y la cresta cervical vestibular.',
      distal: 'Similar a mesial con menor curvatura de la línea cervical.',
      oclusalOIncisal: 'Borde incisal casi recto centrado vestíbulo-palatinamente; contorno ancho mesiodistalmente.',
    },
    rasgosDiferenciales: () => [
      'Diferencia frente al permanente: corona más ancha que alta, esmalte más blanco y delgado, reborde cervical abrupto y desviación vestibular del ápice por vecindad del germen sucesor.',
      'Lateralidad: ángulo mesioincisal recto y ángulo distoincisal más redondeado.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '2',
    arcada: 'Superior (maxilar)',
    grupo: 'Incisivos laterales',
    tipoCorto: 'Incisivo lateral superior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'A diferencia del central temporario, su altura coronaria supera a su ancho mesiodistal.',
      'Forma similar al central temporario pero más pequeña, estrecha y con ángulos incisales más redondeados.',
    ],
    numeroRaices: {
      habitual: '1 raíz única delgada y más larga en proporción que la del central temporario.',
      variantes: 'Rizólisis fisiológica por palatino; rara bifurcación.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único relativamente amplio y recto.',
      disposicion: 'Sigue el eje largo hasta el ápice ligeramente inclinado hacia vestibular.',
      variantes: 'Sin variantes frecuentes relevantes.',
    },
    caras: {
      vestibular: 'Convexa y lisa; ángulo distoincisal marcadamente redondeado.',
      palatinaOLingual: 'Fosa palatina más profunda en proporción y crestas marginales más nítidas que en el central temporario.',
      mesial: 'Cresta cervical prominente en el tercio gingival.',
      distal: 'Más corta y convexa que la cara mesial.',
      oclusalOIncisal: 'Contorno redondeado; más estrecho mesiodistalmente que el central.',
    },
    rasgosDiferenciales: () => [
      'Frente al central temporario: más estrecho mesiodistalmente, altura mayor que ancho y ángulo distoincisal muy redondeado.',
      'Frente al lateral inferior temporario: mucho más ancho en corona y con fosa palatina definida.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '3',
    arcada: 'Superior (maxilar)',
    grupo: 'Caninos',
    tipoCorto: 'Canino superior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Corona globosa y ancha en relación con su altura, fuertemente estrechada en el cuello cervical.',
      'Cúspide muy aguda y larga; a diferencia del canino permanente, su vertiente mesial es MÁS LARGA que la distal.',
    ],
    numeroRaices: {
      habitual: '1 raíz única larga, cónica y delgada (más del doble de la longitud coronaria).',
      variantes: 'Curvatura apical discreta hacia vestibular/distal.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único amplio.',
      disposicion: 'Cámara pulpar amplia con un cuerno pulpar central muy alto y puntiagudo.',
      variantes: 'Muy baja incidencia de bifurcación.',
    },
    caras: {
      vestibular: 'Muy convexa con reborde cervical pronunciado; vertiente cúspide mesial más larga que la distal (rasgo inverso al canino permanente y al inferior temporario).',
      palatinaOLingual: 'Cíngulo prominente con cresta palatina que divide en dos fosas pequeñas.',
      mesial: 'Perfil cervical fuertemente abultado tanto en vestibular como en palatino.',
      distal: 'Más corta y redondeada.',
      oclusalOIncisal: 'Contorno en diamante; vértice cuspídeo desplazado ligeramente hacia distal.',
    },
    rasgosDiferenciales: () => [
      'Rasgo diferencial único del canino superior temporario: su vertiente mesioincisal es más larga que la distoincisal (al revés del canino permanente y del canino inferior temporario).',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '4',
    arcada: 'Superior (maxilar)',
    grupo: 'Primeros molares',
    tipoCorto: 'Primer molar superior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Pieza con morfología anatómica propia que NO se asemeja a ningún diente permanente (forma intermedia entre premolar y molar).',
      'Presenta un prominente abultamiento cervical en mesiovestibular llamado **tubérculo molar de Zuckerkandl**.',
      'Habitualmente tiene 3 o 4 cúspides (MV, Palatina grande, DV y a veces DP rudimentaria).',
    ],
    numeroRaices: {
      habitual: '3 raíces delgadas y muy divergentes (mesiovestibular, distovestibular y palatina) que rodean al germen del primer premolar superior.',
      variantes: 'Fusión parcial de la raíz distovestibular con la palatina en un porcentaje variable de casos.',
    },
    conductosRadiculares: {
      habitual: '3 o 4 conductos (1 palatino, 1 distovestibular, 1 o 2 mesiovestibulares).',
      disposicion: 'Cámara pulpar amplia con 3–4 cuernos pulpares muy altos (especialmente el mesiovestibular).',
      variantes: 'Conductos estrechos, acintados y divergentes siguiendo el trayecto radicular.',
    },
    caras: {
      vestibular: 'Abultamiento cervical marcado en el tercio mesiovestibular (tubérculo de Zuckerkandl); cara mucho más ancha en mesial que en distal.',
      palatinaOLingual: 'Converge hacia palatino; dominada por una gran cúspide mesiopalatina.',
      mesial: 'Mayor dimensión vestíbulo-palatina en el cuello que en oclusal.',
      distal: 'Más estrecha y corta; cúspide distopalatina diminuta o ausente.',
      oclusalOIncisal: 'Contorno trapezoidal; surco central con patrón en "H" o "T" y reborde oblicuo inconstante.',
    },
    rasgosDiferenciales: () => [
      'No confundir con el primer premolar ni con el segundo molar temporario: su morfología trapezoidal asimétrica y el gran tubérculo mesiovestibular de Zuckerkandl son inconfundibles.',
      'Las raíces nacen casi directamente desde un tronco muy corto cerca del cuello para abrazar al germen premolar.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '5',
    arcada: 'Superior (maxilar)',
    grupo: 'Segundos molares',
    tipoCorto: 'Segundo molar superior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Presenta **isomorfismo anatómico** con el primer molar superior permanente (4 cúspides principales + puente oblicuo + tubérculo de Carabelli frecuente en mesiopalatino), pero de menor tamaño y corona más blanca y constreñida en el cuello.',
    ],
    numeroRaices: {
      habitual: '3 raíces largas, delgadas y muy divergentes (MV, DV y Palatina), con tronco radicular corto.',
      variantes: 'Mayor divergencia apical que en el permanente para dar espacio al germen del segundo premolar.',
    },
    conductosRadiculares: {
      habitual: '3 o 4 conductos (MV1, MV2 posible, DV y Palatino).',
      disposicion: 'Cámara pulpar muy amplia con cuernos pulpares altos bajo las 4 cúspides (el MV es el más cercano a la superficie).',
      variantes: 'Conductos secundarios y deltas en furcación frecuentes en la zona del piso cameral.',
    },
    caras: {
      vestibular: 'Dos cúspides vestibulares bien definidas (MV y DV); marcada constricción cervical.',
      palatinaOLingual: 'Cúspide mesiopalatina grande con tubérculo de Carabelli frecuente y cúspide distopalatina bien desarrollada.',
      mesial: 'Menor altura coronaria y mayor abultamiento cervical que el 1° molar permanente.',
      distal: 'Más convexa y reducida.',
      oclusalOIncisal: 'Romboidal con puente adamantino oblicuo nítido entre cúspides MP y DV.',
    },
    rasgosDiferenciales: () => [
      'Se distingue del 1° molar superior temporario por tener 4 cúspides bien formadas (igual al 1° molar permanente) y del 1° molar permanente por su menor tamaño, color blanco lechoso, cuello estrecho y raíces muy abiertas desde el cuello.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
];

const TEMP_INF_TEMPLATES: TipoDentalTemplate[] = [
  {
    suffix: '1',
    arcada: 'Inferior (mandibular)',
    grupo: 'Incisivos centrales',
    tipoCorto: 'Incisivo central inferior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Es el diente más pequeño de la dentición temporaria; muy simétrico y estrecho.',
      'A diferencia del central superior temporario, es más alto que ancho.',
    ],
    numeroRaices: {
      habitual: '1 raíz única recta, delgada y ligeramente aplanada mesiodistalmente.',
      variantes: 'Inclinación vestibular apical fisiológica en relación con el germen del permanente por lingual.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único recto.',
      disposicion: 'Cámara pulpar continua con el conducto sin constricción cervical pronunciada.',
      variantes: 'Bifurcación en 2 conductos muy rara (<5%).',
    },
    caras: {
      vestibular: 'Muy simétrica y lisa; ángulos mesioincisal y distoincisal casi rectos.',
      palatinaOLingual: 'Cíngulo suave y fosa lingual muy poco profunda.',
      mesial: 'Abultamiento cervical marcado en tercio gingival.',
      distal: 'Simétrica a la cara mesial.',
      oclusalOIncisal: 'Borde incisal recto centrado respecto a la raíz.',
    },
    rasgosDiferenciales: () => [
      'Frente al incisivo central inferior permanente: corona mucho más pequeña, ausencia de mamelones marcados, esmalte opaco y abultamiento cervical marcado.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '2',
    arcada: 'Inferior (mandibular)',
    grupo: 'Incisivos laterales',
    tipoCorto: 'Incisivo lateral inferior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Ligeramente más grande, ancho y menos simétrico que el incisivo central inferior temporario.',
      'Ángulo distoincisal claramente más redondeado y descendido hacia cervical.',
    ],
    numeroRaices: {
      habitual: '1 raíz única cónica y delgada, más larga que la del central.',
      variantes: 'Leve desviación distal en el ápice.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único.',
      disposicion: 'Recto y estrecho en sentido mesiodistal.',
      variantes: 'Rara bifurcación.',
    },
    caras: {
      vestibular: 'Borde incisal inclinado hacia distocervical; ángulo mesioincisal agudo y distoincisal redondeado.',
      palatinaOLingual: 'Fosa lingual algo más marcada que la del central temporario.',
      mesial: 'Más larga que la distal.',
      distal: 'Más corta y convexa.',
      oclusalOIncisal: 'Ligera curvatura hacia distolingual siguiendo el arco inferior.',
    },
    rasgosDiferenciales: () => [
      'Frente al central inferior temporario: mayor tamaño y claro redondeamiento del ángulo distoincisal.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '3',
    arcada: 'Inferior (mandibular)',
    grupo: 'Caninos',
    tipoCorto: 'Canino inferior',
    esAnterior: true,
    caracteristicasAnatomicas: [
      'Más estrecho mesiodistalmente y menos abultado que el canino superior temporario.',
      'Su vertiente incisal **distal es más larga que la mesial** (a diferencia del canino superior temporario).',
    ],
    numeroRaices: {
      habitual: '1 raíz única larga y cónica (ligeramente más corta que la del superior temporario).',
      variantes: 'Leve inclinación distal apical.',
    },
    conductosRadiculares: {
      habitual: '1 conducto único amplio.',
      disposicion: 'Conducto ovalado en sentido vestíbulo-lingual.',
      variantes: 'Muy baja frecuencia de doble conducto.',
    },
    caras: {
      vestibular: 'Corona más esbelta; vertiente cuspídea mesial más corta que la distal.',
      palatinaOLingual: 'Cíngulo y cresta lingual más tenues que en el canino superior temporario.',
      mesial: 'Menor diámetro vestíbulo-palatino cervical que el superior.',
      distal: 'Más corta y convexa.',
      oclusalOIncisal: 'Contorno ovoideo con cúspide inclinada levemente hacia lingual.',
    },
    rasgosDiferenciales: () => [
      'Diferencia clave frente al canino superior temporario: corona más estrecha y vertiente distal más larga que la mesial.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '4',
    arcada: 'Inferior (mandibular)',
    grupo: 'Primeros molares',
    tipoCorto: 'Primer molar inferior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Morfología **única e irrepetible**: no se parece a ninguna otra pieza temporaria ni permanente.',
      'Presenta un enorme tubérculo cervical mesiovestibular (de Zuckerkandl) que inclina notablemente la corona en sentido mesial.',
      'Posee 4 cúspides muy desiguales (MV muy grande, ML puntiaguda, DV y DL pequeñas), con una marcada cresta transversa mesial que separa una pequeña fosita mesial de la fosa central.',
    ],
    numeroRaices: {
      habitual: '2 raíces (mesial y distal) muy delgadas, anchas en sentido vestíbulo-lingual y fuertemente divergentes para alojar al germen del 1° premolar inferior.',
      variantes: 'Raíz mesial notablemente más ancha y larga que la distal.',
    },
    conductosRadiculares: {
      habitual: '3 o 4 conductos (2 en la raíz mesial: MV y ML; 1 o 2 en la raíz distal).',
      disposicion: 'Cuerno pulpar mesiovestibular muy alto y agudo (principal punto de exposición pulpar en caries oclusomesiales).',
      variantes: 'Conductos acintados con comunicación por istmo.',
    },
    caras: {
      vestibular: 'El perfil mesial es casi recto mientras el cervical cae bruscamente hacia mesiovestibular por el tubérculo de Zuckerkandl.',
      palatinaOLingual: 'Cúspide mesiolingual alta y aguda; marcada convergencia desde vestibular hacia lingual.',
      mesial: 'Extremadamente convexa en el tercio cervical vestibular; inclinación lingual de la mesa oclusal.',
      distal: 'Más baja y estrecha que la mesial.',
      oclusalOIncisal: 'Romboidal alargada mesiodistalmente y comprimida en la parte mesial; puente transverso prominente entre cúspide MV y ML.',
    },
    rasgosDiferenciales: () => [
      'Imposible confundirlo con otro molar: es el único molar inferior temporario con morfología romboidal alargada, puente mesial transverso alto y enorme prominencia cervical mesiovestibular.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
  {
    suffix: '5',
    arcada: 'Inferior (mandibular)',
    grupo: 'Segundos molares',
    tipoCorto: 'Segundo molar inferior',
    esAnterior: false,
    caracteristicasAnatomicas: [
      'Presenta **isomorfismo anatómico** con el primer molar inferior permanente (5 cúspides: 3 vestibulares casi iguales entre sí y 2 linguales), pero en escala más pequeña, cuello muy constreñido y corona más blanco-opaca.',
    ],
    numeroRaices: {
      habitual: '2 raíces (mesial y distal) largas, muy aplanadas mesiodistalmente y muy divergentes desde un tronco corto.',
      variantes: 'Pueden presentarse raíces accesorias raras (<2%).',
    },
    conductosRadiculares: {
      habitual: '3 o 4 conductos (2 mesiales: MV y ML; 1 o 2 distales).',
      disposicion: 'Cámara pulpar amplia con 5 cuernos pulpares elevados bajo cada cúspide.',
      variantes: 'Fusión de conductos distales o presencia de istmos frecuentes.',
    },
    caras: {
      vestibular: 'Tres cúspides vestibulares (MV, centrovestibular y DV) de tamaño bastante equilibrado (a diferencia del 1° molar permanente donde la DV es pequeña).',
      palatinaOLingual: 'Dos cúspides linguales casi iguales separadas por un surco lingual corto.',
      mesial: 'Constricción cervical notable; tabla oclusal más estrecha en sentido vestíbulo-lingual que el permanente.',
      distal: 'Más estrecha que la mesial.',
      oclusalOIncisal: 'Rectangular/pentagonal alargada mesiodistalmente con 5 cúspides.',
    },
    rasgosDiferenciales: () => [
      'Frente al 1° molar inferior permanente: menor tamaño, tres cúspides vestibulares casi del mismo ancho, fuerte estrechamiento cervical y raíces muy divergentes desde la corona.',
    ],
    bibliografia: BIBLIO_TEMPORARIAS,
  },
];

export const PIEZAS_PERMANENTES: PiezaDentariaInfo[] = [
  ...PERM_SUP_TEMPLATES.map((t) => buildPermanentTooth(1, t)),
  ...PERM_SUP_TEMPLATES.map((t) => buildPermanentTooth(2, t)),
  ...PERM_INF_TEMPLATES.map((t) => buildPermanentTooth(3, t)),
  ...PERM_INF_TEMPLATES.map((t) => buildPermanentTooth(4, t)),
];

export const PIEZAS_TEMPORARIAS: PiezaDentariaInfo[] = [
  ...TEMP_SUP_TEMPLATES.map((t) => buildTemporaryTooth(5, t)),
  ...TEMP_SUP_TEMPLATES.map((t) => buildTemporaryTooth(6, t)),
  ...TEMP_INF_TEMPLATES.map((t) => buildTemporaryTooth(7, t)),
  ...TEMP_INF_TEMPLATES.map((t) => buildTemporaryTooth(8, t)),
];

export const TODAS_LAS_PIEZAS_DENTARIAS: PiezaDentariaInfo[] = [
  ...PIEZAS_PERMANENTES,
  ...PIEZAS_TEMPORARIAS,
];

export const PIEZA_BY_FDI: Record<string, PiezaDentariaInfo> = Object.fromEntries(
  TODAS_LAS_PIEZAS_DENTARIAS.map((p) => [p.fdi, p])
);
