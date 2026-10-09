import React from 'react';
import { ArrowLeft, Download, Layers, Search, History, User, Smartphone, Sparkles, Film, Heart } from 'lucide-react';

interface HeaderProps {
  activeTab: 'discover' | 'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history';
  setActiveTab: (tab: 'discover' | 'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history') => void;
  historyCount: number;
  favoritesCount?: number;
  onOpenInstallModal?: () => void;
  onOpenTheater?: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  previousTabLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  historyCount,
  favoritesCount = 0,
  onOpenInstallModal,
  onOpenTheater,
  canGoBack = false,
  onGoBack,
  previousTabLabel
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#090a0f]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 w-full">
        {/* Logo & Branding */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            {canGoBack && onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                aria-label="Volver atrás"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all shadow-md shadow-black/40 active:scale-95 cursor-pointer shrink-0 group"
                title={previousTabLabel ? `Volver a ${previousTabLabel} (Alt + ←)` : 'Volver atrás (Alt + ←)'}
              >
                <ArrowLeft className="w-4 h-4 text-pink-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Atrás</span>
              </button>
            )}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 via-pink-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/30 shrink-0">
              RG
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg sm:text-xl tracking-tight leading-tight">
                RED<span className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">GIFS</span> PRO
              </h1>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vite & PWA Native Edition</p>
            </div>
          </div>

          {/* Quick Action buttons on mobile top right */}
          <div className="flex md:hidden items-center gap-1.5">
            {onOpenTheater && (
              <button
                type="button"
                onClick={onOpenTheater}
                aria-label="Abrir Feed Reels"
                className="flex items-center gap-1 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white px-2.5 py-1 rounded-full text-xs font-bold transition-transform active:scale-95 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Reels</span>
              </button>
            )}
            {onOpenInstallModal && (
              <button
                type="button"
                onClick={onOpenInstallModal}
                aria-label="Instalar aplicación en dispositivo"
                className="p-1.5 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 transition-colors hover:bg-purple-600/30"
                title="Instalar App"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 overflow-x-auto no-scrollbar max-w-full pb-0.5">
          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 shrink-0 overflow-x-auto no-scrollbar" aria-label="Pestañas principales">
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 ${
                activeTab === 'discover' ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" /> <span>Novedades</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 ${
                activeTab === 'single' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> <span>Descargar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 ${
                activeTab === 'batch' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> <span>Por Lotes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 ${
                activeTab === 'explore' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> <span>Explorar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('creators')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 ${
                activeTab === 'creators' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> <span>Creadores</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 ${
                activeTab === 'favorites' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesCount > 0 ? 'text-pink-400 fill-pink-500/40' : ''}`} /> <span>Mis Listas</span>
              {favoritesCount > 0 && (
                <span className="bg-pink-500/20 text-pink-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 ${
                activeTab === 'history' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" /> <span>Historial</span>
              {historyCount > 0 && (
                <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {onOpenTheater && (
              <button
                type="button"
                onClick={onOpenTheater}
                aria-label="Abrir modo Feed continuo / Reels a pantalla completa"
                className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-transform active:scale-95 shadow-md shadow-red-500/20 cursor-pointer shrink-0"
                title="Abrir modo Feed continuo / Reels a pantalla completa"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Feed Reels</span>
              </button>
            )}

            {onOpenInstallModal && (
              <button
                type="button"
                onClick={onOpenInstallModal}
                aria-label="Instalar RedGIFs Pro en dispositivo"
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-300 border border-purple-500/30 hover:border-purple-400 px-3 py-1.5 rounded-full text-xs font-bold transition-transform active:scale-95 shadow-sm cursor-pointer shrink-0"
                title="Instalar RedGIFs Pro en tu iPad, iPhone o PC"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden xl:inline">Instalar App</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
