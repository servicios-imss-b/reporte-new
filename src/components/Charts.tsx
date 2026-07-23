import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import { Layers3, Building2, Globe, ClipboardList, X, MapPin } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import type { DashboardStats, CluesGeoItem, EntidadChart, InternetPieItem, TopFaltanteChart } from '../types';

interface ChartsProps {
  stats: DashboardStats;
  internetPie: InternetPieItem[];
  porEntidad: EntidadChart[];
  topFaltantes: TopFaltanteChart[];
  cluesGeo?: CluesGeoItem[];
  resultado?: DataRow[];
}

const PIE_COLORS = ['#1A6B5E', '#A57F2C'];

const tooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  background: '#FFFFFF',
  fontSize: '13px',
  color: '#111827',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

function formatTooltipNumber(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('es-MX');
}

type StatKey =
  | 'cluesCapturadas'
  | 'entidadesCapturadas'
  | 'unidadesInternet'
  | 'pctLlenado';

interface StatCardDef {
  icon: typeof Database;
  label: string;
  key: StatKey;
  bg: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  border: string;
  isPercent?: boolean;
}

const STAT_CARDS: StatCardDef[] = [
  {
    icon: Layers3,
    label: 'COBERTURA CLUES',
    key: 'cluesCapturadas',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  {
    icon: Building2,
    label: 'COBERTURA ENTIDADES',
    key: 'entidadesCapturadas',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
    border: 'border-amber-200',
  },
  {
    icon: Globe,
    label: 'UNIDADES CON INTERNET',
    key: 'unidadesInternet',
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    valueColor: 'text-rose-700',
    border: 'border-rose-200',
  },
  {
    icon: ClipboardList,
    label: '% LLENADO FORMULARIO',
    key: 'pctLlenado',
    bg: 'bg-teal-50',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    valueColor: 'text-teal-700',
    border: 'border-teal-200',
    isPercent: true,
  },
];

function pctLabel(actual: number, expected: number): string {
  if (expected <= 0) return '0.0%';
  return `${((actual / expected) * 100).toFixed(1)}%`;
}

function StatCard({
  def,
  value,
  expected,
  helper,
}: {
  def: StatCardDef;
  value: number;
  expected?: number;
  helper?: string;
}) {
  const { icon: Icon, label, bg, iconBg, iconColor, valueColor, border, isPercent } = def;
  const displayValue = isPercent
    ? `${value.toFixed(1)}%`
    : (typeof expected === 'number' ? pctLabel(value, expected) : value.toLocaleString('es-MX'));
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${border} ${bg}`}>
      <div className="absolute -right-4 -top-4 opacity-10 transition-transform duration-500 group-hover:scale-125 group-hover:opacity-20">
        <Icon className="h-20 w-20" />
      </div>
      <div className="relative mb-3 flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110 ${iconBg} ${iconColor}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
      <p className="relative mb-1 text-[10px] font-bold uppercase tracking-widest opacity-70">
        <span className={valueColor === 'text-white' ? 'text-white/70' : 'text-gray-500'}>{label}</span>
      </p>
      <p className={`relative text-3xl font-black tabular-nums ${valueColor}`}>{displayValue}</p>
      {!isPercent && typeof expected === 'number' ? (
        <p className="mt-1 text-xs font-medium text-gray-500">
          {value.toLocaleString('es-MX')} de {expected.toLocaleString('es-MX')}
        </p>
      ) : null}
      {isPercent ? <p className="mt-1 text-xs font-medium text-gray-500">de campos respondidos</p> : null}
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-6 ${className}`}>
      <div className="mb-5">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/* ─── Gráficas por card ─── */

function CluesChart({ porEntidad }: { porEntidad: EntidadChart[] }) {
  const sorted = [...porEntidad].sort((a, b) => b.unidades - a.unidades);
  const totalUnidades = sorted.reduce((s, e) => s + e.unidades, 0);
  const avgUnidades = sorted.length ? Math.round(totalUnidades / sorted.length) : 0;

  const CLUES_COLORS = ['#064E3B', '#065F46', '#047857', '#059669', '#10B981', '#34D399', '#6EE7B7'];
  const getBarColor = (rank: number, total: number) => {
    const t = total > 1 ? rank / (total - 1) : 0;
    return CLUES_COLORS[Math.min(Math.floor(t * (CLUES_COLORS.length - 1)), CLUES_COLORS.length - 1)];
  };

  const data = sorted.map((e, i) => ({
    entidad: e.entidad.length > 12 ? e.entidad.slice(0, 12) + '.' : e.entidad,
    entidadFull: e.entidad,
    unidades: e.unidades,
    pct: e.pctLlenado,
    rank: i,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-8 border-b border-gray-100 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total unidades</p>
          <p className="text-2xl font-black text-emerald-700">{totalUnidades.toLocaleString('es-MX')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Promedio por estado</p>
          <p className="text-2xl font-black text-amber-600">{avgUnidades.toLocaleString('es-MX')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estados</p>
          <p className="text-2xl font-black text-gray-700">{sorted.length}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 55 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="entidad" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#9CA3AF' }} height={65} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_label, payload) =>
              (payload?.[0] as { payload?: { entidadFull?: string } } | undefined)?.payload?.entidadFull ?? _label
            }
            formatter={(v: unknown, name: string) => [
              name === 'pct' ? `${v}%` : formatTooltipNumber(v),
              name === 'pct' ? '% llenado' : 'Unidades capturadas',
            ]}
            cursor={{ fill: '#F0FDF4' }}
          />
          <Legend
            verticalAlign="top"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '8px', color: '#6B7280' }}
            formatter={(value) => value === 'pct' ? '% llenado del formulario' : 'Unidades capturadas'}
          />
          <Bar yAxisId="left" dataKey="unidades" name="unidades" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={getBarColor(i, data.length)} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="pct" name="pct"
            stroke="#A57F2C" strokeWidth={2.5}
            dot={{ fill: '#A57F2C', r: 3.5 }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function EstadosMenosInsumos({ porEntidad }: { porEntidad: EntidadChart[] }) {
  const sorted = [...porEntidad].sort((a, b) => a.pctLlenado - b.pctLlenado);
  const bottom = sorted.slice(0, 10);

  // Colores de rojo → ámbar → verde según posición
  const COLORS = ['#dc2626', '#ef4444', '#f97316', '#fb923c', '#f59e0b',
                  '#eab308', '#84cc16', '#22c55e', '#16a34a', '#15803d'];

  const data = bottom.map((e, i) => ({
    entidad: e.entidad.length > 18 ? e.entidad.slice(0, 18) + '.' : e.entidad,
    entidadFull: e.entidad,
    pct: e.pctLlenado,
    fill: COLORS[Math.min(i, COLORS.length - 1)],
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Estados con menor porcentaje de insumos reportados (peor a mejor)</p>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} domain={[0, 100]} />
          <YAxis type="category" dataKey="entidad" tick={{ fontSize: 10, fill: '#6B7280' }} width={120} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_label, payload) =>
              (payload?.[0] as { payload?: { entidadFull?: string } } | undefined)?.payload?.entidadFull ?? _label
            }
            formatter={(v: unknown) => [`${v}%`, '% insumos llenados']}
            cursor={{ fill: '#FEF2F2' }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function InternetChart({ internetPie }: { internetPie: InternetPieItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={internetPie} cx="50%" cy="45%" outerRadius={110} innerRadius={60} dataKey="value" paddingAngle={2} stroke="none">
          {internetPie.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatTooltipNumber(v), 'Unidades']} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#6B7280' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ConsultoriosChart({ porEntidad }: { porEntidad: EntidadChart[] }) {
  const data = porEntidad.map((e) => ({
    entidad: e.entidad.length > 10 ? e.entidad.slice(0, 10) + '.' : e.entidad,
    habilitados: e.consultoriosHabilitados,
    levantados: e.consultoriosLevantados,
    pct: e.consultoriosHabilitados > 0
      ? +((e.consultoriosLevantados / e.consultoriosHabilitados) * 100).toFixed(1)
      : 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="entidad" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#9CA3AF' }} height={60} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [
          name === 'pct' ? `${v}%` : formatTooltipNumber(v),
          name === 'pct' ? '% levantado' : name === 'habilitados' ? 'Habilitados' : 'Levantados',
        ]} cursor={{ fill: '#F0FDFA' }} />
        <Bar yAxisId="left" dataKey="habilitados" name="habilitados" fill="#99F6E4" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="levantados" name="levantados" fill="#0D9488" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="pct" name="pct" stroke="#A57F2C" strokeWidth={2} dot={{ fill: '#A57F2C', r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PctLlenadoChart({ porEntidad, globalPct }: { porEntidad: EntidadChart[]; globalPct: number }) {
  const sorted = [...porEntidad].sort((a, b) => b.pctLlenado - a.pctLlenado);
  const avg = sorted.length ? +(sorted.reduce((s, e) => s + e.pctLlenado, 0) / sorted.length).toFixed(1) : 0;

  const PCT_COLORS = ['#064E3B', '#065F46', '#047857', '#059669', '#10B981', '#34D399', '#6EE7B7'];
  const getColor = (rank: number, total: number) => {
    const t = total > 1 ? rank / (total - 1) : 0;
    return PCT_COLORS[Math.min(Math.floor(t * (PCT_COLORS.length - 1)), PCT_COLORS.length - 1)];
  };

  const data = sorted.map((e, i) => ({
    entidad: e.entidad.length > 12 ? e.entidad.slice(0, 12) + '.' : e.entidad,
    entidadFull: e.entidad,
    pct: e.pctLlenado,
    rank: i,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-8 border-b border-gray-100 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Global</p>
          <p className="text-2xl font-black text-teal-700">{globalPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Promedio por estado</p>
          <p className="text-2xl font-black text-amber-600">{avg}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mayor llenado</p>
          <p className="text-2xl font-black text-emerald-700">{sorted[0]?.pctLlenado.toFixed(1) ?? '—'}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Menor llenado</p>
          <p className="text-2xl font-black text-rose-600">{sorted[sorted.length - 1]?.pctLlenado.toFixed(1) ?? '—'}%</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 55 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="entidad" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#9CA3AF' }} height={65} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_label, payload) =>
              (payload?.[0] as { payload?: { entidadFull?: string } } | undefined)?.payload?.entidadFull ?? _label
            }
            formatter={(v: unknown) => [`${v}%`, '% llenado']}
            cursor={{ fill: '#F0FDFA' }}
          />
          <Bar dataKey="pct" name="% llenado" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={getColor(i, data.length)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Modal ─── */

function CardModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Mapa Modal ─── */

function buildPopupHTML(clues: string, nombre: string, entidad: string, internet: number, consultorios: number, pct: number) {
  const color = internet === 1 ? '#0d9488' : '#d97706';
  return `<div style="font-family:system-ui;padding:4px 0;min-width:200px">
    <div style="font-size:11px;font-weight:700;color:#065f46;margin-bottom:3px">${clues}</div>
    <div style="font-size:12px;font-weight:600;color:#111827;margin-bottom:2px;line-height:1.3">${nombre}</div>
    <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${entidad}</div>
    <div style="display:flex;gap:12px;margin-bottom:4px">
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">% Llenado</div>
        <div style="font-size:16px;font-weight:900;color:#065f46">${pct}%</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Consultorios</div>
        <div style="font-size:16px;font-weight:900;color:#374151">${consultorios}</div></div>
    </div>
    <div style="font-size:11px;color:${color};font-weight:600">${internet === 1 ? '● Con internet' : '● Sin internet'}</div>
  </div>`;
}

function MapModal({ onClose, porEntidad, cluesGeo = [] }: {
  onClose: () => void;
  porEntidad: EntidadChart[];
  cluesGeo?: CluesGeoItem[];
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const cluesGeoRef = useRef(cluesGeo);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-102, 23.5],
      zoom: 4.8,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    if (cluesGeoRef.current.length > 0) {
      const data = cluesGeoRef.current;
      const addLayers = () => {
        if (map.getSource('clues')) return;
        map.addSource('clues', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data.map((u) => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [u.lng, u.lat] },
              properties: {
                clues_imb: u.clues_imb,
                nombre: u.nombre_de_la_unidad,
                entidad: u.entidad,
                internet: u.internet ? 1 : 0,
                consultorios: Math.round(u.consultorios ?? 0),
                pct_llenado: u.pct_llenado ?? 0,
              },
            })),
          },
        });

        map.addLayer({ id: 'clues-halo', type: 'circle', source: 'clues', paint: {
          'circle-radius': 9,
          'circle-color': ['case', ['==', ['get', 'internet'], 1], '#14b8a6', '#f59e0b'],
          'circle-opacity': 0.18, 'circle-stroke-width': 0,
        }});
        map.addLayer({ id: 'clues-circles', type: 'circle', source: 'clues', paint: {
          'circle-radius': 5,
          'circle-color': ['case', ['==', ['get', 'internet'], 1], '#0d9488', '#d97706'],
          'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95,
        }});

        const popup = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: '280px' });
        map.on('mouseenter', 'clues-circles', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const feat = e.features?.[0];
          if (!feat) return;
          const p = feat.properties as Record<string, unknown>;
          popup.setLngLat(e.lngLat)
            .setHTML(buildPopupHTML(
              String(p['clues_imb']), String(p['nombre']), String(p['entidad']),
              Number(p['internet']), Number(p['consultorios']), Number(p['pct_llenado'])
            ))
            .addTo(map);
        });
        map.on('mouseleave', 'clues-circles', () => { map.getCanvas().style.cursor = ''; popup.remove(); });
      };

      if (map.isStyleLoaded()) addLayers();
      else map.on('load', addLayers);
    }

    // Quitar etiquetas de ciudades/pueblos del estilo base
    const removeCityLabels = () => {
      const style = map.getStyle();
      if (!style?.layers) return;
      style.layers
        .filter((l) => /city|town|village|suburb|place|hamlet/i.test(l.id))
        .forEach((l) => { try { map.removeLayer(l.id); } catch { /* ya no existe */ } });
    };
    if (map.isStyleLoaded()) removeCityLabels();
    else map.on('load', removeCityLabels);

    return () => map.remove();
  }, []);

  const total = porEntidad.reduce((s, e) => s + e.unidades, 0);
  const avg = porEntidad.length ? Math.round(total / porEntidad.length) : 0;
  const topEstado = [...porEntidad].sort((a, b) => b.unidades - a.unidades)[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ height: '84vh' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <MapPin className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Cobertura CLUES — Mapa Nacional</h3>
              <p className="mt-0.5 text-xs text-gray-400">Unidades de salud IMSS Bienestar distribuidas por entidad federativa</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mr-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Total unidades</p>
              <p className="text-lg font-black text-emerald-700">{total.toLocaleString('es-MX')}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500">Prom. por estado</p>
              <p className="text-lg font-black text-amber-700">{avg.toLocaleString('es-MX')}</p>
            </div>
            {topEstado && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-right">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Mayor cobertura</p>
                <p className="text-sm font-black text-gray-700 leading-tight">{topEstado.entidad.length > 14 ? topEstado.entidad.slice(0, 14) + '.' : topEstado.entidad}</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mapa */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={mapContainerRef} className="absolute inset-0" />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5 border-t border-gray-100 bg-gray-50 px-6 py-2.5 text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Leyenda:</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-500" />Con internet</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Sin internet</span>
          <span className="ml-auto text-gray-400">Pasa el cursor sobre un punto para ver detalles</span>
        </div>
      </div>
    </div>
  );
}
export function StatCards({
  stats,
  internetPie,
  porEntidad,
  cluesGeo = [],
  topFaltantes = [],
}: ChartsProps) {
  const [showMap, setShowMap] = useState(false);

  const values: Record<StatKey, { value: number; expected?: number; helper?: string }> = {
    cluesCapturadas: { value: stats.cluesCapturadas, expected: stats.baseCluesEsperadas, helper: `${stats.consultoriosTotales.toLocaleString('es-MX')} consultorios registrados` },
    entidadesCapturadas: { value: stats.entidadesCapturadas, expected: stats.baseEntidadesEsperadas },
    unidadesInternet: { value: stats.unidadesInternet, expected: stats.baseCluesEsperadas },
    pctLlenado: { value: stats.pctLlenado },
  };

  return (
    <>
      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((def) => (
          <StatCard
            key={def.key}
            def={def}
            value={values[def.key].value}
            expected={values[def.key].expected}
            helper={values[def.key].helper}
          />
        ))}
      </div>

      {/* Botón Explorar en Mapa */}
      <button
        onClick={() => setShowMap(true)}
        className="group mt-1 w-full cursor-pointer overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
            <MapPin className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Geolocalización</p>
            <p className="text-xl font-black text-emerald-700">Explorar en Mapa</p>
            <p className="text-xs text-gray-500">Visualiza las unidades CLUES distribuidas en el territorio nacional</p>
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
            Abrir mapa →
          </span>
        </div>
      </button>

      {/* Gráficas siempre visibles */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Cobertura CLUES por entidad" subtitle="Unidades capturadas y % llenado del formulario por estado">
          <CluesChart porEntidad={porEntidad} />
        </ChartCard>
        <ChartCard title="% de llenado por estado" subtitle="Porcentaje de campos respondidos sobre el total esperado">
          <PctLlenadoChart porEntidad={porEntidad} globalPct={stats.pctLlenado} />
        </ChartCard>
        <ChartCard title="Top 20 insumos más frecuentes que faltan" subtitle="Frecuencia de faltantes por equipo/material en consultorios levantados (por consultorio)">
          <ResponsiveContainer width="100%" height={520}>
            <BarChart data={topFaltantes} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis type="category" dataKey="item" tick={{ fontSize: 10, fill: '#6B7280' }} width={180} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: unknown, name: string) =>
                  name === 'pct' ? [`${formatTooltipNumber(v)}%`, '%'] : [formatTooltipNumber(v), 'Faltantes']
                }
                cursor={{ fill: '#F9FAFB' }}
              />
              <Bar dataKey="faltantes" fill="#A57F2C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Unidades con y sin internet" subtitle="Distribución de conectividad sobre el total de CLUES esperadas">
          <InternetChart internetPie={internetPie} />
        </ChartCard>
      </div>

      {showMap && <MapModal onClose={() => setShowMap(false)} porEntidad={porEntidad} cluesGeo={cluesGeo} />}
    </>
  );
}

export function Charts({
  internetPie,
  porEntidad,
  topFaltantes,
}: ChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Top 10 cosas mas frecuentes que no tienen" subtitle="Frecuencia de faltantes por pregunta en consultorios levantados">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topFaltantes} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis type="category" dataKey="item" tick={{ fontSize: 10, fill: '#6B7280' }} width={180} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name, item) => {
                  if (name === 'pct') return [`${formatTooltipNumber(v)}%`, '%'];
                  return [formatTooltipNumber(v), 'Faltantes'];
                }}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Bar dataKey="faltantes" fill="#A57F2C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Unidades con y sin internet" subtitle="Distribucion desde columna internet en resumen">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={internetPie} cx="50%" cy="45%" outerRadius={100} innerRadius={55} dataKey="value" paddingAngle={2} stroke="none">
                {internetPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatTooltipNumber(v), 'Unidades']} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#6B7280' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Resumen por entidad" subtitle="Unidades, consultorios habilitados y consultorios levantados">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={porEntidad} margin={{ top: 0, right: 10, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="entidad" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#9CA3AF' }} height={70} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatTooltipNumber(v)} cursor={{ fill: '#F9FAFB' }} />
            <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '8px', color: '#6B7280' }} />
            <Bar dataKey="unidades" name="Unidades" fill="#002F2A" />
            <Bar dataKey="consultoriosHabilitados" name="Consultorios Habilitados" fill="#A57F2C" />
            <Bar dataKey="consultoriosLevantados" name="Consultorios Levantados" fill="#1A6B5E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
