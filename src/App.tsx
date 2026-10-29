import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { RedGifItem, HistoryItem, SearchResultItem, CustomList, RedGifsUserAccount, RedGifsCollection } from './types';
import { Header } from './components/Header';
import { DiscoverHub } from './components/DiscoverHub';
import { TabletBottomDock } from './components/TabletBottomDock';
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner';
import { useAppUpdate } from './hooks/useAppUpdate';
import {
  searchVideosExtended,
  getBlockedCreators,
  getStoredUserAccount,
  connectUserAccount,
  disconnectUserAccount,
  fetchMyRedGifsCollections,
  addGifToRedGifsCollection,
  removeGifFromRedGifsCollection,
  createRedGifsCollection,
  deleteRedGifsCollection
} from './services/redgifs';

// Code-Splitting por Rutas y Modales (Patrón PRPL de Addy Osmani)
const SingleDownloader = lazy(() => import('./components/SingleDownloader').then(m => ({ default: m.SingleDownloader })));
const BatchDownloader = lazy(() => import('./components/BatchDownloader').then(m => ({ default: m.BatchDownloader })));
const ExploreSearch = lazy(() => import('./components/ExploreSearch').then(m => ({ default: m.ExploreSearch })));
const CreatorExplorer = lazy(() => import('./components/CreatorExplorer').then(m => ({ default: m.CreatorExplorer })));
const FavoritesList = lazy(() => import('./components/FavoritesList').then(m => ({ default: m.FavoritesList })));
const HistoryList = lazy(() => import('./components/HistoryList').then(m => ({ default: m.HistoryList })));
const LightboxModal = lazy(() => import('./components/LightboxModal').then(m => ({ default: m.LightboxModal })));
const TheaterFeedModal = lazy(() => import('./components/TheaterFeedModal').then(m => ({ default: m.TheaterFeedModal })));
const SaveToListModal = lazy(() => import('./components/SaveToListModal').then(m => ({ default: m.SaveToListModal })));
const BlockedCreatorsModal = lazy(() => import('./components/BlockedCreatorsModal').then(m => ({ default: m.BlockedCreatorsModal })));
const InstallPwaModal = lazy(() => import('./components/InstallPwaModal').then(m => ({ default: m.InstallPwaModal })));
const RedGifsAccountModal = lazy(() => import('./components/RedGifsAccountModal').then(m => ({ default: m.RedGifsAccountModal })));

function TabLoadingFallback() {
  return (
    <div className="py-24 text-center space-y-4 animate-fadeIn">
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-xl">
        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
      </div>
      <p className="text-slate-400 text-xs font-semibold">Cargando módulo bajo demanda...</p>
    </div>
  );
}

type TabType = 'discover' | 'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history';

interface NavState {
  tab: TabType;
  creator?: { username: string; timestamp: number };
  tag?: { tag: string; timestamp: number };
  batchUrls?: string;
  label?: string;
}

function getTabLabel(
  tab: TabType,
  creator?: { username: string; timestamp: number },
  tag?: { tag: string; timestamp: number }
): string {
  if (tab === 'creators' && creator?.username) return `@${creator.username}`;
  if (tab === 'explore' && tag?.tag) return `#${tag.tag}`;
  switch (tab) {
    case 'discover': return 'Novedades';
    case 'single': return 'Descargar';
    case 'batch': return 'Por Lotes';
    case 'explore': return 'Explorar';
    case 'creators': return 'Creadores';
    case 'favorites': return 'Listas & Favoritos';
    case 'history': return 'Historial';
    default: return 'Inicio';
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [selectedCreator, setSelectedCreator] = useState<{ username: string; timestamp: number }>({
    username: 'namiblossom',
    timestamp: Date.now()
  });
  const [selectedTag, setSelectedTag] = useState<{ tag: string; timestamp: number }>({
    tag: '',
    timestamp: 0
  });
  const [prefilledBatchUrls, setPrefilledBatchUrls] = useState<string>('');
  const [navHistory, setNavHistory] = useState<NavState[]>([]);

  // Detección automática de actualizaciones y nuevas versiones
  const {
    updateAvailable,
    latestVersionInfo,
    isUpdating,
    applyUpdate,
    dismissUpdate
  } = useAppUpdate();

  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [theaterState, setTheaterState] = useState<{
    open: boolean;
    videos: SearchResultItem[];
    startIndex: number;
    isLoading?: boolean;
  }>({
    open: false,
    videos: [],
    startIndex: 0,
    isLoading: false
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rg_history') || '[]');
    } catch {
      return [];
    }
  });

  // Sistema de Listas y Colecciones Personalizadas
  const [lists, setLists] = useState<CustomList[]>(() => {
    try {
      const saved = localStorage.getItem('rg_custom_lists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migración automática de favoritos clásicos
      const legacyFavs: SearchResultItem[] = JSON.parse(localStorage.getItem('rg_favorites') || '[]');
      return [
        {
          id: 'default',
          name: 'Favoritos',
          icon: '❤️',
          color: 'pink',
          createdAt: Date.now(),
          videos: legacyFavs
        }
      ];
    } catch {
      return [
        {
          id: 'default',
          name: 'Favoritos',
          icon: '❤️',
          color: 'pink',
          createdAt: Date.now(),
          videos: []
        }
      ];
    }
  });

  const [activeListId, setActiveListId] = useState<string>('default');
  const [saveModalVideo, setSaveModalVideo] = useState<SearchResultItem | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Estado de Cuenta y Listas de RedGIFs
  const [redGifsAccount, setRedGifsAccount] = useState<RedGifsUserAccount | null>(() => getStoredUserAccount());
  const [redGifsCollections, setRedGifsCollections] = useState<RedGifsCollection[]>(() => {
    try {
      const saved = localStorage.getItem('rg_redgifs_cached_collections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingRedGifsCollections, setIsLoadingRedGifsCollections] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Auto-conexión desde enlace rápido o código QR (#token=...)
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('token=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const tokenFromHash = params.get('token');
        if (tokenFromHash && tokenFromHash.trim()) {
          connectUserAccount(tokenFromHash.trim()).then(acc => {
            if (acc) {
              setRedGifsAccount(acc);
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              showToast(`¡Conectado con éxito a tu cuenta de RedGIFs: @${acc.username}! 🎉`);
            }
          }).catch(err => {
            console.error('Error al conectar token desde URL:', err);
          });
        }
      }
    } catch (e) {
      console.warn('Error al procesar token desde hash:', e);
    }
  }, []);

  useEffect(() => {
    if (redGifsAccount) {
      setIsLoadingRedGifsCollections(true);
      fetchMyRedGifsCollections()
        .then(colls => setRedGifsCollections(colls))
        .catch(err => console.warn('Error al precargar listas de RedGIFs:', err))
        .finally(() => setIsLoadingRedGifsCollections(false));
    }
  }, [redGifsAccount]);

  const handleConnectRedGifs = async (token: string) => {
    const acc = await connectUserAccount(token);
    setRedGifsAccount(acc);
    const colls = await fetchMyRedGifsCollections(true);
    setRedGifsCollections(colls);
  };

  const handleDisconnectRedGifs = () => {
    disconnectUserAccount();
    setRedGifsAccount(null);
    setRedGifsCollections([]);
    if (activeListId.startsWith('rg_coll_')) {
      setActiveListId('default');
    }
    showToast('Cuenta de RedGIFs desconectada');
  };

  const handleRefreshRedGifsCollections = async () => {
    setIsLoadingRedGifsCollections(true);
    try {
      const colls = await fetchMyRedGifsCollections(true);
      setRedGifsCollections(colls);
      showToast(`¡Sincronizadas ${colls.length} listas de RedGIFs!`);
    } catch (err: any) {
      showToast(err.message || 'Error al sincronizar listas de RedGIFs');
    } finally {
      setIsLoadingRedGifsCollections(false);
    }
  };

  const handleToggleVideoInRedGifsCollection = async (collectionId: string, video: SearchResultItem): Promise<boolean> => {
    await addGifToRedGifsCollection(collectionId, video.id);
    setRedGifsCollections(prev => prev.map(c => c.folderId === collectionId ? { ...c, totalItems: c.totalItems + 1 } : c));
    return true;
  };

  const handleCreateRedGifsCollection = async (name: string, description = '', isPrivate = false) => {
    const created = await createRedGifsCollection(name, description, isPrivate);
    setRedGifsCollections(prev => [created, ...prev]);
  };

  const handleDeleteRedGifsCollection = async (collectionId: string) => {
    await deleteRedGifsCollection(collectionId);
    setRedGifsCollections(prev => prev.filter(c => c.folderId !== collectionId));
  };

  const handleRemoveVideoFromRedGifsCollection = async (collectionId: string, videoId: string) => {
    await removeGifFromRedGifsCollection(collectionId, videoId);
    setRedGifsCollections(prev => prev.map(c => c.folderId === collectionId ? { ...c, totalItems: Math.max(0, c.totalItems - 1) } : c));
  };

  const saveLists = (newLists: CustomList[]) => {
    setLists(newLists);
    localStorage.setItem('rg_custom_lists', JSON.stringify(newLists));
  };

  const handleCreateList = (name: string, icon = '📁', color = 'purple', description = ''): string => {
    const newId = 'list_' + Date.now();
    const newList: CustomList = {
      id: newId,
      name: name.trim(),
      icon,
      color,
      description: description.trim(),
      createdAt: Date.now(),
      videos: []
    };
    const updated = [...lists, newList];
    saveLists(updated);
    return newId;
  };

  const handleDeleteList = (listId: string) => {
    if (listId === 'default') return;
    const updated = lists.filter(l => l.id !== listId);
    saveLists(updated);
    if (activeListId === listId) {
      setActiveListId('default');
    }
  };

  const handleRenameList = (listId: string, name: string, icon?: string, color?: string) => {
    const updated = lists.map(l => {
      if (l.id === listId) {
        return { ...l, name, icon: icon || l.icon, color: color || l.color };
      }
      return l;
    });
    saveLists(updated);
  };

  const handleToggleVideoInList = (listId: string, video: SearchResultItem) => {
    const targetList = lists.find(l => l.id === listId);
    if (!targetList) return;
    const exists = targetList.videos.some(v => v.id === video.id);
    let updatedVideos: SearchResultItem[];
    if (exists) {
      updatedVideos = targetList.videos.filter(v => v.id !== video.id);
      showToast(`Eliminado de "${targetList.name}"`);
    } else {
      updatedVideos = [video, ...targetList.videos.filter(v => v.id !== video.id)];
      showToast(`¡Añadido a "${targetList.name}"! ${targetList.icon || '❤️'}`);
    }
    const updatedLists = lists.map(l => (l.id === listId ? { ...l, videos: updatedVideos } : l));
    saveLists(updatedLists);
  };

  const handleRemoveVideoFromList = (listId: string, videoId: string) => {
    const updatedLists = lists.map(l => {
      if (l.id === listId) {
        return { ...l, videos: l.videos.filter(v => v.id !== videoId) };
      }
      return l;
    });
    saveLists(updatedLists);
  };

  const handleClearActiveList = (listId: string) => {
    const updatedLists = lists.map(l => (l.id === listId ? { ...l, videos: [] } : l));
    saveLists(updatedLists);
  };

  const handleImportLists = (imported: CustomList[]) => {
    const existingIds = new Set(lists.map(l => l.id));
    const newLists = imported.map(l => {
      if (existingIds.has(l.id)) {
        return { ...l, id: l.id + '_' + Date.now() };
      }
      return l;
    });
    const combined = [...lists, ...newLists];
    saveLists(combined);
  };

  const isFavorite = (id: string): boolean => {
    return lists.some(l => l.videos.some(v => v.id === id));
  };

  const handleToggleFavorite = (video: SearchResultItem) => {
    setSaveModalVideo(video);
    setIsSaveModalOpen(true);
  };

  const totalFavoritesCount = useMemo(() => {
    const uniqueIds = new Set<string>();
    lists.forEach(l => l.videos.forEach(v => uniqueIds.add(v.id)));
    return uniqueIds.size;
  }, [lists]);

  const [lightbox, setLightbox] = useState<{
    open: boolean;
    url: string;
    title: string;
    tags?: string[];
    userName?: string;
    originalItem?: SearchResultItem;
  }>({
    open: false,
    url: '',
    title: '',
    tags: [],
    userName: ''
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Sistema de Creadores Bloqueados (Lista Negra Permanente)
  const [blockedCreators, setBlockedCreators] = useState<string[]>(() => getBlockedCreators());
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);

  const handleBlockCreator = useCallback((username: string) => {
    const clean = username.trim().replace(/^@/, '');
    if (!clean) return;
    setBlockedCreators(prev => {
      if (prev.some(c => c.toLowerCase() === clean.toLowerCase())) return prev;
      const updated = [...prev, clean];
      localStorage.setItem('rg_blocked_creators', JSON.stringify(updated));
      return updated;
    });
    showToast(`🚫 Creador @${clean} bloqueado permanentemente`);

    // Cerrar Lightbox si el video activo es del creador bloqueado
    setLightbox(prev => {
      if (prev.open && prev.userName?.toLowerCase() === clean.toLowerCase()) {
        return { open: false, url: '', title: '', tags: [], userName: '' };
      }
      return prev;
    });

    // Limpiar videos en el feed Reels si pertenecen a este creador
    setTheaterState(prev => {
      if (!prev.open) return prev;
      const filtered = prev.videos.filter(v => v.userName?.toLowerCase() !== clean.toLowerCase());
      if (filtered.length === 0) {
        return { ...prev, open: false, videos: [] };
      }
      const newIdx = Math.min(prev.startIndex, filtered.length - 1);
      return { ...prev, videos: filtered, startIndex: Math.max(0, newIdx) };
    });
  }, [showToast]);

  const handleUnblockCreator = useCallback((username: string) => {
    const clean = username.trim().replace(/^@/, '');
    setBlockedCreators(prev => {
      const updated = prev.filter(c => c.toLowerCase() !== clean.toLowerCase());
      localStorage.setItem('rg_blocked_creators', JSON.stringify(updated));
      return updated;
    });
    showToast(`✅ Creador @${clean} desbloqueado`);
  }, [showToast]);

  const handleClearAllBlocked = useCallback(() => {
    setBlockedCreators([]);
    localStorage.removeItem('rg_blocked_creators');
    showToast('Se han desbloqueado todos los creadores');
  }, [showToast]);

  const isBlocked = useCallback((username?: string): boolean => {
    if (!username) return false;
    const clean = username.toLowerCase().trim().replace(/^@/, '');
    return blockedCreators.some(c => c.toLowerCase().trim().replace(/^@/, '') === clean);
  }, [blockedCreators]);

  // Navegar a una pestaña o vista guardando el estado en el historial de navegación
  const navigateTo = useCallback(
    (
      newTab: TabType,
      extra?: {
        creator?: { username: string; timestamp: number };
        tag?: { tag: string; timestamp: number };
        batchUrls?: string;
      }
    ) => {
      setNavHistory(prev => {
        const currentState: NavState = {
          tab: activeTab,
          creator: selectedCreator,
          tag: selectedTag,
          batchUrls: prefilledBatchUrls,
          label: getTabLabel(activeTab, selectedCreator, selectedTag)
        };
        // Evitar duplicar el último estado idéntico
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (
            last.tab === currentState.tab &&
            last.creator?.username === currentState.creator?.username &&
            last.tag?.tag === currentState.tag?.tag
          ) {
            return prev;
          }
        }
        return [...prev, currentState].slice(-30);
      });

      if (extra?.creator) setSelectedCreator(extra.creator);
      if (extra?.tag) setSelectedTag(extra.tag);
      if (extra?.batchUrls !== undefined) setPrefilledBatchUrls(extra.batchUrls);
      setActiveTab(newTab);
    },
    [activeTab, selectedCreator, selectedTag, prefilledBatchUrls]
  );

  // Volver atrás en el historial de navegación
  const handleGoBack = useCallback(() => {
    if (navHistory.length === 0) {
      if (activeTab !== 'discover') {
        setActiveTab('discover');
        showToast('Volviendo a Novedades');
      }
      return;
    }

    const prev = navHistory[navHistory.length - 1];
    setNavHistory(h => h.slice(0, -1));

    if (prev.creator) setSelectedCreator(prev.creator);
    if (prev.tag) setSelectedTag(prev.tag);
    if (prev.batchUrls !== undefined) setPrefilledBatchUrls(prev.batchUrls);
    setActiveTab(prev.tab);

    const prevName = prev.label || getTabLabel(prev.tab, prev.creator, prev.tag);
    showToast(`← Regresando a ${prevName}`);
  }, [navHistory, activeTab, showToast]);

  // Atajos de teclado: Alt + ArrowLeft o integración con eventos del navegador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + ArrowLeft
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      }
    };

    const handlePopState = () => {
      if (navHistory.length > 0) {
        handleGoBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleGoBack, navHistory.length]);

  const handleOpenCreator = (username: string) => {
    const cleanUser = username.trim().replace(/^@/, '');
    navigateTo('creators', { creator: { username: cleanUser, timestamp: Date.now() } });
  };

  const handleOpenTag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#/, '');
    navigateTo('explore', { tag: { tag: cleanTag, timestamp: Date.now() } });
    showToast(`Mostrando videos con etiqueta #${cleanTag}`);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    navigateTo(tab);
  };

  const handleOpenTheater = (videos?: SearchResultItem[], startIndex = 0) => {
    if (videos && videos.length > 0) {
      setTheaterState({ open: true, videos, startIndex, isLoading: false });
    } else {
      setTheaterState({ open: true, videos: [], startIndex: 0, isLoading: true });
      showToast('Cargando videos para el Feed Reels...');
      searchVideosExtended('trending', 24, 1)
        .then(res => {
          if (res.items.length > 0) {
            setTheaterState({ open: true, videos: res.items, startIndex: 0, isLoading: false });
          } else {
            showToast('No se encontraron videos');
            setTheaterState(prev => ({ ...prev, open: false, isLoading: false }));
          }
        })
        .catch(() => {
          showToast('Error al cargar videos para el Feed');
          setTheaterState(prev => ({ ...prev, open: false, isLoading: false }));
        });
    }
  };

  const handleOpenLightbox = (
    url: string,
    title: string,
    tags?: string[],
    userName?: string,
    originalItem?: SearchResultItem
  ) => {
    setLightbox({
      open: true,
      url,
      title,
      tags: tags || [],
      userName: userName || '',
      originalItem
    });
  };

  const handleSuccessDownload = (video: RedGifItem, quality: string, filename: string, size_mb?: number) => {
    const newItem: HistoryItem = {
      id: video.id,
      title: video.title,
      userName: video.userName,
      filename,
      quality,
      timestamp: Date.now(),
      url: quality === 'hd' ? video.hd_url : video.sd_url,
      size_mb
    };
    const updated = [newItem, ...history.filter(h => h.id !== video.id)].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('rg_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('rg_history');
    showToast('Historial vaciado');
  };

  const canGoBack = navHistory.length > 0 || activeTab !== 'discover';
  const previousTabLabel = navHistory.length > 0
    ? (navHistory[navHistory.length - 1].label || getTabLabel(navHistory[navHistory.length - 1].tab))
    : (activeTab !== 'discover' ? 'Novedades' : undefined);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 relative overflow-x-hidden">
      {/* Luces de ambiente (Optimizadas con gradientes radiales estáticos para cero coste de composición GPU) */}
      <div className="fixed top-[-100px] left-[20%] w-[500px] h-[500px] ambient-glow-red rounded-full pointer-events-none" />
      <div className="fixed top-[300px] right-[15%] w-[450px] h-[450px] ambient-glow-purple rounded-full pointer-events-none" />

      {/* Banner flotante de aviso de actualización disponible */}
      <UpdateNotificationBanner
        isOpen={updateAvailable}
        versionInfo={latestVersionInfo}
        isUpdating={isUpdating}
        onApplyUpdate={applyUpdate}
        onDismiss={dismissUpdate}
      />

      {/* Header modular con soporte de retroceso */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        historyCount={history.length}
        favoritesCount={totalFavoritesCount}
        blockedCount={blockedCreators.length}
        redGifsAccount={redGifsAccount}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenBlockedModal={() => setIsBlockedModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenTheater={() => handleOpenTheater()}
        canGoBack={canGoBack}
        onGoBack={handleGoBack}
        previousTabLabel={previousTabLabel}
      />

      {/* Barra de Navegación / Botón de Volver Atrás */}
      {canGoBack && (
        <div className="max-w-5xl mx-auto px-4 pt-4 -mb-4 flex items-center justify-between animate-fadeIn">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-transform shadow-md hover:border-pink-500/40 active:scale-95 cursor-pointer group"
            title={`Volver a ${previousTabLabel || 'atrás'} (Alt + ←)`}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-pink-400 group-hover:-translate-x-1 transition-transform" />
            <span>Volver {previousTabLabel ? `a ${previousTabLabel}` : 'atrás'}</span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline ml-1 px-1.5 py-0.2 rounded bg-black/40 border border-white/10">Alt+←</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="hidden sm:inline text-slate-500">Ubicación:</span>
            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 font-bold">
              {getTabLabel(activeTab, selectedCreator, selectedTag)}
            </span>
          </div>
        </div>
      )}

      {/* Contenido principal optimizado para iPad y Desktop con Suspense */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-32 sm:pb-36">
        <Suspense fallback={<TabLoadingFallback />}>
          {activeTab === 'discover' && (
            <DiscoverHub
              onOpenLightbox={handleOpenLightbox}
              onOpenTheater={handleOpenTheater}
              onSelectCreator={handleOpenCreator}
              onSelectTag={handleOpenTag}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={isFavorite}
              showToast={showToast}
              onSuccessDownload={handleSuccessDownload}
              onBlockCreator={handleBlockCreator}
            />
          )}

          {activeTab === 'single' && (
            <SingleDownloader
              onSuccessDownload={handleSuccessDownload}
              showToast={showToast}
              onSelectTag={handleOpenTag}
              onOpenTheater={handleOpenTheater}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={isFavorite}
            />
          )}

          {activeTab === 'batch' && (
            <BatchDownloader
              onSuccessDownload={handleSuccessDownload}
              showToast={showToast}
              initialUrls={prefilledBatchUrls}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreSearch
              onOpenLightbox={handleOpenLightbox}
              onSuccessDownload={handleSuccessDownload}
              showToast={showToast}
              onSelectCreator={handleOpenCreator}
              initialTag={selectedTag.tag}
              tagTimestamp={selectedTag.timestamp}
              onUpdateQuery={(q) => {
                setSelectedTag(prev => ({ ...prev, tag: q }));
              }}
              onOpenTheater={handleOpenTheater}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={isFavorite}
              onBlockCreator={handleBlockCreator}
              onSendToBatch={(urls) => {
                navigateTo('batch', { batchUrls: urls.join('\n') });
                showToast(`${urls.length} videos transferidos a Descarga por Lotes`);
              }}
            />
          )}

          {activeTab === 'creators' && (
            <CreatorExplorer
              onOpenLightbox={handleOpenLightbox}
              onSuccessDownload={handleSuccessDownload}
              showToast={showToast}
              initialUsername={selectedCreator.username}
              creatorTimestamp={selectedCreator.timestamp}
              onSelectTag={handleOpenTag}
              onOpenTheater={handleOpenTheater}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={isFavorite}
              canGoBack={canGoBack}
              onGoBack={handleGoBack}
              previousLabel={previousTabLabel}
              onBlockCreator={handleBlockCreator}
              onUnblockCreator={handleUnblockCreator}
              isCreatorBlocked={isBlocked}
              onSendToBatch={(urls) => {
                navigateTo('batch', { batchUrls: urls.join('\n') });
                showToast(`${urls.length} videos transferidos a Descarga por Lotes`);
              }}
            />
          )}

          {activeTab === 'favorites' && (
            <FavoritesList
              lists={lists}
              activeListId={activeListId}
              redGifsAccount={redGifsAccount}
              redGifsCollections={redGifsCollections}
              isLoadingRedGifsCollections={isLoadingRedGifsCollections}
              onSelectList={setActiveListId}
              onCreateList={handleCreateList}
              onDeleteList={handleDeleteList}
              onRenameList={handleRenameList}
              onRemoveVideoFromList={handleRemoveVideoFromList}
              onRefreshRedGifsCollections={handleRefreshRedGifsCollections}
              onCreateRedGifsCollection={handleCreateRedGifsCollection}
              onDeleteRedGifsCollection={handleDeleteRedGifsCollection}
              onRemoveVideoFromRedGifsCollection={handleRemoveVideoFromRedGifsCollection}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
              onOpenSaveToListModal={handleToggleFavorite}
              onOpenLightbox={handleOpenLightbox}
              onOpenTheater={handleOpenTheater}
              onSelectCreator={handleOpenCreator}
              onSelectTag={handleOpenTag}
              onSendToBatch={(urls) => {
                navigateTo('batch', { batchUrls: urls.join('\n') });
                showToast(`${urls.length} videos transferidos a Descarga por Lotes`);
              }}
              onSuccessDownload={handleSuccessDownload}
              onImportLists={handleImportLists}
              onClearActiveList={handleClearActiveList}
              showToast={showToast}
            />
          )}

          {activeTab === 'history' && (
            <HistoryList
              history={history}
              onClearHistory={handleClearHistory}
              onOpenLightbox={(url, title) => handleOpenLightbox(url, title, [])}
            />
          )}
        </Suspense>
      </main>

      {/* Barra de Navegación Flotante Táctil para iPad y Dispositivos Móviles */}
      <TabletBottomDock
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        favoritesCount={totalFavoritesCount}
        onOpenTheater={() => handleOpenTheater()}
      />

      {/* Modal Guardar en Lista Personalizada */}
      {isSaveModalOpen && (
        <Suspense fallback={null}>
          <SaveToListModal
            isOpen={isSaveModalOpen}
            video={saveModalVideo}
            lists={lists}
            redGifsAccount={redGifsAccount}
            redGifsCollections={redGifsCollections}
            isLoadingRedGifsCollections={isLoadingRedGifsCollections}
            onClose={() => {
              setIsSaveModalOpen(false);
              setSaveModalVideo(null);
            }}
            onToggleVideoInList={handleToggleVideoInList}
            onCreateList={handleCreateList}
            onToggleVideoInRedGifsCollection={handleToggleVideoInRedGifsCollection}
            onCreateRedGifsCollection={handleCreateRedGifsCollection}
            onOpenAccountModal={() => {
              setIsSaveModalOpen(false);
              setIsAccountModalOpen(true);
            }}
            showToast={showToast}
          />
        </Suspense>
      )}

      {/* Modal Lightbox */}
      {lightbox.open && (
        <Suspense fallback={null}>
          <LightboxModal
            open={lightbox.open}
            url={lightbox.url}
            title={lightbox.title}
            tags={lightbox.tags}
            userName={lightbox.userName}
            originalItem={lightbox.originalItem}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            onSelectTag={handleOpenTag}
            onSelectCreator={handleOpenCreator}
            showToast={showToast}
            onSuccessDownload={handleSuccessDownload}
            onBlockCreator={handleBlockCreator}
            onSwitchVideo={(item) => {
              setLightbox({
                open: true,
                url: item.hd_url || item.sd_url,
                title: item.title,
                tags: item.tags,
                userName: item.userName,
                originalItem: item
              });
            }}
            onOpenTheater={
              lightbox.originalItem
                ? () => {
                    setLightbox({ open: false, url: '', title: '', tags: [], userName: '' });
                    handleOpenTheater([lightbox.originalItem!], 0);
                  }
                : undefined
            }
            onClose={() => setLightbox({ open: false, url: '', title: '', tags: [], userName: '' })}
          />
        </Suspense>
      )}

      {/* Modal Feed Continuo / Reels (Modo Teatro) */}
      {theaterState.open && (
        <Suspense fallback={null}>
          <TheaterFeedModal
            open={theaterState.open}
            videos={theaterState.videos}
            initialIndex={theaterState.startIndex}
            isLoadingInitial={theaterState.isLoading}
            onClose={() => setTheaterState(prev => ({ ...prev, open: false, isLoading: false }))}
            onSelectTag={handleOpenTag}
            onSelectCreator={handleOpenCreator}
            onSuccessDownload={handleSuccessDownload}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            onBlockCreator={handleBlockCreator}
            showToast={showToast}
          />
        </Suspense>
      )}

      
      {/* Modal Conexión de Cuenta de RedGIFs */}
      {isAccountModalOpen && (
        <Suspense fallback={null}>
          <RedGifsAccountModal
            isOpen={isAccountModalOpen}
            account={redGifsAccount}
            collections={redGifsCollections}
            isLoadingCollections={isLoadingRedGifsCollections}
            onClose={() => setIsAccountModalOpen(false)}
            onConnect={handleConnectRedGifs}
            onDisconnect={handleDisconnectRedGifs}
            onRefreshCollections={handleRefreshRedGifsCollections}
            onCreateCollection={handleCreateRedGifsCollection}
            showToast={showToast}
          />
        </Suspense>
      )}

      {/* Modal Administrar Creadores Bloqueados */}
      {isBlockedModalOpen && (
        <Suspense fallback={null}>
          <BlockedCreatorsModal
            isOpen={isBlockedModalOpen}
            onClose={() => setIsBlockedModalOpen(false)}
            blockedCreators={blockedCreators}
            onUnblockCreator={handleUnblockCreator}
            onClearAllBlocked={handleClearAllBlocked}
            showToast={showToast}
          />
        </Suspense>
      )}

      {/* Modal Instalación PWA */}
      {isInstallModalOpen && (
        <Suspense fallback={null}>
          <InstallPwaModal
            open={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
            showToast={showToast}
          />
        </Suspense>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12141c] border border-red-500 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl shadow-red-500/20 animate-slideUp">
          {toast}
        </div>
      )}
    </div>
  );
}
