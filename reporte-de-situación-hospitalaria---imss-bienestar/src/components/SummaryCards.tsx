import React from 'react';
import { FileCheck, MapPin, HelpCircle, Hospital, ShieldCheck } from 'lucide-react';
import type { ResumenData, CluesItem } from '../types/reporte';

interface SummaryCardsProps {
  resumen: ResumenData;
  selectedCluesItem: CluesItem | null;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  resumen,
  selectedCluesItem
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Tarjeta 1: Respuestas */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 rounded-2xl p-5 border border-emerald-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 tracking-wider uppercase mb-1">
              Respuestas
            </p>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#063b2f] tracking-tight font-['Montserrat']">
              {selectedCluesItem ? selectedCluesItem.total : resumen.totalRespuestas.toLocaleString('es-MX')}
            </h3>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              {selectedCluesItem ? 'Respuestas en esta unidad' : 'Total de respuestas válidas'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0b4d3e] to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/20">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excluye pruebas técnicas</span>
          </span>
          <span className="font-semibold text-emerald-900">100% validadas</span>
        </div>
      </div>

      {/* Tarjeta 2: Entidades */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-2xl p-5 border border-amber-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-800 tracking-wider uppercase mb-1">
              Entidades
            </p>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-amber-950 tracking-tight font-['Montserrat']">
              {selectedCluesItem ? '1' : resumen.totalEntidades}
            </h3>
            <p className="text-xs text-amber-800 mt-1 font-medium">
              {selectedCluesItem ? selectedCluesItem.entidad : 'Estados de la República con reporte'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#b38e5d] to-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-900/20">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-900">
          <span>Cobertura regional</span>
          <span className="font-semibold">IMSS Bienestar</span>
        </div>
      </div>

      {/* Tarjeta 3: Preguntas con datos */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-50/80 via-white to-teal-50/40 rounded-2xl p-5 border border-teal-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-teal-800 tracking-wider uppercase mb-1">
              Preguntas con datos
            </p>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-teal-950 tracking-tight font-['Montserrat']">
              {resumen.preguntasConDatos}
            </h3>
            <p className="text-xs text-teal-800 mt-1 font-medium">
              Variables cerradas agregadas
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-900/20">
            <HelpCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-teal-100 flex items-center justify-between text-[11px] text-teal-900">
          <span>Dimensiones clínicas y operativas</span>
          <span className="font-semibold">Estandarizadas</span>
        </div>
      </div>

      {/* Tarjeta 4: Unidades CLUES */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 tracking-wider uppercase mb-1">
              Unidades CLUES
            </p>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Montserrat']">
              {selectedCluesItem ? '1' : resumen.totalClues}
            </h3>
            <p className="text-xs text-slate-600 mt-1 font-medium truncate max-w-[170px]" title={selectedCluesItem ? selectedCluesItem.clues : 'Hospitales y centros censados'}>
              {selectedCluesItem ? selectedCluesItem.clues : 'Hospitales censados'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1e293b] to-slate-600 flex items-center justify-center text-white shadow-md shadow-slate-900/20">
            <Hospital className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-700">
          <span>Clave Única de Establecimiento</span>
          <span className="font-semibold text-slate-900">{selectedCluesItem ? 'Seleccionada' : 'Nivel nacional'}</span>
        </div>
      </div>
    </div>
  );
};
