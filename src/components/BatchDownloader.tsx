import React, { useState } from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { RedGifItem } from '../types';
import { getVideoInfo, downloadVideoFile } from '../services/redgifs';

interface BatchDownloaderProps {
  onSuccessDownload: (video: RedGifItem, quality: string, filename: string) => void;
  showToast: (msg: string) => void;
}

interface BatchItemStatus {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'done' | 'error';
  filename?: string;
  error?: string;
}

export const BatchDownloader: React.FC<BatchDownloaderProps> = ({ onSuccessDownload, showToast }) => {
  const [batchText, setBatchText] = useState('');
  const [batchQuality, setBatchQuality] = useState<'hd' | 'sd'>('hd');
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItemStatus[]>([]);

  const handleStartBatch = async () => {
    const urls = batchText.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      showToast('Pega al menos un enlace en el área de texto');
      return;
    }

    const items: BatchItemStatus[] = urls.map((u, i) => ({
      id: `${i}-${encodeURIComponent(u)}`,
      url: u,
      status: 'pending'
    }));
    setBatchItems(items);
    setIsBatchRunning(true);

    // Procesar con limitación concurrente sin await serial en bucle rígido
    const processItem = async (item: BatchItemStatus) => {
      setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'downloading' } : it));

      try {
        const info = await getVideoInfo(item.url);
        const mediaUrl = batchQuality === 'hd' ? info.hd_url : info.sd_url;
        const cleanUser = info.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'anónimo';
        const filename = `${cleanUser}_${info.id}_${batchQuality}.mp4`;

        await downloadVideoFile(mediaUrl, filename);
        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'done', filename } : it));
        onSuccessDownload(info, batchQuality, filename);
      } catch (err: any) {
        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: err.message } : it));
      }
    };

    // Procesar de a 2 concurrentes
    const queue = [...items];
    const workers = Array.from({ length: 2 }).map(async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (next) await processItem(next);
      }
    });

    await Promise.all(workers);
    setIsBatchRunning(false);
    showToast('Descarga por lotes finalizada');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold font-display">Descarga Masiva por Lotes</h2>
        <p className="text-slate-400 text-sm">Pega múltiples URLs de RedGIFs (una por línea) para descargarlas todas seguidas.</p>
      </div>

      <div>
        <label htmlFor="batchTextarea" className="sr-only">Lista de enlaces de RedGIFs</label>
        <textarea
          id="batchTextarea"
          rows={8}
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          aria-label="Lista de enlaces de RedGIFs para descarga por lotes"
          placeholder="https://www.redgifs.com/watch/video1&#10;https://www.redgifs.com/watch/video2&#10;https://www.redgifs.com/watch/video3"
          className="w-full bg-[#12141c] border border-white/10 rounded-2xl p-4 text-sm font-mono text-white outline-none focus:border-red-500/60 transition-colors duration-200 resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <label htmlFor="batchQualitySelect">Calidad:</label>
          <select
            id="batchQualitySelect"
            value={batchQuality}
            onChange={(e) => setBatchQuality(e.target.value as 'hd' | 'sd')}
            className="bg-[#12141c] border border-white/10 text-white px-3 py-1.5 rounded-lg text-sm outline-none"
          >
            <option value="hd">HD (1080p / Alta)</option>
            <option value="sd">SD (Móvil / Ligera)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBatchText('')}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors duration-150"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleStartBatch}
            disabled={isBatchRunning}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-500/30 transition-transform duration-150 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isBatchRunning ? 'Procesando...' : 'Iniciar Descargas'}</span>
          </button>
        </div>
      </div>

      {/* Batch Progress List */}
      {batchItems.length > 0 && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-300">Estado de Descargas</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {batchItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="truncate max-w-[60%] font-mono text-slate-300">{item.url}</span>
                <div>
                  {item.status === 'pending' && <span className="text-slate-500">En espera</span>}
                  {item.status === 'downloading' && <span className="text-yellow-400 font-bold animate-pulse">Descargando...</span>}
                  {item.status === 'done' && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Completado
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
      )}
    </div>
  );
};
