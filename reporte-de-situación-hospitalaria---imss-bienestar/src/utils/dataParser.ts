import * as XLSX_MODULE from 'xlsx';
import type { ReportePayload, CluesItem, EntidadItem, FormacionItem, PreguntaItem, OpcionConteo } from '../types/reporte';

const XLSX = (XLSX_MODULE as any).default || XLSX_MODULE;

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isTestRow(row: Record<string, any>): boolean {
  for (const [key, rawVal] of Object.entries(row)) {
    const val = String(rawVal || '').trim().toLowerCase();
    const k = normalizeKey(key);

    if (k.includes('prueba') || k.includes('test')) {
      if (val === 'si' || val === 'sí' || val === 'true' || val === '1' || val.includes('prueba') || val.includes('test')) {
        return true;
      }
    }

    if ((k === 'clues' || k === 'hospital' || k === 'entidad') && (val.includes('prueba') || val.includes('test'))) {
      return true;
    }
  }

  const clues = String(row['CLUES'] || row['clues'] || '').trim();
  const hospital = String(row['Hospital'] || row['hospital'] || '').trim();
  const entidad = String(row['Entidad'] || row['entidad'] || '').trim();

  if (!clues || !hospital || !entidad) return true;
  if (clues.length < 3 || hospital.length < 3 || entidad.length < 3) return true;

  return false;
}

export function parseExcelArrayBuffer(buffer: ArrayBuffer, fileName: string): ReportePayload {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find((s: string) => s.trim().toLowerCase() === 'respuestas') || wb.SheetNames[0];

  if (!sheetName) {
    throw new Error('No se encontró ninguna hoja en el archivo Excel.');
  }

  const ws = wb.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const validRows = rawRows.filter(row => !isTestRow(row));
  if (validRows.length === 0) {
    throw new Error('No se encontraron filas con CLUES, Hospital y Entidad válidos en la hoja "Respuestas".');
  }

  const firstRow = validRows[0] || {};
  const colKeys = Object.keys(firstRow);

  const cluesKey = colKeys.find(k => normalizeKey(k) === 'clues') || 'CLUES';
  const hospitalKey = colKeys.find(k => normalizeKey(k) === 'hospital') || 'Hospital';
  const entidadKey = colKeys.find(k => normalizeKey(k) === 'entidad') || 'Entidad';

  const formacionKey = colKeys.find(k => normalizeKey(k).includes('formacion') && normalizeKey(k).includes('principal')) ||
    colKeys.find(k => normalizeKey(k).includes('formacion')) || '¿Cuál es su formación principal?';

  const calificacionKey = colKeys.find(k => normalizeKey(k).includes('calificaria') && normalizeKey(k).includes('situacion')) ||
    colKeys.find(k => normalizeKey(k).includes('situacion actual') || normalizeKey(k).includes('calificacion general')) ||
    'En general, ¿cómo calificaría la situación actual de los hospitales de su región?';

  const sexoKey = colKeys.find(k => normalizeKey(k) === 'sexo' || normalizeKey(k).includes('genero')) || 'Sexo';
  const posgradoKey = colKeys.find(k => normalizeKey(k).includes('posgrado')) || 'Estudios de posgrado';
  const tiempoCoordKey = colKeys.find(k => normalizeKey(k).includes('tiempo') && (normalizeKey(k).includes('coordinador') || normalizeKey(k).includes('cargo'))) || 'Tiempo como coordinador(a)';
  const almacenKey = colKeys.find(k => normalizeKey(k).includes('almacen') || normalizeKey(k).includes('medicamento')) || 'Almacén de medicamentos e insumos';
  const serviciosCerradosKey = colKeys.find(k => normalizeKey(k).includes('servicios') && (normalizeKey(k).includes('cerrados') || normalizeKey(k).includes('parcial'))) || 'Servicios cerrados o con funcionamiento parcial';

  const isExcludedQuestion = (k: string) => {
    const norm = normalizeKey(k);
    return (
      norm.includes('marca temporal') ||
      norm.includes('timestamp') ||
      norm.includes('correo') ||
      norm.includes('email') ||
      norm.includes('nombre') ||
      norm.includes('folio') ||
      norm.includes('telefono') ||
      norm.includes('comentario') ||
      norm.includes('opinion') ||
      norm.includes('prueba') ||
      norm.includes('test') ||
      norm.includes('id') ||
      norm === 'clues' ||
      norm === 'hospital' ||
      norm === 'entidad'
    );
  };

  const entidadesSet = new Set<string>();
  const cluesMap = new Map<string, { clues: string; hospital: string; entidad: string; rows: any[] }>();

  for (const row of validRows) {
    const clues = String(row[cluesKey] || '').trim();
    const hospital = String(row[hospitalKey] || '').trim();
    const entidad = String(row[entidadKey] || '').trim();

    entidadesSet.add(entidad);

    if (!cluesMap.has(clues)) {
      cluesMap.set(clues, { clues, hospital, entidad, rows: [] });
    }
    cluesMap.get(clues)!.rows.push(row);
  }

  const entidadesList = Array.from(entidadesSet).sort((a, b) => a.localeCompare(b, 'es'));

  function parseCalif(raw: any): 'Buena' | 'Regular' | 'Mala' {
    const s = String(raw || '').trim().toLowerCase();
    if (s.includes('buen') || s.includes('excelent')) return 'Buena';
    if (s.includes('mal') || s.includes('pesim') || s.includes('deficient')) return 'Mala';
    return 'Regular';
  }

  let totalBuena = 0;
  let totalRegular = 0;
  let totalMala = 0;

  for (const row of validRows) {
    const c = parseCalif(row[calificacionKey]);
    if (c === 'Buena') totalBuena++;
    else if (c === 'Regular') totalRegular++;
    else totalMala++;
  }

  const totalGeneral = validRows.length;

  const porEntidad: Record<string, EntidadItem> = {};
  for (const ent of entidadesList) {
    const entRows = validRows.filter(r => String(r[entidadKey]).trim() === ent);
    let b = 0, reg = 0, m = 0;
    for (const r of entRows) {
      const c = parseCalif(r[calificacionKey]);
      if (c === 'Buena') b++;
      else if (c === 'Regular') reg++;
      else m++;
    }
    const tot = entRows.length;
    porEntidad[ent] = {
      entidad: ent,
      total: tot,
      buena: b,
      regular: reg,
      mala: m,
      porcentajeBuena: tot > 0 ? Number(((b / tot) * 100).toFixed(1)) : 0,
      porcentajeRegular: tot > 0 ? Number(((reg / tot) * 100).toFixed(1)) : 0,
      porcentajeMala: tot > 0 ? Number(((m / tot) * 100).toFixed(1)) : 0,
    };
  }

  const porClues: Record<string, CluesItem> = {};
  const cluesList: Array<{ clues: string; hospital: string; entidad: string }> = [];

  for (const [clues, info] of cluesMap.entries()) {
    cluesList.push({ clues: info.clues, hospital: info.hospital, entidad: info.entidad });

    let b = 0, reg = 0, m = 0;
    const respSummary: Record<string, string> = {};

    for (const r of info.rows) {
      const c = parseCalif(r[calificacionKey]);
      if (c === 'Buena') b++;
      else if (c === 'Regular') reg++;
      else m++;

      for (const k of colKeys) {
        if (!isExcludedQuestion(k) && !respSummary[k] && r[k]) {
          respSummary[k] = String(r[k]).trim();
        }
      }
    }

    const tot = info.rows.length;
    porClues[clues] = {
      clues: info.clues,
      hospital: info.hospital,
      entidad: info.entidad,
      total: tot,
      buena: b,
      regular: reg,
      mala: m,
      porcentajeBuena: tot > 0 ? Number(((b / tot) * 100).toFixed(1)) : 0,
      porcentajeRegular: tot > 0 ? Number(((reg / tot) * 100).toFixed(1)) : 0,
      porcentajeMala: tot > 0 ? Number(((m / tot) * 100).toFixed(1)) : 0,
      respuestas: respSummary
    };
  }

  cluesList.sort((a, b) => a.hospital.localeCompare(b.hospital, 'es'));

  const formacionMap = new Map<string, { buena: number; regular: number; mala: number; total: number }>();
  for (const r of validRows) {
    const f = String(r[formacionKey] || 'Sin especificar').trim();
    if (!formacionMap.has(f)) {
      formacionMap.set(f, { buena: 0, regular: 0, mala: 0, total: 0 });
    }
    const entry = formacionMap.get(f)!;
    entry.total++;
    const c = parseCalif(r[calificacionKey]);
    if (c === 'Buena') entry.buena++;
    else if (c === 'Regular') entry.regular++;
    else entry.mala++;
  }

  const formacionYCalificacion: FormacionItem[] = Array.from(formacionMap.entries())
    .map(([formacion, stats]) => ({
      formacion,
      total: stats.total,
      buena: stats.buena,
      regular: stats.regular,
      mala: stats.mala,
      porcentajeBuena: stats.total > 0 ? Number(((stats.buena / stats.total) * 100).toFixed(1)) : 0,
      porcentajeRegular: stats.total > 0 ? Number(((stats.regular / stats.total) * 100).toFixed(1)) : 0,
      porcentajeMala: stats.total > 0 ? Number(((stats.mala / stats.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  function buildDist(questionKey: string, title: string, id: string): PreguntaItem {
    const counts = new Map<string, number>();
    let validCount = 0;
    for (const r of validRows) {
      const val = String(r[questionKey] || '').trim();
      if (val) {
        validCount++;
        counts.set(val, (counts.get(val) || 0) + 1);
      }
    }
    const distribucion: OpcionConteo[] = Array.from(counts.entries())
      .map(([opcion, conteo]) => ({
        opcion,
        conteo,
        porcentaje: validCount > 0 ? Number(((conteo / validCount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.conteo - a.conteo);

    return { id, titulo: title, totalRespuestas: validCount, distribucion };
  }

  const distribucionesDonas = {
    sexo: buildDist(sexoKey, 'Sexo', 'sexo'),
    formacionPrincipal: buildDist(formacionKey, 'Formación principal', 'formacionPrincipal'),
    posgrado: buildDist(posgradoKey, 'Estudios de posgrado', 'posgrado'),
    tiempoCoordinador: buildDist(tiempoCoordKey, 'Tiempo como coordinador(a)', 'tiempoCoordinador'),
    almacenInsumos: buildDist(almacenKey, 'Almacén de medicamentos e insumos', 'almacenInsumos'),
    serviciosCerrados: buildDist(serviciosCerradosKey, 'Servicios cerrados o con funcionamiento parcial', 'serviciosCerrados')
  };

  const closedCandidates = colKeys.filter(k => !isExcludedQuestion(k));
  const preguntasCerradas: PreguntaItem[] = [];

  for (const k of closedCandidates) {
    const id = normalizeKey(k).replace(/[^a-z0-9]/g, '_').slice(0, 32);
    const distinctVals = new Set(validRows.map(r => String(r[k] || '').trim()).filter(Boolean));
    if (distinctVals.size >= 2 && distinctVals.size <= 15) {
      preguntasCerradas.push(buildDist(k, k, id));
    }
  }

  const registrosResumen = validRows.map(r => {
    const resp: Record<string, string> = {};
    for (const k of colKeys) {
      if (!isExcludedQuestion(k) && r[k]) {
        resp[k] = String(r[k]).trim();
      }
    }
    return {
      clues: String(r[cluesKey] || '').trim(),
      hospital: String(r[hospitalKey] || '').trim(),
      entidad: String(r[entidadKey] || '').trim(),
      respuestas: resp
    };
  });

  return {
    metadata: {
      titulo: 'Reporte de situación hospitalaria',
      subtitulo: 'Encuesta hospitalaria IMSS Bienestar',
      fechaGeneracion: new Date().toISOString(),
      archivoOrigen: fileName
    },
    resumen: {
      totalRespuestas: validRows.length,
      totalEntidades: entidadesList.length,
      totalClues: cluesList.length,
      preguntasConDatos: preguntasCerradas.length,
      fechaCorte: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    },
    calificacionGeneral: {
      total: totalGeneral,
      buena: totalBuena,
      regular: totalRegular,
      mala: totalMala,
      porcentajes: {
        buena: totalGeneral > 0 ? Number(((totalBuena / totalGeneral) * 100).toFixed(1)) : 0,
        regular: totalGeneral > 0 ? Number(((totalRegular / totalGeneral) * 100).toFixed(1)) : 0,
        mala: totalGeneral > 0 ? Number(((totalMala / totalGeneral) * 100).toFixed(1)) : 0,
      }
    },
    entidadesList,
    porEntidad,
    cluesList,
    porClues,
    formacionYCalificacion,
    distribucionesDonas,
    preguntasCerradas,
    registrosResumen
  };
}
