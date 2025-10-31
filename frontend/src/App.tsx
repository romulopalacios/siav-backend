import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Gauge,
  Clock,
} from 'lucide-react';
import Header from './components/Header';
import StatCard from './components/StatCard';
import LineChart from './components/LineChart';
import PieChart from './components/PieChart';
import EventsTable from './components/EventsTable';
import MapView from './components/MapView';
import { apiService } from './services/api';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import type { Estadisticas, Evento, DatosGrafico } from './types';

function App() {
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    totalDetecciones: 0,
    velocidadPromedio: 0,
    totalInfracciones: 0,
    porcentajeInfracciones: 0,
    ultimaActualizacion: new Date().toISOString(),
  });

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [datosGraficos, setDatosGraficos] = useState<DatosGrafico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsData, eventosData, graficosData] = await Promise.all([
        apiService.getEstadisticas(),
        apiService.getEventosRecientes(50),
        apiService.getDatosGraficos(),
      ]);

      setEstadisticas(statsData);
      setEventos(eventosData);
      setDatosGraficos(graficosData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar los datos. Reintentando...');
      setIsLoading(false);
    }
  }, []);

  const { isRefreshing } = useAutoRefresh(fetchData, 5000, true);

  const handleManualRefresh = () => {
    fetchData();
  };

  const pieData = [
    {
      name: 'Normal',
      value: estadisticas.totalDetecciones - estadisticas.totalInfracciones,
      color: '#10b981',
    },
    {
      name: 'Infracciones',
      value: estadisticas.totalInfracciones,
      color: '#ef4444',
    },
  ];

  const direccionesData = eventos.reduce(
    (acc, evento) => {
      if (evento.direccion === 'norte') acc.norte++;
      if (evento.direccion === 'sur') acc.sur++;
      return acc;
    },
    { norte: 0, sur: 0 }
  );

  const direccionesPieData = [
    { name: 'Norte', value: direccionesData.norte, color: '#3b82f6' },
    { name: 'Sur', value: direccionesData.sur, color: '#8b5cf6' },
  ];

  if (isLoading && eventos.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-600 font-medium">Cargando Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        isRefreshing={isRefreshing}
        onRefresh={handleManualRefresh}
        lastUpdate={estadisticas.ultimaActualizacion}
      />

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Detecciones"
            value={estadisticas.totalDetecciones.toLocaleString()}
            icon={Activity}
            color="blue"
            delay={0}
          />
          <StatCard
            title="Velocidad Promedio"
            value={`${estadisticas.velocidadPromedio} km/h`}
            icon={Gauge}
            color="green"
            delay={0.1}
          />
          <StatCard
            title="Total Infracciones"
            value={estadisticas.totalInfracciones.toLocaleString()}
            icon={AlertTriangle}
            color="red"
            delay={0.2}
          />
          <StatCard
            title="% Infracciones"
            value={`${estadisticas.porcentajeInfracciones}%`}
            icon={TrendingUp}
            color="orange"
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChart data={datosGraficos} title="Actividad en el Tiempo" />
          <PieChart
            data={pieData}
            title="Distribución de Eventos"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChart
            data={direccionesPieData}
            title="Tráfico por Dirección"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-sm p-6 text-white"
          >
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Sistema en Vivo</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Estado del Sistema</span>
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium"
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Operativo
                </motion.span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Actualización automática</span>
                <span className="text-sm font-medium">Cada 5 segundos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Última actualización</span>
                <span className="text-sm font-medium">
                  {new Date(estadisticas.ultimaActualizacion).toLocaleTimeString('es-ES')}
                </span>
              </div>
              <div className="pt-4 border-t border-white/20">
                <p className="text-sm text-blue-100">
                  Dashboard conectado al backend SIAV. Los datos se actualizan en tiempo real.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <MapView eventos={eventos} />

        <EventsTable eventos={eventos} maxItems={15} />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-slate-500 py-4"
        >
          SIAV - Sistema Inteligente de Analítica Vial | Dashboard v2.0
        </motion.div>
      </main>
    </div>
  );
}

export default App;
