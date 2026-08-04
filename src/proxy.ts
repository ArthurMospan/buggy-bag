import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS preflight for endpoints the widget calls from any origin
  if (
    pathname.startsWith('/api/bugs/submit') ||
    pathname.startsWith('/api/ping') ||
    pathname.startsWith('/api/image-proxy')
  ) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
  }

  let res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
          Object.entries(headersToSet).forEach(([name, value]) =>
            res.headers.set(name, value)
          );
        },
      },
    }
  );

  // getClaims validates the JWT and refreshes it when necessary without the
  // extra Auth-server user lookup performed by getUser(). The refreshed
  // cookies are forwarded to both the route and the browser by setAll above.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claimsData?.claims?.sub) && !claimsError;

  // Public routes that don't require authentication
  const isPublicRoute = 
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/oauth2/') ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/buggy-bag-standalone.js';

  if (!isAuthenticated && !isPublicRoute) {
    console.warn('[Auth Proxy] Session validation failed', {
      pathname,
      error: claimsError?.message ?? 'missing claims',
    });
    const loginUrl = req.nextUrl.clone();
    const redirectTarget = `${pathname}${req.nextUrl.search}`;
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('redirect', redirectTarget);

    const redirectResponse = NextResponse.redirect(loginUrl);
    res.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie));
    ['cache-control', 'expires', 'pragma'].forEach(name => {
      const value = res.headers.get(name);
      if (value) redirectResponse.headers.set(name, value);
    });
    return redirectResponse;
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
