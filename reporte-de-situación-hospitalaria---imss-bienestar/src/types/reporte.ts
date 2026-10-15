export interface ResumenData {
  totalRespuestas: number;
  totalEntidades: number;
  totalClues: number;
  preguntasConDatos: number;
  fechaCorte: string;
}

export interface CalificacionStats {
  total: number;
  buena: number;
  regular: number;
  mala: number;
  porcentajes: {
    buena: number;
    regular: number;
    mala: number;
  };
}

export interface CluesItem {
  clues: string;
  hospital: string;
  entidad: string;
  total: number;
  buena: number;
  regular: number;
  mala: number;
  porcentajeBuena: number;
  porcentajeRegular: number;
  porcentajeMala: number;
  respuestas: Record<string, string>;
}

export interface EntidadItem {
  entidad: string;
  total: number;
  buena: number;
  regular: number;
  mala: number;
  porcentajeBuena: number;
  porcentajeRegular: number;
  porcentajeMala: number;
}

export interface FormacionItem {
  formacion: string;
  total: number;
  buena: number;
  regular: number;
  mala: number;
  porcentajeBuena: number;
  porcentajeRegular: number;
  porcentajeMala: number;
}

export interface OpcionConteo {
  opcion: string;
  conteo: number;
  porcentaje: number;
}

export interface PreguntaItem {
  id: string;
  titulo: string;
  totalRespuestas: number;
  distribucion: OpcionConteo[];
}

export interface ReportePayload {
  metadata: {
    titulo: string;
    subtitulo: string;
    fechaGeneracion: string;
    archivoOrigen: string;
  };
  resumen: ResumenData;
  calificacionGeneral: CalificacionStats;
  entidadesList: string[];
  porEntidad: Record<string, EntidadItem>;
  cluesList: Array<{ clues: string; hospital: string; entidad: string }>;
  porClues: Record<string, CluesItem>;
  formacionYCalificacion: FormacionItem[];
  distribucionesDonas: {
    sexo: PreguntaItem;
    formacionPrincipal: PreguntaItem;
    posgrado: PreguntaItem;
    tiempoCoordinador: PreguntaItem;
    almacenInsumos: PreguntaItem;
    serviciosCerrados: PreguntaItem;
  };
  preguntasCerradas: PreguntaItem[];
  registrosResumen?: Array<{
    clues: string;
    hospital: string;
    entidad: string;
    respuestas: Record<string, string>;
  }>;
}
