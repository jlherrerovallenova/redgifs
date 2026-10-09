import React from 'react';
import { RefreshCw, Sparkles, X, ArrowUpCircle } from 'lucide-react';
import { UpdateInfo } from '../hooks/useAppUpdate';

interface UpdateNotificationBannerProps {
  isOpen: boolean;
  versionInfo: UpdateInfo | null;
  isUpdating: boolean;
  onApplyUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateNotificationBanner: React.FC<UpdateNotificationBannerProps> = ({
  isOpen,
  versionInfo,
  isUpdating,
  onApplyUpdate,
  onDismiss
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[94%] sm:w-full animate-slideDown select-none px-2"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#170e24] via-[#10121a] to-[#200e1b] border-2 border-pink-500/60 shadow-[0_12px_40px_rgba(236,72,153,0.35)] p-3 sm:p-4 backdrop-blur-xl flex items-center justify-between gap-3">
        {/* Glow de fondo animado */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/20 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 blur-2xl rounded-full pointer-events-none" />

        {/* Icono e Información */}
        <div className="flex items-center gap-3 min-w-0 z-10">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-pink-600 via-rose-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/40 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse text-yellow-200" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-extrabold text-white text-xs sm:text-sm tracking-tight flex items-center gap-1">
                <span>¡Nueva actualización disponible!</span>
              </h4>
              {versionInfo?.version && (
                <span className="bg-pink-500/25 text-pink-300 border border-pink-500/40 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  v{versionInfo.version}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1">
              Hay nuevas mejoras y cambios listos para aplicar.
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-1.5 shrink-0 z-10">
          <button
            type="button"
            onClick={onApplyUpdate}
            disabled={isUpdating}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-95 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-pink-600/40 cursor-pointer disabled:opacity-60"
            title="Recargar la aplicación con los nuevos cambios"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Recargando...' : 'Actualizar'}</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar aviso de actualización"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Posponer aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
