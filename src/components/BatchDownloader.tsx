import React, { useState, useRef } from 'react';
import { Download, Film, Sparkles } from 'lucide-react';
import { RedGifItem } from '../types';
import { getVideoInfo, fetchVideoBlob, downloadVideoFile, triggerBlobDownload } from '../services/redgifs';
import { mergeVideoBlobs, MergeProgress } from '../services/videoMerger';
import { BatchItemList, BatchItemStatus } from './BatchItemList';

interface BatchDownloaderProps {
  onSuccessDownload: (video: RedGifItem, quality: string, filename: string, size_mb?: number) => void;
  showToast: (msg: string) => void;
}

export const BatchDownloader: React.FC<BatchDownloaderProps> = ({ onSuccessDownload, showToast }) => {
  const [batchText, setBatchText] = useState('');
  const [batchQuality, setBatchQuality] = useState<'hd' | 'sd'>('hd');
  const [downloadMode, setDownloadMode] = useState<'individual' | 'merge'>('individual');
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItemStatus[]>([]);
  
  // Merge status
  const [mergeStage, setMergeStage] = useState<'idle' | 'downloading' | 'merging' | 'done'>('idle');
  const [mergeStatusText, setMergeStatusText] = useState('');
  const [mergePercent, setMergePercent] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

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

    if (downloadMode === 'individual') {
      // MODO 1: Descargas individuales
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

      const queue = [...items];
      const workers = Array.from({ length: 2 }).map(async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (next) await processItem(next);
        }
      });

      await Promise.all(workers);
      setIsBatchRunning(false);
      showToast('Descargas individuales completadas');

    } else {
      // MODO 2: Unir todos los videos en uno solo (Merge)
      setMergeStage('downloading');
      setMergeStatusText('Descargando videos para la compilación...');
      setMergePercent(5);

      const downloadedResults: { index: number; blob: Blob; info: RedGifItem }[] = [];
      let completedCount = 0;

      const queueWithIndex = items.map((item, index) => ({ item, index }));
      const workers = Array.from({ length: 2 }).map(async () => {
        while (queueWithIndex.length > 0) {
          const task = queueWithIndex.shift();
          if (!task) break;
          const { item, index } = task;

          setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'downloading' } : it));
          try {
            const info = await getVideoInfo(item.url);
            const mediaUrl = batchQuality === 'hd' ? info.hd_url : info.sd_url;
            const blob = await fetchVideoBlob(mediaUrl);
            downloadedResults.push({ index, blob, info });
            setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'done' } : it));
          } catch (err: any) {
            setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: err.message } : it));
          } finally {
            completedCount++;
            setMergePercent(Math.round((completedCount / items.length) * 40));
            setMergeStatusText(`Descargados ${completedCount} de ${items.length} videos...`);
          }
        }
      });

      await Promise.all(workers);

      // Ordenar por el orden original
      downloadedResults.sort((a, b) => a.index - b.index);
      const downloadedBlobs = downloadedResults.map(r => r.blob);
      const collectedInfos = downloadedResults.map(r => r.info);

      if (downloadedBlobs.length === 0) {
        setMergeStage('idle');
        setIsBatchRunning(false);
        showToast('No se pudo descargar ningún video para unir');
        return;
      }

      setMergeStage('merging');
      setMergeStatusText('Uniendo videos en un único archivo continuo...');

      try {
        const { blob: mergedBlob, extension } = await mergeVideoBlobs(
          downloadedBlobs,
          (prog: MergeProgress) => {
            const mappedPercent = 40 + Math.round(prog.percent * 0.6);
            setMergePercent(mappedPercent);
            setMergeStatusText(prog.statusText);
          },
          previewCanvasRef.current
        );

        const filename = `redgifs_compilacion_${Date.now()}.${extension}`;
        await triggerBlobDownload(mergedBlob, filename);

        const sizeMb = Math.round((mergedBlob.size / (1024 * 1024)) * 10) / 10;
        const compInfo: RedGifItem = {
          id: `comp_${Date.now()}`,
          title: `Compilación de ${downloadedBlobs.length} videos`,
          userName: 'compilacion',
          duration: 0,
          views: 0,
          likes: 0,
          tags: ['compilacion', 'lote'],
          hd_url: '',
          sd_url: '',
          poster_url: collectedInfos[0]?.poster_url || '',
          thumbnail_url: collectedInfos[0]?.thumbnail_url || '',
          watch_url: '#'
        };

        onSuccessDownload(compInfo, 'compilacion', filename, sizeMb);
        setMergeStage('done');
        setMergeStatusText(`¡Video unido y descargado con éxito! (${sizeMb} MB)`);
        showToast(`¡Video compilado descargado!: ${filename}`);
      } catch (err: any) {
        setMergeStage('idle');
        setMergeStatusText(`Error al unir videos: ${err.message}`);
        showToast(`Error al unir videos: ${err.message}`);
      } finally {
        setIsBatchRunning(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold font-display">Descarga Masiva por Lotes</h2>
        <p className="text-slate-400 text-sm">
          Pega múltiples URLs de RedGIFs para descargarlas individualmente o combinarlas en un solo video continuo.
        </p>
      </div>

      {/* Modo de Descarga Selector */}
      <div className="bg-[#12141c] border border-white/10 p-3.5 rounded-2xl space-y-2">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-400">¿Cómo deseas procesar los videos?</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-150 ${
            downloadMode === 'individual' ? 'bg-red-600/10 border-red-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
          }`}>
            <input
              type="radio"
              name="batchMode"
              value="individual"
              checked={downloadMode === 'individual'}
              onChange={() => setDownloadMode('individual')}
              className="accent-red-500"
            />
            <div>
              <div className="text-sm font-bold">Archivos individuales</div>
              <div className="text-xs opacity-70">Descarga cada video por separado</div>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-150 ${
            downloadMode === 'merge' ? 'bg-gradient-to-r from-red-600/20 via-pink-600/20 to-purple-600/20 border-red-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
          }`}>
            <input
              type="radio"
              name="batchMode"
              value="merge"
              checked={downloadMode === 'merge'}
              onChange={() => setDownloadMode('merge')}
              className="accent-red-500"
            />
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5 text-red-400">
                <Film className="w-4 h-4" /> Unir en un solo video (Merge)
              </div>
              <div className="text-xs opacity-70">Crea una compilación continua MP4</div>
            </div>
          </label>
        </div>
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
          <label htmlFor="batchQualitySelect">Calidad de los videos:</label>
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
            onClick={() => {
              setBatchText('');
              setBatchItems([]);
              setMergeStage('idle');
            }}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors duration-150"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleStartBatch}
            disabled={isBatchRunning}
            className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-500/30 transition-transform duration-150 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {downloadMode === 'merge' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isBatchRunning ? 'Uniendo videos...' : 'Unir y Descargar Video'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isBatchRunning ? 'Descargando...' : 'Iniciar Descargas'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Merge Status Banner */}
      {mergeStage !== 'idle' && (
        <div className="bg-[#12141c] border border-red-500/40 p-4 rounded-2xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-red-400 flex items-center gap-1.5">
              <Film className="w-4 h-4" /> {mergeStatusText}
            </span>
            <span>{mergePercent}%</span>
          </div>
          <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 h-full transition-transform duration-200"
              style={{ width: `${mergePercent}%` }}
            />
          </div>
          {/* Canvas oculto para el procesador de video */}
          <canvas ref={previewCanvasRef} className="hidden" />
        </div>
      )}

      {/* Batch Progress List */}
      <BatchItemList items={batchItems} isMergeMode={downloadMode === 'merge'} />
    </div>
  );
};
