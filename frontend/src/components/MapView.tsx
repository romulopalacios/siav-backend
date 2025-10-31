import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import type { Evento } from '../types';

interface MapViewProps {
  eventos: Evento[];
}

export default function MapView({ eventos: _eventos }: MapViewProps) {
  const eventosConUbicacion = _eventos.filter((e) => e.ubicacion);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Mapa de Eventos
            </h3>
            <p className="text-sm text-slate-600">
              {eventosConUbicacion.length} eventos con ubicación registrada
            </p>
          </div>
          <Navigation className="w-5 h-5 text-blue-500" />
        </div>
      </div>

      <div className="relative h-96 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">
              Visualización de Mapa
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Integración con servicios de mapas disponible
            </p>
          </div>
        </div>

        {eventosConUbicacion.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              {eventosConUbicacion.slice(0, 2).map((evento) => (
                <motion.div
                  key={evento.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {evento.dispositivo_id}
                    </p>
                    <p className="text-xs text-slate-600">
                      {evento.ubicacion?.nombre || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {evento.velocidad} km/h • {evento.direccion}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
