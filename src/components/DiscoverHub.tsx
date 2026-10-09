import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Sparkles,
  Clock,
  User,
  Users,
  Eye,
  Heart,
  Play,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Film,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  Tv,
  Ban
} from 'lucide-react';
import { SearchResultItem, RedGifItem, UserProfile } from '../types';
import {
  searchVideosExtended,
  searchCreatorsPaginated,
  getVideoInfo,
  downloadVideoFile
} from '../services/redgifs';

interface DiscoverHubProps {
  onOpenLightbox: (url: string, title: string, tags?: string[], userName?: string, originalItem?: SearchResultItem) => void;
  onOpenTheater?: (videos: SearchResultItem[], startIndex: number) => void;
  onSelectCreator?: (username: string) => void;
  onSelectTag?: (tag: string) => void;
  onToggleFavorite?: (video: SearchResultItem) => void;
  isFavorite?: (id: string) => boolean;
  showToast: (msg: string) => void;
  onSuccessDownload?: (video: RedGifItem, quality: string, filename: string) => void;
  onBlockCreator?: (username: string) => void;
}

type DiscoverSection = 'latest_videos' | 'top_creators' | 'trending_creators' | 'sound_fresh';

// Lista ampliada de creadores destacados para enriquecer el catálogo base
const TOP_CREATORS_CURATED: UserProfile[] = [
  {
    username: 'namiblossom',
    name: 'Nami Blossom',
    description: 'Contenido premium de modelaje y alta definición con millones de reproducciones globales.',
    followers: 450000,
    following: 120,
    gifs: 350,
    views: 45000000,
    likes: 380000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/namiblossom'
  },
  {
    username: 'estefania_ray',
    name: 'Estefania Ray',
    description: 'Coreografías, baile y producciones dinámicas en resolución 1080p 60fps.',
    followers: 320000,
    following: 85,
    gifs: 280,
    views: 32000000,
    likes: 290000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/estefania_ray'
  },
  {
    username: 'ersties',
    name: 'Ersties Studio',
    description: 'Producciones cinematográficas con iluminación artística y enfoque editorial.',
    followers: 820000,
    following: 45,
    gifs: 620,
    views: 80000000,
    likes: 710000,
    verified: true,
    studio: true,
    url: 'https://www.redgifs.com/users/ersties'
  },
  {
    username: 'brazzers',
    name: 'Brazzers Official',
    description: 'Catálogo de alta demanda con miles de publicaciones y máxima resolución.',
    followers: 1200000,
    following: 10,
    gifs: 1500,
    views: 120000000,
    likes: 950000,
    verified: true,
    studio: true,
    url: 'https://www.redgifs.com/users/brazzers'
  },
  {
    username: 'candyai',
    name: 'Candy AI Studio',
    description: 'Animación digital futurista, estética neon y modelos renderizadas en Ultra-HD.',
    followers: 180000,
    following: 30,
    gifs: 400,
    views: 18000000,
    likes: 150000,
    verified: true,
    studio: true,
    url: 'https://www.redgifs.com/users/candyai'
  },
  {
    username: 'kgx333',
    name: 'KGX Studio',
    description: 'Edición rápida, transiciones rítmicas y clips de alto impacto sonoro.',
    followers: 150000,
    following: 60,
    gifs: 210,
    views: 15000000,
    likes: 120000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/kgx333'
  },
  {
    username: 'xsofiax20',
    name: 'Sofia Star',
    description: 'Sesiones de pasarela, lencería de diseño y moda veraniega.',
    followers: 240000,
    following: 95,
    gifs: 190,
    views: 24000000,
    likes: 210000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/xsofiax20'
  },
  {
    username: 'sweet_caroline',
    name: 'Sweet Caroline',
    description: 'Clips cortos, expresiones naturales y sesiones cotidianas en alta fidelidad.',
    followers: 110000,
    following: 40,
    gifs: 160,
    views: 11000000,
    likes: 95000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/sweet_caroline'
  },
  {
    username: 'melody_marks',
    name: 'Melody Marks',
    description: 'Actriz y modelo internacional con producciones virales de alta resolución.',
    followers: 650000,
    following: 35,
    gifs: 420,
    views: 58000000,
    likes: 490000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/melody_marks'
  },
  {
    username: 'eva_elfie',
    name: 'Eva Elfie',
    description: 'Top creadora galardonada con producciones exclusivas y contenido de viajes.',
    followers: 980000,
    following: 50,
    gifs: 510,
    views: 92000000,
    likes: 830000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/eva_elfie'
  },
  {
    username: 'gabbiecarter',
    name: 'Gabbie Carter',
    description: 'Sesiones fotográficas y videos en 4K con iluminación de estudio.',
    followers: 410000,
    following: 70,
    gifs: 310,
    views: 39000000,
    likes: 310000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/gabbiecarter'
  },
  {
    username: 'autumn_falls',
    name: 'Autumn Falls',
    description: 'Videos destacados en tendencias con millones de seguidores a nivel mundial.',
    followers: 890000,
    following: 25,
    gifs: 490,
    views: 85000000,
    likes: 740000,
    verified: true,
    studio: false,
    url: 'https://www.redgifs.com/users/autumn_falls'
  }
];

const EMERGING_CREATORS_SEED: UserProfile[] = [
  {
    username: 'neon_vibes_99',
    name: 'Neon Vibes',
    description: 'Especialista en iluminación RGB, clips aesthetic cyberpunk y estética retro.',
    followers: 48000,
    following: 15,
    gifs: 95,
    views: 4200000,
    likes: 35000,
    verified: false,
    studio: false,
    url: 'https://www.redgifs.com/users/neon_vibes_99'
  },
  {
    username: 'fitness_queen_x',
    name: 'Fitness Queen',
    description: 'Rutinas de gimnasio, motivación deportiva y flexiones en 4K.',
    followers: 72000,
    following: 30,
    gifs: 140,
    views: 6500000,
    likes: 54000,
    verified: false,
    studio: false,
    url: 'https://www.redgifs.com/users/fitness_queen_x'
  },
  {
    username: 'cosplay_universe',
    name: 'Cosplay Universe',
    description: 'Recreaciones detalladas de trajes de videojuegos y anime en alta fidelidad.',
    followers: 85000,
    following: 40,
    gifs: 175,
    views: 7800000,
    likes: 68000,
    verified: false,
    studio: false,
    url: 'https://www.redgifs.com/users/cosplay_universe'
  },
  {
    username: 'summer_breeze',
    name: 'Summer Breeze',
    description: 'Tomas panorámicas en playas paradisíacas, viajes y aguas cristalinas.',
    followers: 53000,
    following: 20,
    gifs: 110,
    views: 4900000,
    likes: 41000,
    verified: false,
    studio: false,
    url: 'https://www.redgifs.com/users/summer_breeze'
  },
  {
    username: 'cyber_doll',
    name: 'Cyber Doll',
    description: 'Estilo synthwave, outfits futuristas y clips rítmicos.',
    followers: 61000,
    following: 18,
    gifs: 130,
    views: 5200000,
    likes: 46000,
    verified: false,
    studio: false,
    url: 'https://www.redgifs.com/users/cyber_doll'
  },
  {
    username: 'velvet_rose',
    name: 'Velvet Rose',
    description: 'Fotografía suave, lencería elegante y tomas en cámara lenta.',
    followers: 44000,
    following: 12,
    gifs: 88,
    views: 3800000,
    likes: 31000,
    verified: false,
    studio: false,
    url: 'https://www.redgifs.com/users/velvet_rose'
  }
];

function getVisiblePageNumbers(current: number, total: number, maxVisible = 5): (number | string)[] {
  if (total <= maxVisible + 2) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(2, current - half);
  let end = Math.min(total - 1, current + half);

  if (current <= half + 2) {
    end = Math.min(total - 1, maxVisible + 1);
  }
  if (current >= total - half - 1) {
    start = Math.max(2, total - maxVisible);
  }

  pages.push(1);
  if (start > 2) {
    pages.push('...');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total - 1) {
    pages.push('...');
  }
  pages.push(total);

  return pages;
}

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

export const DiscoverHub: React.FC<DiscoverHubProps> = ({
  onOpenLightbox,
  onOpenTheater,
  onSelectCreator,
  onSelectTag,
  onToggleFavorite,
  isFavorite,
  showToast,
  onSuccessDownload,
  onBlockCreator
}) => {
  const [activeSection, setActiveSection] = useState<DiscoverSection>('latest_videos');

  // Estado para Videos (Últimos Subidos & Novedades con Audio)
  const [videos, setVideos] = useState<SearchResultItem[]>([]);
  const [videoPage, setVideoPage] = useState(1);
  const [videoTotalPages, setVideoTotalPages] = useState(1);
  const [videoTotalCount, setVideoTotalCount] = useState(0);

  // Estado para Creadores (Mejores Creadores & Emergentes)
  const [creators, setCreators] = useState<UserProfile[]>([]);
  const [creatorPage, setCreatorPage] = useState(1);
  const [creatorTotalPages, setCreatorTotalPages] = useState(1);
  const [creatorTotalCount, setCreatorTotalCount] = useState(0);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');
  const [creatorFilterType, setCreatorFilterType] = useState<'all' | 'verified' | 'studio'>('all');

  // Estados de carga
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filtros rápidos de video
  const [audioOnly, setAudioOnly] = useState(false);
  const [hdOnly, setHdOnly] = useState(false);
  const [shortOnly, setShortOnly] = useState(false);

  // Selector de Columnas persistente (Default: 4)
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

  // Carga de Videos (Últimos Subidos / Con Audio)
  const fetchVideos = async (section: 'latest_videos' | 'sound_fresh', page = 1, append = false) => {
    if (page === 1 && !append) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let query = 'trending';
      let sortOrder: 'trending' | 'top' | 'latest' = 'latest';

      if (section === 'latest_videos') {
        query = 'trending';
        sortOrder = 'latest';
      } else if (section === 'sound_fresh') {
        query = 'sound';
        sortOrder = 'latest';
      }

      const res = await searchVideosExtended(query, 24, page, sortOrder);

      if (append) {
        setVideos(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = res.items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setVideos(res.items);
      }

      setVideoPage(res.page);
      setVideoTotalPages(Math.max(1, res.pages));
      setVideoTotalCount(res.total);
    } catch (err: any) {
      showToast(`Error al cargar videos: ${err.message || 'Fallo de red'}`);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Carga de Creadores (Mejores Creadores / Emergentes)
  const fetchCreators = async (section: 'top_creators' | 'trending_creators', page = 1, append = false, searchTxt = creatorSearchQuery) => {
    if (page === 1 && !append) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const order = section === 'top_creators' ? 'best' : 'trending';
      const defaultQuery = searchTxt.trim() || (section === 'top_creators' ? 'model' : 'dance');
      const seedList = section === 'top_creators' ? TOP_CREATORS_CURATED : EMERGING_CREATORS_SEED;

      const res = await searchCreatorsPaginated(defaultQuery, 20, page, order);

      // Combinar los creadores base con los obtenidos de la API en la página 1
      let combined: UserProfile[] = [];
      if (page === 1 && !searchTxt.trim()) {
        const seen = new Set<string>();
        const fullList = [...seedList, ...res.items];
        for (const u of fullList) {
          const key = u.username.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(u);
          }
        }
      } else {
        combined = res.items;
      }

      if (append) {
        setCreators(prev => {
          const existingUsers = new Set(prev.map(p => p.username.toLowerCase()));
          const newItems = combined.filter(item => !existingUsers.has(item.username.toLowerCase()));
          return [...prev, ...newItems];
        });
      } else {
        setCreators(combined);
      }

      setCreatorPage(page);
      setCreatorTotalPages(Math.max(1, res.pages > 1 ? res.pages : Math.ceil((res.total || combined.length) / 12) + 5));
      setCreatorTotalCount(res.total > 0 ? res.total : combined.length);
    } catch (err: any) {
      showToast(`Error al cargar creadores: ${err.message || 'Fallo de red'}`);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Efecto al cambiar de sección
  useEffect(() => {
    if (activeSection === 'latest_videos' || activeSection === 'sound_fresh') {
      fetchVideos(activeSection, 1, false);
    } else if (activeSection === 'top_creators' || activeSection === 'trending_creators') {
      fetchCreators(activeSection, 1, false);
    }
  }, [activeSection]);

  // Filtrado reactivo de videos en memoria
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (audioOnly && !v.hasAudio) return false;
      if (hdOnly && !v.hd_url) return false;
      if (shortOnly && v.duration >= 15) return false;
      return true;
    });
  }, [videos, audioOnly, hdOnly, shortOnly]);

  // Filtrado reactivo de creadores en memoria
  const filteredCreators = useMemo(() => {
    let list = [...creators];

    if (creatorFilterType === 'verified') {
      list = list.filter(c => c.verified === true);
    } else if (creatorFilterType === 'studio') {
      list = list.filter(c => c.studio === true);
    }

    if (creatorSearchQuery.trim()) {
      const q = creatorSearchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.username.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [creators, creatorFilterType, creatorSearchQuery]);

  // Navegación de páginas para videos
  const goToVideoPage = (page: number) => {
    if (page < 1 || page > videoTotalPages || page === videoPage || isLoading) return;
    fetchVideos(activeSection as 'latest_videos' | 'sound_fresh', page, false);
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const loadMoreVideos = () => {
    if (isLoadingMore || videoPage >= videoTotalPages) return;
    fetchVideos(activeSection as 'latest_videos' | 'sound_fresh', videoPage + 1, true);
  };

  // Navegación de páginas para creadores
  const goToCreatorPage = (page: number) => {
    if (page < 1 || page > creatorTotalPages || page === creatorPage || isLoading) return;
    fetchCreators(activeSection as 'top_creators' | 'trending_creators', page, false);
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const loadMoreCreators = () => {
    if (isLoadingMore || creatorPage >= creatorTotalPages) return;
    fetchCreators(activeSection as 'top_creators' | 'trending_creators', creatorPage + 1, true);
  };

  const handleCreatorSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSection === 'top_creators' || activeSection === 'trending_creators') {
      fetchCreators(activeSection, 1, false, creatorSearchQuery);
    }
  };

  const handleCopyLink = async (item: SearchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.watch_url || `https://www.redgifs.com/watch/${item.id}`);
      setCopiedId(item.id);
      showToast('Enlace copiado al portapapeles');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('No se pudo copiar el enlace');
    }
  };

  const handleDownload = async (item: SearchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(`Iniciando descarga de @${item.userName}...`);
    try {
      const info = await getVideoInfo(item.id);
      const cleanUser = item.userName.replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${cleanUser}_${item.id}_hd.mp4`;
      await downloadVideoFile(info.hd_url || item.hd_url, filename);
      showToast(`¡Descargado con éxito!: ${filename}`);
      if (onSuccessDownload) {
        onSuccessDownload(info, 'hd', filename);
      }
    } catch (err: any) {
      showToast(`Error en descarga: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Selector de Secciones Compacto */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#12141c]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveSection('latest_videos')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
            activeSection === 'latest_videos'
              ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md shadow-red-600/30'
              : 'bg-white/5 hover:bg-white/10 text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Últimos Subidos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('top_creators')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
            activeSection === 'top_creators'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-white/5 hover:bg-white/10 text-slate-300'
          }`}
        >
          <Flame className="w-4 h-4 text-yellow-300" />
          <span>Mejores Creadores</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('trending_creators')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
            activeSection === 'trending_creators'
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/5 hover:bg-white/10 text-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-300" />
          <span>Creadores Emergentes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('sound_fresh')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
            activeSection === 'sound_fresh'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-white/5 hover:bg-white/10 text-slate-300'
          }`}
        >
          <Volume2 className="w-4 h-4 text-emerald-300" />
          <span>Novedades con Audio</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECCIONES DE CREADORES (TOP CREADORES & EMERGENTES)                       */}
      {/* ========================================================================= */}
      {(activeSection === 'top_creators' || activeSection === 'trending_creators') && (
        <div className="space-y-5">
          {/* Barra de Búsqueda y Filtros de Creadores */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                {activeSection === 'top_creators' ? <Flame className="w-4 h-4 text-yellow-400" /> : <TrendingUp className="w-4 h-4 text-emerald-400" />}
                <span>{activeSection === 'top_creators' ? 'Catálogo de Mejores Creadores' : 'Nuevos Creadores Emergentes'}</span>
              </span>
              <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 font-mono">
                {filteredCreators.length} {filteredCreators.length === 1 ? 'creador' : 'creadores'}
                {creatorTotalCount > 0 && ` (Total: ${creatorTotalCount.toLocaleString()})`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
              {/* Formulario de Búsqueda de Creadores */}
              <form onSubmit={handleCreatorSearchSubmit} className="relative flex items-center bg-black/40 border border-white/15 rounded-xl px-2.5 py-1 focus-within:border-purple-500 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <input
                  type="text"
                  value={creatorSearchQuery}
                  onChange={(e) => setCreatorSearchQuery(e.target.value)}
                  placeholder="Buscar creador..."
                  className="bg-transparent text-white placeholder-slate-500 outline-none w-28 sm:w-36 font-medium"
                />
                {creatorSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatorSearchQuery('');
                      fetchCreators(activeSection, 1, false, '');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* Filtros de Tipo */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setCreatorFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    creatorFilterType === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setCreatorFilterType('verified')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    creatorFilterType === 'verified' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verificados</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreatorFilterType('studio')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    creatorFilterType === 'studio' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>Estudios</span>
                </button>
              </div>

              {/* Botón Refrescar */}
              <button
                type="button"
                onClick={() => fetchCreators(activeSection, 1, false)}
                disabled={isLoading}
                aria-label="Actualizar catálogo de creadores"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                title="Actualizar creadores"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Grid de Creadores */}
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
              <p className="text-slate-400 text-sm font-semibold">Cargando catálogo completo de creadores...</p>
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#12141c] border border-white/10 rounded-2xl p-6">
              <User className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No se encontraron creadores</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Prueba con otro término de búsqueda o cambia los filtros de creadores.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCreators.map((creator) => (
                <div
                  key={creator.username}
                  className="bg-[#12141c] border border-white/10 hover:border-purple-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-600/10 group relative"
                >
                  <div className="space-y-3">
                    {/* Avatar y Badges */}
                    <div className="flex items-start justify-between">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-tr from-purple-600 via-pink-600 to-red-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                          {creator.profileImageUrl ? (
                            <img src={creator.profileImageUrl} alt={creator.name || creator.username} className="w-full h-full object-cover" />
                          ) : (
                            (creator.name || creator.username).charAt(0).toUpperCase()
                          )}
                        </div>
                        {creator.verified && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full shadow-md shadow-blue-500/50" title="Verificado">
                            <CheckCircle2 className="w-3 h-3 fill-blue-500 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {creator.verified && (
                          <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                            VERIFICADO
                          </span>
                        )}
                        {creator.studio && (
                          <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                            ESTUDIO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nombre y Usuario */}
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-1.5 group-hover:text-purple-300 transition-colors truncate">
                        <span>{creator.name || creator.username}</span>
                        {creator.verified && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
                      </h3>
                      <p className="text-xs text-purple-400 font-mono">@{creator.username}</p>
                    </div>

                    {/* Bio / Descripción */}
                    {creator.description && (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {creator.description}
                      </p>
                    )}
                  </div>

                  {/* Métricas y Botón */}
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" /> {creator.followers.toLocaleString()} fans
                      </span>
                      <span className="flex items-center gap-1">
                        <Film className="w-3.5 h-3.5 text-slate-500" /> {creator.gifs.toLocaleString()} videos
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectCreator) onSelectCreator(creator.username);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Ver Catálogo Completo</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botón Cargar Más Creadores */}
          {creatorPage < creatorTotalPages && !isLoading && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={loadMoreCreators}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Cargando más creadores...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Cargar más creadores (+20)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Barra de Paginación Completa de Creadores */}
          {creatorTotalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div className="text-xs text-slate-400 font-medium">
                Página <strong className="text-white">{creatorPage}</strong> de <strong className="text-white">{creatorTotalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Primera Página */}
                <button
                  type="button"
                  onClick={() => goToCreatorPage(1)}
                  disabled={creatorPage <= 1 || isLoading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 transition-all cursor-pointer"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Anterior */}
                <button
                  type="button"
                  onClick={() => goToCreatorPage(creatorPage - 1)}
                  disabled={creatorPage <= 1 || isLoading}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de página */}
                {getVisiblePageNumbers(creatorPage, creatorTotalPages).map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-slate-500 font-bold text-xs">
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(p);
                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => goToCreatorPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        creatorPage === pageNum
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Siguiente */}
                <button
                  type="button"
                  onClick={() => goToCreatorPage(creatorPage + 1)}
                  disabled={creatorPage >= creatorTotalPages || isLoading}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Última Página */}
                <button
                  type="button"
                  onClick={() => goToCreatorPage(creatorTotalPages)}
                  disabled={creatorPage >= creatorTotalPages || isLoading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 transition-all cursor-pointer"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Salto Directo a Página */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('pageJump') as HTMLInputElement;
                  const val = parseInt(input.value, 10);
                  if (!isNaN(val)) {
                    goToCreatorPage(Math.max(1, Math.min(creatorTotalPages, val)));
                    input.value = '';
                  }
                }}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="text-slate-400 hidden sm:inline">Ir a:</span>
                <input
                  name="pageJump"
                  type="number"
                  min={1}
                  max={creatorTotalPages}
                  placeholder={String(creatorPage)}
                  className="w-14 bg-black/50 border border-white/15 rounded-xl px-2 py-1.5 text-center text-white outline-none focus:border-purple-500 font-bold"
                />
                <button
                  type="submit"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Ir
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN DE VIDEOS: ÚLTIMOS SUBIDOS & NOVEDADES CON AUDIO                  */}
      {/* ========================================================================= */}
      {(activeSection === 'latest_videos' || activeSection === 'sound_fresh') && (
        <div className="space-y-5">
          {/* Barra de Control, Filtros y Selector de Columnas */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                {activeSection === 'latest_videos' ? <Clock className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{activeSection === 'latest_videos' ? 'Videos Recién Subidos' : 'Videos Recientes con Sonido HD'}</span>
              </span>
              <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 font-mono">
                {filteredVideos.length} clips {videoTotalCount > 0 && `(Total: ${videoTotalCount.toLocaleString()})`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
              {/* Filtros Rápidos */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setAudioOnly(!audioOnly)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    audioOnly ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar solo clips con audio"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHdOnly(!hdOnly)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    hdOnly ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar solo videos HD"
                >
                  HD
                </button>

                <button
                  type="button"
                  onClick={() => setShortOnly(!shortOnly)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    shortOnly ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar videos menores a 15 segundos"
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
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`${cols} columnas`}
                  >
                    {cols}
                  </button>
                ))}
              </div>

              {/* Botón Refrescar */}
              <button
                type="button"
                onClick={() => fetchVideos(activeSection as 'latest_videos' | 'sound_fresh', 1, false)}
                disabled={isLoading}
                aria-label="Actualizar feed en vivo"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                title="Actualizar últimos videos en vivo"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Grid de Videos */}
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-red-500 mx-auto" />
              <p className="text-slate-400 text-sm font-semibold">Cargando las últimas publicaciones en vivo...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#12141c] border border-white/10 rounded-2xl p-6">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No se encontraron videos con los filtros seleccionados</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Prueba a desactivar los filtros de audio o duración.
              </p>
            </div>
          ) : (
            <div className={getGridColsClass(gridCols)}>
              {filteredVideos.map((item) => {
                const isHovered = hoveredId === item.id;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="bg-[#12141c] rounded-2xl overflow-hidden border border-white/10 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-200 flex flex-col group relative"
                  >
                    {/* Botón de Favorito Flotante */}
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item);
                        }}
                        aria-label={isFavorite && isFavorite(item.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                        className={`absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-xl flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg ${
                          isFavorite && isFavorite(item.id)
                            ? 'bg-pink-600 text-white shadow-pink-600/40'
                            : 'bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
                        }`}
                        title={isFavorite && isFavorite(item.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isFavorite && isFavorite(item.id) ? 'fill-white text-white' : ''
                          }`}
                        />
                      </button>
                    )}

                    {/* Previsualización del Video */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Abrir reproductor para ${item.title}`}
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

                      {/* Overlay con badge de sonido y duración */}
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

                      {/* Icono Play Central on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transform scale-75 group-hover/video:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Información y Creador */}
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectCreator) onSelectCreator(item.userName);
                            }}
                            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 truncate max-w-[140px] cursor-pointer hover:underline"
                            title={`Ver perfil de @${item.userName}`}
                          >
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">@{item.userName}</span>
                          </button>

                          {onBlockCreator && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Bloquear permanentemente a @${item.userName}? No volverás a ver sus videos.`)) {
                                  onBlockCreator(item.userName);
                                  setVideos(prev => prev.filter(v => v.userName?.toLowerCase() !== item.userName.toLowerCase()));
                                }
                              }}
                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                              title={`Bloquear a @${item.userName}`}
                            >
                              <Ban className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <h3 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug" title={item.title}>
                          {item.title}
                        </h3>

                        {/* Etiquetas */}
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

                      {/* Acciones Rápidas */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                        {onOpenTheater && (
                          <button
                            type="button"
                            onClick={() => {
                              const idx = filteredVideos.findIndex((v) => v.id === item.id);
                              onOpenTheater(filteredVideos, idx >= 0 ? idx : 0);
                            }}
                            className="p-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                            title="Ver en modo Feed Reels"
                          >
                            <Film className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Reels</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDownload(item, e)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-md shadow-red-600/20 cursor-pointer"
                          title="Descargar video original en HD"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar HD</span>
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

          {/* Botón Cargar Más Videos */}
          {videoPage < videoTotalPages && !isLoading && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={loadMoreVideos}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                    <span>Cargando más videos...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-red-400" />
                    <span>Cargar más videos (+24)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Barra de Paginación Completa de Videos */}
          {videoTotalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div className="text-xs text-slate-400 font-medium">
                Página <strong className="text-white">{videoPage}</strong> de <strong className="text-white">{videoTotalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Primera Página */}
                <button
                  type="button"
                  onClick={() => goToVideoPage(1)}
                  disabled={videoPage <= 1 || isLoading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 transition-all cursor-pointer"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Anterior */}
                <button
                  type="button"
                  onClick={() => goToVideoPage(videoPage - 1)}
                  disabled={videoPage <= 1 || isLoading}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de página */}
                {getVisiblePageNumbers(videoPage, videoTotalPages).map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-slate-500 font-bold text-xs">
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(p);
                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => goToVideoPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        videoPage === pageNum
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Siguiente */}
                <button
                  type="button"
                  onClick={() => goToVideoPage(videoPage + 1)}
                  disabled={videoPage >= videoTotalPages || isLoading}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Última Página */}
                <button
                  type="button"
                  onClick={() => goToVideoPage(videoTotalPages)}
                  disabled={videoPage >= videoTotalPages || isLoading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 transition-all cursor-pointer"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Salto Directo a Página */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('pageJump') as HTMLInputElement;
                  const val = parseInt(input.value, 10);
                  if (!isNaN(val)) {
                    goToVideoPage(Math.max(1, Math.min(videoTotalPages, val)));
                    input.value = '';
                  }
                }}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="text-slate-400 hidden sm:inline">Ir a:</span>
                <input
                  name="pageJump"
                  type="number"
                  min={1}
                  max={videoTotalPages}
                  placeholder={String(videoPage)}
                  className="w-14 bg-black/50 border border-white/15 rounded-xl px-2 py-1.5 text-center text-white outline-none focus:border-red-500 font-bold"
                />
                <button
                  type="submit"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Ir
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
