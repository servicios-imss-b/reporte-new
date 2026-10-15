import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, X, Check, PieChart, Sparkles } from 'lucide-react';
import type { EntidadItem, CalificacionStats, CluesItem } from '../types/reporte';

interface ChartCalificacionEntidadProps {
  calificacionGeneral: CalificacionStats;
  porEntidad: Record<string, EntidadItem>;
  entidadesList: string[];
  selectedCluesItem: CluesItem | null;
}

export const ChartCalificacionEntidad: React.FC<ChartCalificacionEntidadProps> = ({
  calificacionGeneral,
  porEntidad,
  entidadesList,
  selectedCluesItem
}) => {
  const [selectedEntidad, setSelectedEntidad] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [clasificacionFilter, setClasificacionFilter] = useState<'Todas' | 'Buena' | 'Regular' | 'Mala'>('Todas');

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // If a CLUES is selected from outside, set default to that entity
  useEffect(() => {
    if (selectedCluesItem) {
      setSelectedEntidad(selectedCluesItem.entidad);
      setSearchTerm(selectedCluesItem.entidad);
    }
  }, [selectedCluesItem]);

  // Click outside to close autocomplete
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter entities suggestions
  const filteredEntidades = useMemo(() => {
    if (!searchTerm.trim()) return entidadesList;
    const term = searchTerm.toLowerCase();
    return entidadesList.filter(e => e.toLowerCase().includes(term));
  }, [entidadesList, searchTerm]);

  // Compute stats to display based on selected entity
  const currentStats = useMemo(() => {
    if (selectedCluesItem) {
      // In CLUES unit mode
      return {
        label: `Unidad ${selectedCluesItem.clues} (${selectedCluesItem.entidad})`,
        total: selectedCluesItem.total,
        buena: selectedCluesItem.buena,
        regular: selectedCluesItem.regular,
        mala: selectedCluesItem.mala,
        porcentajeBuena: selectedCluesItem.porcentajeBuena,
        porcentajeRegular: selectedCluesItem.porcentajeRegular,
        porcentajeMala: selectedCluesItem.porcentajeMala,
      };
    }

    if (selectedEntidad && porEntidad[selectedEntidad]) {
      const ent = porEntidad[selectedEntidad];
      return {
        label: ent.entidad,
        total: ent.total,
        buena: ent.buena,
        regular: ent.regular,
        mala: ent.mala,
        porcentajeBuena: ent.porcentajeBuena,
        porcentajeRegular: ent.porcentajeRegular,
        porcentajeMala: ent.porcentajeMala,
      };
    }

    return {
      label: 'Nivel Nacional (Todas las entidades)',
      total: calificacionGeneral.total,
      buena: calificacionGeneral.buena,
      regular: calificacionGeneral.regular,
      mala: calificacionGeneral.mala,
      porcentajeBuena: calificacionGeneral.porcentajes.buena,
      porcentajeRegular: calificacionGeneral.porcentajes.regular,
      porcentajeMala: calificacionGeneral.porcentajes.mala,
    };
  }, [selectedEntidad, porEntidad, calificacionGeneral, selectedCluesItem]);

  // Handle donut SVG paths
  const donutSlices = useMemo(() => {
    const total = currentStats.total || 1;
    let buenaCount = currentStats.buena;
    let regularCount = currentStats.regular;
    let malaCount = currentStats.mala;

    // If classification filter is not 'Todas', we highlight or isolate
    const slices = [
      { id: 'Buena', label: 'Buena', count: buenaCount, color: '#10b981', hoverColor: '#059669', p: (buenaCount / total) * 100 },
      { id: 'Regular', label: 'Regular', count: regularCount, color: '#f59e0b', hoverColor: '#d97706', p: (regularCount / total) * 100 },
      { id: 'Mala', label: 'Mala', count: malaCount, color: '#ef4444', hoverColor: '#dc2626', p: (malaCount / total) * 100 },
    ];

    let currentAngle = 0;
    return slices.map(s => {
      const angle = (s.count / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // Opacity based on classification filter
      const isFilteredOut = clasificacionFilter !== 'Todas' && clasificacionFilter !== s.id;
      const opacity = isFilteredOut ? 0.25 : 1;

      return {
        ...s,
        startAngle,
        endAngle,
        angle,
        opacity
      };
    });
  }, [currentStats, clasificacionFilter]);

  // Helper to convert polar to cartesian
  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  }

  function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
    // If arc is full circle (or almost full)
    const sweep = endAngle - startAngle;
    if (sweep >= 359.99) {
      endAngle = startAngle + 359.99;
    }
    const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
    const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
    const startInner = polarToCartesian(x, y, innerRadius, endAngle);
    const endInner = polarToCartesian(x, y, innerRadius, startAngle);

    const largeArcFlag = sweep <= 180 ? '0' : '1';

    return [
      'M', startOuter.x, startOuter.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
      'Z'
    ].join(' ');
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-50 text-amber-900 rounded-lg">
                <PieChart className="w-5 h-5 text-[#b38e5d]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-['Montserrat']">
                Calificación general por entidad
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Percepción global con buscador por entidad federativa y filtro de estatus.
            </p>
          </div>
        </div>

        {/* Search bar with Autocomplete for Entidad */}
        <div className="relative mb-4" ref={searchContainerRef}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Búsqueda de entidad federativa:
          </label>
          <div className="relative flex items-center">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Escribe el nombre de un estado (ej. Veracruz, Chiapas...)"
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-900"
            />
            {(searchTerm || selectedEntidad) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEntidad('');
                  setSearchTerm('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                title="Limpiar búsqueda y ver general"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && (
            <div className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntidad('');
                    setSearchTerm('');
                    setIsSearchOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between ${
                    !selectedEntidad ? 'bg-emerald-50 font-bold text-emerald-950' : 'text-slate-700'
                  }`}
                >
                  <span>Todas las entidades (general)</span>
                  {!selectedEntidad && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                </button>

                {filteredEntidades.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No hay coincidencias para &ldquo;{searchTerm}&rdquo;
                  </div>
                ) : (
                  filteredEntidades.map(ent => (
                    <button
                      key={ent}
                      type="button"
                      onClick={() => {
                        setSelectedEntidad(ent);
                        setSearchTerm(ent);
                        setIsSearchOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between ${
                        selectedEntidad === ent ? 'bg-emerald-50 font-bold text-emerald-950' : 'text-slate-700'
                      }`}
                    >
                      <span>{ent}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {porEntidad[ent]?.total || 0} resp.
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Classification Filter (Todas, Buena, Mala, Regular) */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Filtrar clasificación:
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {(['Todas', 'Buena', 'Regular', 'Mala'] as const).map(option => {
              const active = clasificacionFilter === option;
              let badgeColor = 'text-slate-600 hover:text-slate-900';
              if (active) {
                if (option === 'Todas') badgeColor = 'bg-white text-slate-900 shadow-sm';
                if (option === 'Buena') badgeColor = 'bg-emerald-600 text-white shadow-sm';
                if (option === 'Regular') badgeColor = 'bg-amber-500 text-white shadow-sm';
                if (option === 'Mala') badgeColor = 'bg-rose-600 text-white shadow-sm';
              }
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setClasificacionFilter(option)}
                  className={`py-1.5 text-center rounded-lg transition-all ${badgeColor}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Active Context Badge */}
        <div className="mb-4 text-center">
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-semibold border border-slate-200">
            {currentStats.label}
          </span>
        </div>

        {/* Donut Chart Visualization with Center Total */}
        <div className="flex flex-col items-center justify-center relative my-2">
          <div className="relative w-52 h-52">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {donutSlices.map(slice => {
                if (slice.count === 0) return null;
                const pathData = describeArc(100, 100, 56, 88, slice.startAngle, slice.endAngle);
                return (
                  <path
                    key={slice.id}
                    d={pathData}
                    fill={slice.color}
                    opacity={slice.opacity}
                    className="transition-all duration-300 hover:opacity-100 cursor-pointer"
                  >
                    <title>{`${slice.label}: ${slice.count} (${slice.p.toFixed(1)}%)`}</title>
                  </path>
                );
              })}
            </svg>

            {/* Total in center of Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900 font-['Montserrat'] tracking-tight">
                {clasificacionFilter === 'Todas'
                  ? currentStats.total
                  : clasificacionFilter === 'Buena'
                  ? currentStats.buena
                  : clasificacionFilter === 'Regular'
                  ? currentStats.regular
                  : currentStats.mala}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {clasificacionFilter === 'Todas' ? 'Respuestas' : `En "${clasificacionFilter}"`}
              </span>
              {clasificacionFilter !== 'Todas' && (
                <span className="text-xs font-semibold text-emerald-800 mt-0.5">
                  {(
                    (clasificacionFilter === 'Buena'
                      ? currentStats.porcentajeBuena
                      : clasificacionFilter === 'Regular'
                      ? currentStats.porcentajeRegular
                      : currentStats.porcentajeMala) || 0
                  ).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Breakdown cards */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
        <div
          onClick={() => setClasificacionFilter(clasificacionFilter === 'Buena' ? 'Todas' : 'Buena')}
          className={`cursor-pointer p-2 rounded-xl transition-all ${
            clasificacionFilter === 'Buena' ? 'bg-emerald-50 ring-1 ring-emerald-500' : 'bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-1 text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Buena</span>
          </div>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">{currentStats.buena}</div>
          <div className="text-[11px] text-slate-500">{currentStats.porcentajeBuena.toFixed(1)}%</div>
        </div>

        <div
          onClick={() => setClasificacionFilter(clasificacionFilter === 'Regular' ? 'Todas' : 'Regular')}
          className={`cursor-pointer p-2 rounded-xl transition-all ${
            clasificacionFilter === 'Regular' ? 'bg-amber-50 ring-1 ring-amber-500' : 'bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-1 text-xs font-bold text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Regular</span>
          </div>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">{currentStats.regular}</div>
          <div className="text-[11px] text-slate-500">{currentStats.porcentajeRegular.toFixed(1)}%</div>
        </div>

        <div
          onClick={() => setClasificacionFilter(clasificacionFilter === 'Mala' ? 'Todas' : 'Mala')}
          className={`cursor-pointer p-2 rounded-xl transition-all ${
            clasificacionFilter === 'Mala' ? 'bg-rose-50 ring-1 ring-rose-500' : 'bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-1 text-xs font-bold text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Mala</span>
          </div>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">{currentStats.mala}</div>
          <div className="text-[11px] text-slate-500">{currentStats.porcentajeMala.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
};
