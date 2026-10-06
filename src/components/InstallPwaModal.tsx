import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop, Share2, PlusSquare, Check, X, Sparkles, ExternalLink } from 'lucide-react';
import { isIOS } from '../services/redgifs';

interface InstallPwaModalProps {
  open: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ open, onClose, showToast }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('ios');

  useEffect(() => {
    // Detectar si ya se está ejecutando como PWA instalada
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(isStandalone);

    // Auto seleccionar pestaña según SO
    if (isIOS()) {
      setActiveTab('ios');
    } else if (/Android/i.test(navigator.userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    // Escuchar el evento de instalación nativo en Chromium
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('¡App instalada con éxito!');
        setIsInstalled(true);
        setDeferredPrompt(null);
        onClose();
      }
    } else {
      showToast('Sigue las instrucciones en pantalla para instalar');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#12141c] border border-white/15 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl shadow-purple-950/50 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/30 via-[#12141c] to-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 via-pink-600 to-purple-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-red-500/30">
              RG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Instalar RedGIFs Pro</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> PWA Nativa
                </span>
              </div>
              <p className="text-xs text-slate-400">Pantalla completa, sin marcos de navegador y ultra rápida</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de instalación"
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Dispositivo */}
        <div className="p-3 bg-black/30 border-b border-white/5 flex gap-1.5 justify-center">
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-white/5'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> iPad / iPhone
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-white/5'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Android
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-white/5'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" /> PC / Mac
          </button>
        </div>

        {/* Contenido / Pasos según plataforma */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 flex-1">
          {isInstalled ? (
            <div className="text-center py-6 space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-base">¡App ya instalada!</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Estás disfrutando de RedGIFs Pro en modo independiente a pantalla completa.
              </p>
            </div>
          ) : activeTab === 'ios' ? (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="text-xs text-slate-400 font-semibold">
                Sigue estos sencillos pasos en <strong>Safari (iPad / iPhone)</strong>:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white block">Pulsa el botón Compartir</span>
                    <span className="text-xs text-slate-400">
                      Toca el icono <Share2 className="w-3.5 h-3.5 inline text-blue-400 mx-1" /> en la barra superior o inferior de Safari.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white block">Selecciona "Añadir a la pantalla de inicio"</span>
                    <span className="text-xs text-slate-400">
                      Desplázate por el menú y elige <PlusSquare className="w-3.5 h-3.5 inline text-purple-400 mx-1" /> <strong>Añadir a la pantalla de inicio</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white block">Toca "Añadir"</span>
                    <span className="text-xs text-slate-400">
                      Confirma arriba a la derecha. ¡El icono aparecerá en tu pantalla de inicio como una App nativa!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'android' ? (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="text-xs text-slate-400 font-semibold">
                Instalación en <strong>Google Chrome o navegadores Android</strong>:
              </div>

              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white font-extrabold py-3 rounded-2xl shadow-xl shadow-red-500/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 text-sm"
                >
                  <Download className="w-4 h-4" /> Instalar en 1 Clic (Automático)
                </button>
              )}

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white block">Abre el menú de Chrome</span>
                    <span className="text-xs text-slate-400">Toca los 3 puntos (⋮) en la esquina superior derecha.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="w-7 h-7 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white block">Instalar aplicación</span>
                    <span className="text-xs text-slate-400">Selecciona "Instalar aplicación" o "Añadir a pantalla principal".</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="text-xs text-slate-400 font-semibold">
                Instalación en <strong>Google Chrome, Edge o Brave (PC / Mac)</strong>:
              </div>

              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:opacity-90 text-white font-extrabold py-3 rounded-2xl shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 text-sm"
                >
                  <Download className="w-4 h-4" /> Instalar RedGIFs Pro en Windows / Mac
                </button>
              ) : (
                <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                    💡
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white block">Desde la barra de direcciones:</span>
                    <span className="text-xs text-slate-400">
                      Haz clic en el icono de instalación <Download className="w-3.5 h-3.5 inline text-purple-400 mx-1" /> en el extremo derecho de la barra de direcciones de tu navegador (Chrome/Edge).
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ventajas PWA */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Sin barra de direcciones</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Acceso directo al instante</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Carga ultra rápida</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Soporte sin conexión</span>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-white/10 bg-[#0d0e14] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
