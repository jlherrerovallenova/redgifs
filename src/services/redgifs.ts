import { RedGifItem, SearchResultItem, UserProfile, CreatorFeedResult } from '../types';

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

export interface SearchQueryResult {
  items: SearchResultItem[];
  page: number;
  pages: number;
  total: number;
}

export interface TagSuggestion {
  type: 'tag' | 'creator';
  text: string;
  gifs?: number;
}

export interface ParsedQuery {
  raw: string;
  hasExplicitBoolean: boolean;
  included: string[];
  excluded: string[];
  primaryTerm: string;
}

// Lista exhaustiva de términos bloqueados para excluir contenido de hombres solos, gay, dicki, etc.
export const BLOCKED_KEYWORDS_AND_TAGS: string[] = [
  // Términos de hombres solos y temática gay
  'gay', 'gays', 'gaysex', 'gayporn', 'gaytube', 'twink', 'twinks', 'shemale', 'ladyboy',
  'trans', 'transgender', 'femboy', 'trap', 'sissy', 'crossdress', 'crossdresser',
  'boyonboy', 'boy on boy', 'mm', 'male solo', 'solo male', 'solo guy', 'guy solo',
  'solo guys', 'guys solo', 'man solo', 'solo man', 'men solo', 'solo men',
  'male masturbation', 'guy masturbating', 'dude solo', 'solo dude', 'jock', 'jockstrap',
  'bareback', 'dilf', 'daddy gay', 'gay daddy', 'gay bear', 'bear gay', 'otter gay',
  'gay sex', 'gay blowjob', 'gay couple', 'gay romance', 'gay hunk', 'gay teen',
  // Términos anatómicos masculinos explícitos / primeros planos masculinos no deseados
  'dick', 'dicki', 'dicks', 'penis', 'cock', 'cocks', 'cockring', 'bulge', 'monster cock',
  'huge cock', 'big cock', 'huge dick', 'big dick', 'cock tribute', 'cock sucker',
  'cock sucking', 'gloryhole male', 'bbc', 'strapon guy', 'penis pump', 'ballsack',
  'scrotum', 'foreskin', 'erection solo', 'boner', 'throbbing cock',
  // Términos en Español
  'hombre solo', 'hombres solos', 'chico solo', 'chicos solos', 'solo chicos', 'solo hombres',
  'polla', 'pollas', 'pollon', 'pollón', 'pene', 'penes', 'cipote', 'verga', 'vergas',
  'pito', 'pitos', 'rabo', 'rabos', 'travesti', 'transexual', 'chico gay', 'chicos gay',
  'sexo gay', 'maricon', 'maricón', 'marica', 'maricas', 'gay espanol', 'gay español'
];

export function getBlockedCreators(): string[] {
  try {
    return JSON.parse(localStorage.getItem('rg_blocked_creators') || '[]');
  } catch {
    return [];
  }
}

export function isCreatorBlocked(username?: string): boolean {
  if (!username) return false;
  const list = getBlockedCreators();
  const clean = username.toLowerCase().trim().replace(/^@/, '');
  return list.some(c => c.toLowerCase().trim().replace(/^@/, '') === clean);
}

/**
 * Comprueba si un recurso multimedia, creador o tag está permitido y libre de contenido bloqueado.
 */
export function isContentAllowed(item: {
  title?: string;
  userName?: string;
  username?: string;
  description?: string;
  tags?: string[];
}): boolean {
  if (!item) return false;

  // 0. Excluir creadores bloqueados por el usuario
  if (item.userName && isCreatorBlocked(item.userName)) return false;
  if (item.username && isCreatorBlocked(item.username)) return false;

  const rawTags = (item.tags || []).map(t => t.toLowerCase().trim());
  const combinedText = [
    item.title || '',
    item.userName || '',
    item.description || '',
    ...rawTags
  ].join(' ').toLowerCase();

  for (const blocked of BLOCKED_KEYWORDS_AND_TAGS) {
    const cleanBlocked = blocked.toLowerCase().trim();

    // 1. Coincidencia en tags
    for (const tag of rawTags) {
      if (tag === cleanBlocked) return false;
      if (cleanBlocked.length <= 4) {
        const tagRegex = new RegExp(`\\b${cleanBlocked}\\b`, 'i');
        if (tagRegex.test(tag)) return false;
      } else {
        if (tag.includes(cleanBlocked)) return false;
      }
    }

    // 2. Coincidencia en texto combinado (título, username, bio, tags)
    if (cleanBlocked.length <= 4) {
      const regex = new RegExp(`\\b${cleanBlocked}\\b`, 'i');
      if (regex.test(combinedText)) return false;
    } else {
      if (combinedText.includes(cleanBlocked)) return false;
    }
  }

  return true;
}

// Diccionario inteligente de sinónimos Español -> Inglés para optimizar búsquedas en RedGIFs
const SPANISH_SYNONYMS: Record<string, string> = {
  'baile': 'dance',
  'bailando': 'dancing',
  'chica': 'girl',
  'chicas': 'girls',
  'mujer': 'woman',
  'mujeres': 'women',
  'playa': 'beach',
  'coche': 'cars',
  'coches': 'cars',
  'rubia': 'blonde',
  'rubias': 'blonde',
  'morena': 'brunette',
  'morenas': 'brunette',
  'pelirroja': 'redhead',
  'pelirrojas': 'redhead',
  'tetas': 'boobs',
  'pechos': 'boobs',
  'culo': 'ass',
  'culona': 'pawg',
  'gimnasio': 'gym',
  'pesas': 'fitness',
  'sonido': 'sound',
  'audio': 'sound',
  'modelo': 'model',
  'modelos': 'model',
  'mascota': 'pets',
  'mascotas': 'pets',
  'gato': 'cat',
  'perro': 'dog',
  'verano': 'summer',
  'fiesta': 'party',
  'ducha': 'shower',
  'piscina': 'pool',
  'caliente': 'hot',
  'linda': 'cute',
  'guapa': 'pretty'
};

export function translateQueryTerms(raw: string): string {
  const words = raw.split(/\s+/);
  const translated = words.map(w => {
    const clean = w.toLowerCase().replace(/^[-+#@]/, '');
    const prefix = w.startsWith('-') ? '-' : (w.startsWith('+') ? '+' : (w.startsWith('@') ? '@' : ''));
    if (SPANISH_SYNONYMS[clean]) {
      return prefix + SPANISH_SYNONYMS[clean];
    }
    return w;
  });
  return translated.join(' ');
}

/**
 * Parsea consultas con operadores booleanos (+, -, AND, NOT).
 */
export function parseBooleanQuery(rawQuery: string): ParsedQuery {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { raw: '', hasExplicitBoolean: false, included: [], excluded: [], primaryTerm: 'trending' };
  }

  const hasExplicitBoolean = /[+\-]|\bAND\b|\bNOT\b/i.test(trimmed);
  const included: string[] = [];
  const excluded: string[] = [];

  const parts = trimmed
    .replace(/\bAND\b/gi, ' +')
    .replace(/\bNOT\b/gi, ' -')
    .split(/\s+/);

  for (const part of parts) {
    let clean = part.trim();
    if (!clean || clean === '+' || clean === ',') continue;

    if (clean.startsWith('-')) {
      clean = clean.slice(1).trim().replace(/^[#,]/, '');
      if (clean) excluded.push(clean.toLowerCase());
      continue;
    }

    if (clean.startsWith('+')) {
      clean = clean.slice(1).trim();
    }

    clean = clean.replace(/^[#,]/, '');
    if (clean) {
      included.push(clean.toLowerCase());
    }
  }

  // Si no hay operadores booleanos explícitos, usar la frase completa tal cual
  let primaryTerm = trimmed;
  if (hasExplicitBoolean) {
    primaryTerm = included.join(' ');
    if (!primaryTerm && excluded.length > 0) {
      primaryTerm = 'trending';
    }
  }

  const translatedPrimary = translateQueryTerms(primaryTerm);

  return {
    raw: trimmed,
    hasExplicitBoolean,
    included,
    excluded,
    primaryTerm: translatedPrimary || 'trending'
  };
}

/**
 * Valida si un video cumple con los criterios booleanos de exclusión (-) o inclusión estricta (+).
 */
export function matchBooleanFilter(
  item: SearchResultItem,
  parsed: ParsedQuery,
  requireHD: boolean = false
): boolean {
  // Primero validar que pase el filtro general estricto
  if (!isContentAllowed(item)) {
    return false;
  }

  const itemText = [
    item.title || '',
    item.userName || '',
    ...(item.tags || [])
  ].join(' ').toLowerCase();

  // 1. Exclusiones: Si contiene cualquiera de los términos prohibidos (-termino), se descarta
  for (const exc of parsed.excluded) {
    const excTrans = SPANISH_SYNONYMS[exc] || exc;
    if (itemText.includes(exc) || itemText.includes(excTrans)) {
      return false;
    }
  }

  // 2. Inclusiones obligatorias explícitas (+termino): Solo si el usuario usó el operador '+'
  if (parsed.hasExplicitBoolean && parsed.included.length > 1) {
    for (const inc of parsed.included) {
      const incTrans = SPANISH_SYNONYMS[inc] || inc;
      if (!itemText.includes(inc) && !itemText.includes(incTrans)) {
        return false;
      }
    }
  }

  // 3. Calidad HD obligatoria si se requiere
  if (requireHD && !item.hd_url) {
    return false;
  }

  return true;
}

/**
 * Obtiene sugerencias de autocompletado en vivo de tags y creadores desde RedGIFs.
 */
export async function getSearchSuggestions(query: string): Promise<TagSuggestion[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const tokens = clean.split(/[\s+,]+/);
  const rawWord = tokens[tokens.length - 1].replace(/^[-@#]/, '').toLowerCase();
  if (!rawWord || rawWord.length < 2) return [];

  const activeWord = SPANISH_SYNONYMS[rawWord] || rawWord;

  try {
    const token = await getAuthToken();
    const data = await requestRedGifsJson<any>(`/search/suggest?query=${encodeURIComponent(activeWord)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (Array.isArray(data)) {
      return data
        .slice(0, 15)
        .map((item: any) => ({
          type: (item.type === 'creator' ? 'creator' : 'tag') as 'tag' | 'creator',
          text: item.text || item.name || '',
          gifs: Number(item.gifs) || 0
        }))
        .filter(s => isContentAllowed({ title: s.text, tags: [s.text] }))
        .slice(0, 10);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Búsqueda avanzada en RedGIFs con soporte de booleanos (+/-), traducción inteligente y paginación.
 */
export async function searchVideosExtended(
  query: string,
  count = 24,
  page = 1,
  order?: 'trending' | 'top' | 'latest'
): Promise<SearchQueryResult> {
  const parsed = parseBooleanQuery(query);
  const token = await getAuthToken();

  const isTrending = !parsed.primaryTerm || parsed.primaryTerm.toLowerCase() === 'trending';

  const params = new URLSearchParams();
  if (isTrending) {
    if (order && order !== 'trending') {
      params.append('order', order);
    }
  } else {
    // RedGIFs v2 API búsqueda completa en catálogo mediante search_text y query
    params.append('search_text', parsed.primaryTerm);
    params.append('query', parsed.primaryTerm);
  }

  params.append('count', String(count));
  params.append('page', String(page));

  const data = await requestRedGifsJson<any>(`/gifs/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const gifs = Array.isArray(data.gifs) ? data.gifs : [];
  let items: SearchResultItem[] = gifs.map((g: any) => {
    const urls = g.urls || {};
    return {
      id: g.id,
      title: (g.tags && g.tags.length > 0 ? g.tags.slice(0, 3).join(', ') : g.id) || 'Video',
      userName: g.userName || 'anónimo',
      duration: Math.round((Number(g.duration) || 0) * 10) / 10,
      views: Number(g.views) || 0,
      likes: Number(g.likes) || 0,
      hasAudio: Boolean(g.hasAudio),
      verified: Boolean(g.verified),
      tags: Array.isArray(g.tags) ? g.tags : [],
      hd_url: urls.hd || urls.sd || '',
      sd_url: urls.sd || urls.hd || '',
      silent_url: urls.silent || urls.sd || '',
      thumbnail_url: urls.thumbnail || urls.poster || '',
      poster_url: urls.poster || urls.thumbnail || '',
      watch_url: `https://www.redgifs.com/watch/${g.id}`
    };
  });

  // Filtro estricto global (excluye hombres solos, gays, dicki, creadores bloqueados, etc.)
  items = items.filter(isContentAllowed);

  // Filtrado booleano de usuario (+ / -)
  if (parsed.excluded.length > 0 || (parsed.hasExplicitBoolean && parsed.included.length > 1)) {
    items = items.filter(item => matchBooleanFilter(item, parsed));
  }

  const total = Number(data.total) || items.length;
  const calculatedPages = Math.max(1, Math.ceil(total / count));

  return {
    items: items.slice(0, count),
    page: Number(data.page) || page,
    pages: Math.max(calculatedPages, Number(data.pages) || 1),
    total
  };
}

/**
 * Busca videos en RedGIFs por palabra clave o tag (compatibilidad).
 */
export async function searchVideos(query: string, count = 20, page = 1): Promise<SearchResultItem[]> {
  const res = await searchVideosExtended(query, count, page);
  return res.items;
}

function extractSocialLinks(u: any): { type: string; url: string }[] {
  const links: { type: string; url: string }[] = [];
  if (u.profileUrl) {
    let type = 'Website';
    if (u.profileUrl.includes('onlyfans.com')) type = 'OnlyFans';
    else if (u.profileUrl.includes('fansly.com')) type = 'Fansly';
    else if (u.profileUrl.includes('instagram.com')) type = 'Instagram';
    else if (u.profileUrl.includes('twitter.com') || u.profileUrl.includes('x.com')) type = 'X / Twitter';
    links.push({ type, url: u.profileUrl });
  }
  for (let i = 1; i <= 18; i++) {
    const sUrl = u[`socialUrl${i}`];
    if (sUrl && typeof sUrl === 'string' && sUrl.startsWith('http')) {
      let type = 'Enlace';
      if (sUrl.includes('onlyfans.com')) type = 'OnlyFans';
      else if (sUrl.includes('instagram.com')) type = 'Instagram';
      else if (sUrl.includes('twitter.com') || sUrl.includes('x.com')) type = 'X / Twitter';
      else if (sUrl.includes('fansly.com')) type = 'Fansly';
      else if (sUrl.includes('patreon.com')) type = 'Patreon';
      else if (sUrl.includes('tiktok.com')) type = 'TikTok';
      else if (sUrl.includes('youtube.com')) type = 'YouTube';
      if (!links.some(l => l.url === sUrl)) {
        links.push({ type, url: sUrl });
      }
    }
  }
  return links;
}

/**
 * Obtiene el perfil completo y catálogo de videos de un creador con ordenación y paginación.
 */
export async function getCreatorFeed(
  username: string,
  order: 'best' | 'recent' | 'trending' = 'best',
  count = 24,
  page = 1
): Promise<CreatorFeedResult> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser) {
    throw new Error('Por favor especifica un nombre de creador válido.');
  }

  const token = await getAuthToken();
  const params = new URLSearchParams({
    order,
    count: String(count),
    page: String(page)
  });

  const data = await requestRedGifsJson<any>(`/users/${encodeURIComponent(cleanUser)}/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  let userProfile: UserProfile | null = null;
  const rawUsers = Array.isArray(data.users) ? data.users : [];
  const foundUser = rawUsers.find(
    (u: any) => u.username?.toLowerCase() === cleanUser.toLowerCase()
  ) || rawUsers[0];

  if (foundUser) {
    userProfile = {
      username: foundUser.username || cleanUser,
      name: foundUser.name || foundUser.username || cleanUser,
      description: foundUser.description || undefined,
      followers: Number(foundUser.followers) || 0,
      following: Number(foundUser.following) || 0,
      gifs: Number(foundUser.publishedGifs || foundUser.gifs) || 0,
      views: Number(foundUser.views) || 0,
      likes: Number(foundUser.likes) || 0,
      profileImageUrl: foundUser.profileImageUrl || undefined,
      profileUrl: foundUser.profileUrl || undefined,
      url: foundUser.url || `https://www.redgifs.com/users/${foundUser.username || cleanUser}`,
      verified: Boolean(foundUser.verified),
      studio: Boolean(foundUser.studio),
      socialLinks: extractSocialLinks(foundUser)
    };
  }

  const gifs = Array.isArray(data.gifs) ? data.gifs : [];
  const rawItems: SearchResultItem[] = gifs.map((g: any) => {
    const urls = g.urls || {};
    return {
      id: g.id,
      title: (g.tags && g.tags.length > 0 ? g.tags.slice(0, 3).join(', ') : g.id) || 'Video',
      userName: g.userName || cleanUser,
      duration: Math.round((Number(g.duration) || 0) * 10) / 10,
      views: Number(g.views) || 0,
      likes: Number(g.likes) || 0,
      hasAudio: Boolean(g.hasAudio),
      verified: Boolean(g.verified),
      tags: Array.isArray(g.tags) ? g.tags : [],
      hd_url: urls.hd || urls.sd || '',
      sd_url: urls.sd || urls.hd || '',
      silent_url: urls.silent || urls.sd || '',
      thumbnail_url: urls.thumbnail || urls.poster || '',
      poster_url: urls.poster || urls.thumbnail || '',
      watch_url: `https://www.redgifs.com/watch/${g.id}`
    };
  });

  const items = rawItems.filter(isContentAllowed);

  return {
    user: userProfile,
    items,
    page: Number(data.page) || page,
    pages: Number(data.pages) || 1,
    total: Number(data.total) || items.length
  };
}

export interface CreatorSearchResult {
  items: UserProfile[];
  page: number;
  pages: number;
  total: number;
}

/**
 * Busca creadores por nombre de usuario o palabra clave con paginación completa.
 */
export async function searchCreatorsPaginated(
  query: string,
  count = 20,
  page = 1,
  order: 'best' | 'recent' | 'trending' = 'best'
): Promise<CreatorSearchResult> {
  const clean = query.trim().replace(/^@/, '');
  const token = await getAuthToken();
  const params = new URLSearchParams({
    search_text: clean || 'a',
    count: String(count * 2),
    page: String(page),
    order
  });

  try {
    const data = await requestRedGifsJson<any>(`/creators/search?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items: UserProfile[] = rawItems
      .map((u: any) => ({
        username: u.username,
        name: u.name || u.username,
        description: u.description || undefined,
        followers: Number(u.followers) || 0,
        following: Number(u.following) || 0,
        gifs: Number(u.publishedGifs || u.gifs) || 0,
        views: Number(u.views) || 0,
        likes: Number(u.likes) || 0,
        profileImageUrl: u.profileImageUrl || undefined,
        profileUrl: u.profileUrl || undefined,
        url: u.url || `https://www.redgifs.com/users/${u.username}`,
        verified: Boolean(u.verified),
        studio: Boolean(u.studio),
        socialLinks: extractSocialLinks(u)
      }))
      .filter(u => isContentAllowed({ userName: u.username, title: u.name, description: u.description }))
      .slice(0, count);

    return {
      items,
      page: Number(data.page) || page,
      pages: Number(data.pages) || Math.max(1, Math.ceil((Number(data.total) || items.length) / count)),
      total: Number(data.total) || items.length
    };
  } catch {
    return { items: [], page: 1, pages: 1, total: 0 };
  }
}

/**
 * Busca creadores por nombre de usuario o palabra clave (compatibilidad).
 */
export async function searchCreators(query: string, count = 12): Promise<UserProfile[]> {
  const res = await searchCreatorsPaginated(query, count, 1);
  return res.items;
}

/**
 * Obtiene los enlaces directos de los N mejores videos de un creador para descarga o compilación.
 */
export async function fetchTopCreatorVideoUrls(username: string, limit: number = 20): Promise<string[]> {
  const resultUrls: string[] = [];
  const seenUrls = new Set<string>();
  let page = 1;
  while (resultUrls.length < limit) {
    const countNeeded = Math.min(30, limit - resultUrls.length);
    const feed = await getCreatorFeed(username, 'best', countNeeded, page);
    if (!feed.items || feed.items.length === 0) break;
    for (const item of feed.items) {
      if (!seenUrls.has(item.watch_url)) {
        seenUrls.add(item.watch_url);
        resultUrls.push(item.watch_url);
      }
      if (resultUrls.length >= limit) break;
    }
    if (page >= feed.pages) break;
    page++;
  }
  return resultUrls;
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

