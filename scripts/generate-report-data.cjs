const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const workbookPath = path.resolve(
  process.argv[2] ?? path.join('base', 'resultados_encuesta_imss_bienestar (1).xlsx'),
);
const outputPath = path.resolve('public', 'reporte-data.json');
const ratings = ['Buena', 'Mala', 'Regular'];
const emptyRatingCounts = () => ({ Buena: 0, Mala: 0, Regular: 0 });

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-MX');
}

function findColumn(columns, predicate, description) {
  const column = columns.find(predicate);
  if (!column) throw new Error(`No se encontró la columna requerida: ${description}.`);
  return column;
}

function answerParts(value) {
  if (Array.isArray(value)) return value.flatMap(answerParts);
  if (typeof value !== 'string') return value === null || value === undefined ? [] : [String(value).trim()];
  return value.split(/[;\n]+/).map((part) => part.trim()).filter(Boolean);
}

if (!fs.existsSync(workbookPath)) {
  throw new Error(`No se encontró el archivo de la encuesta: ${workbookPath}`);
}

const workbook = XLSX.readFile(workbookPath, { cellDates: false });
const sheetName = workbook.SheetNames.find((name) => normalize(name) === 'respuestas')
  ?? workbook.SheetNames[0];
if (!sheetName) throw new Error('El archivo no contiene hojas de respuestas.');

const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: true });
if (!rows.length) throw new Error(`La hoja "${sheetName}" no contiene respuestas.`);

const columns = Object.keys(rows[0]);
const entityColumn = findColumn(columns, (column) => normalize(column) === 'entidad', 'Entidad');
const cluesColumn = findColumn(columns, (column) => normalize(column) === 'clues', 'CLUES');
const hospitalColumn = findColumn(columns, (column) => normalize(column) === 'hospital', 'Hospital');
const formationColumn = findColumn(columns, (column) => normalize(column).includes('formacion principal'), 'formación principal');
const ratingColumn = findColumn(
  columns,
  (column) => normalize(column).startsWith('en general') && normalize(column).includes('situacion actual'),
  'calificación actual de los hospitales',
);
const testColumn = columns.find((column) => normalize(column) === 'prueba');

const responses = rows.filter((row) => {
  const isTest = testColumn && ['si', 'sí', 'true', '1'].includes(normalize(row[testColumn]));
  return !isTest && [row[entityColumn], row[cluesColumn], row[hospitalColumn]].every(
    (value) => value !== null && value !== undefined && String(value).trim() !== '',
  );
});

if (!responses.length) throw new Error('No se encontraron respuestas con Entidad, CLUES y Hospital.');

function parseRating(value) {
  const normalized = normalize(value);
  return ratings.find((rating) => normalize(rating) === normalized);
}

const entities = [...new Set(responses.map((row) => String(row[entityColumn]).trim()))]
  .sort((a, b) => a.localeCompare(b, 'es'));
const ratingDistribution = emptyRatingCounts();
const formationGroups = new Map();
const entityGroups = new Map();
const cluesGroups = new Map();

for (const row of responses) {
  const rating = parseRating(row[ratingColumn]);
  const entity = String(row[entityColumn]).trim();
  const clues = String(row[cluesColumn]).trim();
  const hospital = String(row[hospitalColumn]).trim();

  if (!entityGroups.has(entity)) {
    entityGroups.set(entity, {
      entity,
      total: 0,
      ratings: emptyRatingCounts(),
      responses: [],
      formationGroups: new Map(),
    });
  }
  const entityGroup = entityGroups.get(entity);
  entityGroup.total += 1;
  entityGroup.responses.push(row);

  if (!cluesGroups.has(clues)) {
    cluesGroups.set(clues, {
      clues,
      hospital,
      entity,
      responses: [],
      ratingDistribution: emptyRatingCounts(),
      formationGroups: new Map(),
    });
  }
  const cluesGroup = cluesGroups.get(clues);
  cluesGroup.responses.push(row);

  if (rating) {
    ratingDistribution[rating] += 1;
    entityGroup.ratings[rating] += 1;
    cluesGroup.ratingDistribution[rating] += 1;

    const formation = String(row[formationColumn] ?? '').trim();
    if (formation) {
      if (!formationGroups.has(formation)) {
        formationGroups.set(formation, { formation, total: 0, ...emptyRatingCounts() });
      }
      const formationGroup = formationGroups.get(formation);
      formationGroup.total += 1;
      formationGroup[rating] += 1;

      if (!entityGroup.formationGroups.has(formation)) {
        entityGroup.formationGroups.set(formation, { formation, total: 0, ...emptyRatingCounts() });
      }
      const entityFormationGroup = entityGroup.formationGroups.get(formation);
      entityFormationGroup.total += 1;
      entityFormationGroup[rating] += 1;

      if (!cluesGroup.formationGroups.has(formation)) {
        cluesGroup.formationGroups.set(formation, { formation, total: 0, ...emptyRatingCounts() });
      }
      const cluesFormationGroup = cluesGroup.formationGroups.get(formation);
      cluesFormationGroup.total += 1;
      cluesFormationGroup[rating] += 1;
    }
  }
}

const metadataColumns = new Set(['id', 'perfil', 'entidad', 'hospital', 'clues', 'region', 'fecha', 'prueba']);
const excludedQuestion = /anos cumplidos|describa|en una frase|especifique|especialidades|una sola accion|texto libre|observaciones|necesidad o problema|otro(?:\s|\(|:|$)/i;

const questionColumns = columns
  .filter((column) => !metadataColumns.has(normalize(column)))
  .filter((column) => !excludedQuestion.test(normalize(column)));

function summarizeQuestions(sourceResponses, includeSingleOption = false) {
  return questionColumns
    .map((column) => {
      const counts = new Map();
      let total = 0;
      const isPartialClosureQuestion = normalize(column).includes('hay algun servicio');
      for (const row of sourceResponses) {
        if (isPartialClosureQuestion) {
          const value = String(row[column] ?? '').trim();
          if (!value) continue;
          total += 1;
          const hasAffectedArea = value.split(';').some((area) => {
            const normalizedArea = normalize(area);
            return normalizedArea.includes(':') && !normalizedArea.includes('opera con normalidad');
          });
          const answer = hasAffectedArea
            ? 'Al menos un área está cerrada o funciona parcialmente'
            : 'Sin áreas cerradas ni funcionamiento parcial';
          counts.set(answer, (counts.get(answer) ?? 0) + 1);
          continue;
        }

        const parts = answerParts(row[column]);
        if (!parts.length || parts.some((part) => part.length > 100)) continue;
        total += 1;
        for (const part of parts) counts.set(part, (counts.get(part) ?? 0) + 1);
      }
      if ((!includeSingleOption && counts.size < 2) || counts.size > 24) return null;
      return {
        question: column,
        total,
        answers: [...counts.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es')),
      };
    })
    .filter(Boolean);
}

const questions = summarizeQuestions(responses);

const formationRatings = [...formationGroups.values()]
  .sort((a, b) => b.total - a.total || a.formation.localeCompare(b.formation, 'es'));
const entityRatings = [...entityGroups.values()]
  .map(({ responses: entityResponses, formationGroups: entityFormationGroups, ...group }) => ({
    ...group,
    formationRatings: [...entityFormationGroups.values()]
      .sort((a, b) => b.total - a.total || a.formation.localeCompare(b.formation, 'es')),
    questions: summarizeQuestions(entityResponses, true),
  }))
  .sort((a, b) => a.entity.localeCompare(b.entity, 'es'));
const cluesReports = [...cluesGroups.values()]
  .map(({ responses: cluesResponses, formationGroups: cluesFormationGroups, ...group }) => ({
    ...group,
    total: cluesResponses.length,
    formationRatings: [...cluesFormationGroups.values()]
      .sort((a, b) => b.total - a.total || a.formation.localeCompare(b.formation, 'es')),
    questions: summarizeQuestions(cluesResponses, true),
  }))
  .sort((a, b) => a.entity.localeCompare(b.entity, 'es') || a.hospital.localeCompare(b.hospital, 'es'));
const report = {
  generatedAt: new Date().toISOString(),
  totalResponses: responses.length,
  entities,
  ratingDistribution,
  formationRatings,
  entityRatings,
  cluesReports,
  questions,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Datos agregados generados: ${path.relative(process.cwd(), outputPath)}`);
console.log(`${report.totalResponses} respuestas, ${report.entities.length} entidades, ${report.cluesReports.length} CLUES y ${report.questions.length} preguntas cerradas.`);
