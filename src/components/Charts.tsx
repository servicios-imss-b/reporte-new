import { useMemo, useState, type ReactNode } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { BarChart3, GraduationCap, PieChart as PieChartIcon } from 'lucide-react';
import type { QuestionSummary, Rating, ReportData } from '../types';

const RATINGS: Rating[] = ['Buena', 'Mala', 'Regular'];
const RATING_COLORS: Record<Rating, string> = {
  Buena: '#1A6B5E',
  Mala: '#9F3A38',
  Regular: '#A57F2C',
};
const QUESTION_COLORS = ['#1A6B5E', '#A57F2C', '#4778A8', '#9F3A38', '#8064A2', '#49A7A0', '#DE8054', '#758B47'];

const tooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  background: '#FFFFFF',
  fontSize: '13px',
  color: '#111827',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};
const intFormatter = new Intl.NumberFormat('es-MX');

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-MX');
}

function percentage(value: number, total: number): string {
  return `${(total > 0 ? (value / total) * 100 : 0).toFixed(1)}%`;
}

function ChartCard({
  title,
  subtitle,
  children,
  tone = 'emerald',
  badge,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  tone?: 'emerald' | 'gold' | 'teal' | 'rose';
  badge?: string;
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    gold: 'bg-amber-50 text-amber-700',
    teal: 'bg-teal-50 text-teal-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-emerald-300 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          {title === 'Formación principal y situación hospitalaria' ? (
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          ) : title === 'Calificación general por entidad' ? (
            <PieChartIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-['Montserrat'] text-lg font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-800">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RatingPie({
  counts,
  total,
  selectedRating = 'Todas',
  data = RATINGS.map((name) => ({ name, value: counts[name], color: RATING_COLORS[name] })),
}: {
  counts: Record<Rating, number>;
  total: number;
  selectedRating?: 'Todas' | Rating;
  data?: Array<{ name: string; value: number; color: string }>;
}) {

  if (total === 0) {
    return <p className="py-16 text-center text-sm text-gray-500">No hay respuestas para esta selección.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={290}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="46%"
            innerRadius={67}
            outerRadius={104}
            paddingAngle={2}
            stroke="none"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
            labelLine
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              `${Number(value).toLocaleString('es-MX')} respuestas (${percentage(Number(value), total)})`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(name) => selectedRating === 'Todas' ? name : `${name} · filtro aplicado`}
          />
          <text x="50%" y="43%" textAnchor="middle" className="fill-gray-500" fontSize="12">
            Respuestas
          </text>
          <text x="50%" y="50%" textAnchor="middle" className="fill-gray-900" fontSize="20" fontWeight="700">
            {intFormatter.format(total)}
          </text>
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-2 text-center">
        {data.map(({ name, value }) => (
          <div key={name} className="rounded-lg bg-gray-50 px-2 py-3">
            <p className="text-xs text-gray-500">{name}</p>
            <p className="mt-1 text-sm font-bold text-gray-800">
              {percentage(value, total)} <span className="font-normal text-gray-500">({value})</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuestionAnswersChart({ questions }: { questions: QuestionSummary[] }) {
  const availableQuestions = questions;
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const selected = availableQuestions.find((question) => question.question === selectedQuestion)
    ?? availableQuestions[0];
  const data = (selected?.answers ?? []).slice().sort((a, b) => b.value - a.value);
  const maxCount = Math.max(...data.map((item) => item.value), 1);

  return (
    <ChartCard
      title="Respuestas por pregunta"
      subtitle="Explora la distribución de respuestas de las preguntas cerradas de la encuesta."
      tone="teal"
    >
      {availableQuestions.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">No hay preguntas para mostrar.</p>
      ) : (
        <>
          <label className="mb-5 block max-w-2xl">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Seleccionar pregunta cerrada</span>
            <select
              value={selected?.question ?? ''}
              onChange={(event) => setSelectedQuestion(event.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 pr-10 text-xs font-semibold text-slate-800 outline-none transition-all hover:bg-slate-100/80 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 sm:text-sm"
            >
              {availableQuestions.map((question) => (
                <option key={question.question} value={question.question}>
                  {question.question} ({question.total} respuestas)
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <>
              <div className="space-y-2">
                {data.map((item, index) => {
                  const rate = selected.total > 0 ? (item.value / selected.total) * 100 : 0;
                  const selectedColor = QUESTION_COLORS[index % QUESTION_COLORS.length];
                  return (
                    <div key={item.name} className="rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-slate-100 hover:bg-slate-50/80">
                      <div className="mb-2 flex flex-col justify-between gap-1 text-xs sm:flex-row sm:items-center">
                        <span className="flex items-start gap-2 font-semibold text-slate-800">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                            {index + 1}
                          </span>
                          <span>{item.name}</span>
                        </span>
                        <span className="shrink-0 pl-7 font-mono">
                          <strong className="text-sm text-slate-900">{intFormatter.format(item.value)}</strong>
                          <span className="ml-2 text-slate-500">({rate.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-5 w-full overflow-hidden rounded-lg border border-slate-200/50 bg-slate-100 p-0.5">
                        <div
                          className="h-full min-w-1 rounded-md transition-all duration-500"
                          style={{ width: `${Math.max(item.value > 0 ? 4 : 0, (item.value / maxCount) * 100)}%`, backgroundColor: selectedColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span>Total de respuestas válidas en esta pregunta: <strong className="text-slate-800">{selected.total}</strong></span>
                <span>Excluye preguntas abiertas y datos personales</span>
              </div>
            </>
          ) : null}
        </>
      )}
    </ChartCard>
  );
}

export function QuestionDistributionChart({
  title,
  subtitle,
  question,
  tone,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  question?: QuestionSummary;
  tone: 'emerald' | 'gold' | 'teal' | 'rose';
  compact?: boolean;
}) {
  if (!question) {
    return (
      <ChartCard title={title} subtitle="No se encontró esta pregunta en la base." tone={tone}>
        <p className="py-12 text-center text-sm text-gray-500">No hay datos disponibles.</p>
      </ChartCard>
    );
  }

  const answers = question.answers;
  return (
    <ChartCard
      title={title}
      subtitle={subtitle ?? question.question}
      tone={tone}
      badge={`${intFormatter.format(question.total)} respuestas`}
    >
      <div className={compact ? 'space-y-3' : 'grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,1fr)]'}>
        <ResponsiveContainer width="100%" height={compact ? 190 : 245}>
          <PieChart>
            <Pie
              data={answers}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={compact ? 45 : 54}
              outerRadius={compact ? 75 : 91}
              paddingAngle={2}
              stroke="none"
            >
              {answers.map((answer, index) => (
                <Cell key={answer.name} fill={QUESTION_COLORS[index % QUESTION_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                `${intFormatter.format(Number(value))} (${percentage(Number(value), question.total)})`,
                name,
              ]}
            />
            <text x="50%" y="48%" textAnchor="middle" className="fill-slate-900" fontSize="22" fontWeight="800">
              {intFormatter.format(question.total)}
            </text>
            <text x="50%" y="57%" textAnchor="middle" className="fill-slate-500" fontSize="11">Total</text>
          </PieChart>
        </ResponsiveContainer>
        <div className={`grid grid-cols-1 gap-2 ${compact ? 'max-h-40 overflow-y-auto border-t border-slate-100 pt-3' : ''}`}>
          {answers.map((answer, index) => (
            <div key={answer.name} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100/80">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: QUESTION_COLORS[index % QUESTION_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-xs leading-snug text-slate-800" title={answer.name}>{answer.name}</span>
              <span className="shrink-0 text-right font-mono text-[11px] font-bold text-slate-900">
                {percentage(answer.value, question.total)}
                <span className="ml-1 font-normal text-slate-500">({intFormatter.format(answer.value)})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

function EntityRatingChart({ report }: { report: ReportData }) {
  const [selectedRating, setSelectedRating] = useState<'Todas' | Rating>('Todas');
  const entity = report.entityRatings.length === 1 ? report.entityRatings[0] : undefined;
  const total = entity?.total ?? report.totalResponses;
  const counts = entity?.ratings ?? report.ratingDistribution;
  const pieData = selectedRating === 'Todas'
    ? RATINGS.map((name) => ({ name, value: counts[name], color: RATING_COLORS[name] }))
    : [
        { name: selectedRating, value: counts[selectedRating], color: RATING_COLORS[selectedRating] },
        {
          name: 'Otras calificaciones',
          value: Math.max(0, total - counts[selectedRating]),
          color: '#CBD5E1',
        },
      ];

  return (
    <ChartCard
      title="Calificación general por entidad"
      subtitle={entity
        ? `Distribución de respuestas de ${entity.entity}.`
        : 'Distribución general de calificaciones en todas las entidades.'}
      tone="gold"
    >
      <div className="max-w-sm">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">Clasificación</span>
          <select
            value={selectedRating}
            onChange={(event) => setSelectedRating(event.target.value as 'Todas' | Rating)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="Todas">Todas</option>
            {RATINGS.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-4 text-xs font-medium text-gray-500">
        {entity ? entity.entity : 'Todas las entidades'} · {intFormatter.format(total)} respuestas
      </p>
      <div className="mt-1">
        <RatingPie
          counts={counts}
          total={total}
          selectedRating={selectedRating}
          data={pieData}
        />
      </div>
    </ChartCard>
  );
}

// Debe coincidir con las claves y años del selector del cuestionario.
const PROGRAM_KEYS = ['S313', 'E001', 'U013', 'S200', 'U313', 'E003', 'E004', 'E006'];
const PROGRAM_YEARS = ['2024', '2025'];

export function completionStats(rows: Array<Record<string, string | number>>) {
  const answered = new Set(rows.map((row) => `${String(row.programa ?? '').trim().toUpperCase()}|${String(row.anio ?? '').trim()}`));
  const expected = PROGRAM_KEYS.length * PROGRAM_YEARS.length;
  const done = PROGRAM_KEYS.reduce((sum, key) => sum + PROGRAM_YEARS.filter((year) => answered.has(`${key}|${year}`)).length, 0);
  return { done, expected, percent: expected > 0 ? (done / expected) * 100 : 0 };
}

export function CompletionCharts({ rows, error }: { rows: Array<Record<string, string | number>>; error?: string }) {
  const [selectedKey, setSelectedKey] = useState('');
  const answered = new Set(rows
    .map((row) => `${String(row.programa ?? '').trim().toUpperCase()}|${String(row.anio ?? '').trim()}`)
    .filter((pair) => !pair.startsWith('|') && !pair.endsWith('|')));
  const keys = selectedKey ? [selectedKey] : PROGRAM_KEYS;
  const byKey = keys.map((key) => {
    const years = PROGRAM_YEARS.map((year) => ({ year, done: answered.has(`${key}|${year}`) }));
    const done = years.filter((item) => item.done).length;
    return { key, years, done, percent: (done / PROGRAM_YEARS.length) * 100 };
  });
  const expected = keys.length * PROGRAM_YEARS.length;
  const done = byKey.reduce((sum, item) => sum + item.done, 0);
  const progress = expected > 0 ? (done / expected) * 100 : 0;
  const pieData = [
    { name: 'Resueltos', value: done, color: '#1A6B5E' },
    { name: 'Pendientes', value: expected - done, color: '#CBD5E1' },
  ];

  return (
    <div className="space-y-5">
      {error ? <div role="alert" className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div> : null}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard
          title="Avance general por clave y año"
          subtitle={`100% = cada clave con su cuestionario ${PROGRAM_YEARS.join(' y ')} resuelto.`}
          tone="gold"
          badge={`${done} de ${expected}`}
        >
          <label className="block max-w-sm">
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Clave del programa</span>
            <select
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Todas las claves</option>
              {PROGRAM_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
          </label>
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={67} outerRadius={104} paddingAngle={2} stroke="none">
                {pieData.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`${value} cuestionarios (${percentage(Number(value), expected)})`, name]}
              />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <text x="50%" y="43%" textAnchor="middle" className="fill-gray-500" fontSize="12">Avance</text>
              <text x="50%" y="51%" textAnchor="middle" className="fill-gray-900" fontSize="24" fontWeight="800">
                {progress.toFixed(1)}%
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avance por clave" subtitle="Cada clave vale 50% por año resuelto." tone="emerald">
          <div className="space-y-3">
            {byKey.map((item) => (
              <div key={item.key} className="rounded-xl px-3 py-2 hover:bg-slate-50">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-sm font-bold text-slate-900">{item.key}</span>
                  <span className="flex items-center gap-1.5">
                    {item.years.map(({ year, done: isDone }) => (
                      <span
                        key={year}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {year} {isDone ? '✓' : 'pendiente'}
                      </span>
                    ))}
                    <strong className="ml-2 w-12 text-right font-mono text-sm text-slate-900">{item.percent.toFixed(0)}%</strong>
                  </span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-lg border border-slate-200/50 bg-slate-100 p-0.5">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{ width: `${item.percent}%`, backgroundColor: item.percent === 100 ? '#1A6B5E' : '#A57F2C' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export function ReportCharts({ report }: { report: ReportData }) {
  const [scope, setScope] = useState<'estatal' | 'unidad'>('estatal');
  const [entityQuery, setEntityQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [entitySuggestionsOpen, setEntitySuggestionsOpen] = useState(false);
  const [activeEntitySuggestion, setActiveEntitySuggestion] = useState(0);
  const [selectedClues, setSelectedClues] = useState('');
  const [unitQuery, setUnitQuery] = useState('');
  const availableUnits = report.cluesReports.filter((item) =>
    !selectedEntity || normalize(item.entity) === normalize(selectedEntity),
  );
  const entitySuggestions = report.entityRatings.filter((item) =>
    normalize(item.entity).includes(normalize(entityQuery)),
  );
  const scopedReport = useMemo(() => {
    if (scope === 'estatal') {
      const entityReport = report.entityRatings.find((item) => item.entity === selectedEntity);
      if (!entityReport) return report;
      return {
        ...report,
        totalResponses: entityReport.total,
        ratingDistribution: entityReport.ratings,
        formationRatings: entityReport.formationRatings,
        entityRatings: [entityReport],
        questions: entityReport.questions,
      };
    }
    const cluesReport = report.cluesReports.find((item) => item.clues === selectedClues);
    if (!cluesReport) return report;
    return {
      ...report,
      totalResponses: cluesReport.total,
      ratingDistribution: cluesReport.ratingDistribution,
      formationRatings: cluesReport.formationRatings,
      entityRatings: [{
        entity: cluesReport.entity,
        total: cluesReport.total,
        ratings: cluesReport.ratingDistribution,
        formationRatings: cluesReport.formationRatings,
        questions: cluesReport.questions,
      }],
      questions: cluesReport.questions,
    };
  }, [report, scope, selectedEntity, selectedClues]);

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2" aria-label="Nivel de desglose">
        <button
          type="button"
          aria-pressed={scope === 'estatal'}
          onClick={() => setScope('estatal')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
            scope === 'estatal' ? 'border-imss-green bg-imss-green text-white shadow-md' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Estatal
        </button>
        <button
          type="button"
          aria-pressed={scope === 'unidad'}
          onClick={() => setScope('unidad')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
            scope === 'unidad' ? 'border-imss-green bg-imss-green text-white shadow-md' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Unidad hospitalaria
        </button>
      </nav>

      <section className="card flex flex-col gap-3 border-l-4 border-imss-green p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">
            {scope === 'estatal' ? 'Desglose estatal' : 'Desglose por unidad hospitalaria'}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {scope === 'estatal'
              ? 'Busca una entidad para filtrar sus resultados o consulta el total estatal.'
              : `Busca una unidad por CLUES o nombre del hospital${selectedEntity ? ` en ${selectedEntity}` : ''}; sin selección se muestra el total.`}
          </p>
        </div>
        {scope === 'estatal' ? (
          <div className="relative w-full sm:max-w-md">
            <label htmlFor="entity-dashboard-search" className="sr-only">Buscar por entidad</label>
            <input
              id="entity-dashboard-search"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={entitySuggestionsOpen}
              aria-controls="entity-dashboard-suggestions"
              value={entityQuery}
              onFocus={() => setEntitySuggestionsOpen(true)}
              onBlur={() => setEntitySuggestionsOpen(false)}
              onChange={(event) => {
                setEntityQuery(event.target.value);
                setSelectedEntity('');
                setActiveEntitySuggestion(0);
                setEntitySuggestionsOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setEntitySuggestionsOpen(true);
                  setActiveEntitySuggestion((index) => Math.min(index + 1, Math.max(0, entitySuggestions.length - 1)));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveEntitySuggestion((index) => Math.max(index - 1, 0));
                } else if (event.key === 'Enter' && entitySuggestions[activeEntitySuggestion]) {
                  event.preventDefault();
                  const entity = entitySuggestions[activeEntitySuggestion].entity;
                  setEntityQuery(entity);
                  setSelectedEntity(entity);
                  setSelectedClues('');
                  setUnitQuery('');
                  setEntitySuggestionsOpen(false);
                } else if (event.key === 'Escape') {
                  setEntitySuggestionsOpen(false);
                }
              }}
              placeholder="Escribe el nombre de una entidad..."
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {entitySuggestionsOpen ? (
              <div
                id="entity-dashboard-suggestions"
                role="listbox"
                aria-label="Entidades disponibles"
                className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedEntity}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setEntityQuery('');
                    setSelectedEntity('');
                    setSelectedClues('');
                    setUnitQuery('');
                    setEntitySuggestionsOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-imss-green hover:bg-emerald-50"
                >
                  Todas las entidades
                </button>
                {entitySuggestions.map((item, index) => (
                  <button
                    id={`entity-dashboard-option-${index}`}
                    key={item.entity}
                    type="button"
                    role="option"
                    aria-selected={index === activeEntitySuggestion}
                    onMouseEnter={() => setActiveEntitySuggestion(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setEntityQuery(item.entity);
                      setSelectedEntity(item.entity);
                      setSelectedClues('');
                      setUnitQuery('');
                      setEntitySuggestionsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                      index === activeEntitySuggestion ? 'bg-emerald-50 text-imss-green' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item.entity}</span>
                    <span className="text-xs text-gray-400">{intFormatter.format(item.total)} respuestas</span>
                  </button>
                ))}
                {entitySuggestions.length === 0 && entityQuery ? (
                  <p className="px-3 py-2 text-sm text-gray-500">No hay entidades que coincidan.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="w-full sm:max-w-md">
            <label htmlFor="clues-dashboard-search" className="sr-only">Buscar por unidad</label>
            <input
              id="clues-dashboard-search"
              type="search"
              list="clues-dashboard-options"
              value={unitQuery}
              onChange={(event) => {
                const value = event.target.value;
                setUnitQuery(value);
                const unit = availableUnits.find((item) =>
                  normalize(value) === normalize(item.clues)
                  || normalize(value) === normalize(item.hospital)
                  || normalize(value) === normalize(`${item.clues} · ${item.hospital} · ${item.entity}`),
                );
                setSelectedClues(unit?.clues ?? '');
              }}
              placeholder="Busca CLUES, hospital o entidad..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <datalist id="clues-dashboard-options">
              {availableUnits.map((item) => (
                <option key={item.clues} value={item.clues} label={`${item.hospital} · ${item.entity}`} />
              ))}
            </datalist>
          </div>
        )}
      </section>

      <EntityRatingChart report={scopedReport} />
    </div>
  );
}
