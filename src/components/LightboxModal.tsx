import React, { useEffect, useRef } from 'react';
import { X, Tag, User, Film, Heart } from 'lucide-react';
import { SearchResultItem } from '../types';

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
}

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
  isFavorite
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={title || 'Reproductor de video'}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 w-full h-full max-w-none max-h-none border-none animate-fadeIn m-0"
    >
      <div className="bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl flex flex-col">
        {/* Cabecera */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {userName && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectCreator) onSelectCreator(userName);
                }}
                className="text-purple-400 hover:text-purple-300 font-bold text-xs flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 shrink-0 cursor-pointer transition-colors"
                title={`Ver perfil de @${userName}`}
              >
                <User className="w-3.5 h-3.5" />
                <span>@{userName}</span>
              </button>
            )}
            <span className="text-sm font-bold text-slate-200 truncate">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
                  className={`w-4 h-4 ${
                    isFavorite && isFavorite(originalItem.id) ? 'fill-pink-500 text-pink-500' : ''
                  }`}
                />
                <span className="hidden sm:inline">
                  {isFavorite && isFavorite(originalItem.id) ? 'Guardado' : 'Favorito'}
                </span>
              </button>
            )}

            {onOpenTheater && (
              <button
                type="button"
                onClick={onOpenTheater}
                className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md shadow-red-500/20 active:scale-95 cursor-pointer"
                title="Ver este video en pantalla completa estilo Reels"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Modo Reels</span>
              </button>
            )}

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

        {/* Video */}
        <div className="relative bg-black flex items-center justify-center">
          <video
            src={url}
            controls
            autoPlay
            muted
            playsInline
            loop
            className="w-full max-h-[65vh] object-contain bg-black"
          />
        </div>

        {/* Footer con Etiquetas Interactivas */}
        {tags && tags.length > 0 && (
          <div className="p-3 border-t border-white/10 bg-[#0d0e14] flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3 text-red-400" />
              <span>Etiquetas relacionadas:</span>
            </span>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto max-h-20">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSelectTag) {
                      onSelectTag(t);
                    }
                  }}
                  className="text-xs bg-red-600/10 hover:bg-red-600/25 border border-red-500/30 text-red-300 hover:text-white px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer active:scale-95 flex items-center gap-1"
                  title={`Ver todos los videos relacionados con #${t}`}
                >
                  <span>#{t}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
};
