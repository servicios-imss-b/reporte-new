import type { ReportData } from './types';

export async function cargarReporte(): Promise<ReportData> {
  const response = await fetch(`${import.meta.env.BASE_URL}reporte-data.json?_=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`No se pudieron cargar los datos agregados (${response.status}).`);
  }

  return await response.json() as ReportData;
}
