export default async function handler(req: any, res: any) {
  // Manejo de preflight CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawPath = req.query?.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '');

  // Reenviar todos los parámetros de consulta (search_text, page, count, order, etc.)
  const searchParams = new URLSearchParams();
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'path' && value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }
  }

  const qs = searchParams.toString();
  const url = `https://api.redgifs.com/v2/${path}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    'Referer': 'https://www.redgifs.com/',
    'Origin': 'https://www.redgifs.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  if (req.headers?.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  try {
    const upstream = await fetch(url, { headers });
    const contentType = upstream.headers.get('content-type') || 'application/json';
    const data = await upstream.text();

    res.setHeader('Content-Type', contentType);
    return res.status(upstream.status).send(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Fallo al conectar con RedGIFs', message: err.message });
  }
}
