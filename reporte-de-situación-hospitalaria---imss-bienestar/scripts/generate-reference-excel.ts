import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Target directory
const baseDir = path.resolve('base');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// 9 Real IMSS Bienestar entities
const ENTIDADES = [
  'Baja California Sur',
  'Colima',
  'Chiapas',
  'Michoacán',
  'Nayarit',
  'Sinaloa',
  'Sonora',
  'Tlaxcala',
  'Veracruz'
];

const FORMACIONES = [
  'Medicina General',
  'Medicina Especialista',
  'Enfermería',
  'Administración Hospitalaria',
  'Odontología',
  'Trabajo Social'
];

const CALIFICACIONES: Array<'Buena' | 'Regular' | 'Mala'> = ['Buena', 'Regular', 'Mala'];

const SEXOS = ['Mujer', 'Hombre', 'Prefiero no decir'];
const POSGRADOS = ['Especialidad médica', 'Maestría', 'Doctorado', 'Diplomado en Salud Pública', 'Sin posgrado'];
const TIEMPOS = ['Menos de 6 meses', '6 a 12 meses', '1 a 2 años', 'Más de 2 años'];
const ALMACEN = ['Abasto suficiente (>85%)', 'Abasto intermedio (60-84%)', 'Desabasto crítico (<60%)'];
const SERVICIOS = [
  'Todos operando normalmente',
  '1 o 2 servicios con cierre parcial',
  '3 o más servicios afectados',
  'Urgencias con saturación intermitente'
];

const PREGUNTAS_EXTRAS = [
  {
    key: 'Infraestructura física general',
    options: ['Óptimas condiciones', 'Mantenimiento preventivo requerido', 'Deterioro visible / Requiere obra']
  },
  {
    key: 'Disponibilidad de equipo biomédico',
    options: ['Completo y operativo', 'Parcialmente disponible', 'Falta equipo clave de diagnóstico']
  },
  {
    key: 'Personal de enfermería en turnos',
    options: ['Suficiente en todos los turnos', 'Déficit en turno nocturno y fin de semana', 'Déficit crítico permanente']
  },
  {
    key: 'Médicos especialistas asignados',
    options: ['Plantilla completa según tipología', 'Cobertura parcial de especialidades troncales', 'Sin especialistas asignados']
  },
  {
    key: 'Sistema de referencia y traslados',
    options: ['Ambulancias y sistema coordinado', 'Demoras habituales en traslados', 'Severas limitaciones de transporte y referencia']
  },
  {
    key: 'Mantenimiento de instalaciones hidrosanitarias',
    options: ['Servicio continuo y adecuado', 'Fallas periódicas atendidas', 'Problemas críticos de agua o drenaje']
  }
];

// Hospital names prefixes
const HOSP_TYPES = [
  'Hospital General de Subzona No.',
  'Hospital Comunitario',
  'Hospital General de Zona con MF No.',
  'Hospital Rural IMSS-Bienestar',
  'Hospital Básico Comunitario',
  'Hospital General de Especialidades'
];

// We need exactly:
// 129 CLUES
// 131 valid responses (so 127 CLUES have 1 response, 2 CLUES have 2 responses -> 127 + 4 = 131)
// 9 entities
const cluesList: Array<{ clues: string; hospital: string; entidad: string }> = [];

let clueIndex = 1;
for (let i = 0; i < 129; i++) {
  const entidad = ENTIDADES[i % ENTIDADES.length];
  const stateCode = entidad.substring(0, 3).toUpperCase();
  const clues = `${stateCode}IB${String(clueIndex).padStart(6, '0')}`;
  const hospType = HOSP_TYPES[i % HOSP_TYPES.length];
  const hospName = `${hospType} ${((i % 45) + 1)} de ${entidad}`;
  cluesList.push({ clues, hospital: hospName, entidad });
  clueIndex++;
}

// Generate the 131 responses
const responses: any[] = [];

// Seeded pseudorandom for reproducible, high quality realistic distribution
let seed = 42;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

// Assign responses to CLUES
// Exact 131 counts for '¿Cuál es su formación principal?' matching official survey:
// Trabajo Social: 32 (24.4%)
// Administración Hospitalaria: 23 (17.6%)
// Medicina General: 22 (16.8%)
// Odontología: 19 (14.5%)
// Medicina Especialista: 18 (13.7%)
// Enfermería: 17 (13.0%)
const EXACT_FORMACIONES_POOL: string[] = [
  ...Array(32).fill('Trabajo Social'),
  ...Array(23).fill('Administración Hospitalaria'),
  ...Array(22).fill('Medicina General'),
  ...Array(19).fill('Odontología'),
  ...Array(18).fill('Medicina Especialista'),
  ...Array(17).fill('Enfermería'),
];

// Shuffle with seeded random
for (let i = EXACT_FORMACIONES_POOL.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [EXACT_FORMACIONES_POOL[i], EXACT_FORMACIONES_POOL[j]] = [EXACT_FORMACIONES_POOL[j], EXACT_FORMACIONES_POOL[i]];
}

// The first 127 CLUES get 1 response
for (let i = 0; i < 127; i++) {
  const c = cluesList[i];
  responses.push(createResponse(c, i, EXACT_FORMACIONES_POOL[i]));
}
// The next 2 CLUES get 2 responses each (127 + 2*2 = 131)
for (let i = 127; i < 129; i++) {
  const c = cluesList[i];
  const respIdx1 = 127 + (i - 127) * 2;
  const respIdx2 = 127 + (i - 127) * 2 + 1;
  responses.push(createResponse(c, i * 10 + 1, EXACT_FORMACIONES_POOL[respIdx1]));
  responses.push(createResponse(c, i * 10 + 2, EXACT_FORMACIONES_POOL[respIdx2]));
}

function createResponse(c: { clues: string; hospital: string; entidad: string }, idx: number, formacionExacta: string) {
  // Give realistic distribution for ratings: roughly 42% Buena, 38% Regular, 20% Mala
  const r = random();
  let calif: 'Buena' | 'Regular' | 'Mala';
  if (r < 0.42) calif = 'Buena';
  else if (r < 0.80) calif = 'Regular';
  else calif = 'Mala';

  const row: Record<string, any> = {
    'Marca temporal': new Date(2026, 8, 1 + (idx % 28), 9 + (idx % 8), idx % 50).toISOString(),
    'CLUES': c.clues,
    'Hospital': c.hospital,
    'Entidad': c.entidad,
    '¿Cuál es su formación principal?': formacionExacta,
    'En general, ¿cómo calificaría la situación actual de los hospitales de su región?': calif,
    'Sexo': pick(SEXOS),
    'Estudios de posgrado': pick(POSGRADOS),
    'Tiempo como coordinador(a)': pick(TIEMPOS),
    'Almacén de medicamentos e insumos': pick(ALMACEN),
    'Servicios cerrados o con funcionamiento parcial': pick(SERVICIOS)
  };

  for (const extra of PREGUNTAS_EXTRAS) {
    row[extra.key] = pick(extra.options);
  }

  // Add sensitive/free text fields that should be EXCLUDED from public JSON
  row['Comentarios libres sobre la gestión'] = 'Texto libre de opinión del participante (no publicable por confidencialidad)';
  row['Folio confidencial del participante'] = `PART-${1000 + idx}`;
  row['¿Es registro de prueba?'] = 'No';

  return row;
}

// Add 4 test / invalid rows to ensure pipeline filters them out
const testRows = [
  {
    'Marca temporal': '2026-08-01T08:00:00Z',
    'CLUES': 'TEST000000000',
    'Hospital': 'Hospital de Prueba',
    'Entidad': 'Prueba',
    '¿Cuál es su formación principal?': 'Medicina General',
    'En general, ¿cómo calificaría la situación actual de los hospitales de su región?': 'Buena',
    '¿Es registro de prueba?': 'Sí',
    'Comentarios libres sobre la gestión': 'Fila de prueba técnica'
  },
  {
    'Marca temporal': '2026-08-02T08:00:00Z',
    'CLUES': '', // empty CLUES
    'Hospital': 'Hospital Sin Clues',
    'Entidad': 'Chiapas',
    '¿Cuál es su formación principal?': 'Enfermería',
    'En general, ¿cómo calificaría la situación actual de los hospitales de su región?': 'Regular',
    '¿Es registro de prueba?': 'No'
  },
  {
    'Marca temporal': '2026-08-03T08:00:00Z',
    'CLUES': 'PRUEBA_SISTEMA',
    'Hospital': 'PRUEBA QA',
    'Entidad': 'Veracruz',
    '¿Cuál es su formación principal?': 'Odontología',
    'En general, ¿cómo calificaría la situación actual de los hospitales de su región?': 'Mala',
    '¿Es registro de prueba?': 'Sí'
  },
  {
    'Marca temporal': '2026-08-04T08:00:00Z',
    'CLUES': 'CHSSA999999',
    'Hospital': '', // empty hospital name
    'Entidad': 'Chiapas',
    '¿Cuál es su formación principal?': 'Medicina Especialista',
    'En general, ¿cómo calificaría la situación actual de los hospitales de su región?': 'Buena',
    '¿Es registro de prueba?': 'No'
  }
];

const allRows = [...responses, ...testRows];

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(allRows);
XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');

const targetFilePath = path.join(baseDir, 'resultados_encuesta_imss_bienestar (1).xlsx');
XLSX.writeFile(wb, targetFilePath);

console.log(`Excel file created at: ${targetFilePath}`);
console.log(`Total rows written: ${allRows.length} (${responses.length} valid, ${testRows.length} test/invalid)`);
console.log(`Valid Entities: ${new Set(responses.map(r => r.Entidad)).size}`);
console.log(`Valid CLUES: ${new Set(responses.map(r => r.CLUES)).size}`);
