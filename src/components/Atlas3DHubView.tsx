import React, { Component, Suspense, lazy, useState } from 'react';
import { AlertTriangle, Bone, RotateCcw, Sparkles } from 'lucide-react';

function lazyWithRetry<T extends React.ComponentType<Record<string, never>>>(
  importer: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch {
      // Retry once in case a transient network or chunk hiccup occurred
      return await importer();
    }
  });
}

const AtlasOsteologicoView = lazyWithRetry(() =>
  import('./AtlasOsteologicoView').then((m) => ({
    default: m.AtlasOsteologicoView,
  }))
);

const AtlasDentarioView = lazyWithRetry(() =>
  import('./AtlasDentarioView').then((m) => ({
    default: m.AtlasDentarioView,
  }))
);

export type AtlasSubModule = 'osteologico' | 'dentario';

interface AtlasBoundaryProps {
  children: React.ReactNode;
  moduleLabel: string;
  onResetModule?: () => void;
}

interface AtlasBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AtlasErrorBoundary extends Component<
  AtlasBoundaryProps,
  AtlasBoundaryState
> {
  state: AtlasBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): AtlasBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Error inesperado en el visor 3D.',
    };
  }

  componentDidCatch(_error: Error): void {
    // Handled gracefully by UI fallback
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-[#FFFDF9] p-6 text-center">
          <AlertTriangle size={28} className="text-rose-800" />
          <h2 className="mt-3 font-serif text-lg font-bold text-rose-950">
            No se pudo renderizar {this.props.moduleLabel}
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-600">
            {this.state.errorMessage ||
              'Se produjo una interrupción temporal en el entorno gráfico WebGL del navegador.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                this.props.onResetModule?.();
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-rose-900 px-4 text-xs font-bold text-white hover:bg-rose-950"
            >
              <RotateCcw size={14} />
              <span>Reintentar módulo 3D</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const Atlas3DHubView: React.FC = () => {
  const [subModule, setSubModule] = useState<AtlasSubModule>('dentario');
  const [retryNonce, setRetryNonce] = useState(0);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Selector de Módulo dentro de Atlas 3D */}
      <div className="flex flex-col gap-3 rounded-2xl border border-rose-200/80 bg-[#FFFDF9] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-900/10 text-rose-900">
            <Bone size={16} />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-emerald-700 uppercase">
              ATLAS ANATÓMICO 3D INTERACTIVO
            </p>
            <p className="text-xs text-slate-600">
              Seleccioná el módulo tridimensional para estudiar o autoevaluarte
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Módulos del Atlas 3D"
          className="grid grid-cols-2 gap-1.5 rounded-xl border border-rose-200 bg-[#FAF6F0] p-1 sm:inline-flex"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subModule === 'osteologico'}
            onClick={() => setSubModule('osteologico')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
              subModule === 'osteologico'
                ? 'bg-rose-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-rose-100/60 hover:text-rose-950'
            }`}
          >
            <Bone size={14} />
            <span>Atlas Osteológico 3D</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subModule === 'dentario'}
            onClick={() => setSubModule('dentario')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
              subModule === 'dentario'
                ? 'bg-rose-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-rose-100/60 hover:text-rose-950'
            }`}
          >
            <Sparkles size={14} />
            <span>Atlas Dentario 3D</span>
          </button>
        </div>
      </div>

      {/* Sub-módulo activo protegido contra errores WebGL o de carga */}
      <AtlasErrorBoundary
        key={`${subModule}-${retryNonce}`}
        moduleLabel={
          subModule === 'dentario' ? 'Atlas Dentario 3D' : 'Atlas Osteológico 3D'
        }
        onResetModule={() => setRetryNonce((n) => n + 1)}
      >
        <Suspense
          fallback={
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-rose-200/80 bg-[#FFFDF9] px-4 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-rose-900" />
              <p className="mt-3 text-xs font-semibold text-rose-950">
                {subModule === 'dentario'
                  ? 'Preparando Atlas Dentario 3D...'
                  : 'Preparando Atlas Osteológico 3D...'}
              </p>
            </div>
          }
        >
          {subModule === 'osteologico' ? (
            <AtlasOsteologicoView />
          ) : (
            <AtlasDentarioView />
          )}
        </Suspense>
      </AtlasErrorBoundary>
    </div>
  );
};
