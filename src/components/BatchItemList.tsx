import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export interface BatchItemStatus {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'done' | 'error';
  filename?: string;
  error?: string;
}

interface BatchItemListProps {
  items: BatchItemStatus[];
  isMergeMode: boolean;
}

export const BatchItemList: React.FC<BatchItemListProps> = ({ items, isMergeMode }) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-sm text-slate-300">
        {isMergeMode ? 'Videos incluidos en la compilación' : 'Estado de Descargas'}
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/5 border border-white/5">
            <span className="truncate max-w-[60%] font-mono text-slate-300">{item.url}</span>
            <div>
              {item.status === 'pending' && <span className="text-slate-500">En espera</span>}
              {item.status === 'downloading' && <span className="text-yellow-400 font-bold animate-pulse">Procesando...</span>}
              {item.status === 'done' && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Preparado
                </span>
              )}
              {item.status === 'error' && (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {item.error || 'Error'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
