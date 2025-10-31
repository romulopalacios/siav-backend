import type { Evento, Estadisticas, DatosGrafico, Reporte } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getEstadisticas(): Promise<Estadisticas> {
    const response = await fetch(`${this.baseUrl}/api/estadisticas`);
    if (!response.ok) {
      throw new Error('Error al obtener estadísticas');
    }
    return response.json();
  }

  async getEventosRecientes(limit: number = 50): Promise<Evento[]> {
    const response = await fetch(`${this.baseUrl}/api/eventos?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Error al obtener eventos');
    }
    return response.json();
  }

  async getDatosGraficos(): Promise<DatosGrafico[]> {
    const response = await fetch(`${this.baseUrl}/api/graficos`);
    if (!response.ok) {
      throw new Error('Error al obtener datos de gráficos');
    }
    return response.json();
  }

  async getReportes(limit: number = 30): Promise<Reporte[]> {
    const response = await fetch(`${this.baseUrl}/reportes?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Error al obtener reportes');
    }
    return response.json();
  }

  async generarReporte(fecha?: string): Promise<Reporte> {
    const url = fecha
      ? `${this.baseUrl}/generar-reporte?fecha=${fecha}`
      : `${this.baseUrl}/generar-reporte`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Error al generar reporte');
    }
    return response.json();
  }

  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/`);
    if (!response.ok) {
      throw new Error('Error en health check');
    }
    return response.json();
  }
}

export const apiService = new ApiService(API_URL);
