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
  RefreshCw
} from 'lucide-react';
import { SearchResultItem, RedGifItem } from '../types';
import { downloadVideoFile, getVideoInfo } from '../services/redgifs';

interface FavoritesListProps {
  favorites: SearchResultItem[];
  onToggleFavorite: (video: SearchResultItem) => void;
  onOpenLightbox: (url: string, title: string, tags?: string[], userName?: string, originalItem?: SearchResultItem) => void;
  onOpenTheater?: (videos: SearchResultItem[], startIndex: number) => void;
  onSelectCreator?: (username: string) => void;
  onSelectTag?: (tag: string) => void;
  onSendToBatch?: (urls: string[]) => void;
  onSuccessDownload?: (video: RedGifItem, quality: string, filename: string) => void;
  onImportFavorites: (items: SearchResultItem[]) => void;
  onClearFavorites: () => void;
  showToast: (msg: string) => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  onToggleFavorite,
  onOpenLightbox,
  onOpenTheater,
  onSelectCreator,
  onSelectTag,
  onSendToBatch,
  onSuccessDownload,
  onImportFavorites,
  onClearFavorites,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [audioFilter, setAudioFilter] = useState<'all' | 'audio' | 'mute'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'long'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'views' | 'likes' | 'duration'>('recent');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract top tags from favorites
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    favorites.forEach(f => {
      (f.tags || []).forEach(t => {
        const clean = t.toLowerCase().trim();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(entry => entry[0]);
  }, [favorites]);

  // Unique creators count
  const uniqueCreatorsCount = useMemo(() => {
    const creators = new Set(favorites.map(f => f.userName.toLowerCase()));
    return creators.size;
  }, [favorites]);

  // Filtered and Sorted items
  const filteredFavorites = useMemo(() => {
    let list = [...favorites];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.userName.toLowerCase().includes(q) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Active Tag filter
    if (activeTag) {
      list = list.filter(item => item.tags && item.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()));
    }

    // Audio filter
    if (audioFilter === 'audio') {
      list = list.filter(item => !!item.hasAudio);
    } else if (audioFilter === 'mute') {
      list = list.filter(item => !item.hasAudio);
    }

    // Duration filter
    if (durationFilter === 'short') {
      list = list.filter(item => item.duration < 15);
    } else if (durationFilter === 'long') {
      list = list.filter(item => item.duration >= 30);
    }

    // Sorting
    if (sortBy === 'recent') {
      // already in insertion/recent order
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
  }, [favorites, searchQuery, activeTag, audioFilter, durationFilter, sortBy]);

  // Export JSON backup
  const handleExportJSON = () => {
    if (favorites.length === 0) {
      showToast('No tienes videos en favoritos para exportar');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(favorites, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `redgifs_favoritos_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Copia de seguridad descargada (${favorites.length} favoritos)`);
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportFavorites(parsed);
          showToast(`¡Importados ${parsed.length} favoritos con éxito!`);
        } else {
          showToast('El archivo no contiene un formato de favoritos válido');
        }
      } catch (err) {
        showToast('Error al leer el archivo JSON de favoritos');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Copy Link
  const handleCopyLink = (item: SearchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = item.watch_url || `https://www.redgifs.com/watch/${item.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    showToast('Enlace copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download single HD
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

  // Send all to batch
  const handleSendAllToBatch = () => {
    if (filteredFavorites.length === 0) return;
    const urls = filteredFavorites.map(f => f.watch_url || `https://www.redgifs.com/watch/${f.id}`);
    if (onSendToBatch) {
      onSendToBatch(urls);
      showToast(`${urls.length} favoritos enviados a Descarga por Lotes`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* Cabecera Principal de Favoritos */}
      <div className="bg-gradient-to-r from-[#171220] via-[#12141c] to-[#12141c] border border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-pink-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-pink-600 to-red-600 flex items-center justify-center shadow-lg shadow-pink-600/30 shrink-0">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
                  Mis Favoritos
                </h2>
                <span className="bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {favorites.length} guardados
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Colección personal guardada en tu navegador • {uniqueCreatorsCount} creadores únicos
              </p>
            </div>
          </div>

          {/* Acciones Globales */}
          <div className="flex items-center gap-2 flex-wrap">
            {favorites.length > 0 && onOpenTheater && (
              <button
                type="button"
                onClick={() => onOpenTheater(filteredFavorites, 0)}
                className="bg-gradient-to-r from-pink-600 to-red-600 hover:opacity-90 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-pink-600/20 active:scale-95 cursor-pointer"
                title="Reproducir todos los favoritos en pantalla completa modo Reels"
              >
                <Film className="w-4 h-4" />
                <span>Ver en Reels ({filteredFavorites.length})</span>
              </button>
            )}

            {favorites.length > 0 && onSendToBatch && (
              <button
                type="button"
                onClick={handleSendAllToBatch}
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Transferir todos los favoritos a la pestaña de descarga masiva"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Descargar Lote</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportJSON}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Descargar copia de seguridad de tus favoritos en formato .JSON"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cargar un archivo .JSON con favoritos guardados previamente"
            >
              <FileUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Importar</span>
            </button>

            {favorites.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que deseas eliminar TODOS tus videos favoritos?')) {
                    onClearFavorites();
                  }
                }}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-2 rounded-xl border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Vaciar la lista completa de favoritos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Buscador interno y filtros */}
        {favorites.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Barra de Búsqueda */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en tus favoritos por título, creador o etiqueta..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filtros Rápidos */}
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {/* Audio */}
                <div className="flex rounded-xl bg-black/40 p-0.5 border border-white/10 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setAudioFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${audioFilter === 'all' ? 'bg-pink-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioFilter('audio')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${audioFilter === 'audio' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    <Volume2 className="w-3 h-3" /> Audio
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioFilter('mute')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${audioFilter === 'mute' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                  >
                    <VolumeX className="w-3 h-3" /> Mudo
                  </button>
                </div>

                {/* Ordenación */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-black/40 border border-white/10 text-slate-300 text-xs py-1.5 px-3 rounded-xl outline-none font-medium cursor-pointer shrink-0"
                >
                  <option value="recent">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                  <option value="views">Más vistos</option>
                  <option value="likes">Más valorados</option>
                  <option value="duration">Mayor duración</option>
                </select>
              </div>
            </div>

            {/* Chips de Etiquetas Populares en Favoritos */}
            {topTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 font-semibold shrink-0 mr-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-pink-400" /> Tags:
                </span>
                {activeTag && (
                  <button
                    type="button"
                    onClick={() => setActiveTag(null)}
                    className="bg-pink-600 text-white px-2.5 py-0.5 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1"
                  >
                    <span>#{activeTag}</span>
                    <span>×</span>
                  </button>
                )}
                {topTags.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTag(activeTag === t ? null : t)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium border transition-colors shrink-0 ${
                      activeTag === t
                        ? 'bg-pink-600 text-white border-pink-500'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid de Videos Favoritos */}
      {favorites.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-[#12141c] border border-white/10 rounded-3xl p-8 max-w-2xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Aún no tienes videos favoritos</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
              Explora tendencias, creadores o realiza búsquedas y pulsa el icono de corazón ❤️ en cualquier video para guardarlo en tu colección personal.
            </p>
          </div>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#12141c] border border-white/10 rounded-2xl p-6">
          <Search className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No hay coincidencias en tus favoritos</h3>
          <p className="text-slate-400 text-xs">
            Prueba a cambiar los términos de búsqueda o a desactivar los filtros activos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFavorites.map((item, index) => {
            const isHovered = hoveredId === item.id;
            const isDownloading = downloadingId === item.id;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="bg-[#12141c] rounded-2xl overflow-hidden border border-white/10 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-200 flex flex-col group relative"
              >
                {/* Botón de Favorito Flotante (Siempre activo para quitar) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item);
                  }}
                  className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-pink-500/40 text-pink-400 hover:text-red-400 hover:scale-110 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer"
                  title="Eliminar de mis favoritos"
                >
                  <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
                </button>

                {/* Previsualización del Video */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item);
                    }
                  }}
                  className="relative aspect-[16/10] bg-black overflow-hidden cursor-pointer w-full text-left"
                >
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      isHovered && item.silent_url ? 'opacity-0' : 'opacity-100'
                    }`}
                  />

                  {isHovered && item.silent_url && (
                    <video
                      src={item.silent_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover z-10"
                    />
                  )}

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-xl shadow-pink-600/50 transform group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badges de Audio y Duración */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-10 pointer-events-none">
                    {item.hasAudio ? (
                      <span className="bg-black/80 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-500/30">
                        <Volume2 className="w-3 h-3" /> Audio
                      </span>
                    ) : (
                      <span className="bg-black/80 backdrop-blur-md text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-white/10">
                        <VolumeX className="w-3 h-3" /> Mudo
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 pointer-events-none flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    {item.duration}s
                  </div>
                </div>

                {/* Metadatos y Botones */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Creador y Vistas */}
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCreator) onSelectCreator(item.userName);
                        }}
                        className="text-purple-400 hover:text-purple-300 font-bold truncate max-w-[130px] flex items-center gap-1 hover:underline cursor-pointer"
                        title={`Ver perfil completo de @${item.userName}`}
                      >
                        @{item.userName}
                      </button>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3 text-slate-500" />
                          {item.views.toLocaleString()}
                        </span>
                        {typeof item.likes === 'number' && item.likes > 0 && (
                          <span className="flex items-center gap-0.5 text-pink-400">
                            <Heart className="w-3 h-3 fill-pink-500" />
                            {item.likes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Título */}
                    <h3 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug" title={item.title}>
                      {item.title}
                    </h3>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {item.tags.slice(0, 3).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTag) onSelectTag(t);
                            }}
                            className="text-[10px] bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 hover:text-white px-2 py-0.5 rounded-md border border-pink-500/20 transition-all font-medium truncate max-w-[110px] cursor-pointer"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="pt-2 flex items-center gap-1.5 border-t border-white/5">
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={(e) => handleDownloadHD(item, e)}
                      className="flex-1 bg-gradient-to-r from-pink-600 to-red-600 hover:opacity-90 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Descargar HD</span>
                    </button>

                    {onOpenTheater && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTheater(filteredFavorites, index);
                        }}
                        title="Ver en modo Reels a pantalla completa"
                        className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/30 hover:border-purple-400 transition-colors cursor-pointer"
                      >
                        <Film className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(item, e)}
                      title="Copiar enlace"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
