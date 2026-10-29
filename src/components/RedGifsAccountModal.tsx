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
  ShieldCheck,
  Terminal,
  Database,
  Bookmark
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
  const [guideTab, setGuideTab] = useState<'visual' | 'console' | 'bookmarklet'>('visual');
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  // Crear colección directa
  const [isCreatingColl, setIsCreatingColl] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [newCollDesc, setNewCollDesc] = useState('');
  const [newCollPrivate, setNewCollPrivate] = useState(false);
  const [isSavingColl, setIsSavingColl] = useState(false);

  if (!isOpen) return null;

  const quickCommand = `copy(sessionStorage.getItem('auth_token') || JSON.parse(localStorage.getItem('auth_data')||'{}')?.data?.access_token)`;
  const bookmarkletCode = `javascript:(function(){const t=sessionStorage.getItem('auth_token')||JSON.parse(localStorage.getItem('auth_data')||'{}')?.data?.access_token;if(t){prompt('Copia tu token de RedGIFs (Ctrl+C):',t);}else{alert('Inicia sesión primero en redgifs.com');}})();`;

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(quickCommand);
      setCopiedCommand(true);
      showToast('¡Comando copiado al portapapeles!');
      setTimeout(() => setCopiedCommand(false), 3000);
    } catch {
      showToast('Por favor selecciona el texto y cópialo');
    }
  };

  const handleCopyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopiedBookmarklet(true);
      showToast('¡Código de marcador copiado!');
      setTimeout(() => setCopiedBookmarklet(false), 3000);
    } catch {
      showToast('Por favor selecciona el texto del marcador');
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
        className="bg-[#0f111a] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-red-950/40 animate-scaleUp max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/40 via-purple-950/30 to-pink-950/30 shrink-0">
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
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
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-600/15 via-pink-600/15 to-purple-600/15 border border-pink-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Conecta tus listas oficiales de www.redgifs.com</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Podrás ver tus colecciones ya existentes y guardar cualquier video en ellas con 1 clic. Elige abajo el método que te sea más fácil:
                </p>
              </div>

              {/* Selector de Método para obtener el token */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setGuideTab('visual')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      guideTab === 'visual'
                        ? 'bg-pink-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Método Visual (Fácil)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuideTab('bookmarklet')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      guideTab === 'bookmarklet'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Marcador (1 clic)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuideTab('console')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      guideTab === 'console'
                        ? 'bg-slate-700 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Consola</span>
                  </button>
                </div>

                {/* MÉTODO 1: VISUAL (SIN ESCRIBIR NADA) */}
                {guideTab === 'visual' && (
                  <div className="space-y-2.5 text-xs text-slate-300 animate-fadeIn">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400" />
                      Copiar directamente sin usar la consola:
                    </p>
                    <ol className="space-y-2 list-decimal list-inside pl-1 text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                      <li>
                        En <a href="https://www.redgifs.com" target="_blank" rel="noopener noreferrer" className="text-pink-400 underline font-bold inline-flex items-center gap-0.5">redgifs.com <ExternalLink className="w-2.5 h-2.5" /></a>, haz <strong>clic derecho</strong> en cualquier parte de la página y elige <strong>"Inspeccionar"</strong> (o pulsa <kbd className="px-1 py-0.5 bg-white/10 rounded">F12</kbd>).
                      </li>
                      <li>
                        En la barra superior de esa ventana, pulsa en la pestaña <strong>Application</strong> (Almacenamiento en Firefox).
                        <span className="block text-[10px] text-slate-400 ml-4 italic">* Si no la ves, pulsa en las dos flechitas <code>&gt;&gt;</code> a la derecha de las pestañas.</span>
                      </li>
                      <li>
                        En el menú de la izquierda, abre <strong>Session Storage</strong> y haz clic en <code>https://www.redgifs.com</code>.
                      </li>
                      <li>
                        En la tabla de la derecha, busca la fila llamada <strong className="text-yellow-300">auth_token</strong>.
                      </li>
                      <li>
                        Haz <strong>doble clic</strong> en su valor (el texto largo que empieza por <code>eyJ...</code>) y dale a <kbd className="px-1 py-0.5 bg-white/10 rounded">Ctrl + C</kbd> para copiarlo.
                      </li>
                    </ol>
                  </div>
                )}

                {/* MÉTODO 2: MARCADOR (1 CLIC EN LA BARRA DE MARCADORES) */}
                {guideTab === 'bookmarklet' && (
                  <div className="space-y-2.5 text-xs text-slate-300 animate-fadeIn">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Un marcador que te muestra el token con 1 solo clic:
                    </p>
                    <ol className="space-y-2 list-decimal list-inside pl-1 text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                      <li>
                        Crea un marcador nuevo en tu navegador (o arrastra este código a tu barra de marcadores).
                      </li>
                      <li>
                        Pon como dirección (URL) este código:
                        <div className="flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-white/10 font-mono text-[10px] text-purple-300 mt-1">
                          <span className="truncate flex-1 select-all">{bookmarkletCode}</span>
                          <button
                            type="button"
                            onClick={handleCopyBookmarklet}
                            className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {copiedBookmarklet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBookmarklet ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </li>
                      <li>
                        Entra en <strong>redgifs.com</strong> y pulsa ese marcador. ¡Te abrirá una ventanita con tu token ya seleccionado para darle a Copiar!
                      </li>
                    </ol>
                  </div>
                )}

                {/* MÉTODO 3: CONSOLA */}
                {guideTab === 'console' && (
                  <div className="space-y-2.5 text-xs text-slate-300 animate-fadeIn">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Por la consola de desarrollador:
                    </p>
                    <ol className="space-y-2 list-decimal list-inside pl-1 text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                      <li>
                        En <strong>redgifs.com</strong>, pulsa <kbd className="px-1 py-0.5 bg-white/10 rounded">F12</kbd> y haz clic en la pestaña <strong>Console</strong>.
                      </li>
                      <li>
                        Copia y pega este comando en la línea inferior (junto al símbolo <code>&gt;</code>) y pulsa <kbd className="px-1 py-0.5 bg-white/10 rounded">Enter</kbd>:
                        <div className="flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-white/10 font-mono text-[10px] text-yellow-300 mt-1">
                          <span className="truncate flex-1 select-all">{quickCommand}</span>
                          <button
                            type="button"
                            onClick={handleCopyCommand}
                            className="px-2 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {copiedCommand ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCommand ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </li>
                      <li className="text-amber-300/90 text-[11px] bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        ⚠️ <strong>¿El navegador no te deja pegar?</strong> Si Chrome/Edge te muestra un aviso de seguridad, escribe primero <code className="bg-black/60 px-1 py-0.5 rounded text-white font-mono">allow pasting</code> y pulsa Enter. Luego ya te dejará pegar.
                      </li>
                    </ol>
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
                    placeholder="Pega aquí el valor copiado (ej. eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...)"
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
