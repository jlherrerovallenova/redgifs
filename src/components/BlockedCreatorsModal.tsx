import React, { useState } from 'react';
import { Ban, X, Trash2, CheckCircle2, User, Search, ShieldAlert, Sparkles } from 'lucide-react';

interface BlockedCreatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedCreators: string[];
  onUnblockCreator: (username: string) => void;
  onClearAllBlocked: () => void;
  showToast: (msg: string) => void;
}

export const BlockedCreatorsModal: React.FC<BlockedCreatorsModalProps> = ({
  isOpen,
  onClose,
  blockedCreators,
  onUnblockCreator,
  onClearAllBlocked,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredBlocked = blockedCreators.filter(name =>
    name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn select-none">
      <div className="bg-[#12141c] border border-red-500/30 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl shadow-red-950/40 flex flex-col max-h-[88vh]">
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/40 via-[#12141c] to-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Creadores Bloqueados</h3>
                <span className="bg-red-500/20 text-red-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-500/30">
                  {blockedCreators.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">Sus videos nunca aparecerán en tus resultados ni feeds</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de creadores bloqueados"
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador dentro de bloqueados */}
        {blockedCreators.length > 5 && (
          <div className="p-3 border-b border-white/5 bg-black/20">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar creador bloqueado..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500"
              />
            </div>
          </div>
        )}

        {/* Lista de creadores bloqueados */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
          {blockedCreators.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-slate-400">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300 text-sm">No tienes creadores bloqueados</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Puedes bloquear a cualquier creador desde su perfil o tarjetas de video con el botón "🚫 No mostrar más".
              </p>
            </div>
          ) : filteredBlocked.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No hay coincidencias para "{searchQuery}"
            </div>
          ) : (
            filteredBlocked.map((username) => (
              <div
                key={username}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/5 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-white text-xs sm:text-sm truncate block font-mono">
                      @{username}
                    </span>
                    <span className="text-[10px] text-red-400 font-medium">Contenido oculto</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUnblockCreator(username)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                  title={`Desbloquear a @${username}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pie y acciones globales */}
        <div className="p-4 border-t border-white/10 bg-[#0d0e14] flex items-center justify-between gap-2">
          {blockedCreators.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Estás seguro de que quieres desbloquear a todos los creadores?')) {
                  onClearAllBlocked();
                  showToast('Se han desbloqueado todos los creadores');
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desbloquear todos</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
