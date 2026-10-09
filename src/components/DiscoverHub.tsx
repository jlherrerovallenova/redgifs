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
  Tag
} from 'lucide-react';
import { SearchResultItem, RedGifItem, UserProfile } from '../types';
import {
  searchVideosExtended,
  searchCreators,
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
}

type DiscoverSection = 'latest_videos' | 'top_creators' | 'trending_creators' | 'sound_fresh';

// Lista curada de los mejores creadores verificados con metadata
const TOP_CREATORS_CURATED: Array<{
  username: string;
  name: string;
  badge: string;
  description: string;
  tags: string[];
  viewsEst: string;
  gifsEst: string;
  avatarBg: string;
}> = [
  {
    username: 'namiblossom',
    name: 'Nami Blossom',
    badge: '👑 #1 Top Creator',
    description: 'Contenido premium de modelaje y alta definición con millones de reproducciones globales.',
    tags: ['model', 'beauty', 'trending', 'aesthetic'],
    viewsEst: '45M+',
    gifsEst: '350+',
    avatarBg: 'from-pink-500 to-rose-600'
  },
  {
    username: 'estefania_ray',
    name: 'Estefania Ray',
    badge: '🔥 Estrella Viral',
    description: 'Coreografías, baile y producciones dinámicas en resolución 1080p 60fps.',
    tags: ['dance', 'fitness', 'style', 'music'],
    viewsEst: '32M+',
    gifsEst: '280+',
    avatarBg: 'from-purple-600 to-pink-600'
  },
  {
    username: 'ersties',
    name: 'Ersties Studio',
    badge: '🎬 Cine & Fotografía',
    description: 'Producciones cinematográficas con iluminación artística y enfoque editorial.',
    tags: ['cinematic', 'artistic', 'sensual', 'hd'],
    viewsEst: '80M+',
    gifsEst: '620+',
    avatarBg: 'from-red-600 to-amber-600'
  },
  {
    username: 'brazzers',
    name: 'Brazzers Official',
    badge: '⭐ Productora Top',
    description: 'Catálogo de alta demanda con miles de publicaciones y máxima resolución.',
    tags: ['official', 'studio', 'viral', 'top'],
    viewsEst: '120M+',
    gifsEst: '1,500+',
    avatarBg: 'from-amber-500 to-red-600'
  },
  {
    username: 'candyai',
    name: 'Candy AI Studio',
    badge: '🤖 Generación & Cyber',
    description: 'Animación digital futurista, estética neon y modelos renderizadas en Ultra-HD.',
    tags: ['anime', 'cyberpunk', 'neon', 'cgi'],
    viewsEst: '18M+',
    gifsEst: '400+',
    avatarBg: 'from-cyan-500 to-blue-600'
  },
  {
    username: 'kgx333',
    name: 'KGX Studio',
    badge: '⚡ Ritmo & Sonido',
    description: 'Edición rápida, transiciones rítmicas y clips de alto impacto sonoro.',
    tags: ['sound', 'action', 'energy', 'remix'],
    viewsEst: '15M+',
    gifsEst: '210+',
    avatarBg: 'from-violet-600 to-indigo-600'
  },
  {
    username: 'xsofiax20',
    name: 'Sofia Star',
    badge: '✨ Enfoque Moda',
    description: 'Sesiones de pasarela, lencería de diseño y moda veraniega.',
    tags: ['model', 'beach', 'summer', 'fashion'],
    viewsEst: '24M+',
    gifsEst: '190+',
    avatarBg: 'from-emerald-500 to-teal-600'
  },
  {
    username: 'sweet_caroline',
    name: 'Sweet Caroline',
    badge: '🌸 Revelación',
    description: 'Clips cortos, expresiones naturales y sesiones cotidianas en alta fidelidad.',
    tags: ['cute', 'lifestyle', 'natural', 'fresh'],
    viewsEst: '11M+',
    gifsEst: '160+',
    avatarBg: 'from-fuchsia-500 to-pink-500'
  }
];

// Creadores emergentes y promesas
const EMERGING_CREATORS_CURATED: Array<{
  username: string;
  name: string;
  badge: string;
  highlight: string;
  tags: string[];
  avatarBg: string;
}> = [
  {
    username: 'neon_vibes_99',
    name: 'Neon Vibes',
    badge: '🚀 +350% Crecimiento',
    highlight: 'Especialista en iluminación RGB y clips aesthetic cyberpunk.',
    tags: ['neon', 'aesthetic', 'lights'],
    avatarBg: 'from-cyan-400 to-indigo-600'
  },
  {
    username: 'fitness_queen_x',
    name: 'Fitness Queen',
    badge: '🏋️ Top Deporte',
    highlight: 'Rutinas de gimnasio, motivación deportiva y flexiones en 4K.',
    tags: ['gym', 'fitness', 'workout'],
    avatarBg: 'from-emerald-400 to-cyan-600'
  },
  {
    username: 'cosplay_universe',
    name: 'Cosplay Universe',
    badge: '🎭 Fantasía & Trajes',
    highlight: 'Recreaciones detalladas de personajes de videojuegos y anime.',
    tags: ['cosplay', 'gaming', 'anime'],
    avatarBg: 'from-purple-500 to-pink-500'
  },
  {
    username: 'summer_breeze',
    name: 'Summer Breeze',
    badge: '🏖️ Verano & Sol',
    highlight: 'Tomas panorámicas en playas paradisíacas y aguas cristalinas.',
    tags: ['beach', 'travel', 'summer'],
    avatarBg: 'from-amber-400 to-rose-500'
  }
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

export const DiscoverHub: React.FC<DiscoverHubProps> = ({
  onOpenLightbox,
  onOpenTheater,
  onSelectCreator,
  onSelectTag,
  onToggleFavorite,
  isFavorite,
  showToast,
  onSuccessDownload
}) => {
  const [activeSection, setActiveSection] = useState<DiscoverSection>('latest_videos');
  const [videos, setVideos] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filtros rápidos
  const [audioOnly, setAudioOnly] = useState(false);
  const [hdOnly, setHdOnly] = useState(false);
  const [shortOnly, setShortOnly] = useState(false);

  // Columnas personalizables (Default: 4)
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

  // Carga de videos según la sección activa
  const fetchSectionContent = async (section: DiscoverSection, page = 1) => {
    setIsLoading(true);
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
      setVideos(res.items);
      setCurrentPage(page);
    } catch (err: any) {
      showToast(`Error al cargar novedades: ${err.message || 'Fallo de red'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'latest_videos' || activeSection === 'sound_fresh') {
      fetchSectionContent(activeSection, 1);
    }
  }, [activeSection]);

  // Filtrado reactivo en memoria
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (audioOnly && !v.hasAudio) return false;
      if (hdOnly && !v.hd_url) return false;
      if (shortOnly && v.duration >= 15) return false;
      return true;
    });
  }, [videos, audioOnly, hdOnly, shortOnly]);

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
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Banner Principal de Novedades & Descubrimiento */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181326] via-[#12141c] to-[#1f101d] border border-white/10 p-6 sm:p-8 shadow-2xl shadow-purple-950/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-gradient-to-bl from-pink-600/20 via-purple-600/10 to-transparent blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-60 h-60 bg-gradient-to-tr from-red-600/20 via-transparent to-transparent blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500/15 via-pink-500/15 to-purple-500/15 border border-pink-500/30 px-3.5 py-1.5 rounded-full text-xs font-black text-pink-300 shadow-md">
            <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            <span>CENTRO DE NOVEDADES & TOP CREADORES</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white leading-tight">
            Descubre lo más <span className="bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">nuevo y viral</span> de RedGIFs
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Explora las últimas publicaciones subidas en tiempo real, los perfiles de creadores con mayores reproducciones y producciones destacadas con audio en alta fidelidad.
          </p>

          {/* Selector de Secciones Principales */}
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('latest_videos')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md ${
                activeSection === 'latest_videos'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-red-600/30 ring-2 ring-red-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>🆕 Últimos Subidos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('top_creators')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md ${
                activeSection === 'top_creators'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-600/30 ring-2 ring-purple-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <Flame className="w-4 h-4 text-yellow-300" />
              <span>👑 Mejores Creadores</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('trending_creators')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md ${
                activeSection === 'trending_creators'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/30 ring-2 ring-pink-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span>⚡ Creadores Emergentes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('sound_fresh')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md ${
                activeSection === 'sound_fresh'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <Volume2 className="w-4 h-4 text-emerald-300" />
              <span>🎵 Novedades con Audio</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN: MEJORES CREADORES (TOP STARS) */}
      {activeSection === 'top_creators' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-yellow-400" />
                <span>Top Creadores Verificados & Más Vistos</span>
              </h2>
              <p className="text-xs text-slate-400">Los perfiles más influyentes con producciones en máxima resolución.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOP_CREATORS_CURATED.map((creator) => (
              <div
                key={creator.username}
                className="bg-[#12141c] border border-white/10 hover:border-purple-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-600/10 group relative"
              >
                <div className="space-y-3">
                  {/* Avatar y Badge */}
                  <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${creator.avatarBg} flex items-center justify-center text-white text-xl font-black shadow-lg`}>
                      {creator.name.charAt(0)}
                    </div>
                    <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                      {creator.badge}
                    </span>
                  </div>

                  {/* Nombre y Usuario */}
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
                      <span>{creator.name}</span>
                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">@{creator.username}</p>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {creator.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {creator.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-md border border-white/5">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Métricas y Botón */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-500" /> {creator.viewsEst} vistas
                    </span>
                    <span className="flex items-center gap-1">
                      <Film className="w-3.5 h-3.5 text-slate-500" /> {creator.gifsEst} videos
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
        </div>
      )}

      {/* SECCIÓN: CREADORES EMERGENTES */}
      {activeSection === 'trending_creators' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Creadores Emergentes & Nuevas Tendencias</span>
              </h2>
              <p className="text-xs text-slate-400">Talentos en rápido ascenso con las mejores calificaciones del mes.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EMERGING_CREATORS_CURATED.map((creator) => (
              <div
                key={creator.username}
                className="bg-[#12141c] border border-white/10 hover:border-pink-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-600/10 group relative"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${creator.avatarBg} flex items-center justify-center text-white text-xl font-black shadow-lg`}>
                      {creator.name.charAt(0)}
                    </div>
                    <span className="text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full">
                      {creator.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-pink-300 transition-colors">
                      {creator.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">@{creator.username}</p>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {creator.highlight}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {creator.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-md border border-white/5">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCreator) onSelectCreator(creator.username);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-pink-600/20 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Explorar Videos</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN DE VIDEOS: ÚLTIMOS SUBIDOS & NOVEDADES CON AUDIO */}
      {(activeSection === 'latest_videos' || activeSection === 'sound_fresh') && (
        <div className="space-y-4">
          {/* Barra de Control, Filtros y Selector de Columnas */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {activeSection === 'latest_videos' ? <Clock className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{activeSection === 'latest_videos' ? 'Videos Recién Subidos' : 'Videos Recientes con Sonido HD'}</span>
              </span>
              <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                {filteredVideos.length} clips
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
                onClick={() => fetchSectionContent(activeSection, 1)}
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
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCreator) onSelectCreator(item.userName);
                          }}
                          className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 truncate max-w-full cursor-pointer hover:underline"
                          title={`Ver perfil de @${item.userName}`}
                        >
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">@{item.userName}</span>
                        </button>

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
        </div>
      )}
    </div>
  );
};
