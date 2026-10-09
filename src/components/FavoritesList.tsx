import React, { useState, useMemo, useRef } from 'react';
import {
  Heart,
  Play,
  Download,
  Trash2,
  Search,
  Filter,
  Film,
  Layers,
  FileDown,
  FileUp,
  Volume2,
  VolumeX,
  Clock,
  Eye,
  Tag,
  User,
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  Plus,
  Edit2,
  FolderPlus,
  ListPlus,
  MoveRight,
  Share2
} from 'lucide-react';
import { SearchResultItem, RedGifItem, CustomList } from '../types';
import { downloadVideoFile, getVideoInfo } from '../services/redgifs';

interface FavoritesListProps {
  lists: CustomList[];
  activeListId: string;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string, icon?: string, color?: string, description?: string) => string;
  onDeleteList: (listId: string) => void;
  onRenameList: (listId: string, name: string, icon?: string, color?: string) => void;
  onRemoveVideoFromList: (listId: string, videoId: string) => void;
  onOpenSaveToListModal: (video: SearchResultItem) => void;
  onOpenLightbox: (url: string, title: string, tags?: string[], userName?: string, originalItem?: SearchResultItem) => void;
  onOpenTheater?: (videos: SearchResultItem[], startIndex: number) => void;
  onSelectCreator?: (username: string) => void;
  onSelectTag?: (tag: string) => void;
  onSendToBatch?: (urls: string[]) => void;
  onSuccessDownload?: (video: RedGifItem, quality: string, filename: string) => void;
  onImportLists: (imported: CustomList[]) => void;
  onClearActiveList: (listId: string) => void;
  showToast: (msg: string) => void;
}

const EMOJI_OPTIONS = ['❤️', '⭐', '🔥', '💃', '🎬', '🏖️', '🏋️', '🎮', '🌌', '🎵', '🌸', '⚡', '👑', '💎', '🍿', '🍑'];
const COLOR_OPTIONS = [
  { id: 'pink', bg: 'bg-pink-600', ring: 'ring-pink-500', text: 'text-pink-400' },
  { id: 'purple', bg: 'bg-purple-600', ring: 'ring-purple-500', text: 'text-purple-400' },
  { id: 'red', bg: 'bg-red-600', ring: 'ring-red-500', text: 'text-red-400' },
  { id: 'emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-500', text: 'text-emerald-400' },
  { id: 'amber', bg: 'bg-amber-600', ring: 'ring-amber-500', text: 'text-amber-400' },
  { id: 'blue', bg: 'bg-blue-600', ring: 'ring-blue-500', text: 'text-blue-400' }
];

function getGridColsClass(cols: 2 | 3 | 4 | 5) {
  switch (cols) {
    case 2:
      return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    case 3:
      return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';
    case 4:
      return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    case 5:
      return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
    default:
      return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
  }
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  onDeleteList,
  onRenameList,
  onRemoveVideoFromList,
  onOpenSaveToListModal,
  onOpenLightbox,
  onOpenTheater,
  onSelectCreator,
  onSelectTag,
  onSendToBatch,
  onSuccessDownload,
  onImportLists,
  onClearActiveList,
  showToast
}) => {
  // Lista activa actual
  const currentList = useMemo(() => {
    return lists.find(l => l.id === activeListId) || lists[0] || {
      id: 'default',
      name: 'Favoritos',
      icon: '❤️',
      color: 'pink',
      createdAt: Date.now(),
      videos: []
    };
  }, [lists, activeListId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [audioFilter, setAudioFilter] = useState<'all' | 'audio' | 'mute'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'long'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'views' | 'likes' | 'duration'>('recent');

  // Modales de Lista
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('⭐');
  const [newListColor, setNewListColor] = useState('purple');

  const [isEditingList, setIsEditingList] = useState(false);
  const [editListName, setEditListName] = useState('');
  const [editListIcon, setEditListIcon] = useState('❤️');
  const [editListColor, setEditListColor] = useState('pink');

  // Selector de Columnas persistente (Default: 4 columnas)
  const [gridCols, setGridCols] = useState<2 | 3 | 4 | 5>(() => {
    try {
      const saved = localStorage.getItem('rg_grid_cols');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([2, 3, 4, 5].includes(parsed)) return parsed as 2 | 3 | 4 | 5;
      }
    } catch {}
    return 4;
  });

  const handleSetGridCols = (cols: 2 | 3 | 4 | 5) => {
    setGridCols(cols);
    localStorage.setItem('rg_grid_cols', cols.toString());
    showToast(`Diseño cambiado a ${cols} columnas`);
  };

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tags más frecuentes de la lista activa
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    currentList.videos.forEach(f => {
      (f.tags || []).forEach(t => {
        const clean = t.toLowerCase().trim();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(entry => entry[0]);
  }, [currentList.videos]);

  // Total de creadores únicos en la lista
  const uniqueCreatorsCount = useMemo(() => {
    const creators = new Set(currentList.videos.map(f => f.userName.toLowerCase()));
    return creators.size;
  }, [currentList.videos]);

  // Videos filtrados de la lista activa
  const filteredVideos = useMemo(() => {
    let list = [...currentList.videos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.userName.toLowerCase().includes(q) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    if (activeTag) {
      list = list.filter(item => item.tags && item.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()));
    }

    if (audioFilter === 'audio') {
      list = list.filter(item => !!item.hasAudio);
    } else if (audioFilter === 'mute') {
      list = list.filter(item => !item.hasAudio);
    }

    if (durationFilter === 'short') {
      list = list.filter(item => item.duration < 15);
    } else if (durationFilter === 'long') {
      list = list.filter(item => item.duration >= 30);
    }

    if (sortBy === 'recent') {
      // orden de inserción
    } else if (sortBy === 'oldest') {
      list.reverse();
    } else if (sortBy === 'views') {
      list.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'likes') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortBy === 'duration') {
      list.sort((a, b) => b.duration - a.duration);
    }

    return list;
  }, [currentList.videos, searchQuery, activeTag, audioFilter, durationFilter, sortBy]);

  // Crear Lista
  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newListName.trim();
    if (!clean) return;
    const newId = onCreateList(clean, newListIcon, newListColor);
    setNewListName('');
    setIsCreatingList(false);
    onSelectList(newId);
    showToast(`¡Lista "${clean}" creada con éxito!`);
  };

  // Abrir Modal de Edición
  const handleStartEditing = () => {
    setEditListName(currentList.name);
    setEditListIcon(currentList.icon || '📁');
    setEditListColor(currentList.color || 'purple');
    setIsEditingList(true);
  };

  const handleEditListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = editListName.trim();
    if (!clean) return;
    onRenameList(currentList.id, clean, editListIcon, editListColor);
    setIsEditingList(false);
    showToast(`Lista actualizada a "${clean}"`);
  };

  // Eliminar Lista con confirmación
  const handleDeleteCurrentList = () => {
    if (currentList.id === 'default') {
      showToast('La lista principal no puede ser eliminada');
      return;
    }
    if (window.confirm(`¿Estás seguro de que quieres eliminar la lista "${currentList.name}" con sus ${currentList.videos.length} videos?`)) {
      onDeleteList(currentList.id);
      showToast(`Lista "${currentList.name}" eliminada`);
    }
  };

  // Exportar Copia de Seguridad JSON de todas las listas
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lists, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `redgifs_colecciones_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Copia de seguridad descargada (${lists.length} listas con sus videos)`);
  };

  // Importar Copia de Seguridad JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Si es formato de listas múltiples
          if (parsed.length > 0 && parsed[0].videos && Array.isArray(parsed[0].videos)) {
            onImportLists(parsed as CustomList[]);
            showToast(`¡Importadas ${parsed.length} listas con éxito!`);
          } else if (parsed.length > 0 && parsed[0].id) {
            // Si era un backup clásico de array plano de favoritos
            const convertedList: CustomList = {
              id: 'imported_' + Date.now(),
              name: 'Importados ' + new Date().toLocaleDateString(),
              icon: '📥',
              color: 'emerald',
              createdAt: Date.now(),
              videos: parsed
            };
            onImportLists([convertedList]);
            showToast(`¡Importada 1 lista con ${parsed.length} videos!`);
          }
        }
      } catch (err) {
        showToast('Error al leer el archivo JSON de listas');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Copiar Enlace
  const handleCopyLink = (item: SearchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = item.watch_url || `https://www.redgifs.com/watch/${item.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    showToast('Enlace copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Descargar HD
  const handleDownloadHD = async (item: SearchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadingId === item.id) return;
    setDownloadingId(item.id);
    showToast(`Preparando descarga de @${item.userName}...`);
    try {
      const info = await getVideoInfo(item.id);
      const cleanUser = item.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'redgifs';
      const filename = `${cleanUser}_${item.id}_hd.mp4`;
      await downloadVideoFile(info.hd_url || item.hd_url, filename);
      showToast(`¡Descargado con éxito!: ${filename}`);
      if (onSuccessDownload) {
        onSuccessDownload(info, 'hd', filename);
      }
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Enviar lista a Descarga Masiva
  const handleSendAllToBatch = () => {
    if (filteredVideos.length === 0) return;
    const urls = filteredVideos.map(f => f.watch_url || `https://www.redgifs.com/watch/${f.id}`);
    if (onSendToBatch) {
      onSendToBatch(urls);
      showToast(`${urls.length} videos de "${currentList.name}" enviados a Descarga por Lotes`);
    }
  };

  const totalVideosAllLists = useMemo(() => {
    return lists.reduce((acc, l) => acc + l.videos.length, 0);
  }, [lists]);

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Selector de Listas / Pestañas de Colecciones */}
      <div className="bg-[#12141c] border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-red-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/30">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display text-white flex items-center gap-2">
                <span>Mis Listas & Colecciones</span>
                <span className="text-xs bg-pink-500/20 text-pink-300 font-bold px-2 py-0.5 rounded-full border border-pink-500/30">
                  {lists.length} {lists.length === 1 ? 'lista' : 'listas'} ({totalVideosAllLists} guardados)
                </span>
              </h2>
              <p className="text-xs text-slate-400">Organiza tus videos favoritos por temática, creadores o categorías personalizadas.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCreatingList(true)}
              className="bg-gradient-to-r from-pink-600 via-purple-600 to-red-600 hover:opacity-95 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-pink-600/20 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Lista</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Descargar copia de seguridad de todas tus listas"
            >
              <FileDown className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Exportar JSON</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Importar listas desde archivo JSON"
            >
              <FileUp className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Importar</span>
            </button>
          </div>
        </div>

        {/* Carrusel / Barra Horizontal de Listas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {lists.map((list) => {
            const isActive = list.id === currentList.id;

            return (
              <button
                key={list.id}
                type="button"
                onClick={() => {
                  onSelectList(list.id);
                  setSearchQuery('');
                  setActiveTag(null);
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white border-transparent shadow-lg shadow-pink-600/30 scale-105'
                    : 'bg-black/40 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                <span className="text-base">{list.icon || '📁'}</span>
                <span className="truncate max-w-[140px]">{list.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                }`}>
                  {list.videos.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cabecera & Acciones de la Lista Seleccionada */}
      <div className="bg-gradient-to-r from-[#181326] via-[#12141c] to-[#181326] border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-purple-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-black/50 border-2 border-purple-500/40 flex items-center justify-center text-3xl shadow-xl shrink-0">
            {currentList.icon || '📁'}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black font-display text-white truncate">
                {currentList.name}
              </h1>
              {currentList.id !== 'default' && (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  aria-label="Editar nombre de la lista"
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Editar nombre e icono"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{currentList.videos.length} {currentList.videos.length === 1 ? 'video' : 'videos'}</span>
              <span>•</span>
              <span>{uniqueCreatorsCount} creadores</span>
              {currentList.description && (
                <>
                  <span>•</span>
                  <span className="text-slate-300 italic truncate max-w-sm">{currentList.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Acción sobre la Lista Activa */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {currentList.videos.length > 0 && onOpenTheater && (
            <button
              type="button"
              onClick={() => onOpenTheater(filteredVideos, 0)}
              className="flex-1 md:flex-initial bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/30 transition-transform active:scale-95 cursor-pointer"
              title="Reproducir todos los videos de esta lista en Feed Reels continuo"
            >
              <Film className="w-4 h-4" />
              <span>Ver Lista en Reels ({filteredVideos.length})</span>
            </button>
          )}

          {currentList.videos.length > 0 && onSendToBatch && (
            <button
              type="button"
              onClick={handleSendAllToBatch}
              className="flex-1 md:flex-initial bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="Enviar todos los videos de esta lista a descarga o compilación por lotes"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Descarga / Unión Masiva</span>
            </button>
          )}

          {currentList.id !== 'default' && (
            <button
              type="button"
              onClick={handleDeleteCurrentList}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
              title="Eliminar esta lista"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {currentList.videos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Vaciar todos los videos de "${currentList.name}"?`)) {
                  onClearActiveList(currentList.id);
                  showToast('Lista vaciada');
                }
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Vaciar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Barra de Búsqueda, Filtros y Columnas de la Lista Activa */}
      {currentList.videos.length > 0 && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Buscador interno */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar en "${currentList.name}" por título o creador...`}
                className="w-full bg-black/40 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 font-medium"
              />
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setAudioFilter(audioFilter === 'audio' ? 'all' : 'audio')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    audioFilter === 'audio' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudioFilter(audioFilter === 'mute' ? 'all' : 'mute')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    audioFilter === 'mute' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mudo
                </button>
                <button
                  type="button"
                  onClick={() => setDurationFilter(durationFilter === 'short' ? 'all' : 'short')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    durationFilter === 'short' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  &lt;15s
                </button>
              </div>

              {/* Selector de Columnas */}
              <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs">
                <span className="text-[10px] text-slate-500 font-bold px-1.5 hidden sm:inline">COLS:</span>
                {([2, 3, 4, 5] as const).map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => handleSetGridCols(cols)}
                    className={`px-2 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      gridCols === cols
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`${cols} columnas`}
                  >
                    {cols}
                  </button>
                ))}
              </div>

              {/* Ordenación */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Criterio de ordenación"
                className="bg-black/40 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-pink-500 font-semibold cursor-pointer"
              >
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="views">Más vistas</option>
                <option value="likes">Más likes</option>
                <option value="duration">Duración</option>
              </select>
            </div>
          </div>

          {/* Tags de la Lista */}
          {topTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-slate-500 font-semibold shrink-0 mr-1">Temas:</span>
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`px-2.5 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                  activeTag === null ? 'bg-pink-600 text-white font-bold' : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              {topTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    activeTag === tag ? 'bg-pink-600 text-white font-bold' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado Vacío de la Lista */}
      {currentList.videos.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-[#12141c] border border-white/10 rounded-3xl p-8 max-w-lg mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto text-2xl shadow-lg">
            {currentList.icon || '📁'}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-white">La lista "{currentList.name}" está vacía</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              Explora las secciones de Novedades o Explorar y pulsa el icono de corazón o "+ Lista" para organizar videos aquí.
            </p>
          </div>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#12141c] border border-white/10 rounded-2xl p-6">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">No hay coincidencias en esta lista</h4>
          <p className="text-slate-400 text-xs">Prueba a limpiar la barra de búsqueda o los filtros activos.</p>
        </div>
      ) : (
        /* Grid de Videos */
        <div className={getGridColsClass(gridCols)}>
          {filteredVideos.map((item, index) => {
            const isHovered = hoveredId === item.id;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="bg-[#12141c] rounded-2xl overflow-hidden border border-white/10 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-200 flex flex-col group relative"
              >
                {/* Botón Quitar de esta Lista */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveVideoFromList(currentList.id, item.id);
                    showToast(`Eliminado de "${currentList.name}"`);
                  }}
                  aria-label="Quitar de esta lista"
                  className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md text-pink-400 hover:text-red-400 hover:bg-black border border-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg"
                  title="Quitar de esta lista"
                >
                  <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
                </button>

                {/* Previsualización del Video */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Reproducir ${item.title}`}
                  onClick={() => onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item);
                    }
                  }}
                  className="relative aspect-[16/10] bg-black cursor-pointer overflow-hidden group/video"
                >
                  {isHovered && item.sd_url ? (
                    <video
                      src={item.sd_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover/video:scale-105 transition-transform duration-300"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white font-bold pointer-events-none">
                    <span className="bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-red-400" /> {item.duration}s
                    </span>
                    {item.hasAudio ? (
                      <span className="bg-emerald-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[10px]">
                        <Volume2 className="w-3 h-3" /> Audio
                      </span>
                    ) : (
                      <span className="bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[10px] text-slate-400">
                        Mudo
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-xl shadow-pink-600/40 transform scale-75 group-hover/video:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Datos del Video */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectCreator) onSelectCreator(item.userName);
                      }}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 truncate max-w-full cursor-pointer hover:underline"
                      title={`Ver creador @${item.userName}`}
                    >
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">@{item.userName}</span>
                    </button>

                    <h3 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug" title={item.title}>
                      {item.title}
                    </h3>

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.slice(0, 3).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              if (onSelectTag) onSelectTag(t);
                            }}
                            className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-2 py-0.5 rounded-md border border-white/5 transition-colors truncate max-w-[100px] cursor-pointer"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                    {/* Botón Guardar en otra Lista */}
                    <button
                      type="button"
                      onClick={() => onOpenSaveToListModal(item)}
                      className="p-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                      title="Gestionar en qué listas está este video"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">+ Lista</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadHD(item, e)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-md shadow-pink-600/20 cursor-pointer"
                      title="Descargar video original en HD"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>HD</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(item, e)}
                      aria-label="Copiar enlace del video"
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="Copiar enlace"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Inline para Crear Nueva Lista */}
      {isCreatingList && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleCreateListSubmit} className="bg-[#12141c] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-pink-400" />
                <span>Crear Nueva Lista Temática</span>
              </h3>
              <button type="button" onClick={() => setIsCreatingList(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">Nombre de la lista:</label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ej. Bailes Virales, Gym & Fitness, Modelos VIP..."
                autoFocus
                className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">Elige un Icono:</label>
              <div className="flex flex-wrap gap-2 p-2 bg-black/30 rounded-xl max-h-24 overflow-y-auto">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewListIcon(em)}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-transform ${
                      newListIcon === em ? 'bg-pink-600 scale-110 shadow-md' : 'hover:bg-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">Color identificador:</label>
              <div className="flex items-center gap-2.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewListColor(c.id)}
                    className={`w-7 h-7 rounded-full ${c.bg} transition-transform cursor-pointer ${
                      newListColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCreatingList(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-red-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-pink-600/30 cursor-pointer"
              >
                Crear Lista
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Inline para Editar Lista */}
      {isEditingList && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleEditListSubmit} className="bg-[#12141c] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-400" />
                <span>Editar Lista</span>
              </h3>
              <button type="button" onClick={() => setIsEditingList(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">Nombre de la lista:</label>
              <input
                type="text"
                value={editListName}
                onChange={(e) => setEditListName(e.target.value)}
                autoFocus
                className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">Icono:</label>
              <div className="flex flex-wrap gap-2 p-2 bg-black/30 rounded-xl max-h-24 overflow-y-auto">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEditListIcon(em)}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-transform ${
                      editListIcon === em ? 'bg-purple-600 scale-110 shadow-md' : 'hover:bg-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditingList(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-600/30 cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
