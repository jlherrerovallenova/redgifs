import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Tag,
  User,
  Film,
  Heart,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Camera,
  PictureInPicture2,
  FlipHorizontal2,
  Download,
  Gauge,
  Sliders,
  Check,
  Eye,
  Clock,
  ExternalLink,
  Layers
} from 'lucide-react';
import { SearchResultItem, RedGifItem } from '../types';
import { searchVideosExtended, getVideoInfo, downloadVideoFile } from '../services/redgifs';

interface LightboxModalProps {
  open: boolean;
  url: string;
  title: string;
  tags?: string[];
  userName?: string;
  originalItem?: SearchResultItem;
  onClose: () => void;
  onSelectTag?: (tag: string) => void;
  onSelectCreator?: (username: string) => void;
  onOpenTheater?: () => void;
  onToggleFavorite?: (video: SearchResultItem) => void;
  isFavorite?: (id: string) => boolean;
  onSwitchVideo?: (item: SearchResultItem) => void;
  showToast?: (msg: string) => void;
  onSuccessDownload?: (video: RedGifItem, quality: string, filename: string) => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const LightboxModal: React.FC<LightboxModalProps> = ({
  open,
  url,
  title,
  tags = [],
  userName,
  originalItem,
  onClose,
  onSelectTag,
  onSelectCreator,
  onOpenTheater,
  onToggleFavorite,
  isFavorite,
  onSwitchVideo,
  showToast,
  onSuccessDownload
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityMode, setQualityMode] = useState<'hd' | 'sd'>('hd');
  const [showControls, setShowControls] = useState(true);
  const [centerFeedback, setCenterFeedback] = useState<{ icon: 'play' | 'pause' | 'speed' | 'camera' | 'flip' | 'seek', text?: string } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Similar Recommendations
  const [similarVideos, setSimilarVideos] = useState<SearchResultItem[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Determine current active URL based on quality selector
  const activeVideoUrl = qualityMode === 'sd' && originalItem?.sd_url ? originalItem.sd_url : (url || originalItem?.hd_url || '');

  const triggerFeedback = (icon: 'play' | 'pause' | 'speed' | 'camera' | 'flip' | 'seek', text?: string) => {
    setCenterFeedback({ icon, text });
    setTimeout(() => setCenterFeedback(null), 700);
  };

  // Reset states on open/video change
  useEffect(() => {
    if (open) {
      setIsPlaying(true);
      setCurrentTime(0);
      setPlaybackSpeed(1.0);
      setIsFlipped(false);
      setShowSpeedMenu(false);
      setQualityMode('hd');
    }
  }, [open, url]);

  // Load Similar Videos
  useEffect(() => {
    if (open && (tags.length > 0 || userName)) {
      setLoadingSimilar(true);
      const query = tags[0] || userName || 'trending';
      searchVideosExtended(query, 8, 1)
        .then(res => {
          const filtered = res.items.filter(item => item.id !== originalItem?.id).slice(0, 4);
          setSimilarVideos(filtered);
        })
        .catch(() => setSimilarVideos([]))
        .finally(() => setLoadingSimilar(false));
    } else {
      setSimilarVideos([]);
    }
  }, [open, url, tags, userName, originalItem?.id]);

  // Dialog open management
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // fallback
        }
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        triggerFeedback('play');
      }).catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().then(() => {
          setIsPlaying(true);
          triggerFeedback('play');
        }).catch(() => {});
      });
    } else {
      video.pause();
      setIsPlaying(false);
      triggerFeedback('pause');
    }
  }, []);

  // Jump Time (-5s / +5s)
  const jumpTime = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = newTime;
    triggerFeedback('seek', `${seconds > 0 ? '+' : ''}${seconds}s`);
  }, []);

  // Handle Volume Change
  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      handleVolumeChange(0.5);
    }
  };

  // Set Playback Speed
  const handleSetSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    triggerFeedback('speed', `${speed}x`);
    showToast?.(`Velocidad: ${speed}x`);
  };

  // Toggle Flip Horizontal
  const toggleFlip = () => {
    setIsFlipped(prev => !prev);
    triggerFeedback('flip', !isFlipped ? 'Espejo ON' : 'Espejo OFF');
    showToast?.(!isFlipped ? 'Modo Espejo activado' : 'Modo normal restaurado');
  };

  // Toggle Picture-in-Picture
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showToast?.('Saliste de Picture-in-Picture');
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        showToast?.('Modo Picture-in-Picture activado');
      }
    } catch (err: any) {
      showToast?.(`PiP no soportado: ${err.message}`);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Frame Capture / Snapshot (Camera Screenshot in HD)
  const handleSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsCapturing(true);
    triggerFeedback('camera', 'Captura HD');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isFlipped) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const filename = `snapshot_${userName || 'redgifs'}_${Math.floor(video.currentTime)}s.png`;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast?.(`📸 Fotograma capturado en HD: ${filename}`);
      }
    } catch (e: any) {
      showToast?.(`Error en captura: ${e.message || 'CORS'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Download Video
  const handleDownload = async () => {
    if (!originalItem || isDownloading) return;
    setIsDownloading(true);
    showToast?.(`Descargando video de @${userName || 'redgifs'}...`);
    try {
      const info = await getVideoInfo(originalItem.id);
      const cleanUser = (userName || 'redgifs').replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${cleanUser}_${originalItem.id}_hd.mp4`;
      await downloadVideoFile(info.hd_url || originalItem.hd_url, filename);
      showToast?.(`¡Descargado con éxito!: ${filename}`);
      if (onSuccessDownload) {
        onSuccessDownload(info, 'hd', filename);
      }
    } catch (err: any) {
      showToast?.(`Error en descarga: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Auto-hide controls timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3000);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          jumpTime(-5);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          jumpTime(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'c':
        case 'C':
        case 's':
        case 'S':
          e.preventDefault();
          handleSnapshot();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          toggleFlip();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePiP();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, togglePlay, jumpTime, volume, isMuted, isFlipped, onClose]);

  if (!open) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={title || 'Reproductor Ultra-Pro'}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 w-full h-full max-w-none max-h-none border-none animate-fadeIn m-0 select-none"
    >
      <div className="bg-[#10121a] border border-white/10 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl flex flex-col max-h-[95vh]">
        {/* Cabecera Pro */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3 bg-[#131622]">
          <div className="flex items-center gap-2 min-w-0">
            {userName && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectCreator) onSelectCreator(userName);
                }}
                className="text-purple-300 hover:text-purple-100 font-bold text-xs flex items-center gap-1 bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-400/30 shrink-0 cursor-pointer transition-colors shadow-sm"
                title={`Ver perfil de @${userName}`}
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>@{userName}</span>
              </button>
            )}
            <span className="text-xs sm:text-sm font-bold text-slate-200 truncate" title={title}>
              {title || 'Reproducción Ultra-Pro'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Snapshot HD */}
            <button
              type="button"
              onClick={handleSnapshot}
              disabled={isCapturing}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Tomar Captura de Fotograma en HD (C / S)"
            >
              <Camera className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden md:inline">Captura</span>
            </button>

            {/* Favorito */}
            {originalItem && onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(originalItem)}
                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                  isFavorite && isFavorite(originalItem.id)
                    ? 'bg-pink-600/20 border-pink-500/40 text-pink-400'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-pink-400 border-white/10'
                }`}
                title={isFavorite && isFavorite(originalItem.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    isFavorite && isFavorite(originalItem.id) ? 'fill-pink-500 text-pink-500' : ''
                  }`}
                />
                <span className="hidden sm:inline">
                  {isFavorite && isFavorite(originalItem.id) ? 'Guardado' : 'Favorito'}
                </span>
              </button>
            )}

            {/* Modo Feed Reels */}
            {onOpenTheater && (
              <button
                type="button"
                onClick={onOpenTheater}
                className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-md shadow-red-500/20 active:scale-95 cursor-pointer"
                title="Ver este video en pantalla completa estilo Reels"
              >
                <Film className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reels</span>
              </button>
            )}

            {/* Descargar HD */}
            {originalItem && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold transition-all cursor-pointer flex items-center gap-1 text-xs"
                title="Descargar video original en HD"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">HD</span>
              </button>
            )}

            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar reproductor"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors duration-150 shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenedor del Reproductor Ultra-Pro */}
        <div
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          className="relative bg-black flex items-center justify-center overflow-hidden group min-h-[300px] max-h-[62vh]"
        >
          <video
            ref={videoRef}
            src={activeVideoUrl}
            autoPlay
            muted={isMuted}
            playsInline
            loop={isLooping}
            crossOrigin="anonymous"
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                setDuration(videoRef.current.duration || 0);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onDoubleClick={toggleFullscreen}
            onClick={togglePlay}
            className={`w-full max-h-[62vh] object-contain bg-black cursor-pointer transition-transform duration-200 ${
              isFlipped ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Feedback Visual Central */}
          {centerFeedback && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-scaleUp">
              <div className="bg-black/80 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-2xl">
                {centerFeedback.icon === 'play' && <Play className="w-6 h-6 fill-white" />}
                {centerFeedback.icon === 'pause' && <Pause className="w-6 h-6 fill-white" />}
                {centerFeedback.icon === 'speed' && <Gauge className="w-6 h-6 text-yellow-400" />}
                {centerFeedback.icon === 'camera' && <Camera className="w-6 h-6 text-yellow-400" />}
                {centerFeedback.icon === 'flip' && <FlipHorizontal2 className="w-6 h-6 text-purple-400" />}
                {centerFeedback.icon === 'seek' && <RotateCw className="w-6 h-6 text-red-400" />}
                {centerFeedback.text && (
                  <span className="text-xs font-black tracking-wider">{centerFeedback.text}</span>
                )}
              </div>
            </div>
          )}

          {/* Badges Flotantes de Calidad y Espejo */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
            <span className="text-[10px] font-black bg-red-600/90 text-white px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">
              {qualityMode.toUpperCase()}
            </span>
            {isFlipped && (
              <span className="text-[10px] font-bold bg-purple-600/90 text-white px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">
                ESPEJO
              </span>
            )}
            {playbackSpeed !== 1.0 && (
              <span className="text-[10px] font-bold bg-yellow-600/90 text-white px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">
                {playbackSpeed}x
              </span>
            )}
          </div>

          {/* Barra de Controles Ultra-Pro Personalizada */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 z-20 transition-all duration-300 ${
              showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Scrubber / Barra de Progreso */}
            <div className="relative group/scrubber mb-2 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }
                }}
                className="w-full h-1.5 hover:h-2.5 bg-white/20 accent-red-500 rounded-full cursor-pointer transition-all appearance-none"
              />
            </div>

            {/* Fila de Botoneras y Ajustes */}
            <div className="flex items-center justify-between gap-2 text-white">
              {/* Controles Izquierda: Play, Salto 5s, Volumen, Tiempo */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                  title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => jumpTime(-5)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Retroceder 5s (← / J)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => jumpTime(5)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Adelantar 5s (→ / L)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volumen */}
                <div className="flex items-center gap-1 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                    title={isMuted ? 'Activar sonido (M)' : 'Silenciar (M)'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-14 sm:w-18 h-1 bg-white/30 accent-emerald-500 rounded-full cursor-pointer transition-all"
                  />
                </div>

                {/* Timestamp */}
                <div className="text-[11px] font-mono text-slate-300 font-medium pl-1">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controles Derecha: Velocidad, Espejo, Calidad, PiP, Fullscreen */}
              <div className="flex items-center gap-1 sm:gap-1.5 relative">
                {/* Menú de Velocidad */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                      playbackSpeed !== 1.0
                        ? 'bg-yellow-600/30 border-yellow-500/50 text-yellow-300'
                        : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-300'
                    }`}
                    title="Velocidad de reproducción"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{playbackSpeed}x</span>
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#12141c] border border-white/15 rounded-xl shadow-2xl p-1.5 min-w-[100px] flex flex-col gap-0.5 z-40 animate-fadeIn">
                      <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 border-b border-white/10 mb-1">
                        VELOCIDAD
                      </span>
                      {PLAYBACK_SPEEDS.map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => handleSetSpeed(sp)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                            playbackSpeed === sp
                              ? 'bg-red-600 text-white font-bold'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span>{sp}x</span>
                          {playbackSpeed === sp && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alternar Calidad HD / SD */}
                {originalItem?.sd_url && originalItem.sd_url !== originalItem.hd_url && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextQ = qualityMode === 'hd' ? 'sd' : 'hd';
                      setQualityMode(nextQ);
                      showToast?.(`Calidad cambiada a ${nextQ.toUpperCase()}`);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                      qualityMode === 'hd'
                        ? 'bg-red-600/30 border-red-500/50 text-red-300'
                        : 'bg-white/10 border-white/15 text-slate-300'
                    }`}
                    title="Alternar entre HD y SD"
                  >
                    {qualityMode.toUpperCase()}
                  </button>
                )}

                {/* Modo Espejo (Flip) */}
                <button
                  type="button"
                  onClick={toggleFlip}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isFlipped
                      ? 'bg-purple-600/40 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-300 hover:text-white'
                  }`}
                  title="Modo Espejo / Voltear horizontal (R)"
                >
                  <FlipHorizontal2 className="w-4 h-4" />
                </button>

                {/* Picture-in-Picture */}
                <button
                  type="button"
                  onClick={togglePiP}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Ventana flotante Picture-in-Picture (P)"
                >
                  <PictureInPicture2 className="w-4 h-4" />
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Pantalla Completa (F)"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Videos Similares y Recomendados */}
        {similarVideos.length > 0 && (
          <div className="p-3 border-t border-white/10 bg-[#0c0e15] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Recomendados para ti:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {similarVideos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSwitchVideo) {
                      onSwitchVideo(item);
                    }
                  }}
                  className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-black border border-white/10 hover:border-pink-500/50 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] text-white bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    <span className="truncate max-w-[70px]">@{item.userName}</span>
                    <span>{item.duration}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer con Atajos Rápidos y Etiquetas */}
        <div className="p-3 border-t border-white/10 bg-[#090a0f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Etiquetas */}
          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto no-scrollbar">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1 shrink-0">
                <Tag className="w-3 h-3 text-red-400" />
              </span>
              {tags.slice(0, 8).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSelectTag) onSelectTag(t);
                  }}
                  className="text-xs bg-red-600/10 hover:bg-red-600/25 border border-red-500/30 text-red-300 hover:text-white px-2 py-0.5 rounded-lg transition-all font-semibold cursor-pointer active:scale-95 flex items-center gap-1"
                  title={`Buscar videos con #${t}`}
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* Guía de Atajos de Teclado */}
          <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-mono shrink-0">
            <span><kbd className="px-1 py-0.5 bg-white/10 rounded">Espacio</kbd> Play</span>
            <span><kbd className="px-1 py-0.5 bg-white/10 rounded">C</kbd> Captura</span>
            <span><kbd className="px-1 py-0.5 bg-white/10 rounded">R</kbd> Espejo</span>
            <span><kbd className="px-1 py-0.5 bg-white/10 rounded">M</kbd> Mute</span>
            <span><kbd className="px-1 py-0.5 bg-white/10 rounded">F</kbd> Fullscreen</span>
          </div>
        </div>
      </div>
    </dialog>
  );
};
