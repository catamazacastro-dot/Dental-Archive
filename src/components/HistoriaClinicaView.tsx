import React, { useMemo } from 'react';
import {
  Check,
  ImagePlus,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { createBlankPaciente } from '../data/encuestaSchema';
import type {
  CasoClinicoEtapa,
  EvolucionRow,
  PacienteRecord,
  PlanRowEstado,
  RadiografiasState,
  YesNo,
} from '../types/dental';
import { computeDentalIndices, OdontogramaInteractive } from './OdontogramaInteractive';
import { OLearyInteractive } from './OLearyInteractive';

interface HistoriaClinicaViewProps {
  pacientes: PacienteRecord[];
  selectedId: string;
  onSelectId: (id: string) => void;
  onAddPaciente: (pac: PacienteRecord) => void;
  onUpdatePaciente: (pac: PacienteRecord) => void;
  onDeletePaciente: (id: string) => void;
}

const ANTECEDENTES_LIST: {
  key: keyof PacienteRecord['antecedentes'];
  label: string;
}[] = [
  { key: 'trastornosPsiquiatricos', label: 'Trastornos psiquiátricos' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'dolenciaCardiaca', label: 'Dolencia cardíaca' },
  { key: 'hemofilia', label: 'Hemofilia' },
  { key: 'problemasNeurologicos', label: 'Problemas neurológicos' },
  { key: 'problemasRenales', label: 'Problemas renales' },
  { key: 'dialisis', label: 'Diálisis' },
  { key: 'hepatitis', label: 'Hepatitis' },
  { key: 'tuberculosis', label: 'Tuberculosis' },
  { key: 'neumonia', label: 'Neumonía' },
  { key: 'sifilis', label: 'Sífilis' },
  { key: 'hipertension', label: 'Hipertensión' },
  { key: 'hiv', label: 'HIV' },
];

const RX_SLOTS: { key: keyof RadiografiasState; label: string }[] = [
  { key: 'preoperatoria', label: 'Rx Preoperatoria' },
  { key: 'intermedia1', label: 'Rx Intermedia 1' },
  { key: 'intermedia2', label: 'Rx Intermedia 2' },
  { key: 'intermedia3', label: 'Rx Intermedia 3' },
  { key: 'posoperatoria', label: 'Rx Posoperatoria' },
];

export const HistoriaClinicaView: React.FC<HistoriaClinicaViewProps> = ({
  pacientes,
  selectedId,
  onSelectId,
  onAddPaciente,
  onUpdatePaciente,
  onDeletePaciente,
}) => {
  const paciente = useMemo(
    () => pacientes.find((p) => p.id === selectedId) || pacientes[0] || null,
    [pacientes, selectedId]
  );

  const handleNewPaciente = () => {
    const fresh = createBlankPaciente();
    onAddPaciente(fresh);
    onSelectId(fresh.id);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!paciente) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-slate-900">Sin historias clínicas registradas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Crea el primer registro para completar la Historia Clínica Única y el Plan de Tratamiento OPS juntos.
        </p>
        <button
          type="button"
          onClick={handleNewPaciente}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-rose-900 px-5 text-xs font-semibold text-white hover:bg-rose-950"
        >
          <Plus size={16} />
          <span>Nueva Historia Clínica</span>
        </button>
      </div>
    );
  }

  const update = (patch: Partial<PacienteRecord>) => {
    onUpdatePaciente({
      ...paciente,
      ...patch,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const renderSiNo = (val: YesNo, onChange: (next: YesNo) => void) => (
    <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5">
      {(['Si', 'No'] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(val === opt ? '' : opt)}
          className={`min-h-[30px] rounded-md px-2.5 text-xs font-semibold transition-colors ${
            val === opt
              ? opt === 'Si'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const handleRxUpload = (slot: keyof RadiografiasState, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update({
          radiografias: { ...paciente.radiografias, [slot]: reader.result },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddEvolucionRow = () => {
    const nextRow: EvolucionRow = {
      id: `ev-${Date.now().toString(36)}`,
      fecha: new Date().toISOString().slice(0, 10),
      codigo: '',
      piezaSector: '',
      cara: '',
      tratamiento: '',
      alumno: '',
      docenteFirma: '',
      nota: '',
      pacienteFirma: '',
    };
    update({ evolucion: [...paciente.evolucion, nextRow] });
  };

  const handleUpdateEvolucionRow = (rowId: string, patch: Partial<EvolucionRow>) => {
    update({
      evolucion: paciente.evolucion.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    });
  };

  const handleUpdatePlanRow = (
    rowId: string,
    patch: { detalle?: string; estado?: PlanRowEstado }
  ) => {
    update({
      planTratamiento: paciente.planTratamiento.map((r) =>
        r.id === rowId ? { ...r, ...patch } : r
      ),
    });
  };

  const planDone = paciente.planTratamiento.filter((r) => r.estado === 'Realizado').length;
  const indices = computeDentalIndices(paciente.odontograma);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Patient Selector & Actions */}
      <div className="space-y-4 rounded-xl border border-rose-200/80 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="select-paciente" className="block text-[11px] font-medium text-slate-500">
                Caso / Paciente activo
              </label>
              <select
                id="select-paciente"
                value={paciente.id}
                onChange={(e) => onSelectId(e.target.value)}
                className="mt-1 h-10 min-w-[240px] rounded-lg border border-rose-200 bg-rose-50/40 px-3 text-sm font-semibold text-slate-900"
              >
                {pacientes.map((p) => {
                  const displayLabel = p.anonimizado
                    ? p.codigoCaso || `Caso ${p.historiaClinicaNro || p.id.slice(-4)}`
                    : p.apellido || p.nombre
                      ? `${p.apellido} ${p.nombre}`.trim()
                      : p.codigoCaso || 'Caso sin identificar';
                  return (
                    <option key={p.id} value={p.id}>
                      {displayLabel} {p.historiaClinicaNro ? `· HC ${p.historiaClinicaNro}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="hidden text-xs text-slate-500 sm:block">
              <p className="font-medium text-rose-950">
                {paciente.etapaActual || 'Diagnóstico'} · CPOD {indices.D}
              </p>
              <p>
                Plan de Tratamiento: {planDone}/{paciente.planTratamiento.length} etapas realizadas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => update({ anonimizado: !paciente.anonimizado })}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                paciente.anonimizado
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-white text-rose-950 hover:bg-rose-50'
              }`}
            >
              <ShieldCheck size={14} />
              <span>
                {paciente.anonimizado
                  ? 'Sin datos identificatorios'
                  : 'Activar modo sin PII'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleNewPaciente}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-900 px-3.5 text-xs font-semibold text-white hover:bg-rose-950"
            >
              <Plus size={14} />
              <span>Nuevo Caso</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-950 hover:bg-rose-50"
            >
              <Printer size={14} />
              <span>Imprimir</span>
            </button>
            {pacientes.length > 0 && (
              <button
                type="button"
                onClick={() => onDeletePaciente(paciente.id)}
                aria-label="Eliminar caso clínico"
                className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-rose-200 px-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Seguimiento Clínico de Avance de Práctica */}
        <div className="grid gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 sm:grid-cols-12 print:hidden">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600">
              Código / Alias del Caso
            </label>
            <input
              type="text"
              value={paciente.codigoCaso || ''}
              onChange={(e) => update({ codigoCaso: e.target.value })}
              placeholder="Ej. Caso #01 · Operatoria"
              className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-slate-900"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600">
              Etapa de avance clínico
            </label>
            <select
              value={paciente.etapaActual || 'Diagnóstico'}
              onChange={(e) =>
                update({ etapaActual: e.target.value as CasoClinicoEtapa })
              }
              className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-950"
            >
              <option value="Diagnóstico">1. Diagnóstico</option>
              <option value="O’Leary / Higiene">2. O’Leary / Higiene</option>
              <option value="Operatoria / Rehab.">3. Operatoria / Rehab.</option>
              <option value="Control / Alta">4. Control / Alta</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-slate-600">
              Próxima acción / paso pendiente
            </label>
            <input
              type="text"
              value={paciente.proximaAccion || ''}
              onChange={(e) => update({ proximaAccion: e.target.value })}
              placeholder="Ej. Control O'Leary, inactivación p. 46..."
              className="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2.5 text-xs text-slate-900"
            />
          </div>
          <div className="flex flex-col justify-end sm:col-span-2">
            <span className="text-[11px] font-medium text-slate-500">
              Avance OPS ({Math.round((planDone / Math.max(1, paciente.planTratamiento.length)) * 100)}%)
            </span>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-rose-200/70">
              <div
                className="h-full bg-rose-900 transition-all"
                style={{
                  width: `${Math.round((planDone / Math.max(1, paciente.planTratamiento.length)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Index Bar (all sections visible together below) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 pb-3 print:hidden">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'hc-datos', label: '1. Datos y Pre-Clínico' },
            { id: 'hc-examen', label: '2. Odontograma e Índices' },
            { id: 'hc-plan', label: `3. Plan de Tratamiento (${planDone}/${paciente.planTratamiento.length})` },
            { id: 'hc-evolucion', label: '4. Radiografías y Evolución' },
            { id: 'hc-consentimiento', label: '5. Consentimiento' },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="min-h-[36px] rounded-lg border border-rose-200 bg-rose-50/60 px-3 text-xs font-medium text-rose-950 transition-colors hover:bg-rose-100/70"
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* DOCUMENTO UNIFICADO: HISTORIA CLÍNICA ÚNICA + PLAN DE TRATAMIENTO OPS */}
      <div className="space-y-8">
        {/* Header Institucional */}
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="block text-[11px] font-medium text-slate-600">
                Historia Clínica N°
              </label>
              <input
                type="text"
                value={paciente.historiaClinicaNro}
                onChange={(e) => update({ historiaClinicaNro: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 font-mono text-xs font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Asignatura</label>
              <input
                type="text"
                value={paciente.asignatura}
                onChange={(e) => update({ asignatura: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Curso</label>
              <input
                type="text"
                value={paciente.curso}
                onChange={(e) => update({ curso: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Comisión</label>
              <input
                type="text"
                value={paciente.comision}
                onChange={(e) => update({ comision: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Año</label>
              <input
                type="text"
                value={paciente.anio}
                onChange={(e) => update({ anio: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Docente</label>
              <input
                type="text"
                value={paciente.docente}
                onChange={(e) => update({ docente: e.target.value })}
                placeholder="Prof. / Docente"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* SECTION 1: DATOS DEL PACIENTE Y CUESTIONARIO PRE-CLÍNICO */}
          <div id="hc-datos" className="scroll-mt-20 space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    {paciente.anonimizado
                      ? 'Datos Clínicos Básicos (Caso Anonimizado)'
                      : 'Datos del Paciente'}
                  </h2>
                  {paciente.anonimizado && (
                    <span className="text-[11px] font-medium text-emerald-800">
                      Nombre, DNI, domicilio y contacto ocultos para resguardar privacidad
                    </span>
                  )}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {!paciente.anonimizado && (
                    <>
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-600">Apellido/s</label>
                        <input
                          type="text"
                          value={paciente.apellido}
                          onChange={(e) => update({ apellido: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-600">Nombre/s</label>
                        <input
                          type="text"
                          value={paciente.nombre}
                          onChange={(e) => update({ nombre: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Edad</label>
                    <input
                      type="text"
                      value={paciente.edad}
                      onChange={(e) => update({ edad: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums text-slate-900"
                    />
                  </div>
                  {!paciente.anonimizado && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">DNI / Pasap.</label>
                        <input
                          type="text"
                          value={paciente.dni}
                          onChange={(e) => update({ dni: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums text-slate-900"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-600">Domicilio</label>
                        <input
                          type="text"
                          value={paciente.domicilio}
                          onChange={(e) => update({ domicilio: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Localidad</label>
                        <input
                          type="text"
                          value={paciente.localidad}
                          onChange={(e) => update({ localidad: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">
                          Partido / Barrio
                        </label>
                        <input
                          type="text"
                          value={paciente.partidoBarrio}
                          onChange={(e) => update({ partidoBarrio: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">
                          Código Postal
                        </label>
                        <input
                          type="text"
                          value={paciente.codigoPostal}
                          onChange={(e) => update({ codigoPostal: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">
                          Fecha de Nacimiento
                        </label>
                        <input
                          type="date"
                          value={paciente.fechaNacimiento}
                          onChange={(e) => update({ fechaNacimiento: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Género</label>
                    <select
                      value={paciente.genero}
                      onChange={(e) =>
                        update({ genero: e.target.value as PacienteRecord['genero'] })
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    >
                      <option value="">Seleccionar</option>
                      <option value="F">F</option>
                      <option value="M">M</option>
                      <option value="No Esp.">No Esp.</option>
                    </select>
                  </div>
                  {!paciente.anonimizado && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">
                          País de Origen
                        </label>
                        <input
                          type="text"
                          value={paciente.paisOrigen}
                          onChange={(e) => update({ paisOrigen: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Teléfono</label>
                        <input
                          type="tel"
                          value={paciente.telefono}
                          onChange={(e) => update({ telefono: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">E-mail</label>
                        <input
                          type="email"
                          value={paciente.email}
                          onChange={(e) => update({ email: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:col-span-4">
                        <span className="text-xs font-medium text-slate-700">Obra Social:</span>
                        {renderSiNo(paciente.obraSocial, (v) => update({ obraSocial: v }))}
                        <input
                          type="text"
                          value={paciente.obraSocialCual}
                          onChange={(e) => update({ obraSocialCual: e.target.value })}
                          placeholder="¿Cuál?"
                          className="h-9 flex-1 min-w-[160px] rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          value={paciente.nroAfiliado}
                          onChange={(e) => update({ nroAfiliado: e.target.value })}
                          placeholder="N° Afiliado"
                          className="h-9 w-44 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Cuestionario Pre-Clínico */}
              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                  Cuestionario Pre-Clínico
                </h2>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ¿Cuándo fue la última vez que recibió tratamiento odontológico?
                  </label>
                  <input
                    type="text"
                    value={paciente.ultimaVisitaOdontologica}
                    onChange={(e) => update({ ultimaVisitaOdontologica: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-xs font-medium text-slate-800">
                      ¿Está en tratamiento médico?
                    </span>
                    {renderSiNo(paciente.enTratamientoMedico, (v) =>
                      update({ enTratamientoMedico: v })
                    )}
                    {paciente.enTratamientoMedico === 'Si' && (
                      <input
                        type="text"
                        placeholder="¿Por qué causa?"
                        value={paciente.tratamientoMedicoCausa}
                        onChange={(e) => update({ tratamientoMedicoCausa: e.target.value })}
                        className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-xs font-medium text-slate-800">
                      ¿Toma medicamentos?
                    </span>
                    {renderSiNo(paciente.tomaMedicamentos, (v) =>
                      update({ tomaMedicamentos: v })
                    )}
                    {paciente.tomaMedicamentos === 'Si' && (
                      <input
                        type="text"
                        placeholder="¿Cuáles?"
                        value={paciente.medicamentosCuales}
                        onChange={(e) => update({ medicamentosCuales: e.target.value })}
                        className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-xs font-medium text-slate-800">
                      ¿Fue operado en los últimos diez años?
                    </span>
                    {renderSiNo(paciente.operadoUltimos10Anios, (v) =>
                      update({ operadoUltimos10Anios: v })
                    )}
                    {paciente.operadoUltimos10Anios === 'Si' && (
                      <input
                        type="text"
                        placeholder="¿Causa?"
                        value={paciente.operadoCausa}
                        onChange={(e) => update({ operadoCausa: e.target.value })}
                        className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-xs font-medium text-slate-800">¿Alergias?</span>
                    {renderSiNo(paciente.alergias, (v) => update({ alergias: v }))}
                    {paciente.alergias === 'Si' && (
                      <input
                        type="text"
                        placeholder="¿Cuáles?"
                        value={paciente.alergiasCuales}
                        onChange={(e) => update({ alergiasCuales: e.target.value })}
                        className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-xs font-medium text-slate-800">¿Tuvo hemorragias?</span>
                    {renderSiNo(paciente.tuvoHemorragias, (v) =>
                      update({ tuvoHemorragias: v })
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-xs font-medium text-slate-800">
                      ¿Recibió transfusiones de sangre o derivados?
                    </span>
                    {renderSiNo(paciente.transfusiones, (v) => update({ transfusiones: v }))}
                  </div>
                </div>

                {/* Antecedentes Patológicos */}
                <div>
                  <h3 className="mb-2.5 text-xs font-semibold text-slate-700">
                    Antecedentes médicos
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ANTECEDENTES_LIST.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <span className="text-xs text-slate-800">{label}</span>
                        {renderSiNo(paciente.antecedentes[key], (v) =>
                          update({
                            antecedentes: { ...paciente.antecedentes, [key]: v },
                          })
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-xs text-slate-800">¿Está embarazada?</span>
                    {renderSiNo(paciente.embarazada, (v) => update({ embarazada: v }))}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-xs text-slate-800">
                      ¿Tiene o tuvo infecciones a repetición? (Herpes Zoster, Mononucleosis)
                    </span>
                    {renderSiNo(paciente.infeccionesRepeticion, (v) =>
                      update({ infeccionesRepeticion: v })
                    )}
                  </div>
                </div>

                {/* Signos Vitales y Motivo */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Presión Máxima (mmHg)
                    </label>
                    <input
                      type="text"
                      value={paciente.presionMaxima}
                      onChange={(e) => update({ presionMaxima: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Presión Mínima (mmHg)
                    </label>
                    <input
                      type="text"
                      value={paciente.presionMinima}
                      onChange={(e) => update({ presionMinima: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Pulso (LxM)
                    </label>
                    <input
                      type="text"
                      value={paciente.pulso}
                      onChange={(e) => update({ pulso: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Frec. Respiratoria (RxM)
                    </label>
                    <input
                      type="text"
                      value={paciente.frecuenciaRespiratoria}
                      onChange={(e) => update({ frecuenciaRespiratoria: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ¿Motivo de la consulta?
                  </label>
                  <textarea
                    rows={2}
                    value={paciente.motivoConsulta}
                    onChange={(e) => update({ motivoConsulta: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900"
                  />
                </div>
              </section>
            </div>

          {/* SECTION 2: EXAMEN CLÍNICO (ODONTOGRAMA, O'LEARY, IHS, OBSERVACIONES) */}
          <div id="hc-examen" className="scroll-mt-20 space-y-6">
              <OdontogramaInteractive
                value={paciente.odontograma}
                onChange={(next) => update({ odontograma: next })}
              />

              <OLearyInteractive
                inicial={paciente.olearyInicial}
                final={paciente.olearyFinal}
                onChangeInicial={(next) => update({ olearyInicial: next })}
                onChangeFinal={(next) => update({ olearyFinal: next })}
              />

              <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">IHS — P</label>
                  <input
                    type="text"
                    value={paciente.ihsP}
                    onChange={(e) => update({ ihsP: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">IHS — N</label>
                  <input
                    type="text"
                    value={paciente.ihsN}
                    onChange={(e) => update({ ihsN: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Fecha Declaración Jurada
                  </label>
                  <input
                    type="date"
                    value={paciente.fechaDeclaracion}
                    onChange={(e) => update({ fechaDeclaracion: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Observaciones
                  </label>
                  <textarea
                    rows={3}
                    value={paciente.observaciones}
                    onChange={(e) => update({ observaciones: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

          {/* SECTION 3: PLAN DE TRATAMIENTO OPS (JUNTO EN LA MISMA FICHA) */}
          <div id="hc-plan" className="scroll-mt-20 space-y-5">
            <div className="overflow-hidden rounded-xl border border-rose-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-rose-950">Plan de Tratamiento (OPS)</h2>
                  <p className="text-xs text-slate-600">
                    Paciente:{' '}
                    {paciente.apellido || paciente.nombre
                      ? `${paciente.apellido} ${paciente.nombre}`.trim()
                      : 'Sin nombre'}{' '}
                    · Edad: {paciente.edad ? `${paciente.edad} años` : '—'} · Docente:{' '}
                    {paciente.docente || '—'} · Comisión: {paciente.comision || '—'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-rose-900 tabular-nums">
                  {planDone} / {paciente.planTratamiento.length} realizadas
                </span>
              </div>

              <div className="divide-y divide-rose-100">
                {paciente.planTratamiento.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-3 px-4 py-3 sm:grid-cols-12 sm:items-center"
                  >
                    <div className="sm:col-span-4">
                      <p className="text-xs font-semibold text-slate-900">{row.categoria}</p>
                    </div>
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={row.detalle}
                        onChange={(e) =>
                          handleUpdatePlanRow(row.id, { detalle: e.target.value })
                        }
                        placeholder="Tratamiento a realizar..."
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-rose-900 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1 sm:col-span-3">
                      {(['Pendiente', 'En curso', 'Realizado'] as PlanRowEstado[]).map((est) => {
                        const active = row.estado === est;
                        return (
                          <button
                            key={est}
                            type="button"
                            onClick={() => handleUpdatePlanRow(row.id, { estado: est })}
                            className={`inline-flex min-h-[32px] items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors ${
                              active
                                ? est === 'Realizado'
                                  ? 'border-emerald-700 bg-emerald-700 text-white'
                                  : est === 'En curso'
                                    ? 'border-amber-600 bg-amber-600 text-white'
                                    : 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {active && est === 'Realizado' && <Check size={11} />}
                            <span>{est}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: RADIOGRAFÍAS PERIAPICALES Y TABLA DE EVOLUCIÓN */}
          <div id="hc-evolucion" className="scroll-mt-20 space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">Radiografías Periapicales</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Adjunta imágenes desde tu dispositivo o cámara para guardarlas en la ficha del paciente.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {RX_SLOTS.map((slot) => {
                    const imgSrc = paciente.radiografias[slot.key];
                    return (
                      <div
                        key={slot.key}
                        className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <div className="relative flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-900/5">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={slot.label}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlus size={22} className="text-slate-400" />
                          )}
                        </div>
                        <p className="mt-2 text-center text-[11px] font-semibold text-slate-700">
                          {slot.label}
                        </p>
                        <label className="mt-2 flex min-h-[34px] cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-100">
                          <span>{imgSrc ? 'Cambiar' : 'Subir Rx'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleRxUpload(slot.key, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    Registro de Prestaciones y Evolución
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddEvolucionRow}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus size={14} />
                    <span>Agregar fila</span>
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-2 py-2.5 font-semibold">#</th>
                        <th className="px-2 py-2.5 font-semibold">Fecha</th>
                        <th className="px-2 py-2.5 font-semibold">Código</th>
                        <th className="px-2 py-2.5 font-semibold">Pieza / Sector</th>
                        <th className="px-2 py-2.5 font-semibold">Cara</th>
                        <th className="px-2 py-2.5 font-semibold">Tratamiento</th>
                        <th className="px-2 py-2.5 font-semibold">Alumno</th>
                        <th className="px-2 py-2.5 font-semibold">Docente</th>
                        <th className="px-2 py-2.5 font-semibold">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paciente.evolucion.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="px-2 py-2 font-mono tabular-nums text-slate-500">
                            {idx + 1}.
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="date"
                              value={row.fecha}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { fecha: e.target.value })
                              }
                              className="h-8 w-32 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="text"
                              value={row.codigo}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { codigo: e.target.value })
                              }
                              className="h-8 w-16 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="text"
                              value={row.piezaSector}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { piezaSector: e.target.value })
                              }
                              className="h-8 w-20 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="text"
                              value={row.cara}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { cara: e.target.value })
                              }
                              className="h-8 w-14 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="text"
                              value={row.tratamiento}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { tratamiento: e.target.value })
                              }
                              className="h-8 w-44 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="text"
                              value={row.alumno}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { alumno: e.target.value })
                              }
                              className="h-8 w-28 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="text"
                              value={row.docenteFirma}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { docenteFirma: e.target.value })
                              }
                              className="h-8 w-24 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="text"
                              value={row.nota}
                              onChange={(e) =>
                                handleUpdateEvolucionRow(row.id, { nota: e.target.value })
                              }
                              className="h-8 w-16 rounded border border-slate-200 px-1.5 text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

          {/* SECTION 5: CONSENTIMIENTO INFORMADO */}
          <section id="hc-consentimiento" className="scroll-mt-20 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                Consentimiento Informado
              </h2>

              <p className="text-xs leading-relaxed text-slate-700">
                En este acto, yo{' '}
                <strong className="text-slate-900">
                  {paciente.anonimizado
                    ? paciente.codigoCaso || '[Caso Práctico Anonimizado]'
                    : paciente.apellido || paciente.nombre
                      ? `${paciente.apellido} ${paciente.nombre}`.trim()
                      : '[Apellido y Nombre del paciente]'}
                </strong>{' '}
                {!paciente.anonimizado && (
                  <>
                    DNI/Pas.{' '}
                    <strong className="text-slate-900">{paciente.dni || '[DNI]'}</strong>{' '}
                  </>
                )}
                declaro que{' '}
                <strong className="text-slate-900">
                  {paciente.docente || '[Apellido y Nombre del docente]'}
                </strong>{' '}
                me ha explicado que el tratamiento que voy a recibir implica:
              </p>

              <textarea
                rows={3}
                value={paciente.consentimiento.implica}
                onChange={(e) =>
                  update({
                    consentimiento: { ...paciente.consentimiento, implica: e.target.value },
                  })
                }
                placeholder="Detalle de procedimientos explicados al paciente..."
                className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900"
              />

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Por lo que tendré que:
                </label>
                <textarea
                  rows={2}
                  value={paciente.consentimiento.tendreQue}
                  onChange={(e) =>
                    update({
                      consentimiento: { ...paciente.consentimiento, tendreQue: e.target.value },
                    })
                  }
                  placeholder="Indicaciones, cuidados y controles posteriores..."
                  className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900"
                />
              </div>

              <p className="rounded-lg bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-600">
                Cuando se me interrogó sobre mi estado de salud, hábitos y comportamiento, he
                contestado con la verdad y ha quedado asentado en la historia clínica. Entendí las
                explicaciones del estudiante y el docente, quienes explicaron las posibilidades de
                tratamiento, riesgos y complicaciones, permitiéndome realizar observaciones y
                aclarando todas mis dudas. También entiendo que en cualquier momento puedo revocar
                el consentimiento prestado y acepto la extracción de muestra de sangre en caso de
                accidente punzante.
              </p>

              {!paciente.anonimizado && (
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-semibold text-slate-800">
                    Datos del padre, madre o tutor (si corresponde)
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Apellido y Nombre"
                      value={paciente.consentimiento.tutorNombre}
                      onChange={(e) =>
                        update({
                          consentimiento: {
                            ...paciente.consentimiento,
                            tutorNombre: e.target.value,
                          },
                        })
                      }
                      className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="DNI"
                      value={paciente.consentimiento.tutorDni}
                      onChange={(e) =>
                        update({
                          consentimiento: { ...paciente.consentimiento, tutorDni: e.target.value },
                        })
                      }
                      className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Teléfono"
                      value={paciente.consentimiento.tutorTelefono}
                      onChange={(e) =>
                        update({
                          consentimiento: {
                            ...paciente.consentimiento,
                            tutorTelefono: e.target.value,
                          },
                        })
                      }
                      className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Domicilio"
                      value={paciente.consentimiento.tutorDomicilio}
                      onChange={(e) =>
                        update({
                          consentimiento: {
                            ...paciente.consentimiento,
                            tutorDomicilio: e.target.value,
                          },
                        })
                      }
                      className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                </div>
              )}
            </section>
      </div>
    </div>
  );
};
