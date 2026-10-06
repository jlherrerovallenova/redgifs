import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Heart,
  Eye,
  Tag,
  User,
  ExternalLink,
  Maximize2,
  Minimize2,
  Sparkles,
  Share2
} from 'lucide-react';
import { SearchResultItem, RedGifItem } from '../types';
import { getVideoInfo, downloadVideoFile, isIOS } from '../services/redgifs';

interface TheaterFeedModalProps {
  open: boolean;
  videos: SearchResultItem[];
  initialIndex?: number;
  onClose: () => void;
  onSelectTag?: (tag: string) => void;
  onSelectCreator?: (username: string) => void;
  onSuccessDownload?: (video: RedGifItem, quality: string, filename: string) => void;
  showToast: (msg: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const TheaterFeedModal: React.FC<TheaterFeedModalProps> = ({
  open,
  videos,
  initialIndex = 0,
  onClose,
  onSelectTag,
  onSelectCreator,
  onSuccessDownload,
  showToast,
  onLoadMore,
  hasMore = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});
  const [likeCountDelta, setLikeCountDelta] = useState<Record<string, number>>({});
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState<'play' | 'pause' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const lastWheelTime = useRef<number>(0);

  // Sincronizar índice inicial cuando se abre el modal
  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.max(0, Math.min(videos.length - 1, initialIndex)));
      setIsPlaying(true);
    }
  }, [open, initialIndex, videos.length]);

  const currentVideo = videos[currentIndex] || null;

  // Navegación siguiente video
  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
      // Auto-cargar más videos si estamos cerca del final
      if (currentIndex >= videos.length - 3 && hasMore && onLoadMore) {
        onLoadMore();
      }
    } else {
      showToast('¡Has llegado al final de esta lista!');
    }
  }, [currentIndex, videos.length, hasMore, onLoadMore, showToast]);

  // Navegación video anterior
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setShowCenterIcon('play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowCenterIcon('pause');
    }
    setTimeout(() => setShowCenterIcon(null), 500);
  }, []);

  // Doble clic / tap para dar Like
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!currentVideo) return;
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);

    if (!isLiked[currentVideo.id]) {
      setIsLiked(prev => ({ ...prev, [currentVideo.id]: true }));
      setLikeCountDelta(prev => ({ ...prev, [currentVideo.id]: (prev[currentVideo.id] || 0) + 1 }));
      showToast(`¡Te gusta el video de @${currentVideo.userName}!`);
    }
  };

  const toggleLike = () => {
    if (!currentVideo) return;
    const current = !!isLiked[currentVideo.id];
    setIsLiked(prev => ({ ...prev, [currentVideo.id]: !current }));
    setLikeCountDelta(prev => ({
      ...prev,
      [currentVideo.id]: (prev[currentVideo.id] || 0) + (current ? -1 : 1)
    }));
  };

  // Descarga HD
  const handleDownloadHD = async () => {
    if (!currentVideo) return;
    showToast(`Preparando descarga de @${currentVideo.userName}...`);
    try {
      const info = await getVideoInfo(currentVideo.id);
      const cleanUser = currentVideo.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'redgifs';
      const filename = `${cleanUser}_${currentVideo.id}_hd.mp4`;
      await downloadVideoFile(info.hd_url || currentVideo.hd_url, filename);
      showToast(`¡Descargado con éxito!: ${filename}`);
      if (onSuccessDownload) {
        onSuccessDownload(info, 'hd', filename);
      }
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`);
    }
  };

  // Copiar Enlace
  const handleCopyLink = async () => {
    if (!currentVideo) return;
    const link = currentVideo.watch_url || `https://www.redgifs.com/watch/${currentVideo.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(currentVideo.id);
      showToast('Enlace copiado al portapapeles');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('No se pudo copiar el enlace');
    }
  };

  // Pantalla Completa
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Atajos de Teclado
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
        case 'J':
        case 's':
        case 'S':
        case 'PageDown':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowUp':
        case 'k':
        case 'K':
        case 'w':
        case 'W':
        case 'PageUp':
          e.preventDefault();
          goToPrev();
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          handleDownloadHD();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goToNext, goToPrev, togglePlay, onClose]);

  // Gestos de Rueda de Ratón (Debounced Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 350) return;

    if (Math.abs(e.deltaY) > 25) {
      lastWheelTime.current = now;
      if (e.deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Gestos Touch Swipe (Móvil / iPad)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;
    touchStartY.current = null;

    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        goToNext(); // Swipe arriba -> siguiente video
      } else {
        goToPrev(); // Swipe abajo -> video anterior
      }
    }
  };

  // Actualizar barra de progreso del video
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 0;
      setCurrentTime(cur);
      setDuration(dur);
      if (dur > 0) {
        setProgress((cur / dur) * 100);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  if (!open || !currentVideo) return null;

  const currentLikes = (currentVideo.likes || 0) + (likeCountDelta[currentVideo.id] || 0);
  const nextVideo = videos[currentIndex + 1];

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-[#050608] text-white flex items-center justify-center select-none overflow-hidden animate-fadeIn"
    >
      {/* Luces de Fondo Ambientales */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-red-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Barra Superior con Logo, Contador y Botón Cerrar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="text-white">Modo Feed / Reels</span>
          </div>

          <span className="text-xs font-bold text-slate-300 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/5">
            {currentIndex + 1} / {videos.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Pantalla Completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer hidden sm:flex"
            title="Pantalla completa (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modo Feed"
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:bg-red-600/80 transition-all cursor-pointer shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenedor Central del Video (Formato Vertical / Centrado Reels) */}
      <div className="relative w-full h-full max-w-xl max-h-[95vh] sm:max-h-[90vh] flex items-center justify-center p-2 sm:p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={togglePlay}
          onDoubleClick={handleDoubleTap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              togglePlay();
            }
          }}
          className="relative w-full h-full bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black flex items-center justify-center cursor-pointer group"
        >
          {/* Video Player */}
          <video
            ref={videoRef}
            key={currentVideo.id}
            src={currentVideo.hd_url || currentVideo.sd_url}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-contain bg-black"
          />

          {/* Preload del siguiente video para cambio instantáneo */}
          {nextVideo && (
            <video
              src={nextVideo.hd_url || nextVideo.sd_url}
              preload="auto"
              className="hidden"
            />
          )}

          {/* Animación de Doble Tap Corazón Gigante */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-ping">
              <Heart className="w-28 h-28 text-pink-500 fill-pink-500 drop-shadow-2xl" />
            </div>
          )}

          {/* Indicador Central de Play / Pause */}
          {showCenterIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
                {showCenterIcon === 'play' ? (
                  <Play className="w-8 h-8 fill-white ml-1" />
                ) : (
                  <Pause className="w-8 h-8 fill-white" />
                )}
              </div>
            </div>
          )}

          {/* Overlay Inferior con Datos del Video */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 space-y-2 pointer-events-auto"
          >
            {/* Creador y Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectCreator) onSelectCreator(currentVideo.userName);
                }}
                className="text-purple-300 hover:text-purple-200 font-extrabold text-sm flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1 rounded-full border border-purple-500/30 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>@{currentVideo.userName}</span>
              </button>

              <span className="text-[11px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Eye className="w-3 h-3 text-slate-400" />
                {currentVideo.views.toLocaleString()} vistas
              </span>

              {currentVideo.hasAudio ? (
                <span className="text-[11px] text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                  <Volume2 className="w-3 h-3" /> Sonido
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <VolumeX className="w-3 h-3" /> Mudo
                </span>
              )}
            </div>

            {/* Título del Video */}
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
              {currentVideo.title}
            </h2>

            {/* Etiquetas Clicables */}
            {currentVideo.tags && currentVideo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-16 overflow-y-auto">
                {currentVideo.tags.slice(0, 5).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSelectTag) onSelectTag(t);
                    }}
                    className="text-xs bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-white px-2.5 py-0.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
                    title={`Ver videos relacionados con #${t}`}
                  >
                    <span>#{t}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Barra de Progreso y Tiempo */}
            <div className="pt-2 space-y-1">
              <div
                role="slider"
                tabIndex={0}
                aria-label="Barra de reproducción de video"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                onClick={handleSeek}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' && videoRef.current) {
                    videoRef.current.currentTime = Math.min(duration, currentTime + 5);
                  } else if (e.key === 'ArrowLeft' && videoRef.current) {
                    videoRef.current.currentTime = Math.max(0, currentTime - 5);
                  }
                }}
                className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full overflow-hidden cursor-pointer transition-all relative"
              >
                <div
                  className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{Math.floor(currentTime)}s</span>
                <span>{Math.round(duration)}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra Lateral de Acciones Rápidas (Estilo TikTok / Reels) */}
        <div className="absolute right-4 sm:right-6 bottom-24 sm:bottom-28 z-30 flex flex-col items-center gap-3">
          {/* Like Button */}
          <button
            type="button"
            onClick={toggleLike}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border transition-all active:scale-90 cursor-pointer shadow-xl ${
              isLiked[currentVideo.id]
                ? 'bg-pink-600 text-white border-pink-400 shadow-pink-600/40 scale-105'
                : 'bg-black/70 backdrop-blur-md text-white border-white/15 hover:bg-white/20'
            }`}
            title="Me gusta (Doble tap en video)"
          >
            <Heart className={`w-5 h-5 ${isLiked[currentVideo.id] ? 'fill-white' : ''}`} />
            <span className="text-[9px] font-bold mt-0.5">{currentLikes}</span>
          </button>

          {/* Mute / Unmute */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-xl"
            title={isMuted ? 'Activar sonido (M)' : 'Silenciar (M)'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Descargar HD */}
          <button
            type="button"
            onClick={handleDownloadHD}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-pink-600 hover:opacity-90 text-white border border-red-400/50 flex flex-col items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-xl shadow-red-600/30"
            title="Descargar HD (D)"
          >
            <Download className="w-5 h-5" />
            <span className="text-[8px] font-black">HD</span>
          </button>

          {/* Copiar Enlace */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-xl"
            title="Copiar enlace"
          >
            {copiedId === currentVideo.id ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Copy className="w-5 h-5 text-slate-300" />
            )}
          </button>

          {/* Enlace directo para iPad / iOS */}
          {isIOS() && (
            <a
              href={currentVideo.hd_url || currentVideo.sd_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-purple-300 hover:bg-white/20 flex items-center justify-center transition-transform active:scale-90 shadow-xl"
              title="Abrir enlace MP4 directo"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      {/* Flechas de Navegación Flotantes (Arriba / Abajo) */}
      <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 z-30">
        <button
          type="button"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-xl hover:scale-110 active:scale-95"
          title="Video anterior (Flecha Arriba ↑ / W)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={goToNext}
          disabled={currentIndex >= videos.length - 1}
          className="w-12 h-12 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-xl hover:scale-110 active:scale-95"
          title="Siguiente video (Flecha Abajo ↓ / S / Rueda ratón)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Leyenda de Atajos en Pie para Escritorio */}
      <div className="absolute bottom-3 left-6 hidden lg:flex items-center gap-3 text-[11px] text-slate-400 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
        <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">↓</kbd> Navegar</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">Espacio</kbd> Pausar</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">M</kbd> Audio</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">D</kbd> Descarga HD</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white">Doble clic</kbd> Like</span>
      </div>
    </div>
  );
};
