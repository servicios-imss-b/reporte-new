import React from 'react';
import { ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  return (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 mb-8 text-amber-950">
      <div className="flex items-start space-x-3.5">
        <div className="p-2 bg-amber-100/90 text-amber-800 rounded-xl flex-shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 text-amber-800" />
        </div>
        <div className="text-xs sm:text-sm space-y-1">
          <h4 className="font-bold text-amber-950 flex items-center space-x-2">
            <span>Nota de Confidencialidad y Protección de Datos Institucionales</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded font-bold">
              Aviso Normativo
            </span>
          </h4>
          <p className="text-amber-900/90 leading-relaxed text-xs">
            El desglose por CLUES incluye resultados de unidades hospitalarias con una sola respuesta registrada, por lo que los datos agregados pueden atribuirse operativamente a dicha unidad médica. Este reporte <strong>no incluye datos personales, nombres, correos ni respuestas de texto libre</strong>.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-amber-800 font-medium">
            <span className="flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Texto libre y folios excluidos</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Verificación de autorización previa a despliegue público requerida</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
