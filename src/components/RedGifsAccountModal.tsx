import React, { useState } from 'react';
import {
  X,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  LogOut,
  RefreshCw,
  FolderPlus,
  Sparkles,
  Lock,
  Globe,
  Film,
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { RedGifsUserAccount, RedGifsCollection } from '../types';

interface RedGifsAccountModalProps {
  isOpen: boolean;
  account: RedGifsUserAccount | null;
  collections: RedGifsCollection[];
  isLoadingCollections: boolean;
  onClose: () => void;
  onConnect: (token: string) => Promise<void>;
  onDisconnect: () => void;
  onRefreshCollections: () => Promise<void>;
  onCreateCollection: (name: string, description?: string, isPrivate?: boolean) => Promise<void>;
  showToast: (msg: string) => void;
}

export const RedGifsAccountModal: React.FC<RedGifsAccountModalProps> = ({
  isOpen,
  account,
  collections,
  isLoadingCollections,
  onClose,
  onConnect,
  onDisconnect,
  onRefreshCollections,
  onCreateCollection,
  showToast
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHelper, setShowHelper] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  // Crear colección directa
  const [isCreatingColl, setIsCreatingColl] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [newCollDesc, setNewCollDesc] = useState('');
  const [newCollPrivate, setNewCollPrivate] = useState(false);
  const [isSavingColl, setIsSavingColl] = useState(false);

  if (!isOpen) return null;

  const quickCommand = `copy(sessionStorage.getItem('auth_token') || JSON.parse(localStorage.getItem('auth_data')||'{}')?.data?.access_token)`;

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(quickCommand);
      setCopiedCommand(true);
      showToast('¡Comando copiado! Pégalo en la consola (F12) de redgifs.com');
      setTimeout(() => setCopiedCommand(false), 3000);
    } catch {
      showToast('Por favor selecciona el texto del comando y cópialo');
    }
  };

  const handlePasteToken = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTokenInput(text.trim());
        setErrorMsg(null);
        showToast('Token pegado desde el portapapeles');
      }
    } catch {
      showToast('Pega el token manualmente con Ctrl+V / Cmd+V');
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) {
      setErrorMsg('Por favor introduce tu token de autenticación de RedGIFs.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConnect(clean);
      setTokenInput('');
      showToast('¡Cuenta de RedGIFs conectada correctamente! 🎉');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al validar el token de usuario. Comprueba que sea correcto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCollName.trim();
    if (!name) {
      showToast('Escribe un nombre para la nueva lista');
      return;
    }

    setIsSavingColl(true);
    try {
      await onCreateCollection(name, newCollDesc.trim(), newCollPrivate);
      setNewCollName('');
      setNewCollDesc('');
      setIsCreatingColl(false);
      showToast(`¡Lista "${name}" creada en tu cuenta de RedGIFs! 🎉`);
    } catch (err: any) {
      showToast(err.message || 'No se pudo crear la lista en RedGIFs');
    } finally {
      setIsSavingColl(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#0f111a] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-red-950/40 animate-scaleUp max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/40 via-purple-950/30 to-pink-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-pink-600 flex items-center justify-center shadow-lg shadow-red-600/30 text-white font-black text-sm">
              RG
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Cuenta RedGIFs</span>
                {account && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Conectada
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {account ? `@${account.username}` : 'Sincroniza tus listas y favoritos oficiales'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {account ? (
            /* ================= VISTA CONECTADO ================= */
            <div className="space-y-5">
              {/* Tarjeta de usuario */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {account.profileImageUrl ? (
                    <img
                      src={account.profileImageUrl}
                      alt={account.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-pink-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-base shrink-0">
                      {account.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm sm:text-base truncate flex items-center gap-1.5">
                      <span>{account.name || account.username}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <div className="text-xs text-pink-400 truncate font-semibold">
                      @{account.username}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {collections.length} {collections.length === 1 ? 'lista sincronizada' : 'listas sincronizadas'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onRefreshCollections}
                    disabled={isLoadingCollections}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 transition-all cursor-pointer disabled:opacity-50"
                    title="Recargar listas de RedGIFs"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingCollections ? 'animate-spin text-pink-400' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={onDisconnect}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                    title="Cerrar sesión de RedGIFs en este navegador"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Desconectar</span>
                  </button>
                </div>
              </div>

              {/* Listas Oficiales de RedGIFs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-pink-400" />
                    <span>Tus Listas en RedGIFs.com ({collections.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsCreatingColl(!isCreatingColl)}
                    className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Nueva Lista</span>
                  </button>
                </div>

                {/* Formulario Crear Nueva Lista en RedGIFs */}
                {isCreatingColl && (
                  <form
                    onSubmit={handleCreateSubmit}
                    className="p-4 rounded-2xl bg-black/40 border border-pink-500/40 space-y-3 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                        <FolderPlus className="w-4 h-4" />
                        <span>Crear lista en tu cuenta de RedGIFs</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingColl(false)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newCollName}
                      onChange={(e) => setNewCollName(e.target.value)}
                      placeholder="Nombre de la lista (ej. Favoritos VIP, Bailes)..."
                      autoFocus
                      className="w-full bg-[#12141c] border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 font-medium"
                    />

                    <input
                      type="text"
                      value={newCollDesc}
                      onChange={(e) => setNewCollDesc(e.target.value)}
                      placeholder="Descripción (opcional)..."
                      className="w-full bg-[#12141c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 font-medium"
                    />

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={newCollPrivate}
                        onChange={(e) => setNewCollPrivate(e.target.checked)}
                        className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-white/20 bg-black/40"
                      />
                      <span>Lista privada (solo tú puedes verla en RedGIFs)</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSavingColl}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-pink-600/20 hover:opacity-95 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingColl ? 'Creando en RedGIFs...' : 'Crear Lista en RedGIFs'}
                    </button>
                  </form>
                )}

                {/* Listado de Colecciones */}
                {isLoadingCollections ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-pink-400" />
                    <span>Cargando tus listas de RedGIFs...</span>
                  </div>
                ) : collections.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/15 text-center space-y-2">
                    <p className="text-xs text-slate-300 font-medium">
                      Aún no tienes listas creadas en tu cuenta de RedGIFs.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingColl(true)}
                      className="text-xs text-pink-400 font-bold hover:underline cursor-pointer"
                    >
                      + Crea tu primera lista ahora
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {collections.map((coll) => (
                      <div
                        key={coll.folderId}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/40 transition-colors flex items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                            <span>{coll.folderName}</span>
                            {coll.published ? (
                              <span title="Pública"><Globe className="w-3 h-3 text-slate-400 shrink-0" /></span>
                            ) : (
                              <span title="Privada"><Lock className="w-3 h-3 text-amber-400 shrink-0" /></span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {coll.totalItems} {coll.totalItems === 1 ? 'video' : 'videos'}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 font-bold shrink-0">
                          RedGIFs
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= VISTA DESCONECTADO ================= */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/15 via-pink-600/15 to-purple-600/15 border border-pink-500/30 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Conecta tus listas oficiales de www.redgifs.com</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Al conectar tu cuenta podrás ver tus colecciones ya existentes y guardar cualquier video en ellas con 1 clic desde el reproductor, feed o tarjetas.
                </p>
              </div>

              {/* Guía rápida para obtener el token */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-yellow-400" />
                    <span>¿Cómo obtener tu clave de sesión en 10 segundos?</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHelper(!showHelper)}
                    className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showHelper ? 'Ocultar guía' : 'Ver guía'}</span>
                  </button>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <p className="leading-snug">
                      Abre{' '}
                      <a
                        href="https://www.redgifs.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-400 underline font-bold inline-flex items-center gap-0.5 hover:text-pink-300"
                      >
                        www.redgifs.com <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      en tu navegador con tu sesión iniciada.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="leading-snug">
                        Presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">F12</kbd> (o clic derecho &gt; Inspeccionar), ve a la pestaña <strong>Console (Consola)</strong>, pega este comando y pulsa Enter:
                      </p>
                      <div className="flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-white/10 font-mono text-[11px] text-yellow-300">
                        <span className="truncate flex-1 select-all">{quickCommand}</span>
                        <button
                          type="button"
                          onClick={handleCopyCommand}
                          className="px-2 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                          title="Copiar comando"
                        >
                          {copiedCommand ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCommand ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">
                        * El comando copiará automáticamente tu token oficial a tu portapapeles sin mostrarlo en pantalla.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <p className="leading-snug">
                      Pégalo en el campo de texto de abajo y pulsa <strong>Conectar Cuenta</strong>.
                    </p>
                  </div>
                </div>

                {showHelper && (
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1.5 animate-fadeIn">
                    <p className="font-bold">Método alternativo sin comando:</p>
                    <p className="text-[11px] text-slate-300">
                      En la ventana de <kbd className="bg-white/10 px-1 rounded">F12</kbd>, ve a la pestaña <strong>Application (Almacenamiento)</strong> &gt; <strong>Session Storage</strong> &gt; selecciona <code>https://www.redgifs.com</code> &gt; busca la clave <code>auth_token</code> y copia su valor.
                    </p>
                  </div>
                )}
              </div>

              {/* Formulario de conexión */}
              <form onSubmit={handleConnectSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                      Pega tu Token de RedGIFs:
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteToken}
                      className="text-pink-400 hover:text-pink-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Pegar portapapeles</span>
                    </button>
                  </div>

                  <textarea
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
                    rows={3}
                    className="w-full bg-[#12141c] border border-white/20 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-pink-500 resize-none"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span className="leading-snug">{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !tokenInput.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-pink-600/30 hover:opacity-95 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando con RedGIFs...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Conectar y Sincronizar Listas</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Conexión local segura • Tus credenciales no salen de tu navegador
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
