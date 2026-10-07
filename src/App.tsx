import React, { useState } from 'react';
import { RedGifItem, HistoryItem, SearchResultItem } from './types';
import { Header } from './components/Header';
import { SingleDownloader } from './components/SingleDownloader';
import { BatchDownloader } from './components/BatchDownloader';
import { ExploreSearch } from './components/ExploreSearch';
import { CreatorExplorer } from './components/CreatorExplorer';
import { FavoritesList } from './components/FavoritesList';
import { HistoryList } from './components/HistoryList';
import { LightboxModal } from './components/LightboxModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { TheaterFeedModal } from './components/TheaterFeedModal';
import { searchVideosExtended } from './services/redgifs';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history'>('single');
  const [selectedCreator, setSelectedCreator] = useState<{ username: string; timestamp: number }>({
    username: 'namiblossom',
    timestamp: Date.now()
  });
  const [selectedTag, setSelectedTag] = useState<{ tag: string; timestamp: number }>({
    tag: '',
    timestamp: 0
  });
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

  const [favorites, setFavorites] = useState<SearchResultItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rg_favorites') || '[]');
    } catch {
      return [];
    }
  });

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const [prefilledBatchUrls, setPrefilledBatchUrls] = useState<string>('');

  const handleOpenCreator = (username: string) => {
    const cleanUser = username.trim().replace(/^@/, '');
    setSelectedCreator({ username: cleanUser, timestamp: Date.now() });
    setActiveTab('creators');
  };

  const handleOpenTag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#/, '');
    setSelectedTag({ tag: cleanTag, timestamp: Date.now() });
    setActiveTab('explore');
    showToast(`Mostrando videos con etiqueta #${cleanTag}`);
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

  const handleToggleFavorite = (video: SearchResultItem) => {
    const exists = favorites.some(f => f.id === video.id);
    let updated: SearchResultItem[];
    if (exists) {
      updated = favorites.filter(f => f.id !== video.id);
      showToast('Eliminado de favoritos');
    } else {
      updated = [video, ...favorites.filter(f => f.id !== video.id)];
      showToast('¡Añadido a favoritos! ❤️');
    }
    setFavorites(updated);
    localStorage.setItem('rg_favorites', JSON.stringify(updated));
  };

  const isFavorite = (id: string): boolean => {
    return favorites.some(f => f.id === id);
  };

  const handleImportFavorites = (imported: SearchResultItem[]) => {
    const existingIds = new Set(favorites.map(f => f.id));
    const newItems = imported.filter(item => item && item.id && !existingIds.has(item.id));
    const combined = [...newItems, ...favorites];
    setFavorites(combined);
    localStorage.setItem('rg_favorites', JSON.stringify(combined));
  };

  const handleClearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem('rg_favorites');
    showToast('Lista de favoritos vaciada');
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 relative overflow-x-hidden">
      {/* Luces de ambiente */}
      <div className="fixed top-[-100px] left-[20%] w-[500px] h-[500px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="fixed top-[300px] right-[15%] w-[450px] h-[450px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header modular */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={history.length}
        favoritesCount={favorites.length}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenTheater={() => handleOpenTheater()}
      />

      {/* Contenido principal */}
      <main className="max-w-5xl mx-auto px-4 py-10">
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
            onOpenTheater={handleOpenTheater}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            onSendToBatch={(urls) => {
              setPrefilledBatchUrls(urls.join('\n'));
              setActiveTab('batch');
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
            onSendToBatch={(urls) => {
              setPrefilledBatchUrls(urls.join('\n'));
              setActiveTab('batch');
              showToast(`${urls.length} videos transferidos a Descarga por Lotes`);
            }}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesList
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenLightbox={handleOpenLightbox}
            onOpenTheater={handleOpenTheater}
            onSelectCreator={handleOpenCreator}
            onSelectTag={handleOpenTag}
            onSendToBatch={(urls) => {
              setPrefilledBatchUrls(urls.join('\n'));
              setActiveTab('batch');
              showToast(`${urls.length} videos transferidos a Descarga por Lotes`);
            }}
            onSuccessDownload={handleSuccessDownload}
            onImportFavorites={handleImportFavorites}
            onClearFavorites={handleClearFavorites}
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
