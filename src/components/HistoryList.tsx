import React from 'react';
import { Play, Download, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryListProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onOpenLightbox: (url: string, title: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onClearHistory, onOpenLightbox }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">Historial de Descargas</h2>
          <p className="text-slate-400 text-sm">Videos que has descargado en esta sesión</p>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" /> Borrar Historial
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          No hay descargas registradas todavía.
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((item) => (
            <div key={`${item.id}-${item.timestamp}`} className="bg-[#12141c] border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-4">
              <div className="truncate">
                <h3 className="font-semibold text-sm text-slate-200 truncate">{item.filename}</h3>
                <p className="text-xs text-slate-400">
                  @{item.userName} · Calidad {item.quality.toUpperCase()} · {new Date(item.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenLightbox(item.url, item.filename)}
                  aria-label={`Previsualizar video ${item.filename}`}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors duration-150"
                  title="Previsualizar"
                >
                  <Play className="w-4 h-4" />
                </button>
                <a
                  href={item.url}
                  download={item.filename}
                  aria-label={`Descargar archivo ${item.filename}`}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors duration-150"
                  title="Descargar de nuevo"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
