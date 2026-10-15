import { useMemo, useState, type ReactNode } from 'react';
import { Download, Search, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportarExcel } from '../exportExcel';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  exportColumns?: Column<T>[];
  title?: string;
  exportFileName: string;
  exportSheetName: string;
}

const PAGE_SIZE = 15;

export function DataTable<T extends object>({
  data,
  columns,
  exportColumns,
  title,
  exportFileName,
  exportSheetName,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) => columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q)));
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }

      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'es')
        : String(bv).localeCompare(String(av), 'es');
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    const columnsToExport = exportColumns ?? columns;
    const out = sorted.map((row) => {
      const o: Record<string, unknown> = {};
      columnsToExport.forEach((col) => {
        o[col.label] = row[col.key];
      });
      return o;
    });
    exportarExcel(out, exportFileName, exportSheetName);
  };

  return (
    <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50 p-4">
        <div>
          <h3 className="font-['Montserrat'] text-sm font-bold text-slate-900">
            {title ?? 'Resultados agregados'} ({sorted.length} registros)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">Datos agregados, sin mostrar respuestas individuales</p>
        </div>
      </div>
      <div className="flex items-center border-b border-slate-100 bg-white p-4">
        <label className="relative block w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Filtrar registros por término..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 sm:text-sm"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/80 font-bold text-slate-700">
              {columns.map((col) => {
                const label = String(col.label);
                const colorClass = label.startsWith('Buena')
                  ? 'text-emerald-700'
                  : label.startsWith('Regular')
                    ? 'text-amber-700'
                    : label.startsWith('Mala')
                      ? 'text-rose-700'
                      : 'text-slate-500';
                return (
                <th key={String(col.key)} className="whitespace-nowrap p-3 text-left font-semibold">
                  {col.sortable !== false ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className={`flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors hover:text-imss-green ${colorClass}`}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc'
                          ? <ChevronUp className="h-3.5 w-3.5 text-amber-700" />
                          : <ChevronDown className="h-3.5 w-3.5 text-amber-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </button>
                  ) : (
                    <span className={`text-[11px] uppercase tracking-wider ${colorClass}`}>{col.label}</span>
                  )}
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-slate-400">
                  No se encontraron registros
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50">
                  {columns.map((col) => {
                    const label = String(col.label);
                    const textClass = label.startsWith('Buena')
                      ? 'font-semibold text-emerald-700'
                      : label.startsWith('Regular')
                        ? 'font-semibold text-amber-700'
                        : label.startsWith('Mala')
                          ? 'font-semibold text-rose-700'
                          : label === 'Respuestas' || label === 'Respuestas válidas'
                            ? 'font-extrabold text-slate-900'
                            : 'text-slate-700';
                    const cellClass = label === 'CLUES'
                      ? 'bg-slate-50/50 font-mono font-bold text-slate-900'
                      : label.endsWith('(%)') && label.startsWith('Buena')
                        ? 'bg-emerald-50/50'
                        : label.endsWith('(%)') && label.startsWith('Regular')
                          ? 'bg-amber-50/50'
                          : label.endsWith('(%)') && label.startsWith('Mala')
                            ? 'bg-rose-50/50'
                            : '';
                    return (
                    <td key={String(col.key)} className={`whitespace-nowrap p-3 ${textClass} ${cellClass}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="text-xs text-slate-600">
          {sorted.length > 0 ? cur * PAGE_SIZE + 1 : 0}-{Math.min((cur + 1) * PAGE_SIZE, sorted.length)} de {sorted.length} registros
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, cur - 1))}
            disabled={cur === 0}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-slate-600">
            Página {cur + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, cur + 1))}
            disabled={cur >= totalPages - 1}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-imss-green transition-colors hover:bg-emerald-100"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Excel
        </button>
      </div>
    </div>
  );
}
