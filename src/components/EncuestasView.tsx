import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  Download,
  FileSpreadsheet,
  PieChart,
  Plus,
  Table2,
  Trash2,
} from 'lucide-react';
import { createBlankEncuesta, ENCUESTA_QUESTIONS } from '../data/encuestaSchema';
import type { EncuestaSocial } from '../types/dental';
import {
  EncuestaChartCard,
  type EncuestaChartMetric,
  type EncuestaChartType,
  type TabulatedQuestion,
} from './EncuestaCharts';

interface EncuestasViewProps {
  encuestas: EncuestaSocial[];
  onAddEncuesta: (enc: EncuestaSocial) => void;
  onUpdateEncuesta: (enc: EncuestaSocial) => void;
  onDeleteEncuesta: (id: string) => void;
}

type EncuestasSubTab = 'tabulacion' | 'nueva' | 'registros';
type TabulacionVista = 'ambos' | 'cuadro' | 'graficos';
type CuadroAgrupacion = 'unico' | 'bloques';
type BloqueFiltro = 'todos' | 'socio' | 'vivienda' | 'salud';

const BLOQUES_ENCUESTA: Array<{ id: Exclude<BloqueFiltro, 'todos'>; titulo: string; range: [number, number] }> = [
  { id: 'socio', titulo: 'Cuadro 1 · Perfil Sociodemográfico (P1–P6)', range: [1, 6] },
  { id: 'vivienda', titulo: 'Cuadro 2 · Vivienda y Servicios Básicos (P7)', range: [7, 7] },
  { id: 'salud', titulo: 'Cuadro 3 · Cobertura, Atención e Higiene Bucal (P8–P16)', range: [8, 16] },
];

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvContent = '\uFEFF' + rows.map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const EncuestasView: React.FC<EncuestasViewProps> = ({
  encuestas,
  onAddEncuesta,
  onUpdateEncuesta,
  onDeleteEncuesta,
}) => {
  const [subTab, setSubTab] = useState<EncuestasSubTab>('tabulacion');
  const [draft, setDraft] = useState<EncuestaSocial>(() => createBlankEncuesta());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  // Filters & view preferences for tabulation
  const [filterCentro, setFilterCentro] = useState<string>('todos');
  const [filterComision, setFilterComision] = useState<string>('todas');
  const [vistaTabulacion, setVistaTabulacion] = useState<TabulacionVista>('ambos');
  const [cuadroAgrupacion, setCuadroAgrupacion] = useState<CuadroAgrupacion>('unico');
  const [bloqueFiltro, setBloqueFiltro] = useState<BloqueFiltro>('todos');
  const [chartType, setChartType] = useState<EncuestaChartType>('barra');
  const [chartMetric, setChartMetric] = useState<EncuestaChartMetric>('porcentaje');

  const uniqueCentros = useMemo(
    () => Array.from(new Set(encuestas.map((e) => e.centroAps).filter(Boolean))).sort(),
    [encuestas]
  );

  const uniqueComisiones = useMemo(
    () => Array.from(new Set(encuestas.map((e) => e.comision).filter(Boolean))).sort(),
    [encuestas]
  );

  const filteredEncuestas = useMemo(() => {
    return encuestas.filter((e) => {
      if (filterCentro !== 'todos' && e.centroAps !== filterCentro) return false;
      if (filterComision !== 'todas' && e.comision !== filterComision) return false;
      return true;
    });
  }, [encuestas, filterCentro, filterComision]);

  const tabulation = useMemo<TabulatedQuestion[]>(() => {
    const total = filteredEncuestas.length;
    return ENCUESTA_QUESTIONS.map((q) => {
      const counts: Record<string, number> = {};
      q.opciones.forEach((op) => {
        counts[op] = 0;
      });
      let sinRespuesta = 0;

      filteredEncuestas.forEach((enc) => {
        const val = enc[q.id];
        if (Array.isArray(val)) {
          if (val.length === 0) {
            sinRespuesta += 1;
          } else {
            val.forEach((item) => {
              counts[item] = (counts[item] || 0) + 1;
            });
          }
        } else if (!val) {
          sinRespuesta += 1;
        } else {
          counts[val] = (counts[val] || 0) + 1;
        }
      });

      const rows = q.opciones.map((opcion) => {
        const count = counts[opcion] || 0;
        const pct = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
        return { opcion, count, pct };
      });

      return {
        question: q,
        total,
        sinRespuesta,
        rows,
      };
    });
  }, [filteredEncuestas]);

  const visibleTabulation = useMemo(() => {
    if (bloqueFiltro === 'todos') return tabulation;
    const block = BLOQUES_ENCUESTA.find((b) => b.id === bloqueFiltro);
    if (!block) return tabulation;
    return tabulation.filter(
      (item) =>
        item.question.numero >= block.range[0] && item.question.numero <= block.range[1]
    );
  }, [tabulation, bloqueFiltro]);

  const kpis = useMemo(() => {
    const total = filteredEncuestas.length;
    if (total === 0) {
      return { total: 0, obraSocialPct: 0, atencion6mPct: 0, cepillado2PlusPct: 0 };
    }
    const conObra = filteredEncuestas.filter((e) => e.tieneObraSocial === 'Sí').length;
    const conAtencion = filteredEncuestas.filter((e) => e.atencionUltimos6Meses === 'Sí').length;
    const cepillado2Plus = filteredEncuestas.filter(
      (e) => e.cepilladoVecesDia === '2 veces' || e.cepilladoVecesDia === '3 o más veces'
    ).length;

    return {
      total,
      obraSocialPct: Number(((conObra / total) * 100).toFixed(1)),
      atencion6mPct: Number(((conAtencion / total) * 100).toFixed(1)),
      cepillado2PlusPct: Number(((cepillado2Plus / total) * 100).toFixed(1)),
    };
  }, [filteredEncuestas]);

  const handleToggleMulti = (field: 'serviciosHogar' | 'accesoriosHigiene', option: string) => {
    setDraft((prev) => {
      const exists = prev[field].includes(option);
      return {
        ...prev,
        [field]: exists ? prev[field].filter((x) => x !== option) : [...prev[field], option],
      };
    });
  };

  const handleSubmitEncuesta = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateEncuesta({ ...draft, id: editingId });
      setEditingId(null);
    } else {
      onAddEncuesta({ ...draft, id: `enc-${Date.now().toString(36)}` });
    }
    setDraft(createBlankEncuesta());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2400);
    setSubTab('tabulacion');
  };

  const handleEditSurvey = (enc: EncuestaSocial) => {
    setDraft(JSON.parse(JSON.stringify(enc)));
    setEditingId(enc.id);
    setSubTab('nueva');
  };

  const handleExportTabulationCsv = () => {
    const rows: string[][] = [['N° Pregunta', 'Pregunta', 'Opción', 'Frecuencia (n)', 'Porcentaje (%)']];
    tabulation.forEach((item) => {
      item.rows.forEach((r) => {
        rows.push([
          String(item.question.numero),
          item.question.titulo,
          r.opcion,
          String(r.count),
          `${r.pct}%`,
        ]);
      });
      if (item.sinRespuesta > 0) {
        const pct = item.total > 0 ? ((item.sinRespuesta / item.total) * 100).toFixed(1) : '0.0';
        rows.push([
          String(item.question.numero),
          item.question.titulo,
          'Sin respuesta',
          String(item.sinRespuesta),
          `${pct}%`,
        ]);
      }
    });
    downloadCsv(`tabulacion-encuesta-ops-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportRawCsv = () => {
    const headers = [
      'N° Encuesta',
      'Fecha',
      'Centro APS',
      'Comisión',
      'Año',
      ...ENCUESTA_QUESTIONS.map((q) => `${q.numero}. ${q.titulo}`),
    ];
    const rows = [
      headers,
      ...filteredEncuestas.map((enc) => [
        enc.numeroEncuesta,
        enc.createdAt,
        enc.centroAps,
        enc.comision,
        enc.anio,
        ...ENCUESTA_QUESTIONS.map((q) => {
          const val = enc[q.id];
          if (Array.isArray(val)) return val.join('; ');
          if (q.id === 'paisOrigen' && val === 'Otro' && enc.paisOtro) {
            return `Otro (${enc.paisOtro})`;
          }
          return val || '';
        }),
      ]),
    ];
    downloadCsv(`encuestas-ops-base-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rose-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-rose-950">
            Encuesta
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-rose-200/70 bg-rose-50 p-1">
            <button
              type="button"
              onClick={() => setSubTab('tabulacion')}
              className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                subTab === 'tabulacion'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={14} />
              <span>Tabulación ({encuestas.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(createBlankEncuesta());
                setSubTab('nueva');
              }}
              className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                subTab === 'nueva'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus size={14} />
              <span>{editingId ? 'Editando Encuesta' : 'Cargar Encuesta'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('registros')}
              className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                subTab === 'registros'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Registros ({encuestas.length})</span>
            </button>
          </div>
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        >
          <Check size={15} />
          <span>Encuesta guardada y tabulación actualizada automáticamente.</span>
        </div>
      )}

      {/* TAB 1: TABULACIÓN */}
      {subTab === 'tabulacion' && (
        <div className="space-y-6">
          {/* Filter and Export Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label htmlFor="filtro-aps" className="block text-[11px] font-medium text-slate-500">
                  Centro de APS N°
                </label>
                <select
                  id="filtro-aps"
                  value={filterCentro}
                  onChange={(e) => setFilterCentro(e.target.value)}
                  className="mt-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800"
                >
                  <option value="todos">Todos los centros</option>
                  {uniqueCentros.map((c) => (
                    <option key={c} value={c}>
                      APS N° {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filtro-com" className="block text-[11px] font-medium text-slate-500">
                  Comisión
                </label>
                <select
                  id="filtro-com"
                  value={filterComision}
                  onChange={(e) => setFilterComision(e.target.value)}
                  className="mt-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800"
                >
                  <option value="todas">Todas las comisiones</option>
                  {uniqueComisiones.map((com) => (
                    <option key={com} value={com}>
                      {com}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportTabulationCsv}
                disabled={filteredEncuestas.length === 0}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
              >
                <FileSpreadsheet size={15} />
                <span>Exportar Tabulación CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportRawCsv}
                disabled={filteredEncuestas.length === 0}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950 disabled:opacity-40"
              >
                <Download size={15} />
                <span>Exportar Base Cruda CSV</span>
              </button>
            </div>
          </div>

          {filteredEncuestas.length === 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-white p-10 text-center">
              <h2 className="text-base font-semibold text-slate-900">
                No hay encuestas cargadas para tabular
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Carga la primera Encuesta Social OPS para ver las frecuencias y porcentajes calculados automáticamente.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('nueva')}
                className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-rose-900 px-5 text-xs font-semibold text-white hover:bg-rose-950"
              >
                <Plus size={15} />
                <span>Cargar primera encuesta</span>
              </button>
            </div>
          ) : (
            <>
              {/* 4-column Summary KPI Row */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Total encuestas (N)</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{kpis.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Con Obra Social</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {kpis.obraSocialPct}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Atención últimos 6 meses</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {kpis.atencion6mPct}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Cepillado ≥ 2 veces/día</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {kpis.cepillado2PlusPct}%
                  </p>
                </div>
              </div>

              {/* View Mode & Chart Type Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Mostrar:</span>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(
                      [
                        { id: 'ambos', label: 'Cuadros y Gráficos' },
                        { id: 'cuadro', label: 'Solo Cuadros' },
                        { id: 'graficos', label: 'Solo Gráficos' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setVistaTabulacion(opt.id)}
                        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          vistaTabulacion === opt.id
                            ? 'bg-white text-rose-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Dentro del gráfico:</span>
                    <div
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
                      role="group"
                      aria-label="Selector global de valor dentro de los gráficos"
                    >
                      <button
                        type="button"
                        onClick={() => setChartMetric('numero')}
                        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          chartMetric === 'numero'
                            ? 'bg-white text-rose-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Número (n)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMetric('porcentaje')}
                        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          chartMetric === 'porcentaje'
                            ? 'bg-white text-rose-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Porcentaje (%)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Gráficos en:</span>
                    <div
                      className="inline-flex items-center rounded-lg border border-rose-200/80 bg-rose-50/70 p-0.5"
                      role="group"
                      aria-label="Selector global de tipo de gráfico"
                    >
                      <button
                        type="button"
                        onClick={() => setChartType('barra')}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          chartType === 'barra'
                            ? 'bg-rose-900 text-white shadow-xs'
                            : 'text-slate-700 hover:text-rose-950'
                        }`}
                      >
                        <BarChart3 size={14} />
                        <span>Barras</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartType('torta')}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          chartType === 'torta'
                            ? 'bg-rose-900 text-white shadow-xs'
                            : 'text-slate-700 hover:text-rose-950'
                        }`}
                      >
                        <PieChart size={14} />
                        <span>Torta</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consolidated Tabulation Tables */}
              {(vistaTabulacion === 'ambos' || vistaTabulacion === 'cuadro') && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Table2 size={18} className="text-rose-900" />
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Cuadro Consolidado de Tabulación (Total)
                        </h2>
                        <p className="text-xs text-slate-500 tabular-nums">
                          Todas las variables agrupadas sobre N = {filteredEncuestas.length}{' '}
                          {filteredEncuestas.length === 1 ? 'encuesta' : 'encuestas'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => setCuadroAgrupacion('unico')}
                          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                            cuadroAgrupacion === 'unico'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Cuadro único total
                        </button>
                        <button
                          type="button"
                          onClick={() => setCuadroAgrupacion('bloques')}
                          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                            cuadroAgrupacion === 'bloques'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          3 cuadros por bloque
                        </button>
                      </div>

                      {cuadroAgrupacion === 'unico' && (
                        <select
                          aria-label="Filtrar bloque del cuadro"
                          value={bloqueFiltro}
                          onChange={(e) => setBloqueFiltro(e.target.value as BloqueFiltro)}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                        >
                          <option value="todos">Todas las preguntas (P1–P16)</option>
                          <option value="socio">Sociodemográfico (P1–P6)</option>
                          <option value="vivienda">Vivienda y Servicios (P7)</option>
                          <option value="salud">Cobertura y Hábitos (P8–P16)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {(cuadroAgrupacion === 'unico'
                    ? [
                        {
                          id: 'tabla-unica',
                          titulo:
                            bloqueFiltro === 'todos'
                              ? 'Tabla Maestra Consolidada · Preguntas 1 a 16'
                              : BLOQUES_ENCUESTA.find((b) => b.id === bloqueFiltro)?.titulo ??
                                'Tabla Consolidada',
                          items: visibleTabulation,
                        },
                      ]
                    : BLOQUES_ENCUESTA.map((b) => ({
                        id: b.id,
                        titulo: b.titulo,
                        items: tabulation.filter(
                          (item) =>
                            item.question.numero >= b.range[0] &&
                            item.question.numero <= b.range[1]
                        ),
                      }))
                  ).map((cuadro) => (
                    <div
                      key={cuadro.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-rose-50/50 px-4 py-3">
                        <h3 className="text-sm font-semibold text-rose-950">{cuadro.titulo}</h3>
                        <span className="text-xs font-medium text-slate-600 tabular-nums">
                          Base total: N = {filteredEncuestas.length}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                              <th className="w-12 px-3 py-2.5 text-center font-semibold">N°</th>
                              <th className="w-64 px-3 py-2.5 font-semibold">Variable / Pregunta</th>
                              <th className="px-3 py-2.5 font-semibold">Categoría / Opción</th>
                              <th className="w-24 px-3 py-2.5 text-right font-semibold">
                                Frecuencia (n)
                              </th>
                              <th className="w-24 px-3 py-2.5 text-right font-semibold">
                                Porcentaje (%)
                              </th>
                              <th className="w-36 px-3 py-2.5 font-semibold">Distribución</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cuadro.items.map(({ question, total, sinRespuesta, rows }, qIdx) => {
                              const totalRowsForQuestion =
                                rows.length + (sinRespuesta > 0 ? 1 : 0);
                              const rowBandClass =
                                qIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white';

                              return (
                                <React.Fragment key={question.id}>
                                  {rows.map((r, rIdx) => (
                                    <tr
                                      key={r.opcion}
                                      className={`${rowBandClass} ${
                                        rIdx === 0 && qIdx > 0
                                          ? 'border-t border-slate-300'
                                          : 'border-t border-slate-100'
                                      } hover:bg-rose-50/30`}
                                    >
                                      {rIdx === 0 && (
                                        <>
                                          <td
                                            rowSpan={totalRowsForQuestion}
                                            className="border-r border-slate-100 px-3 py-2.5 text-center align-top font-mono font-bold tabular-nums text-rose-900"
                                          >
                                            {question.numero}
                                          </td>
                                          <td
                                            rowSpan={totalRowsForQuestion}
                                            className="border-r border-slate-200 px-3 py-2.5 align-top"
                                          >
                                            <div className="font-semibold text-slate-900">
                                              {question.titulo}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                                              {question.multiple
                                                ? 'Selección múltiple'
                                                : 'Respuesta única'}{' '}
                                              · N = {total}
                                            </div>
                                          </td>
                                        </>
                                      )}
                                      <td className="px-3 py-2 font-medium text-slate-800">
                                        {r.opcion}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                                        {r.count}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                                        {r.pct.toFixed(1)}%
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100">
                                          <div
                                            className="h-full rounded-full bg-rose-900 transition-all"
                                            style={{ width: `${Math.min(100, r.pct)}%` }}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                  {sinRespuesta > 0 && (
                                    <tr
                                      className={`${rowBandClass} border-t border-slate-100 text-slate-400`}
                                    >
                                      <td className="px-3 py-2 italic">Sin respuesta</td>
                                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                                        {sinRespuesta}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                                        {total > 0
                                          ? ((sinRespuesta / total) * 100).toFixed(1)
                                          : '0.0'}
                                        %
                                      </td>
                                      <td className="px-3 py-2" />
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-300 bg-rose-50/40 font-semibold text-slate-800">
                              <td colSpan={3} className="px-3 py-2.5">
                                Total de encuestas tabuladas en este cuadro
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                                {filteredEncuestas.length}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                                100.0%
                              </td>
                              <td className="px-3 py-2.5" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Interactive Charts Section (Bar / Pie Switchable) */}
              {(vistaTabulacion === 'ambos' || vistaTabulacion === 'graficos') && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {chartType === 'barra' ? (
                        <BarChart3 size={18} className="text-rose-900" />
                      ) : (
                        <PieChart size={18} className="text-rose-900" />
                      )}
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Gráficos de Encuesta ({chartType === 'barra' ? 'Barras' : 'Torta'})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Elegí visualización en barras o torta de forma general o por cada gráfico.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Filtrar bloque de gráficos"
                        value={bloqueFiltro}
                        onChange={(e) => setBloqueFiltro(e.target.value as BloqueFiltro)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                      >
                        <option value="todos">Todas las variables (16)</option>
                        <option value="socio">Sociodemográfico (P1–P6)</option>
                        <option value="vivienda">Vivienda y Servicios (P7)</option>
                        <option value="salud">Cobertura y Hábitos (P8–P16)</option>
                      </select>

                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => setChartMetric('numero')}
                          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            chartMetric === 'numero'
                              ? 'bg-white text-rose-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Número (n)
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartMetric('porcentaje')}
                          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            chartMetric === 'porcentaje'
                              ? 'bg-white text-rose-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Porcentaje (%)
                        </button>
                      </div>

                      <div className="inline-flex items-center rounded-lg border border-rose-200/80 bg-rose-50/70 p-0.5">
                        <button
                          type="button"
                          onClick={() => setChartType('barra')}
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                            chartType === 'barra'
                              ? 'bg-rose-900 text-white shadow-xs'
                              : 'text-slate-700 hover:text-rose-950'
                          }`}
                        >
                          <BarChart3 size={13} />
                          <span>Barras</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartType('torta')}
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                            chartType === 'torta'
                              ? 'bg-rose-900 text-white shadow-xs'
                              : 'text-slate-700 hover:text-rose-950'
                          }`}
                        >
                          <PieChart size={13} />
                          <span>Torta</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {visibleTabulation.map((item) => (
                      <EncuestaChartCard
                        key={item.question.id}
                        item={item}
                        globalChartType={chartType}
                        globalMetric={chartMetric}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: NUEVA / EDITAR ENCUESTA */}
      {subTab === 'nueva' && (
        <form onSubmit={handleSubmitEncuesta} className="space-y-6">
          {/* Header Metadata */}
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="enc-centro" className="block text-xs font-medium text-slate-700">
                Centro de APS N°
              </label>
              <input
                id="enc-centro"
                type="text"
                value={draft.centroAps}
                onChange={(e) => setDraft({ ...draft, centroAps: e.target.value })}
                placeholder="Ej. 14"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="enc-num" className="block text-xs font-medium text-slate-700">
                N° de Encuesta
              </label>
              <input
                id="enc-num"
                type="text"
                value={draft.numeroEncuesta}
                onChange={(e) => setDraft({ ...draft, numeroEncuesta: e.target.value })}
                placeholder="Ej. 004"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="enc-com" className="block text-xs font-medium text-slate-700">
                Comisión
              </label>
              <input
                id="enc-com"
                type="text"
                value={draft.comision}
                onChange={(e) => setDraft({ ...draft, comision: e.target.value })}
                placeholder="Ej. Comisión 3"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="enc-anio" className="block text-xs font-medium text-slate-700">
                Año
              </label>
              <input
                id="enc-anio"
                type="text"
                value={draft.anio}
                onChange={(e) => setDraft({ ...draft, anio: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums text-slate-900"
              />
            </div>
          </div>

          {/* 16 Questions */}
          <div className="space-y-4">
            {ENCUESTA_QUESTIONS.map((q) => {
              const currentValue = draft[q.id];
              return (
                <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-rose-900">
                      {q.numero}.- {q.titulo}
                    </h3>
                    {q.multiple && (
                      <span className="text-xs text-slate-500">Selección múltiple</span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {q.opciones.map((opcion) => {
                      const isSelected = Array.isArray(currentValue)
                        ? currentValue.includes(opcion)
                        : currentValue === opcion;

                      return (
                        <button
                          key={opcion}
                          type="button"
                          onClick={() => {
                            if (q.multiple && (q.id === 'serviciosHogar' || q.id === 'accesoriosHigiene')) {
                              handleToggleMulti(q.id, opcion);
                            } else {
                              setDraft((prev) => ({
                                ...prev,
                                [q.id]: prev[q.id] === opcion ? '' : opcion,
                              }));
                            }
                          }}
                          className={`flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                            isSelected
                              ? 'border-rose-900 bg-rose-50 text-rose-950'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-rose-50/40'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${
                              isSelected
                                ? 'border-rose-900 bg-rose-900 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span>{opcion}</span>
                        </button>
                      );
                    })}
                  </div>

                  {q.id === 'paisOrigen' && draft.paisOrigen === 'Otro' && (
                    <div className="mt-3">
                      <label htmlFor="pais-otro" className="block text-xs font-medium text-slate-600">
                        ¿Cuál país?
                      </label>
                      <input
                        id="pais-otro"
                        type="text"
                        value={draft.paisOtro}
                        onChange={(e) => setDraft({ ...draft, paisOtro: e.target.value })}
                        placeholder="Especificar país..."
                        className="mt-1 h-10 w-full max-w-sm rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-rose-200/80 pt-4">
            <button
              type="button"
              onClick={() => setSubTab('tabulacion')}
              className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-rose-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-lg bg-rose-900 px-6 text-xs font-semibold text-white hover:bg-rose-950"
            >
              {editingId ? 'Guardar cambios y tabular' : 'Guardar encuesta y tabular'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: REGISTROS INDIVIDUALES */}
      {subTab === 'registros' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {encuestas.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Aún no hay encuestas registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">N°</th>
                    <th className="px-4 py-3 font-semibold">APS N°</th>
                    <th className="px-4 py-3 font-semibold">Comisión</th>
                    <th className="px-4 py-3 font-semibold">Género / Edad</th>
                    <th className="px-4 py-3 font-semibold">Obra Social</th>
                    <th className="px-4 py-3 font-semibold">Cepillado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {encuestas.map((enc) => (
                    <tr key={enc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-semibold tabular-nums text-slate-900">
                        {enc.numeroEncuesta || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">
                        {enc.centroAps || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{enc.comision || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {enc.genero || '—'} · {enc.edad || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{enc.tieneObraSocial || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{enc.cepilladoVecesDia || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditSurvey(enc)}
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEncuesta(enc.id)}
                            aria-label={`Eliminar encuesta ${enc.numeroEncuesta}`}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
