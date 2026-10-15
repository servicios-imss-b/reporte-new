import { useEffect, useState } from 'react';
import { BarChart3, Building2, ClipboardList, HelpCircle, Layers3, TableProperties, Users } from 'lucide-react';
import { Header } from './components/Header';
import { QuestionDistributionChart, ReportCharts } from './components/Charts';
import { DataTable } from './components/DataTable';
import { cargarReporte } from './data';
import type { QuestionSummary, ReportData } from './types';

type MainTab = 'dashboard' | 'resumen' | 'bases';
type ReportTableRow = Record<string, string | number>;

export default function App() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'general' | 'preguntas'>('general');
  const [rawSupabaseRows, setRawSupabaseRows] = useState<ReportTableRow[]>([]);
  const [rawSupabaseError, setRawSupabaseError] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    cargarReporte()
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte.');
      })
      .finally(() => setLoading(false));
  }, []);

  const programOptions = [...new Set(rawSupabaseRows.map((row) => String(row.programa ?? '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'es'));
  const yearOptions = [...new Set(rawSupabaseRows.map((row) => String(row.anio ?? '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'es', { numeric: true }));
  const filteredSupabaseRows = rawSupabaseRows.filter((row) =>
    (!selectedProgram || String(row.programa ?? '') === selectedProgram)
    && (!selectedYear || String(row.anio ?? '') === selectedYear)
  );

  useEffect(() => {
    const handleSupabaseRows = (event: MessageEvent) => {
      if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin) return;
      if (event.data?.type !== 'supabase-relational-data') return;

      const rows = Array.isArray(event.data.rows)
        ? event.data.rows.flatMap((value: unknown) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
            const row: ReportTableRow = {};
            Object.entries(value as Record<string, unknown>).forEach(([key, cell]) => {
              row[key] = typeof cell === 'number' ? cell : cell === null || cell === undefined ? '' : String(cell);
            });
            return [row];
          })
        : [];

      setRawSupabaseRows(rows);
      setRawSupabaseError(typeof event.data.error === 'string' ? event.data.error : '');
    };

    window.addEventListener('message', handleSupabaseRows);
    if (window.parent === window) {
      setRawSupabaseError('Accede desde la aplicación principal para cargar la base de Supabase.');
    } else {
      window.parent.postMessage({ type: 'reporte-new-ready' }, window.location.origin);
    }

    return () => window.removeEventListener('message', handleSupabaseRows);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        eyebrow="Encuesta hospitalaria"
        title="Reporte de situación hospitalaria"
        subtitle="Resultados agregados por pregunta, CLUES y entidad. Las respuestas individuales no se muestran."
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="card p-10 text-center text-gray-500">Cargando respuestas de la encuesta...</div>
        ) : error ? (
          <div role="alert" className="card border-red-200 bg-red-50 p-6 text-red-800">{error}</div>
        ) : report ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen general">
              <SummaryCard icon={Users} label="Respuestas" value={report.totalResponses} tone="emerald" />
              <SummaryCard icon={Building2} label="Entidades" value={report.entities.length} tone="gold" />
              <SummaryCard icon={Building2} label="CLUES" value={report.cluesReports.length} tone="teal" />
              <SummaryCard icon={ClipboardList} label="Preguntas con datos" value={report.questions.length} tone="teal" />
            </section>
            <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-4" aria-label="Secciones del reporte">
              <MainTabButton
                active={mainTab === 'dashboard'}
                icon={BarChart3}
                label="Tablero"
                onClick={() => setMainTab('dashboard')}
              />
              <MainTabButton
                active={mainTab === 'resumen'}
                icon={HelpCircle}
                label="Resumen"
                onClick={() => setMainTab('resumen')}
              />
              <MainTabButton
                active={mainTab === 'bases'}
                icon={TableProperties}
                label="Bases"
                onClick={() => setMainTab('bases')}
              />
            </nav>

            {mainTab === 'dashboard' ? (
              <>
                <nav aria-label="Vistas del tablero" className="flex flex-wrap gap-2">
                  <BaseTabButton active={dashboardTab === 'general'} onClick={() => setDashboardTab('general')}>Calificación general</BaseTabButton>
                  <BaseTabButton active={dashboardTab === 'preguntas'} onClick={() => setDashboardTab('preguntas')}>Gráficos de preguntas</BaseTabButton>
                </nav>
                {dashboardTab === 'general' ? <ReportCharts report={report} /> : <QuestionSummaryCards report={report} />}
              </>
            ) : mainTab === 'resumen' ? (
              <QuestionSummaryCards key="resumen" report={report} summary />
            ) : (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Programa
                    <select
                      value={selectedProgram}
                      onChange={(event) => setSelectedProgram(event.target.value)}
                      className="min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Todos los programas</option>
                      {programOptions.map((program) => <option key={program} value={program}>{program}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Año
                    <select
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                      className="min-w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Todos los años</option>
                      {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                </div>
                <DataTable<ReportTableRow>
                  title="Base cruda"
                  description={rawSupabaseError || 'Una fila por respuesta, ordenada por fecha del formulario y pregunta.'}
                  data={filteredSupabaseRows}
                  columns={tableColumns(Object.keys(rawSupabaseRows[0] ?? {}))}
                  exportFileName="base_cruda_supabase"
                  exportSheetName="Base cruda"
                />
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function QuestionSummaryCards({ report, summary = false }: { report: ReportData; summary?: boolean }) {
  const [chartTab, setChartTab] = useState<'barras' | 'donas'>('barras');
  const [entity, setEntity] = useState('');
  const [clues, setClues] = useState('');
  const [questionName, setQuestionName] = useState('');
  const units = report.cluesReports.filter((unit) => !entity || unit.entity === entity);
  const unit = units.find((item) => item.clues === clues);
  const entityReport = report.entityRatings.find((item) => item.entity === entity);
  const questions: QuestionSummary[] = unit?.questions ?? entityReport?.questions ?? report.questions;
  const selected = questions.find((item) => item.question === questionName);
  const visibleQuestions = selected ? [selected] : questions;
  const colors = ['#1A6B5E', '#A57F2C', '#4778A8', '#9F3A38', '#8064A2', '#49A7A0', '#DE8054', '#758B47'];

  if (questions.length === 0) {
    return <div className="card p-10 text-center text-gray-500">No hay respuestas por pregunta para mostrar.</div>;
  }

  return (
    <section aria-label="Resumen de respuestas por pregunta" className="space-y-5">
      <div className="card border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-imss-green shadow-sm">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-['Montserrat'] text-lg font-bold text-slate-900">{summary ? 'Resumen' : 'Gráficos de preguntas'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escoge un Estado, después una CLUES y luego la Pregunta para abrir su tarjeta interactiva.
            </p>
          </div>
        </div>
      </div>
      {!summary ? <nav aria-label="Tipo de gráficas por pregunta" className="flex flex-wrap gap-2">
        <BaseTabButton active={chartTab === 'barras'} onClick={() => setChartTab('barras')}>Explorador de respuestas</BaseTabButton>
        <BaseTabButton active={chartTab === 'donas'} onClick={() => setChartTab('donas')}>Gráficos de donas</BaseTabButton>
      </nav> : null}
      <div className="flex flex-wrap gap-2">
        <BaseTabButton active={!selected} onClick={() => setQuestionName('')}>Todas las Preguntas</BaseTabButton>
        <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-imss-green" onClick={() => { setEntity(''); setClues(''); setQuestionName(''); }}>
          Restablecer a general
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-emerald-50 to-slate-50 p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-950">Diagrama de selección guiada</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-3 block text-sm font-bold text-imss-green">1 · Escoger Estado</span>
            <select aria-label="Escoger Estado" value={entity} onChange={(event) => { setEntity(event.target.value); setClues(''); }} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
              <option value="">Todas las entidades (general)</option>
              {report.entities.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-3 block text-sm font-bold text-imss-green">2 · Escoger CLUES</span>
            <select aria-label="Escoger CLUES" value={clues} onChange={(event) => setClues(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
              <option value="">{entity ? `Todas las unidades de ${entity}` : 'Todas las unidades (general)'}</option>
              {units.map((item) => <option key={item.clues} value={item.clues}>[{item.clues}] {item.hospital}</option>)}
            </select>
            <span className="mt-2 block text-xs text-slate-500">{units.length} unidades disponibles</span>
          </label>
          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-3 block text-sm font-bold text-imss-green">3 · Escoger Pregunta</span>
            <select aria-label="Escoger Pregunta" value={selected?.question ?? ''} onChange={(event) => setQuestionName(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
              <option value="">Todas las preguntas</option>
              {questions.map((item) => <option key={item.question} value={item.question}>{item.question}</option>)}
            </select>
          </label>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-600">{unit ? `${unit.clues} · ${unit.hospital}` : entity || 'Total general'}</p>
      {!summary && chartTab === 'donas' ? (
        <div>
          <h3 className="font-['Montserrat'] text-lg font-bold text-slate-900">Distribución institucional por variables clave</h3>
          <p className="mt-1 text-xs text-slate-500">Distribución de respuestas con total central y leyenda por variable.</p>
        </div>
      ) : null}
      <div className={!selected ? `grid grid-cols-1 gap-5 ${chartTab === 'donas' && !summary ? 'md:grid-cols-2 xl:grid-cols-3' : 'xl:grid-cols-2'}` : 'space-y-5'}>
        {visibleQuestions.map((question) => {
          const answers = [...question.answers].sort((a, b) => b.value - a.value);
          const maxCount = Math.max(...answers.map((answer) => answer.value), 1);

          return (
            summary ? (
              <article key={question.question} className="card min-w-0 p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <h3 className="font-['Montserrat'] text-base font-bold text-slate-900">{question.question}</h3>
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-800">{question.total} {question.total === 1 ? 'respuesta' : 'respuestas'}</span>
                </div>
                <div className="space-y-2">
                  {answers.map((answer) => (
                    <div key={answer.name} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-800">{answer.name}</span>
                      <span className="shrink-0 font-mono text-xs">
                        <strong className="text-slate-900">{answer.value}</strong>
                        {!unit ? <span className="ml-2 text-slate-500">({percent(answer.value, question.total).toFixed(1)}%)</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ) : <div key={question.question} className={chartTab === 'barras' ? 'grid min-w-0 grid-cols-1 items-start gap-5' : 'min-w-0'}>
              <QuestionDistributionChart title={question.question} question={question} tone="emerald" compact={chartTab === 'donas'} />
              {chartTab === 'barras' ? (
            <article className="card min-w-0 p-5 transition-all hover:border-emerald-200 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <h3 className="font-['Montserrat'] text-base font-bold leading-snug text-slate-900">
                  {question.question}
                </h3>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  {question.total.toLocaleString('es-MX')} resp.
                </span>
              </div>
              <div className="space-y-3">
                {answers.map((answer, index) => {
                  const rate = question.total > 0 ? (answer.value / question.total) * 100 : 0;
                  return (
                    <div key={answer.name} className="rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-slate-100 hover:bg-slate-50/80">
                      <div className="mb-2 flex items-start justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-start gap-2 font-semibold text-slate-800">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                            {index + 1}
                          </span>
                          <span>{answer.name}</span>
                        </span>
                        <span className="shrink-0 font-mono">
                          <strong className="text-sm text-slate-900">{answer.value.toLocaleString('es-MX')}</strong>
                          {!unit ? <span className="ml-2 text-slate-500">({rate.toFixed(1)}%)</span> : null}
                        </span>
                      </div>
                      <div className="h-4 w-full overflow-hidden rounded-lg border border-slate-200/50 bg-slate-100 p-0.5">
                        <div
                          className="h-full min-w-1 rounded-md transition-all duration-500"
                          style={{
                            width: `${Math.max(answer.value > 0 ? 4 : 0, (answer.value / maxCount) * 100)}%`,
                            backgroundColor: colors[index % colors.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Total de respuestas válidas: <strong className="text-slate-800">{question.total.toLocaleString('es-MX')}</strong>
              </div>
            </article>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  tone: 'emerald' | 'gold' | 'teal';
}) {
  const tones = {
    emerald: {
      card: 'border-emerald-200 bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-700',
      number: 'text-emerald-800',
    },
    gold: {
      card: 'border-amber-200 bg-amber-50',
      icon: 'bg-amber-100 text-amber-700',
      number: 'text-amber-800',
    },
    teal: {
      card: 'border-teal-200 bg-teal-50',
      icon: 'bg-teal-100 text-teal-700',
      number: 'text-teal-800',
    },
  }[tone];

  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${tones.card}`}>
      <div className="absolute -right-4 -top-4 opacity-[0.08] transition-transform duration-500 group-hover:scale-125 group-hover:opacity-[0.14]">
        <Icon className={`h-20 w-20 ${tones.number}`} aria-hidden="true" />
      </div>
      <div className="relative mb-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
      </div>
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
        <p className={`mt-1 text-3xl font-black tabular-nums ${tones.number}`}>
          {value.toLocaleString('es-MX')}
        </p>
      </div>
    </div>
  );
}

function MainTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof BarChart3;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
        active
          ? 'border-imss-green bg-imss-green text-white shadow-md'
          : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-imss-green'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function BaseTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
        active
          ? 'bg-imss-green text-white shadow-md'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function tableColumns(keys: string[]) {
  return keys.map((key) => ({
    key,
    label: key,
    render: (row: ReportTableRow) => {
      const value = row[key];
      if (key === 'Distribución (%)') {
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold">
            {(['Buena', 'Regular', 'Mala'] as const).map((rating, index) => (
              <span key={rating} className="inline-flex items-center gap-1">
                {index > 0 ? <span aria-hidden="true" className="text-slate-300">/</span> : null}
                <span
                  className={rating === 'Buena' ? 'text-emerald-700' : rating === 'Regular' ? 'text-amber-700' : 'text-rose-700'}
                  title={rating}
                  aria-label={`${rating}: ${percent(Number(row[rating]), Number(row.Respuestas))}%`}
                >
                  {percent(Number(row[rating]), Number(row.Respuestas))}%
                </span>
              </span>
            ))}
          </span>
        );
      }
      return typeof value === 'number' && key.endsWith('(%)')
        ? `${value.toFixed(1)}%`
        : String(value ?? '');
    },
  }));
}

function percent(value: number, total: number): number {
  return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
}

