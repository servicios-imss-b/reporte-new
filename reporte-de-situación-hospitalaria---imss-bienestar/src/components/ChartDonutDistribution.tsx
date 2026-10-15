import React from 'react';
import type { PreguntaItem, CluesItem } from '../types/reporte';

interface DonutCardProps {
  pregunta: PreguntaItem;
  icon?: React.ReactNode;
  palette?: string[];
  unitValue?: string | null;
}

const DEFAULT_PALETTES = [
  ['#0b4d3e', '#10b981', '#6ee7b7', '#a7f3d0'], // Emeralds
  ['#b38e5d', '#d4af37', '#fde047', '#fef08a'], // Golds/Ambers
  ['#0f766e', '#14b8a6', '#5eead4', '#99f6e4'], // Teals
  ['#1e3a8a', '#3b82f6', '#93c5fd', '#bfdbfe'], // Blues
  ['#831843', '#ec4899', '#f472b6', '#fbcfe8'], // Roses
  ['#4c1d95', '#8b5cf6', '#c4b5fd', '#ddd6fe'], // Purples
];

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
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

export const DonutCard: React.FC<DonutCardProps> = ({
  pregunta,
  icon,
  palette = DEFAULT_PALETTES[0],
  unitValue
}) => {
  // If CLUES is filtered and has a specific answer
  const displayItems = React.useMemo(() => {
    if (!unitValue) return pregunta.distribucion;
    return [
      {
        opcion: unitValue,
        conteo: 1,
        porcentaje: 100
      }
    ];
  }, [pregunta.distribucion, unitValue]);

  const total = displayItems.reduce((acc, curr) => acc + curr.conteo, 0) || 1;

  // Colors cycle
  const colors = [
    '#0b4d3e', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#8b5cf6', '#64748b'
  ];

  let currentAngle = 0;
  const slices = displayItems.map((item, idx) => {
    const angle = (item.conteo / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    const color = colors[idx % colors.length];

    return {
      ...item,
      startAngle,
      endAngle,
      color,
    };
  });

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {icon && <div className="text-emerald-700">{icon}</div>}
            <h4 className="text-sm font-bold text-slate-900 tracking-tight font-['Montserrat'] line-clamp-1" title={pregunta.titulo}>
              {pregunta.titulo}
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {total} {total === 1 ? 'resp.' : 'resp.'}
          </span>
        </div>

        {/* Donut representation */}
        <div className="relative w-40 h-40 mx-auto my-3">
          <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
            {slices.map((slice, i) => {
              if (slice.conteo === 0) return null;
              const pathData = describeArc(80, 80, 42, 68, slice.startAngle, slice.endAngle);
              return (
                <path
                  key={i}
                  d={pathData}
                  fill={slice.color}
                  className="transition-opacity hover:opacity-80 cursor-pointer"
                >
                  <title>{`${slice.opcion}: ${slice.conteo} (${slice.porcentaje}%)`}</title>
                </path>
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-extrabold text-slate-900 font-['Montserrat']">
              {unitValue ? '100%' : `${total}`}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {unitValue ? 'En unidad' : 'Total'}
            </span>
          </div>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5 mt-2 pt-3 border-t border-slate-100 max-h-36 overflow-y-auto">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-1.5 truncate pr-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }}></span>
              <span className="truncate text-slate-800 text-[11px]" title={slice.opcion}>
                {slice.opcion}
              </span>
            </div>
            <div className="flex-shrink-0 text-[11px] font-medium text-slate-500 space-x-1">
              <span className="font-bold text-slate-900">{slice.conteo}</span>
              <span>({slice.porcentaje.toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ChartDonutDistributionGridProps {
  distribuciones: {
    sexo: PreguntaItem;
    formacionPrincipal: PreguntaItem;
    posgrado: PreguntaItem;
    tiempoCoordinador: PreguntaItem;
    almacenInsumos: PreguntaItem;
    serviciosCerrados: PreguntaItem;
  };
  selectedCluesItem: CluesItem | null;
}

export const ChartDonutDistributionGrid: React.FC<ChartDonutDistributionGridProps> = ({
  distribuciones,
  selectedCluesItem
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight font-['Montserrat']">
            Distribución institucional por variables clave
          </h3>
          <p className="text-xs text-slate-500">
            Gráficas de dona para dimensiones sociodemográficas, perfiles clínicos y condiciones operativas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <DonutCard
          pregunta={distribuciones.sexo}
          unitValue={selectedCluesItem?.respuestas['Sexo']}
        />
        <DonutCard
          pregunta={distribuciones.formacionPrincipal}
          unitValue={selectedCluesItem?.respuestas['¿Cuál es su formación principal?'] || selectedCluesItem?.respuestas['Formación principal']}
        />
        <DonutCard
          pregunta={distribuciones.posgrado}
          unitValue={selectedCluesItem?.respuestas['Estudios de posgrado']}
        />
        <DonutCard
          pregunta={distribuciones.tiempoCoordinador}
          unitValue={selectedCluesItem?.respuestas['Tiempo como coordinador(a)']}
        />
        <DonutCard
          pregunta={distribuciones.almacenInsumos}
          unitValue={selectedCluesItem?.respuestas['Almacén de medicamentos e insumos']}
        />
        <DonutCard
          pregunta={distribuciones.serviciosCerrados}
          unitValue={selectedCluesItem?.respuestas['Servicios cerrados o con funcionamiento parcial']}
        />
      </div>
    </div>
  );
};
