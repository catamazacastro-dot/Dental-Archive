import React, { useEffect, useId, useState } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import type { EncuestaQuestionDef } from '../data/encuestaSchema';

export type EncuestaChartType = 'barra' | 'torta';
export type EncuestaChartMetric = 'numero' | 'porcentaje';

export interface TabulatedRow {
  opcion: string;
  count: number;
  pct: number;
}

export interface TabulatedQuestion {
  question: EncuestaQuestionDef;
  total: number;
  sinRespuesta: number;
  rows: TabulatedRow[];
}

const CHART_COLORS = [
  '#7A1C33', // bordó principal
  '#C89695', // rosa antiguo
  '#6F8773', // verde salvia
  '#994F59', // bordó rosado
  '#4D6351', // salvia oscuro
  '#736B66', // gris cálido
  '#B27476', // rosa antiguo profundo
  '#9DB4A1', // salvia claro
  '#4A0D1C', // bordó oscuro
  '#3D4F40', // salvia bosque
  '#968D87', // gris cálido claro
  '#5E5753', // gris cálido oscuro
];

const SIN_RESPUESTA_COLOR = '#968D87';

interface SliceItem {
  label: string;
  count: number;
  pctOfSurvey: number;
  shareOfMentions: number;
  color: string;
}

interface EncuestaChartCardProps {
  item: TabulatedQuestion;
  globalChartType: EncuestaChartType;
  globalMetric: EncuestaChartMetric;
}

function truncateLabel(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export const EncuestaChartCard: React.FC<EncuestaChartCardProps> = ({
  item,
  globalChartType,
  globalMetric,
}) => {
  const uid = useId().replace(/:/g, '');
  const [localType, setLocalType] = useState<EncuestaChartType>(globalChartType);
  const [localMetric, setLocalMetric] = useState<EncuestaChartMetric>(globalMetric);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    setLocalType(globalChartType);
    setHoveredIdx(null);
  }, [globalChartType]);

  useEffect(() => {
    setLocalMetric(globalMetric);
  }, [globalMetric]);

  const { question, total, sinRespuesta, rows } = item;

  const allEntries = [
    ...rows.map((r, idx) => ({
      label: r.opcion,
      count: r.count,
      pctOfSurvey: r.pct,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    })),
    ...(sinRespuesta > 0
      ? [
          {
            label: 'Sin respuesta',
            count: sinRespuesta,
            pctOfSurvey: total > 0 ? Number(((sinRespuesta / total) * 100).toFixed(1)) : 0,
            color: SIN_RESPUESTA_COLOR,
          },
        ]
      : []),
  ];

  const totalMentions = allEntries.reduce((acc, e) => acc + e.count, 0);

  const pieSlices: SliceItem[] = allEntries
    .filter((e) => e.count > 0)
    .map((e) => ({
      ...e,
      shareOfMentions: totalMentions > 0 ? (e.count / totalMentions) * 100 : 0,
    }));

  // Vertical Bar Chart SVG geometry
  const svgBarWidth = Math.max(460, allEntries.length * 46 + 64);
  const svgBarHeight = 250;
  const plotLeft = 42;
  const plotRight = svgBarWidth - 12;
  const plotTop = 16;
  const plotBottom = svgBarHeight - 16;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const maxPct = Math.max(100, ...allEntries.map((e) => e.pctOfSurvey));

  const barCount = Math.max(1, allEntries.length);
  const slotWidth = plotWidth / barCount;
  const barGap = Math.min(12, Math.max(4, slotWidth * 0.16));
  const barWidth = Math.max(22, slotWidth - barGap);

  const canFitHorizontalLabel =
    barWidth >= 78 && allEntries.every((e) => e.label.length <= 13);

  const yAxisTicks =
    localMetric === 'porcentaje'
      ? [0, 25, 50, 75, 100].map((v) => ({
          ratio: v / maxPct,
          label: `${v}%`,
        }))
      : total <= 5
        ? Array.from({ length: total + 1 }, (_, i) => ({
            ratio: total > 0 ? i / total : 0,
            label: String(i),
          }))
        : Array.from(
            new Set([
              0,
              Math.round(total * 0.25),
              Math.round(total * 0.5),
              Math.round(total * 0.75),
              total,
            ])
          ).map((v) => ({
            ratio: total > 0 ? v / total : 0,
            label: String(v),
          }));

  // Pie Chart ("Torta") SVG geometry with outer-perimeter direct slice labels
  const svgPieWidth = 480;
  const pieRadius = 86;
  const pieCenterX = svgPieWidth / 2;

  let cumulativeAngle = -Math.PI / 2;
  const rawSlices = pieSlices.map((slice, idx) => {
    const angle = totalMentions > 0 ? (slice.count / totalMentions) * Math.PI * 2 : 0;
    const startAngle = cumulativeAngle;
    const endAngle = startAngle + angle;
    const midAngle = startAngle + angle / 2;
    cumulativeAngle = endAngle;

    const cosM = Math.cos(midAngle);
    const sinM = Math.sin(midAngle);
    const isRight = cosM >= -0.001;

    const piePct = question.multiple ? slice.shareOfMentions : slice.pctOfSurvey;
    const valueText =
      localMetric === 'numero' ? String(slice.count) : `${piePct.toFixed(1)}%`;

    return {
      ...slice,
      idx,
      angle,
      startAngle,
      endAngle,
      midAngle,
      cosM,
      sinM,
      isRight,
      piePct,
      valueText,
    };
  });

  // Collision-free vertical spacing for left & right perimeter labels
  const minLabelGap = 30;
  const baseCy = 118;
  const labelDist = pieRadius + 14;

  type PlacedLabel = {
    idx: number;
    idealY: number;
    finalY: number;
    isRight: boolean;
    labelX: number;
    textAnchor: 'start' | 'end' | 'middle';
    needsLeader: boolean;
  };

  const spaceSide = (sideSlices: typeof rawSlices, isRight: boolean): PlacedLabel[] => {
    const sorted = [...sideSlices].sort((a, b) => a.sinM - b.sinM);
    const items: PlacedLabel[] = sorted.map((s) => {
      const idealY = baseCy + labelDist * s.sinM;
      const nearVerticalPole = Math.abs(s.cosM) < 0.18;
      const baseAnchorX = pieCenterX + labelDist * s.cosM;
      return {
        idx: s.idx,
        idealY,
        finalY: idealY,
        isRight,
        labelX: nearVerticalPole
          ? pieCenterX
          : isRight
            ? Math.max(baseAnchorX, pieCenterX + pieRadius + 14)
            : Math.min(baseAnchorX, pieCenterX - pieRadius - 14),
        textAnchor: nearVerticalPole ? 'middle' : isRight ? 'start' : 'end',
        needsLeader: false,
      };
    });

    for (let i = 1; i < items.length; i++) {
      if (items[i].finalY - items[i - 1].finalY < minLabelGap) {
        items[i].finalY = items[i - 1].finalY + minLabelGap;
        items[i].needsLeader = true;
        items[i - 1].needsLeader = true;
      }
    }

    // Center the spread back around ideal mean if shifted significantly
    if (items.length > 1) {
      const idealCenter = (items[0].idealY + items[items.length - 1].idealY) / 2;
      const actualCenter = (items[0].finalY + items[items.length - 1].finalY) / 2;
      const shift = idealCenter - actualCenter;
      items.forEach((it) => {
        it.finalY += shift;
      });
    }

    // Also pull labelX slightly wider if labels were spread vertically
    items.forEach((it) => {
      if (it.needsLeader) {
        it.labelX = it.isRight
          ? pieCenterX + pieRadius + 24
          : pieCenterX - pieRadius - 24;
        it.textAnchor = it.isRight ? 'start' : 'end';
      }
    });

    return items;
  };

  const placedRight = spaceSide(
    rawSlices.filter((s) => s.isRight),
    true
  );
  const placedLeft = spaceSide(
    rawSlices.filter((s) => !s.isRight),
    false
  );
  const placedMap = new Map<number, PlacedLabel>();
  [...placedRight, ...placedLeft].forEach((p) => placedMap.set(p.idx, p));

  // Compute dynamic vertical offset & height so no outer labels ever clip
  const allFinalYs = [
    baseCy - pieRadius - 14,
    ...Array.from(placedMap.values()).map((p) => p.finalY - 12),
  ];
  const allBottomYs = [
    baseCy + pieRadius + 14,
    ...Array.from(placedMap.values()).map((p) => p.finalY + 20),
  ];
  const minTopY = Math.min(...allFinalYs);
  const maxBotY = Math.max(...allBottomYs);
  const yOffset = minTopY < 10 ? 10 - minTopY : 0;
  const pieCenterY = baseCy + yOffset;
  const svgPieHeight = Math.max(236, Math.ceil(maxBotY + yOffset + 10));

  const computedArcs = rawSlices.map((s) => {
    const x1 = pieCenterX + pieRadius * Math.cos(s.startAngle);
    const y1 = pieCenterY + pieRadius * Math.sin(s.startAngle);
    const x2 = pieCenterX + pieRadius * Math.cos(s.endAngle);
    const y2 = pieCenterY + pieRadius * Math.sin(s.endAngle);
    const largeArcFlag = s.angle > Math.PI ? 1 : 0;

    const pathD = `M ${pieCenterX} ${pieCenterY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${pieRadius} ${pieRadius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    const isActive = hoveredIdx === s.idx;
    const popOffset = isActive ? 5 : 0;
    const dx = Math.cos(s.midAngle) * popOffset;
    const dy = Math.sin(s.midAngle) * popOffset;

    const edgeX = pieCenterX + pieRadius * s.cosM + dx;
    const edgeY = pieCenterY + pieRadius * s.sinM + dy;
    const placed = placedMap.get(s.idx);
    const labelX = (placed?.labelX ?? pieCenterX) + dx;
    const labelY = (placed?.finalY ?? baseCy) + yOffset + dy;

    return {
      ...s,
      pathD,
      dx,
      dy,
      edgeX,
      edgeY,
      labelX,
      labelY,
      textAnchor: placed?.textAnchor ?? 'middle',
      needsLeader: placed?.needsLeader ?? false,
    };
  });

  const activeSlice =
    hoveredIdx !== null && localType === 'torta' ? pieSlices[hoveredIdx] ?? null : null;
  const activeBar =
    hoveredIdx !== null && localType === 'barra' ? allEntries[hoveredIdx] ?? null : null;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      {/* Compact Top Utility Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className="text-xs font-semibold text-slate-500 tabular-nums">
          Pregunta {question.numero} · N = {total}
          {question.multiple ? ' · Múltiple' : ''}
        </span>

        {/* Per-chart Controls: Metric (N° / %) + Type (Barra / Torta) */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label={`Mostrar número o porcentaje en gráfico ${question.numero}`}
          >
            <button
              type="button"
              onClick={() => setLocalMetric('numero')}
              className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold transition-colors ${
                localMetric === 'numero'
                  ? 'bg-white text-rose-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mostrar número (n) en el gráfico"
            >
              N°
            </button>
            <button
              type="button"
              onClick={() => setLocalMetric('porcentaje')}
              className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold transition-colors ${
                localMetric === 'porcentaje'
                  ? 'bg-white text-rose-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mostrar porcentaje (%) en el gráfico"
            >
              %
            </button>
          </div>

          <div
            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label={`Tipo de gráfico pregunta ${question.numero}`}
          >
            <button
              type="button"
              onClick={() => {
                setLocalType('barra');
                setHoveredIdx(null);
              }}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                localType === 'barra'
                  ? 'bg-white text-rose-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver en barras verticales"
            >
              <BarChart3 size={12} />
              <span>Barra</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalType('torta');
                setHoveredIdx(null);
              }}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                localType === 'torta'
                  ? 'bg-white text-rose-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver en torta"
            >
              <PieChart size={12} />
              <span>Torta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex flex-1 flex-col justify-between p-4">
        {total === 0 || totalMentions === 0 ? (
          <div className="flex min-h-[190px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-xs text-slate-500">
            Sin respuestas registradas para graficar.
          </div>
        ) : localType === 'barra' ? (
          <div className="space-y-3">
            <svg
              viewBox={`0 0 ${svgBarWidth} ${svgBarHeight}`}
              className="w-full overflow-visible"
              role="img"
              aria-label={`Gráfico de barras verticales de ${question.titulo}`}
            >
              <defs>
                {allEntries.map((entry, idx) => {
                  const x = plotLeft + idx * slotWidth + barGap / 2;
                  const barH =
                    entry.count > 0
                      ? Math.max(4, (entry.pctOfSurvey / maxPct) * plotHeight)
                      : 0;
                  const barY = plotBottom - barH;
                  return (
                    <clipPath key={`cp-${entry.label}`} id={`bar-clip-${uid}-${idx}`}>
                      <rect x={x} y={barY} width={barWidth} height={barH} rx={4} />
                    </clipPath>
                  );
                })}
              </defs>

              {/* Horizontal Y-Axis Gridlines */}
              {yAxisTicks.map((tick) => {
                const y = plotBottom - tick.ratio * plotHeight;
                return (
                  <g key={tick.label}>
                    <line
                      x1={plotLeft}
                      y1={y}
                      x2={plotRight}
                      y2={y}
                      stroke={tick.ratio === 0 ? '#cbd5e1' : '#e2e8f0'}
                      strokeDasharray={tick.ratio === 0 ? undefined : '3 3'}
                      strokeWidth={1}
                    />
                    <text
                      x={plotLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#64748b"
                      className="font-mono"
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Column Bars with Option Name & Value INSIDE */}
              {allEntries.map((entry, idx) => {
                const x = plotLeft + idx * slotWidth + barGap / 2;
                const centerX = x + barWidth / 2;
                const barH =
                  entry.count > 0
                    ? Math.max(4, (entry.pctOfSurvey / maxPct) * plotHeight)
                    : 0;
                const barY = plotBottom - barH;
                const isHovered = hoveredIdx === idx;
                const dimmed = hoveredIdx !== null && !isHovered;

                const valueText =
                  localMetric === 'numero'
                    ? String(entry.count)
                    : `${entry.pctOfSurvey.toFixed(1)}%`;

                const valueInsideBar = barH >= 40;
                const valueY = valueInsideBar ? barY + 15 : Math.max(plotTop + 13, barY - 6);

                const shortOption = truncateLabel(
                  entry.label,
                  canFitHorizontalLabel ? 14 : 24
                );

                const labelNode = canFitHorizontalLabel ? (
                  <text
                    x={centerX}
                    y={plotBottom - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {shortOption}
                  </text>
                ) : (
                  <text
                    x={centerX + 3.5}
                    y={plotBottom - 8}
                    textAnchor="start"
                    fontSize="10.5"
                    fontWeight="600"
                    transform={`rotate(-90, ${centerX + 3.5}, ${plotBottom - 8})`}
                  >
                    {shortOption}
                  </text>
                );

                return (
                  <g
                    key={entry.label}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                    className="cursor-pointer"
                    opacity={dimmed ? 0.45 : 1}
                  >
                    <rect
                      x={x}
                      y={plotTop}
                      width={barWidth}
                      height={plotHeight}
                      rx={4}
                      fill={isHovered ? '#EED8D7' : '#F7EBEB'}
                    />

                    {barH > 0 && (
                      <rect
                        x={x}
                        y={barY}
                        width={barWidth}
                        height={barH}
                        rx={4}
                        fill={entry.color}
                      />
                    )}

                    <g fill="#261f1d" className="pointer-events-none">
                      {labelNode}
                    </g>

                    {barH > 0 && (
                      <g
                        fill="#ffffff"
                        clipPath={`url(#bar-clip-${uid}-${idx})`}
                        className="pointer-events-none"
                      >
                        {labelNode}
                      </g>
                    )}

                    <text
                      x={centerX}
                      y={valueY}
                      textAnchor="middle"
                      fontSize={barWidth < 36 ? '9.5' : '11'}
                      fontWeight="700"
                      fill={valueInsideBar ? '#ffffff' : '#7A1C33'}
                      className="font-mono pointer-events-none"
                    >
                      {valueText}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Centered Question Title below chart */}
            <h3 className="text-center text-sm font-bold tracking-tight text-slate-900">
              {question.numero}. {question.titulo}
            </h3>

            {activeBar && (
              <p className="text-center text-[11px] text-slate-600 tabular-nums">
                <strong className="text-slate-900">{activeBar.label}:</strong> {activeBar.count}{' '}
                {activeBar.count === 1 ? 'respuesta' : 'respuestas'} (
                {activeBar.pctOfSurvey.toFixed(1)}% de N={total})
              </p>
            )}
          </div>
        ) : (
          /* Gráfico de Torta: porciones limpias + etiqueta (opción y n/%) pegada a cada porción + título centrado abajo */
          <div className="space-y-2">
            <svg
              viewBox={`0 0 ${svgPieWidth} ${svgPieHeight}`}
              className="w-full overflow-visible"
              role="img"
              aria-label={`Gráfico de torta de ${question.titulo}`}
            >
              {computedArcs.length === 1 ? (
                <g
                  onMouseEnter={() => setHoveredIdx(0)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(hoveredIdx === 0 ? null : 0)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pieCenterX}
                    cy={pieCenterY}
                    r={pieRadius}
                    fill={computedArcs[0].color}
                  />
                  <text
                    x={pieCenterX + pieRadius + 14}
                    y={pieCenterY - 4}
                    textAnchor="start"
                    fontSize="12"
                    fontWeight="600"
                    fill="#1e293b"
                  >
                    {truncateLabel(computedArcs[0].label, 22)}
                  </text>
                  <text
                    x={pieCenterX + pieRadius + 14}
                    y={pieCenterY + 12}
                    textAnchor="start"
                    fontSize="12"
                    fontWeight="700"
                    fill="#0f172a"
                    className="font-mono"
                  >
                    {computedArcs[0].valueText}
                  </text>
                </g>
              ) : (
                <>
                  {/* Pie Slices */}
                  {computedArcs.map((arc) => {
                    const dimmed = hoveredIdx !== null && hoveredIdx !== arc.idx;
                    return (
                      <path
                        key={arc.label}
                        d={arc.pathD}
                        fill={arc.color}
                        opacity={dimmed ? 0.5 : 1}
                        transform={`translate(${arc.dx.toFixed(2)}, ${arc.dy.toFixed(2)})`}
                        onMouseEnter={() => setHoveredIdx(arc.idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => setHoveredIdx(hoveredIdx === arc.idx ? null : arc.idx)}
                        className="cursor-pointer transition-opacity duration-150"
                      />
                    );
                  })}

                  {/* Direct Perimeter Labels (Option Name + N°/%) */}
                  {computedArcs.map((arc) => {
                    const dimmed = hoveredIdx !== null && hoveredIdx !== arc.idx;
                    const displayOption = truncateLabel(arc.label, 21);

                    return (
                      <g
                        key={`lbl-${arc.label}`}
                        opacity={dimmed ? 0.45 : 1}
                        onMouseEnter={() => setHoveredIdx(arc.idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => setHoveredIdx(hoveredIdx === arc.idx ? null : arc.idx)}
                        className="cursor-pointer"
                      >
                        {arc.needsLeader && (
                          <polyline
                            points={`${arc.edgeX.toFixed(1)},${arc.edgeY.toFixed(1)} ${(
                              arc.labelX + (arc.isRight ? -5 : 5)
                            ).toFixed(1)},${arc.labelY.toFixed(1)}`}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth={1}
                          />
                        )}
                        <text
                          x={arc.labelX}
                          y={arc.labelY - 3}
                          textAnchor={arc.textAnchor}
                          fontSize="11.5"
                          fontWeight={hoveredIdx === arc.idx ? '700' : '500'}
                          fill="#1e293b"
                        >
                          {displayOption}
                        </text>
                        <text
                          x={arc.labelX}
                          y={arc.labelY + 12}
                          textAnchor={arc.textAnchor}
                          fontSize="11.5"
                          fontWeight="700"
                          fill="#0f172a"
                          className="font-mono"
                        >
                          {arc.valueText}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>

            {/* Centered Question Title below pie chart */}
            <h3 className="text-center text-sm font-bold tracking-tight text-slate-900">
              {question.numero}. {question.titulo}
            </h3>

            {activeSlice && (
              <p className="text-center text-[11px] text-slate-600 tabular-nums">
                <strong className="text-slate-900">{activeSlice.label}:</strong>{' '}
                {activeSlice.count} {activeSlice.count === 1 ? 'caso' : 'casos'} ·{' '}
                {activeSlice.pctOfSurvey.toFixed(1)}% de encuestados
                {question.multiple
                  ? ` (${activeSlice.shareOfMentions.toFixed(1)}% de selecciones)`
                  : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
