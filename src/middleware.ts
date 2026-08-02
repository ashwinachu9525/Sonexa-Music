import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

// Vercel Edge Middleware
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check Admin UI Protection (Only for non-API, non-login pages)
  if (!pathname.startsWith('/api') && pathname !== '/login') {
    const token = request.cookies.get('admin_token');
    if (!token || token.value !== 'authorized') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 1. Rate Limiting Setup (Placeholder for Upstash/Vercel KV in Edge runtime)
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  
  // 2. Security & Caching Headers
  let response = NextResponse.next();
  if (pathname === '/login') {
      response = NextResponse.next();
  }
  
  // CORS
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Aggressive Edge Caching (stale-while-revalidate) for GET requests
  if (request.method === 'GET' && !request.url.includes('/play') && !request.url.includes('/cover')) {
    // Cache at the Edge for 1 hour, serve stale up to 24 hours while revalidating
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  }

  // Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}
