import { RedGifItem, SearchResultItem } from '../types';

let cachedToken: string | null = null;
let tokenExpiry = 0;

/** Hace fetch con un timeout en ms (por defecto 12 s). */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta un endpoint de RedGIFs asegurando que la respuesta sea JSON legítimo
 * y evitando excepciones de parsing HTML en Safari / iOS.
 */
async function tryFetchEndpoint<T>(url: string, options: RequestInit): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(url, options);
    const contentType = res.headers.get('content-type') || '';

    // Si la respuesta no es JSON (p. ej. si un router SPA devuelve index.html), descartar inmediatamente
    if (!contentType.includes('json')) {
      console.warn(`[RedGIFs] ${url} → content-type no JSON: "${contentType}"`);
      return null;
    }

    if (res.status === 404 || res.status === 410) {
      throw new Error('El video solicitado no existe o ha sido eliminado.');
    }

    if (!res.ok) {
      console.warn(`[RedGIFs] ${url} → HTTP ${res.status}`);
      throw new Error(`Error en servidor RedGIFs: HTTP ${res.status}`);
    }

    const text = await res.text();

    try {
      return JSON.parse(text) as T;
    } catch {
      console.warn(`[RedGIFs] ${url} → JSON.parse falló`);
      return null;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('no existe') || err.message.includes('eliminado'))) {
      throw err;
    }
    console.warn(`[RedGIFs] ${url} → Error: ${err?.message ?? err}`);
    return null;
  }
}

/**
 * Intenta obtener JSON desde allorigins.win, que envuelve la respuesta
 * en { contents: "...", status: { http_code: 200 } }.
 */
async function tryAllOriginsProxy<T>(path: string, options: RequestInit): Promise<T | null> {
  const targetUrl = `https://api.redgifs.com/v2${path}`;
  // allorigins no permite enviar cabeceras personalizadas; solo sirve para el token inicial
  // y endpoints que no requieran Authorization.
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  try {
    const res = await fetchWithTimeout(proxyUrl, {}, 15000);
    if (!res.ok) return null;
    const wrapper = await res.json() as { contents?: string; status?: { http_code: number } };
    const httpCode = wrapper?.status?.http_code ?? 0;
    if (httpCode === 404 || httpCode === 410) {
      throw new Error('El video solicitado no existe o ha sido eliminado.');
    }
    if (!wrapper?.contents) return null;
    try {
      return JSON.parse(wrapper.contents) as T;
    } catch {
      return null;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('no existe') || err.message.includes('eliminado'))) {
      throw err;
    }
    return null;
  }
}

async function requestRedGifsJson<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  // 1. Proxy local de Vite (/api/redgifs) — resuelve CORS y cabeceras Referer/Origin automáticamente
  const proxyData = await tryFetchEndpoint<T>(`/api/redgifs${path}`, options);
  if (proxyData !== null) {
    return proxyData;
  }

  // 2. Directo con la API pública de RedGIFs (si se corre fuera del entorno Vite o con CORS permitido)
  const directData = await tryFetchEndpoint<T>(`https://api.redgifs.com/v2${path}`, options);
  if (directData !== null) {
    return directData;
  }

  // 3. Proxy CORS gratuito allorigins.win (solo para rutas sin Authorization)
  const hasAuth = !!(options.headers && (options.headers as Record<string, string>)['Authorization']);
  if (!hasAuth) {
    const allOriginsData = await tryAllOriginsProxy<T>(path, options);
    if (allOriginsData !== null) {
      return allOriginsData;
    }
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
 * Detecta si el navegador es Aloha Browser (iOS/iPadOS).
 * Aloha tiene su propio gestor de descargas que intercepta <a download> con URLs directas.
 */
export function isAloha(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Aloha/i.test(navigator.userAgent);
}

/**
 * Descarga el video en memoria como Blob con reporte de progreso en vivo.
 */
export async function fetchVideoBlob(
  mediaUrl: string,
  onProgress?: (progressPercent: number, downloadedMb: number, totalMb: number) => void
): Promise<Blob> {
  let response: Response | null = null;

  // 1. Intento directo con no-referrer (RedGIFs devuelve 200 cuando no se envía Referer de red local)
  try {
    const res = await fetch(mediaUrl, { referrerPolicy: 'no-referrer' });
    if (res.ok) {
      response = res;
    } else {
      console.warn(`[RedGIFs Media] fetch directo HTTP ${res.status}, probando proxy local...`);
    }
  } catch (err) {
    console.warn(`[RedGIFs Media] fetch directo falló, probando proxy local...`, err);
  }

  // 2. Si falla (p. ej. HTTP 403 o CORS en Safari), intentar a través del proxy local de Vite
  if (!response) {
    try {
      const urlObj = new URL(mediaUrl);
      const proxiedUrl = `/media-proxy${urlObj.pathname}${urlObj.search}`;
      const res = await fetch(proxiedUrl);
      if (res.ok) {
        response = res;
      }
    } catch (proxyErr) {
      console.warn(`[RedGIFs Media] proxy local falló`, proxyErr);
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Fallo al descargar archivo: HTTP ${response?.status || 403}`);
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
 * Rutas según entorno:
 *   1. Aloha Browser  → <a href=url download> directo (el gestor de Aloha lo intercepta)
 *   2. iOS Safari     → navigator.share(url) o window.open (no soporta blobs externos)
 *   3. PC / Android   → fetch blob + <a download> estándar
 */
export async function downloadVideoFile(
  mediaUrl: string,
  filename: string,
  onProgress?: (progressPercent: number, downloadedMb: number, totalMb: number) => void
): Promise<void> {

  // ── Aloha Browser (iOS/iPadOS) ───────────────────────────────────────────────
  // Aloha tiene un gestor de descargas propio: basta con disparar un <a download>
  // apuntando a la URL directa. No hace falta blob ni navigator.share.
  if (isAloha()) {
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // ── Safari iOS / iPadOS ──────────────────────────────────────────────────────
  // Safari bloquea los fetch de blobs de dominios externos (CORS) y lanza
  // "The string did not match the expected pattern". Usamos la URL directa.
  if (isIOS()) {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url: mediaUrl, title: filename });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // El usuario canceló
        // Si share falla, continuar hacia window.open
      }
    }
    // Fallback: abrir en nueva pestaña → mantener pulsado el vídeo → Guardar
    window.open(mediaUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // ── PC / Android ─────────────────────────────────────────────────────────────
  const blob = await fetchVideoBlob(mediaUrl, onProgress);
  await triggerBlobDownload(blob, filename, mediaUrl);
}

export async function saveVideoWithPicker(blob: Blob, filename: string): Promise<void> {
  // 1. En iOS / iPadOS: Web Share API permite al usuario elegir "Guardar en Archivos" o "Guardar video"
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
      if (err.name === 'AbortError') return; // Cancelado por el usuario
      console.warn('Web Share no disponible o falló:', err);
    }
  }

  // 2. En PC (Chrome / Edge): File System Access API para abrir el diálogo "Guardar como..." y elegir carpeta
  if (typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Video MP4',
          accept: { 'video/mp4': ['.mp4'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('showSaveFilePicker falló, fallback a descarga directa', err);
    }
  }

  // 3. Fallback estándar para el resto de navegadores
  await triggerBlobDownload(blob, filename);
}

export async function triggerBlobDownload(blob: Blob, filename: string, originalUrl?: string): Promise<void> {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) {
    if (originalUrl) {
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

