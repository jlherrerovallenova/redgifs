import React, { useState, useRef, useEffect, memo } from 'react';
import {
  Play,
  Volume2,
  VolumeX,
  Heart,
  Eye,
  Clock,
  CheckSquare,
  Square,
  Download,
  Ban,
  Film
} from 'lucide-react';
import { SearchResultItem, RedGifItem } from '../types';
import { getVideoInfo, downloadVideoFile } from '../services/redgifs';

export interface VideoCardProps {
  item: SearchResultItem;
  priority?: boolean;
  isSelected?: boolean;
  selectMode?: boolean;
  isFavorite?: boolean;
  onToggleSelect?: (id: string, e?: React.MouseEvent) => void;
  onOpenLightbox: (url: string, title: string, tags?: string[], userName?: string, originalItem?: SearchResultItem) => void;
  onToggleFavorite?: (video: SearchResultItem) => void;
  onSelectCreator?: (username: string) => void;
  onSelectTag?: (tag: string) => void;
  onBlockCreator?: (username: string) => void;
  onOpenTheater?: (videos: SearchResultItem[], startIndex: number) => void;
  onSuccessDownload?: (video: RedGifItem, quality: string, filename: string) => void;
  showToast?: (msg: string) => void;
  onTagMenuClick?: (tag: string, e: React.MouseEvent) => void;
}

export const VideoCard: React.FC<VideoCardProps> = memo(({
  item,
  priority = false,
  isSelected = false,
  selectMode = false,
  isFavorite = false,
  onToggleSelect,
  onOpenLightbox,
  onToggleFavorite,
  onSelectCreator,
  onSelectTag,
  onBlockCreator,
  onOpenTheater,
  onSuccessDownload,
  showToast,
  onTagMenuClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Addy Osmani Performance Rule: Debounced hover video mounting
  // Avoids firing heavy HTML5 video decoders when cursor rapidly sweeps across the grid
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.silent_url) {
      hoverTimeoutRef.current = window.setTimeout(() => {
        setIsVideoMounted(true);
      }, 180);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsVideoMounted(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    if (showToast) showToast(`Descargando video de @${item.userName}...`);
    try {
      const info = await getVideoInfo(item.id);
      const cleanUser = item.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'redgifs';
      const filename = `${cleanUser}_${item.id}_hd.mp4`;
      await downloadVideoFile(info.hd_url || item.hd_url, filename);
      if (showToast) showToast(`¡Descargado!: ${filename}`);
      if (onSuccessDownload) onSuccessDownload(info, 'hd', filename);
    } catch (err: any) {
      if (showToast) showToast(`Error en descarga: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`content-visibility-auto bg-[#12141c] rounded-2xl overflow-hidden border transition-transform duration-200 flex flex-col group relative ${
        isSelected
          ? 'border-purple-500 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30'
          : 'border-white/10 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10'
      }`}
    >
      {/* Checkbox de Selección Rápida */}
      {selectMode && (
        <button
          type="button"
          onClick={(e) => onToggleSelect && onToggleSelect(item.id, e)}
          aria-label={isSelected ? 'Deseleccionar video' : 'Seleccionar video'}
          className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-purple-400" />
          ) : (
            <Square className="w-5 h-5 text-slate-400" />
          )}
        </button>
      )}

      {/* Área de Previsualización (Aspect Ratio protegido para evitar CLS) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (selectMode && onToggleSelect) {
            onToggleSelect(item.id);
          } else {
            onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (selectMode && onToggleSelect) {
              onToggleSelect(item.id);
            } else {
              onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item);
            }
          }
        }}
        className="relative aspect-[16/10] bg-[#0d0f15] overflow-hidden cursor-pointer w-full text-left"
      >
        <img
          src={item.thumbnail_url}
          alt={item.title || 'Video thumbnail'}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchpriority: 'high' } as any : {})}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isVideoMounted && item.silent_url ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {isVideoMounted && item.silent_url && (
          <video
            src={item.silent_url}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}

        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-600/50 transform group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Badges Flotantes */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 pointer-events-none">
          {item.hasAudio ? (
            <span className="bg-black/80 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-500/30">
              <Volume2 className="w-3 h-3" /> Audio
            </span>
          ) : (
            <span className="bg-black/80 backdrop-blur-md text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-white/10">
              <VolumeX className="w-3 h-3" /> Mudo
            </span>
          )}
          <span className="bg-red-600/90 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
            HD
          </span>
        </div>

        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 pointer-events-none flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          {item.duration}s
        </div>
      </div>

      {/* Contenido / Metadatos */}
      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Creador & Métricas */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectCreator) onSelectCreator(item.userName);
                }}
                className="text-purple-400 hover:text-purple-300 font-bold truncate max-w-[120px] flex items-center gap-1 hover:underline cursor-pointer"
                title={`Ver perfil completo de @${item.userName}`}
              >
                @{item.userName}
              </button>
              {onBlockCreator && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`¿Bloquear permanentemente a @${item.userName}? No volverás a ver sus videos.`)) {
                      onBlockCreator(item.userName);
                    }
                  }}
                  className="p-0.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                  title={`Bloquear y no mostrar más a @${item.userName}`}
                >
                  <Ban className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3 text-slate-500" />
                {item.views.toLocaleString()}
              </span>
              {typeof item.likes === 'number' && item.likes > 0 && (
                <span className="flex items-center gap-0.5 text-pink-400/80">
                  <Heart className="w-3 h-3 fill-pink-500/20" />
                  {item.likes}
                </span>
              )}
            </div>
          </div>

          {/* Título */}
          <h3 className="text-xs font-bold text-slate-200 line-clamp-1 leading-snug" title={item.title}>
            {item.title}
          </h3>

          {/* Tags interactivos */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1.5">
              {item.tags.slice(0, 4).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTagMenuClick) {
                      onTagMenuClick(t, e);
                    } else if (onSelectTag) {
                      onSelectTag(t);
                    }
                  }}
                  className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-white px-2 py-0.5 rounded-md border border-red-500/20 hover:border-red-500/40 transition-colors font-medium truncate max-w-[120px] cursor-pointer active:scale-95 flex items-center gap-0.5"
                  title={`Buscar etiqueta #${t}`}
                >
                  <span>#{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item);
                }}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  isFavorite
                    ? 'bg-pink-600/20 border-pink-500/40 text-pink-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={isFavorite ? 'En tus favoritos' : 'Guardar en favoritos'}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-pink-500 text-pink-500' : ''}`} />
              </button>
            )}

            {onOpenTheater && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTheater([item], 0);
                }}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-purple-600/20 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Ver en Feed Reels Continuo"
              >
                <Film className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={downloading}
            onClick={handleQuickDownload}
            className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Descargar en HD"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{downloading ? 'Descargando...' : 'Descargar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

VideoCard.displayName = 'VideoCard';
