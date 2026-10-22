// Cloudflare Pages Function: /api/redgifs/*
export const onRequest: PagesFunction = async (context) => {
  // Manejo de preflight CORS
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(context.request.url);
  const rawPath = context.params.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '');
  const targetUrl = `https://api.redgifs.com/v2/${path}${url.search}`;

  const headers: Record<string, string> = {
    'Referer': 'https://www.redgifs.com/',
    'Origin': 'https://www.redgifs.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const authHeader = context.request.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: context.request.method,
      headers,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Fallo al conectar con RedGIFs', message: err.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
