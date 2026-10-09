import React, { useState } from 'react';
import {
  X,
  Plus,
  Check,
  FolderPlus,
  ListPlus,
  Sparkles,
  Heart,
  Film,
  Music,
  Smile
} from 'lucide-react';
import { CustomList, SearchResultItem } from '../types';

interface SaveToListModalProps {
  isOpen: boolean;
  video: SearchResultItem | null;
  lists: CustomList[];
  onClose: () => void;
  onToggleVideoInList: (listId: string, video: SearchResultItem) => void;
  onCreateList: (name: string, icon?: string, color?: string, description?: string) => string;
  showToast: (msg: string) => void;
}

const EMOJI_OPTIONS = ['❤️', '⭐', '🔥', '💃', '🎬', '🏖️', '🏋️', '🎮', '🌌', '🎵', '🌸', '⚡', '👑', '💎', '🍿', '🍑'];
const COLOR_OPTIONS = [
  { id: 'pink', label: 'Rosa', bg: 'bg-pink-600', ring: 'ring-pink-500' },
  { id: 'purple', label: 'Morado', bg: 'bg-purple-600', ring: 'ring-purple-500' },
  { id: 'red', label: 'Rojo', bg: 'bg-red-600', ring: 'ring-red-500' },
  { id: 'emerald', label: 'Verde', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
  { id: 'amber', label: 'Ámbar', bg: 'bg-amber-600', ring: 'ring-amber-500' },
  { id: 'blue', label: 'Azul', bg: 'bg-blue-600', ring: 'ring-blue-500' }
];

export const SaveToListModal: React.FC<SaveToListModalProps> = ({
  isOpen,
  video,
  lists,
  onClose,
  onToggleVideoInList,
  onCreateList,
  showToast
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('❤️');
  const [newListColor, setNewListColor] = useState('pink');

  if (!isOpen || !video) return null;

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newListName.trim();
    if (!cleanName) {
      showToast('Por favor escribe un nombre para la lista');
      return;
    }

    const createdId = onCreateList(cleanName, newListIcon, newListColor);
    onToggleVideoInList(createdId, video);
    setNewListName('');
    setIsCreating(false);
    showToast(`¡Lista "${cleanName}" creada y video añadido!`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#12141c] border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-purple-950/40 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-pink-900/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Guardar en Lista</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                {video.title || `@${video.userName}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Playlists */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            {lists.map((list) => {
              const isIncluded = list.videos.some((v) => v.id === video.id);

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => onToggleVideoInList(list.id, video)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isIncluded
                      ? 'bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-transparent border-pink-500/60 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{list.icon || '📁'}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                        <span>{list.name}</span>
                        {list.id === 'default' && (
                          <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1.5 py-0.2 rounded font-bold">
                            Principal
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {list.videos.length} {list.videos.length === 1 ? 'video' : 'videos'}
                      </div>
                    </div>
                  </div>

                  {/* Checkbox Visual */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                      isIncluded
                        ? 'bg-pink-600 border-pink-500 text-white shadow-sm shadow-pink-600/40'
                        : 'border-white/30 bg-black/40'
                    }`}
                  >
                    {isIncluded && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Formulario de Creación de Nueva Lista */}
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="p-4 rounded-2xl bg-black/40 border border-purple-500/40 space-y-3 mt-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4" />
                  <span>Nueva Lista Personalizada</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {/* Nombre */}
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nombre de la lista (ej. Bailes, Top VIP, Modelos)..."
                autoFocus
                className="w-full bg-[#12141c] border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 font-medium"
              />

              {/* Selector de Icono / Emoji */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Elige un Icono:</span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-black/30 rounded-xl">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewListIcon(emoji)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-transform cursor-pointer ${
                        newListIcon === emoji ? 'bg-purple-600 scale-110 shadow-sm' : 'hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Color */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Color de Identificación:</span>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setNewListColor(color.id)}
                      className={`w-6 h-6 rounded-full ${color.bg} transition-transform cursor-pointer ${
                        newListColor === color.id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-xs shadow-md shadow-pink-600/20 hover:opacity-95 transition-transform active:scale-95 cursor-pointer"
              >
                Crear y Guardar Video
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-white/20 hover:border-pink-500/60 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white/5 hover:bg-white/10 mt-2"
            >
              <Plus className="w-4 h-4 text-pink-400" />
              <span>+ Crear Nueva Lista</span>
            </button>
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
