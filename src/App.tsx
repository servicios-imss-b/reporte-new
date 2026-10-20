import { useEffect, useState } from 'react';
import { BarChart3, ClipboardList, Download, FolderOpen, HelpCircle, Percent, TableProperties, Users } from 'lucide-react';
import { Header } from './components/Header';
import { CompletionCharts, QuestionDistributionChart, completionStats } from './components/Charts';
import { DataTable } from './components/DataTable';
import { exportarExcel } from './exportExcel';
import { cargarReporte } from './data';
import type { ReportData } from './types';

type MainTab = 'dashboard' | 'resumen' | 'bases' | 'archivos';
type ReportTableRow = Record<string, string | number>;

export default function App() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'general' | 'preguntas'>('general');
  const [rawSupabaseRows, setRawSupabaseRows] = useState<ReportTableRow[]>([]);
  const [rawSupabaseError, setRawSupabaseError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [baseTab, setBaseTab] = useState<'cruda' | 'preguntas' | 'p37'>('cruda');
  const [matrixProgram, setMatrixProgram] = useState('');
  const [matrixYear, setMatrixYear] = useState('');
  const [questionSection, setQuestionSection] = useState('');
  const [geoCatalog, setGeoCatalog] = useState<Map<string, GeographicRow>>(new Map());

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
  const pivotedBase = pivotByQuestionnaire(filteredSupabaseRows);
  const matrixRows = matrixProgram && matrixYear
    ? rawSupabaseRows.filter((row) => String(row.programa ?? '') === matrixProgram && String(row.anio ?? '') === matrixYear)
    : [];
  const question37Rows = baseTab === 'p37' && matrixRows.length > 0 ? buildQuestion37Rows(matrixRows, geoCatalog) : [];
  const matrixYearOptions = [...new Set(rawSupabaseRows
    .filter((row) => String(row.programa ?? '') === matrixProgram)
    .map((row) => String(row.anio ?? '').trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'es', { numeric: true }));
  const formCount = new Set(rawSupabaseRows.map((row) => String(row.formulario_id || row.folio)).filter(Boolean)).size;
  const answeredQuestions = new Set(rawSupabaseRows
    .filter((row) => String(row.respuesta ?? '').trim())
    .map((row) => String(row.pregunta_id ?? '').replace(/__apoyo_\d+$/, ''))
    .filter(Boolean)).size;
  const completion = completionStats(rawSupabaseRows);
  const fileRows = buildFileRows(rawSupabaseRows);

  useEffect(() => {
    if (baseTab !== 'p37' || geoCatalog.size > 0) return;
    fetch(`${import.meta.env.BASE_URL}matricesCuantificacion.json`)
      .then((response) => response.json() as Promise<{ estatal: GeographicRow[]; municipal: GeographicRow[] }>)
      .then((data) => {
        const catalog = new Map<string, GeographicRow>();
        data.estatal.forEach((row) => catalog.set(row.clave, row));
        data.municipal.forEach((row) => catalog.set(row.llave ?? row.clave, row));
        setGeoCatalog(catalog);
      })
      .catch(() => undefined);
  }, [baseTab, geoCatalog]);

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
      setRefreshing(false);
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
        {window.parent !== window ? (
          <div className="flex justify-end rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true);
                window.setTimeout(() => setRefreshing(false), 15_000);
                window.parent.postMessage({ type: 'reporte-new-refresh' }, window.location.origin);
              }}
              className="rounded-lg bg-imss-green px-3 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {refreshing ? 'Actualizando...' : 'Actualizar ahora'}
            </button>
          </div>
        ) : null}
        {loading ? (
          <div className="card p-10 text-center text-gray-500">Cargando respuestas de la encuesta...</div>
        ) : error ? (
          <div role="alert" className="card border-red-200 bg-red-50 p-6 text-red-800">{error}</div>
        ) : report ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen general">
              <SummaryCard icon={Users} label="Cuestionarios" value={formCount} tone="emerald" />
              <SummaryCard icon={Percent} label={`Avance (${completion.done} de ${completion.expected})`} value={Number(completion.percent.toFixed(1))} suffix="%" tone="gold" />
              <SummaryCard icon={ClipboardList} label="Preguntas con datos" value={answeredQuestions} tone="teal" />
              <SummaryCard icon={FolderOpen} label="Archivos" value={fileRows.length} tone="teal" />
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
              <MainTabButton
                active={mainTab === 'archivos'}
                icon={FolderOpen}
                label="Archivos"
                onClick={() => setMainTab('archivos')}
              />
            </nav>

            {mainTab === 'dashboard' ? (
              <>
                <nav aria-label="Vistas del tablero" className="flex flex-wrap gap-2">
                  <BaseTabButton active={dashboardTab === 'general'} onClick={() => setDashboardTab('general')}>Calificación general</BaseTabButton>
                  <BaseTabButton active={dashboardTab === 'preguntas'} onClick={() => setDashboardTab('preguntas')}>Gráficos de preguntas</BaseTabButton>
                </nav>
                {dashboardTab === 'general' ? <CompletionCharts rows={rawSupabaseRows} error={rawSupabaseError} /> : <QuestionnaireSummary rows={rawSupabaseRows} error={rawSupabaseError} charts />}
              </>
            ) : mainTab === 'resumen' ? (
              <QuestionnaireSummary rows={rawSupabaseRows} error={rawSupabaseError} />
            ) : mainTab === 'archivos' ? (
              <DataTable<ReportTableRow>
                title="Archivos en Google Drive"
                description={rawSupabaseError || 'Documentos adjuntos por cuestionario. El enlace abre el archivo en Drive.'}
                data={fileRows}
                columns={FILE_COLUMNS}
                exportFileName="archivos_drive"
                exportSheetName="Archivos"
              />
            ) : (
              <section className="space-y-4">
                <nav aria-label="Tablas de bases" className="flex flex-wrap gap-2">
                  <BaseTabButton active={baseTab === 'cruda'} onClick={() => setBaseTab('cruda')}>Base cruda</BaseTabButton>
                  <BaseTabButton active={baseTab === 'preguntas'} onClick={() => setBaseTab('preguntas')}>Preguntas</BaseTabButton>
                  <BaseTabButton active={baseTab === 'p37'} onClick={() => setBaseTab('p37')}>Matriz 37</BaseTabButton>
                </nav>
                {baseTab === 'cruda' ? <div className="flex flex-wrap items-end gap-3">
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
                </div> : null}
                {baseTab === 'cruda' ? (
                  <DataTable<ReportTableRow>
                    key="cruda"
                    title="Base cruda"
                    description={rawSupabaseError || 'Una fila por cuestionario; cada pregunta es una columna con su sección.'}
                    data={pivotedBase.rows}
                    columns={pivotedBase.columns}
                    exportFileName="base_cruda_supabase"
                    exportSheetName="Base cruda"
                  />
                ) : (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-emerald-50 to-slate-50 p-5">
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-950">Diagrama de selección guiada</h3>
                      <div className={`grid grid-cols-1 gap-4 ${baseTab === 'preguntas' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                        <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <span className="mb-3 block text-sm font-bold text-imss-green">1 · Escoger Programa</span>
                          <select aria-label="Escoger Programa" value={matrixProgram} onChange={(event) => { setMatrixProgram(event.target.value); setMatrixYear(''); }} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
                            <option value="">Selecciona un programa</option>
                            {programOptions.map((program) => <option key={program} value={program}>{program}</option>)}
                          </select>
                        </label>
                        <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <span className="mb-3 block text-sm font-bold text-imss-green">2 · Escoger Año</span>
                          <select aria-label="Escoger Año" value={matrixYear} disabled={!matrixProgram} onChange={(event) => setMatrixYear(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold disabled:opacity-60">
                            <option value="">{matrixProgram ? 'Selecciona un año' : 'Primero escoge un programa'}</option>
                            {matrixYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                          </select>
                        </label>
                        {baseTab === 'preguntas' ? (
                          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="mb-3 block text-sm font-bold text-imss-green">3 · Escoger Sección</span>
                            <select aria-label="Escoger Sección" value={questionSection} onChange={(event) => setQuestionSection(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
                              <option value="">Todas las secciones</option>
                              {SECTIONS.map(([, name], index) => {
                                const label = `Sección ${index + 1} · ${name}`;
                                return <option key={label} value={label}>{label}</option>;
                              })}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </div>
                    {matrixProgram && matrixYear ? (
                      baseTab === 'preguntas'
                        ? <QuestionList rows={matrixRows} program={matrixProgram} year={matrixYear} section={questionSection} error={rawSupabaseError} />
                        : <Matrix37List rows={question37Rows} program={matrixProgram} year={matrixYear} error={rawSupabaseError} />
                    ) : (
                      <div className="card p-10 text-center text-sm text-gray-500">Escoge un programa y un año para ver {baseTab === 'preguntas' ? 'las preguntas' : 'la Matriz 37'}.</div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  suffix?: string;
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
          {value.toLocaleString('es-MX')}{suffix}
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

const SECTIONS = [
  ['datos_generales', 'Datos generales'],
  ['normatividad_objetivo', 'Normatividad y objetivo'],
  ['poblacion_potencial_objetivo', 'Población potencial y objetivo'],
  ['criterios_priorizacion', 'Criterios de priorización'],
  ['padron_beneficiarios', 'Padrón de beneficiarios'],
  ['apoyos_poblacion_atendida', 'Apoyos y población atendida'],
] as const;

const FORM_COLUMNS: Array<[string, string]> = [
  ['folio', 'Folio'],
  ['programa', 'Programa'],
  ['anio', 'Año'],
  ['estado', 'Estado'],
  ['titular_nombre', 'Titular de contraseña'],
  ['titular_correo', 'Correo del titular'],
  ['usuario_nombre', 'Capturista'],
  ['usuario_puesto', 'Puesto'],
  ['usuario_correo', 'Correo del capturista'],
  ['usuario_telefono', 'Teléfono'],
  ['usuario_entidad', 'Entidad / dependencia'],
  ['fecha_captura', 'Fecha de captura'],
  ['fecha_creacion', 'Fecha de creación'],
  ['fecha_finalizacion', 'Fecha de finalización'],
  ['archivos', 'Archivos'],
];

function pivotByQuestionnaire(
  rows: ReportTableRow[],
  formColumns: Array<[string, string]> = FORM_COLUMNS,
  excludeQuestion: (baseId: string) => boolean = () => false,
) {
  const forms = new Map<string, ReportTableRow>();
  const questions = new Map<string, { label: string; section: number; apoyo: number; id: string }>();

  for (const row of rows) {
    const formKey = String(row.formulario_id || row.folio);
    let form = forms.get(formKey);
    if (!form) {
      form = Object.fromEntries(formColumns.map(([key]) => [key, row[key] ?? '']));
      forms.set(formKey, form);
    }

    const questionId = String(row.pregunta_id ?? '');
    if (!questionId || excludeQuestion(questionId.replace(/__apoyo_\d+$/, ''))) continue;
    const columnKey = `p:${questionId}`;
    form[columnKey] = row.respuesta ?? '';

    if (!questions.has(columnKey)) {
      const sectionId = String(row.seccion_id ?? '');
      const sectionIndex = SECTIONS.findIndex(([id]) => id === sectionId);
      const sectionLabel = sectionIndex >= 0
        ? `Sección ${sectionIndex + 1} · ${SECTIONS[sectionIndex][1]}`
        : sectionId || 'Sin sección';
      const apoyoMatch = questionId.match(/^(.*)__apoyo_(\d+)$/);
      const apoyo = apoyoMatch ? Number(apoyoMatch[2]) + 1 : 0;
      questions.set(columnKey, {
        label: `[${sectionLabel}] ${String(row.pregunta ?? questionId)}${apoyo ? ` (Apoyo ${apoyo})` : ''}`,
        section: sectionIndex >= 0 ? sectionIndex : SECTIONS.length,
        apoyo,
        id: apoyoMatch ? apoyoMatch[1] : questionId,
      });
    }
  }

  const questionColumns = [...questions.entries()]
    .sort(([, a], [, b]) => a.section - b.section || a.apoyo - b.apoyo || a.id.localeCompare(b.id, 'es', { numeric: true }))
    .map(([key, question]) => ({ key, label: question.label }));

  const columns = [...formColumns.map(([key, label]) => ({ key, label })), ...questionColumns]
    .map((column) => ({ ...column, render: (row: ReportTableRow) => String(row[column.key] ?? '') }));

  return { rows: [...forms.values()], columns };
}

const QUESTION_TABLE_COLUMNS: Array<[string, string]> = [
  ['programa', 'Programa'],
  ['anio', 'Año'],
  ['estado', 'Estado'],
  ['titular_nombre', 'Titular de contraseña'],
  ['titular_correo', 'Correo del titular'],
  ['usuario_nombre', 'Capturista'],
  ['usuario_puesto', 'Puesto'],
  ['usuario_correo', 'Correo del capturista'],
  ['usuario_telefono', 'Teléfono'],
  ['usuario_entidad', 'Entidad'],
];

const isQuestion37 = (baseId: string) => baseId === '37' || baseId === '37.1';

function QuestionList({ rows, program, year, section, error }: { rows: ReportTableRow[]; program: string; year: string; section: string; error: string }) {
  const forms = [...new Set(rows.map((row) => String(row.formulario_id || row.folio)))].map((formKey) => {
    const formRows = rows.filter((row) => String(row.formulario_id || row.folio) === formKey);
    const questions = formRows
      .filter((row) => row.pregunta_id && !isQuestion37(String(row.pregunta_id).replace(/__apoyo_\d+$/, '')))
      .map((row) => {
        const questionId = String(row.pregunta_id);
        const apoyoMatch = questionId.match(/^(.*)__apoyo_(\d+)$/);
        const apoyo = apoyoMatch ? Number(apoyoMatch[2]) + 1 : 0;
        const section = sectionLabel(String(row.seccion_id ?? ''));
        return {
          sectionIndex: section.index,
          section: section.label,
          apoyo,
          id: apoyoMatch ? apoyoMatch[1] : questionId,
          pregunta: `${String(row.pregunta || questionId)}${apoyo ? ` (Apoyo ${apoyo})` : ''}`,
          respuesta: answerValues(row.respuesta).join(', '),
        };
      })
      .sort((a, b) => a.sectionIndex - b.sectionIndex || a.apoyo - b.apoyo || a.id.localeCompare(b.id, 'es', { numeric: true }))
      .filter((question) => !section || question.section === section);
    return { formKey, info: formRows[0], questions, sections: [...new Set(questions.map((item) => item.section))] };
  });
  const infoFields = QUESTION_TABLE_COLUMNS.filter(([key]) => key !== 'programa' && key !== 'anio');

  const exportList = () => exportarExcel(
    forms.flatMap((form) => form.questions.map((question) => ({
      ...Object.fromEntries(infoFields.map(([key, label]) => [label, form.info[key] ?? ''])),
      Sección: question.section,
      Pregunta: question.pregunta,
      Respuesta: question.respuesta,
    }))),
    `preguntas_${program}_${year}`,
    'Preguntas',
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50 p-4">
        <div>
          <h3 className="font-['Montserrat'] text-sm font-bold text-slate-900">Preguntas · {program} · {year}{section ? ` · ${section}` : ''}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{error || 'Respuestas del cuestionario por sección, excepto la pregunta 37 (ver Matriz 37).'}</p>
        </div>
        {forms.length > 0 ? (
          <button type="button" onClick={exportList} className="rounded-lg bg-imss-green px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
            Exportar Excel
          </button>
        ) : null}
      </div>
      {forms.map((form) => (
        <div key={form.formKey} className="space-y-5 border-b border-slate-100 p-5 last:border-b-0">
          <dl className="grid gap-2 rounded-xl bg-emerald-50/60 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {infoFields.map(([key, label]) => (
              <div key={key}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="break-words text-slate-900">{String(form.info[key] ?? '') || '—'}</dd>
              </div>
            ))}
          </dl>
          {form.sections.map((section) => (
            <div key={section} className="space-y-2">
              <h4 className="border-b-2 border-amber-200 pb-1 font-['Montserrat'] text-sm font-bold text-emerald-900">{section}</h4>
              <ol className="space-y-1.5">
                {form.questions.filter((question) => question.section === section).map((question) => (
                  <li key={question.pregunta} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-800">{question.pregunta}</p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-600">{question.respuesta || '—'}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function Matrix37List({ rows, program, year, error }: { rows: ReportTableRow[]; program: string; year: string; error: string }) {
  const groups = [...new Set(rows.map((row) => String(row.apoyo ?? '')))].map((apoyo) => ({
    apoyo,
    items: rows.filter((row) => String(row.apoyo ?? '') === apoyo),
  }));
  const exportList = () => exportarExcel(
    rows.map((row) => Object.fromEntries(QUESTION_37_COLUMNS.map((column) => [column.label, row[column.key] ?? '']))),
    `matriz_37_${program}_${year}`,
    'Matriz 37',
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50 p-4">
        <div>
          <h3 className="font-['Montserrat'] text-sm font-bold text-slate-900">Matriz 37 · {program} · {year} ({rows.length} registros)</h3>
          <p className="mt-0.5 text-xs text-slate-500">{error || 'Cuantificación de la población atendida por apoyo y área geográfica.'}</p>
        </div>
        {rows.length > 0 ? (
          <button type="button" onClick={exportList} className="rounded-lg bg-imss-green px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
            Exportar Excel
          </button>
        ) : null}
      </div>
      {groups.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">Este cuestionario no tiene respuestas en la pregunta 37.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {groups.map(({ apoyo, items }) => (
            <li key={apoyo} className="space-y-3 p-5">
              <h4 className="font-['Montserrat'] text-base font-bold text-emerald-900">Apoyo {apoyo}</h4>
              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                <div><dt className="inline font-semibold text-slate-600">Nivel geográfico (36): </dt><dd className="inline text-slate-900">{String(items[0].nivel ?? '') || '—'}</dd></div>
                <div><dt className="inline font-semibold text-slate-600">Forma de reporte (37): </dt><dd className="inline text-slate-900">{String(items[0].forma ?? '') || '—'}</dd></div>
              </dl>
              {(() => {
                const filled = items.filter((item) => item.entidad);
                if (filled.length === 0) return <p className="text-sm text-slate-500">Sin cifras capturadas.</p>;
                const municipal = String(items[0].nivel ?? '') === 'Municipal' || filled.some((item) => item.clave_municipio);
                const bySex = String(items[0].forma ?? '') === 'Desagregada por sexo';
                const columns: Array<[string, string]> = [
                  ['titular_nombre', 'Titular de contraseña'],
                  ['titular_correo', 'Correo del titular'],
                  ['usuario_nombre', 'Capturista'],
                  ['usuario_correo', 'Correo del capturista'],
                  ...(municipal ? [['llave', 'Llave'] as [string, string]] : []),
                  ['clave_entidad', 'Clave'],
                  ['entidad', 'Entidad'],
                  ...(municipal ? [['clave_municipio', 'Clave Municipio'], ['municipio', 'Municipio']] as Array<[string, string]> : []),
                  ['total', 'Total'],
                  ...(bySex ? [['hombres', 'Hombres'], ['mujeres', 'Mujeres']] as Array<[string, string]> : []),
                ];
                return (
                  <div className="overflow-x-auto rounded-xl border border-emerald-900/20">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#002F2A] text-xs text-white">
                        <tr>{columns.map(([key, label]) => <th key={key} className="px-3 py-2 font-semibold">{label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {filled.map((item, index) => (
                          <tr key={index} className="border-t border-slate-100 odd:bg-white even:bg-emerald-50/40">
                            {columns.map(([key]) => (
                              <td key={key} className={`px-3 py-2 ${['llave', 'clave_entidad', 'clave_municipio', 'total', 'hombres', 'mujeres'].includes(key) ? 'font-mono text-xs' : ''}`}>
                                {String(item[key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const FILE_COLUMNS = [
  ['programa', 'Programa'],
  ['anio', 'Año'],
  ['folio', 'Folio'],
  ['titular_nombre', 'Titular de contraseña'],
  ['titular_correo', 'Correo del titular'],
  ['usuario_nombre', 'Capturista'],
  ['usuario_correo', 'Correo del capturista'],
  ['nombre', 'Archivo'],
  ['extension', 'Tipo'],
  ['tamanio', 'Tamaño'],
  ['estado', 'Estado'],
  ['fecha_carga', 'Fecha de carga'],
  ['ruta', 'Enlace'],
  ['descarga', 'Descargar'],
].map(([key, label]) => ({
  key,
  label,
  render: (row: ReportTableRow) => {
    const value = String(row[key] ?? '');
    if (key === 'ruta') {
      return /^https:\/\//i.test(value)
        ? <a href={value} target="_blank" rel="noopener noreferrer" className="font-semibold text-imss-green underline">Abrir en Drive</a>
        : <span className="text-slate-400">Sin enlace</span>;
    }
    if (key === 'descarga') {
      return /^https:\/\//i.test(value)
        ? <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-imss-green underline"><Download className="h-3.5 w-3.5" />Descargar</a>
        : <span className="text-slate-400">No disponible</span>;
    }
    if (key === 'tamanio') {
      const bytes = Number(value);
      return bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '';
    }
    if (key === 'fecha_carga' && value) return new Date(value).toLocaleString('es-MX');
    return value;
  },
}));

function buildFileRows(rows: ReportTableRow[]) {
  const seenForms = new Set<string>();
  const files: ReportTableRow[] = [];
  for (const row of rows) {
    const formKey = String(row.formulario_id || row.folio);
    if (seenForms.has(formKey)) continue;
    seenForms.add(formKey);
    let list: Array<Record<string, unknown>> = [];
    try {
      list = JSON.parse(String(row.archivos || '[]'));
    } catch {
      list = [];
    }
    for (const file of Array.isArray(list) ? list : []) {
      const driveFileId = String(file.almacenamiento_id ?? file.driveFileId ?? '').trim();
      files.push({
        programa: String(row.programa ?? ''),
        anio: String(row.anio ?? ''),
        folio: String(row.folio ?? ''),
        titular_nombre: String(row.titular_nombre ?? ''),
        titular_correo: String(row.titular_correo ?? ''),
        usuario_nombre: String(row.usuario_nombre ?? ''),
        usuario_correo: String(row.usuario_correo ?? ''),
        nombre: String(file.nombre ?? ''),
        extension: String(file.extension ?? ''),
        tamanio: Number(file.tamanio ?? 0),
        estado: String(file.estado ?? ''),
        fecha_carga: String(file.fecha_carga ?? ''),
        ruta: String(file.ruta ?? ''),
        descarga: driveFileId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveFileId)}` : '',
      });
    }
  }
  return files;
}

type GeographicRow = { llave?: string; clave: string; entidad: string; claveMunicipio?: string; municipio?: string };

const QUESTION_37_COLUMNS = [
  ['apoyo', 'Apoyo'],
  ['nivel', 'Nivel geográfico (36)'],
  ['forma', 'Forma de reporte (37)'],
  ['titular_nombre', 'Titular de contraseña'],
  ['titular_correo', 'Correo del titular'],
  ['usuario_nombre', 'Capturista'],
  ['usuario_correo', 'Correo del capturista'],
  ['llave', 'Llave'],
  ['clave_entidad', 'Clave entidad'],
  ['entidad', 'Entidad'],
  ['clave_municipio', 'Clave municipio'],
  ['municipio', 'Municipio'],
  ['total', 'Total'],
  ['hombres', 'Hombres'],
  ['mujeres', 'Mujeres'],
].map(([key, label]) => ({ key, label, render: (row: ReportTableRow) => String(row[key] ?? '') }));

function buildQuestion37Rows(rows: ReportTableRow[], catalog: Map<string, GeographicRow>) {
  const apoyos = new Map<string, { programa: string; anio: string; apoyo: number; titular_nombre: string; titular_correo: string; usuario_nombre: string; usuario_correo: string; answers: Record<string, string> }>();
  for (const row of rows) {
    const match = String(row.pregunta_id ?? '').match(/^(24|36|37|37\.1)__apoyo_(\d+)$/);
    if (!match) continue;
    const key = `${row.formulario_id || row.folio}|${match[2]}`;
    const apoyo = apoyos.get(key) ?? {
      programa: String(row.programa ?? ''),
      anio: String(row.anio ?? ''),
      apoyo: Number(match[2]) + 1,
      titular_nombre: String(row.titular_nombre ?? ''),
      titular_correo: String(row.titular_correo ?? ''),
      usuario_nombre: String(row.usuario_nombre ?? ''),
      usuario_correo: String(row.usuario_correo ?? ''),
      answers: {},
    };
    apoyo.answers[match[1]] = String(row.respuesta ?? '');
    apoyos.set(key, apoyo);
  }

  return [...apoyos.values()]
    .filter((apoyo) => apoyo.answers['37'] || apoyo.answers['37.1'])
    .sort((a, b) => a.programa.localeCompare(b.programa) || a.anio.localeCompare(b.anio) || a.apoyo - b.apoyo)
    .flatMap((apoyo) => {
      const base = {
        programa: apoyo.programa,
        anio: apoyo.anio,
        titular_nombre: apoyo.titular_nombre,
        titular_correo: apoyo.titular_correo,
        usuario_nombre: apoyo.usuario_nombre,
        usuario_correo: apoyo.usuario_correo,
        apoyo: `${apoyo.apoyo}. ${apoyo.answers['24'] ?? ''}`.trim(),
        nivel: apoyo.answers['36'] ?? '',
        forma: apoyo.answers['37'] ?? '',
      };
      let cells: Record<string, { total?: string; hombres?: string; mujeres?: string }> = {};
      try {
        cells = JSON.parse(apoyo.answers['37.1'] || '{}').rows ?? {};
      } catch {
        cells = {};
      }
      const filled = Object.entries(cells)
        .filter(([, cell]) => [cell.total, cell.hombres, cell.mujeres].some((value) => value !== undefined && value !== ''));
      if (filled.length === 0) return [{ ...base } as ReportTableRow];
      return filled.map(([geoKey, cell]) => {
        const place = catalog.get(geoKey);
        return {
          ...base,
          llave: place?.llave ?? '',
          clave_entidad: place?.clave ?? '',
          entidad: place?.entidad ?? geoKey,
          clave_municipio: place?.claveMunicipio ?? '',
          municipio: place?.municipio ?? '',
          total: cell.total ?? '',
          hombres: cell.hombres ?? '',
          mujeres: cell.mujeres ?? '',
        } as ReportTableRow;
      });
    });
}

function sectionLabel(sectionId: string) {
  const index = SECTIONS.findIndex(([id]) => id === sectionId);
  return {
    index: index >= 0 ? index : SECTIONS.length,
    label: index >= 0 ? `Sección ${index + 1} · ${SECTIONS[index][1]}` : sectionId || 'Sin sección',
  };
}

function formatAnswerItem(item: unknown): string {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return String(item).trim();
  if (Array.isArray(item)) return item.map(formatAnswerItem).filter(Boolean).join(', ');
  const record = item as Record<string, unknown>;
  if ('unit' in record || 'quantity' in record) {
    return [record.quantity, record.unit].map((part) => String(part ?? '').trim()).filter(Boolean).join(' ');
  }
  return Object.entries(record)
    .map(([key, part]) => {
      const text = formatAnswerItem(part);
      return text ? `${key}: ${text}` : '';
    })
    .filter(Boolean)
    .join(' · ');
}

function answerValues(value: unknown): string[] {
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      // Campos de unidad/cantidad se guardan como { rows: [{ unit, quantity }] }.
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : [parsed];
      return items.map(formatAnswerItem).filter(Boolean);
    } catch {
      // Texto libre que empieza con corchete o llave.
    }
  }
  return [text];
}

function summarizeQuestionnaire(rows: ReportTableRow[]) {
  const questions = new Map<string, { label: string; section: number; sectionName: string; id: string; forms: Set<string>; answers: Map<string, number> }>();

  for (const row of rows) {
    const questionId = String(row.pregunta_id ?? '');
    if (!questionId) continue;
    const baseId = questionId.replace(/__apoyo_\d+$/, '');
    let question = questions.get(baseId);
    if (!question) {
      const section = sectionLabel(String(row.seccion_id ?? ''));
      question = {
        label: String(row.pregunta || baseId),
        section: section.index,
        sectionName: section.label,
        id: baseId,
        forms: new Set(),
        answers: new Map(),
      };
      questions.set(baseId, question);
    }
    const values = answerValues(row.respuesta);
    if (values.length > 0) question.forms.add(String(row.formulario_id || row.folio));
    for (const value of values) question.answers.set(value, (question.answers.get(value) ?? 0) + 1);
  }

  return [...questions.values()]
    .sort((a, b) => a.section - b.section || a.id.localeCompare(b.id, 'es', { numeric: true }))
    .map((question) => ({
      key: question.id,
      sectionName: question.sectionName,
      question: question.label,
      total: question.forms.size,
      answers: [...question.answers.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es')),
    }));
}

function QuestionnaireSummary({ rows, error, charts = false }: { rows: ReportTableRow[]; error: string; charts?: boolean }) {
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [questionKey, setQuestionKey] = useState('');

  const programOptions = [...new Set(rows.map((row) => String(row.programa ?? '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  const yearOptions = [...new Set(rows
    .filter((row) => !program || String(row.programa ?? '') === program)
    .map((row) => String(row.anio ?? '').trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  const filteredRows = rows.filter((row) =>
    (!program || String(row.programa ?? '') === program)
    && (!year || String(row.anio ?? '') === year));
  const formCount = new Set(filteredRows.map((row) => String(row.formulario_id || row.folio))).size;
  const questions = summarizeQuestionnaire(filteredRows);
  const sectionOptions = [...new Set(questions.map((item) => item.sectionName))];
  const sectionQuestions = questions.filter((item) => !section || item.sectionName === section);
  const selected = sectionQuestions.find((item) => item.key === questionKey);
  const visibleQuestions = selected ? [selected] : sectionQuestions;
  const visibleSections = [...new Set(visibleQuestions.map((item) => item.sectionName))];

  return (
    <section aria-label="Resumen del cuestionario" className="space-y-5">
      <div className="card border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-imss-green shadow-sm">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-['Montserrat'] text-lg font-bold text-slate-900">{charts ? 'Gráficos de preguntas' : 'Resumen'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escoge un Programa, el Año, la Sección y luego la Pregunta del cuestionario.
            </p>
          </div>
        </div>
      </div>
      {error ? <div role="alert" className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div> : null}
      <div className="flex flex-wrap gap-2">
        <BaseTabButton active={!selected} onClick={() => setQuestionKey('')}>Todas las Preguntas</BaseTabButton>
        <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-imss-green" onClick={() => { setProgram(''); setYear(''); setSection(''); setQuestionKey(''); }}>
          Restablecer a general
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-emerald-50 to-slate-50 p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-950">Diagrama de selección guiada</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-3 block text-sm font-bold text-imss-green">1 · Escoger Programa</span>
            <select aria-label="Escoger Programa" value={program} onChange={(event) => { setProgram(event.target.value); setYear(''); }} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
              <option value="">Todos los programas (general)</option>
              {programOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-3 block text-sm font-bold text-imss-green">2 · Escoger Año</span>
            <select aria-label="Escoger Año" value={year} onChange={(event) => setYear(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
              <option value="">Todos los años</option>
              {yearOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <span className="mt-2 block text-xs text-slate-500">{formCount} {formCount === 1 ? 'cuestionario' : 'cuestionarios'}</span>
          </label>
          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-3 block text-sm font-bold text-imss-green">3 · Escoger Sección</span>
            <select aria-label="Escoger Sección" value={section} onChange={(event) => { setSection(event.target.value); setQuestionKey(''); }} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
              <option value="">Todas las secciones</option>
              {sectionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <span className="mt-2 block text-xs text-slate-500">{sectionQuestions.length} preguntas</span>
          </label>
          <label className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-3 block text-sm font-bold text-imss-green">4 · Escoger Pregunta</span>
            <select aria-label="Escoger Pregunta" value={selected?.key ?? ''} onChange={(event) => setQuestionKey(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold">
              <option value="">Todas las preguntas</option>
              {sectionOptions.filter((name) => !section || name === section).map((name) => (
                <optgroup key={name} label={name}>
                  {sectionQuestions.filter((item) => item.sectionName === name).map((item) => <option key={item.key} value={item.key}>{item.question}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-600">{[program || 'Todos los programas', year || 'Todos los años', section || 'Todas las secciones'].join(' · ')}</p>
      {visibleQuestions.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No hay respuestas del cuestionario para mostrar.</div>
      ) : visibleSections.map((sectionName) => (
        <section key={sectionName} aria-label={sectionName} className="space-y-4">
          <h3 className="flex items-center gap-3 border-b-2 border-amber-200 pb-2 font-['Montserrat'] text-base font-bold text-emerald-900">
            {sectionName}
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              {visibleQuestions.filter((item) => item.sectionName === sectionName).length} preguntas
            </span>
          </h3>
          <div className={charts ? `grid grid-cols-1 gap-5 ${selected ? '' : 'md:grid-cols-2 xl:grid-cols-3'}` : selected ? 'space-y-5' : 'grid grid-cols-1 gap-5 xl:grid-cols-2'}>
          {visibleQuestions.filter((item) => item.sectionName === sectionName).map((question) => charts ? (
            <QuestionDistributionChart
              key={question.key}
              title={question.question}
              subtitle={`${question.total} ${question.total === 1 ? 'cuestionario' : 'cuestionarios'} con respuesta`}
              question={question}
              tone="emerald"
              compact
            />
          ) : (
            <article key={question.key} className="card min-w-0 p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <h4 className="min-w-0 font-['Montserrat'] text-base font-bold text-slate-900">{question.question}</h4>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-800">{question.total} {question.total === 1 ? 'cuestionario' : 'cuestionarios'}</span>
              </div>
              <div className="space-y-2">
                {question.answers.length === 0 ? <p className="text-sm text-slate-500">Sin respuesta.</p> : question.answers.map((answer) => (
                  <div key={answer.name} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="min-w-0 break-words text-slate-800">{answer.name}</span>
                    <span className="shrink-0 font-mono text-xs">
                      <strong className="text-slate-900">{answer.value}</strong>
                      <span className="ml-2 text-slate-500">({percent(answer.value, question.total).toFixed(1)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function percent(value: number, total: number): number {
  return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
}

