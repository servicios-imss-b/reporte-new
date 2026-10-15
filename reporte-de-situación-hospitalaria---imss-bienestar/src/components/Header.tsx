import React from 'react';
import { Building2, FileSpreadsheet, Download, RefreshCw, Printer } from 'lucide-react';

interface HeaderProps {
  activeTab: 'tablero' | 'bases';
  setActiveTab: (tab: 'tablero' | 'bases') => void;
  onOpenUpload: () => void;
  onExportReport: () => void;
  fechaCorte: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
  onExportReport,
  fechaCorte
}) => {
  return (
    <header className="bg-gradient-to-r from-[#063b2f] via-[#0b4d3e] to-[#0d5947] text-white shadow-xl border-b-4 border-[#b38e5d]">
      {/* Top institutional strip: Gobierno de México */}
      <div className="bg-[#052820] border-b border-[#0b4d3e]/80 py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-3">
            <span className="font-semibold tracking-wider uppercase text-amber-200">Gobierno de México</span>
            <span className="text-slate-500">•</span>
            <span className="font-medium text-emerald-100">Secretaría de Salud</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-300 font-semibold">IMSS Bienestar</span>
          </div>
          <div className="flex items-center space-x-4 mt-1 sm:mt-0">
            <span className="text-slate-300">Corte oficial: <strong className="text-amber-300">{fechaCorte}</strong></span>
          </div>
        </div>
      </div>

      {/* Main header banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            {/* Official IMSS Bienestar Institutional Emblem */}
            <div className="relative flex-shrink-0 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 shadow-inner">
              <svg
                className="w-12 h-12 text-white"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="IMSS Bienestar"
              >
                {/* Institutional Cross with Healing Leaf Motif */}
                <rect x="4" y="4" width="40" height="40" rx="10" fill="#063b2f" stroke="#b38e5d" strokeWidth="2" />
                <path d="M24 10V38M10 24H38" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="24" cy="24" r="14" stroke="#c59b27" strokeWidth="2.5" strokeDasharray="3 3" />
                <path d="M24 17C21 17 19 19.5 19 22.5C19 26 24 30 24 30C24 30 29 26 29 22.5C29 19.5 27 17 24 17Z" fill="#10b981" />
              </svg>
            </div>

            <div>
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-950/70 text-emerald-200 border border-emerald-500/30 mb-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Encuesta hospitalaria</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-['Montserrat']">
                Reporte de situación hospitalaria
              </h1>
              <p className="text-emerald-100/90 text-sm sm:text-base mt-0.5 font-normal max-w-2xl">
                Resultados agregados por pregunta, CLUES y entidad federativa de unidades médicas IMSS Bienestar.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              onClick={onOpenUpload}
              title="Cargar o actualizar archivo Excel"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-900/80 hover:bg-emerald-800 text-xs sm:text-sm font-medium text-emerald-100 rounded-lg border border-emerald-600/50 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Actualizar Excel</span>
            </button>

            <button
              onClick={onExportReport}
              title="Descargar datos agregados"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[#b38e5d] hover:bg-[#a07c4b] text-xs sm:text-sm font-semibold text-emerald-950 rounded-lg shadow transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            <button
              onClick={() => window.print()}
              title="Imprimir reporte"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 mt-6 pt-2 border-t border-emerald-800/60">
          <button
            onClick={() => setActiveTab('tablero')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'tablero'
                ? 'bg-white text-[#0b4d3e] shadow-lg shadow-black/10'
                : 'text-emerald-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Tablero Principal</span>
          </button>

          <button
            onClick={() => setActiveTab('bases')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'bases'
                ? 'bg-white text-[#0b4d3e] shadow-lg shadow-black/10'
                : 'text-emerald-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bases y Consultas</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#b38e5d]/30 text-amber-200 font-semibold">
              Exportable
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
