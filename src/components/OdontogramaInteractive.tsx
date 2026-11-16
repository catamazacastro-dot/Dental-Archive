import React, { useMemo, useState } from 'react';
import type { ToothCondition, ToothRecord, ToothSurface } from '../types/dental';

interface OdontogramaInteractiveProps {
  value: Record<string, ToothRecord>;
  onChange: (next: Record<string, ToothRecord>) => void;
}

type ToolOption = {
  id: ToothCondition;
  label: string;
  swatch: string;
};

const TOOLS: ToolOption[] = [
  { id: 'caries', label: 'Caries', swatch: '#DC2626' },
  { id: 'obturado', label: 'Obturado', swatch: '#2563EB' },
  { id: 'ausente', label: 'Ausente / Perdido', swatch: '#475569' },
  { id: 'endodoncia', label: 'Endodoncia', swatch: '#D97706' },
  { id: 'corona', label: 'Corona', swatch: '#059669' },
  { id: 'extraccion', label: 'Extracción ind.', swatch: '#991B1B' },
  { id: 'sano', label: 'Limpiar (Sano)', swatch: '#CBD5E1' },
];

const PERM_UPPER_R = ['18', '17', '16', '15', '14', '13', '12', '11'];
const PERM_UPPER_L = ['21', '22', '23', '24', '25', '26', '27', '28'];
const PERM_LOWER_R = ['48', '47', '46', '45', '44', '43', '42', '41'];
const PERM_LOWER_L = ['31', '32', '33', '34', '35', '36', '37', '38'];

const TEMP_UPPER_R = ['55', '54', '53', '52', '51'];
const TEMP_UPPER_L = ['61', '62', '63', '64', '65'];
const TEMP_LOWER_R = ['85', '84', '83', '82', '81'];
const TEMP_LOWER_L = ['71', '72', '73', '74', '75'];

const ALL_PERM = [...PERM_UPPER_R, ...PERM_UPPER_L, ...PERM_LOWER_R, ...PERM_LOWER_L];
const ALL_TEMP = [...TEMP_UPPER_R, ...TEMP_UPPER_L, ...TEMP_LOWER_R, ...TEMP_LOWER_L];

export function computeDentalIndices(odontograma: Record<string, ToothRecord>) {
  let C = 0;
  let P = 0;
  let O = 0;
  let presentesPerm = 0;

  ALL_PERM.forEach((id) => {
    const rec = odontograma[id];
    const isThirdMolar = id === '18' || id === '28' || id === '38' || id === '48';
    const whole = rec?.whole || 'sano';
    if (whole !== 'ausente') {
      presentesPerm += 1;
    }
    if (isThirdMolar) return;

    const faces = rec?.surfaces ? Object.values(rec.surfaces) : [];
    const hasCaries = whole === 'caries' || whole === 'extraccion' || faces.includes('caries');
    const hasObturado = whole === 'obturado' || whole === 'corona' || faces.includes('obturado');

    if (whole === 'ausente') {
      P += 1;
    } else if (hasCaries) {
      C += 1;
    } else if (hasObturado) {
      O += 1;
    }
  });

  let c = 0;
  let e = 0;
  let o = 0;
  ALL_TEMP.forEach((id) => {
    const rec = odontograma[id];
    const whole = rec?.whole || 'sano';
    const faces = rec?.surfaces ? Object.values(rec.surfaces) : [];
    const hasCaries = whole === 'caries' || faces.includes('caries');
    const hasObturado = whole === 'obturado' || faces.includes('obturado');

    if (whole === 'extraccion' || whole === 'ausente') {
      e += 1;
    } else if (hasCaries) {
      c += 1;
    } else if (hasObturado) {
      o += 1;
    }
  });

  return {
    C,
    P,
    O,
    D: C + P + O,
    c,
    e,
    o,
    d: c + e + o,
    presentesPerm,
  };
}

export const OdontogramaInteractive: React.FC<OdontogramaInteractiveProps> = ({
  value,
  onChange,
}) => {
  const [selectedTool, setSelectedTool] = useState<ToothCondition>('caries');

  const indices = useMemo(() => computeDentalIndices(value), [value]);

  const handleFaceClick = (toothId: string, face: ToothSurface) => {
    const current = value[toothId] || { whole: 'sano', surfaces: {} };
    if (selectedTool === 'sano') {
      const nextSurfaces = { ...current.surfaces };
      delete nextSurfaces[face];
      const nextWhole = Object.keys(nextSurfaces).length === 0 ? 'sano' : current.whole;
      const next = { ...value };
      if (nextWhole === 'sano' && Object.keys(nextSurfaces).length === 0) {
        delete next[toothId];
      } else {
        next[toothId] = { whole: nextWhole, surfaces: nextSurfaces };
      }
      onChange(next);
      return;
    }

    if (selectedTool === 'caries' || selectedTool === 'obturado') {
      const existingFace = current.surfaces?.[face];
      const nextSurfaces = { ...current.surfaces };
      if (existingFace === selectedTool) {
        delete nextSurfaces[face];
      } else {
        nextSurfaces[face] = selectedTool;
      }
      onChange({
        ...value,
        [toothId]: {
          whole: current.whole === 'ausente' ? 'sano' : current.whole,
          surfaces: nextSurfaces,
        },
      });
      return;
    }

    // Whole-tooth condition
    const nextWhole = current.whole === selectedTool ? 'sano' : selectedTool;
    onChange({
      ...value,
      [toothId]: {
        whole: nextWhole,
        surfaces: nextWhole === 'ausente' ? {} : current.surfaces,
      },
    });
  };

  const handleWholeToothClick = (toothId: string) => {
    const current = value[toothId] || { whole: 'sano', surfaces: {} };
    if (selectedTool === 'sano') {
      const next = { ...value };
      delete next[toothId];
      onChange(next);
      return;
    }
    const nextWhole = current.whole === selectedTool ? 'sano' : selectedTool;
    onChange({
      ...value,
      [toothId]: {
        whole: nextWhole,
        surfaces: nextWhole === 'ausente' ? {} : current.surfaces,
      },
    });
  };

  const getFaceFill = (rec: ToothRecord | undefined, face: ToothSurface) => {
    const state = rec?.surfaces?.[face];
    if (state === 'caries') return '#DC2626';
    if (state === 'obturado') return '#2563EB';
    if (rec?.whole === 'corona') return '#D1FAE5';
    return '#FFFFFF';
  };

  const renderTooth = (toothId: string, small = false) => {
    const rec = value[toothId];
    const whole = rec?.whole || 'sano';
    const dim = small ? 34 : 38;

    return (
      <div key={toothId} className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => handleWholeToothClick(toothId)}
          title={`Pieza ${toothId}: aplicar estado completo`}
          className={`rounded px-1 text-[11px] font-semibold tabular-nums transition-colors ${
            whole !== 'sano'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {toothId}
        </button>

        <div className="relative" style={{ width: dim, height: dim }}>
          <svg viewBox="0 0 40 40" className="h-full w-full">
            {/* Top (Vestibular) */}
            <polygon
              points="2,2 38,2 29,11 11,11"
              fill={getFaceFill(rec, 'V')}
              stroke="#475569"
              strokeWidth="1.2"
              className="cursor-pointer hover:opacity-80"
              onClick={() => handleFaceClick(toothId, 'V')}
            />
            {/* Bottom (Lingual / Palatino) */}
            <polygon
              points="11,29 29,29 38,38 2,38"
              fill={getFaceFill(rec, 'L')}
              stroke="#475569"
              strokeWidth="1.2"
              className="cursor-pointer hover:opacity-80"
              onClick={() => handleFaceClick(toothId, 'L')}
            />
            {/* Left (Mesial / Distal) */}
            <polygon
              points="2,2 11,11 11,29 2,38"
              fill={getFaceFill(rec, 'M')}
              stroke="#475569"
              strokeWidth="1.2"
              className="cursor-pointer hover:opacity-80"
              onClick={() => handleFaceClick(toothId, 'M')}
            />
            {/* Right (Distal / Mesial) */}
            <polygon
              points="38,2 38,38 29,29 29,11"
              fill={getFaceFill(rec, 'D')}
              stroke="#475569"
              strokeWidth="1.2"
              className="cursor-pointer hover:opacity-80"
              onClick={() => handleFaceClick(toothId, 'D')}
            />
            {/* Center (Oclusal / Incisal) */}
            <rect
              x="11"
              y="11"
              width="18"
              height="18"
              fill={getFaceFill(rec, 'O')}
              stroke="#475569"
              strokeWidth="1.2"
              className="cursor-pointer hover:opacity-80"
              onClick={() => handleFaceClick(toothId, 'O')}
            />

            {/* Whole-tooth clinical markers */}
            {whole === 'ausente' && (
              <g stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" className="pointer-events-none">
                <line x1="4" y1="4" x2="36" y2="36" />
                <line x1="36" y1="4" x2="4" y2="36" />
              </g>
            )}
            {whole === 'extraccion' && (
              <g stroke="#DC2626" strokeWidth="2.4" strokeLinecap="round" className="pointer-events-none">
                <line x1="4" y1="4" x2="36" y2="36" />
                <line x1="36" y1="4" x2="4" y2="36" />
              </g>
            )}
            {whole === 'endodoncia' && (
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#D97706"
                strokeWidth="2.2"
                className="pointer-events-none"
              />
            )}
            {whole === 'corona' && (
              <rect
                x="2"
                y="2"
                width="36"
                height="36"
                rx="4"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                className="pointer-events-none"
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tool Palette */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TOOLS.map((tool) => {
            const active = selectedTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                className={`inline-flex min-h-[36px] items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: tool.swatch }}
                />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-slate-500">
          Toca una cara para marcar lesión o el número de pieza para estado completo.
        </span>
      </div>

      {/* Odontograma Permanentes */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-900">Odontograma Permanentes</h4>
          <span className="text-xs text-slate-500 tabular-nums">
            Piezas presentes: <strong className="text-slate-900">{indices.presentesPerm}</strong>
          </span>
        </div>

        <div className="min-w-[680px] space-y-3">
          <div className="flex items-center justify-center gap-4">
            <span className="w-14 text-[10px] font-semibold text-slate-500">DERECHA</span>
            <div className="flex gap-1.5">{PERM_UPPER_R.map((id) => renderTooth(id))}</div>
            <div className="h-12 w-px bg-slate-300" />
            <div className="flex gap-1.5">{PERM_UPPER_L.map((id) => renderTooth(id))}</div>
            <span className="w-14 text-right text-[10px] font-semibold text-slate-500">IZQUIERDA</span>
          </div>

          <div className="h-px bg-slate-200" />

          <div className="flex items-center justify-center gap-4">
            <span className="w-14 text-[10px] font-semibold text-slate-500">DERECHA</span>
            <div className="flex gap-1.5">{PERM_LOWER_R.map((id) => renderTooth(id))}</div>
            <div className="h-12 w-px bg-slate-300" />
            <div className="flex gap-1.5">{PERM_LOWER_L.map((id) => renderTooth(id))}</div>
            <span className="w-14 text-right text-[10px] font-semibold text-slate-500">IZQUIERDA</span>
          </div>
        </div>
      </div>

      {/* Odontograma Temporarios */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-xs font-semibold text-slate-900">Odontograma Temporarios</h4>
        <div className="min-w-[460px] space-y-3">
          <div className="flex items-center justify-center gap-4">
            <span className="w-14 text-[10px] font-semibold text-slate-500">DERECHA</span>
            <div className="flex gap-1.5">{TEMP_UPPER_R.map((id) => renderTooth(id, true))}</div>
            <div className="h-10 w-px bg-slate-300" />
            <div className="flex gap-1.5">{TEMP_UPPER_L.map((id) => renderTooth(id, true))}</div>
            <span className="w-14 text-right text-[10px] font-semibold text-slate-500">IZQUIERDA</span>
          </div>

          <div className="h-px bg-slate-200" />

          <div className="flex items-center justify-center gap-4">
            <span className="w-14 text-[10px] font-semibold text-slate-500">DERECHA</span>
            <div className="flex gap-1.5">{TEMP_LOWER_R.map((id) => renderTooth(id, true))}</div>
            <div className="h-10 w-px bg-slate-300" />
            <div className="flex gap-1.5">{TEMP_LOWER_L.map((id) => renderTooth(id, true))}</div>
            <span className="w-14 text-right text-[10px] font-semibold text-slate-500">IZQUIERDA</span>
          </div>
        </div>
      </div>

      {/* Indices Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">Índice CPOD (Permanentes)</span>
          <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
            <span>
              C <strong className="text-rose-600">{indices.C}</strong>
            </span>
            <span>
              P <strong className="text-slate-900">{indices.P}</strong>
            </span>
            <span>
              O <strong className="text-blue-600">{indices.O}</strong>
            </span>
            <span className="border-l border-slate-200 pl-3 font-bold text-slate-900">
              D= {indices.D}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">Índice ceod (Temporarios)</span>
          <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
            <span>
              c <strong className="text-rose-600">{indices.c}</strong>
            </span>
            <span>
              e <strong className="text-slate-900">{indices.e}</strong>
            </span>
            <span>
              o <strong className="text-blue-600">{indices.o}</strong>
            </span>
            <span className="border-l border-slate-200 pl-3 font-bold text-slate-900">
              d= {indices.d}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
