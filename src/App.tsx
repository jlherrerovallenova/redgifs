import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Search, 
  Layers, 
  History, 
  Clipboard, 
  X, 
  Sparkles, 
  Play, 
  Eye, 
  Heart, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Trash2,
  Share2
} from 'lucide-react';
import { getVideoInfo, searchVideos, downloadVideoFile, isIOS } from './services/redgifs';
import { RedGifItem, SearchResultItem, HistoryItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'explore' | 'history'>('single');

  // Single Download State
  const [inputUrl, setInputUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [video, setVideo] = useState<RedGifItem | null>(null);
  const [singleDlProgress, setSingleDlProgress] = useState<{
    active: boolean;
    percent: number;
    downloadedMb: number;
    totalMb: number;
    quality: string;
  }>({ active: false, percent: 0, downloadedMb: 0, totalMb: 0, quality: 'hd' });

  // Batch Download State
  const [batchText, setBatchText] = useState('');
  const [batchQuality, setBatchQuality] = useState<'hd' | 'sd'>('hd');
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchItems, setBatchItems] = useState<Array<{
    url: string;
    status: 'pending' | 'downloading' | 'done' | 'error';
    filename?: string;
    error?: string;
  }>>([]);

  // Explore State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [lightbox, setLightbox] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: ''
  });

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rg_history') || '[]');
    } catch {
      return [];
    }
  });

  // Toast State
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const saveToHistory = (item: RedGifItem, quality: string, filename: string, size_mb?: number) => {
    const newItem: HistoryItem = {
      id: item.id,
      title: item.title,
      userName: item.userName,
      filename,
      quality,
      timestamp: Date.now(),
      url: quality === 'hd' ? item.hd_url : item.sd_url,
      size_mb
    };
    const updated = [newItem, ...history.filter(h => h.id !== item.id)].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('rg_history', JSON.stringify(updated));
  };

  // Analyze single link
  const handleAnalyze = async (urlToAnalyze?: string) => {
    const target = (urlToAnalyze || inputUrl).trim();
    setAnalysisError(null);
    if (!target) {
      setAnalysisError('Por favor introduce un enlace o ID de RedGIFs.');
      showToast('Introduce un enlace o ID de RedGIFs');
      return;
    }

    setIsAnalyzing(true);
    setVideo(null);
    try {
      const data = await getVideoInfo(target);
      setVideo(data);
      showToast('¡Video encontrado!');
    } catch (err: any) {
      const msg = err.message || 'Error al consultar video';
      setAnalysisError(msg);
      showToast(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
        showToast('Enlace pegado');
        handleAnalyze(text.trim());
      }
    } catch {
      showToast('Por favor escribe o pega el enlace en el campo');
    }
  };

  // Download Single Video
  const handleDownloadSingle = async (quality: 'hd' | 'sd') => {
    if (!video) return;

    const mediaUrl = quality === 'hd' ? video.hd_url : video.sd_url;
    if (!mediaUrl) {
      showToast('No se encontró URL de descarga para esta calidad');
      return;
    }

    const cleanUser = video.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'anónimo';
    const filename = `${cleanUser}_${video.id}_${quality}.mp4`;

    setSingleDlProgress({ active: true, percent: 0, downloadedMb: 0, totalMb: 0, quality });

    try {
      await downloadVideoFile(mediaUrl, filename, (percent, downloadedMb, totalMb) => {
        setSingleDlProgress({ active: true, percent, downloadedMb, totalMb, quality });
      });
      showToast(`¡Descarga completada!: ${filename}`);
      saveToHistory(video, quality, filename, singleDlProgress.totalMb);
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`);
    } finally {
      setSingleDlProgress(prev => ({ ...prev, active: false }));
    }
  };

  // Batch Download
  const handleStartBatch = async () => {
    const urls = batchText.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      showToast('Pega al menos un enlace en el área de texto');
      return;
    }

    const items = urls.map(u => ({ url: u, status: 'pending' as const }));
    setBatchItems(items);
    setIsBatchRunning(true);

    for (let i = 0; i < urls.length; i++) {
      const targetUrl = urls[i];
      setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'downloading' } : item));

      try {
        const info = await getVideoInfo(targetUrl);
        const mediaUrl = batchQuality === 'hd' ? info.hd_url : info.sd_url;
        const cleanUser = info.userName.replace(/[^a-zA-Z0-9_-]/g, '') || 'anónimo';
        const filename = `${cleanUser}_${info.id}_${batchQuality}.mp4`;

        await downloadVideoFile(mediaUrl, filename);
        setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done', filename } : item));
        saveToHistory(info, batchQuality, filename);
      } catch (err: any) {
        setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', error: err.message } : item));
      }
    }

    setIsBatchRunning(false);
    showToast('Descarga por lotes finalizada');
  };

  // Search explore
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const results = await searchVideos(query, 24);
      setSearchResults(results);
    } catch (err: any) {
      showToast('Error al buscar videos');
    } finally {
      setIsSearching(false);
    }
  };

  // Quick download from search
  const handleQuickDownload = async (item: SearchResultItem) => {
    showToast(`Iniciando descarga de ${item.id}...`);
    try {
      const info = await getVideoInfo(item.id);
      const filename = `${item.userName}_${item.id}_hd.mp4`;
      await downloadVideoFile(info.hd_url, filename);
      showToast(`¡Descargado!: ${filename}`);
      saveToHistory(info, 'hd', filename);
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 relative overflow-x-hidden">
      {/* Ambient Glows */}
      <div className="fixed top-[-100px] left-[20%] w-[500px] height-[500px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="fixed top-[300px] right-[15%] w-[450px] height-[450px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#090a0f]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-pink-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/30">
              RG
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl tracking-tight">
                RED<span className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">GIFS</span> PRO
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vite & Bolt Edition</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeTab === 'single' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" /> Descargar
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeTab === 'batch' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" /> Por Lotes
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeTab === 'explore' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" /> Explorar
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeTab === 'history' ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" /> Historial
              {history.length > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.2 rounded-full font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* TAB 1: Single Download */}
        {activeTab === 'single' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight">
                Descarga videos de RedGIFs en HD
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
                Pega el enlace o ID para previsualizarlo y guardarlo directamente en tu dispositivo en máxima calidad con audio.
              </p>

              {/* Input Box Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAnalyze();
                }}
                className="max-w-2xl mx-auto mt-6 bg-[#12141c] border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-2xl focus-within:border-red-500/60 transition"
              >
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (analysisError) setAnalysisError(null);
                  }}
                  placeholder="Pega el enlace (ej: https://www.redgifs.com/watch/...)"
                  className="flex-1 bg-transparent px-4 text-sm md:text-base outline-none text-white placeholder-slate-500"
                />
                {inputUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputUrl('');
                      setAnalysisError(null);
                    }}
                    className="p-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePaste}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold transition"
                >
                  <Clipboard className="w-3.5 h-3.5" /> Pegar
                </button>
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-red-500/25 transition disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <span>Consultando...</span>
                  ) : (
                    <>
                      <span>Analizar</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Inline Error Message */}
              {analysisError && (
                <div className="max-w-2xl mx-auto mt-3 bg-red-500/15 border border-red-500/30 text-red-200 p-3 rounded-xl text-xs flex items-center justify-between text-left animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnalysisError(null)}
                    className="text-red-400 hover:text-white text-xs px-2 py-1"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Video Preview Card */}
            {video && (
              <div className="max-w-3xl mx-auto bg-[#12141c]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md grid md:grid-cols-2">
                <div className="bg-black flex items-center justify-center relative min-h-[300px]">
                  <video
                    src={video.hd_url || video.sd_url}
                    controls
                    playsInline
                    loop
                    className="w-full h-full object-cover max-h-[420px]"
                  />
                </div>
                <div className="p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-bold text-sm">@{video.userName}</span>
                      <span className="bg-white/10 text-xs px-2.5 py-1 rounded-md text-slate-300 font-medium">
                        {video.duration}s
                      </span>
                    </div>

                    <h3 className="font-bold text-lg leading-snug line-clamp-2">{video.title}</h3>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {video.views.toLocaleString()} vistas
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-pink-400" /> {video.likes.toLocaleString()}
                      </span>
                    </div>

                    {video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {video.tags.slice(0, 5).map(tag => (
                          <span key={tag} className="text-[11px] bg-white/5 border border-white/5 text-slate-400 px-2 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Download Buttons & Progress */}
                  <div className="pt-6 space-y-3">
                    {singleDlProgress.active && (
                      <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-red-400">Descargando {singleDlProgress.quality.toUpperCase()}...</span>
                          <span>{singleDlProgress.percent}% ({singleDlProgress.downloadedMb}MB / {singleDlProgress.totalMb}MB)</span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-red-500 to-pink-500 h-full transition-all duration-200"
                            style={{ width: `${singleDlProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleDownloadSingle('hd')}
                        disabled={singleDlProgress.active}
                        className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-90 text-white font-bold p-3 rounded-xl text-center shadow-lg shadow-red-600/25 transition disabled:opacity-50"
                      >
                        <div className="text-sm font-extrabold flex items-center justify-center gap-1.5">
                          <Download className="w-4 h-4" /> Descargar HD
                        </div>
                        <div className="text-[10px] text-white/80 font-normal">
                          {isIOS() ? 'Guardar en Fotos / Archivos' : 'Máxima calidad (1080p)'}
                        </div>
                      </button>

                      <button
                        onClick={() => handleDownloadSingle('sd')}
                        disabled={singleDlProgress.active}
                        className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold p-3 rounded-xl text-center transition disabled:opacity-50"
                      >
                        <div className="text-sm font-extrabold flex items-center justify-center gap-1.5">
                          <Download className="w-4 h-4" /> Descargar SD
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">Versión móvil ligera</div>
                      </button>
                    </div>

                    {/* Direct link for iPad / iOS where browsers block blob downloads */}
                    <div className="space-y-2 pt-1">
                      <a
                        href={video.hd_url || video.sd_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                        <span>Abrir enlace directo MP4 (Sin restricciones de navegador)</span>
                      </a>

                      <p className="text-[11px] text-slate-400 text-center">
                        💡 <strong>En iPad / iPhone:</strong> Si Safari o Chrome dicen que no tienes permiso, pulsa <em>"Abrir enlace directo"</em>, mantén pulsado el video y elige <strong>"Guardar video"</strong> para enviarlo a tu galería de Fotos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Batch Download */}
        {activeTab === 'batch' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-display">Descarga Masiva por Lotes</h2>
              <p className="text-slate-400 text-sm">Pega múltiples URLs de RedGIFs (una por línea) para descargarlas todas seguidas.</p>
            </div>

            <textarea
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="https://www.redgifs.com/watch/video1&#10;https://www.redgifs.com/watch/video2&#10;https://www.redgifs.com/watch/video3"
              className="w-full bg-[#12141c] border border-white/10 rounded-2xl p-4 text-sm font-mono text-white outline-none focus:border-red-500/60 transition resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span>Calidad:</span>
                <select
                  value={batchQuality}
                  onChange={(e) => setBatchQuality(e.target.value as 'hd' | 'sd')}
                  className="bg-[#12141c] border border-white/10 text-white px-3 py-1.5 rounded-lg text-sm outline-none"
                >
                  <option value="hd">HD (1080p / Alta)</option>
                  <option value="sd">SD (Móvil / Ligera)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setBatchText('')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition"
                >
                  Limpiar
                </button>
                <button
                  onClick={handleStartBatch}
                  disabled={isBatchRunning}
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-500/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isBatchRunning ? 'Procesando...' : 'Iniciar Descargas'}</span>
                </button>
              </div>
            </div>

            {/* Batch Progress List */}
            {batchItems.length > 0 && (
              <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-sm text-slate-300">Estado de Descargas</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {batchItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="truncate max-w-[60%] font-mono text-slate-300">{item.url}</span>
                      <div>
                        {item.status === 'pending' && <span className="text-slate-500">En espera</span>}
                        {item.status === 'downloading' && <span className="text-yellow-400 font-bold animate-pulse">Descargando...</span>}
                        {item.status === 'done' && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Completado
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {item.error || 'Error'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Explore Search */}
        {activeTab === 'explore' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold font-display">Explora videos de RedGIFs</h2>
              <p className="text-slate-400 text-sm">Busca por términos o temáticas y descárgalos con un clic.</p>
              
              <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 pt-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por tag o creador..."
                  className="flex-1 bg-[#12141c] border border-white/10 rounded-full px-5 py-2.5 text-sm outline-none text-white focus:border-red-500/60 transition"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-red-500/25 transition disabled:opacity-50"
                >
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </form>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
              {searchResults.map((item) => (
                <div key={item.id} className="bg-[#12141c] border border-white/10 rounded-xl overflow-hidden group hover:border-red-500/40 transition">
                  <div
                    onClick={() => setLightbox({ open: true, url: item.hd_url || item.sd_url, title: item.title })}
                    className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                  >
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg">
                        <Play className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                      {item.duration}s
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    <h4 className="text-xs font-bold truncate text-slate-200">{item.title}</h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-red-400 font-semibold truncate">@{item.userName}</span>
                      <span>{item.views.toLocaleString()} vistas</span>
                    </div>
                    <button
                      onClick={() => handleQuickDownload(item)}
                      className="w-full mt-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar HD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: History */}
        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-display">Historial de Descargas</h2>
                <p className="text-slate-400 text-sm">Videos que has descargado en esta sesión</p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('rg_history');
                    showToast('Historial vaciado');
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Borrar Historial
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                No hay descargas registradas todavía.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item, idx) => (
                  <div key={idx} className="bg-[#12141c] border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-4">
                    <div className="truncate">
                      <h4 className="font-semibold text-sm text-slate-200 truncate">{item.filename}</h4>
                      <p className="text-xs text-slate-400">
                        @{item.userName} · Calidad {item.quality.toUpperCase()} · {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLightbox({ open: true, url: item.url, title: item.filename })}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
                        title="Previsualizar"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <a
                        href={item.url}
                        download={item.filename}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                        title="Descargar de nuevo"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Video Lightbox Modal */}
      {lightbox.open && (
        <div
          onClick={() => setLightbox({ open: false, url: '', title: '' })}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200 truncate">{lightbox.title}</span>
              <button
                onClick={() => setLightbox({ open: false, url: '', title: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              src={lightbox.url}
              controls
              autoPlay
              playsInline
              loop
              className="w-full max-h-[70vh] bg-black"
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12141c] border border-red-500 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl shadow-red-500/20 animate-slideUp">
          {toast}
        </div>
      )}
    </div>
  );
}
