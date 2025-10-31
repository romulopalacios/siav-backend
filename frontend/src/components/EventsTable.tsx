import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, MapPin, Clock } from 'lucide-react';
import type { Evento } from '../types';

interface EventsTableProps {
  eventos: Evento[];
  maxItems?: number;
}

export default function EventsTable({ eventos, maxItems = 10 }: EventsTableProps) {
  const eventosLimitados = eventos.slice(0, maxItems);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">
          Eventos Recientes
        </h3>
        <p className="text-sm text-slate-600">
          Últimas {maxItems} detecciones en tiempo real
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Dispositivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Velocidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Dirección
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Ubicación
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            <AnimatePresence mode="popLayout">
              {eventosLimitados.map((evento, index) => (
                <motion.tr
                  key={evento.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-900">
                          {formatTime(evento.timestamp)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(evento.timestamp)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-slate-700">
                      {evento.dispositivo_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold ${
                          evento.es_infraccion
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {evento.velocidad}
                      </span>
                      <span className="text-sm text-slate-500">km/h</span>
                    </div>
                    {evento.limite_velocidad && (
                      <div className="text-xs text-slate-400">
                        Límite: {evento.limite_velocidad} km/h
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                      {evento.direccion}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {evento.es_infraccion ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Infracción
                      </motion.span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {evento.ubicacion ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs">
                          {evento.ubicacion.nombre || 'Ubicación registrada'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Sin ubicación
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {eventos.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-slate-500">No hay eventos disponibles</p>
        </div>
      )}
    </motion.div>
  );
}
