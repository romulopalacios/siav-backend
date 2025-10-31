import { motion } from 'framer-motion';
import { Activity, RefreshCw } from 'lucide-react';

interface HeaderProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  lastUpdate?: string;
}

export default function Header({ isRefreshing, onRefresh, lastUpdate }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 backdrop-blur-sm bg-white/95"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg"
          >
            <Activity className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              SIAV Dashboard
            </h1>
            <p className="text-sm text-slate-600">
              Sistema Inteligente de Analítica Vial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-slate-500"
            >
              Actualizado: {new Date(lastUpdate).toLocaleTimeString('es-ES')}
            </motion.div>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Actualizar</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
