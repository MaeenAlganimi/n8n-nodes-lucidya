import { NextResponse, type NextRequest } from 'next/server';

const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function preferredLocale(header: string | null): 'en' | 'ar' {
  if (!header) return 'en';
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? '';
    if (tag.startsWith('ar')) return 'ar';
  }
  return 'en';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api')) {
    if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: corsHeaders });
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value);
    return response;
  }

  const segment = pathname.split('/')[1] ?? '';
  if (segment !== 'en' && segment !== 'ar') {
    const url = request.nextUrl.clone();
    const locale = preferredLocale(request.headers.get('accept-language'));
    url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  const headers = new Headers(request.headers);
  headers.set('x-locale', segment);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
