export type CraneoRegion = 'neurocraneo' | 'viscerocraneo';
export type CraneoLateralidad = 'Impar (plano medio)' | 'Derecho (par)' | 'Izquierdo (par)';

export type AtlasVistaId =
  | 'inicial'
  | 'anterior'
  | 'posterior'
  | 'lateral-derecha'
  | 'lateral-izquierda'
  | 'superior'
  | 'inferior';

export interface AtlasVistaPreset {
  id: AtlasVistaId;
  label: string;
  shortLabel: string;
  direction: [number, number, number];
  up?: [number, number, number];
  distanciaFactor?: number;
}

export interface CraneoEstructuraInfo {
  id: string;
  nombre: string;
  nombreGrupo: string;
  nombreLatino: string;
  fmaId: string;
  region: CraneoRegion;
  lateralidad: CraneoLateralidad;
  ubicacion: string;
  caracteristicas: string[];
  accidentesAnatomicos: string[];
  articulacionesYRelaciones: string[];
  relevanciaOdontologica: string[];
  bibliografia: string[];
}

/**
 * Vistas anatómicas predefinidas alineadas con el sistema de coordenadas del modelo:
 * +Z = Anterior (rostro), +Y = Superior (vértice), -X = Lado derecho anatómico, +X = Lado izquierdo anatómico.
 */
export const ATLAS_VISTAS_PRESET: AtlasVistaPreset[] = [
  {
    id: 'anterior',
    label: 'Vista Anterior',
    shortLabel: 'Anterior',
    direction: [0, 0.04, 1],
    distanciaFactor: 1.9,
  },
  {
    id: 'posterior',
    label: 'Vista Posterior',
    shortLabel: 'Posterior',
    direction: [0, 0.06, -1],
    distanciaFactor: 1.9,
  },
  {
    id: 'lateral-derecha',
    label: 'Lateral Derecha',
    shortLabel: 'Lat. Der.',
    direction: [-1, 0.04, 0],
    distanciaFactor: 1.95,
  },
  {
    id: 'lateral-izquierda',
    label: 'Lateral Izquierda',
    shortLabel: 'Lat. Izq.',
    direction: [1, 0.04, 0],
    distanciaFactor: 1.95,
  },
  {
    id: 'superior',
    label: 'Vista Superior',
    shortLabel: 'Superior',
    direction: [0, 1, 0.06],
    distanciaFactor: 2.0,
  },
  {
    id: 'inferior',
    label: 'Vista Inferior (Base)',
    shortLabel: 'Inferior',
    direction: [0, -1, 0.08],
    distanciaFactor: 2.0,
  },
];

export const ATLAS_VISTA_INICIAL: AtlasVistaPreset = {
  id: 'inicial',
  label: 'Vista 3/4 Inicial',
  shortLabel: 'Inicial',
  direction: [0.58, 0.24, 0.78],
  distanciaFactor: 1.92,
};

const BIBLIO_BASE = [
  'Figún ME, Garino RR. Anatomía Odontológica Funcional y Aplicada. 2ª ed. Buenos Aires: El Ateneo.',
  'Rouvière H, Delmas A. Anatomía Humana: Descriptiva, Topográfica y Funcional. Tomo I: Cabeza y Cuello. 11ª ed. Masson.',
  'Terminologia Anatomica (FIPAT) · Foundational Model of Anatomy (FMA) / BodyParts3D (DBCLS, CC BY-SA 2.1 JP).',
];

const BIBLIO_CLINICA_MOORE = [
  'Moore KL, Dalley AF, Agur AMR. Anatomía con Orientación Clínica. 8ª ed. Wolters Kluwer.',
  ...BIBLIO_BASE,
];

function crearParietal(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-parietal-bone`,
    nombre: `Hueso parietal ${lado}`,
    nombreGrupo: 'Hueso parietal',
    nombreLatino: `Os parietale (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA52788' : 'FMA52789',
    region: 'neurocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Porción superolateral de la calota (bóveda craneal), situado por detrás del frontal, por delante del occipital y por encima del hueso temporal ${lado}.`,
    caracteristicas: [
      'Hueso plano, par y de forma cuadrilátera, compuesto por dos tablas de hueso compacto (externa e interna) separadas por tejido esponjoso (diploe).',
      'Presenta dos caras (exocraneal convexa y endocraneal cóncava), cuatro bordes (sagital, escamoso, frontal y occipital) y cuatro ángulos.',
      'Su cara interna alberga surcos vasculares bien marcados correspondientes a las ramas de la arteria meníngea media.',
    ],
    accidentesAnatomicos: [
      'Eminencia o tuberosidad parietal (zona de máxima convexidad exocraneal).',
      'Líneas temporales superior (inserción de la fascia temporal) e inferior (inserción superior del músculo temporal).',
      'Foramen parietal (cercano al borde sagital, paso de vena emisaria).',
      'Surcos de la arteria meníngea media y fositas granulares (de Pacchioni) en la cara endocraneal.',
      'Ángulo esfenoidal (anteroinferior), parte constitutiva de la región del pterion.',
    ],
    articulacionesYRelaciones: [
      'Sutura sagital: con el hueso parietal contralateral en la línea media.',
      'Sutura coronal: por delante con el hueso frontal.',
      'Sutura lambdoidea: por detrás con la escama del hueso occipital.',
      'Sutura escamosa y parietomastoidea: por debajo con el hueso temporal; ángulo esfenoidal con el ala mayor del esfenoides (pterion).',
    ],
    relevanciaOdontologica: [
      'La línea temporal inferior delimita el origen superior del músculo temporal, elevador mandibular clave evaluado en trastornos temporomandibulares (TTM) y mioespasmos masticatorios.',
      'La fascia temporal, insertada en la línea temporal superior, orienta la propagación de infecciones en el espacio temporal profundo desde focos molares.',
      'Referencia craneométrica superior (bregma, lambda, eurion) para análisis cefalométricos y antropometría facial.',
    ],
    bibliografia: BIBLIO_BASE,
  };
}

function crearTemporal(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-temporal-bone`,
    nombre: `Hueso temporal ${lado}`,
    nombreGrupo: 'Hueso temporal',
    nombreLatino: `Os temporale (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA52738' : 'FMA52739',
    region: 'neurocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Porción inferolateral del cráneo (bóveda y base craneal media-posterior), por debajo del parietal ${lado}, detrás del esfenoides y delante del occipital.`,
    caracteristicas: [
      'Hueso par, irregular y neumático, formado por tres porciones embriológicas fusionadas: escamosa, timpánica y petromastoidea.',
      'Aloja los órganos vestibulococleares de la audición y el equilibrio dentro de la porción petrosa (peñasco).',
      'Forma la superficie articular craneal de la articulación temporomandibular (ATM).',
    ],
    accidentesAnatomicos: [
      'Apófisis cigomática (forma junto al cigomático el arco cigomático).',
      'Fosa mandibular (cavidad glenoidea) y tubérculo articular (cóndilo del temporal), separados posteriormente por la fisura petrotimpánica (de Glaser).',
      'Conducto auditivo externo y apófisis mastoides (con ranura digástrica para el vientre posterior del digástrico).',
      'Apófisis estiloides (origen del ramillete de Riolano: ligamentos estilohioideo/estilomandibular y músculos asociados).',
      'Conducto carotídeo, foramen estilomastoideo (salida del nervio facial, VII par) e impresión trigeminal (cavum de Meckel) en la cara anterior del peñasco.',
    ],
    articulacionesYRelaciones: [
      'Con la mandíbula mediante la articulación temporomandibular (ATM).',
      'Con el cigomático (sutura temporocigomática), parietal (sutura escamosa), esfenoides y occipital.',
      'Relación directa con el ganglio trigeminal (V par), nervio auriculotemporal, nervio cuerda del tímpano (VII) y arteria meníngea media.',
    ],
    relevanciaOdontologica: [
      'La fosa mandibular y la vertiente posterior del tubérculo articular guían la trayectoria condilar durante la apertura, protrusión y lateralidad mandibular.',
      'La fisura petrotimpánica transmite el nervio cuerda del tímpano (gusto de los 2/3 anteriores de la lengua e inervación parasimpática submandibular/sublingual).',
      'La apófisis mastoides y el conducto auditivo externo (porion óseo) constituyen puntos anatómicos esenciales en el plano de Frankfort y montaje en articulador.',
      'El espasmo o patología de la ATM puede referir otalgia debido a la vecindad íntima con el conducto auditivo externo y el nervio auriculotemporal.',
    ],
    bibliografia: BIBLIO_CLINICA_MOORE,
  };
}

function crearNasal(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-nasal-bone`,
    nombre: `Hueso nasal ${lado}`,
    nombreGrupo: 'Hueso nasal',
    nombreLatino: `Os nasale (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA53647' : 'FMA53648',
    region: 'viscerocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Porción superior y media de la pirámide nasal, entre las apófisis frontales de ambos maxilares y por debajo de la escotadura nasal del frontal.`,
    caracteristicas: [
      'Lámina ósea par, pequeña y rectangular, más gruesa en su borde superior que en el inferior.',
      'Forma el puente óseo de la nariz junto con el hueso nasal contralateral.',
      'Su cara interna participa en el techo anterior de las cavidades nasales y presenta el surco etmoidal.',
    ],
    accidentesAnatomicos: [
      'Surco etmoidal (cara posterior, paso del nervio nasal externo / etmoidal anterior).',
      'Foramen nasal (pequeño orificio vascular en la cara externa).',
      'Borde inferior libre que se continúa con los cartílagos nasales laterales.',
    ],
    articulacionesYRelaciones: [
      'Sutura internasal: con el hueso nasal opuesto en la línea media.',
      'Sutura frontonasal (punto craneométrico nasion): por arriba con el hueso frontal.',
      'Sutura nasomaxilar: lateralmente con la apófisis frontal del maxilar.',
      'Por detrás con la lámina perpendicular del etmoides y la espina nasal del frontal.',
    ],
    relevanciaOdontologica: [
      'El punto craneométrico Nasion (Na), intersección de la sutura frontonasal e internasal, es uno de los reparos principales en cefalometría ortodóncica (ángulos SNA, SNB, ANB).',
      'Zona frecuentemente comprometida en traumatismos del tercio medio facial (fracturas nasoorbitoetmoidales y Le Fort II/III).',
    ],
    bibliografia: BIBLIO_BASE,
  };
}

function crearLagrimal(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-lacrimal-bone`,
    nombre: `Hueso lagrimal (unguis) ${lado}`,
    nombreGrupo: 'Hueso lagrimal',
    nombreLatino: `Os lacrimale (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA53645' : 'FMA53646',
    region: 'viscerocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Porción anterior de la pared medial de la órbita ${esDer ? 'derecha' : 'izquierda'}, situado por detrás de la apófisis frontal del maxilar y por delante de la lámina orbitaria del etmoides.`,
    caracteristicas: [
      'Es el hueso más pequeño y delgado del viscerocráneo.',
      'Lámina ósea cuadrilátera y papirácea que contribuye a separar la cavidad orbitaria de las celdillas etmoidales anteriores y la cavidad nasal.',
    ],
    accidentesAnatomicos: [
      'Cresta lagrimal posterior (inserción de la porción lagrimal del músculo orbicular del ojo).',
      'Surco lagrimal (junto al surco del maxilar forma la fosa del saco lagrimal y el inicio del conducto nasolagrimal).',
      'Gancho lagrimal (hamulus lacrimalis) en el extremo inferior de la cresta.',
    ],
    articulacionesYRelaciones: [
      'Por delante con la apófisis frontal del maxilar.',
      'Por detrás con el laberinto etmoidal (lámina papirácea).',
      'Por arriba con la porción orbitaria del frontal; por abajo con el cornete nasal inferior (apófisis lagrimal) y el maxilar.',
    ],
    relevanciaOdontologica: [
      'Su proximidad al conducto nasolagrimal es importante en osteotomías maxilares (Le Fort I alta) y abordajes del seno maxilar o de la apófisis ascendente.',
      'La relación anatómica explica epífora o edema periorbitario medial secundario a traumatismos o infecciones maxiloetmoidales.',
    ],
    bibliografia: BIBLIO_BASE,
  };
}

function crearCigomatico(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-zygomatic-bone`,
    nombre: `Hueso cigomático (malar) ${lado}`,
    nombreGrupo: 'Hueso cigomático',
    nombreLatino: `Os zygomaticum (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA52892' : 'FMA52893',
    region: 'viscerocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Región lateral y superior del macizo facial (prominencia de la mejilla), formando el borde inferolateral de la órbita ${esDer ? 'derecha' : 'izquierda'}.`,
    caracteristicas: [
      'Hueso par, compacto y resistente, que actúa como pilar lateral de transmisión de las fuerzas masticatorias desde el maxilar hacia el cráneo.',
      'Presenta tres caras (lateral, temporal y orbitaria) y tres apófisis (frontal, temporal y maxilar).',
    ],
    accidentesAnatomicos: [
      'Apófisis frontal (forma el pilar lateral de la órbita).',
      'Apófisis temporal (se articula con la apófisis cigomática del temporal para completar el arco cigomático).',
      'Forámenes cigomaticofacial, cigomaticoorbitario y cigomaticotemporal (ramas sensitivas de V2).',
      'Borde inferior grueso y rugoso para la inserción anterior del músculo masetero.',
    ],
    articulacionesYRelaciones: [
      'Con el maxilar (sutura cigomaticomaxilar).',
      'Con el hueso frontal (sutura frontocigomática).',
      'Con el ala mayor del esfenoides (en la pared lateral de la órbita).',
      'Con el hueso temporal (sutura temporocigomática, formando el arco cigomático).',
    ],
    relevanciaOdontologica: [
      'Inserción superior del músculo masetero (fascículo superficial y profundo), músculo masticatorio principal evaluado por palpación en el examen clínico de TTM.',
      'En implantología avanzada de maxilares con reabsorción severa, el cuerpo del cigomático constituye el anclaje óseo para implantes cigomáticos.',
      'Punto de fijación frecuente con miniplacas en fracturas del complejo cigomaticomaxilar (fractura en trípode) y referencia de la apófisis piramidal en radiografías panorámicas.',
    ],
    bibliografia: BIBLIO_CLINICA_MOORE,
  };
}

function crearMaxilar(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-maxilla`,
    nombre: `Hueso maxilar ${lado}`,
    nombreGrupo: 'Maxilar',
    nombreLatino: `Maxilla (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA53649' : 'FMA53650',
    region: 'viscerocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Centro del tercio medio facial, constituyendo el maxilar superior ${lado}, el suelo de la órbita, la pared lateral y suelo de la cavidad nasal y los dos tercios anteriores del paladar duro.`,
    caracteristicas: [
      'Hueso par central del viscerocráneo que se fusiona en la línea media por la sutura intermaxilar para conformar la arcada dentaria superior.',
      'Posee un cuerpo piramidal hueco ocupado por el seno maxilar (antro de Highmore) y cuatro apófisis: frontal, cigomática, palatina y alveolar.',
    ],
    accidentesAnatomicos: [
      'Foramen y surco/conducto infraorbitario (emergencia del paquete vasculonervioso infraorbitario, rama de V2).',
      'Apófisis alveolar con alvéolos dentarios y eminencia canina (separa la fosa incisiva/mirtiforme de la fosa canina).',
      'Tuberosidad del maxilar (cara infratemporal, con orificios alveolares posterosuperiores) y espina nasal anterior.',
      'Apófisis palatina y fosa/conducto incisivo (nervio nasopalatino y vasos esfenopalatinos).',
      'Hiato maxilar (comunicación del seno maxilar hacia el meato nasal medio).',
    ],
    articulacionesYRelaciones: [
      'Con el maxilar contralateral (sutura intermaxilar y palatina media).',
      'Con el hueso palatino por detrás, cigomático lateralmente, frontal, nasal, lagrimal, etmoides, cornete inferior y vómer.',
      'Relación apical estrecha de premolares y molares superiores (especialmente 1° y 2° molar) con el piso del seno maxilar.',
    ],
    relevanciaOdontologica: [
      'Reparos anestésicos fundamentales de la segunda rama del trigémino (V2): nervio infraorbitario, alveolar superior anterior, medio y posterior (tuberosidad maxilar) y nasopalatino.',
      'La apófisis alveolar sufre remodelado tras exodoncias; en el sector posterior, la neumatización del seno maxilar condiciona la altura ósea disponible para implantes (elevación de piso sinusal).',
      'La comunicación bucosinusal es una complicación clínica relevante durante extracciones de molares superiores con raíces próximas al seno maxilar.',
      'El punto A (subespinal) y la espina nasal anterior (ENA) son puntos cefalométricos indispensables en ortodoncia y cirugía ortognática (osteotomía Le Fort I).',
    ],
    bibliografia: BIBLIO_CLINICA_MOORE,
  };
}

function crearPalatino(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-palatine-bone`,
    nombre: `Hueso palatino ${lado}`,
    nombreGrupo: 'Hueso palatino',
    nombreLatino: `Os palatinum (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA53655' : 'FMA53656',
    region: 'viscerocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Porción posterior de las cavidades nasales y del paladar duro, interpuesto entre el maxilar por delante y la apófisis pterigoides del esfenoides por detrás.`,
    caracteristicas: [
      'Hueso par, delgado y en forma de "L", compuesto por una lámina horizontal y una lámina perpendicular.',
      'Participa simultáneamente en la formación del tercio posterior del paladar duro, la pared lateral nasal, la fosa pterigopalatina y el vértice del piso orbitario.',
    ],
    accidentesAnatomicos: [
      'Lámina horizontal: forma el tercio posterior del paladar duro y presenta la espina nasal posterior junto al lado opuesto.',
      'Foramen palatino mayor y forámenes palatinos menores (en la apófisis piramidal y lámina horizontal).',
      'Lámina perpendicular con las crestas etmoidal y de la concha.',
      'Apófisis orbitaria, apófisis esfenoidal (delimitan con el esfenoides el foramen esfenopalatino) y apófisis piramidal.',
    ],
    articulacionesYRelaciones: [
      'Sutura palatina transversa: borde anterior de la lámina horizontal con la apófisis palatina del maxilar.',
      'Sutura palatina media: con el hueso palatino contralateral.',
      'Por detrás con las láminas de la apófisis pterigoides del esfenoides; por arriba con el vómer, etmoides y cornete inferior.',
    ],
    relevanciaOdontologica: [
      'El foramen palatino mayor (situado medial al 2° o 3° molar superior) es el punto de reparo para el bloqueo anestésico del nervio palatino mayor (mucoperiostio palatino desde premolares a molares) y el bloqueo troncular del nervio maxilar por vía del conducto palatino mayor.',
      'La arteria palatina mayor emerge por este foramen y discurre hacia adelante en el surco palatino, estructura crítica a preservar al tomar injertos de tejido conectivo o realizar colgajos palatinos.',
      'La espina nasal posterior (ENP) delimita el plano palatino en trazados cefalométricos.',
    ],
    bibliografia: BIBLIO_BASE,
  };
}

function crearCorneteInferior(side: 'right' | 'left'): CraneoEstructuraInfo {
  const esDer = side === 'right';
  const lado = esDer ? 'derecho' : 'izquierdo';
  const ladoCap = esDer ? 'Derecho' : 'Izquierdo';
  return {
    id: `${side}-inferior-nasal-concha`,
    nombre: `Cornete nasal inferior ${lado}`,
    nombreGrupo: 'Cornete nasal inferior',
    nombreLatino: `Concha nasalis inferior (${esDer ? 'dexter' : 'sinister'})`,
    fmaId: esDer ? 'FMA54737' : 'FMA54738',
    region: 'viscerocraneo',
    lateralidad: `${ladoCap} (par)` as CraneoLateralidad,
    ubicacion: `Pared lateral de la cavidad nasal ${esDer ? 'derecha' : 'izquierda'}, suspendido por debajo del cornete medio del etmoides y cubriendo el meato nasal inferior.`,
    caracteristicas: [
      'A diferencia de los cornetes superior y medio (que pertenecen al etmoides), el cornete nasal inferior es un hueso independiente del viscerocráneo.',
      'Lámina ósea alargada y enrollada sobre sí misma que aumenta la superficie mucosa para calentar, humidificar y filtrar el aire inspirado.',
    ],
    accidentesAnatomicos: [
      'Apófisis lagrimal (completa el conducto nasolagrimal).',
      'Apófisis maxilar (cierra parcialmente el hiato del seno maxilar).',
      'Apófisis etmoidal (se articula con la apófisis unciforme del etmoides).',
    ],
    articulacionesYRelaciones: [
      'Con la cresta de la concha del maxilar y del hueso palatino.',
      'Con el hueso lagrimal y la apófisis unciforme del etmoides.',
      'Delimita por debajo el meato nasal inferior, donde desemboca el conducto nasolagrimal.',
    ],
    relevanciaOdontologica: [
      'Su hipertrofia mucosa o desviación septal asociada favorece la respiración bucal crónica, alterando el equilibrio muscular perioral y favoreciendo paladar ojival, mordida cruzada posterior o maloclusiones clase II en pacientes en crecimiento.',
      'Estructura visible en radiografías panorámicas y tomografías CBCT del tercio medio; debe diferenciarse de patologías sinusales o nasales.',
    ],
    bibliografia: BIBLIO_BASE,
  };
}

export const CRANEO_ESTRUCTURAS: CraneoEstructuraInfo[] = [
  {
    id: 'frontal-bone',
    nombre: 'Hueso frontal',
    nombreGrupo: 'Hueso frontal',
    nombreLatino: 'Os frontale',
    fmaId: 'FMA52734',
    region: 'neurocraneo',
    lateralidad: 'Impar (plano medio)',
    ubicacion: 'Porción anterior e inferior de la bóveda craneal (frente) y techo de ambas cavidades orbitarias y de la fosa craneal anterior.',
    caracteristicas: [
      'Hueso impar, mediano y simétrico compuesto por una porción vertical (escama frontal) y una porción horizontal (orbitoetmoidal).',
      'Contiene los senos frontales en el espesor de la región superciliar, cavidades neumáticas que drenan al meato nasal medio.',
      'Su cara endocraneal aloja los lóbulos frontales del encéfalo.',
    ],
    accidentesAnatomicos: [
      'Glabela, arcos superciliares y eminencias frontales.',
      'Borde supraorbitario con la escotadura o foramen supraorbitario (paso del nervio y vasos supraorbitarios, V1).',
      'Apófisis cigomática del frontal y línea temporal anterior.',
      'Escotadura etmoidal, fosas lagrimales, fosita troclear y espina nasal del frontal.',
      'Cresta frontal interna, foramen ciego y surco del seno sagital superior.',
    ],
    articulacionesYRelaciones: [
      'Sutura coronal: por detrás con ambos huesos parietales.',
      'Por debajo y atrás con las alas menores y mayores del esfenoides y con la lámina cribosa del etmoides.',
      'Por delante y abajo con los huesos nasales, apófisis frontales de los maxilares, lagrimales y cigomáticos.',
    ],
    relevanciaOdontologica: [
      'Los puntos craneométricos Glabela y Nasion (en la sutura frontonasal) constituyen referencias clásicas para el análisis facial clínico y cefalométrico.',
      'La apófisis cigomática y el borde supraorbitario forman pilares verticales que transmiten fuerzas masticatorias y sirven de anclaje en osteosíntesis de fracturas Le Fort III.',
      'La sinusitis frontal puede generar dolor facial referido que exige diagnóstico diferencial con odontalgias del sector anterosuperior.',
    ],
    bibliografia: BIBLIO_CLINICA_MOORE,
  },
  crearParietal('right'),
  crearParietal('left'),
  {
    id: 'occipital-bone',
    nombre: 'Hueso occipital',
    nombreGrupo: 'Hueso occipital',
    nombreLatino: 'Os occipitale',
    fmaId: 'FMA52735',
    region: 'neurocraneo',
    lateralidad: 'Impar (plano medio)',
    ubicacion: 'Porción posterior e inferior del cráneo, conformando la nuca, la parte posterior de la bóveda y la fosa craneal posterior.',
    caracteristicas: [
      'Hueso impar, plano y curvo, dispuesto alrededor del foramen magno.',
      'Se divide descriptivamente en cuatro porciones que rodean el foramen magno: basilar (anterior), dos porciones laterales (condíleas) y la escama occipital (posterior).',
    ],
    accidentesAnatomicos: [
      'Foramen magno (paso del bulbo raquídeo/médula espinal, arterias vertebrales y raíces espinales del nervio accesorio).',
      'Cóndilos occipitales (superficies convexas que articulan con el atlas C1) y conductos del nervio hipogloso (XII par).',
      'Protuberancia occipital externa (inion) y líneas nucales superior e inferior.',
      'Clivus (cara endocraneal de la porción basilar) y protuberancia occipital interna con la eminencia cruciforme.',
    ],
    articulacionesYRelaciones: [
      'Con el atlas (1ª vértebra cervical) mediante las articulaciones atlantooccipitales.',
      'Sutura lambdoidea: con ambos huesos parietales.',
      'Con los huesos temporales (sutura occipitomastoidea y foramen yugular) y con el cuerpo del esfenoides (sincondrosis esfenooccipital).',
    ],
    relevanciaOdontologica: [
      'El punto Basion (borde anterior del foramen magno) es el límite posterior de la base del cráneo en numerosos análisis cefalométricos (Ricketts, McNamara, Jarabak).',
      'La sincondrosis esfenooccipital es un centro fundamental de crecimiento posnatal de la base craneal que influye en la relación sagital maxilomandibular.',
      'La musculatura suboccipital y cervical posterior se coordina funcionalmente con la postura mandibular y la oclusión.',
    ],
    bibliografia: BIBLIO_BASE,
  },
  crearTemporal('right'),
  crearTemporal('left'),
  {
    id: 'sphenoid-bone',
    nombre: 'Hueso esfenoides',
    nombreGrupo: 'Hueso esfenoides',
    nombreLatino: 'Os sphenoidale',
    fmaId: 'FMA52736',
    region: 'neurocraneo',
    lateralidad: 'Impar (plano medio)',
    ubicacion: 'Centro de la base del cráneo ("piedra angular"), entre el frontal y etmoides por delante y el occipital y temporales por detrás.',
    caracteristicas: [
      'Hueso impar con morfología compleja en "mariposa" o "murciélago", con un cuerpo central hueco (senos esfenoidales) y tres pares de prolongaciones: alas menores, alas mayores y apófisis pterigoides.',
      'Articula con casi todos los huesos del neurocráneo y con varios del viscerocráneo.',
    ],
    accidentesAnatomicos: [
      'Silla turca y fosa hipofisaria en la cara superior del cuerpo.',
      'Conducto óptico (nervio óptico II y arteria oftálmica) y fisura orbitaria superior (III, IV, V1, VI y vena oftálmica superior).',
      'Foramen redondo (nervio maxilar V2), foramen oval (nervio mandibular V3) y foramen espinoso (arteria meníngea media).',
      'Apófisis pterigoides con láminas medial y lateral, fosa pterigoidea, fosa escafoidea y gancho pterigoideo (hamulus).',
    ],
    articulacionesYRelaciones: [
      'Con todos los huesos del neurocráneo (frontal, etmoides, parietales, temporales, occipital) y con vómer, palatinos, cigomáticos y maxilares.',
      'Relación íntima con el seno cavernoso, quiasma óptico, hipófisis y las tres divisiones del nervio trigémino.',
    ],
    relevanciaOdontologica: [
      'Sus forámenes basales transmiten las ramas sensoriales y motoras odontológicas del trigémino: V2 por el foramen redondo (hacia la fosa pterigopalatina) y V3 por el foramen oval (hacia la fosa infratemporal).',
      'Las láminas pterigoideas y la fosa pterigoidea prestan inserción a los músculos pterigoideos medial y lateral, esenciales en la elevación, protrusión y lateralidad mandibular.',
      'El gancho pterigoideo (hamulus) sirve de polea al músculo tensor del velo del paladar y de referencia anatómica posterior al surco hamular para el límite posterior de prótesis totales superiores.',
      'El centro de la silla turca (punto Sella, S) define el plano S-N en cefalometría ortodóncica.',
    ],
    bibliografia: BIBLIO_CLINICA_MOORE,
  },
  {
    id: 'ethmoid-bone',
    nombre: 'Hueso etmoides',
    nombreGrupo: 'Hueso etmoides',
    nombreLatino: 'Os ethmoidale',
    fmaId: 'FMA52740',
    region: 'neurocraneo',
    lateralidad: 'Impar (plano medio)',
    ubicacion: 'Porción anterior y medial de la base del cráneo (escotadura etmoidal del frontal), participando en las órbitas y en el techo, tabique y paredes laterales de las cavidades nasales.',
    caracteristicas: [
      'Hueso impar, esponjoso y neumático, formado por cuatro partes: lámina horizontal (cribosa), lámina perpendicular y dos laberintos (masas laterales) con celdillas etmoidales.',
      'Su lámina papirácea forma gran parte de la pared medial de la órbita.',
    ],
    accidentesAnatomicos: [
      'Apófisis crista galli (inserción anterior de la hoz del cerebro).',
      'Lámina cribosa con numerosos forámenes olfatorios (paso de filetes del nervio olfatorio, I par).',
      'Lámina perpendicular (forma la porción posterosuperior del tabique nasal óseo).',
      'Cornetes nasales superior y medio, bulla etmoidal y apófisis unciforme en los laberintos etmoidales.',
    ],
    articulacionesYRelaciones: [
      'Con el frontal, esfenoides, nasales, maxilares, lagrimales, palatinos, cornetes inferiores y vómer.',
      'Los senos paranasales anteriores drenan hacia el hiato semilunar debajo de la bulla etmoidal (meato medio).',
    ],
    relevanciaOdontologica: [
      'El complejo osteomeatal (entre cornete medio, apófisis unciforme y bulla etmoidal) regula el drenaje mucociliar del seno maxilar; su obstrucción predispone a sinusitis maxilar odontógena o rinógena.',
      'El nervio etmoidal anterior (rama de V1) contribuye a la sensibilidad de la mucosa septal y dorso nasal.',
      'Su lámina orbitaria muy delgada explica la rápida propagación hacia la órbita de infecciones sinusales graves o fracturas nasoorbitoetmoidales.',
    ],
    bibliografia: BIBLIO_BASE,
  },
  crearNasal('right'),
  crearNasal('left'),
  crearLagrimal('right'),
  crearLagrimal('left'),
  crearCigomatico('right'),
  crearCigomatico('left'),
  crearMaxilar('right'),
  crearMaxilar('left'),
  crearPalatino('right'),
  crearPalatino('left'),
  crearCorneteInferior('right'),
  crearCorneteInferior('left'),
  {
    id: 'vomer',
    nombre: 'Hueso vómer',
    nombreGrupo: 'Vómer',
    nombreLatino: 'Vomer',
    fmaId: 'FMA9710',
    region: 'viscerocraneo',
    lateralidad: 'Impar (plano medio)',
    ubicacion: 'Plano medio sagital de la cavidad nasal, formando la porción posteroinferior del tabique nasal óseo.',
    caracteristicas: [
      'Hueso impar, mediano, delgado y cuadrilátero, comparado con una reja de arado.',
      'Sus caras laterales están surcadas por impresiones vasculonerviosas, especialmente el surco del nervio y vasos nasopalatinos.',
    ],
    accidentesAnatomicos: [
      'Alas del vómer en su borde superior (articulación en esquindilesis con la cresta esfenoidal inferior).',
      'Surco del nervio nasopalatino dirigido oblicuamente hacia abajo y adelante hacia el conducto incisivo.',
      'Borde posterior libre que separa ambas coanas (aberturas nasales posteriores).',
    ],
    articulacionesYRelaciones: [
      'Por arriba con el cuerpo del esfenoides (esquindilesis esfenovomeriana).',
      'Por delante y arriba con la lámina perpendicular del etmoides y el cartílago del tabique nasal.',
      'Por abajo con la cresta nasal formada por las apófisis palatinas de ambos maxilares y las láminas horizontales de ambos palatinos.',
    ],
    relevanciaOdontologica: [
      'Su inserción inferior sobre la cresta nasal del maxilar debe desinsertarse cuidadosamente durante el descenso maxilar en osteotomías Le Fort I para evitar desviaciones del tabique nasal.',
      'El trayecto del nervio nasopalatino a lo largo del vómer explica la continuidad sensitiva hacia la mucosa palatina anterior retroincisiva.',
    ],
    bibliografia: BIBLIO_BASE,
  },
  {
    id: 'mandible',
    nombre: 'Mandíbula (maxilar inferior)',
    nombreGrupo: 'Mandíbula',
    nombreLatino: 'Mandibula',
    fmaId: 'FMA52748',
    region: 'viscerocraneo',
    lateralidad: 'Impar (plano medio)',
    ubicacion: 'Tercio inferior del macizo facial; único hueso móvil del cráneo, suspendido del hueso temporal mediante ambas articulaciones temporomandibulares.',
    caracteristicas: [
      'Hueso impar, simétrico y en forma de herradura, constituido por un cuerpo horizontal y dos ramas ascendentes.',
      'Presenta corticales externa e interna muy densas (especialmente en el sector posterior y borde basilar) que alojan el conducto mandibular.',
      'Aloja las piezas dentarias inferiores en su porción alveolar.',
    ],
    accidentesAnatomicos: [
      'Cuerpo: sínfisis y protuberancia mentoniana, forámenes mentonianos (altura de premolares), línea oblicua externa, línea milohioidea (interna), fositas sublingual y submandibular y espinas mentonianas (apófisis geni).',
      'Ramas: ángulo mandibular (gonion), tuberosidad maseterina (externa) y pterigoidea (interna), apófisis coronoides (inserción del músculo temporal), escotadura mandibular y cóndilo mandibular (cabeza y cuello con fosita pterigoidea).',
      'Cara medial de la rama: língula mandibular (espina de Spix) y foramen mandibular (entrada del paquete alveolar inferior).',
    ],
    articulacionesYRelaciones: [
      'Articulación temporomandibular (ATM) bilateral con la fosa mandibular y tubérculo articular de cada hueso temporal.',
      'Inserción de todos los músculos masticadores (temporal, masetero, pterigoideo medial, pterigoideo lateral) y suprahioideos (milohioideo, genihioideo, digástrico).',
      'Relación íntima del conducto mandibular (nervio y vasos alveolares inferiores) con los ápices de molares y premolares inferiores.',
    ],
    relevanciaOdontologica: [
      'La língula mandibular (espina de Spix) y la depresión pterigomandibular son los reparos anatómicos esenciales para el bloqueo troncular del nervio alveolar inferior (anestesia regional mandibular).',
      'El foramen mentoniano marca la salida de los ramos mentoniano e incisivo (V3), zona crítica de seguridad en cirugía periodontal, endodoncia quirúrgica e implantes premolares.',
      'El grosor cortical de la mandíbula impide en adultos la anestesia infiltrativa eficaz en molares inferiores, a diferencia del maxilar superior.',
      'Puntos cefalométricos esenciales: Menton (Me), Gnathion (Gn), Pogonion (Pg), Punto B (supramentoniano), Gonion (Go) y Condilion (Co).',
    ],
    bibliografia: BIBLIO_CLINICA_MOORE,
  },
];

export const CRANEO_MAP_BY_ID: Record<string, CraneoEstructuraInfo> = Object.fromEntries(
  CRANEO_ESTRUCTURAS.map((item) => [item.id, item])
);

const ALIAS_EXACT: Record<string, string> = {
  frontal: 'frontal-bone',
  'os frontale': 'frontal-bone',
  'hueso frontal': 'frontal-bone',
  occipital: 'occipital-bone',
  'os occipitale': 'occipital-bone',
  'hueso occipital': 'occipital-bone',
  sphenoid: 'sphenoid-bone',
  esfenoides: 'sphenoid-bone',
  'os sphenoidale': 'sphenoid-bone',
  ethmoid: 'ethmoid-bone',
  etmoides: 'ethmoid-bone',
  'os ethmoidale': 'ethmoid-bone',
  vomer: 'vomer',
  mandible: 'mandible',
  mandibula: 'mandible',
  'lower jaw': 'mandible',
  'parietal_r': 'right-parietal-bone',
  'parietal_l': 'left-parietal-bone',
  'temporal_r': 'right-temporal-bone',
  'temporal_l': 'left-temporal-bone',
  'nasal_r': 'right-nasal-bone',
  'nasal_l': 'left-nasal-bone',
  'lacrimal_r': 'right-lacrimal-bone',
  'lacrimal_l': 'left-lacrimal-bone',
  'zygomatic_r': 'right-zygomatic-bone',
  'zygomatic_l': 'left-zygomatic-bone',
  'maxilla_r': 'right-maxilla',
  'maxilla_l': 'left-maxilla',
  'palatine_r': 'right-palatine-bone',
  'palatine_l': 'left-palatine-bone',
};

/**
 * Resuelve información anatómica verificada a partir del nombre del nodo/malla GLB o su structureId.
 * Si un archivo externo contiene un nombre no reconocido, devuelve null (sin inventar datos).
 */
export function resolveCraneoEstructura(
  rawName?: string | null,
  structureId?: string | null
): CraneoEstructuraInfo | null {
  const candidates = [structureId, rawName]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase());

  for (const c of candidates) {
    if (CRANEO_MAP_BY_ID[c]) return CRANEO_MAP_BY_ID[c];
    const normalized = c.replace(/[_\s]+/g, '-');
    if (CRANEO_MAP_BY_ID[normalized]) return CRANEO_MAP_BY_ID[normalized];
    if (ALIAS_EXACT[c]) return CRANEO_MAP_BY_ID[ALIAS_EXACT[c]];
  }

  for (const c of candidates) {
    const isRight = /\b(right|der|derecha|derecho|dexter|_r|r_)\b/.test(c);
    const isLeft = /\b(left|izq|izquierda|izquierdo|sinister|_l|l_)\b/.test(c);

    if (/parietal/.test(c)) return CRANEO_MAP_BY_ID[isLeft ? 'left-parietal-bone' : 'right-parietal-bone'];
    if (/temporal/.test(c)) return CRANEO_MAP_BY_ID[isLeft ? 'left-temporal-bone' : 'right-temporal-bone'];
    if (/nasal/.test(c) && !/concha|cornete/.test(c))
      return CRANEO_MAP_BY_ID[isLeft ? 'left-nasal-bone' : 'right-nasal-bone'];
    if (/lacrimal|unguis/.test(c))
      return CRANEO_MAP_BY_ID[isLeft ? 'left-lacrimal-bone' : 'right-lacrimal-bone'];
    if (/zygomatic|cigomat|malar/.test(c))
      return CRANEO_MAP_BY_ID[isLeft ? 'left-zygomatic-bone' : 'right-zygomatic-bone'];
    if (/maxil/.test(c) && !/mandib/.test(c))
      return CRANEO_MAP_BY_ID[isLeft ? 'left-maxilla' : 'right-maxilla'];
    if (/palatin/.test(c))
      return CRANEO_MAP_BY_ID[isLeft ? 'left-palatine-bone' : 'right-palatine-bone'];
    if (/concha|cornete/.test(c))
      return CRANEO_MAP_BY_ID[
        isLeft ? 'left-inferior-nasal-concha' : 'right-inferior-nasal-concha'
      ];
    if (/frontal/.test(c)) return CRANEO_MAP_BY_ID['frontal-bone'];
    if (/occipital/.test(c)) return CRANEO_MAP_BY_ID['occipital-bone'];
    if (/sphenoid|esfenoid/.test(c)) return CRANEO_MAP_BY_ID['sphenoid-bone'];
    if (/ethmoid|etmoid/.test(c)) return CRANEO_MAP_BY_ID['ethmoid-bone'];
    if (/vomer|vómer/.test(c)) return CRANEO_MAP_BY_ID['vomer'];
    if (/mandib/.test(c)) return CRANEO_MAP_BY_ID['mandible'];
    void isRight;
  }

  return null;
}
