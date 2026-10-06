import React, { useState } from 'react';
import { RedGifItem, HistoryItem } from './types';
import { Header } from './components/Header';
import { SingleDownloader } from './components/SingleDownloader';
import { BatchDownloader } from './components/BatchDownloader';
import { ExploreSearch } from './components/ExploreSearch';
import { CreatorExplorer } from './components/CreatorExplorer';
import { HistoryList } from './components/HistoryList';
import { LightboxModal } from './components/LightboxModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'explore' | 'creators' | 'history'>('single');
  const [selectedCreator, setSelectedCreator] = useState<string>('namiblossom');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rg_history') || '[]');
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
    setSelectedCreator(username);
    setActiveTab('creators');
  };

  const handleOpenTag = (tag: string) => {
    setSelectedTag(tag);
    setActiveTab('explore');
  };

  const handleOpenLightbox = (url: string, title: string, tags?: string[], userName?: string) => {
    setLightbox({
      open: true,
      url,
      title,
      tags: tags || [],
      userName: userName || ''
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
      />

      {/* Contenido principal */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {activeTab === 'single' && (
          <SingleDownloader
            onSuccessDownload={handleSuccessDownload}
            showToast={showToast}
            onSelectTag={handleOpenTag}
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
            initialTag={selectedTag}
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
            initialUsername={selectedCreator}
            onSelectTag={handleOpenTag}
            onSendToBatch={(urls) => {
              setPrefilledBatchUrls(urls.join('\n'));
              setActiveTab('batch');
              showToast(`${urls.length} videos transferidos a Descarga por Lotes`);
            }}
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
        onSelectTag={handleOpenTag}
        onSelectCreator={handleOpenCreator}
        onClose={() => setLightbox({ open: false, url: '', title: '', tags: [], userName: '' })}
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
