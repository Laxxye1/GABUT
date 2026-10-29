export const config = {
  api: {
    bodyParser: false,
  },
};

const BACKEND = 'https://musicfyrik.web.id';
const FAKE_ORIGIN = 'https://musicfyrik.web.id';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    let path = url.searchParams.get('path') || '';
    if (path.startsWith('proxy/')) path = path.slice(6);
    if (path.startsWith('proxy')) path = path.slice(5);
    if (path.startsWith('/')) path = path.slice(1);

    const params = new URLSearchParams(url.searchParams);
    params.delete('path');
    const qs = params.toString();
    const target = `${BACKEND}/api/${path}${qs ? '?' + qs : ''}`;

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const key = k.toLowerCase();
      if (
        key === 'host' ||
        key === 'connection' ||
        key === 'content-length' ||
        key === 'accept-encoding' ||
        key === 'origin' ||
        key === 'referer' ||
        key === 'x-forwarded-for' ||
        key === 'x-forwarded-host' ||
        key === 'x-forwarded-proto' ||
        key === 'x-vercel-ip-country' ||
        key === 'x-real-ip'
      ) continue;
      headers[key] = Array.isArray(v) ? v.join(', ') : v;
    }
    headers['origin'] = FAKE_ORIGIN;
    headers['referer'] = FAKE_ORIGIN + '/';
    headers['host'] = 'musicfyrik.web.id';

    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === 'content-encoding' ||
        lower === 'content-length' ||
        lower === 'transfer-encoding' ||
        lower === 'connection' ||
        lower === 'access-control-allow-origin' ||
        lower === 'set-cookie'
      ) return;
      try { res.setHeader(key, value); } catch (e) {}
    });

    res.setHeader('Access-Control-Allow-Origin', '*');

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(502).json({
      status: false,
      error: 'PROXY_ERROR',
      message: String((err && err.message) || err),
    });
  }
  }
