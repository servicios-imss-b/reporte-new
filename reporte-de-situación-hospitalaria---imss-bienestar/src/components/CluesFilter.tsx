import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Building, X, ChevronDown, Check, Filter } from 'lucide-react';
import type { CluesItem } from '../types/reporte';

interface CluesFilterProps {
  cluesList: Array<{ clues: string; hospital: string; entidad: string }>;
  selectedClues: string;
  onSelectClues: (clues: string) => void;
  selectedCluesItem: CluesItem | null;
}

export const CluesFilter: React.FC<CluesFilterProps> = ({
  cluesList,
  selectedClues,
  onSelectClues,
  selectedCluesItem
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return cluesList;
    const term = searchTerm.toLowerCase();
    return cluesList.filter(
      item =>
        item.clues.toLowerCase().includes(term) ||
        item.hospital.toLowerCase().includes(term) ||
        item.entidad.toLowerCase().includes(term)
    );
  }, [cluesList, searchTerm]);

  const handleSelect = (cluesKey: string) => {
    onSelectClues(cluesKey);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-8" ref={dropdownRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-50 text-[#0b4d3e] rounded-lg border border-emerald-200/60">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Desglose por unidad hospitalaria
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona una unidad médica para filtrar todas las gráficas o consulta el total general.
            </p>
          </div>
        </div>

        {selectedClues && (
          <button
            onClick={() => onSelectClues('')}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Restablecer a general</span>
          </button>
        )}
      </div>

      {/* Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
            selectedClues
              ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
              : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/80'
          }`}
        >
          <div className="flex items-center space-x-3 truncate">
            <Building className={`w-5 h-5 flex-shrink-0 ${selectedClues ? 'text-emerald-700' : 'text-slate-400'}`} />
            {selectedCluesItem ? (
              <div className="truncate">
                <span className="font-bold text-slate-900 text-sm">{selectedCluesItem.hospital}</span>
                <span className="text-xs text-slate-500 ml-2">
                  [{selectedCluesItem.clues}] — <strong className="text-emerald-800">{selectedCluesItem.entidad}</strong>
                </span>
              </div>
            ) : (
              <div>
                <span className="font-semibold text-slate-800 text-sm">Todas las unidades (general)</span>
                <span className="text-xs text-slate-500 ml-2">({cluesList.length} unidades censadas a nivel nacional)</span>
              </div>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-40 mt-2 w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-50 duration-150">
            {/* Search Input inside dropdown */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por CLUES, nombre del hospital o estado (ej. Nayarit, VCSSA...)"
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List options */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {/* Option: General */}
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm hover:bg-emerald-50 transition-colors ${
                  !selectedClues ? 'bg-emerald-50/70 font-bold text-emerald-900' : 'text-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900">Todas las unidades (general)</div>
                  <div className="text-xs text-slate-500">Muestra los datos acumulados de toda la muestra</div>
                </div>
                {!selectedClues && <Check className="w-4 h-4 text-emerald-700" />}
              </button>

              {filteredList.length === 0 ? (
                <div className="p-6 text-center text-xs sm:text-sm text-slate-500">
                  No se encontraron unidades médicas que coincidan con &ldquo;{searchTerm}&rdquo;
                </div>
              ) : (
                filteredList.map(item => {
                  const isSelected = selectedClues === item.clues;
                  return (
                    <button
                      key={item.clues}
                      type="button"
                      onClick={() => handleSelect(item.clues)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm hover:bg-emerald-50 transition-colors ${
                        isSelected ? 'bg-emerald-50 font-bold text-emerald-950' : 'text-slate-800'
                      }`}
                    >
                      <div className="truncate pr-4">
                        <div className="font-semibold text-slate-900 truncate">{item.hospital}</div>
                        <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                            {item.clues}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-800 font-medium">{item.entidad}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="bg-slate-50 px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100 flex justify-between">
              <span>{filteredList.length} de {cluesList.length} unidades disponibles</span>
              <span>Filtrado global activo</span>
            </div>
          </div>
        )}
      </div>

      {selectedCluesItem && (
        <div className="mt-3 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
          <div className="flex items-center space-x-2">
            <span className="font-bold bg-[#0b4d3e] text-white px-2 py-0.5 rounded text-[11px]">
              FILTRANDO UNIDAD
            </span>
            <span className="font-medium text-slate-900">{selectedCluesItem.hospital}</span>
            <span className="text-slate-600">({selectedCluesItem.entidad})</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>Calificación: <strong className={`font-bold ${
              selectedCluesItem.buena > 0 ? 'text-emerald-700' : selectedCluesItem.regular > 0 ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {selectedCluesItem.buena > 0 ? 'Buena' : selectedCluesItem.regular > 0 ? 'Regular' : 'Mala'}
            </strong></span>
            <span>Respuestas: <strong>{selectedCluesItem.total}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
