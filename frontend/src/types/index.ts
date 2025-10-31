export interface Evento {
  id: number;
  dispositivo_id: string;
  velocidad: number;
  direccion: 'norte' | 'sur';
  es_infraccion: boolean;
  timestamp: string;
  ubicacion?: {
    lat: number;
    lng: number;
    nombre?: string;
  } | null;
  limite_velocidad?: number;
  recibido_en: string;
}

export interface Estadisticas {
  totalDetecciones: number;
  velocidadPromedio: number;
  totalInfracciones: number;
  porcentajeInfracciones: number;
  ultimaActualizacion: string;
}

export interface DatosGrafico {
  hora: string;
  detecciones: number;
  infracciones: number;
  velocidadPromedio: number;
}

export interface Reporte {
  id: number;
  fecha: string;
  total_detecciones: number;
  total_infracciones: number;
  porcentaje_infracciones: number;
  velocidad_promedio: number;
  velocidad_maxima: number;
  velocidad_minima: number;
  direcciones: {
    norte: number;
    sur: number;
  };
  generado_en: string;
}
