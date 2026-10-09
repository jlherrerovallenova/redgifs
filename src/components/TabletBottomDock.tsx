import React from 'react';
import { Sparkles, Search, User, Heart, Download, Film, Layers } from 'lucide-react';

interface TabletBottomDockProps {
  activeTab: 'discover' | 'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history';
  setActiveTab: (tab: 'discover' | 'single' | 'batch' | 'explore' | 'creators' | 'favorites' | 'history') => void;
  favoritesCount?: number;
  onOpenTheater?: () => void;
}

export const TabletBottomDock: React.FC<TabletBottomDockProps> = ({
  activeTab,
  setActiveTab,
  favoritesCount = 0,
  onOpenTheater
}) => {
  return (
    <nav
      aria-label="Navegación táctil principal para iPad y móvil"
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 pointer-events-none flex justify-center items-end"
    >
      <div className="pointer-events-auto bg-[#0c0e17]/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex items-center gap-1 sm:gap-2 max-w-xl w-full justify-between select-none">
        
        {/* Novedades */}
        <button
          type="button"
          onClick={() => setActiveTab('discover')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer min-h-[50px] active:scale-95 ${
            activeTab === 'discover'
              ? 'bg-gradient-to-b from-pink-500/20 to-purple-600/30 text-white border border-pink-500/40 shadow-md shadow-pink-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className={`w-5 h-5 ${activeTab === 'discover' ? 'text-pink-400' : ''}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Novedades</span>
        </button>

        {/* Explorar */}
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer min-h-[50px] active:scale-95 ${
            activeTab === 'explore'
              ? 'bg-gradient-to-b from-red-500/20 to-pink-600/30 text-white border border-red-500/40 shadow-md shadow-red-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === 'explore' ? 'text-red-400' : ''}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Explorar</span>
        </button>

        {/* Botón Central Destacado: REELS */}
        {onOpenTheater && (
          <button
            type="button"
            onClick={onOpenTheater}
            aria-label="Abrir Feed Reels a pantalla completa"
            className="flex flex-col items-center justify-center px-3.5 py-1.5 rounded-2xl bg-gradient-to-tr from-red-600 via-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/40 transition-transform active:scale-90 cursor-pointer min-h-[52px] -translate-y-2 border border-white/25 group"
          >
            <div className="relative">
              <Film className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            </div>
            <span className="text-[10px] font-black mt-0.5 uppercase tracking-wider text-yellow-200">Reels</span>
          </button>
        )}

        {/* Creadores */}
        <button
          type="button"
          onClick={() => setActiveTab('creators')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer min-h-[50px] active:scale-95 ${
            activeTab === 'creators'
              ? 'bg-gradient-to-b from-purple-500/20 to-pink-600/30 text-white border border-purple-500/40 shadow-md shadow-purple-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === 'creators' ? 'text-purple-400' : ''}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Creadores</span>
        </button>

        {/* Mis Listas */}
        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer min-h-[50px] active:scale-95 relative ${
            activeTab === 'favorites'
              ? 'bg-gradient-to-b from-pink-500/20 to-rose-600/30 text-white border border-pink-500/40 shadow-md shadow-pink-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${activeTab === 'favorites' ? 'text-pink-400 fill-pink-500/40' : ''}`} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[9px] font-extrabold px-1 rounded-full min-w-[15px] h-[15px] flex items-center justify-center shadow">
                {favoritesCount > 99 ? '99+' : favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Listas</span>
        </button>

        {/* Descargar */}
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer min-h-[50px] active:scale-95 ${
            activeTab === 'single'
              ? 'bg-gradient-to-b from-red-500/20 to-pink-600/30 text-white border border-red-500/40 shadow-md shadow-red-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className={`w-5 h-5 ${activeTab === 'single' ? 'text-red-400' : ''}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Descargar</span>
        </button>
      </div>
    </nav>
  );
};
