import React, { useEffect, useRef } from 'react';
import { Search, Plus, Minus, Copy, ExternalLink, X } from 'lucide-react';

interface TagActionMenuProps {
  tag: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onSearchOnly: (tag: string) => void;
  onAddToSearch?: (tag: string) => void;
  onExcludeTag?: (tag: string) => void;
  showToast?: (msg: string) => void;
}

export const TagActionMenu: React.FC<TagActionMenuProps> = ({
  tag,
  position,
  onClose,
  onSearchOnly,
  onAddToSearch,
  onExcludeTag,
  showToast
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  // Ajustar coordenadas para no desbordar la pantalla
  const menuWidth = 220;
  const menuHeight = 180;
  const left = Math.min(Math.max(10, position.x), window.innerWidth - menuWidth - 10);
  const top = Math.min(Math.max(10, position.y), window.innerHeight - menuHeight - 10);

  const handleCopy = () => {
    navigator.clipboard.writeText(`#${tag}`);
    showToast?.(`Etiqueta #${tag} copiada`);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-56 bg-[#161824] border border-white/20 rounded-2xl shadow-2xl p-1.5 animate-fadeIn backdrop-blur-xl"
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 mb-1">
        <span className="text-xs font-black text-white truncate max-w-[150px]">
          #{tag}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 text-xs font-semibold text-slate-300">
        <button
          type="button"
          onClick={() => {
            onSearchOnly(tag);
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
        >
          <Search className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Buscar solo esta etiqueta</span>
        </button>

        {onAddToSearch && (
          <button
            type="button"
            onClick={() => {
              onAddToSearch(tag);
              onClose();
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors text-left cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Añadir a búsqueda (+{tag})</span>
          </button>
        )}

        {onExcludeTag && (
          <button
            type="button"
            onClick={() => {
              onExcludeTag(tag);
              onClose();
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-500/20 hover:text-red-300 transition-colors text-left cursor-pointer"
          >
            <Minus className="w-4 h-4 text-red-400 shrink-0" />
            <span>Excluir de búsqueda (-{tag})</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
        >
          <Copy className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Copiar nombre de etiqueta</span>
        </button>
      </div>
    </div>
  );
};
