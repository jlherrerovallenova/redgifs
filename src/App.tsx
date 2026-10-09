import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { RedGifItem, HistoryItem, SearchResultItem, CustomList } from './types';
import { Header } from './components/Header';
import { DiscoverHub } from './components/DiscoverHub';
import { SingleDownloader } from './components/SingleDownloader';
import { BatchDownloader } from './components/BatchDownloader';
import { ExploreSearch } from './components/ExploreSearch';
import { CreatorExplorer } from './components/CreatorExplorer';
import { FavoritesList } from './components/FavoritesList';
import { HistoryList } from './components/HistoryList';
import { LightboxModal } from './components/LightboxModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { TheaterFeedModal } from './components/TheaterFeedModal';
import { SaveToListModal } from './components/SaveToListModal';
import { TabletBottomDock } from './components/TabletBottomDock';
import { searchVideosExtended } from './services/redgifs';

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
      {/* Luces de ambiente */}
      <div className="fixed top-[-100px] left-[20%] w-[500px] h-[500px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="fixed top-[300px] right-[15%] w-[450px] h-[450px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header modular con soporte de retroceso */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        historyCount={history.length}
        favoritesCount={totalFavoritesCount}
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
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all shadow-md hover:border-pink-500/40 active:scale-95 cursor-pointer group"
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

      {/* Contenido principal optimizado para iPad y Desktop */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-32 sm:pb-36">
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
              setSelectedTag({ tag: q, timestamp: Date.now() });
            }}
            onOpenTheater={handleOpenTheater}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
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
            onSelectList={setActiveListId}
            onCreateList={handleCreateList}
            onDeleteList={handleDeleteList}
            onRenameList={handleRenameList}
            onRemoveVideoFromList={handleRemoveVideoFromList}
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
      </main>

      {/* Barra de Navegación Flotante Táctil para iPad y Dispositivos Móviles */}
      <TabletBottomDock
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        favoritesCount={totalFavoritesCount}
        onOpenTheater={() => handleOpenTheater()}
      />

      {/* Modal Guardar en Lista Personalizada */}
      <SaveToListModal
        isOpen={isSaveModalOpen}
        video={saveModalVideo}
        lists={lists}
        onClose={() => {
          setIsSaveModalOpen(false);
          setSaveModalVideo(null);
        }}
        onToggleVideoInList={handleToggleVideoInList}
        onCreateList={handleCreateList}
        showToast={showToast}
      />

      {/* Modal Lightbox */}
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

      {/* Modal Feed Continuo / Reels (Modo Teatro) */}
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
        showToast={showToast}
      />

      {/* Modal Instalación PWA */}
      <InstallPwaModal
        open={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        showToast={showToast}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12141c] border border-red-500 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl shadow-red-500/20 animate-slideUp">
          {toast}
        </div>
      )}
    </div>
  );
}
