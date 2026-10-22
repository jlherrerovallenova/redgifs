export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/redgifs\/?/, '');
  const targetUrl = `https://api.redgifs.com/v2/${path}${url.search}`;

  const headers: Record<string, string> = {
    'Referer': 'https://www.redgifs.com/',
    'Origin': 'https://www.redgifs.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const auth = req.headers.get('authorization');
  if (auth) {
    headers['Authorization'] = auth;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
    });

    const body = await upstream.arrayBuffer();
    const resHeaders = new Headers(upstream.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(body, {
      status: upstream.status,
      headers: resHeaders,
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

export const config = {
  path: '/api/redgifs/*',
};
