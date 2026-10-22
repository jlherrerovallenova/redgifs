import type { Config, Handler } from '@netlify/functions';

// Handler v2 (Standard Fetch API)
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
  const path = url.pathname.replace(/^(\/\.netlify\/functions\/redgifs|\/api\/redgifs)\/?/, '');
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

// Handler v1 (Legacy Netlify Event API)
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
      },
      body: '',
    };
  }

  const path = event.path.replace(/^(\/\.netlify\/functions\/redgifs|\/api\/redgifs)\/?/, '');
  const searchParams = new URLSearchParams();
  if (event.queryStringParameters) {
    for (const [k, v] of Object.entries(event.queryStringParameters)) {
      if (v !== undefined && v !== null) {
        searchParams.append(k, v);
      }
    }
  }
  const qs = searchParams.toString();
  const targetUrl = `https://api.redgifs.com/v2/${path}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    'Referer': 'https://www.redgifs.com/',
    'Origin': 'https://www.redgifs.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const auth = event.headers['authorization'] || event.headers['Authorization'];
  if (auth) {
    headers['Authorization'] = auth;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: event.httpMethod,
      headers,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    return {
      statusCode: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
      },
      body: text,
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Fallo al conectar con RedGIFs', message: err.message }),
    };
  }
};

export const config: Config = {
  path: '/api/redgifs/*',
};
