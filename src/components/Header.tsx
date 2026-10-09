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
    <header className="sticky top-0 z-40 bg-[#090a0f]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-5 py-2.5 sm:py-3 select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4 w-full">
        
        {/* Logo & Branding (Left side - Always shrink-0 and clean) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {canGoBack && onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              aria-label="Volver atrás"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all shadow-md shadow-black/40 active:scale-95 cursor-pointer shrink-0 group"
              title={previousTabLabel ? `Volver a ${previousTabLabel} (Alt + ←)` : 'Volver atrás (Alt + ←)'}
            >
              <ArrowLeft className="w-4 h-4 text-pink-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline text-xs">Atrás</span>
            </button>
          )}

          <div
            onClick={() => setActiveTab('discover')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 via-pink-600 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-red-500/30 shrink-0 group-hover:scale-105 transition-transform">
              RG
            </div>
            <div className="leading-tight">
              <h1 className="font-display font-extrabold text-base sm:text-lg lg:text-xl tracking-tight leading-none whitespace-nowrap">
                RED<span className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">GIFS</span> PRO
              </h1>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold whitespace-nowrap mt-0.5">
                Vite & iPadOS Native
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Desktop / Landscape screens - Flexible & never overlapping) */}
        <nav
          className="hidden xl:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 shrink-0 overflow-x-auto no-scrollbar max-w-full"
          aria-label="Pestañas principales"
        >
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'discover'
                ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" /> <span>Novedades</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'explore'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> <span>Explorar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('creators')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'creators'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" /> <span>Creadores</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'favorites'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${favoritesCount > 0 ? 'text-pink-400 fill-pink-500/40' : ''}`} />
            <span>Mis Listas</span>
            {favoritesCount > 0 && (
              <span className="bg-pink-500/20 text-pink-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {favoritesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'single'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> <span>Descargar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'batch'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> <span>Por Lotes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
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

        {/* Action Buttons (Right side - Reels & Install App) */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenTheater && (
            <button
              type="button"
              onClick={onOpenTheater}
              aria-label="Abrir Feed Reels"
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-transform active:scale-95 shadow-md shadow-red-500/25 cursor-pointer shrink-0"
              title="Abrir modo Feed continuo / Reels a pantalla completa"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Feed Reels</span>
            </button>
          )}

          {/* Botón Por Lotes en pantallas medianas */}
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`xl:hidden p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'batch'
                ? 'bg-pink-600 text-white border-pink-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Descarga por Lotes / Unión"
          >
            <Layers className="w-4 h-4 text-pink-400" />
          </button>

          {/* Botón Historial en pantallas medianas */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`xl:hidden p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border relative ${
              activeTab === 'history'
                ? 'bg-pink-600 text-white border-pink-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Historial de descargas"
          >
            <History className="w-4 h-4 text-purple-400" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">
                {historyCount}
              </span>
            )}
          </button>

          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              aria-label="Instalar aplicación en dispositivo"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 text-xs font-bold"
              title="Instalar App en tu iPad o PC"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
