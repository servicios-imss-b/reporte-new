import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle, RefreshCcw, Terminal } from 'lucide-react';
import { parseExcelArrayBuffer } from '../utils/dataParser';
import type { ReportePayload } from '../types/reporte';

interface UploadExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (newData: ReportePayload) => void;
  onResetToDefault: () => void;
  isCustomDataLoaded: boolean;
}

export const UploadExcelModal: React.FC<UploadExcelModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  onResetToDefault,
  isCustomDataLoaded
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMsg('Por favor selecciona un archivo en formato Excel (.xlsx o .xls).');
      setIsProcessing(false);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const payload = parseExcelArrayBuffer(buffer, file.name);

      setSuccessMsg(
        `¡Archivo procesado con éxito! Se cargaron ${payload.resumen.totalRespuestas} respuestas válidas de ${payload.resumen.totalClues} unidades en ${payload.resumen.totalEntidades} entidades.`
      );
      setTimeout(() => {
        onDataLoaded(payload);
        setIsProcessing(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel. Verifica que contenga la hoja "Respuestas".');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#0b4d3e] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Montserrat']">
                Actualizar base de datos de la encuesta
              </h3>
              <p className="text-xs text-emerald-200">
                Proceso reproducible para incorporar nuevas respuestas o cortes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* CLI Instructions */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 text-xs font-mono space-y-1.5 shadow-inner">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>Comando en terminal (reproducible):</span>
            </div>
            <p className="text-slate-300">
              Coloca el archivo en <span className="text-amber-300">base/resultados_encuesta_imss_bienestar (1).xlsx</span> y ejecuta:
            </p>
            <div className="bg-black/50 p-2 rounded text-emerald-300 select-all border border-slate-800">
              npm run data:build
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-emerald-600 bg-emerald-50 scale-[0.99]'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  processFile(e.target.files[0]);
                }
              }}
            />

            <UploadCloud className="w-10 h-10 text-emerald-700 mx-auto mb-2 animate-bounce" />
            <p className="text-sm font-bold text-slate-800">
              Arrastra aquí tu archivo Excel o haz clic para seleccionarlo
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Debe contener la hoja &ldquo;Respuestas&rdquo; con columnas CLUES, Hospital y Entidad.
            </p>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isCustomDataLoaded && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-medium">
                Actualmente usando base personalizada cargada en navegador.
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetToDefault();
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Restablecer base original</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
