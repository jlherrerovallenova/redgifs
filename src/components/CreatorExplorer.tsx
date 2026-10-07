import React, { useState, useEffect, useMemo } from 'react';
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
  Film
} from 'lucide-react';
import { SearchResultItem, RedGifItem, UserProfile } from '../types';
import {
  getCreatorFeed,
  fetchTopCreatorVideoUrls,
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
  isFavorite
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

  // Ordenación y filtros
  const [order, setOrder] = useState<'best' | 'recent' | 'trending'>('best');
  const [audioFilter, setAudioFilter] = useState<'all' | 'audio' | 'mute'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');

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
      showToast(`Error al cargar el creador @${clean}: ${err.message || 'No encontrado'}`);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim().replace(/^@/, '');
    if (!clean) return;
    loadCreator(clean, order, 1, false);
  };

  const handleOrderChange = (newOrder: 'best' | 'recent' | 'trending') => {
    setOrder(newOrder);
    loadCreator(activeUsername, newOrder, 1, false);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || currentPage >= totalPages) return;
    loadCreator(activeUsername, order, currentPage + 1, true);
  };

  // Filtrado reactivo en el cliente
  const filteredVideos = useMemo(() => {
    let list = [...videos];

    if (audioFilter === 'audio') {
      list = list.filter(item => item.hasAudio === true);
    } else if (audioFilter === 'mute') {
      list = list.filter(item => item.hasAudio === false);
    }

    if (durationFilter === 'short') {
      list = list.filter(item => item.duration < 15);
    } else if (durationFilter === 'medium') {
      list = list.filter(item => item.duration >= 15 && item.duration <= 30);
    } else if (durationFilter === 'long') {
      list = list.filter(item => item.duration > 30);
    }

    return list;
  }, [videos, audioFilter, durationFilter]);

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

        {/* Input de Búsqueda de Usuario */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-2xl shadow-purple-600/10 rounded-2xl overflow-hidden border border-white/15 bg-[#12141c] focus-within:border-purple-500/80 transition-all duration-300">
          <div className="pl-4 text-purple-400 font-bold text-lg">
            @
          </div>
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Introduce el nombre del creador (ej. namiblossom, brazzers, ersties)..."
            className="w-full bg-transparent px-3 py-3.5 text-sm sm:text-base outline-none text-white placeholder-slate-500 font-medium"
          />
          {usernameInput && (
            <button
              type="button"
              onClick={() => setUsernameInput('')}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:opacity-90 text-white font-bold px-6 py-3.5 text-sm transition-transform active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando...
              </span>
            ) : (
              'Explorar Perfil'
            )}
          </button>
        </form>

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

        {/* Historial de creadores recientes */}
        {recentCreators.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium mr-1">Buscados:</span>
            {recentCreators.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setUsernameInput(name);
                  loadCreator(name, order, 1, false);
                }}
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 transition-colors"
              >
                <span>@{name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => removeRecentCreator(name, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      removeRecentCreator(name, e as any);
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
      </div>

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

            {/* Enlaces Externos / Redes Sociales / SimpCity */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto pt-2 lg:pt-0">
              {profile.socialLinks && profile.socialLinks.map((link, idx) => (
                <a
                  key={idx}
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

      {/* Barra de Filtros y Orden de Videos */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Pestañas de Ordenación */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleOrderChange('best')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                order === 'best'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Más Vistos (Top)
            </button>
            <button
              type="button"
              onClick={() => handleOrderChange('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                order === 'recent'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Recientes
            </button>
            <button
              type="button"
              onClick={() => handleOrderChange('trending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                order === 'trending'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Tendencias
            </button>
          </div>

          {/* Acciones y Modo Selección */}
          <div className="flex items-center gap-2 flex-wrap">
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
              <span>{selectMode ? 'Cancelar selección' : 'Seleccionar en lote'}</span>
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

            <span className="text-xs text-slate-400 font-semibold">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
              {totalCount > 0 && ` (de ${totalCount.toLocaleString()})`}
            </span>
          </div>
        </div>

        {/* Filtros Rápidos de Audio y Duración */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs">
          <span className="text-slate-500 font-semibold mr-1">Filtrar:</span>
          <button
            type="button"
            onClick={() => setAudioFilter(audioFilter === 'audio' ? 'all' : 'audio')}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
              audioFilter === 'audio'
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
            }`}
          >
            <Volume2 className="w-3 h-3" /> Con sonido
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
            <VolumeX className="w-3 h-3" /> Silencio
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
            onClick={() => setDurationFilter(durationFilter === 'long' ? 'all' : 'long')}
            className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              durationFilter === 'long'
                ? 'bg-purple-600/30 border-purple-500/50 text-purple-300 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
            }`}
          >
            &gt;30s
          </button>
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
