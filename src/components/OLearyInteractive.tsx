import React from 'react';
import type { OLearySample } from '../types/dental';

interface OLearyCardProps {
  title: string;
  sample: OLearySample;
  onChange: (next: OLearySample) => void;
}

const UPPER_TEETH = [
  '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27',
];
const LOWER_TEETH = [
  '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37',
];
const SURFACES = ['V', 'L', 'M', 'D'] as const;

export function computeOLearyPercent(sample: OLearySample): number {
  const stainedCount = Object.values(sample.stainedSurfaces).filter(Boolean).length;
  const totalSurfaces = Math.max(1, sample.piezasPresentes) * 4;
  return Number(((stainedCount / totalSurfaces) * 100).toFixed(1));
}

const OLearyCard: React.FC<OLearyCardProps> = ({ title, sample, onChange }) => {
  const stainedCount = Object.values(sample.stainedSurfaces).filter(Boolean).length;
  const percent = computeOLearyPercent(sample);

  const toggleSurface = (toothId: string, surface: string) => {
    const key = `${toothId}-${surface}`;
    const nextSurfaces = {
      ...sample.stainedSurfaces,
      [key]: !sample.stainedSurfaces[key],
    };
    if (!nextSurfaces[key]) delete nextSurfaces[key];

    const nextCount = Object.values(nextSurfaces).filter(Boolean).length;
    const nextPct = (nextCount / (Math.max(1, sample.piezasPresentes) * 4)) * 100;

    onChange({
      ...sample,
      stainedSurfaces: nextSurfaces,
      pacienteRiesgo: nextPct > 20 ? 'Si' : 'No',
    });
  };

  const renderToothDiamond = (toothId: string) => (
    <div key={toothId} className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-medium text-slate-500 tabular-nums">{toothId}</span>
      <svg viewBox="0 0 28 28" className="h-6 w-6">
        {/* Top (V) */}
        <polygon
          points="14,1 26,8 14,14 2,8"
          fill={sample.stainedSurfaces[`${toothId}-V`] ? '#2563EB' : '#FFFFFF'}
          stroke="#64748B"
          strokeWidth="1"
          className="cursor-pointer"
          onClick={() => toggleSurface(toothId, 'V')}
        />
        {/* Bottom (L) */}
        <polygon
          points="14,14 26,20 14,27 2,20"
          fill={sample.stainedSurfaces[`${toothId}-L`] ? '#2563EB' : '#FFFFFF'}
          stroke="#64748B"
          strokeWidth="1"
          className="cursor-pointer"
          onClick={() => toggleSurface(toothId, 'L')}
        />
        {/* Left (M) */}
        <polygon
          points="2,8 14,14 2,20"
          fill={sample.stainedSurfaces[`${toothId}-M`] ? '#2563EB' : '#FFFFFF'}
          stroke="#64748B"
          strokeWidth="1"
          className="cursor-pointer"
          onClick={() => toggleSurface(toothId, 'M')}
        />
        {/* Right (D) */}
        <polygon
          points="26,8 26,20 14,14"
          fill={sample.stainedSurfaces[`${toothId}-D`] ? '#2563EB' : '#FFFFFF'}
          stroke="#64748B"
          strokeWidth="1"
          className="cursor-pointer"
          onClick={() => toggleSurface(toothId, 'D')}
        />
      </svg>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-xs font-semibold text-slate-900">{title}</h4>
          <p className="text-[11px] text-slate-500 tabular-nums">
            {stainedCount} superficies teñidas · {SURFACES.length} caras por pieza
          </p>
        </div>
        <div className="flex items-baseline gap-1 tabular-nums">
          <span className="text-2xl font-bold text-slate-900">{percent}%</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-600">Fecha</label>
          <input
            type="date"
            value={sample.fecha}
            onChange={(e) => onChange({ ...sample, fecha: e.target.value })}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-600">Piezas presentes</label>
          <input
            type="number"
            min={1}
            max={32}
            value={sample.piezasPresentes}
            onChange={(e) =>
              onChange({
                ...sample,
                piezasPresentes: Math.max(1, Math.min(32, Number(e.target.value) || 28)),
              })
            }
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs tabular-nums text-slate-900"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
        <div className="min-w-[380px] space-y-2">
          <div className="flex justify-center gap-1">{UPPER_TEETH.map(renderToothDiamond)}</div>
          <div className="h-px bg-slate-200" />
          <div className="flex justify-center gap-1">{LOWER_TEETH.map(renderToothDiamond)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between pt-1">
        <span className="text-xs font-medium text-slate-700">Paciente de Riesgo</span>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          {(['Si', 'No'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ ...sample, pacienteRiesgo: opt })}
              className={`min-h-[30px] rounded-md px-3 text-xs font-semibold ${
                sample.pacienteRiesgo === opt
                  ? opt === 'Si'
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                  : 'text-slate-600'
              }`}
            >
              {opt === 'Si' ? 'Sí' : 'No'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface OLearyInteractiveProps {
  inicial: OLearySample;
  final: OLearySample;
  onChangeInicial: (next: OLearySample) => void;
  onChangeFinal: (next: OLearySample) => void;
}

export const OLearyInteractive: React.FC<OLearyInteractiveProps> = ({
  inicial,
  final,
  onChangeInicial,
  onChangeFinal,
}) => {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OLearyCard title="Índice de riesgo O’Leary Inicial" sample={inicial} onChange={onChangeInicial} />
      <OLearyCard title="Índice de riesgo O’Leary Final" sample={final} onChange={onChangeFinal} />
    </div>
  );
};
