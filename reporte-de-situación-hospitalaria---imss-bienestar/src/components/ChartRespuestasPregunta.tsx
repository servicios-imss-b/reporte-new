import React, { useState, useMemo, useEffect } from 'react';
import {
  HelpCircle,
  ChevronDown,
  MapPin,
  Building2,
  ArrowRight,
  Filter,
  RotateCcw,
  Layers,
  Sparkles,
  BarChart3
} from 'lucide-react';
import type { PreguntaItem, CluesItem, OpcionConteo } from '../types/reporte';

interface RegistroItem {
  clues: string;
  hospital: string;
  entidad: string;
  respuestas: Record<string, string>;
}

interface ChartRespuestasPreguntaProps {
  preguntas: PreguntaItem[];
  selectedCluesItem: CluesItem | null;
  entidadesList?: string[];
  cluesList?: Array<{ clues: string; hospital: string; entidad: string }>;
  registrosResumen?: RegistroItem[];
  porClues?: Record<string, CluesItem>;
}

export const ChartRespuestasPregunta: React.FC<ChartRespuestasPreguntaProps> = ({
  preguntas,
  selectedCluesItem,
  entidadesList = [],
  cluesList = [],
  registrosResumen = [],
  porClues = {}
}) => {
  // Cascading diagram state
  const [diagramEntidad, setDiagramEntidad] = useState<string>('');
  const [diagramClues, setDiagramClues] = useState<string>('');

  // Default to "¿Cuál es su formación principal?" or the first question
  const defaultPreguntaId = useMemo(() => {
    const found = preguntas.find(
      p =>
        p.titulo.toLowerCase().includes('formacion') ||
        p.titulo.toLowerCase().includes('formación')
    );
    return found ? found.id : preguntas.length > 0 ? preguntas[0].id : '';
  }, [preguntas]);

  const [selectedPreguntaId, setSelectedPreguntaId] = useState<string>(defaultPreguntaId);

  // Sync with global CLUES filter if active
  useEffect(() => {
    if (selectedCluesItem) {
      setDiagramEntidad(selectedCluesItem.entidad);
      setDiagramClues(selectedCluesItem.clues);
    }
  }, [selectedCluesItem]);

  // Current question object
  const currentPregunta = useMemo(() => {
    return preguntas.find(p => p.id === selectedPreguntaId) || preguntas[0];
  }, [preguntas, selectedPreguntaId]);

  // Clues list filtered by chosen entidad
  const availableCluesForEntidad = useMemo(() => {
    if (!diagramEntidad) return cluesList;
    return cluesList.filter(c => c.entidad.toLowerCase() === diagramEntidad.toLowerCase());
  }, [cluesList, diagramEntidad]);

  // Handle entidad change in diagram: reset CLUES if not matching
  const handleEntidadChange = (newEntidad: string) => {
    setDiagramEntidad(newEntidad);
    setDiagramClues(''); // reset CLUES when state changes
  };

  // Compute dynamic distribution based on diagram scope (Nacional vs Entidad vs CLUES)
  const computedDistribution = useMemo(() => {
    if (!currentPregunta) return { total: 0, opciones: [] as OpcionConteo[] };

    // Case 1: National (no entidad and no clues selected)
    if (!diagramEntidad && !diagramClues) {
      return {
        total: currentPregunta.totalRespuestas,
        opciones: currentPregunta.distribucion
      };
    }

    // Determine target records
    let records = registrosResumen;

    // Filter by entidad if selected
    if (diagramEntidad) {
      records = records.filter(
        r => r.entidad.toLowerCase() === diagramEntidad.toLowerCase()
      );
    }

    // Filter by CLUES if selected
    if (diagramClues) {
      records = records.filter(
        r => r.clues.toLowerCase() === diagramClues.toLowerCase()
      );
    }

    // Count occurrences for currentPregunta.titulo
    const counts = new Map<string, number>();
    let validCount = 0;

    for (const r of records) {
      const ans = r.respuestas[currentPregunta.titulo];
      if (ans) {
        validCount++;
        counts.set(ans, (counts.get(ans) || 0) + 1);
      }
    }

    // If no records in registrosResumen (e.g. initial fallback), try porClues
    if (validCount === 0 && diagramClues && porClues[diagramClues]) {
      const c = porClues[diagramClues];
      const ans = c.respuestas[currentPregunta.titulo];
      if (ans) {
        return {
          total: c.total,
          opciones: [
            {
              opcion: ans,
              conteo: c.total,
              porcentaje: 100
            }
          ]
        };
      }
    }

    // Map into OpcionConteo array
    const opciones: OpcionConteo[] = Array.from(counts.entries())
      .map(([opcion, conteo]) => ({
        opcion,
        conteo,
        porcentaje: validCount > 0 ? Number(((conteo / validCount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.conteo - a.conteo);

    return {
      total: validCount,
      opciones
    };
  }, [currentPregunta, diagramEntidad, diagramClues, registrosResumen, porClues]);

  // Max count for proportional bars
  const maxCount = useMemo(() => {
    if (computedDistribution.opciones.length === 0) return 1;
    return Math.max(...computedDistribution.opciones.map(o => o.conteo), 1);
  }, [computedDistribution]);

  // Reset diagram filters to national
  const handleResetFilters = () => {
    setDiagramEntidad('');
    setDiagramClues('');
  };

  if (!currentPregunta) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm text-center text-slate-500">
        No hay preguntas cerradas disponibles para mostrar.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm mb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-[#0b4d3e] rounded-xl border border-emerald-200/60 shadow-inner">
            <Layers className="w-5 h-5 text-[#0b4d3e]" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-['Montserrat'] flex items-center space-x-2">
              <span>Diagrama de respuestas por pregunta</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Explorador Jerárquico
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Flujo escalonado: Escoge Entidad &rarr; Unidad Hospitalaria (CLUES) &rarr; Pregunta cerrada.
            </p>
          </div>
        </div>

        {(diagramEntidad || diagramClues) && (
          <button
            onClick={handleResetFilters}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ver Nivel Nacional</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* DIAGRAMA DE FLUJO: 3 PASOS EN CASCADA CON NODOS VISUALES */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 mb-8 shadow-inner">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
          <Filter className="w-3.5 h-3.5 text-emerald-700" />
          <span>Diagrama de navegación en cascada:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* NODO 1: Entidad */}
          <div className="relative bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                  <span className="w-5 h-5 rounded-full bg-[#0b4d3e] text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                    1
                  </span>
                  <span>Entidad Federativa</span>
                </span>
                <MapPin className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Selecciona el estado</p>
            </div>

            <div className="relative">
              <select
                value={diagramEntidad}
                onChange={e => handleEntidadChange(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
              >
                <option value="">Todas las entidades (Nacional)</option>
                {entidadesList.map(ent => (
                  <option key={ent} value={ent}>
                    {ent}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* NODO 2: CLUES / Hospital */}
          <div className="relative bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                  <span className="w-5 h-5 rounded-full bg-[#0b4d3e] text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                    2
                  </span>
                  <span>Unidad Médica (CLUES)</span>
                </span>
                <Building2 className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                {diagramEntidad
                  ? `${availableCluesForEntidad.length} unidades en ${diagramEntidad}`
                  : `${cluesList.length} unidades disponibles`}
              </p>
            </div>

            <div className="relative">
              <select
                value={diagramClues}
                onChange={e => setDiagramClues(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer truncate"
              >
                <option value="">
                  {diagramEntidad
                    ? `Todas las unidades de ${diagramEntidad}`
                    : 'Todas las unidades (general)'}
                </option>
                {availableCluesForEntidad.map(item => (
                  <option key={item.clues} value={item.clues}>
                    [{item.clues}] {item.hospital}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* NODO 3: Pregunta Desplegable */}
          <div className="relative bg-white p-3.5 rounded-xl border border-emerald-300 ring-2 ring-emerald-500/10 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#0b4d3e]">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                    3
                  </span>
                  <span>Pregunta Desplegable</span>
                </span>
                <HelpCircle className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-[11px] text-slate-400 mb-2">{preguntas.length} preguntas disponibles</p>
            </div>

            <div className="relative">
              <select
                value={currentPregunta.id}
                onChange={e => setSelectedPreguntaId(e.target.value)}
                className="w-full appearance-none bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-400 rounded-lg px-3 py-2 text-xs font-bold text-emerald-950 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-700 transition-all cursor-pointer truncate shadow-sm"
              >
                {preguntas.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-800 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status chip banner */}
        <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtro activo:</span>
            <span className="inline-flex items-center space-x-1 font-semibold text-emerald-900 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{diagramEntidad || 'Nivel Nacional'}</span>
              {diagramClues && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="font-mono text-slate-800">CLUES: {diagramClues}</span>
                </>
              )}
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Total en este ámbito:{' '}
            <strong className="text-slate-900 font-bold">{computedDistribution.total}</strong>{' '}
            {computedDistribution.total === 1 ? 'respuesta' : 'respuestas'}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ENCABEZADO DE RESULTADOS: PREGUNTA Y TOTAL DE RESPUESTAS */}
      {/* ========================================================= */}
      <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
            Pregunta evaluada
          </span>
          <h4 className="text-base sm:text-lg font-bold text-slate-900 font-['Montserrat'] mt-1">
            {currentPregunta.titulo}
          </h4>
        </div>

        {/* Badge del total de respuestas (ej. 131 respuestas) */}
        <div className="flex items-center space-x-2 self-start sm:self-auto bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono">
            {computedDistribution.total}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {computedDistribution.total === 1 ? 'respuesta' : 'respuestas'}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CARDS POR OPCIÓN (CON NOMBRE, CONTEO Y PORCENTAJE)       */}
      {/* ========================================================= */}
      {computedDistribution.opciones.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
          No se registraron respuestas en este corte para la opción seleccionada.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {computedDistribution.opciones.map((item, idx) => {
            const barWidthPercent = (item.conteo / maxCount) * 100;

            return (
              <div
                key={idx}
                className="group relative bg-white hover:bg-slate-50/60 p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#0b4d3e] transition-colors leading-snug">
                      {item.opcion}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Números: Conteo y Porcentaje */}
                  <div className="flex items-baseline space-x-2 my-2">
                    <span className="text-3xl font-extrabold text-slate-900 font-['Montserrat'] tracking-tight">
                      {item.conteo}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                      ({item.porcentaje.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Mini barra de progreso relativa */}
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#0b4d3e] to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, barWidthPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* GRÁFICA DE BARRAS HORIZONTALES COMPARATIVAS               */}
      {/* ========================================================= */}
      {computedDistribution.opciones.length > 0 && (
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-800" />
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Visualización comparativa de frecuencias:
            </h5>
          </div>

          <div className="space-y-3">
            {computedDistribution.opciones.map((item, idx) => {
              const barWidthPercent = (item.conteo / maxCount) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate pr-2" title={item.opcion}>
                      {item.opcion}
                    </span>
                    <span className="font-mono text-slate-700 flex-shrink-0 font-bold">
                      {item.conteo} <span className="text-slate-400 font-normal">({item.porcentaje.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 rounded-lg h-4 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-[#0b4d3e] to-emerald-600 transition-all duration-500"
                      style={{ width: `${Math.max(4, barWidthPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <span>
          Base calculada en tiempo real según los nodos seleccionados en el diagrama.
        </span>
        <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-medium text-[11px]">
          Excluye campos de texto libre y datos confidenciales
        </span>
      </div>
    </div>
  );
};
