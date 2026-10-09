import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  CheckCircle2,
  Tv,
  Eye,
  Heart,
  Video,
  Users,
  Download,
  Play,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  Search,
  Filter,
  CheckSquare,
  Square,
  Copy,
  Check,
  RefreshCw,
  FolderDown,
  X,
  Flame,
  TrendingUp,
  Globe,
  Film,
  ArrowLeft,
  Ban,
  ShieldAlert
} from 'lucide-react';
import { SearchResultItem, RedGifItem, UserProfile } from '../types';
import {
  getCreatorFeed,
  fetchTopCreatorVideoUrls,
  searchCreatorsPaginated,
  getVideoInfo,
  downloadVideoFile
} from '../services/redgifs';

interface CreatorExplorerProps {
  onOpenLightbox: (url: string, title: string, tags?: string[], userName?: string, originalItem?: SearchResultItem) => void;
  onSuccessDownload: (video: RedGifItem, quality: string, filename: string) => void;
  showToast: (msg: string) => void;
  onSendToBatch: (urls: string[]) => void;
  initialUsername?: string;
  creatorTimestamp?: number;
  onSelectTag?: (tag: string) => void;
  onOpenTheater?: (videos: SearchResultItem[], startIndex: number) => void;
  onToggleFavorite?: (video: SearchResultItem) => void;
  isFavorite?: (id: string) => boolean;
  onGoBack?: () => void;
  canGoBack?: boolean;
  previousLabel?: string;
  onBlockCreator?: (username: string) => void;
  onUnblockCreator?: (username: string) => void;
  isCreatorBlocked?: (username: string) => boolean;
}

const FEATURED_CREATORS = [
  { username: 'namiblossom', label: '🌸 namiblossom' },
  { username: 'estefania_ray', label: '🔥 estefania_ray' },
  { username: 'ersties', label: '🎬 Ersties' },
  { username: 'brazzers', label: '⭐ Brazzers' },
  { username: 'candyai', label: '🤖 Candy AI' },
  { username: 'kgx333', label: '⚡ kgx333' },
  { username: 'xsofiax20', label: '✨ xsofiax20' },
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

export const CreatorExplorer: React.FC<CreatorExplorerProps> = ({
  onOpenLightbox,
  onSuccessDownload,
  showToast,
  onSendToBatch,
  initialUsername = 'namiblossom',
  creatorTimestamp,
  onSelectTag,
  onOpenTheater,
  onToggleFavorite,
  isFavorite,
  onGoBack,
  canGoBack,
  previousLabel,
  onBlockCreator,
  onUnblockCreator,
  isCreatorBlocked
}) => {
  const [usernameInput, setUsernameInput] = useState(initialUsername);
  const [activeUsername, setActiveUsername] = useState(initialUsername);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilingCount, setCompilingCount] = useState<number | null>(null);

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

  // Ordenación y filtros avanzados
  const [order, setOrder] = useState<'best' | 'recent' | 'trending'>('recent');
  const [sortType, setSortType] = useState<'recent' | 'longest' | 'shortest' | 'best' | 'views' | 'likes' | 'trending'>('recent');
  const [audioFilter, setAudioFilter] = useState<'all' | 'audio' | 'mute'>('all');
  const [hdOnlyFilter, setHdOnlyFilter] = useState(false);
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long' | 'ultralong'>('all');
  const [keywordFilter, setKeywordFilter] = useState('');

  // Búsqueda parcial y sugerencias en tiempo real
  const [matchingCreators, setMatchingCreators] = useState<UserProfile[]>([]);
  const [liveSuggestions, setLiveSuggestions] = useState<UserProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingMatching, setIsSearchingMatching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocompletado en vivo mientras se escribe el nombre o parte del nombre
  useEffect(() => {
    const clean = usernameInput.trim().replace(/^@/, '');
    if (clean.length < 2) {
      setLiveSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await searchCreatorsPaginated(clean, 6, 1);
        if (res.items.length > 0) {
          setLiveSuggestions(res.items);
          setShowSuggestions(true);
        } else {
          setLiveSuggestions([]);
        }
      } catch {
        setLiveSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [usernameInput]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selección múltiple
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Hover preview
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Historial de creadores buscados
  const [recentCreators, setRecentCreators] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rg_recent_creators') || '[]');
    } catch {
      return [];
    }
  });

  // Creadores favoritos guardados
  const [favoriteCreators, setFavoriteCreators] = useState<Array<{ username: string; name?: string; avatar?: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('rg_favorite_creators') || '[]');
    } catch {
      return [];
    }
  });

  const isCurrentCreatorFavorite = useMemo(() => {
    if (!profile) return false;
    const clean = profile.username.toLowerCase().trim();
    return favoriteCreators.some(c => c.username.toLowerCase().trim() === clean);
  }, [profile, favoriteCreators]);

  const handleToggleFavoriteCreator = () => {
    if (!profile) return;
    const clean = profile.username.trim();
    const exists = favoriteCreators.some(c => c.username.toLowerCase() === clean.toLowerCase());
    let updated: Array<{ username: string; name?: string; avatar?: string }>;

    if (exists) {
      updated = favoriteCreators.filter(c => c.username.toLowerCase() !== clean.toLowerCase());
      showToast(`@${clean} eliminado de tus creadores favoritos`);
    } else {
      const newFav = {
        username: clean,
        name: profile.name || clean,
        avatar: profile.profileImageUrl
      };
      updated = [newFav, ...favoriteCreators.filter(c => c.username.toLowerCase() !== clean.toLowerCase())];
      showToast(`¡@${clean} añadido a creadores favoritos! ❤️`);
    }

    setFavoriteCreators(updated);
    localStorage.setItem('rg_favorite_creators', JSON.stringify(updated));
  };

  const saveRecentCreator = (name: string) => {
    const clean = name.trim().replace(/^@/, '');
    if (!clean || clean.length < 2) return;
    const updated = [clean, ...recentCreators.filter(c => c.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    setRecentCreators(updated);
    localStorage.setItem('rg_recent_creators', JSON.stringify(updated));
  };

  const removeRecentCreator = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentCreators.filter(c => c !== name);
    setRecentCreators(updated);
    localStorage.setItem('rg_recent_creators', JSON.stringify(updated));
  };

  const handleSimpCitySearch = (query: string, e: React.MouseEvent) => {
    const clean = query.trim().replace(/^@/, '');
    const targetUrl = `https://simpcity.cr/search/?q=${encodeURIComponent(clean)}`;
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid) {
      e.preventDefault();
      // En Android intent directo al paquete de Aloha Browser con fallback
      window.location.href = `intent://simpcity.cr/search/?q=${encodeURIComponent(clean)}#Intent;scheme=https;package=com.aloha.browser;S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`;
    }
    showToast(`Buscando @${clean} en SimpCity...`);
  };

  // Cargar creador inicial o cuando cambia el timestamp
  useEffect(() => {
    if (initialUsername) {
      const clean = initialUsername.trim().replace(/^@/, '');
      setUsernameInput(clean);
      setActiveUsername(clean);
      loadCreator(clean, order, 1, false);
    }
  }, [initialUsername, creatorTimestamp]);

  const loadCreator = async (
    targetUser: string,
    sortOrder: 'best' | 'recent' | 'trending' = order,
    page = 1,
    append = false
  ) => {
    const clean = targetUser.trim().replace(/^@/, '');
    if (!clean) return;
    setShowSuggestions(false);

    if (page === 1) {
      setIsLoading(true);
      if (!append) setSelectedIds(new Set());
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await getCreatorFeed(clean, sortOrder, 24, page);
      if (res.user) {
        setProfile(res.user);
        setMatchingCreators([]);
      }
      if (append) {
        setVideos(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = res.items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setVideos(res.items);
      }
      setActiveUsername(clean);
      setCurrentPage(res.page);
      setTotalPages(res.pages);
      setTotalCount(res.total);
      if (!append) {
        saveRecentCreator(clean);
      }
    } catch (err: any) {
      // Si el creador exacto no existe o no tiene videos directos, buscar coincidencias parciales
      try {
        setIsSearchingMatching(true);
        const searchRes = await searchCreatorsPaginated(clean, 16, 1);
        if (searchRes.items.length > 0) {
          setMatchingCreators(searchRes.items);
          setProfile(null);
          setVideos([]);
          showToast(`Mostrando ${searchRes.items.length} creadores que coinciden con "${clean}"`);
          return;
        }
      } catch {}
      showToast(`No se encontró el creador @${clean}`);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsSearchingMatching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim().replace(/^@/, '');
    if (!clean) return;
    setShowSuggestions(false);
    loadCreator(clean, order, 1, false);
  };

  const handleSortChange = (newSort: 'recent' | 'longest' | 'shortest' | 'best' | 'views' | 'likes' | 'trending') => {
    setSortType(newSort);
    if (newSort === 'recent' || newSort === 'best' || newSort === 'trending') {
      setOrder(newSort);
      loadCreator(activeUsername, newSort, 1, false);
    }
  };

  const handleLoadMore = () => {
    if (isLoadingMore || currentPage >= totalPages) return;
    loadCreator(activeUsername, order, currentPage + 1, true);
  };

  // Filtrado reactivo en el cliente
  const filteredVideos = useMemo(() => {
    let list = [...videos];

    // 1. Búsqueda por palabra clave o etiqueta
    if (keywordFilter.trim()) {
      const q = keywordFilter.toLowerCase().trim();
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 2. Filtro de Audio
    if (audioFilter === 'audio') {
      list = list.filter(item => item.hasAudio === true);
    } else if (audioFilter === 'mute') {
      list = list.filter(item => item.hasAudio === false);
    }

    // 3. Filtro HD
    if (hdOnlyFilter) {
      list = list.filter(item => Boolean(item.hd_url));
    }

    // 4. Filtro de Duración
    if (durationFilter === 'short') {
      list = list.filter(item => item.duration < 15);
    } else if (durationFilter === 'medium') {
      list = list.filter(item => item.duration >= 15 && item.duration <= 30);
    } else if (durationFilter === 'long') {
      list = list.filter(item => item.duration > 30);
    } else if (durationFilter === 'ultralong') {
      list = list.filter(item => item.duration >= 60);
    }

    // 5. Ordenaciones especiales en cliente
    if (sortType === 'longest') {
      list.sort((a, b) => b.duration - a.duration);
    } else if (sortType === 'shortest') {
      list.sort((a, b) => a.duration - b.duration);
    } else if (sortType === 'views') {
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortType === 'likes') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return list;
  }, [videos, keywordFilter, audioFilter, hdOnlyFilter, durationFilter, sortType]);

  // Compilación rápida del perfil
  const handleQuickCompile = async (limit: number) => {
    if (isCompiling) return;
    setIsCompiling(true);
    setCompilingCount(limit);
    showToast(`Extrayendo los ${limit} mejores videos de @${activeUsername}...`);

    try {
      const urls = await fetchTopCreatorVideoUrls(activeUsername, limit);
      if (urls.length === 0) {
        showToast('No se encontraron videos para compilar.');
        return;
      }
      onSendToBatch(urls);
      showToast(`¡Listo! ${urls.length} videos transferidos a Descarga / Unión por Lotes.`);
    } catch (err: any) {
      showToast(`Error al compilar videos: ${err.message}`);
    } finally {
      setIsCompiling(false);
      setCompilingCount(null);
    }
  };

  // Selección múltiple manual
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
    setSelectedIds(new Set(filteredVideos.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSendSelectedToBatch = () => {
    if (selectedIds.size === 0) return;
    const selectedUrls = videos
      .filter(item => selectedIds.has(item.id))
      .map(item => item.watch_url || `https://www.redgifs.com/watch/${item.id}`);

    onSendToBatch(selectedUrls);
    showToast(`${selectedUrls.length} videos enviados a Descarga Masiva`);
  };

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
      {/* Botón de retroceso directo si venimos de otra búsqueda o pestaña */}
      {canGoBack && onGoBack && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all shadow-md hover:border-purple-500/40 active:scale-95 cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400 group-hover:-translate-x-1 transition-transform" />
            <span>Volver {previousLabel ? `a ${previousLabel}` : 'atrás'}</span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline ml-1 px-1.5 py-0.2 rounded bg-black/40 border border-white/10">Alt+←</span>
          </button>
        </div>
      )}

      {/* Buscador de Creadores */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wide">
          <User className="w-3.5 h-3.5" /> EXPLORADOR Y DESCARGADOR DE CREADORES
        </div>
        <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
          Catálogo Completo de @Creadores
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm">
          Explora perfiles verificados, filtra sus mejores producciones y descarga o compila decenas de videos en un solo clic.
        </p>

        {/* Input de Búsqueda de Usuario con Autocompletado en Vivo */}
        <div ref={searchContainerRef} className="relative z-30">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-2xl shadow-purple-600/10 rounded-2xl overflow-hidden border border-white/15 bg-[#12141c] focus-within:border-purple-500/80 transition-all duration-300">
            <div className="pl-4 text-purple-400 font-bold text-lg">
              @
            </div>
            <input
              type="text"
              value={usernameInput}
              aria-label="Nombre del creador a explorar"
              onChange={(e) => setUsernameInput(e.target.value)}
              onFocus={() => {
                if (liveSuggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Introduce nombre completo o parte del nombre (ej. nami, brazz, erst, candy)..."
              className="w-full bg-transparent px-3 py-3.5 text-sm sm:text-base outline-none text-white placeholder-slate-500 font-medium"
            />
            {usernameInput && (
              <button
                type="button"
                onClick={() => {
                  setUsernameInput('');
                  setLiveSuggestions([]);
                  setShowSuggestions(false);
                }}
                aria-label="Limpiar nombre del creador"
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || isSearchingMatching}
              aria-label="Explorar perfil del creador"
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:opacity-90 text-white font-bold px-6 py-3.5 text-sm transition-transform active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isLoading || isSearchingMatching ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Buscando...
                </span>
              ) : (
                'Buscar Creador'
              )}
            </button>
          </form>

          {/* Desplegable de Sugerencias en Vivo mientras se escribe */}
          {showSuggestions && liveSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#10121a]/98 backdrop-blur-2xl border border-purple-500/40 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn text-left max-h-80 overflow-y-auto">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 px-3 py-1 flex items-center justify-between border-b border-white/5 pb-1.5 mb-1">
                <span>Coincidencias para "{usernameInput}":</span>
                <span className="text-[10px] text-slate-400 font-mono">{liveSuggestions.length} encontrados</span>
              </div>
              <div className="space-y-1">
                {liveSuggestions.map((sug) => (
                  <button
                    key={sug.username}
                    type="button"
                    onClick={() => {
                      setUsernameInput(sug.username);
                      setShowSuggestions(false);
                      setMatchingCreators([]);
                      loadCreator(sug.username, order, 1, false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {sug.profileImageUrl ? (
                        <img
                          src={sug.profileImageUrl}
                          alt={sug.name || sug.username}
                          className="w-9 h-9 rounded-xl object-cover border border-purple-400/30 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-sm shrink-0">
                          {(sug.name || sug.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-white group-hover:text-purple-300 flex items-center gap-1 truncate">
                          <span>{sug.name || sug.username}</span>
                          {sug.verified && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-purple-400 font-mono truncate">
                          @{sug.username}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 shrink-0 ml-2">
                      <div className="font-semibold text-slate-300">{sug.followers.toLocaleString()} fans</div>
                      <div className="text-[10px] text-slate-500">{sug.gifs.toLocaleString()} videos</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Creadores Destacados / Populares */}
        <div className="pt-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
            <span className="text-xs text-slate-500 font-semibold shrink-0 mr-1">Populares:</span>
            {FEATURED_CREATORS.map((c) => (
              <button
                key={c.username}
                type="button"
                onClick={() => {
                  setUsernameInput(c.username);
                  loadCreator(c.username, order, 1, false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                  activeUsername.toLowerCase() === c.username.toLowerCase()
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md shadow-purple-500/20 scale-105'
                    : 'bg-[#12141c] hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Creadores Favoritos Guardados */}
        {favoriteCreators.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none justify-start sm:justify-center">
              <span className="text-xs text-pink-400 font-bold shrink-0 mr-1 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" /> Favoritos:
              </span>
              {favoriteCreators.map((fc) => (
                <button
                  key={fc.username}
                  type="button"
                  onClick={() => {
                    setUsernameInput(fc.username);
                    loadCreator(fc.username, order, 1, false);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border cursor-pointer flex items-center gap-1.5 ${
                    activeUsername.toLowerCase() === fc.username.toLowerCase()
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-transparent shadow-md shadow-pink-600/30 scale-105'
                      : 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border-pink-500/30'
                  }`}
                >
                  <span>@{fc.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Historial de creadores recientes */}
        {recentCreators.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium mr-1">Buscados:</span>
            {recentCreators.map((name) => (
              <div
                key={name}
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput(name);
                    loadCreator(name, order, 1, false);
                  }}
                  className="cursor-pointer font-medium hover:text-white"
                >
                  @{name}
                </button>
                <button
                  type="button"
                  onClick={(e) => removeRecentCreator(name, e)}
                  aria-label={`Eliminar @${name} del historial`}
                  className="hover:text-red-400 cursor-pointer ml-0.5 text-slate-400 hover:text-white px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección de Creadores Coincidentes por búsqueda parcial */}
      {matchingCreators.length > 0 && !profile && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-[#12141c] border border-purple-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm sm:text-base">
                  Creadores que coinciden con "{usernameInput}"
                </h3>
                <p className="text-xs text-slate-400">
                  Selecciona cualquiera de estos {matchingCreators.length} perfiles para ver su catálogo completo de videos:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {matchingCreators.map((creator) => (
              <div
                key={creator.username}
                onClick={() => {
                  setUsernameInput(creator.username);
                  setMatchingCreators([]);
                  loadCreator(creator.username, order, 1, false);
                }}
                className="bg-[#12141c] border border-white/10 hover:border-purple-500/60 rounded-2xl p-4 flex flex-col justify-between space-y-3 cursor-pointer group hover:shadow-xl hover:shadow-purple-950/30 transition-all active:scale-98"
              >
                <div className="flex items-start gap-3">
                  {creator.profileImageUrl ? (
                    <img
                      src={creator.profileImageUrl}
                      alt={creator.name || creator.username}
                      className="w-12 h-12 rounded-2xl object-cover border border-purple-400/30 shrink-0 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                      {(creator.name || creator.username).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1 group-hover:text-purple-300 truncate">
                      <span>{creator.name || creator.username}</span>
                      {creator.verified && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    </h4>
                    <p className="text-xs text-purple-400 font-mono truncate">@{creator.username}</p>
                    {creator.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                        {creator.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>{creator.followers.toLocaleString()} fans</span>
                  <span>{creator.gifs.toLocaleString()} videos</span>
                </div>

                <button
                  type="button"
                  className="w-full py-2 rounded-xl bg-purple-600/20 group-hover:bg-purple-600 text-purple-300 group-hover:text-white border border-purple-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Ver Catálogo Completo</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banner y Tarjeta de Perfil de Creador */}
      {profile && (
        <div className="bg-gradient-to-b from-[#161424] via-[#12141c] to-[#12141c] border border-purple-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl shadow-purple-950/40 space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-5 w-full">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 max-w-full flex-1">
              {/* Avatar con Anillo Glow */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-black/60 border-2 border-purple-500/50 shadow-xl shadow-purple-600/20 flex items-center justify-center">
                  {profile.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt={profile.name || profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                  )}
                </div>
                {profile.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 sm:p-1 rounded-full shadow-md shadow-blue-500/50" title="Creador Verificado">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-blue-500 text-white" />
                  </div>
                )}
              </div>

              {/* Datos y Badges */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-2xl font-black font-display text-white truncate max-w-full">
                    {profile.name || profile.username}
                  </h3>
                  {profile.verified && (
                    <span className="bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> VERIFICADO
                    </span>
                  )}
                  {profile.studio && (
                    <span className="bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Tv className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> ESTUDIO
                    </span>
                  )}
                </div>
                <div className="text-purple-400 text-xs sm:text-sm font-semibold truncate">
                  @{profile.username}
                </div>
                {profile.description && (
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-2 leading-relaxed pt-0.5">
                    {profile.description}
                  </p>
                )}
              </div>
            </div>

            {/* Enlaces Externos / Redes Sociales / Favorito / Bloquear / SimpCity */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto pt-2 lg:pt-0">
              {/* Botón de Bloquear / Desbloquear Creador */}
              {isCreatorBlocked && isCreatorBlocked(profile.username) ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onUnblockCreator) onUnblockCreator(profile.username);
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 bg-red-600/30 hover:bg-emerald-600/30 text-red-200 hover:text-emerald-200 border border-red-500/50 hover:border-emerald-500/50"
                  title="Creador bloqueado. Pulsa para desbloquearlo."
                >
                  <Ban className="w-4 h-4 text-red-400" />
                  <span>Bloqueado (Desbloquear)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de que deseas bloquear a @${profile.username}? No se volverán a mostrar sus videos ni perfil.`)) {
                      if (onBlockCreator) onBlockCreator(profile.username);
                    }
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 bg-white/5 hover:bg-red-600/20 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/40"
                  title="Bloquear permanentemente a este creador (no volver a ver sus videos)"
                >
                  <Ban className="w-4 h-4 text-slate-400 hover:text-red-400" />
                  <span>Bloquear Creador</span>
                </button>
              )}

              {/* Botón de Favorito del Creador */}
              <button
                type="button"
                onClick={handleToggleFavoriteCreator}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
                  isCurrentCreatorFavorite
                    ? 'bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/60 shadow-pink-600/20'
                    : 'bg-gradient-to-r from-pink-600 via-purple-600 to-rose-600 hover:opacity-90 text-white shadow-pink-600/30 border border-pink-500/30'
                }`}
                title={isCurrentCreatorFavorite ? 'Eliminar de creadores favoritos' : 'Añadir creador a favoritos'}
              >
                <Heart className={`w-4 h-4 ${isCurrentCreatorFavorite ? 'fill-pink-500 text-pink-500' : 'text-white'}`} />
                <span>{isCurrentCreatorFavorite ? 'Creador en Favoritos' : 'Añadir a Favoritos'}</span>
              </button>

              {profile.socialLinks && profile.socialLinks.map((link) => (
                <a
                  key={`${link.type}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{link.type}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                </a>
              ))}
              <a
                href={`https://simpcity.cr/search/?q=${encodeURIComponent(profile.name || profile.username)}`}
                onClick={(e) => handleSimpCitySearch(profile.name || profile.username, e)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Buscar ${profile.name || profile.username} en SimpCity`}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-xl border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-amber-500/10 active:scale-95 cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="sm:hidden">SimpCity</span>
                <span className="hidden sm:inline">Buscar en SimpCity</span>
                <ExternalLink className="w-3 h-3 text-amber-400/70 shrink-0" />
              </a>
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-1.5 rounded-xl border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <span>RedGIFs</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>

          {/* Estadísticas Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{profile.followers.toLocaleString()}</div>
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Seguidores</div>
              </div>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{profile.views.toLocaleString()}</div>
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Vistas Totales</div>
              </div>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{profile.gifs.toLocaleString()}</div>
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Videos Creados</div>
              </div>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{(profile.likes || 0).toLocaleString()}</div>
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Valoraciones</div>
              </div>
            </div>
          </div>

          {/* Supercompilador / Acciones Rápidas de Descarga Masiva */}
          <div className="bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-red-900/30 border border-purple-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-extrabold text-sm sm:text-base">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>Supercompilador de Perfil</span>
              </div>
              <p className="text-xs text-slate-300">
                Selecciona y envía automáticamente los mejores videos de @{profile.username} a la cola de unión o descarga.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleQuickCompile(10)}
                disabled={isCompiling}
                className="flex-1 md:flex-initial bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isCompiling && compilingCount === 10 ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Flame className="w-3.5 h-3.5 text-yellow-300" />
                )}
                <span>Top 10 Mejores</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCompile(20)}
                disabled={isCompiling}
                className="flex-1 md:flex-initial bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-pink-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isCompiling && compilingCount === 20 ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                <span>Top 20 Mejores</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCompile(50)}
                disabled={isCompiling}
                className="flex-1 md:flex-initial bg-gradient-to-r from-pink-600 to-red-600 hover:opacity-90 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isCompiling && compilingCount === 50 ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Top 50 Videos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Creador Bloqueado */}
      {profile && isCreatorBlocked && isCreatorBlocked(profile.username) && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/30 text-red-400 border border-red-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-300">Este creador está en tu lista de bloqueados</h4>
              <p className="text-xs text-slate-400">Sus videos están completamente ocultos de las búsquedas, feeds y recomendaciones.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onUnblockCreator) onUnblockCreator(profile.username);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            Desbloquear Creador
          </button>
        </div>
      )}

      {/* Barra de Filtros y Orden de Videos Avanzada */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-lg">
        {/* Fila 1: Pestañas de Ordenación (Más Nuevo, Más Largo, Más Corto, etc.) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Selector de Orden */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => handleSortChange('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                sortType === 'recent'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mostrar primero las publicaciones más recientes"
            >
              <Clock className="w-3.5 h-3.5 text-purple-300" />
              <span>Más Nuevo</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('longest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                sortType === 'longest'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ordenar por videos de mayor duración a menor duración"
            >
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span>Más Largo</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('shortest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                sortType === 'shortest'
                  ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ordenar por videos de menor duración (clips rápidos)"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Más Corto</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('best')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                sortType === 'best'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Más vistos y mejor valorados"
            >
              <Flame className="w-3.5 h-3.5 text-yellow-400" />
              <span>Top / Más Visto</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('likes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                sortType === 'likes'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ordenar por mayor cantidad de 'Me gusta'"
            >
              <Heart className="w-3.5 h-3.5 text-pink-300 fill-pink-400/40" />
              <span>Más Likes</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('trending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                sortType === 'trending'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tendencias del momento"
            >
              <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              <span>Tendencias</span>
            </button>
          </div>

          {/* Acciones y Modo Selección */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
            {onOpenTheater && filteredVideos.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenTheater(filteredVideos, 0)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white shadow-md shadow-purple-600/30 active:scale-95 cursor-pointer"
                title="Ver las publicaciones de este creador en Feed continuo"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Feed Reels</span>
              </button>
            )}

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
              <span>{selectMode ? 'Cancelar' : 'Seleccionar lote'}</span>
            </button>

            {/* Selector de Columnas */}
            <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 text-xs">
              <span className="text-[10px] text-slate-500 font-bold px-1.5 hidden sm:inline">COLS:</span>
              {([2, 3, 4, 5] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => handleSetGridCols(cols)}
                  className={`px-2 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    gridCols === cols
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`${cols} columnas`}
                >
                  {cols}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-semibold bg-white/5 px-2 py-1 rounded-lg border border-white/5">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
              {totalCount > 0 && ` / ${totalCount.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Fila 2: Buscador en tiempo real dentro del creador + Filtros de Audio, HD y Duración */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-white/5 text-xs">
          {/* Buscador interno */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              placeholder="Buscar en los videos de este creador por título o tag..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors"
            />
            {keywordFilter && (
              <button
                type="button"
                onClick={() => setKeywordFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros de Audio, HD y Duración */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-semibold mr-0.5">Filtrar:</span>
            <button
              type="button"
              onClick={() => setAudioFilter(audioFilter === 'audio' ? 'all' : 'audio')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                audioFilter === 'audio'
                  ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-300 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
            >
              <Volume2 className="w-3 h-3" /> Audio
            </button>

            <button
              type="button"
              onClick={() => setAudioFilter(audioFilter === 'mute' ? 'all' : 'mute')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                audioFilter === 'mute'
                  ? 'bg-white/20 border-white/40 text-white font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
            >
              <VolumeX className="w-3 h-3" /> Mudo
            </button>

            <button
              type="button"
              onClick={() => setHdOnlyFilter(!hdOnlyFilter)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer ${
                hdOnlyFilter
                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
            >
              HD
            </button>

            <button
              type="button"
              onClick={() => setDurationFilter(durationFilter === 'short' ? 'all' : 'short')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                durationFilter === 'short'
                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-300 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
            >
              &lt;15s
            </button>

            <button
              type="button"
              onClick={() => setDurationFilter(durationFilter === 'medium' ? 'all' : 'medium')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                durationFilter === 'medium'
                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-300 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
            >
              15-30s
            </button>

            <button
              type="button"
              onClick={() => setDurationFilter(durationFilter === 'long' ? 'all' : 'long')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                durationFilter === 'long'
                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-300 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
            >
              &gt;30s
            </button>

            <button
              type="button"
              onClick={() => setDurationFilter(durationFilter === 'ultralong' ? 'all' : 'ultralong')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                durationFilter === 'ultralong'
                  ? 'bg-pink-600/30 border-pink-500/50 text-pink-300 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
            >
              &gt;60s
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Videos del Creador */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-slate-400 text-sm font-semibold">Cargando catálogo de @{activeUsername}...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#12141c] border border-white/10 rounded-2xl p-6">
          <User className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No se encontraron videos</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            No se encontraron publicaciones públicas para este creador con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className={getGridColsClass(gridCols)}>
          {filteredVideos.map((item) => {
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
                    : 'border-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10'
                }`}
              >
                {/* Checkbox de Selección Rápida */}
                {selectMode && (
                  <button
                    type="button"
                    onClick={(e) => toggleSelect(item.id, e)}
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

                {/* Previsualización del Video / Thumbnail */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(item.id);
                    } else {
                      onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (selectMode) {
                        toggleSelect(item.id);
                      } else {
                        onOpenLightbox(item.hd_url || item.sd_url, item.title, item.tags, item.userName, item);
                      }
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
                    <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl shadow-purple-600/50 transform group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badges */}
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
                    <span className="bg-purple-600/90 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                      HD
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 pointer-events-none flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    {item.duration}s
                  </div>
                </div>

                {/* Metadatos y Botones */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 text-slate-400">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Eye className="w-3 h-3 text-purple-400" />
                        {item.views.toLocaleString()} vistas
                      </span>
                      {typeof item.likes === 'number' && item.likes > 0 && (
                        <span className="flex items-center gap-0.5 text-pink-400 text-[11px]">
                          <Heart className="w-3 h-3 fill-pink-500/20" />
                          {item.likes}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug" title={item.title}>
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
                              if (onSelectTag) {
                                onSelectTag(t);
                                showToast(`Buscando videos relacionados con #${t}...`);
                              }
                            }}
                            className="text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white px-2 py-0.5 rounded-md border border-purple-500/20 hover:border-purple-500/40 transition-all font-medium truncate max-w-[120px] cursor-pointer active:scale-95"
                            title={`Ver videos relacionados con #${t}`}
                          >
                            #{t}
                          </button>
                        ))}
                        {item.tags.length > 4 && (
                          <span
                            className="text-[10px] text-slate-500 px-1 py-0.5 self-center"
                            title={item.tags.slice(4).map(t => `#${t}`).join(', ')}
                          >
                            +{item.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-1.5 border-t border-white/5">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(item, 'hd', e)}
                      className="flex-1 min-w-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-purple-500/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Descargar HD</span>
                    </button>

                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item);
                        }}
                        title={isFavorite && isFavorite(item.id) ? 'Quitar de favoritos' : 'Guardar en mis favoritos'}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                          isFavorite && isFavorite(item.id)
                            ? 'bg-pink-600/25 border-pink-500/40 text-pink-400 hover:bg-pink-600/35'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-pink-400 border-white/10'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isFavorite && isFavorite(item.id) ? 'fill-pink-500 text-pink-500' : ''
                          }`}
                        />
                      </button>
                    )}

                    {onOpenTheater && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = filteredVideos.findIndex(r => r.id === item.id);
                          onOpenTheater(filteredVideos, idx >= 0 ? idx : 0);
                        }}
                        title="Ver en modo Feed / Reels continuo"
                        className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/30 hover:border-purple-400 transition-colors cursor-pointer shrink-0"
                      >
                        <Film className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(item, e)}
                      title="Copiar enlace"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer shrink-0"
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

      {/* Botón Cargar Más Videos */}
      {!isLoading && filteredVideos.length > 0 && currentPage < totalPages && (
        <div className="text-center pt-6">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="bg-[#161a26] hover:bg-[#1e2333] border border-purple-500/30 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition-all active:scale-95 shadow-lg shadow-black/40 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                <span>Cargando más videos...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Cargar 24 videos más de @{activeUsername} (Página {currentPage + 1} de {totalPages})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Barra Flotante de Acciones en Lote */}
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
              <div className="text-[11px] text-purple-300">De @{activeUsername}</div>
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
              Todos ({filteredVideos.length})
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
