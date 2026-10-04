import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  Play,
  Volume2,
  VolumeX,
  Heart,
  Eye,
  Clock,
  Sparkles,
  Filter,
  CheckSquare,
  Square,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  List,
  Flame,
  Music,
  Share2,
  RefreshCw,
  FolderDown,
  X
} from 'lucide-react';
import { SearchResultItem, RedGifItem } from '../types';
import { searchVideosExtended, getVideoInfo, downloadVideoFile, saveVideoWithPicker } from '../services/redgifs';

interface ExploreSearchProps {
  onOpenLightbox: (url: string, title: string) => void;
  onSuccessDownload: (video: RedGifItem, quality: string, filename: string) => void;
  showToast: (msg: string) => void;
  onSendToBatch?: (urls: string[]) => void;
}

const POPULAR_TAGS = [
  { label: '🔥 Tendencias', query: 'trending' },
  { label: '🎵 Con Audio', query: 'sound' },
  { label: '⭐ Viral', query: 'viral' },
  { label: '💃 Baile', query: 'dance' },
  { label: '🏖️ Playa', query: 'beach' },
  { label: '🏋️ Fitness', query: 'fitness' },
  { label: '🎮 Gaming', query: 'gaming' },
  { label: '🚗 Coches', query: 'cars' },
  { label: '🌌 Anime', query: 'anime' },
  { label: '🎭 Cosplay', query: 'cosplay' },
  { label: '🐱 Mascotas', query: 'pets' },
  { label: '✨ Modelo', query: 'model' },
];

export const ExploreSearch: React.FC<ExploreSearchProps> = ({
  onOpenLightbox,
  onSuccessDownload,
  showToast,
  onSendToBatch
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('trending');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filtros y orden
  const [audioFilter, setAudioFilter] = useState<'all' | 'audio' | 'mute'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'views' | 'likes' | 'duration_desc' | 'duration_asc'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Selección múltiple para descarga por lotes
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Hover video preview activo
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Historial de búsquedas en localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rg_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  // Copiado temporal feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Carga inicial automática de tendencias
  useEffect(() => {
    executeSearch('trending', 1, false);
  }, []);

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('rg_recent_searches', JSON.stringify(updated));
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('rg_recent_searches', JSON.stringify(updated));
  };

  const executeSearch = async (query: string, page = 1, append = false) => {
    const term = query.trim() || 'trending';
    if (page === 1) {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await searchVideosExtended(term, 24, page);
      if (append) {
        setSearchResults(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = res.items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setSearchResults(res.items);
      }
      setCurrentPage(res.page);
      setTotalPages(res.pages);
      setTotalCount(res.total);
      if (!append && term !== 'trending') {
        saveRecentSearch(term);
      }
    } catch (err: any) {
      showToast('Error al conectar con el buscador de RedGIFs');
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchQuery.trim();
    if (!term) return;
    setActiveTag('');
    executeSearch(term, 1, false);
  };

  const handleTagClick = (tag: { label: string; query: string }) => {
    setActiveTag(tag.query);
    setSearchQuery(tag.query);
    executeSearch(tag.query, 1, false);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || currentPage >= totalPages) return;
    const term = searchQuery.trim() || activeTag || 'trending';
    executeSearch(term, currentPage + 1, true);
  };

  // Filtrado y ordenación en el cliente para respuesta instantánea
  const filteredResults = useMemo(() => {
    let list = [...searchResults];

    // Filtro Audio
    if (audioFilter === 'audio') {
      list = list.filter(item => item.hasAudio === true);
    } else if (audioFilter === 'mute') {
      list = list.filter(item => item.hasAudio === false);
    }

    // Filtro Duración
    if (durationFilter === 'short') {
      list = list.filter(item => item.duration < 15);
    } else if (durationFilter === 'medium') {
      list = list.filter(item => item.duration >= 15 && item.duration <= 30);
    } else if (durationFilter === 'long') {
      list = list.filter(item => item.duration > 30);
    }

    // Ordenación
    if (sortBy === 'views') {
      list.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'likes') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortBy === 'duration_desc') {
      list.sort((a, b) => b.duration - a.duration);
    } else if (sortBy === 'duration_asc') {
      list.sort((a, b) => a.duration - b.duration);
    }

    return list;
  }, [searchResults, audioFilter, durationFilter, sortBy]);

  // Manejo de Selección Múltiple
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredResults.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSendSelectedToBatch = () => {
    if (selectedIds.size === 0) return;
    const selectedUrls = searchResults
      .filter(item => selectedIds.has(item.id))
      .map(item => item.watch_url || `https://www.redgifs.com/watch/${item.id}`);

    if (onSendToBatch) {
      onSendToBatch(selectedUrls);
      showToast(`${selectedUrls.length} videos enviados a Descarga Masiva`);
    } else {
      navigator.clipboard.writeText(selectedUrls.join('\n'));
      showToast(`${selectedUrls.length} enlaces copiados al portapapeles`);
    }
  };

  // Descargas individuales directas
  const handleDownload = async (item: SearchResultItem, quality: 'hd' | 'sd', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showToast(`Preparando descarga de @${item.userName}...`);
    try {
      const info = await getVideoInfo(item.id);
      const url = quality === 'hd' ? info.hd_url : info.sd_url;
      const cleanUser = item.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'redgifs';
      const filename = `${cleanUser}_${item.id}_${quality}.mp4`;
      await downloadVideoFile(url, filename);
      showToast(`¡Descargado con éxito!: ${filename}`);
      onSuccessDownload(info, quality, filename);
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`);
    }
  };

  const handleCopyLink = async (item: SearchResultItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = item.watch_url || `https://www.redgifs.com/watch/${item.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(item.id);
      showToast('Enlace copiado al portapapeles');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('No se pudo copiar el enlace');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* Hero & Buscador Principal */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" /> EXPLORADOR PROFESIONAL REDGIFS
        </div>
        <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
          Busca cualquier video en máxima resolución
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm">
          Explora millones de videos, previsualiza con audio, filtra por duración o envía lotes enteros a compilar.
        </p>

        {/* Input de Búsqueda de Alta Gama */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center shadow-2xl shadow-red-600/10 rounded-2xl overflow-hidden border border-white/15 bg-[#12141c] focus-within:border-red-500/80 transition-all duration-300">
          <div className="pl-4 text-slate-400">
            <Search className="w-5 h-5 text-red-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tag, categoría, modelo, creador..."
            className="w-full bg-transparent px-3 py-3.5 text-sm sm:text-base outline-none text-white placeholder-slate-500 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                executeSearch('trending', 1, false);
              }}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching}
            className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white font-bold px-6 py-3.5 text-sm transition-transform active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Buscando...
              </span>
            ) : (
              'Buscar'
            )}
          </button>
        </form>

        {/* Historial de búsquedas recientes */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-500 font-medium mr-1">Recientes:</span>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchQuery(term);
                  executeSearch(term, 1, false);
                }}
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition-colors"
              >
                <span>{term}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => removeRecentSearch(term, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      removeRecentSearch(term, e as any);
                    }
                  }}
                  className="hover:text-red-400 cursor-pointer ml-0.5"
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Categorías y Tendencias Populares */}
        <div className="pt-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag.query}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                  activeTag === tag.query
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-transparent shadow-md shadow-red-500/20 scale-105'
                    : 'bg-[#12141c] hover:bg-white/10 text-slate-300 border-white/10 hover:border-white/20'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Ordenación y Vista */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-200">
              {filteredResults.length} {filteredResults.length === 1 ? 'video' : 'videos'}
            </span>
            {totalCount > 0 && (
              <span className="text-xs text-slate-400">
                (de {totalCount.toLocaleString()} disponibles)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle de Modo Selección */}
            <button
              type="button"
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) clearSelection();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                selectMode
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectMode ? 'Cancelar selección' : 'Seleccionar en lote'}</span>
            </button>

            {/* Toggle Filtros Avanzados */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                showFilters || audioFilter !== 'all' || durationFilter !== 'all' || sortBy !== 'relevance'
                  ? 'bg-red-600/20 text-red-400 border-red-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros {showFilters ? '▲' : '▼'}</span>
            </button>

            {/* Toggle Cuadrícula / Lista */}
            <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                title="Vista en cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                title="Vista compacta en lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Panel Desplegable de Filtros */}
        {showFilters && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Filtro Audio */}
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Audio:</span>
              <div className="flex rounded-lg bg-black/40 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setAudioFilter('all')}
                  className={`flex-1 py-1 rounded text-center transition-colors ${audioFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setAudioFilter('audio')}
                  className={`flex-1 py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${audioFilter === 'audio' ? 'bg-emerald-600/40 text-emerald-300 font-bold' : 'text-slate-400'}`}
                >
                  <Volume2 className="w-3 h-3" /> Con sonido
                </button>
                <button
                  type="button"
                  onClick={() => setAudioFilter('mute')}
                  className={`flex-1 py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${audioFilter === 'mute' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                >
                  <VolumeX className="w-3 h-3" /> Silencio
                </button>
              </div>
            </div>

            {/* Filtro Duración */}
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Duración:</span>
              <div className="flex rounded-lg bg-black/40 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setDurationFilter('all')}
                  className={`flex-1 py-1 rounded text-center transition-colors ${durationFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setDurationFilter('short')}
                  className={`flex-1 py-1 rounded text-center transition-colors ${durationFilter === 'short' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                >
                  &lt;15s
                </button>
                <button
                  type="button"
                  onClick={() => setDurationFilter('medium')}
                  className={`flex-1 py-1 rounded text-center transition-colors ${durationFilter === 'medium' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                >
                  15-30s
                </button>
                <button
                  type="button"
                  onClick={() => setDurationFilter('long')}
                  className={`flex-1 py-1 rounded text-center transition-colors ${durationFilter === 'long' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                >
                  &gt;30s
                </button>
              </div>
            </div>

            {/* Ordenación */}
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-black/40 border border-white/10 text-slate-200 py-1.5 px-3 rounded-lg outline-none font-medium cursor-pointer"
              >
                <option value="relevance">Relevancia</option>
                <option value="views">Más Vistos (Vistas)</option>
                <option value="likes">Más Valorados (Likes)</option>
                <option value="duration_desc">Mayor Duración</option>
                <option value="duration_asc">Menor Duración</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Videos */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResults.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isHovered = hoveredId === item.id;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`bg-[#12141c] rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col group relative ${
                  isSelected
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30'
                    : 'border-white/10 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10'
                }`}
              >
                {/* Checkbox de Selección Rápida */}
                {selectMode && (
                  <button
                    type="button"
                    onClick={(e) => toggleSelect(item.id, e)}
                    className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                )}

                {/* Área de Previsualización (Thumbnail / Video Hover) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(item.id);
                    } else {
                      onOpenLightbox(item.hd_url || item.sd_url, item.title);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (selectMode) {
                        toggleSelect(item.id);
                      } else {
                        onOpenLightbox(item.hd_url || item.sd_url, item.title);
                      }
                    }
                  }}
                  className="relative aspect-[16/10] bg-black overflow-hidden cursor-pointer w-full text-left"
                >
                  {/* Imagen Thumbnail */}
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      isHovered && item.silent_url ? 'opacity-0' : 'opacity-100'
                    }`}
                  />

                  {/* Video Preview al hacer Hover */}
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

                  {/* Botón Central de Play */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-600/50 transform group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badges Flotantes sobre el video */}
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(item.userName);
                          executeSearch(item.userName, 1, false);
                        }}
                        className="text-red-400 hover:text-red-300 font-bold truncate max-w-[130px] flex items-center gap-1"
                        title={`Buscar más de @${item.userName}`}
                      >
                        @{item.userName}
                      </button>
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
                        {item.tags.slice(0, 2).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(t);
                              executeSearch(t, 1, false);
                            }}
                            className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded-md border border-white/5 transition-colors truncate max-w-[110px]"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción */}
                  <div className="pt-2 flex items-center gap-1.5 border-t border-white/5">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(item, 'hd', e)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-red-500/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar HD
                    </button>

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
      ) : (
        /* Vista Compacta (List View) */
        <div className="space-y-2">
          {filteredResults.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`bg-[#12141c] border rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors ${
                  isSelected ? 'border-purple-500 bg-purple-950/20' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className="p-1 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-purple-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  )}

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenLightbox(item.hd_url || item.sd_url, item.title)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenLightbox(item.hd_url || item.sd_url, item.title);
                      }
                    }}
                    className="relative w-24 h-16 rounded-xl overflow-hidden bg-black shrink-0 cursor-pointer group"
                  >
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] px-1 rounded text-white font-bold">
                      {item.duration}s
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span className="text-red-400 font-semibold truncate">@{item.userName}</span>
                      <span>👁️ {item.views.toLocaleString()}</span>
                      {item.hasAudio && (
                        <span className="text-emerald-400 flex items-center gap-0.5 text-[11px]">
                          <Volume2 className="w-3 h-3" /> Audio
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(item, 'hd')}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> HD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(item)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón Cargar Más Videos */}
      {filteredResults.length > 0 && currentPage < totalPages && (
        <div className="text-center pt-6">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="bg-[#161a26] hover:bg-[#1e2333] border border-white/15 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition-all active:scale-95 shadow-lg shadow-black/40 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                <span>Cargando más videos...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-red-500" />
                <span>Cargar 24 videos más (Página {currentPage + 1} de {totalPages})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Barra Flotante de Acciones en Lote (Sticky Bottom Action Bar) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-gradient-to-r from-[#1b172a] via-[#1a1c2b] to-[#1b172a] border-2 border-purple-500/80 p-4 rounded-3xl shadow-2xl shadow-purple-950/60 backdrop-blur-xl animate-fadeIn flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
              {selectedIds.size}
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {selectedIds.size} {selectedIds.size === 1 ? 'video seleccionado' : 'videos seleccionados'}
              </div>
              <div className="text-[11px] text-purple-300">Listos para procesar</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSendSelectedToBatch}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <FolderDown className="w-4 h-4" />
              <span>Enviar a Descarga / Unión</span>
            </button>

            <button
              type="button"
              onClick={selectAllVisible}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Todos ({filteredResults.length})
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
              title="Deseleccionar todos"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
