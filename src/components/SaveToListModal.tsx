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
  Smile,
  Globe,
  Lock,
  RefreshCw,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { CustomList, SearchResultItem, RedGifsUserAccount, RedGifsCollection } from '../types';

interface SaveToListModalProps {
  isOpen: boolean;
  video: SearchResultItem | null;
  lists: CustomList[];
  redGifsAccount?: RedGifsUserAccount | null;
  redGifsCollections?: RedGifsCollection[];
  isLoadingRedGifsCollections?: boolean;
  onClose: () => void;
  onToggleVideoInList: (listId: string, video: SearchResultItem) => void;
  onCreateList: (name: string, icon?: string, color?: string, description?: string) => string;
  onToggleVideoInRedGifsCollection?: (collectionId: string, video: SearchResultItem) => Promise<boolean>;
  onCreateRedGifsCollection?: (name: string, description?: string, isPrivate?: boolean) => Promise<void>;
  onOpenAccountModal?: () => void;
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
  redGifsAccount,
  redGifsCollections = [],
  isLoadingRedGifsCollections = false,
  onClose,
  onToggleVideoInList,
  onCreateList,
  onToggleVideoInRedGifsCollection,
  onCreateRedGifsCollection,
  onOpenAccountModal,
  showToast
}) => {
  // Pestaña activa dentro del modal: Si está conectado a RedGIFs, abrir por defecto en 'redgifs'
  const [activeSourceTab, setActiveSourceTab] = useState<'redgifs' | 'local'>(() => {
    return redGifsAccount ? 'redgifs' : 'local';
  });

  // Creación local
  const [isCreatingLocal, setIsCreatingLocal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('❤️');
  const [newListColor, setNewListColor] = useState('pink');

  // Creación en RedGIFs
  const [isCreatingRedGifs, setIsCreatingRedGifs] = useState(false);
  const [newRedGifsName, setNewRedGifsName] = useState('');
  const [newRedGifsDesc, setNewRedGifsDesc] = useState('');
  const [newRedGifsPrivate, setNewRedGifsPrivate] = useState(false);
  const [isSavingRedGifs, setIsSavingRedGifs] = useState(false);

  // Estado de carga por colección al añadir/quitar
  const [togglingCollId, setTogglingCollId] = useState<string | null>(null);
  // Rastreo local de IDs de colecciones donde se ha añadido en esta sesión
  const [addedCollectionIds, setAddedCollectionIds] = useState<Set<string>>(new Set());

  if (!isOpen || !video) return null;

  const handleCreateLocalAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newListName.trim();
    if (!cleanName) {
      showToast('Por favor escribe un nombre para la lista');
      return;
    }

    const createdId = onCreateList(cleanName, newListIcon, newListColor);
    onToggleVideoInList(createdId, video);
    setNewListName('');
    setIsCreatingLocal(false);
    showToast(`¡Lista local "${cleanName}" creada y video añadido!`);
  };

  const handleCreateRedGifsAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newRedGifsName.trim();
    if (!cleanName) {
      showToast('Por favor escribe un nombre para la lista de RedGIFs');
      return;
    }

    if (!onCreateRedGifsCollection) return;

    setIsSavingRedGifs(true);
    try {
      await onCreateRedGifsCollection(cleanName, newRedGifsDesc.trim(), newRedGifsPrivate);
      setNewRedGifsName('');
      setNewRedGifsDesc('');
      setIsCreatingRedGifs(false);
      showToast(`¡Lista "${cleanName}" creada en tu cuenta de RedGIFs!`);
    } catch (err: any) {
      showToast(err.message || 'Error al crear lista en RedGIFs');
    } finally {
      setIsSavingRedGifs(false);
    }
  };

  const handleToggleRedGifsColl = async (collectionId: string, collName: string) => {
    if (!onToggleVideoInRedGifsCollection) return;
    setTogglingCollId(collectionId);
    try {
      const isNowAdded = await onToggleVideoInRedGifsCollection(collectionId, video);
      setAddedCollectionIds(prev => {
        const next = new Set(prev);
        if (isNowAdded) next.add(collectionId);
        else next.delete(collectionId);
        return next;
      });
      showToast(
        isNowAdded
          ? `¡Añadido a "${collName}" en RedGIFs! 🎉`
          : `Eliminado de "${collName}" en RedGIFs`
      );
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar lista de RedGIFs');
    } finally {
      setTogglingCollId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#12141c] border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-purple-950/40 animate-scaleUp flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/30 via-purple-950/30 to-pink-950/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
              <ListPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">Guardar en Lista</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                {video.title || `@${video.userName}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Selección: Cuenta RedGIFs vs Listas Locales */}
        <div className="px-4 pt-3 pb-1 border-b border-white/5 flex gap-1.5 shrink-0 bg-black/20">
          <button
            type="button"
            onClick={() => setActiveSourceTab('redgifs')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSourceTab === 'redgifs'
                ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Mi RedGIFs</span>
            {redGifsAccount && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
                {redGifsCollections.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSourceTab('local')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSourceTab === 'local'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Listas Locales</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
              {lists.length}
            </span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {/* ================= PESTAÑA REDGIFS ================= */}
          {activeSourceTab === 'redgifs' && (
            <div className="space-y-3">
              {redGifsAccount ? (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="font-bold flex items-center gap-1 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      Cuenta: @{redGifsAccount.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingRedGifs(!isCreatingRedGifs)}
                      className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva Lista</span>
                    </button>
                  </div>

                  {/* Formulario Crear en RedGIFs */}
                  {isCreatingRedGifs && (
                    <form
                      onSubmit={handleCreateRedGifsAndAdd}
                      className="p-3.5 rounded-2xl bg-black/40 border border-pink-500/40 space-y-2.5 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-pink-300 flex items-center gap-1">
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>Nueva Lista en RedGIFs</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingRedGifs(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                      </div>

                      <input
                        type="text"
                        value={newRedGifsName}
                        onChange={(e) => setNewRedGifsName(e.target.value)}
                        placeholder="Nombre de la lista (ej. Favoritos)..."
                        autoFocus
                        className="w-full bg-[#12141c] border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 font-medium"
                      />

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={newRedGifsPrivate}
                          onChange={(e) => setNewRedGifsPrivate(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-pink-600 focus:ring-pink-500 border-white/20 bg-black/40"
                        />
                        <span>Lista privada en RedGIFs</span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSavingRedGifs}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-xs shadow-md shadow-pink-600/20 hover:opacity-95 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingRedGifs ? 'Creando...' : 'Crear Lista en RedGIFs'}
                      </button>
                    </form>
                  )}

                  {/* Listado de Colecciones de RedGIFs */}
                  {isLoadingRedGifsCollections ? (
                    <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-pink-400" />
                      <span>Cargando tus listas de RedGIFs...</span>
                    </div>
                  ) : redGifsCollections.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/15 text-center space-y-2">
                      <p className="text-xs text-slate-300">
                        No tienes ninguna lista creada en tu cuenta de RedGIFs.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCreatingRedGifs(true)}
                        className="text-xs text-pink-400 font-bold hover:underline cursor-pointer"
                      >
                        + Crear tu primera lista oficial
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                      {redGifsCollections.map((coll) => {
                        const isToggling = togglingCollId === coll.folderId;
                        const isLocallyAdded = addedCollectionIds.has(coll.folderId);

                        return (
                          <button
                            key={coll.folderId}
                            type="button"
                            onClick={() => handleToggleRedGifsColl(coll.folderId, coll.folderName)}
                            disabled={isToggling}
                            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isLocallyAdded
                                ? 'bg-gradient-to-r from-red-600/20 via-pink-600/20 to-transparent border-pink-500/60 shadow-md'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl shrink-0">📁</span>
                              <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                                  <span>{coll.folderName}</span>
                                  {coll.published ? (
                                    <span title="Pública"><Globe className="w-3 h-3 text-slate-400 shrink-0" /></span>
                                  ) : (
                                    <span title="Privada"><Lock className="w-3 h-3 text-amber-400 shrink-0" /></span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {coll.totalItems} {coll.totalItems === 1 ? 'video' : 'videos'} en RedGIFs
                                </div>
                              </div>
                            </div>

                            {/* Estado / Checkbox */}
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                                isLocallyAdded
                                  ? 'bg-pink-600 border-pink-500 text-white shadow-sm shadow-pink-600/40'
                                  : 'border-white/30 bg-black/40'
                              }`}
                            >
                              {isToggling ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                              ) : isLocallyAdded ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Banner de Conexión a RedGIFs */
                <div className="p-5 rounded-2xl bg-gradient-to-b from-red-950/40 to-black/60 border border-pink-500/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-pink-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-pink-600/30">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">Conecta tu cuenta de RedGIFs</h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                      Inicia sesión para sincronizar las listas y carpetas que ya tienes en www.redgifs.com y guardar videos directamente en ellas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenAccountModal) onOpenAccountModal();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-pink-600/30 hover:opacity-95 transition-transform active:scale-95 cursor-pointer"
                  >
                    🔗 Conectar Cuenta en 10 segundos
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= PESTAÑA LOCAL ================= */}
          {activeSourceTab === 'local' && (
            <div className="space-y-3">
              <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                {lists.map((list) => {
                  const isIncluded = list.videos.some((v) => v.id === video.id);

                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => onToggleVideoInList(list.id, video)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isIncluded
                          ? 'bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-transparent border-purple-500/60 shadow-md'
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
                            ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-600/40'
                            : 'border-white/30 bg-black/40'
                        }`}
                      >
                        {isIncluded && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Formulario de Creación de Nueva Lista Local */}
              {isCreatingLocal ? (
                <form onSubmit={handleCreateLocalAndAdd} className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/40 space-y-3 mt-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <FolderPlus className="w-4 h-4" />
                      <span>Nueva Lista Local</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingLocal(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>

                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Nombre de la lista..."
                    autoFocus
                    className="w-full bg-[#12141c] border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 font-medium"
                  />

                  {/* Selector de Icono / Emoji */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Icono:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto p-1 bg-black/30 rounded-xl">
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

                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md shadow-purple-600/20 hover:opacity-95 transition-transform active:scale-95 cursor-pointer"
                  >
                    Crear y Guardar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingLocal(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-white/20 hover:border-purple-500/60 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white/5 hover:bg-white/10 mt-1"
                >
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>+ Crear Nueva Lista Local</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            {activeSourceTab === 'redgifs' ? '🌐 Sincronizado con redgifs.com' : '💾 Guardado en este navegador'}
          </span>
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
