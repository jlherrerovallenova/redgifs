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
  User,
  ExternalLink,
  Maximize2,
  Minimize2,
  Sparkles,
  Loader2,
  AlertCircle,
  Repeat,
  ArrowRight
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
  const [isMuted, setIsMuted] = useState(true); // Default muted to ensure 100% browser autoplay compliance
  const [autoAdvance, setAutoAdvance] = useState(false); // Mode: loop vs auto-advance
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoSrcFallback, setVideoSrcFallback] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});
  const [likeCountDelta, setLikeCountDelta] = useState<Record<string, number>>({});
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState<'play' | 'pause' | null>(null);
  const [downloading, setDownloading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const lastWheelTime = useRef<number>(0);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Sync initial index
  useEffect(() => {
    if (open) {
      const validIndex = Math.max(0, Math.min(videos.length - 1, initialIndex));
      setCurrentIndex(validIndex);
      setIsPlaying(true);
      setVideoError(null);
      setVideoSrcFallback(null);
    }
  }, [open, initialIndex, videos.length]);

  const currentVideo = videos[currentIndex] || null;
  const nextVideo = videos[currentIndex + 1] || null;
  const prevVideo = videos[currentIndex - 1] || null;

  // Determine current active video source URL
  const activeVideoUrl = videoSrcFallback || (currentVideo ? (currentVideo.hd_url || currentVideo.sd_url) : '');

  // Go next
  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
      setIsLoading(true);
      setVideoError(null);
      setVideoSrcFallback(null);
      setProgress(0);

      // Auto load more if near end
      if (currentIndex >= videos.length - 3 && hasMore && onLoadMore) {
        onLoadMore();
      }
    } else {
      showToast('¡Has llegado al final del feed!');
    }
  }, [currentIndex, videos.length, hasMore, onLoadMore, showToast]);

  // Go prev
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
      setIsLoading(true);
      setVideoError(null);
      setVideoSrcFallback(null);
      setProgress(0);
    }
  }, [currentIndex]);

  // Autoplay management when index or active url changes
  useEffect(() => {
    if (!open || !activeVideoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setVideoError(null);

    video.currentTime = 0;
    video.muted = isMuted;

    // Try playing
    const promise = video.play();
    if (promise !== undefined) {
      playPromiseRef.current = promise;
      promise
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          // If unmuted failed due to browser policy, fallback to muted play
          if (!video.muted) {
            video.muted = true;
            setIsMuted(true);
            video.play()
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch(() => {
                setIsPlaying(false);
                setIsLoading(false);
              });
          } else {
            setIsPlaying(false);
            setIsLoading(false);
          }
        });
    }
  }, [currentIndex, activeVideoUrl, open]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setShowCenterIcon('play');
        }).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => {
            setIsPlaying(true);
            setShowCenterIcon('play');
          }).catch(() => {});
        });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      setShowCenterIcon('pause');
    }

    setTimeout(() => setShowCenterIcon(null), 500);
  }, []);

  // Handle Mute toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Double tap / Click to like
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

  // Video error handling & source fallback
  const handleVideoError = () => {
    setIsLoading(false);
    if (!currentVideo) return;

    // Try fallback from HD to SD if not tried yet
    if (!videoSrcFallback && currentVideo.sd_url && currentVideo.sd_url !== currentVideo.hd_url) {
      setVideoSrcFallback(currentVideo.sd_url);
    } else {
      setVideoError('No se pudo cargar la reproducción de este video.');
    }
  };

  // Video playback ended
  const handleVideoEnded = () => {
    if (autoAdvance) {
      goToNext();
    } else {
      // Loop current video
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Download HD
  const handleDownloadHD = async () => {
    if (!currentVideo || downloading) return;
    setDownloading(true);
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
    } finally {
      setDownloading(false);
    }
  };

  // Copy Link
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

  // Fullscreen
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

  // Keyboard Shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
          toggleMute();
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
  }, [open, goToNext, goToPrev, togglePlay, onClose, isMuted, downloading]);

  // Debounced Wheel
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 400) return;

    if (Math.abs(e.deltaY) > 30) {
      lastWheelTime.current = now;
      if (e.deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - touchEndY;
    const deltaX = touchStartX.current - touchEndX;
    touchStartY.current = null;
    touchStartX.current = null;

    // Check vertical dominance
    if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Video Time Progress
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
    e.stopPropagation();
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, pos * duration));
  };

  if (!open || !currentVideo) return null;

  const currentLikes = (currentVideo.likes || 0) + (likeCountDelta[currentVideo.id] || 0);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-[#050608] text-white flex items-center justify-center select-none overflow-hidden animate-fadeIn"
    >
      {/* Background Ambient Glow */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-red-600/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 blur-[150px] rounded-full pointer-events-none" />

      {/* Preload adjacent videos */}
      {nextVideo && (
        <video
          src={nextVideo.hd_url || nextVideo.sd_url}
          preload="auto"
          className="hidden"
        />
      )}
      {prevVideo && (
        <video
          src={prevVideo.hd_url || prevVideo.sd_url}
          preload="auto"
          className="hidden"
        />
      )}

      {/* Top Bar Header */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-bold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent font-extrabold">
              Modo Feed Reels
            </span>
          </div>

          <span className="text-xs font-bold text-slate-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow">
            {currentIndex + 1} / {videos.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Auto-advance vs Loop */}
          <button
            type="button"
            onClick={() => {
              setAutoAdvance(!autoAdvance);
              showToast(
                !autoAdvance
                  ? 'Modo Continuo: Avanza automáticamente al siguiente video'
                  : 'Modo Bucle: Repite el video actual'
              );
            }}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md ${
              autoAdvance
                ? 'bg-purple-600/80 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                : 'bg-black/60 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Cambiar entre bucle o avance automático"
          >
            {autoAdvance ? <ArrowRight className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{autoAdvance ? 'Auto-avance' : 'Bucle'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer hidden sm:flex shadow-md"
            title="Pantalla completa (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modo Feed"
            className="p-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:bg-red-600/90 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Video Card & Player Container */}
      <div className="relative w-full h-full max-w-lg max-h-[96vh] sm:max-h-[92vh] flex items-center justify-center p-2 sm:p-4 z-20">
        <div className="relative w-full h-full bg-black rounded-3xl overflow-hidden border border-white/15 shadow-2xl shadow-black/90 flex items-center justify-center">
          
          {/* Active Video Element */}
          {activeVideoUrl && !videoError && (
            <video
              ref={videoRef}
              key={`${currentVideo.id}_${activeVideoUrl}`}
              src={activeVideoUrl}
              autoPlay
              muted={isMuted}
              playsInline
              loop={!autoAdvance}
              crossOrigin="anonymous"
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => {
                setIsLoading(false);
                setIsPlaying(true);
              }}
              onCanPlay={() => setIsLoading(false)}
              onError={handleVideoError}
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* Fallback Error Display */}
          {videoError && (
            <div className="flex flex-col items-center justify-center p-6 text-center z-30 max-w-xs space-y-4">
              <AlertCircle className="w-12 h-12 text-red-400 animate-bounce" />
              <p className="text-sm text-slate-200 font-semibold">{videoError}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVideoError(null);
                    setVideoSrcFallback(currentVideo.sd_url || currentVideo.hd_url);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold cursor-pointer transition-colors"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold cursor-pointer transition-colors shadow-lg"
                >
                  Siguiente Video
                </button>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl">
                <Loader2 className="w-7 h-7 text-red-400 animate-spin" />
              </div>
            </div>
          )}

          {/* Tap/Click Area for Play/Pause & Double-tap Like */}
          <div
            onClick={togglePlay}
            onDoubleClick={handleDoubleTap}
            className="absolute inset-0 z-20 cursor-pointer"
            title="Toca para pausar/reproducir o doble tap para me gusta"
          />

          {/* Heart burst animation on double tap */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-ping">
              <Heart className="w-28 h-28 text-pink-500 fill-pink-500 drop-shadow-2xl" />
            </div>
          )}

          {/* Play / Pause Center Icon Feedback */}
          {showCenterIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
                {showCenterIcon === 'play' ? (
                  <Play className="w-8 h-8 fill-white ml-1 text-white" />
                ) : (
                  <Pause className="w-8 h-8 fill-white text-white" />
                )}
              </div>
            </div>
          )}

          {/* Floating Sound Banner (When video has audio but is muted) */}
          {currentVideo.hasAudio && isMuted && !isLoading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-black/80 hover:bg-black text-white border border-emerald-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold shadow-xl shadow-emerald-950/40 cursor-pointer animate-bounce transition-all hover:scale-105"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>🔊 Toca para activar sonido</span>
            </button>
          )}

          {/* Bottom Info Overlay */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30 space-y-2.5 pointer-events-auto"
          >
            {/* Creator and Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectCreator) onSelectCreator(currentVideo.userName);
                }}
                className="text-purple-300 hover:text-purple-100 font-black text-sm flex items-center gap-1.5 bg-purple-600/30 hover:bg-purple-600/50 px-3 py-1 rounded-full border border-purple-400/40 transition-colors cursor-pointer shadow-md"
              >
                <User className="w-3.5 h-3.5 text-purple-300" />
                <span>@{currentVideo.userName}</span>
              </button>

              <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-white/5">
                <Eye className="w-3 h-3 text-slate-400" />
                {currentVideo.views.toLocaleString()}
              </span>

              {currentVideo.hasAudio ? (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-[11px] text-emerald-300 bg-emerald-500/25 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold cursor-pointer hover:bg-emerald-500/40"
                >
                  {isMuted ? <VolumeX className="w-3 h-3 text-emerald-300" /> : <Volume2 className="w-3 h-3 text-emerald-300" />}
                  <span>{isMuted ? 'Mudo' : 'Audio ON'}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <VolumeX className="w-3 h-3" /> Sin audio
                </span>
              )}
            </div>

            {/* Video Title */}
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
              {currentVideo.title || `Video de @${currentVideo.userName}`}
            </h2>

            {/* Interactive Clickable Tags */}
            {currentVideo.tags && currentVideo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-16 overflow-y-auto no-scrollbar">
                {currentVideo.tags.slice(0, 6).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSelectTag) onSelectTag(t);
                    }}
                    className="text-xs bg-red-500/20 hover:bg-red-500/40 border border-red-500/35 text-red-200 hover:text-white px-2.5 py-0.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                    title={`Ver videos relacionados con #${t}`}
                  >
                    <span>#{t}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Interactive Progress Bar */}
            <div className="pt-2 space-y-1">
              <div
                role="slider"
                tabIndex={0}
                aria-label="Barra de reproducción de video"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                onClick={handleSeek}
                className="w-full h-2 bg-white/20 hover:h-3 rounded-full overflow-hidden cursor-pointer transition-all relative"
              >
                <div
                  className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-300 font-mono font-medium">
                <span>{Math.floor(currentTime)}s</span>
                <span>{Math.round(duration)}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Side Action Bar (TikTok / Reels Style) */}
        <div className="absolute right-4 sm:right-6 bottom-24 sm:bottom-28 z-40 flex flex-col items-center gap-3">
          {/* Like Button */}
          <button
            type="button"
            onClick={toggleLike}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border transition-all active:scale-90 cursor-pointer shadow-2xl ${
              isLiked[currentVideo.id]
                ? 'bg-pink-600 text-white border-pink-400 shadow-pink-600/40 scale-105'
                : 'bg-black/75 backdrop-blur-md text-white border-white/20 hover:bg-white/20'
            }`}
            title="Me gusta (Doble tap en video)"
          >
            <Heart className={`w-5 h-5 ${isLiked[currentVideo.id] ? 'fill-white' : ''}`} />
            <span className="text-[9px] font-bold mt-0.5">{currentLikes}</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="w-12 h-12 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-2xl"
            title={isMuted ? 'Activar sonido (M)' : 'Silenciar (M)'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Download HD */}
          <button
            type="button"
            onClick={handleDownloadHD}
            disabled={downloading}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white border border-red-400/50 flex flex-col items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-2xl shadow-red-600/30"
            title="Descargar HD (D)"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span className="text-[8px] font-black">HD</span>
              </>
            )}
          </button>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-12 h-12 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-2xl"
            title="Copiar enlace"
          >
            {copiedId === currentVideo.id ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Copy className="w-5 h-5 text-slate-300" />
            )}
          </button>

          {/* Direct Link on iOS */}
          {isIOS() && (
            <a
              href={currentVideo.hd_url || currentVideo.sd_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-purple-300 hover:bg-white/20 flex items-center justify-center transition-transform active:scale-90 shadow-2xl"
              title="Abrir enlace MP4 directo"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      {/* Side Navigation Buttons (Desktop Up / Down Arrows) */}
      <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 z-40">
        <button
          type="button"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95"
          title="Video anterior (Flecha Arriba ↑ / W)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={goToNext}
          disabled={currentIndex >= videos.length - 1}
          className="w-12 h-12 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95"
          title="Siguiente video (Flecha Abajo ↓ / S / Rueda ratón / Swipe)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Shortcuts Info for Desktop */}
      <div className="absolute bottom-3 left-6 hidden lg:flex items-center gap-3 text-[11px] text-slate-300 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg z-40">
        <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono text-white">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono text-white">↓</kbd> Navegar</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono text-white">Espacio</kbd> Pausar</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono text-white">M</kbd> Audio</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono text-white">D</kbd> Descarga HD</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono text-white">Doble clic</kbd> Like</span>
      </div>
    </div>
  );
};
