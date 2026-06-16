import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  if (!domain) return new NextResponse(null, { status: 400 });

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  // Крок 1: парсимо HTML сайту щоб знайти реальну іконку
  let faviconUrl: string | null = null;
  try {
    const html = await fetch(`https://${cleanDomain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    }).then(r => r.text());

    // Шукаємо <link rel="icon">, <link rel="shortcut icon">, <link rel="apple-touch-icon">
    const match = html.match(
      /<link[^>]+rel=["'][^"']*(icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["']/i
    ) || html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*(icon)[^"']*["']/i
    );

    if (match) {
      const href = match[2] || match[1];
      faviconUrl = href.startsWith('http')
        ? href
        : href.startsWith('//')
        ? `https:${href}`
        : `https://${cleanDomain}${href.startsWith('/') ? '' : '/'}${href}`;
    }
  } catch {}

  // Крок 2: fallback на /favicon.ico якщо не знайшли в HTML
  if (!faviconUrl) faviconUrl = `https://${cleanDomain}/favicon.ico`;

  // Крок 3: завантажуємо іконку і проксуємо
  try {
    const res = await fetch(faviconUrl, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('not found');

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/x-icon';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // cache 24h
      },
    });
  } catch {
    // Крок 4: якщо нічого не знайшли — повертаємо 404
    return new NextResponse(null, { status: 404 });
  }
}
