import { RedGifItem, SearchResultItem } from '../types';

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Consulta un endpoint de RedGIFs asegurando que la respuesta sea JSON legítimo
 * y evitando excepciones de parsing HTML en Safari / iOS.
 */
async function tryFetchEndpoint<T>(url: string, options: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    // Si la respuesta no es JSON (p. ej. si un router SPA devuelve index.html), descartar inmediatamente
    if (!contentType.includes('json')) {
      return null;
    }

    if (res.status === 404 || res.status === 410) {
      throw new Error('El video solicitado no existe o ha sido eliminado.');
    }

    if (!res.ok) {
      throw new Error(`Error en servidor RedGIFs: HTTP ${res.status}`);
    }

    const text = await res.text();
    return JSON.parse(text) as T;
  } catch (err: any) {
    if (err.message && (err.message.includes('no existe') || err.message.includes('eliminado'))) {
      throw err;
    }
    return null;
  }
}

async function requestRedGifsJson<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  // 1. Probar directo con la API pública de RedGIFs (compatible nativamente con CORS)
  const directData = await tryFetchEndpoint<T>(`https://api.redgifs.com/v2${path}`, options);
  if (directData !== null) {
    return directData;
  }

  // 2. Probar mediante el proxy de desarrollo de Vite (/api/redgifs) si está activo
  const proxyData = await tryFetchEndpoint<T>(`/api/redgifs${path}`, options);
  if (proxyData !== null) {
    return proxyData;
  }

  // 3. Fallback adicional con proxy CORS público para entornos web aislados como Bolt.new
  const fallbackData = await tryFetchEndpoint<T>(
    `https://corsproxy.io/?url=${encodeURIComponent(`https://api.redgifs.com/v2${path}`)}`,
    options
  );
  if (fallbackData !== null) {
    return fallbackData;
  }

  throw new Error('No se pudo conectar con la API de RedGIFs. Comprueba tu conexión a internet.');
}

/**
 * Obtiene o renueva el token temporal de autorización de RedGIFs.
 */
export async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const data = await requestRedGifsJson<{ token: string }>('/auth/temporary');
  if (!data?.token) {
    throw new Error('No se pudo obtener el token de autorización de RedGIFs.');
  }

  cachedToken = data.token;
  tokenExpiry = now + 25 * 60 * 1000; // 25 minutos

  return cachedToken;
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
  const data = await requestRedGifsJson<any>(`/gifs/${gifId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

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

  const data = await requestRedGifsJson<any>(`/gifs/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

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
 * Descarga el video en memoria como Blob con reporte de progreso en vivo.
 */
export async function fetchVideoBlob(
  mediaUrl: string,
  onProgress?: (progressPercent: number, downloadedMb: number, totalMb: number) => void
): Promise<Blob> {
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Fallo al descargar archivo: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  const totalMb = totalBytes > 0 ? Math.round((totalBytes / (1024 * 1024)) * 10) / 10 : 0;

  if (!response.body) {
    return await response.blob();
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

  return new Blob(chunks as any, { type: 'video/mp4' });
}

/**
 * Descarga y dispara el guardado del archivo en el sistema operativo.
 */
export async function downloadVideoFile(
  mediaUrl: string,
  filename: string,
  onProgress?: (progressPercent: number, downloadedMb: number, totalMb: number) => void
): Promise<void> {
  const blob = await fetchVideoBlob(mediaUrl, onProgress);
  await triggerBlobDownload(blob, filename, mediaUrl);
}

export async function triggerBlobDownload(blob: Blob, filename: string, originalUrl?: string): Promise<void> {
  // 1. Si es iOS / iPadOS y soporta Web Share API con archivos, guardar directamente en Fotos/Archivos
  if (isIOS() && typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
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
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
