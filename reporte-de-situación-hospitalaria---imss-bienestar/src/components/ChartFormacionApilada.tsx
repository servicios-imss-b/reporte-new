import React, { useState } from 'react';
import type { FormacionItem, CluesItem } from '../types/reporte';
import { GraduationCap, BarChart3, Info } from 'lucide-react';

interface ChartFormacionApiladaProps {
  data: FormacionItem[];
  selectedCluesItem: CluesItem | null;
}

export const ChartFormacionApilada: React.FC<ChartFormacionApiladaProps> = ({
  data,
  selectedCluesItem
}) => {
  const [viewMode, setViewMode] = useState<'conteo' | 'porcentaje'>('conteo');

  // If a specific CLUES is selected, calculate unit-level formation data
  const displayData = React.useMemo(() => {
    if (!selectedCluesItem) return data;

    const unitFormacion = selectedCluesItem.respuestas['¿Cuál es su formación principal?'] ||
      selectedCluesItem.respuestas['Formación principal'] ||
      'Personal hospitalario';

    return [
      {
        formacion: unitFormacion,
        total: selectedCluesItem.total,
        buena: selectedCluesItem.buena,
        regular: selectedCluesItem.regular,
        mala: selectedCluesItem.mala,
        porcentajeBuena: selectedCluesItem.porcentajeBuena,
        porcentajeRegular: selectedCluesItem.porcentajeRegular,
        porcentajeMala: selectedCluesItem.porcentajeMala,
      }
    ];
  }, [data, selectedCluesItem]);

  const maxTotal = Math.max(...displayData.map(d => d.total), 1);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 text-[#0b4d3e] rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-['Montserrat']">
              Formación principal y situación hospitalaria
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Distribución de la percepción hospitalaria (Buena, Regular, Mala) clasificada por perfil profesional.
          </p>
        </div>

        {/* View Switcher: Conteos vs Porcentajes */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('conteo')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'conteo'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Conteos
          </button>
          <button
            type="button"
            onClick={() => setViewMode('porcentaje')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'porcentaje'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Porcentajes (100%)
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-start gap-4 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shadow-sm"></span>
          <span className="font-semibold text-slate-700">Buena</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block shadow-sm"></span>
          <span className="font-semibold text-slate-700">Regular</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block shadow-sm"></span>
          <span className="font-semibold text-slate-700">Mala</span>
        </div>
        <div className="ml-auto text-slate-400 text-[11px] hidden sm:block">
          Pasa el cursor sobre cada segmento para ver detalles
        </div>
      </div>

      {/* Stacked Bars */}
      <div className="space-y-5">
        {displayData.map((item) => {
          const pBuena = item.total > 0 ? (item.buena / item.total) * 100 : 0;
          const pRegular = item.total > 0 ? (item.regular / item.total) * 100 : 0;
          const pMala = item.total > 0 ? (item.mala / item.total) * 100 : 0;

          // Bar width percentage if in count mode
          const barWidthPercent = viewMode === 'conteo'
            ? Math.max(15, (item.total / maxTotal) * 100)
            : 100;

          return (
            <div key={item.formacion} className="group">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-800 text-sm group-hover:text-[#0b4d3e] transition-colors">
                  {item.formacion}
                </span>
                <span className="text-slate-500 font-medium font-mono">
                  {item.total} {item.total === 1 ? 'respuesta' : 'respuestas'}
                </span>
              </div>

              {/* Bar track container */}
              <div className="w-full bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
                <div
                  className="h-8 rounded-md flex overflow-hidden transition-all duration-300"
                  style={{ width: `${barWidthPercent}%` }}
                >
                  {/* Segment: Buena */}
                  {item.buena > 0 && (
                    <div
                      style={{ width: `${pBuena}%` }}
                      className="bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center text-white text-[11px] font-bold overflow-hidden relative group/seg"
                      title={`Buena: ${item.buena} (${pBuena.toFixed(1)}%)`}
                    >
                      {pBuena > 12 && <span>{viewMode === 'conteo' ? item.buena : `${pBuena.toFixed(0)}%`}</span>}
                    </div>
                  )}

                  {/* Segment: Regular */}
                  {item.regular > 0 && (
                    <div
                      style={{ width: `${pRegular}%` }}
                      className="bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center text-white text-[11px] font-bold overflow-hidden relative group/seg"
                      title={`Regular: ${item.regular} (${pRegular.toFixed(1)}%)`}
                    >
                      {pRegular > 12 && <span>{viewMode === 'conteo' ? item.regular : `${pRegular.toFixed(0)}%`}</span>}
                    </div>
                  )}

                  {/* Segment: Mala */}
                  {item.mala > 0 && (
                    <div
                      style={{ width: `${pMala}%` }}
                      className="bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center text-white text-[11px] font-bold overflow-hidden relative group/seg"
                      title={`Mala: ${item.mala} (${pMala.toFixed(1)}%)`}
                    >
                      {pMala > 12 && <span>{viewMode === 'conteo' ? item.mala : `${pMala.toFixed(0)}%`}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Numerical breakdown row */}
              <div className="flex items-center space-x-4 text-[11px] text-slate-500 mt-1 pl-1">
                <span>
                  Buena: <strong className="text-emerald-700 font-semibold">{item.buena}</strong> ({pBuena.toFixed(1)}%)
                </span>
                <span>•</span>
                <span>
                  Regular: <strong className="text-amber-700 font-semibold">{item.regular}</strong> ({pRegular.toFixed(1)}%)
                </span>
                <span>•</span>
                <span>
                  Mala: <strong className="text-rose-700 font-semibold">{item.mala}</strong> ({pMala.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCluesItem && (
        <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 flex items-center space-x-2">
          <Info className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>
            Mostrando el desglose de la unidad <strong>{selectedCluesItem.clues}</strong>. Desactiva el filtro global para ver todas las formaciones profesionales.
          </span>
        </div>
      )}
    </div>
  );
};
