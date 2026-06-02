import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Handle CORS preflight for /api/bugs/submit (called from any origin by the widget)
  if (req.nextUrl.pathname.startsWith('/api/bugs/submit') || req.nextUrl.pathname.startsWith('/api/ping')) {
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
}

export const config = {
  matcher: ['/api/bugs/submit', '/api/ping'],
};
