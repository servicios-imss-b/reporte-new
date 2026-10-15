import React, { useState, useMemo } from 'react';
import {
  Download,
  Search,
  ArrowUpDown,
  Building2,
  MapPin,
  GraduationCap,
  HelpCircle,
  FileJson,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
  RotateCcw,
  Sparkles,
  BarChart3,
  Filter,
  CheckCircle2,
  Grid
} from 'lucide-react';
import type { ReportePayload, CluesItem, EntidadItem, FormacionItem, PreguntaItem, OpcionConteo } from '../types/reporte';

interface BasesViewProps {
  data: ReportePayload;
}

type SubViewType = 'clues' | 'entidad' | 'formacion' | 'preguntas';

export const BasesView: React.FC<BasesViewProps> = ({ data }) => {
  const [activeSubView, setActiveSubView] = useState<SubViewType>('clues');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [sortField, setSortField] = useState<string>('total');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // ========================================================
  // STATE FOR DIAGRAMA EN SUBPESTAÑA "RESPUESTAS POR PREGUNTA"
  // ========================================================
  const [diagramEstado, setDiagramEstado] = useState<string>('');
  const [diagramClues, setDiagramClues] = useState<string>('');

  // Default to "¿Cuál es su formación principal?"
  const defaultPreguntaId = useMemo(() => {
    const found = data.preguntasCerradas.find(
      p =>
        p.titulo.toLowerCase().includes('formacion') ||
        p.titulo.toLowerCase().includes('formación')
    );
    return found ? found.id : data.preguntasCerradas.length > 0 ? data.preguntasCerradas[0].id : '';
  }, [data.preguntasCerradas]);

  const [selectedPreguntaId, setSelectedPreguntaId] = useState<string>(defaultPreguntaId);
  const [preguntasDisplayMode, setPreguntasDisplayMode] = useState<'diagrama' | 'todas'>('diagrama');

  // Reset page when switching views or searching
  const handleViewChange = (v: SubViewType) => {
    setActiveSubView(v);
    setSearchTerm('');
    setCurrentPage(1);
    setSortField('total');
    setSortAsc(false);
  };

  // Convert array of objects to CSV download
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Download JSON
  const downloadJSON = (filename: string, jsonData: any) => {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // 1. DATA FOR: Calificación por CLUES
  const cluesData = useMemo(() => {
    const list = Object.values(data.porClues);
    let filtered = list;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = list.filter(
        item =>
          item.clues.toLowerCase().includes(q) ||
          item.hospital.toLowerCase().includes(q) ||
          item.entidad.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => {
      const valA = (a as any)[sortField] ?? '';
      const valB = (b as any)[sortField] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB), 'es')
        : String(valB).localeCompare(String(valA), 'es');
    });
  }, [data.porClues, searchTerm, sortField, sortAsc]);

  // 2. DATA FOR: Calificación por entidad
  const entidadData = useMemo(() => {
    const list = Object.values(data.porEntidad);
    let filtered = list;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = list.filter(item => item.entidad.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => {
      const valA = (a as any)[sortField] ?? '';
      const valB = (b as any)[sortField] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB), 'es')
        : String(valB).localeCompare(String(valA), 'es');
    });
  }, [data.porEntidad, searchTerm, sortField, sortAsc]);

  // 3. DATA FOR: Formación y calificación
  const formacionData = useMemo(() => {
    const list = data.formacionYCalificacion;
    let filtered = list;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = list.filter(item => item.formacion.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => {
      const valA = (a as any)[sortField] ?? '';
      const valB = (b as any)[sortField] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB), 'es')
        : String(valB).localeCompare(String(valA), 'es');
    });
  }, [data.formacionYCalificacion, searchTerm, sortField, sortAsc]);

  // 4. DATA FOR: Respuestas por pregunta (lista completa)
  const preguntasData = useMemo(() => {
    const list = data.preguntasCerradas;
    let filtered = list;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = list.filter(
        item =>
          item.titulo.toLowerCase().includes(q) ||
          item.distribucion.some(d => d.opcion.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [data.preguntasCerradas, searchTerm]);

  // ========================================================
  // LÓGICA DEL DIAGRAMA: ESTADO -> CLUES -> PREGUNTA -> CARD
  // ========================================================
  const currentPreguntaDiagram = useMemo(() => {
    return (
      data.preguntasCerradas.find(p => p.id === selectedPreguntaId) ||
      data.preguntasCerradas[0]
    );
  }, [data.preguntasCerradas, selectedPreguntaId]);

  // CLUES disponibles filtradas por el estado elegido en el paso 1
  const availableCluesForDiagram = useMemo(() => {
    if (!diagramEstado) return data.cluesList;
    return data.cluesList.filter(
      c => c.entidad.toLowerCase() === diagramEstado.toLowerCase()
    );
  }, [data.cluesList, diagramEstado]);

  const handleDiagramEstadoChange = (newEstado: string) => {
    setDiagramEstado(newEstado);
    setDiagramClues(''); // Reset de CLUES al cambiar de estado
  };

  // Cálculo dinámico de la distribución para la card del diagrama
  const diagramDistribution = useMemo(() => {
    if (!currentPreguntaDiagram) return { total: 0, opciones: [] as OpcionConteo[] };

    // Si está a nivel nacional sin filtros, devolver la base precalculada
    if (!diagramEstado && !diagramClues) {
      return {
        total: currentPreguntaDiagram.totalRespuestas,
        opciones: currentPreguntaDiagram.distribucion
      };
    }

    let records = data.registrosResumen || [];

    if (diagramEstado) {
      records = records.filter(
        r => r.entidad.toLowerCase() === diagramEstado.toLowerCase()
      );
    }

    if (diagramClues) {
      records = records.filter(
        r => r.clues.toLowerCase() === diagramClues.toLowerCase()
      );
    }

    const counts = new Map<string, number>();
    let validCount = 0;

    for (const r of records) {
      const ans = r.respuestas[currentPreguntaDiagram.titulo];
      if (ans) {
        validCount++;
        counts.set(ans, (counts.get(ans) || 0) + 1);
      }
    }

    // Fallback con porClues si CLUES específico no tuviera fila en registrosResumen
    if (validCount === 0 && diagramClues && data.porClues[diagramClues]) {
      const c = data.porClues[diagramClues];
      const ans = c.respuestas[currentPreguntaDiagram.titulo];
      if (ans) {
        return {
          total: c.total,
          opciones: [{ opcion: ans, conteo: c.total, porcentaje: 100 }]
        };
      }
    }

    const opciones: OpcionConteo[] = Array.from(counts.entries())
      .map(([opcion, conteo]) => ({
        opcion,
        conteo,
        porcentaje: validCount > 0 ? Number(((conteo / validCount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.conteo - a.conteo);

    return { total: validCount, opciones };
  }, [currentPreguntaDiagram, diagramEstado, diagramClues, data.registrosResumen, data.porClues]);

  const diagramMaxCount = useMemo(() => {
    if (diagramDistribution.opciones.length === 0) return 1;
    return Math.max(...diagramDistribution.opciones.map(o => o.conteo), 1);
  }, [diagramDistribution]);

  // Export handlers
  const handleExportCSV = () => {
    if (activeSubView === 'clues') {
      const headers = ['CLUES', 'Hospital', 'Entidad', 'Total Respuestas', 'Buena', 'Regular', 'Mala', '% Buena', '% Regular', '% Mala'];
      const rows = cluesData.map(c => [
        c.clues,
        c.hospital,
        c.entidad,
        c.total,
        c.buena,
        c.regular,
        c.mala,
        `${c.porcentajeBuena}%`,
        `${c.porcentajeRegular}%`,
        `${c.porcentajeMala}%`
      ]);
      downloadCSV('imss_bienestar_calificacion_clues.csv', headers, rows);
    } else if (activeSubView === 'entidad') {
      const headers = ['Entidad', 'Total Respuestas', 'Buena', 'Regular', 'Mala', '% Buena', '% Regular', '% Mala'];
      const rows = entidadData.map(e => [
        e.entidad,
        e.total,
        e.buena,
        e.regular,
        e.mala,
        `${e.porcentajeBuena}%`,
        `${e.porcentajeRegular}%`,
        `${e.porcentajeMala}%`
      ]);
      downloadCSV('imss_bienestar_calificacion_entidad.csv', headers, rows);
    } else if (activeSubView === 'formacion') {
      const headers = ['Formación Principal', 'Total Respuestas', 'Buena', 'Regular', 'Mala', '% Buena', '% Regular', '% Mala'];
      const rows = formacionData.map(f => [
        f.formacion,
        f.total,
        f.buena,
        f.regular,
        f.mala,
        `${f.porcentajeBuena}%`,
        `${f.porcentajeRegular}%`,
        `${f.porcentajeMala}%`
      ]);
      downloadCSV('imss_bienestar_formacion_calificacion.csv', headers, rows);
    } else if (activeSubView === 'preguntas') {
      const headers = ['Pregunta', 'Opción', 'Conteos', 'Porcentaje', 'Total Respuestas Válidas'];
      const rows: (string | number)[][] = [];
      for (const p of data.preguntasCerradas) {
        for (const d of p.distribucion) {
          rows.push([p.titulo, d.opcion, d.conteo, `${d.porcentaje}%`, p.totalRespuestas]);
        }
      }
      downloadCSV('imss_bienestar_respuestas_preguntas.csv', headers, rows);
    }
  };

  const handleExportJSON = () => {
    let exportObj: any = null;
    let filename = '';

    if (activeSubView === 'clues') {
      exportObj = cluesData;
      filename = 'imss_bienestar_calificacion_clues.json';
    } else if (activeSubView === 'entidad') {
      exportObj = entidadData;
      filename = 'imss_bienestar_calificacion_entidad.json';
    } else if (activeSubView === 'formacion') {
      exportObj = formacionData;
      filename = 'imss_bienestar_formacion_calificacion.json';
    } else if (activeSubView === 'preguntas') {
      exportObj = data.preguntasCerradas;
      filename = 'imss_bienestar_respuestas_preguntas.json';
    }

    downloadJSON(filename, exportObj);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subnavigation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleViewChange('clues')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeSubView === 'clues'
                ? 'bg-[#0b4d3e] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Calificación por CLUES</span>
          </button>

          <button
            onClick={() => handleViewChange('entidad')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeSubView === 'entidad'
                ? 'bg-[#0b4d3e] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Calificación por entidad</span>
          </button>

          <button
            onClick={() => handleViewChange('formacion')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeSubView === 'formacion'
                ? 'bg-[#0b4d3e] text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Formación y calificación</span>
          </button>

          <button
            onClick={() => handleViewChange('preguntas')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeSubView === 'preguntas'
                ? 'bg-[#0b4d3e] text-white shadow-md ring-2 ring-emerald-500/30'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Respuestas por pregunta</span>
            <span className="text-[10px] bg-amber-200 text-amber-950 font-extrabold px-1.5 py-0.2 rounded-full">
              Diagrama
            </span>
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            title="Exportar tabla a formato CSV"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#0b4d3e] rounded-xl text-xs font-bold border border-emerald-300 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            title="Exportar datos en formato JSON"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 transition-colors shadow-xs"
          >
            <FileJson className="w-4 h-4" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Global search filter (only for non-preguntas views, or when searching tables) */}
      {activeSubView !== 'preguntas' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center space-x-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filtrar registros por término..."
            className="w-full text-xs sm:text-sm bg-transparent outline-none text-slate-900 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 1: CALIFICACIÓN POR CLUES                            */}
      {/* ========================================================= */}
      {activeSubView === 'clues' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 font-['Montserrat']">
              Calificación por CLUES ({cluesData.length} registros)
            </h4>
            <span className="text-xs text-slate-500">Datos agregados sin respuestas individuales</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('clues')}>
                    <div className="flex items-center space-x-1">
                      <span>CLUES</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('hospital')}>
                    <div className="flex items-center space-x-1">
                      <span>Hospital</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('entidad')}>
                    <div className="flex items-center space-x-1">
                      <span>Entidad</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-200" onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-center space-x-1">
                      <span>Respuestas</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 text-center text-emerald-700 font-bold">Buena</th>
                  <th className="p-3 text-center text-amber-700 font-bold">Regular</th>
                  <th className="p-3 text-center text-rose-700 font-bold">Mala</th>
                  <th className="p-3 text-center">Distribución (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cluesData
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map(c => (
                    <tr key={c.clues} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 bg-slate-50/50">{c.clues}</td>
                      <td className="p-3 font-medium text-slate-800">{c.hospital}</td>
                      <td className="p-3 text-slate-600">{c.entidad}</td>
                      <td className="p-3 text-center font-bold text-slate-900">{c.total}</td>
                      <td className="p-3 text-center text-emerald-700 font-semibold">{c.buena}</td>
                      <td className="p-3 text-center text-amber-700 font-semibold">{c.regular}</td>
                      <td className="p-3 text-center text-rose-700 font-semibold">{c.mala}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1 text-[11px] font-mono">
                          <span className="text-emerald-700 font-semibold">{c.porcentajeBuena}%</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-amber-700 font-semibold">{c.porcentajeRegular}%</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-700 font-semibold">{c.porcentajeMala}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Página {currentPage} de {Math.max(1, Math.ceil(cluesData.length / pageSize))}
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= Math.ceil(cluesData.length / pageSize)}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: CALIFICACIÓN POR ENTIDAD                          */}
      {/* ========================================================= */}
      {activeSubView === 'entidad' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 font-['Montserrat']">
              Calificación por entidad federativa ({entidadData.length} estados)
            </h4>
            <span className="text-xs text-slate-500">Agregados por entidad federativa</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Entidad Federativa</th>
                  <th className="p-3 text-center">Total Respuestas</th>
                  <th className="p-3 text-center text-emerald-700 font-bold">Buena (Conteo)</th>
                  <th className="p-3 text-center text-emerald-700 font-bold">Buena (%)</th>
                  <th className="p-3 text-center text-amber-700 font-bold">Regular (Conteo)</th>
                  <th className="p-3 text-center text-amber-700 font-bold">Regular (%)</th>
                  <th className="p-3 text-center text-rose-700 font-bold">Mala (Conteo)</th>
                  <th className="p-3 text-center text-rose-700 font-bold">Mala (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entidadData.map(e => (
                  <tr key={e.entidad} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{e.entidad}</td>
                    <td className="p-3 text-center font-extrabold text-slate-800">{e.total}</td>
                    <td className="p-3 text-center text-emerald-700 font-semibold">{e.buena}</td>
                    <td className="p-3 text-center text-emerald-700 font-mono font-bold bg-emerald-50/50">{e.porcentajeBuena}%</td>
                    <td className="p-3 text-center text-amber-700 font-semibold">{e.regular}</td>
                    <td className="p-3 text-center text-amber-700 font-mono font-bold bg-amber-50/50">{e.porcentajeRegular}%</td>
                    <td className="p-3 text-center text-rose-700 font-semibold">{e.mala}</td>
                    <td className="p-3 text-center text-rose-700 font-mono font-bold bg-rose-50/50">{e.porcentajeMala}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: FORMACIÓN Y CALIFICACIÓN                          */}
      {/* ========================================================= */}
      {activeSubView === 'formacion' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 font-['Montserrat']">
              Formación y calificación ({formacionData.length} perfiles registrados)
            </h4>
            <span className="text-xs text-slate-500">Distribución de percepción por perfil laboral</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Formación Principal</th>
                  <th className="p-3 text-center">Total Respuestas</th>
                  <th className="p-3 text-center text-emerald-700 font-bold">Buena</th>
                  <th className="p-3 text-center text-amber-700 font-bold">Regular</th>
                  <th className="p-3 text-center text-rose-700 font-bold">Mala</th>
                  <th className="p-3 text-center">% Buena</th>
                  <th className="p-3 text-center">% Regular</th>
                  <th className="p-3 text-center">% Mala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formacionData.map(f => (
                  <tr key={f.formacion} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{f.formacion}</td>
                    <td className="p-3 text-center font-extrabold text-slate-800">{f.total}</td>
                    <td className="p-3 text-center text-emerald-700 font-semibold">{f.buena}</td>
                    <td className="p-3 text-center text-amber-700 font-semibold">{f.regular}</td>
                    <td className="p-3 text-center text-rose-700 font-semibold">{f.mala}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">{f.porcentajeBuena}%</td>
                    <td className="p-3 text-center font-mono font-bold text-amber-700">{f.porcentajeRegular}%</td>
                    <td className="p-3 text-center font-mono font-bold text-rose-700">{f.porcentajeMala}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: RESPUESTAS POR PREGUNTA (CON DIAGRAMA EN CASCADA)  */}
      {/* ========================================================= */}
      {activeSubView === 'preguntas' && (
        <div className="space-y-6">
          {/* Header de la subpestaña con selector de vista */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-emerald-50 text-[#0b4d3e] rounded-xl border border-emerald-200/60">
                  <Layers className="w-5 h-5 text-[#0b4d3e]" />
                </span>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 font-['Montserrat']">
                  Explorador de respuestas por pregunta
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Utiliza el diagrama escalonado: primero escoge un <strong>Estado</strong>, después una <strong>CLUES</strong> y luego la <strong>Pregunta</strong> para abrir su tarjeta interactiva.
              </p>
            </div>

            {/* Toggle entre Vista Diagrama Interactivo y Vista Mosaico de todas las preguntas */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto border border-slate-200">
              <button
                type="button"
                onClick={() => setPreguntasDisplayMode('diagrama')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                  preguntasDisplayMode === 'diagrama'
                    ? 'bg-white text-[#0b4d3e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>Diagrama Interactivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPreguntasDisplayMode('todas')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                  preguntasDisplayMode === 'todas'
                    ? 'bg-white text-[#0b4d3e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Todas las Preguntas ({data.preguntasCerradas.length})</span>
              </button>
            </div>
          </div>

          {/* ---------------- MODO 1: DIAGRAMA INTERACTIVO (ESTADO -> CLUES -> PREGUNTA) ---------------- */}
          {preguntasDisplayMode === 'diagrama' && (
            <div className="space-y-6">
              {/* DIAGRAMA DE 3 NODOS VISUALES */}
              <div className="bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <Filter className="w-4 h-4 text-emerald-700" />
                    <span>Diagrama de selección guiada:</span>
                  </div>

                  {(diagramEstado || diagramClues) && (
                    <button
                      onClick={() => {
                        setDiagramEstado('');
                        setDiagramClues('');
                      }}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restablecer a Nacional</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* NODO 1: Escoger Estado */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-[#0b4d3e] text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                          1
                        </span>
                        <span>Escoger Estado</span>
                      </span>
                      <MapPin className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">Entidad federativa</p>

                    <div className="relative">
                      <select
                        value={diagramEstado}
                        onChange={e => handleDiagramEstadoChange(e.target.value)}
                        className="w-full appearance-none bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
                      >
                        <option value="">Todas las entidades (Nacional)</option>
                        {data.entidadesList.map(ent => (
                          <option key={ent} value={ent}>
                            {ent}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* NODO 2: Escoger CLUES */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-[#0b4d3e] text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                          2
                        </span>
                        <span>Escoger CLUES</span>
                      </span>
                      <Building2 className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {diagramEstado
                        ? `${availableCluesForDiagram.length} unidades en ${diagramEstado}`
                        : `${data.cluesList.length} unidades disponibles`}
                    </p>

                    <div className="relative">
                      <select
                        value={diagramClues}
                        onChange={e => setDiagramClues(e.target.value)}
                        className="w-full appearance-none bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer truncate"
                      >
                        <option value="">
                          {diagramEstado
                            ? `Todas las unidades de ${diagramEstado}`
                            : 'Todas las unidades (general)'}
                        </option>
                        {availableCluesForDiagram.map(item => (
                          <option key={item.clues} value={item.clues}>
                            [{item.clues}] {item.hospital}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* NODO 3: Escoger Pregunta */}
                  <div className="bg-white p-4 rounded-xl border border-emerald-400 ring-2 ring-emerald-500/10 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#0b4d3e]">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                          3
                        </span>
                        <span>Escoger Pregunta</span>
                      </span>
                      <HelpCircle className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {data.preguntasCerradas.length} preguntas disponibles
                    </p>

                    <div className="relative">
                      <select
                        value={currentPreguntaDiagram.id}
                        onChange={e => setSelectedPreguntaId(e.target.value)}
                        className="w-full appearance-none bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-950 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer truncate"
                      >
                        {data.preguntasCerradas.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.titulo}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-emerald-800 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Resumen del corte activo */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-500">Corte seleccionado:</span>
                    <span className="bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold text-emerald-900 inline-flex items-center space-x-1.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>{diagramEstado || 'Nivel Nacional'}</span>
                      {diagramClues && (
                        <>
                          <span className="text-slate-300">/</span>
                          <span className="font-mono text-slate-700">CLUES: {diagramClues}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <span className="text-slate-500">
                    Total respuestas:{' '}
                    <strong className="text-slate-900 font-bold">{diagramDistribution.total}</strong>
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* LA CARD QUE TENÍAMOS (SIN GRÁFICA)                        */}
              {/* ========================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm max-w-2xl mx-auto">
                {/* Encabezado: Título de la pregunta y Total de respuestas */}
                <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 font-['Montserrat'] leading-snug">
                    {currentPreguntaDiagram.titulo}
                  </h4>
                  <span className="flex-shrink-0 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {diagramDistribution.total} {diagramDistribution.total === 1 ? 'respuesta' : 'respuestas'}
                  </span>
                </div>

                {/* Lista de opciones con conteo y porcentaje */}
                <div className="space-y-2">
                  {diagramDistribution.opciones.map((opt, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs sm:text-sm py-2.5 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 transition-colors"
                    >
                      <span className="text-slate-800 font-medium truncate pr-2" title={opt.opcion}>
                        {opt.opcion}
                      </span>
                      <div className="flex items-center space-x-2 font-mono flex-shrink-0">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">{opt.conteo}</span>
                        <span className="text-slate-500 text-xs font-semibold">({opt.porcentaje.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}

                  {diagramDistribution.opciones.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs sm:text-sm">
                      No hay respuestas registradas para esta selección.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- MODO 2: TODAS LAS PREGUNTAS (VISTA EN MOSAICO) ---------------- */}
          {preguntasDisplayMode === 'todas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data.preguntasCerradas.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2" title={p.titulo}>
                      {p.titulo}
                    </h5>
                    <span className="flex-shrink-0 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {p.totalRespuestas} respuestas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {p.distribucion.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-slate-800 truncate pr-2" title={opt.opcion}>
                          {opt.opcion}
                        </span>
                        <div className="flex items-center space-x-2 font-mono flex-shrink-0">
                          <span className="font-bold text-slate-900">{opt.conteo}</span>
                          <span className="text-slate-500 text-[11px]">({opt.porcentaje.toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
