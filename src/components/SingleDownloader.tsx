import React, { useState } from 'react';
import { Download, Clipboard, X, Sparkles, Eye, Heart, AlertCircle, ExternalLink, Tag, Film } from 'lucide-react';
import { RedGifItem, SearchResultItem } from '../types';
import { getVideoInfo, downloadVideoFile, isIOS } from '../services/redgifs';

interface SingleDownloaderProps {
  onSuccessDownload: (video: RedGifItem, quality: string, filename: string, size_mb?: number) => void;
  showToast: (msg: string) => void;
  onSelectTag?: (tag: string) => void;
  onOpenTheater?: (videos: SearchResultItem[], startIndex: number) => void;
  onToggleFavorite?: (video: SearchResultItem) => void;
  isFavorite?: (id: string) => boolean;
}

export const SingleDownloader: React.FC<SingleDownloaderProps> = ({
  onSuccessDownload,
  showToast,
  onSelectTag,
  onOpenTheater,
  onToggleFavorite,
  isFavorite
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [video, setVideo] = useState<RedGifItem | null>(null);
  const [progress, setProgress] = useState<{
    active: boolean;
    percent: number;
    downloadedMb: number;
    totalMb: number;
    quality: string;
  }>({ active: false, percent: 0, downloadedMb: 0, totalMb: 0, quality: 'hd' });

  const handleAnalyze = async (urlToAnalyze?: string) => {
    const target = (urlToAnalyze || inputUrl).trim();
    setAnalysisError(null);
    if (!target) {
      const msg = 'Por favor introduce un enlace o ID de RedGIFs.';
      setAnalysisError(msg);
      showToast(msg);
      return;
    }

    setIsAnalyzing(true);
    setVideo(null);
    try {
      const data = await getVideoInfo(target);
      setVideo(data);
      showToast('¡Video encontrado!');
    } catch (err: any) {
      const msg = err.message || 'Error al consultar video';
      setAnalysisError(msg);
      showToast(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
        showToast('Enlace pegado');
        handleAnalyze(text.trim());
      }
    } catch {
      showToast('Por favor escribe o pega el enlace en el campo');
    }
  };

  const handleDownload = async (quality: 'hd' | 'sd') => {
    if (!video) return;

    const mediaUrl = quality === 'hd' ? video.hd_url : video.sd_url;
    if (!mediaUrl) {
      showToast('No se encontró URL de descarga para esta calidad');
      return;
    }

    const cleanUser = video.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'anónimo';
    const filename = `${cleanUser}_${video.id}_${quality}.mp4`;

    setProgress({ active: true, percent: 0, downloadedMb: 0, totalMb: 0, quality });

    try {
      await downloadVideoFile(mediaUrl, filename, (percent, downloadedMb, totalMb) => {
        setProgress({ active: true, percent, downloadedMb, totalMb, quality });
      });
      showToast(`¡Descarga completada!: ${filename}`);
      onSuccessDownload(video, quality, filename, progress.totalMb);
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`);
    } finally {
      setProgress(prev => ({ ...prev, active: false }));
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center space-y-3">
        <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight">
          Descarga videos de RedGIFs en HD
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
          Pega el enlace o ID para previsualizarlo y guardarlo directamente en tu dispositivo en máxima calidad con audio.
        </p>

        {/* Formulario accesible con label y submit */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
          className="max-w-2xl mx-auto mt-6 bg-[#12141c] border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-2xl focus-within:border-red-500/60 transition-colors duration-200"
        >
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              if (analysisError) setAnalysisError(null);
            }}
            aria-label="Enlace o ID de video de RedGIFs"
            placeholder="Pega el enlace (ej: https://www.redgifs.com/watch/...)"
            className="flex-1 bg-transparent px-4 text-sm md:text-base outline-none text-white placeholder-slate-500"
          />
          {inputUrl && (
            <button
              type="button"
              onClick={() => {
                setInputUrl('');
                setAnalysisError(null);
              }}
              aria-label="Limpiar campo de texto"
              className="p-2 text-slate-400 hover:text-white transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handlePaste}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150"
          >
            <Clipboard className="w-3.5 h-3.5" /> Pegar
          </button>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-red-500/25 transition-transform duration-150 active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <span>Consultando...</span>
            ) : (
              <>
                <span>Analizar</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Mensaje de error accesible */}
        {analysisError && (
          <div className="max-w-2xl mx-auto mt-3 bg-red-500/15 border border-red-500/30 text-red-200 p-3 rounded-xl text-xs flex items-center justify-between text-left animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{analysisError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAnalysisError(null)}
              aria-label="Cerrar aviso de error"
              className="text-red-400 hover:text-white text-xs px-2 py-1 transition-colors duration-150"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Video Preview Card */}
      {video && (
        <div className="max-w-3xl mx-auto bg-[#12141c]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md grid md:grid-cols-2">
          <div className="bg-black flex items-center justify-center relative min-h-[300px]">
            <video
              src={video.hd_url || video.sd_url}
              controls
              playsInline
              loop
              className="w-full h-full object-cover max-h-[420px]"
            />
          </div>
          <div className="p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-bold text-sm">@{video.userName}</span>
                <span className="bg-white/10 text-xs px-2.5 py-1 rounded-md text-slate-300 font-medium">
                  {video.duration}s
                </span>
              </div>

              <h3 className="font-bold text-lg leading-snug line-clamp-2">{video.title}</h3>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {video.views.toLocaleString()} vistas
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-pink-400" /> {video.likes.toLocaleString()}
                  </span>
                </div>

                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => {
                      const searchItem: SearchResultItem = {
                        id: video.id,
                        title: video.title,
                        userName: video.userName,
                        duration: video.duration,
                        views: video.views,
                        likes: video.likes,
                        hasAudio: true,
                        tags: video.tags,
                        hd_url: video.hd_url,
                        sd_url: video.sd_url,
                        thumbnail_url: video.thumbnail_url,
                        poster_url: video.poster_url,
                        watch_url: video.watch_url
                      };
                      onToggleFavorite(searchItem);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isFavorite && isFavorite(video.id)
                        ? 'bg-pink-600/25 border-pink-500/40 text-pink-300'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-pink-300 border-white/10'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFavorite && isFavorite(video.id) ? 'fill-pink-500 text-pink-500' : ''
                      }`}
                    />
                    <span>{isFavorite && isFavorite(video.id) ? 'En Favoritos' : 'Añadir a Favoritos'}</span>
                  </button>
                )}
              </div>

              {video.tags.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-red-400" />
                    <span>Etiquetas (pulsa para ver videos relacionados):</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {video.tags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (onSelectTag) {
                            onSelectTag(tag);
                            showToast(`Buscando videos relacionados con #${tag}...`);
                          }
                        }}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-white px-2.5 py-1 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                        title={`Buscar videos relacionados con #${tag}`}
                      >
                        <span>#{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Download Buttons & Progress */}
            <div className="pt-6 space-y-3">
              {progress.active && (
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-red-400">Descargando {progress.quality.toUpperCase()}...</span>
                    <span>{progress.percent}% ({progress.downloadedMb}MB / {progress.totalMb}MB)</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-pink-500 h-full transition-transform duration-200"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload('hd')}
                  disabled={progress.active}
                  className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white font-bold p-3 rounded-xl text-center shadow-lg shadow-red-600/25 transition-transform duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <div className="text-sm font-extrabold flex items-center justify-center gap-1.5">
                    <Download className="w-4 h-4" /> Descargar HD
                  </div>
                  <div className="text-[10px] text-white/80 font-normal">
                    {isIOS() ? 'Guardar en Fotos / Archivos' : 'Máxima calidad (1080p)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('sd')}
                  disabled={progress.active}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold p-3 rounded-xl text-center transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                >
                  <div className="text-sm font-extrabold flex items-center justify-center gap-1.5">
                    <Download className="w-4 h-4" /> Descargar SD
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">Versión móvil ligera</div>
                </button>
              </div>

              {/* Botón Ver en Modo Feed Reels */}
              {onOpenTheater && (
                <button
                  type="button"
                  onClick={() => {
                    const searchItem: SearchResultItem = {
                      id: video.id,
                      title: video.title,
                      userName: video.userName,
                      duration: video.duration,
                      views: video.views,
                      likes: video.likes,
                      hasAudio: true,
                      tags: video.tags,
                      hd_url: video.hd_url,
                      sd_url: video.sd_url,
                      thumbnail_url: video.thumbnail_url,
                      poster_url: video.poster_url,
                      watch_url: video.watch_url
                    };
                    onOpenTheater([searchItem], 0);
                  }}
                  className="w-full bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 hover:text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-600/20 active:scale-95"
                >
                  <Film className="w-4 h-4 text-purple-400" />
                  <span>Ver en Modo Reels (Pantalla Completa)</span>
                </button>
              )}

              {/* Direct link for iPad / iOS */}
              <div className="space-y-2 pt-1">
                <a
                  href={video.hd_url || video.sd_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-150"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                  <span>Abrir enlace directo MP4 (Sin restricciones de navegador)</span>
                </a>

                <p className="text-[11px] text-slate-400 text-center">
                  💡 <strong>En iPad / iPhone:</strong> Si el navegador bloquea la descarga, pulsa <em>"Abrir enlace directo"</em>, mantén pulsado el video y elige <strong>"Guardar video"</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
