import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { CluesFilter } from './components/CluesFilter';
import { ChartFormacionApilada } from './components/ChartFormacionApilada';
import { ChartCalificacionEntidad } from './components/ChartCalificacionEntidad';
import { ChartDonutDistributionGrid } from './components/ChartDonutDistribution';
import { ChartRespuestasPregunta } from './components/ChartRespuestasPregunta';
import { BasesView } from './components/BasesView';
import { PrivacyNotice } from './components/PrivacyNotice';
import { UploadExcelModal } from './components/UploadExcelModal';
import type { ReportePayload, CluesItem } from './types/reporte';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<ReportePayload | null>(null);
  const [defaultData, setDefaultData] = useState<ReportePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'tablero' | 'bases'>('tablero');
  const [selectedClues, setSelectedClues] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isCustomDataLoaded, setIsCustomDataLoaded] = useState<boolean>(false);

  // Fetch pre-built report json on mount
  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/reporte-data.json');
      if (!res.ok) {
        throw new Error(`No se pudo cargar el archivo reporte-data.json (Status: ${res.status})`);
      }
      const json: ReportePayload = await res.json();
      setData(json);
      setDefaultData(json);
      setIsCustomDataLoaded(false);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Error al cargar los datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDataLoaded = (customPayload: ReportePayload) => {
    setData(customPayload);
    setIsCustomDataLoaded(true);
    setSelectedClues('');
  };

  const handleResetToDefault = () => {
    if (defaultData) {
      setData(defaultData);
      setIsCustomDataLoaded(false);
      setSelectedClues('');
    }
  };

  const handleExportFullReport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_situacion_hospitalaria_imss_bienestar_${Date.now()}.json`;
    link.click();
  };

  const selectedCluesItem: CluesItem | null =
    selectedClues && data?.porClues[selectedClues] ? data.porClues[selectedClues] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 mb-4 animate-spin">
          <Loader2 className="w-8 h-8 text-[#0b4d3e]" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 font-['Montserrat']">
          Cargando Reporte de Situación Hospitalaria...
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Leyendo indicadores agregados de unidades médicas y entidades IMSS Bienestar.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 mb-4">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-['Montserrat']">
          No se pudieron cargar los datos del reporte
        </h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md">
          {error || 'Verifica que se haya ejecutado el comando `npm run data:build` para generar public/reporte-data.json.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={fetchReportData}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#0b4d3e] text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors shadow"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar carga</span>
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-colors"
          >
            <span>Cargar Excel manualmente</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onExportReport={handleExportFullReport}
        fechaCorte={data.resumen.fechaCorte}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* Institutional Summary Cards */}
        <SummaryCards
          resumen={data.resumen}
          selectedCluesItem={selectedCluesItem}
        />

        {/* Confidentiality and Privacy Notice */}
        <PrivacyNotice />

        {/* Tab 1: Tablero Principal */}
        {activeTab === 'tablero' && (
          <div className="space-y-8 animate-in fade-in-50 duration-200">
            {/* Global Filter: Desglose por unidad hospitalaria */}
            <CluesFilter
              cluesList={data.cluesList}
              selectedClues={selectedClues}
              onSelectClues={setSelectedClues}
              selectedCluesItem={selectedCluesItem}
            />

            {/* Top 2 Main Charts: Formación apilada & Calificación por entidad */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ChartFormacionApilada
                data={data.formacionYCalificacion}
                selectedCluesItem={selectedCluesItem}
              />

              <ChartCalificacionEntidad
                calificacionGeneral={data.calificacionGeneral}
                porEntidad={data.porEntidad}
                entidadesList={data.entidadesList}
                selectedCluesItem={selectedCluesItem}
              />
            </div>

            {/* 6 Donut Distribution Charts for Core Questions */}
            <ChartDonutDistributionGrid
              distribuciones={data.distribucionesDonas}
              selectedCluesItem={selectedCluesItem}
            />

            {/* Chart 4: Respuestas por pregunta con diagrama jerárquico */}
            <ChartRespuestasPregunta
              preguntas={data.preguntasCerradas}
              selectedCluesItem={selectedCluesItem}
              entidadesList={data.entidadesList}
              cluesList={data.cluesList}
              registrosResumen={data.registrosResumen || []}
              porClues={data.porClues}
            />
          </div>
        )}

        {/* Tab 2: Bases y Consultas */}
        {activeTab === 'bases' && (
          <div className="animate-in fade-in-50 duration-200">
            <BasesView data={data} />
          </div>
        )}
      </main>

      {/* Modal for updating/uploading Excel */}
      <UploadExcelModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDataLoaded={handleCustomDataLoaded}
        onResetToDefault={handleResetToDefault}
        isCustomDataLoaded={isCustomDataLoaded}
      />

      {/* Institutional Footer */}
      <footer className="bg-[#052820] text-slate-300 border-t border-[#0b4d3e] py-6 px-4 sm:px-8 text-xs mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-amber-300 uppercase tracking-wider">IMSS Bienestar</span>
            <span className="text-slate-500">•</span>
            <span>Coordinación de Hospitales y Servicios de Salud</span>
          </div>
          <div className="text-slate-400 text-center sm:text-right">
            <span>Resultados calculados dinámicamente desde la fuente de datos oficial.</span>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sin datos personales ni texto libre confidencial.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
