import React, { useState } from 'react';
import { Download, Play } from 'lucide-react';
import { SearchResultItem, RedGifItem } from '../types';
import { searchVideos, getVideoInfo, downloadVideoFile } from '../services/redgifs';

interface ExploreSearchProps {
  onOpenLightbox: (url: string, title: string) => void;
  onSuccessDownload: (video: RedGifItem, quality: string, filename: string) => void;
  showToast: (msg: string) => void;
}

export const ExploreSearch: React.FC<ExploreSearchProps> = ({ onOpenLightbox, onSuccessDownload, showToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const results = await searchVideos(query, 24);
      setSearchResults(results);
    } catch {
      showToast('Error al buscar videos');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickDownload = async (item: SearchResultItem) => {
    showToast(`Iniciando descarga de ${item.id}...`);
    try {
      const info = await getVideoInfo(item.id);
      const filename = `${item.userName}_${item.id}_hd.mp4`;
      await downloadVideoFile(info.hd_url, filename);
      showToast(`¡Descargado!: ${filename}`);
      onSuccessDownload(info, 'hd', filename);
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold font-display">Explora videos de RedGIFs</h2>
        <p className="text-slate-400 text-sm">Busca por términos o temáticas y descárgalos con un clic.</p>
        
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 pt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar videos por tag o creador"
            placeholder="Buscar por tag o creador..."
            className="flex-1 bg-[#12141c] border border-white/10 rounded-full px-5 py-2.5 text-sm outline-none text-white focus:border-red-500/60 transition-colors duration-200"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-red-500/25 transition-transform duration-150 active:scale-95 disabled:opacity-50"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
        {searchResults.map((item) => (
          <div key={item.id} className="bg-[#12141c] border border-white/10 rounded-xl overflow-hidden group hover:border-red-500/40 transition-colors duration-200 flex flex-col">
            <button
              type="button"
              onClick={() => onOpenLightbox(item.hd_url || item.sd_url, item.title)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenLightbox(item.hd_url || item.sd_url, item.title);
                }
              }}
              aria-label={`Reproducir video ${item.title}`}
              className="relative aspect-video bg-black cursor-pointer overflow-hidden text-left border-none p-0 w-full"
            >
              <img
                src={item.thumbnail_url}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg">
                  <Play className="w-5 h-5 fill-white" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                {item.duration}s
              </span>
            </button>
            <div className="p-3 space-y-2 flex flex-col flex-1">
              <h3 className="text-xs font-bold truncate text-slate-200">{item.title}</h3>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-red-400 font-semibold truncate">@{item.userName}</span>
                <span>{item.views.toLocaleString()} vistas</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickDownload(item)}
                className="w-full mt-auto bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-transform duration-150 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" /> Descargar HD
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
