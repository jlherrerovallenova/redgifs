import React from 'react';
import { Download, Layers, Search, History, User, Smartphone, Sparkles, Film, Heart } from 'lucide-react';

interface HeaderProps {
  activeTab: 'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history';
  setActiveTab: (tab: 'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history') => void;
  historyCount: number;
  favoritesCount?: number;
  onOpenInstallModal?: () => void;
  onOpenTheater?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  historyCount,
  favoritesCount = 0,
  onOpenInstallModal,
  onOpenTheater
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-pink-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/30">
            RG
          </div>
          <div>
            <h1 className="font-display font-extrabold text-xl tracking-tight">
              RED<span className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">GIFS</span> PRO
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vite & PWA Native Edition</p>
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10" aria-label="Pestañas principales">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'single' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" /> Descargar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'batch' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" /> Por Lotes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'explore' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" /> Explorar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('creators')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'creators' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" /> Creadores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'favorites' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'text-pink-400 fill-pink-500/40' : ''}`} /> Favoritos
              {favoritesCount > 0 && (
                <span className="bg-pink-500/20 text-pink-300 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'history' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" /> Historial
              {historyCount > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Botón Feed Continuo / Reels */}
          {onOpenTheater && (
            <button
              type="button"
              onClick={onOpenTheater}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-md shadow-red-500/20 active:scale-95 cursor-pointer shrink-0"
              title="Abrir modo Feed continuo / Reels a pantalla completa"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Feed Reels</span>
            </button>
          )}

          {/* Botón de Instalación PWA */}
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-300 border border-purple-500/30 hover:border-purple-400 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              title="Instalar RedGIFs Pro en tu iPad, iPhone o PC"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
