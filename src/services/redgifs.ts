import { RedGifItem, SearchResultItem } from '../types';

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Cliente HTTP universal con proxy Vite anti-CORS para iPad, iPhone, Bolt.new y PC.
 */
async function fetchRedGifs(path: string, options: RequestInit = {}): Promise<Response> {
  // 1. Probar primero el proxy de Vite (/api/redgifs), evitando cualquier bloqueo de CORS en iPad y otros dispositivos
  try {
    const res = await fetch(`/api/redgifs${path}`, options);
    // Si responde correctamente o con 404 de la propia API, retornamos
    if (res.status === 200 || res.status === 404 || res.status === 400) {
      return res;
    }
  } catch (err) {
    console.warn('Proxy Vite no disponible, usando conexión directa:', err);
  }

  // 2. Fallback directo a la API pública de RedGIFs
  return await fetch(`https://api.redgifs.com/v2${path}`, options);
}

/**
 * Obtiene o renueva el token temporal de autorización de RedGIFs.
 */
export async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const stored = localStorage.getItem('rg_token');
  const storedExp = localStorage.getItem('rg_token_exp');
  if (stored && storedExp && now < Number(storedExp)) {
    cachedToken = stored;
    tokenExpiry = Number(storedExp);
    return cachedToken;
  }

  const response = await fetchRedGifs('/auth/temporary');
  if (!response.ok) {
    throw new Error(`Error de autenticación con RedGIFs: HTTP ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.token;
  tokenExpiry = now + 25 * 60 * 1000; // 25 minutos

  localStorage.setItem('rg_token', cachedToken!);
  localStorage.setItem('rg_token_exp', String(tokenExpiry));

  return cachedToken!;
}

/**
 * Extrae el ID limpio de cualquier enlace o texto de RedGIFs.
 */
export function extractId(urlOrId: string): string {
  let text = urlOrId.trim();
  // Quitar barra final si la tiene
  if (text.endsWith('/')) {
    text = text.slice(0, -1);
  }

  // Match /watch/id o /ifr/id
  const match = text.match(/redgifs\.com\/(?:watch|ifr)\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    return match[1].toLowerCase();
  }

  // Si es un enlace directo tipo media.redgifs.com/Id.mp4
  let clean = text.split('/').pop()?.split('?')[0].split('#')[0] || text;
  clean = clean.replace(/\.(mp4|webm|jpg|jpeg|gif)$/i, '');
  clean = clean.replace(/-(mobile|silent|poster)$/i, '');

  return clean.toLowerCase();
}

/**
 * Obtiene información detallada de un video por ID o URL.
 */
export async function getVideoInfo(urlOrId: string): Promise<RedGifItem> {
  const gifId = extractId(urlOrId);
  if (!gifId) {
    throw new Error('Por favor introduce un enlace o ID válido de RedGIFs.');
  }

  const token = await getAuthToken();
  const response = await fetchRedGifs(`/gifs/${gifId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 404) {
    throw new Error(`El video '${gifId}' no existe o ha sido eliminado.`);
  }

  if (!response.ok) {
    throw new Error(`Error al consultar video: HTTP ${response.status}`);
  }

  const data = await response.json();
  const gif = data.gif || {};
  const urls = gif.urls || {};

  return {
    id: gif.id || gifId,
    title: (gif.tags && gif.tags.length > 0 ? gif.tags.slice(0, 3).join(', ') : gif.id) || 'Video RedGIFs',
    userName: gif.userName || 'anónimo',
    duration: Math.round((Number(gif.duration) || 0) * 10) / 10,
    views: Number(gif.views) || 0,
    likes: Number(gif.likes) || 0,
    tags: gif.tags || [],
    hd_url: urls.hd || urls.sd || '',
    sd_url: urls.sd || urls.hd || '',
    poster_url: urls.poster || urls.thumbnail || '',
    thumbnail_url: urls.thumbnail || urls.poster || '',
    watch_url: `https://www.redgifs.com/watch/${gif.id || gifId}`
  };
}

/**
 * Busca videos en RedGIFs por palabra clave o tag.
 */
export async function searchVideos(query: string, count = 20, page = 1): Promise<SearchResultItem[]> {
  const token = await getAuthToken();
  const params = new URLSearchParams({
    search_text: query,
    count: String(count),
    page: String(page)
  });

  const response = await fetchRedGifs(`/gifs/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Error al buscar en RedGIFs: HTTP ${response.status}`);
  }

  const data = await response.json();
  const gifs = data.gifs || [];

  return gifs.map((g: any) => {
    const urls = g.urls || {};
    return {
      id: g.id,
      title: (g.tags && g.tags.length > 0 ? g.tags.slice(0, 3).join(', ') : g.id) || 'Video',
      userName: g.userName || 'anónimo',
      duration: Math.round((Number(g.duration) || 0) * 10) / 10,
      views: Number(g.views) || 0,
      hd_url: urls.hd || '',
      sd_url: urls.sd || '',
      thumbnail_url: urls.thumbnail || urls.poster || '',
      watch_url: `https://www.redgifs.com/watch/${g.id}`
    };
  });
}

/**
 * Detecta si el dispositivo es iOS / iPadOS.
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
}

/**
 * Descarga el video en el navegador mediante Blob con reporte de progreso en vivo,
 * con soporte especial para iOS / iPadOS (Web Share API / Fotos).
 */
export async function downloadVideoFile(
  mediaUrl: string,
  filename: string,
  onProgress?: (progressPercent: number, downloadedMb: number, totalMb: number) => void
): Promise<void> {
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Fallo al descargar archivo: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  const totalMb = totalBytes > 0 ? Math.round((totalBytes / (1024 * 1024)) * 10) / 10 : 0;

  if (!response.body) {
    const blob = await response.blob();
    await triggerBlobDownload(blob, filename, mediaUrl);
    return;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      receivedBytes += value.length;
      if (onProgress && totalBytes > 0) {
        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        const downloadedMb = Math.round((receivedBytes / (1024 * 1024)) * 10) / 10;
        onProgress(percent, downloadedMb, totalMb);
      }
    }
  }

  const blob = new Blob(chunks as any, { type: 'video/mp4' });
  await triggerBlobDownload(blob, filename, mediaUrl);
}

async function triggerBlobDownload(blob: Blob, filename: string, originalUrl?: string): Promise<void> {
  // 1. Si es iOS / iPadOS y soporta Web Share API con archivos, guardar directamente en Fotos/Archivos
  if (isIOS() && typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: 'video/mp4' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // El usuario canceló la hoja de compartir
      }
      console.warn('Web Share no disponible o falló:', err);
    }
  }

  // 2. Método estándar para PC / Android (enlace <a> con atributo download)
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    // 3. Fallback de seguridad: abrir URL directa en nueva pestaña si Safari bloquea blobs
    if (originalUrl) {
      window.open(originalUrl, '_blank');
    }
  }
}
